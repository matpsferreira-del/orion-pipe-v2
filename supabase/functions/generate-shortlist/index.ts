import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidates } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: "No candidates provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const cand of candidates) {
      const notes = cand.notes || "Sem anotações disponíveis.";
      const salaryRaw = cand.salary_expectation;

      try {
        const response = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "Você é um headhunter sênior. Leia as anotações do candidato e retorne APENAS a chamada da função com os dados estruturados. Seja conciso e direto.",
                },
                {
                  role: "user",
                  content: `Anotações do candidato "${cand.name}":\n${notes}\n\nExpectativa salarial informada: ${salaryRaw ? `R$ ${Number(salaryRaw).toLocaleString("pt-BR")}` : "Não informada"}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "candidate_summary",
                    description:
                      "Retorna o resumo estruturado do candidato para a apresentação de shortlist.",
                    parameters: {
                      type: "object",
                      properties: {
                        summary: {
                          type: "string",
                          description:
                            "Resumo executivo de 3 linhas sobre o candidato.",
                        },
                        deliveries: {
                          type: "array",
                          items: { type: "string" },
                          description:
                            "3 bullets curtos sobre principais resultados/entregas.",
                        },
                        background: {
                          type: "array",
                          items: { type: "string" },
                          description:
                            "3 bullets curtos sobre formação e skills.",
                        },
                        salary: {
                          type: "string",
                          description:
                            "Expectativa salarial formatada em BRL.",
                        },
                      },
                      required: ["summary", "deliveries", "background", "salary"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "candidate_summary" },
              },
            }),
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            console.error("Rate limit hit for candidate", cand.name);
            results.push({
              ...cand,
              ai_summary: null,
              ai_deliveries: null,
              ai_background: null,
              ai_error: "Rate limit exceeded",
            });
            continue;
          }
          if (response.status === 402) {
            console.error("Payment required");
            results.push({
              ...cand,
              ai_summary: null,
              ai_deliveries: null,
              ai_background: null,
              ai_error: "Payment required",
            });
            continue;
          }
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          results.push({
            ...cand,
            ai_summary: parsed.summary,
            ai_deliveries: parsed.deliveries,
            ai_background: parsed.background,
            salary_expectation: parsed.salary,
          });
        } else {
          results.push({
            ...cand,
            ai_summary: null,
            ai_deliveries: null,
            ai_background: null,
          });
        }
      } catch (err) {
        console.error(`Error processing candidate ${cand.name}:`, err);
        results.push({
          ...cand,
          ai_summary: null,
          ai_deliveries: null,
          ai_background: null,
          ai_error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({ candidates: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-shortlist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
