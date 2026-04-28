const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

    const { contacts } = await req.json() as { contacts: Array<{ id: string; name: string; current_position: string | null; company_name: string | null; linkedin_url?: string | null }> };
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const candidates = contacts.filter(c => c.current_position || c.company_name);
    if (candidates.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você é um especialista em validação de dados profissionais brasileiros. Analise contatos e detecte inconsistências nos campos CARGO (current_position) e EMPRESA (company_name).

TIPOS DE INCONSISTÊNCIAS:
1. Cargo igual à empresa (mais comum) — cargo deve ficar vazio
2. Campos trocados — empresa no campo cargo e vice-versa
3. Campos combinados — "Diretor na Vale" deve separar em cargo: "Diretor", empresa: "Vale"
4. Cargo inválido — nome próprio, sigla, URL
5. Empresa inválida — cargo ou localização no campo empresa

Retorne SOMENTE contatos com problema real. Use reason em PT-BR (máx 120 chars).`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        tools: [{
          name: 'report_inconsistencies',
          description: 'Reporta contatos com cargo/empresa inconsistentes',
          input_schema: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    contact_id: { type: 'string' },
                    name: { type: 'string' },
                    suggested_position: { type: 'string' },
                    suggested_company: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['contact_id', 'name', 'suggested_position', 'suggested_company', 'reason'],
                  additionalProperties: false,
                },
              },
            },
            required: ['suggestions'],
            additionalProperties: false,
          },
        }],
        tool_choice: { type: 'tool', name: 'report_inconsistencies' },
        messages: [{
          role: 'user',
          content: `Analise estes contatos e retorne os que precisam de correção:\n\n${JSON.stringify(candidates, null, 2)}`,
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições. Tente novamente em instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Anthropic API error ${response.status}`);
    }

    const data = await response.json();
    const toolUse = data.content?.find((b: any) => b.type === 'tool_use');
    const rawSuggestions = toolUse?.input?.suggestions ?? [];

    const contactMap = new Map(candidates.map(c => [c.id, c]));
    const suggestions = rawSuggestions
      .map((s: any) => {
        const original = contactMap.get(s.contact_id);
        if (!original) return null;
        const suggestedPos = s.suggested_position?.trim() || null;
        const suggestedComp = s.suggested_company?.trim() || null;
        if (suggestedPos === original.current_position && suggestedComp === original.company_name) return null;
        return {
          contact_id: s.contact_id,
          name: s.name || original.name,
          linkedin_url: original.linkedin_url ?? null,
          original: { current_position: original.current_position, company_name: original.company_name },
          suggested: { current_position: suggestedPos, company_name: suggestedComp },
          reason: s.reason,
        };
      })
      .filter(Boolean);

    const norm = (s: string | null) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    const alreadyFlagged = new Set(suggestions.map((s: any) => s.contact_id));
    for (const c of candidates) {
      if (alreadyFlagged.has(c.id)) continue;
      if (norm(c.current_position) && norm(c.current_position) === norm(c.company_name)) {
        suggestions.push({
          contact_id: c.id,
          name: c.name,
          linkedin_url: c.linkedin_url ?? null,
          original: { current_position: c.current_position, company_name: c.company_name },
          suggested: { current_position: null, company_name: c.company_name },
          reason: 'Cargo idêntico ao nome da empresa — cargo deve ficar vazio.',
        });
      }
    }

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
