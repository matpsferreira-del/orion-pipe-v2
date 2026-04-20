// Edge function que atua como proxy autenticado para a Pathly Bridge.
// Valida o JWT do usuário no Orion e repassa a chamada usando o ORION_BRIDGE_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ACTIONS = new Set([
  "activate_plan",
  "upsert_company",
  "upsert_contact",
  "list_mentee_contributions",
  "list_active_plans",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== "string") {
      return json({ error: "Invalid request body" }, 400);
    }

    const { action, payload } = body;
    if (!ALLOWED_ACTIONS.has(action)) {
      return json({ error: `Unknown action: ${action}` }, 400);
    }

    const bridgeUrl = Deno.env.get("PATHLY_FUNCTIONS_URL");
    const bridgeSecret = Deno.env.get("ORION_BRIDGE_SECRET");
    if (!bridgeUrl || !bridgeSecret) {
      console.error("Missing PATHLY_FUNCTIONS_URL or ORION_BRIDGE_SECRET");
      return json({ error: "Bridge not configured" }, 500);
    }

    const target = `${bridgeUrl.replace(/\/$/, "")}/orion-bridge`;
    const resp = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-orion-secret": bridgeSecret,
      },
      body: JSON.stringify({
        action,
        payload: payload ?? {},
        actor: {
          user_id: claims.claims.sub,
          email: claims.claims.email,
        },
      }),
    });

    const text = await resp.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      console.error("Pathly bridge error", resp.status, data);
      return json({ error: "Bridge call failed", status: resp.status, data }, 502);
    }

    return json({ ok: true, data }, 200);
  } catch (err) {
    console.error("pathly-proxy error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
