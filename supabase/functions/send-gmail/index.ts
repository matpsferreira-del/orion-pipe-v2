import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID")!;
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET")!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return await res.json();
}

interface Attachment {
  filename: string;
  mimeType: string;
  base64Data: string;
}

function buildRawEmail(from: string, to: string[], subject: string, htmlBody: string, attachments?: Attachment[]): string {
  const boundary = "boundary_" + Date.now();
  const toHeader = to.join(", ");

  const parts: string[] = [
    `From: ${from}`,
    `To: ${toHeader}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(htmlBody))),
  ];

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${att.mimeType}; name="=?UTF-8?B?${btoa(unescape(encodeURIComponent(att.filename)))}?="`);
      parts.push(`Content-Disposition: attachment; filename="=?UTF-8?B?${btoa(unescape(encodeURIComponent(att.filename)))}?="`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push(``);
      parts.push(att.base64Data);
    }
  }

  parts.push(`--${boundary}--`);

  const raw = parts.join("\r\n");

  // URL-safe base64
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { recipients, subject, html_body, template_id, attachments } = body;

    if (!recipients?.length || !subject || !html_body) {
      return new Response(
        JSON.stringify({ error: "recipients, subject, and html_body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Gmail tokens using service role
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokens, error: tokenError } = await serviceClient
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenError || !tokens) {
      return new Response(
        JSON.stringify({ error: "Gmail não conectado. Conecte sua conta Gmail nas Configurações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token needs refresh
    let accessToken = tokens.access_token;
    const tokenExpiry = new Date(tokens.token_expiry);

    if (tokenExpiry <= new Date()) {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      if (!refreshed) {
        return new Response(
          JSON.stringify({ error: "Falha ao renovar token do Gmail. Reconecte sua conta." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      accessToken = refreshed.access_token;

      // Update stored token
      await serviceClient
        .from("gmail_tokens")
        .update({
          access_token: refreshed.access_token,
          token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    const senderEmail = tokens.gmail_email || claimsData.claims.email;

    // Send email via Gmail API
    const rawMessage = buildRawEmail(senderEmail, recipients, subject, html_body, attachments);

    const gmailRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: rawMessage }),
      }
    );

    const gmailData = await gmailRes.json();

    const status = gmailRes.ok ? "sent" : "failed";
    const errorMessage = gmailRes.ok ? null : JSON.stringify(gmailData);

    // Log the email
    await serviceClient.from("email_log").insert({
      sender_user_id: userId,
      sender_email: senderEmail,
      recipients,
      subject,
      body: html_body,
      template_id: template_id || null,
      status,
      error_message: errorMessage,
      metadata: { gmail_message_id: gmailData.id, has_attachments: !!(attachments?.length) },
    });

    if (!gmailRes.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao enviar email", details: gmailData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: gmailData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
