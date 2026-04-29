import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// deno-lint-ignore no-explicit-any
declare const Deno: any;
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateTempPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;

  const pick = (charset: string): string => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return charset[arr[0] % charset.length];
  };

  // Guarantee at least one character from each required class (4 chars)
  const chars = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(special),
    ...Array.from({ length: 8 }, () => pick(all)),
  ];

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

async function sendCredentialsEmail(
  toEmail: string,
  fullName: string | undefined,
  tempPassword: string,
  siteUrl: string,
): Promise<void> {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not set — skipping credentials email");
    return;
  }

  const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "noreply@elynai.live";
  const greeting = fullName ? `Hello ${fullName},` : "Hello,";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:500px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#0ea5e9,#38bdf8);padding:32px 24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">elyn™</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:13px;">AI Clinical Documentation</p>
      </div>
      <div style="padding:32px 24px;">
        <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">${greeting}</p>
        <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
          Your Elyn account has been created by an administrator. Use the credentials below to sign in.
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:12px 16px;background:#f1f5f9;font-weight:600;color:#374151;font-size:13px;width:40%;">Email</td>
              <td style="padding:12px 16px;color:#1e293b;font-size:13px;">${toEmail}</td>
            </tr>
            <tr style="border-top:1px solid #e2e8f0;">
              <td style="padding:12px 16px;background:#f1f5f9;font-weight:600;color:#374151;font-size:13px;">Temporary Password</td>
              <td style="padding:12px 16px;color:#1e293b;font-size:13px;font-family:'Courier New',monospace;letter-spacing:1px;">${tempPassword}</td>
            </tr>
          </table>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
          <p style="margin:0;color:#dc2626;font-size:13px;font-weight:600;">⚠ You must set a new password on first login.</p>
          <p style="margin:6px 0 0;color:#991b1b;font-size:12px;line-height:1.5;">
            Your new password must be at least 12 characters and contain uppercase letters, lowercase letters, a number, and a special character.
          </p>
        </div>
        <div style="text-align:center;">
          <a href="${siteUrl}/auth"
             style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Sign In to Elyn
          </a>
        </div>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;color:#94a3b8;font-size:11px;">
          If you did not expect this email, contact
          <a href="mailto:support@elynai.live" style="color:#0ea5e9;">support@elynai.live</a>
        </p>
      </div>
    </div>
  `;

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: fromEmail, name: "Elyn" },
      subject: "Your Elyn Account Credentials",
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("SendGrid error — credentials email NOT sent:", res.status, body);
    return;
  }
  console.log("Credentials email sent to", toEmail);
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

    // Verify the caller is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(token);
    if (callerError || !caller) return json({ error: "Unauthorized" }, 401);

    // Verify admin role
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "Forbidden: admin role required" }, 403);

    const body = await req.json();
    const { email, full_name, specialty, npi_number, role = "provider" } = body;

    if (!email?.trim()) return json({ error: "Email is required" }, 400);

    const tempPassword = generateTempPassword();

    // Create the user — email_confirm skips the verification step so they can log in immediately
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name?.trim() ?? null,
        specialty: specialty?.trim() ?? null,
        must_reset_password: true,
      },
    });

    if (createError) return json({ error: createError.message }, 500);

    const userId = newUserData.user.id;

    // Update the profile row created by handle_new_user() trigger
    const profileUpdates: Record<string, string> = {};
    if (full_name?.trim()) profileUpdates.full_name = full_name.trim();
    if (specialty?.trim()) profileUpdates.specialty = specialty.trim();
    if (npi_number?.trim()) profileUpdates.npi_number = npi_number.trim();

    if (Object.keys(profileUpdates).length) {
      await adminClient.from("profiles").update(profileUpdates).eq("user_id", userId);
    }

    // Grant admin role if requested
    if (role === "admin") {
      await adminClient
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    }

    // Send login credentials via Twilio SendGrid
    const siteUrl =
      req.headers.get("origin") ?? Deno.env.get("SITE_URL") ?? "https://elynai.live";
    await sendCredentialsEmail(email.trim(), full_name?.trim(), tempPassword, siteUrl);

    return json({ success: true, message: "User created and credentials emailed" });
  } catch (err) {
    console.error("admin-create-user error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
