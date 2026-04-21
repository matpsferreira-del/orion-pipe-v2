// Edge function: validate-contacts
// Uses Lovable AI to detect inconsistencies in outplacement contacts
// (e.g. cargo and empresa swapped, company name in position field, etc.)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactInput {
  id: string;
  name: string;
  current_position: string | null;
  company_name: string | null;
  linkedin_url?: string | null;
}

interface Suggestion {
  contact_id: string;
  name: string;
  linkedin_url: string | null;
  original: { current_position: string | null; company_name: string | null };
  suggested: { current_position: string | null; company_name: string | null };
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { contacts } = await req.json() as { contacts: ContactInput[] };
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pre-filter: only send contacts that have at least position or company
    const candidates = contacts.filter(c => (c.current_position || c.company_name));
    if (candidates.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você é um especialista sênior em validação de dados profissionais brasileiros, com profundo conhecimento do mercado corporativo, LinkedIn e estruturas organizacionais.

## SUA MISSÃO
Analisar TODOS os contatos enviados, UM POR UM, sem pular nenhum, e identificar inconsistências nos campos CARGO (current_position) e EMPRESA (company_name). Retorne APENAS contatos que precisam de correção, mas analise todos com a mesma atenção.

## DEFINIÇÕES
- **CARGO**: função, posição ou senioridade (ex: "Diretor Comercial", "Head of People", "CEO", "Analista Sênior", "Sócio-fundador", "Gerente de RH", "VP of Engineering", "Coordenadora de Marketing")
- **EMPRESA**: nome de organização/marca (ex: "Ambev", "Itaú Unibanco", "Patria Investments", "Wilson Sons", "Petrobras", "Baker Hughes", "Oceaneering", "AKOFS Offshore", "Bristow Group", "Priner", "Grupo CBO")

## TIPOS DE INCONSISTÊNCIAS A DETECTAR (em ordem de prioridade)

### 0. ⚠️ CARGO IGUAL À EMPRESA (CRÍTICO - falha mais comum)
Quando current_position == company_name (ou são quase idênticos, ignorando caixa/espaços), o cargo está ERRADO. Ninguém tem como cargo o nome da própria empresa.
- Cargo: "Patria Investments" / Empresa: "Patria Investments" → cargo deve ficar VAZIO ("")
- Cargo: "Wilson Sons" / Empresa: "Wilson Sons" → cargo VAZIO
- Cargo: "GRUPO CBO - Companhia Brasileira de Offshore" / Empresa: "GRUPO CBO - Companhia Brasileira de Offshore" → cargo VAZIO
- Cargo: "Petrobras" / Empresa: "Petrobras" → cargo VAZIO
- Cargo: "Baker Hughes" / Empresa: "Baker Hughes" → cargo VAZIO
SEMPRE reporte esses casos. A empresa permanece, o cargo vai para "".

### 1. CAMPOS TROCADOS
Empresa no campo cargo e/ou cargo no campo empresa.
- Cargo: "Itaú" / Empresa: "Diretor de TI" → trocar
- Cargo: "Ambev" / Empresa: vazio → mover para empresa, cargo fica vazio

### 2. CAMPOS COMBINADOS em um só
Cargo contém empresa via conectores: " na ", " at ", " - ", " @ ", " | ", " da ", " do ", " no "
- "Diretor na Vale" → cargo: "Diretor", empresa: "Vale"
- "CEO @ Stone" → cargo: "CEO", empresa: "Stone"
- "Gerente Comercial - Magazine Luiza" → separar
ATENÇÃO: NÃO separe se a parte após o conector for parte legítima do cargo: "Diretor de Vendas" (manter), "Gerente de Projetos" (manter), "Head of People" (manter).

### 3. CARGO INVÁLIDO
Cargo é nome próprio, sigla de empresa, URL, texto truncado ("4 a 4 m"), ou texto não-profissional.

### 4. EMPRESA INVÁLIDA
Empresa contém função (ex: "Diretor"), localização ("São Paulo"), ou descrição genérica.

### 5. RUÍDO/FORMATAÇÃO
- Remover sufixos de localização do cargo: "Diretor - São Paulo" → "Diretor"
- Remover datas: "CEO (2020-presente)" → "CEO"

## PROCESSO DE ANÁLISE OBRIGATÓRIO
Para CADA contato da lista, faça nesta ordem:
1. Compare current_position e company_name normalizados (lowercase, sem espaços extras). Se forem iguais ou quase iguais → REGRA 0, reporte com cargo vazio.
2. Verifique se cargo parece ser nome de empresa conhecida → REGRA 1.
3. Verifique se cargo contém conectores indicando empresa embutida → REGRA 2.
4. Verifique cargo/empresa inválidos ou ruidosos → REGRAS 3, 4, 5.
5. Se nenhum problema, ignore o contato.

NÃO PULE contatos. Se a lista tem 50 contatos, analise os 50.

## REGRAS CRÍTICAS
1. **Use o LINKEDIN_URL** como contexto: o slug pode confirmar nome.
2. **NÃO invente** empresas ou cargos que não estão nos dados. Se não souber o cargo correto, use string vazia "".
3. **NÃO sugira** apenas por capitalização ("diretor" vs "Diretor") sem outro problema.
4. **NÃO sugira** se ambos os campos já estão plausíveis e diferentes entre si.
5. Para REGRA 0 (cargo == empresa), SEMPRE reporte: suggested_position="", suggested_company=<empresa atual>.
6. Para cada sugestão, escreva "reason" em PT-BR curta (máx 120 caracteres) explicando o problema.

## FORMATO DA RESPOSTA
Use a função report_inconsistencies. Inclua TODOS os contatos com problemas, especialmente os de REGRA 0.`;

    const userPrompt = `Analise estes contatos e retorne SOMENTE os que precisam de correção:\n\n${JSON.stringify(candidates, null, 2)}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'report_inconsistencies',
            description: 'Reporta contatos com cargo/empresa trocados ou inconsistentes',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      contact_id: { type: 'string' },
                      name: { type: 'string' },
                      suggested_position: { type: 'string', description: 'Cargo correto (ou string vazia se desconhecido)' },
                      suggested_company: { type: 'string', description: 'Empresa correta (ou string vazia se desconhecido)' },
                      reason: { type: 'string', description: 'Explicação curta em PT-BR' },
                    },
                    required: ['contact_id', 'name', 'suggested_position', 'suggested_company', 'reason'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['suggestions'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'report_inconsistencies' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos no workspace.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      throw new Error(`AI gateway error ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const rawSuggestions = parsed.suggestions || [];

    // Build full suggestion objects with originals
    const contactMap = new Map(candidates.map(c => [c.id, c]));
    const suggestions: Suggestion[] = rawSuggestions
      .map((s: any) => {
        const original = contactMap.get(s.contact_id);
        if (!original) return null;
        const suggestedPos = s.suggested_position?.trim() || null;
        const suggestedComp = s.suggested_company?.trim() || null;
        // Skip if no actual change
        if (suggestedPos === original.current_position && suggestedComp === original.company_name) return null;
        return {
          contact_id: s.contact_id,
          name: s.name || original.name,
          linkedin_url: original.linkedin_url ?? null,
          original: {
            current_position: original.current_position,
            company_name: original.company_name,
          },
          suggested: {
            current_position: suggestedPos,
            company_name: suggestedComp,
          },
          reason: s.reason,
        };
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('validate-contacts error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
