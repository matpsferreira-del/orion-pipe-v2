import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const jobSlug = url.searchParams.get('slug');

    if (!jobSlug) {
      return new Response(
        JSON.stringify({ error: 'slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find job by slug
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .eq('slug', jobSlug)
      .eq('published', true)
      .eq('status', 'open')
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ questions: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: questions, error: qError } = await supabaseAdmin
      .from('job_questions')
      .select('id, question_text, question_type, options, position, required')
      .eq('job_id', job.id)
      .order('position', { ascending: true });

    if (qError) {
      console.error('Error fetching questions:', qError);
      return new Response(
        JSON.stringify({ questions: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ questions: questions || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ questions: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
