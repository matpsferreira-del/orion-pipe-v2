// Generate marketing/outreach email templates via Lovable AI Gateway.
// Returns up to N suggestions: { name, subject, body } using {first_name}/{full_name}/{company}/{cargo} variables.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      prompt = "",
      tone = "profissional",
      goal = "prospecção comercial B2B",
      count = 3,
    } = body as { prompt?: string; tone?: string; goal?: string; count?: number };

    const safeCount = Math.max(1, Math.min(5, Number(count) || 3));

    const systemPrompt = `Você é um especialista em copywriting de e-mails comerciais B2B em português do Brasil.
Gere ${safeCount} variações de e-mail curtas, claras e personalizáveis.

Regras:
- Use as variáveis exatamente como: {first_name}, {full_name}, {company}, {cargo}
- Tom: ${tone}
- Objetivo: ${goal}
- Assunto: máximo 60 caracteres, sem clickbait
- Corpo: 3 a 6 parágrafos curtos, com chamada à ação clara no final
- Use HTML simples no corpo (apenas <p>, <br>, <strong>, <a>)
- Não invente nome do remetente nem assinatura fixa; deixe um placeholder de assinatura ao final, ex: <p>Atenciosamente,<br/>[Seu nome]</p>
- Cada variação deve ter um "name" curto descritivo (ex: "Abertura direta", "Caso de uso", "Convite para reunião")`;

    const userPrompt = prompt?.trim()
      ? `Contexto fornecido pelo usuário:\n${prompt.trim()}`
      : `Crie variações genéricas de e-mail de primeiro contato para tomadores de decisão.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_email_templates",
              description: "Retorna variações de templates de e-mail",
              parameters: {
                type: "object",
                properties: {
                  templates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        subject: { type: "string" },
                        body: { type: "string", description: "HTML simples" },
                      },
                      required: ["name", "subject", "body"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["templates"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_email_templates" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar templates" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments || "{}";
    let parsed: { templates?: Array<{ name: string; subject: string; body: string }> } = {};
    try {
      parsed = JSON.parse(argsStr);
    } catch (_) {
      parsed = {};
    }

    const templates = Array.isArray(parsed.templates) ? parsed.templates : [];

    return new Response(JSON.stringify({ templates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-email-template error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
