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

    // Fetch chart of accounts to help AI classify
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

    const systemPrompt = `Você é um assistente CONTÁBIL especializado em ler documentos fiscais brasileiros (Notas Fiscais de Serviço/Produto e Boletos) e classificá-los no plano de contas.

⚠️ ATENÇÃO MÁXIMA À LEITURA DO DOCUMENTO ⚠️
Antes de classificar, LEIA INTEGRALMENTE o documento, especialmente:
- **DESCRIÇÃO DO SERVIÇO / DISCRIMINAÇÃO DOS SERVIÇOS** (campo principal da NFS-e — é onde está descrito o que foi prestado)
- **Natureza da Operação** / Código de Serviço (LC 116/03) / CNAE
- **Itens da nota** (código, descrição, quantidade)
- **Razão social do emitente e do tomador** (ajudam a entender o tipo de relação)
- **Histórico / Instruções** do boleto (geralmente trazem o motivo da cobrança)
- **Observações / Informações Complementares**

A descrição do serviço é a FONTE PRIMÁRIA da classificação contábil. Não confie apenas no nome do emitente — leia o que está sendo cobrado.

═══════════════════════════════════════════
PASSO 1 — TIPO DO DOCUMENTO
═══════════════════════════════════════════
"nf" (Nota Fiscal de Serviço/Produto) ou "boleto" (Boleto bancário)

═══════════════════════════════════════════
PASSO 2 — NATUREZA FINANCEIRA
═══════════════════════════════════════════
- "receita": NF/boleto EMITIDO pela empresa (estamos vendendo/prestando)
- "custo": custo direto da operação (ex.: terceirização de serviço de recrutamento, freelancer, consultor externo do projeto)
- "despesa": despesa administrativa/geral (aluguel, software, energia, contábil, marketing)
- "deducao": imposto retido na fonte ou dedução fiscal
Padrão se incerto: "despesa".

═══════════════════════════════════════════
PASSO 3 — CLASSIFICAÇÃO CONTÁBIL (CRÍTICO)
═══════════════════════════════════════════
Use EXCLUSIVAMENTE o plano de contas abaixo. Os nomes de "pacote" e "conta_contabil" devem ser idênticos (case-sensitive) aos listados:

${accountsList}

🔍 METODOLOGIA DE MATCHING:
1. Extraia palavras-chave da descrição do serviço (ex.: "licença de uso", "honorários contábeis", "recrutamento executivo", "energia elétrica", "internet banda larga", "aluguel sala comercial").
2. Compare com cada conta do plano. Considere sinônimos comuns:
   • Software/SaaS/licença/plataforma/assinatura/sistema → **Tecnologia > Licenças de Software**
   • Internet/banda larga/link dedicado/dados/telefonia IP → **Tecnologia > Comunicações de Dados**
   • Energia/luz/CEMIG/ENEL/Light/Coelba/CPFL → **Instalações > Energia Eletrica**
   • Aluguel imóvel/locação sala → **Instalações > Aluguel PF** (ou PJ se locador for empresa)
   • Condomínio → **Instalações > Condomínios**
   • Contador/contabilidade/honorários contábeis/escrituração → **Financeiro > Contábil**
   • Advogado/jurídico/honorários advocatícios → **Financeiro > Jurídico**
   • Material de escritório/papelaria/suprimentos → **Suporte > Material de Escritorio**
   • Marketing/publicidade/anúncios/Meta Ads/Google Ads → **Marketing > ...** (escolha a sub-conta exata)
   • Recrutamento/seleção/headhunter/hunting executivo (NF EMITIDA por nós) → **Receita > Vagas** ou **Receita > Hunting**
   • Outplacement/recolocação (NF EMITIDA por nós) → **Receita > Outplacement**
   • RPO/Recruitment Process Outsourcing (NF EMITIDA por nós) → **Receita > RPO**
   • Consultoria de RH/projetos pontuais (NF EMITIDA) → **Receita > Consultoria**
   • ISS/IRRF/CSLL/PIS/COFINS retidos → **Deducao > ...**
3. Se houver MAIS DE UMA conta candidata, escolha a mais específica (ex.: "Licenças de Software" é melhor que "Tecnologia > Outros").
4. Se a descrição for genérica e não casar com nenhuma conta específica, use a conta mais próxima do pacote correto e registre sua dúvida em "observacao_classificacao".
5. NUNCA invente nomes de conta — só use o que está no plano acima.

═══════════════════════════════════════════
PASSO 4 — EXTRAÇÃO DE CAMPOS
═══════════════════════════════════════════

Retorne APENAS um JSON válido (sem markdown, sem texto extra) com os campos:
{
  "document_type": "nf" ou "boleto",
  "classificacao": "receita" | "custo" | "despesa" | "deducao",
  "pacote": "nome EXATO do pacote do plano de contas",
  "conta_contabil": "nome EXATO da conta contábil do plano de contas",
  "observacao_classificacao": "explique em 1 frase POR QUE escolheu essa conta, citando o trecho da descrição do serviço que embasou a decisão",
  "numero_documento": "número da NF ou boleto",
  "valor": 0.00,
  "cnpj_emitente": "CNPJ do emitente",
  "cnpj_tomador": "CNPJ/CPF do tomador",
  "razao_social_emitente": "nome do emitente",
  "razao_social_tomador": "nome do tomador",
  "data_emissao": "YYYY-MM-DD",
  "data_vencimento": "YYYY-MM-DD",
  "descricao_servico": "TRANSCREVA literalmente o campo 'Discriminação dos Serviços' / 'Descrição' / 'Histórico' do documento (até 500 caracteres). NÃO resuma — copie o texto original.",
  "codigo_servico": "código LC 116/03 ou CNAE se houver, senão null",
  "numero_po": "número da PO se houver, senão null"
}

REGRAS FINAIS:
- valor: numérico (ex: 4000.00), sem formatação
- datas: formato YYYY-MM-DD
- campos não encontrados: null
- pacote e conta_contabil: nomes EXATOS do plano de contas (não traduza, não abrevie)
- descricao_servico: TRANSCREVA o campo original do documento — é a evidência da classificação`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
                text: "Leia o documento INTEIRO com atenção, especialmente o campo 'Discriminação dos Serviços' (NFS-e) ou 'Histórico/Instruções' (boleto). Extraia os dados e classifique-o conforme o plano de contas. Retorne APENAS o JSON.",
              },
            ],
          },
        ],
        max_tokens: 3000,
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
