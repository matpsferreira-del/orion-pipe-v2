import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateMemberPayload {
  action: 'create';
  email: string;
  password: string;
  name: string;
  role: string;
}

interface UpdateMemberPayload {
  action: 'update';
  profileId: string;
  name: string;
  role: string;
}

interface DeleteMemberPayload {
  action: 'delete';
  profileId: string;
  userId: string;
}

type Payload = CreateMemberPayload | UpdateMemberPayload | DeleteMemberPayload;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authenticated and is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: requestingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (profileError || !requestingProfile || requestingProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem gerenciar membros da equipe' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: Payload = await req.json();

    if (payload.action === 'create') {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create profile for the new user
      const { data: profile, error: profileCreateError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          avatar: payload.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        })
        .select()
        .single();

      if (profileCreateError) {
        // Rollback: delete the created user
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return new Response(
          JSON.stringify({ error: profileCreateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, profile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.action === 'update') {
      const { data: profile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          name: payload.name,
          role: payload.role,
          avatar: payload.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.profileId)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, profile }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.action === 'delete') {
      // First delete the profile
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', payload.profileId);

      if (profileDeleteError) {
        return new Response(
          JSON.stringify({ error: profileDeleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Then delete the auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(payload.userId);

      if (deleteError) {
        // Profile was already deleted, but we log the error
        console.error('Error deleting auth user:', deleteError.message);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
