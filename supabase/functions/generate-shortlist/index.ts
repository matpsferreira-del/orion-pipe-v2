import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUMMARY_TOOL = {
  name: "candidate_summary",
  description: "Retorna o resumo estruturado do candidato para apresentação de shortlist.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Resumo executivo de 3 linhas sobre o candidato.",
      },
      deliveries: {
        type: "array",
        items: { type: "string" },
        description: "3 bullets curtos sobre principais resultados/entregas.",
      },
      background: {
        type: "array",
        items: { type: "string" },
        description: "3 bullets curtos sobre formação e skills.",
      },
      salary: {
        type: "string",
        description: "Expectativa salarial formatada em BRL.",
      },
    },
    required: ["summary", "deliveries", "background", "salary"],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = {
  type: "text",
  text: "Você é um headhunter sênior. Leia as anotações do candidato e retorne um resumo estruturado conciso e direto para apresentação de shortlist a clientes executivos.",
  cache_control: { type: "ephemeral" },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidates } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

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
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "prompt-caching-2024-07-31",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 512,
            system: [SYSTEM_PROMPT],
            tools: [{ ...SUMMARY_TOOL }],
            tool_choice: { type: "tool", name: "candidate_summary" },
            messages: [
              {
                role: "user",
                content: `Anotações do candidato "${cand.name}":\n${notes}\n\nExpectativa salarial informada: ${salaryRaw ? `R$ ${Number(salaryRaw).toLocaleString("pt-BR")}` : "Não informada"}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.error("Rate limit hit for candidate", cand.name);
            results.push({ ...cand, ai_summary: null, ai_deliveries: null, ai_background: null, ai_error: "Rate limit exceeded" });
            continue;
          }
          throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        const toolUse = data.content?.find((b: any) => b.type === "tool_use");

        if (toolUse?.input) {
          const parsed = toolUse.input;
          results.push({
            ...cand,
            ai_summary: parsed.summary,
            ai_deliveries: parsed.deliveries,
            ai_background: parsed.background,
            salary_expectation: parsed.salary,
          });
        } else {
          results.push({ ...cand, ai_summary: null, ai_deliveries: null, ai_background: null });
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
