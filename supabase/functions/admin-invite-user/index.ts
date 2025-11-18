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
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify requesting user is authenticated and is admin
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

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, role } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'Email and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Inviting user:', email, 'with role:', role);

    // Generate a temporary password (user will be required to change it)
    const tempPassword = crypto.randomUUID();

    // Attempt to create the user with a temporary password
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        invited: true,
        must_change_password: true,
      },
    });

    // We'll carry the created user here (supports retry logic below)
    let newUser = userData?.user || null;

    if (createError) {
      console.error('User creation error:', createError);

      // If the email already exists but the user was removed from Team (no role row),
      // auto-clean the stale auth account and recreate a fresh one.
      if (createError.code === 'email_exists') {
        const targetEmail = (email || '').toLowerCase();
        let foundUserId: string | null = null;
        try {
          let page = 1;
          const perPage = 200;
          while (true) {
            const { data: listData, error: listErr } = await (supabaseAdmin as any).auth.admin.listUsers({ page, perPage });
            if (listErr) break;
            const users = listData?.users ?? [];
            const match = users.find((u: any) => (u.email || '').toLowerCase() === targetEmail);
            if (match) { foundUserId = match.id; break; }
            if (users.length < perPage) break;
            page += 1;
            if (page > 50) break; // safety cap
          }
        } catch (e) {
          console.error('List users failed:', e);
        }

        if (foundUserId) {
          // Check if they still have a role; if not, we consider it a stale auth user
          const { data: roleRow, error: roleLookupErr } = await supabaseAdmin
            .from('user_roles')
            .select('id')
            .eq('user_id', foundUserId)
            .maybeSingle();

          if (roleLookupErr) {
            console.error('Role lookup error:', roleLookupErr);
          }

          if (!roleRow) {
            console.log('Found stale auth user without role. Deleting before reinvite:', foundUserId);
            const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(foundUserId);
            if (!delErr) {
              const { data: retryData, error: retryErr } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: { invited: true, must_change_password: true },
              });
              if (!retryErr) {
                newUser = retryData?.user || null;
              } else {
                console.error('Retry create user failed:', retryErr);
              }
            } else {
              console.error('Delete stale auth user failed:', delErr);
            }
          }
        }
      }

      // If we still don't have a new user, return a friendly error
      if (!newUser) {
        const safeMessage = createError.code === 'email_exists' || String(createError.message || '').includes('already registered')
          ? 'A user with this email address has already been registered'
          : 'Failed to create user';
        return new Response(
          JSON.stringify({ error: safeMessage }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create user role entry
    if (newUser) {
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.id,
          role: role,
        });

      if (roleInsertError) {
        console.error('Role insert error:', roleInsertError);
      }

      // Create profile entry so the user shows up in the dashboard immediately
      const { error: profileInsertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUser.id,
          first_name: '',
          last_name: '',
          phone_number: null,
        });

      if (profileInsertError) {
        console.error('Profile insert error:', profileInsertError);
      }

      // Send password reset email so user can set their own password
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${req.headers.get('origin') || 'http://localhost:8080'}/auth?invited=true`,
        },
      });

      if (resetError) {
        console.error('Password reset email error:', resetError);
        return new Response(
          JSON.stringify({ error: 'Failed to send invitation email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        data: { user: newUser },
        message: 'User invited successfully. They will receive an email to set their password.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-invite-user:', error);
    // Generic error response - details logged server-side only
    return new Response(
      JSON.stringify({ error: 'An error occurred while inviting user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
