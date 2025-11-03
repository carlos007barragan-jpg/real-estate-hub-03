import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserImportRow {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'agent';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || userRole?.role !== 'admin') {
      throw new Error('Only admins can import users');
    }

    const { users } = await req.json() as { users: UserImportRow[] };

    console.log(`Starting bulk import of ${users.length} users`);

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    for (const userData of users) {
      try {
        // Create user account
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: userData.email,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            first_name: userData.firstName,
            last_name: userData.lastName,
          },
        });

        if (createError) {
          console.error(`Failed to create user ${userData.email}:`, createError);
          results.failed.push({
            email: userData.email,
            error: createError.message,
          });
          continue;
        }

        if (!newUser.user) {
          results.failed.push({
            email: userData.email,
            error: 'User creation returned no user object',
          });
          continue;
        }

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: newUser.user.id,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone_number: userData.phoneNumber || null,
          });

        if (profileError) {
          console.error(`Failed to create profile for ${userData.email}:`, profileError);
          // Continue anyway - the user account exists
        }

        // Assign role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: newUser.user.id,
            role: userData.role || 'agent',
          });

        if (roleError) {
          console.error(`Failed to assign role for ${userData.email}:`, roleError);
          results.failed.push({
            email: userData.email,
            error: `User created but role assignment failed: ${roleError.message}`,
          });
          continue;
        }

        console.log(`Successfully imported user: ${userData.email}`);
        results.successful.push(userData.email);
      } catch (error) {
        console.error(`Error processing user ${userData.email}:`, error);
        results.failed.push({
          email: userData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Import complete. Successful: ${results.successful.length}, Failed: ${results.failed.length}`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Bulk import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});