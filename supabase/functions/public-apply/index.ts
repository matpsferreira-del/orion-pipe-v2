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
    const { job_slug, full_name, email, phone, linkedin_url, city, state, salary_expectation, notes } = await req.json();

    // Validação básica
    if (!job_slug || !full_name || !email) {
      return new Response(
        JSON.stringify({ error: 'job_slug, full_name e email são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cliente com service role para contornar RLS de party
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Busca a vaga pelo slug — precisa estar publicada e aberta
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

    // 2. resolve_party() — cria ou localiza o party pelo email/telefone
    const { data: partyId, error: partyError } = await supabaseAdmin.rpc('resolve_party', {
      p_full_name: full_name.trim(),
      p_email: email.trim().toLowerCase(),
      p_phone: phone || null,
      p_linkedin_url: linkedin_url || null,
      p_city: city || null,
      p_state: state || null,
      p_created_from: 'site',
      p_notes: notes || null,
    });

    if (partyError || !partyId) {
      console.error('resolve_party error:', partyError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar candidato' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. ensure_party_role() — garante o papel 'candidate'
    const { error: roleError } = await supabaseAdmin.rpc('ensure_party_role', {
      p_party_id: partyId,
      p_role: 'candidate',
      p_confidence: 100,
    });

    if (roleError) {
      console.error('ensure_party_role error:', roleError);
      // Não bloqueia — segue mesmo sem o role
    }

    // 4. Verifica se já existe candidatura para essa vaga
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

    // 5. Insere a candidatura
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
