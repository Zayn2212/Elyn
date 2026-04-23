import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// deno-lint-ignore no-explicit-any
declare const Deno: any;
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action =
  | "list_users"     // fetch emails + ban status for a set of user IDs
  | "invite"         // invite a new user by email
  | "promote"        // grant admin role
  | "demote"         // revoke admin role
  | "ban"            // ban account (100 years)
  | "unban"          // lift ban
  | "delete"         // hard delete user + all data
  | "reset_password"; // send password reset email

interface RequestBody {
  action: Action;
  target_user_id?: string;
  user_ids?: string[];   // used by list_users
  email?: string;                    // used by invite
  full_name?: string;                // used by invite (pre-fills profile)
  specialty?: string;                // used by invite (pre-fills profile)
  role?: "provider" | "admin";      // used by invite
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the caller is a real, authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(token);
    if (callerError || !caller) return json({ error: "Unauthorized" }, 401);

    // Verify the caller has the admin role in our user_roles table
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "Forbidden: admin role required" }, 403);

    const body: RequestBody = await req.json();
    const { action, target_user_id, user_ids } = body;

    if (!action) return json({ error: "Missing action" }, 400);

    // Prevent an admin from acting on themselves for destructive actions
    if (
      target_user_id &&
      caller.id === target_user_id &&
      ["ban", "delete", "demote"].includes(action)
    ) {
      return json({ error: "Cannot perform this action on your own account" }, 400);
    }

    switch (action) {
      case "invite": {
        const { email, full_name, specialty } = body;
        if (!email) return json({ error: "Missing email" }, 400);

        // inviteUserByEmail creates the auth.users row and sends the invite email.
        // The user clicks the link, lands on /accept-invite, and sets their password.
        const { data: inviteData, error: inviteError } =
          await adminClient.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${req.headers.get("origin") ?? Deno.env.get("SITE_URL")}/accept-invite`,
            data: { full_name: full_name ?? null, specialty: specialty ?? null },
          });

        if (inviteError) return json({ error: inviteError.message }, 500);

        if (inviteData.user) {
          const updates: Record<string, string> = {};
          if (full_name) updates.full_name = full_name;
          if (specialty) updates.specialty = specialty;

          // Pre-fill the profile row that handle_new_user() trigger already created
          if (Object.keys(updates).length) {
            await adminClient.from("profiles").update(updates).eq("user_id", inviteData.user.id);
          }

          // Grant admin role if requested
          if (body.role === "admin") {
            await adminClient
              .from("user_roles")
              .upsert({ user_id: inviteData.user.id, role: "admin" }, { onConflict: "user_id,role" });
          }
        }

        return json({ success: true, message: "Invitation sent" });
      }

      case "list_users": {
        if (!user_ids?.length) return json({ users: [] });
        // Fetch up to 100 users by ID via admin API — returns email + ban_duration
        const results = await Promise.all(
          user_ids.map((id) => adminClient.auth.admin.getUserById(id))
        );
        type UserResult = Awaited<ReturnType<typeof adminClient.auth.admin.getUserById>>;
        const users = results
          .filter((r: UserResult) => !r.error && r.data.user)
          .map((r: UserResult) => {
            const u = r.data.user!;
            return {
              id: u.id,
              email: u.email ?? null,
              is_banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
            };
          });
        return json({ users });
      }
      case "promote": {
        // Insert admin role — ignore if already exists
        const { error } = await adminClient
          .from("user_roles")
          .upsert({ user_id: target_user_id, role: "admin" }, { onConflict: "user_id,role" });
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, message: "User promoted to admin" });
      }

      case "demote": {
        const { error } = await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", target_user_id)
          .eq("role", "admin");
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, message: "Admin role removed" });
      }

      case "ban": {
        const { error } = await adminClient.auth.admin.updateUserById(
          target_user_id,
          { ban_duration: "876000h" }, // ~100 years
        );
        if (error) return json({ error: error.message }, 500);
        // Invalidate all active sessions
        await adminClient.auth.admin.signOut(target_user_id, "others").catch(() => {});
        return json({ success: true, message: "User banned" });
      }

      case "unban": {
        const { error } = await adminClient.auth.admin.updateUserById(
          target_user_id,
          { ban_duration: "none" },
        );
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, message: "User unbanned" });
      }

      case "delete": {
        // Hard delete — Supabase cascades to all tables referencing auth.users
        const { error } = await adminClient.auth.admin.deleteUser(target_user_id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, message: "User deleted" });
      }

      case "reset_password": {
        // Fetch the target user's email first
        const { data: { user: target }, error: fetchError } =
          await adminClient.auth.admin.getUserById(target_user_id);
        if (fetchError || !target?.email) {
          return json({ error: "Could not find user email" }, 500);
        }
        const { error } = await adminClient.auth.resetPasswordForEmail(target.email, {
          redirectTo: `${req.headers.get("origin") ?? Deno.env.get("SUPABASE_URL")}/reset-password`,
        });
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, message: "Password reset email sent" });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("admin-manage-user error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
