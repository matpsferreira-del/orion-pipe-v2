import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTRACT_PROMPT = `Você é um especialista em leitura e extração de dados de currículos para a empresa Orion.
Você receberá um CV em qualquer formato — LinkedIn PDF, Word convertido, CV tradicional, currículo Lattes, ou qualquer outro layout — e deve extrair ABSOLUTAMENTE TODAS as informações presentes, retornando SOMENTE um JSON válido, sem markdown, sem blocos de código, sem qualquer texto antes ou depois.

Identifique automaticamente o formato do documento e adapte a extração. Independente do layout, mapeie as informações para a estrutura abaixo:

ESTRUTURA OBRIGATÓRIA:
{
  "nome": "string — nome completo do candidato",
  "cargo_titulo": "string — cargo atual, título profissional ou headline. Se não houver, inferir pela experiência mais recente",
  "email": "string — endereço de e-mail, se presente",
  "telefone": "string — telefone ou celular, se presente",
  "linkedin": "string — URL do LinkedIn, se presente",
  "localizacao": "string — cidade e estado/país",
  "resumo": "string — copie integralmente o texto de resumo, objetivo, perfil ou summary. Se não houver seção dedicada, deixe vazio",
  "experiencias": [
    {
      "empresa": "string — nome exato da empresa ou organização",
      "cargo": "string — cargo ou função exata",
      "periodo": "string — período completo como aparece no CV, ex: jan/2022 - dez/2023 ou 2022 - Atual",
      "localizacao": "string — cidade/país da experiência, se presente",
      "descricao": "string — texto introdutório ou descritivo da função, copiado integralmente",
      "responsabilidades": ["string — cada responsabilidade, atividade ou atribuição listada, texto completo"],
      "resultados": ["string — cada resultado, conquista, entrega ou impacto quantificado, texto completo"]
    }
  ],
  "formacao": [
    {
      "curso": "string — nome do curso ou área de estudo",
      "instituicao": "string — nome da instituição de ensino",
      "nivel": "string — nível: MBA / Especialização / Pós-Graduação / Bacharelado / Licenciatura / Tecnólogo / Técnico etc.",
      "periodo": "string — período ou ano de conclusão"
    }
  ],
  "idiomas": ["string — idioma e nível, ex: Inglês avançado, Espanhol intermediário"]
}

REGRAS CRÍTICAS — SIGA TODAS:
1. NÃO omita NENHUMA experiência — extraia todas, inclusive estágios, freelas e trabalhos antigos
2. NÃO trunce nem resuma nenhum texto — copie os conteúdos integralmente
3. NÃO invente informações — campos ausentes ficam como "" ou []
4. Separe claramente: texto introdutório vai em "descricao", atividades/atribuições em "responsabilidades", conquistas/métricas em "resultados". Se não houver separação clara, coloque tudo em "responsabilidades"
5. Ordene experiências da mais recente para a mais antiga
6. Se o CV tiver seções com nomes diferentes (ex: "Atuação Profissional", "Histórico", "Trajetória"), trate-as como experiências
7. Retorne APENAS o JSON puro, sem nenhum caractere fora do objeto JSON`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileText, fileType } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userContent: string;

    if (fileType === "pdf" && fileBase64) {
      // For PDFs, send the base64 content as text since the gateway uses OpenAI-compatible API
      // We'll ask the model to parse the base64-encoded PDF content
      userContent = `Este é o conteúdo de um CV em PDF codificado em base64. Extraia todas as informações e retorne o JSON estruturado.\n\nBase64 do PDF:\n${fileBase64}`;
    } else if (fileText) {
      userContent = `Extraia todas as informações deste CV e retorne o JSON estruturado.\n\n---\n${fileText}`;
    } else {
      throw new Error("Nenhum conteúdo de CV fornecido");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: EXTRACT_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();

    let cvData;
    try {
      cvData = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response as JSON:", clean.substring(0, 500));
      throw new Error("A IA não retornou um JSON válido. Tente novamente.");
    }

    return new Response(JSON.stringify({ cvData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-cv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
