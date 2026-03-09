import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      job_slug, full_name, email, phone, linkedin_url, city, state,
      salary_expectation, notes,
      // CV structured data from external site
      cv_experiences, cv_skills, cv_education,
      parsed_summary, total_exp_years, current_title, current_company,
    } = await req.json();

    // Validação básica
    if (!job_slug || !full_name || !email) {
      return new Response(
        JSON.stringify({ error: 'job_slug, full_name e email são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Busca a vaga pelo slug
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, title, published, status')
      .eq('slug', job_slug)
      .eq('published', true)
      .eq('status', 'open')
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Vaga não encontrada ou não está disponível' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. resolve_party()
    const { data: partyId, error: partyError } = await supabaseAdmin.rpc('resolve_party', {
      p_full_name: full_name.trim(),
      p_email: email.trim().toLowerCase(),
      p_phone: phone || null,
      p_linkedin_url: linkedin_url || null,
      p_city: city || null,
      p_state: state || null,
      p_created_from: 'site',
      p_notes: notes || null,
      p_current_title: current_title || null,
      p_current_company: current_company || null,
    });

    if (partyError || !partyId) {
      console.error('resolve_party error:', partyError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar candidato' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. ensure_party_role()
    const { error: roleError } = await supabaseAdmin.rpc('ensure_party_role', {
      p_party_id: partyId,
      p_role: 'candidate',
      p_confidence: 100,
    });

    if (roleError) {
      console.error('ensure_party_role error:', roleError);
    }

    // 4. Save CV structured data if provided
    const hasCVData = (cv_experiences?.length || cv_skills?.length || cv_education?.length || parsed_summary);

    if (hasCVData) {
      // Update party with summary fields
      const partyUpdate: Record<string, unknown> = {
        cv_parse_status: 'done',
        cv_parsed_at: new Date().toISOString(),
      };
      if (parsed_summary) partyUpdate.parsed_summary = parsed_summary;
      if (total_exp_years != null) partyUpdate.total_exp_years = total_exp_years;

      await supabaseAdmin.from('party').update(partyUpdate).eq('id', partyId);

      // Delete old CV data and insert fresh (upsert strategy)
      await Promise.all([
        cv_experiences?.length
          ? supabaseAdmin.from('cv_experiences').delete().eq('party_id', partyId).then(() =>
              supabaseAdmin.from('cv_experiences').insert(
                cv_experiences.map((exp: any) => ({
                  party_id: partyId,
                  company: exp.company || exp.empresa || null,
                  role: exp.role || exp.cargo || null,
                  start_date: exp.start_date || exp.periodo_inicio || null,
                  end_date: exp.end_date || exp.periodo_fim || null,
                  is_current: exp.is_current || false,
                  description: exp.description || exp.descricao || null,
                }))
              )
            )
          : Promise.resolve(),
        cv_skills?.length
          ? supabaseAdmin.from('cv_skills').delete().eq('party_id', partyId).then(() =>
              supabaseAdmin.from('cv_skills').insert(
                cv_skills.map((s: any) => ({
                  party_id: partyId,
                  skill: typeof s === 'string' ? s : (s.skill || s.nome),
                  level: typeof s === 'string' ? null : (s.level || s.nivel || null),
                  category: typeof s === 'string' ? null : (s.category || s.categoria || null),
                }))
              )
            )
          : Promise.resolve(),
        cv_education?.length
          ? supabaseAdmin.from('cv_education').delete().eq('party_id', partyId).then(() =>
              supabaseAdmin.from('cv_education').insert(
                cv_education.map((edu: any) => ({
                  party_id: partyId,
                  institution: edu.institution || edu.instituicao || null,
                  degree: edu.degree || edu.nivel || null,
                  field_of_study: edu.field_of_study || edu.curso || null,
                  start_date: edu.start_date || null,
                  end_date: edu.end_date || edu.periodo || null,
                }))
              )
            )
          : Promise.resolve(),
      ]);
    }

    // 5. Verifica se já existe candidatura
    const { data: existing } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('job_id', job.id)
      .eq('party_id', partyId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          application_id: existing.id,
          already_applied: true,
          message: 'Você já se candidatou a esta vaga anteriormente.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Insere a candidatura
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: job.id,
        party_id: partyId,
        source: 'website',
        status: 'new',
        salary_expectation: salary_expectation || null,
        notes: notes || null,
      })
      .select('id')
      .single();

    if (appError || !application) {
      console.error('application insert error:', appError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar candidatura' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        application_id: application.id,
        already_applied: false,
        message: 'Candidatura enviada com sucesso!'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
