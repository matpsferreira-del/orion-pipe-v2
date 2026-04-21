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

    const systemPrompt = `Você é um validador de dados de contatos profissionais brasileiros (LinkedIn).
Sua tarefa: identificar quando o CARGO e a EMPRESA estão trocados, ou quando algum dos campos está claramente incorreto.

Regras:
- Cargo: profissão/posição (ex: "Diretor Comercial", "Head of HR", "CEO", "Gerente de RH")
- Empresa: nome de organização (ex: "Ambev", "Itaú", "Magazine Luiza", "Google Brasil")
- Se nome de empresa aparecer no campo cargo OU vice-versa, sugira a troca.
- Se o cargo contiver " na " ou " at " (ex: "Diretor na Vale"), sugira separar.
- Ignore contatos onde os dados parecem corretos. NÃO retorne sugestões para eles.
- Se ambos campos estiverem vazios ou nulos, ignore.
- Seja conservador: só sugira se tiver alta confiança.`;

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
