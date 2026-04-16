import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// deno-lint-ignore no-explicit-any
declare const Deno: any;
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the calling user via their JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the service-role admin client for all operations.
    // adminClient.auth.getUser(token) validates the JWT server-side using
    // Supabase's own key — this handles ES256 tokens correctly, whereas
    // creating a user-scoped anon client and calling getUser() fails with
    // UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM for ES256 JWTs.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Soft-delete: ban the user far into the future so they can no longer log in.
    // This preserves all data while preventing access.
    const { error: banError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { ban_duration: "876000h" } // ~100 years
    );

    if (banError) {
      console.error("Ban error:", banError);
      return new Response(JSON.stringify({ error: "Failed to disable account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign out all sessions for this user so any active tokens stop working
    const { error: signOutError } = await adminClient.auth.admin.signOut(
      // Sign out by user id — invalidates every refresh token for this user
      user.id,
      "others" // "others" invalidates all sessions; we use "others" so the
                // current session token (already being disposed on client) is also covered
    );

    if (signOutError) {
      // Non-fatal — the ban already prevents re-authentication
      console.warn("Sign-out warning:", signOutError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account disabled successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
