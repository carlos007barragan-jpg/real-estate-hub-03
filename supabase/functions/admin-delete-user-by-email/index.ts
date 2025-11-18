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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure requester is admin
    const { data: roleData, error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleCheckError || !roleData) {
      console.error('Role check error:', roleCheckError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetEmail = email.trim().toLowerCase();
    console.log('Admin requested delete by email:', targetEmail);

    // Find user by email via pagination
    let foundUserId: string | null = null;
    let page = 1;
    const perPage = 200;

    while (true) {
      const { data, error } = await (supabaseAdmin as any).auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error('Error listing users:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to search users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const users = data?.users ?? [];
      const match = users.find((u: any) => (u.email || '').toLowerCase() === targetEmail);
      if (match) {
        foundUserId = match.id;
        break;
      }

      if (users.length < perPage) break; // no more pages
      page += 1;
      if (page > 50) break; // safety cap
    }

    if (!foundUserId) {
      return new Response(
        JSON.stringify({ error: 'No account found for this email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up related data first (best-effort)
    const { error: agentError } = await supabaseAdmin
      .from('agents')
      .delete()
      .eq('user_id', foundUserId);
    if (agentError) console.error('Agent deletion error:', agentError);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', foundUserId);
    if (profileError) console.error('Profile deletion error:', profileError);

    const { error: roleDeleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', foundUserId);
    if (roleDeleteError) console.error('Role deletion error:', roleDeleteError);

    // Delete from auth (critical)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(foundUserId);
    if (deleteError) {
      console.error('Auth deletion error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from authentication system' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User deleted by email successfully:', targetEmail);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-delete-user-by-email:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
