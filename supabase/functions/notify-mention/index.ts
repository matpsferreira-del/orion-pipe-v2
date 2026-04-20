import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID")!;
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET")!;

async function refreshAccessToken(refreshToken: string) {
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
  return await res.json() as { access_token: string; expires_in: number };
}

function buildRawEmail(from: string, to: string, subject: string, htmlBody: string): string {
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(htmlBody))),
  ].join("\r\n");

  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    const { mention_id } = await req.json();
    if (!mention_id) {
      return new Response(JSON.stringify({ error: "mention_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Load mention + related entities
    const { data: mention, error: mErr } = await service
      .from("opportunity_mentions").select("*").eq("id", mention_id).maybeSingle();
    if (mErr || !mention) {
      return new Response(JSON.stringify({ error: "mention not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: mentionedProfile }, { data: byProfile }, { data: opp }] = await Promise.all([
      service.from("profiles").select("name,email,user_id").eq("id", mention.mentioned_user_id).maybeSingle(),
      service.from("profiles").select("name,email,user_id").eq("id", mention.mentioned_by_user_id).maybeSingle(),
      service.from("opportunities").select("company_id,observacoes,valor_potencial,stage").eq("id", mention.opportunity_id).maybeSingle(),
    ]);

    if (!mentionedProfile?.email) {
      return new Response(JSON.stringify({ error: "mentioned user has no email" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let companyName = "Pessoa Física";
    if (opp?.company_id) {
      const { data: company } = await service.from("companies").select("nome_fantasia").eq("id", opp.company_id).maybeSingle();
      companyName = company?.nome_fantasia || "—";
    } else {
      const pf = opp?.observacoes?.match(/\[PF: (.+?)\]/)?.[1];
      if (pf) companyName = pf;
    }

    // 2. Use the marker's Gmail token to send (so the email comes from a real user)
    const { data: tokens } = await service.from("gmail_tokens")
      .select("*").eq("user_id", byProfile?.user_id || "").maybeSingle();

    if (!tokens) {
      // No Gmail connected — just return success (in-app badge still works)
      return new Response(JSON.stringify({ success: true, email_skipped: "no_gmail_token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokens.access_token;
    if (new Date(tokens.token_expiry) <= new Date()) {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      if (!refreshed) {
        return new Response(JSON.stringify({ success: true, email_skipped: "refresh_failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = refreshed.access_token;
      await service.from("gmail_tokens").update({
        access_token: refreshed.access_token,
        token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", byProfile?.user_id || "");
    }

    const senderEmail = tokens.gmail_email || byProfile?.email || "noreply@orion.com";
    const subject = `Você foi marcado em uma oportunidade: ${companyName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <h2 style="color:#0891b2;margin-bottom:8px">Nova menção em oportunidade</h2>
        <p><strong>${byProfile?.name || "Um colega"}</strong> marcou você em uma oportunidade comercial e precisa da sua ação.</p>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0"><strong>Oportunidade:</strong> ${companyName}</p>
          ${mention.observacao ? `<p style="margin:8px 0 0"><strong>Observação:</strong><br/>${mention.observacao.replace(/\n/g, "<br/>")}</p>` : ""}
        </div>
        <p style="font-size:13px;color:#64748b">Acesse o sistema para visualizar, registrar a ação e sinalizar a menção como resolvida.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
        <p style="font-size:12px;color:#94a3b8">Notificação enviada via Orion CRM</p>
      </div>
    `;

    const raw = buildRawEmail(senderEmail, mentionedProfile.email, subject, html);
    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });

    const gmailData = await gmailRes.json();

    await service.from("email_log").insert({
      sender_user_id: byProfile?.user_id || mention.mentioned_by_user_id,
      sender_email: senderEmail,
      recipients: [mentionedProfile.email],
      subject,
      body: html,
      status: gmailRes.ok ? "sent" : "failed",
      error_message: gmailRes.ok ? null : JSON.stringify(gmailData),
      metadata: { source: "mention", mention_id },
    });

    return new Response(JSON.stringify({ success: gmailRes.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
