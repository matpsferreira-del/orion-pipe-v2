// Edge function: pathly-sync
// Proxy autenticado entre Orion e a bridge "orion-bridge" do projeto Pathly.
// O frontend chama esta função sem precisar conhecer o secret compartilhado.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const PATHLY_FUNCTIONS_URL = Deno.env.get("PATHLY_FUNCTIONS_URL");
  const ORION_BRIDGE_SECRET = Deno.env.get("ORION_BRIDGE_SECRET");

  if (!PATHLY_FUNCTIONS_URL) {
    return json({ error: "PATHLY_FUNCTIONS_URL not configured" }, 500);
  }
  if (!ORION_BRIDGE_SECRET) {
    return json({ error: "ORION_BRIDGE_SECRET not configured" }, 500);
  }

  let body: { action?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { action, payload } = body ?? {};
  if (!action) return json({ error: "action required" }, 400);

  // Build target URL: PATHLY_FUNCTIONS_URL should already point to the
  // functions base, e.g. https://<project-ref>.functions.supabase.co
  const base = PATHLY_FUNCTIONS_URL.replace(/\/+$/, "");
  const target = `${base}/orion-bridge`;

  try {
    const resp = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-orion-secret": ORION_BRIDGE_SECRET,
      },
      body: JSON.stringify({ action, payload }),
    });

    const text = await resp.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return new Response(JSON.stringify(data), {
      status: resp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pathly-sync proxy error", e);
    return json(
      { error: (e as Error).message ?? "Bridge call failed" },
      502,
    );
  }
});
