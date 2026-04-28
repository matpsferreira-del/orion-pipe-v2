import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTRACT_TOOL = {
  name: "extract_financial_document",
  description: "Extrai e classifica dados de um documento financeiro brasileiro (NF ou boleto).",
  input_schema: {
    type: "object",
    properties: {
      document_type: { type: "string", enum: ["nf", "boleto"] },
      classificacao: { type: "string", enum: ["receita", "custo", "despesa", "deducao"] },
      pacote: { type: "string", description: "Nome do pacote correspondente do plano de contas" },
      conta_contabil: { type: "string", description: "Nome exato da conta contábil" },
      numero_documento: { type: "string" },
      valor: { type: "number" },
      cnpj_emitente: { type: "string" },
      cnpj_tomador: { type: "string" },
      razao_social_emitente: { type: "string" },
      razao_social_tomador: { type: "string" },
      data_emissao: { type: "string", description: "YYYY-MM-DD" },
      data_vencimento: { type: "string", description: "YYYY-MM-DD" },
      descricao_servico: { type: "string" },
      numero_po: { type: "string" },
    },
    required: [
      "document_type", "classificacao", "pacote", "conta_contabil",
      "numero_documento", "valor", "razao_social_emitente",
      "data_emissao", "descricao_servico",
    ],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

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

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: accounts } = await serviceClient
      .from("chart_of_accounts")
      .select("tipo, pacote, conta_contabil")
      .eq("ativo", true)
      .order("tipo")
      .order("pacote")
      .order("ordem");

    const accountsList = (accounts || [])
      .map((a: any) => `- [${a.tipo}] ${a.pacote} > ${a.conta_contabil}`)
      .join("\n");

    const systemPrompt = `Você é um assistente especializado em extrair dados de documentos financeiros brasileiros.

Analise o documento com atenção a todos os detalhes, textos, descrições e campos.

REGRAS:
1. document_type: "nf" (Nota Fiscal) ou "boleto" (Boleto bancário)
2. classificacao:
   - "receita": NF/boleto emitido PELA empresa (empresa prestando serviço/vendendo)
   - "custo": custo direto da operação
   - "despesa": despesa administrativa/geral
   - "deducao": imposto retido ou dedução fiscal
   Padrão se incerto: "despesa"
3. Classificação contábil — use o Plano de Contas abaixo:

${accountsList}

   Exemplos:
   - Software/licença/plataforma → Tecnologia > Licenças de Software
   - Internet/dados → Tecnologia > Comunicações de Dados
   - Energia elétrica → Instalações > Energia Eletrica
   - Aluguel → Instalações > Aluguel PF
   - Condomínio → Instalações > Condomínios
   - Contador/contabilidade → Financeiro > Contábil
   - Material de escritório → Suporte > Material de Escritorio
   - NF de recrutamento/seleção → Receita > Vagas ou Receita > Hunting
   - NF de outplacement → Receita > Outplacement
   - NF de RPO → Receita > RPO

4. valor: numérico sem formatação (ex: 4000.00)
5. datas: formato YYYY-MM-DD
6. campos não encontrados: null`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25,prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: [{ ...EXTRACT_TOOL }],
        tool_choice: { type: "tool", name: "extract_financial_document" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: "Extraia os dados deste documento financeiro e classifique-o conforme o plano de contas.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Falha ao processar documento com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const toolUse = aiResult.content?.find((b: any) => b.type === "tool_use");
    const extractedData = toolUse?.input ?? {};

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
