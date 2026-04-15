import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    const { file_path, document_type } = await req.json();
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

    // Convert to base64 for AI
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const systemPrompt = `Você é um assistente especializado em extrair dados de documentos financeiros brasileiros (Notas Fiscais de Serviço e Boletos bancários).

Analise o PDF fornecido e extraia os seguintes campos:
- numero_documento: número da NF ou boleto
- valor: valor total em reais (apenas o número, ex: 4000.00)
- cnpj_emitente: CNPJ do prestador/emitente (formato XX.XXX.XXX/XXXX-XX)
- cnpj_tomador: CNPJ ou CPF do tomador/cliente
- razao_social_emitente: nome/razão social do emitente
- razao_social_tomador: nome/razão social do tomador
- data_emissao: data de emissão (formato YYYY-MM-DD)
- data_vencimento: data de vencimento (formato YYYY-MM-DD)
- descricao_servico: descrição resumida do serviço
- numero_po: número da PO/ordem de compra, se houver

Tipo de documento esperado: ${document_type === "boleto" ? "Boleto bancário" : "Nota Fiscal de Serviço (NFS-e)"}`;

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
                text: "Extraia os dados deste documento financeiro.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_financial_data",
              description: "Extrai dados estruturados de um documento financeiro brasileiro",
              parameters: {
                type: "object",
                properties: {
                  numero_documento: { type: "string", description: "Número da NF ou boleto" },
                  valor: { type: "number", description: "Valor total em reais" },
                  cnpj_emitente: { type: "string", description: "CNPJ do emitente" },
                  cnpj_tomador: { type: "string", description: "CNPJ/CPF do tomador" },
                  razao_social_emitente: { type: "string", description: "Razão social do emitente" },
                  razao_social_tomador: { type: "string", description: "Razão social do tomador" },
                  data_emissao: { type: "string", description: "Data de emissão YYYY-MM-DD" },
                  data_vencimento: { type: "string", description: "Data de vencimento YYYY-MM-DD" },
                  descricao_servico: { type: "string", description: "Descrição do serviço" },
                  numero_po: { type: "string", description: "Número da PO se houver" },
                },
                required: ["numero_documento", "valor"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_financial_data" } },
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
    
    let extractedData: Record<string, any> = {};
    try {
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        extractedData = JSON.parse(toolCall.function.arguments);
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
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
