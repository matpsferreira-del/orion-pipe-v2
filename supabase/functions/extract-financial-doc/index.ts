import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJSON(raw: string): any {
  let cleaned = raw
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();

  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const objStart = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (objStart !== -1 && end > objStart) {
      cleaned = cleaned.slice(objStart, end + 1);
    } else {
      throw new Error("No valid JSON found in response");
    }
  }
  return JSON.parse(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { file_path } = await req.json();
    if (!file_path) {
      return new Response(JSON.stringify({ error: "file_path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("financial-documents")
      .download(file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const systemPrompt = `Você é um assistente especializado em extrair dados de documentos financeiros brasileiros.

Analise o PDF fornecido e:
1. Identifique o TIPO do documento: "nf" (Nota Fiscal de Serviço/Produto) ou "boleto" (Boleto bancário)
2. Classifique a NATUREZA FINANCEIRA:
   - "receita": se é uma nota fiscal ou boleto emitido PELA empresa (a empresa está prestando serviço / vendendo)
   - "custo": se é um custo direto relacionado à operação (ex: fornecedores de serviços essenciais, software operacional)
   - "despesa": se é uma despesa administrativa/geral (ex: aluguel, luz, internet, material de escritório)
   - "deducao": se é um imposto retido na fonte ou dedução fiscal
   Se não for possível determinar com certeza, use "despesa" como padrão.
3. Extraia os campos estruturados do documento

Retorne APENAS um JSON válido (sem markdown, sem texto extra) com os campos:
{
  "document_type": "nf" ou "boleto",
  "classificacao": "receita" | "custo" | "despesa" | "deducao",
  "numero_documento": "número da NF ou boleto",
  "valor": 0.00,
  "cnpj_emitente": "CNPJ do emitente",
  "cnpj_tomador": "CNPJ/CPF do tomador",
  "razao_social_emitente": "nome do emitente",
  "razao_social_tomador": "nome do tomador",
  "data_emissao": "YYYY-MM-DD",
  "data_vencimento": "YYYY-MM-DD",
  "descricao_servico": "descrição resumida",
  "numero_po": "número da PO se houver, senão null"
}

IMPORTANTE: 
- valor deve ser numérico (ex: 4000.00), sem formatação
- datas no formato YYYY-MM-DD
- campos não encontrados devem ser null`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
              {
                type: "text",
                text: "Extraia os dados deste documento financeiro e classifique-o. Retorne APENAS o JSON.",
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para processamento com IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Falha ao processar documento com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    
    // Check for truncation
    const finishReason = aiResult.choices?.[0]?.finish_reason;
    if (finishReason === "length" || finishReason === "max_tokens") {
      console.warn("AI response was truncated");
    }

    let extractedData: Record<string, any> = {};
    try {
      const content = aiResult.choices?.[0]?.message?.content;
      if (content) {
        extractedData = extractJSON(content);
      }
      
      // Also try tool_calls fallback
      if (Object.keys(extractedData).length === 0) {
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          extractedData = JSON.parse(toolCall.function.arguments);
        }
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      console.error("Raw content:", aiResult.choices?.[0]?.message?.content);
    }

    return new Response(JSON.stringify({ extracted: extractedData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-financial-doc error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
