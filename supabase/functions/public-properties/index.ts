import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const organizationId = url.searchParams.get('organization_id');

    if (!organizationId) {
      console.error('Missing organization_id parameter');
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching public properties for organization: ${organizationId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key if provided
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      const { data: keyRecord, error: keyError } = await supabase
        .from('organization_api_keys')
        .select('id, organization_id')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (keyError || !keyRecord) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Ensure the API key belongs to the requested organization
      if (keyRecord.organization_id !== organizationId) {
        return new Response(
          JSON.stringify({ error: 'API key does not match organization' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update last_used_at
      await supabase
        .from('organization_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRecord.id);
    }

    // Get organization branding for context
    const { data: branding, error: brandingError } = await supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (brandingError && brandingError.code !== 'PGRST116') {
      console.error('Error fetching branding:', brandingError);
    }

    // Get profiles to find users in this organization
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('organization_id', organizationId);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch organization data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userIds = profiles?.map(p => p.user_id) || [];

    if (userIds.length === 0) {
      console.log('No users found for organization');
      return new Response(
        JSON.stringify({ 
          properties: [], 
          branding: branding || null,
          organization_id: organizationId 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch only approved public properties for this organization
    const { data: properties, error: propertiesError } = await supabase
      .from('inventory')
      .select(`
        id,
        name,
        description,
        price,
        category,
        property_type,
        bedrooms,
        bathrooms,
        sqft,
        photo_url,
        photo_urls,
        arv,
        acquisition_price,
        estimated_repairs,
        down_payment,
        finance_type,
        transaction_type,
        market_status,
        status,
        share_token,
        assigned_agent_id
      `)
      .in('user_id', userIds)
      .eq('show_on_public_page', true)
      .eq('public_approval_status', 'approved')
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch properties' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${properties?.length || 0} public properties`);

    // Get assigned agent details for properties that have them
    const agentIds = [...new Set(properties?.filter(p => p.assigned_agent_id).map(p => p.assigned_agent_id) || [])];
    
    let agents: Record<string, any> = {};
    if (agentIds.length > 0) {
      const { data: agentProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone_number, email')
        .in('user_id', agentIds);

      if (agentProfiles) {
        agentProfiles.forEach(agent => {
          agents[agent.user_id] = agent;
        });
      }
    }

    // Enrich properties with agent info
    const enrichedProperties = properties?.map(property => ({
      ...property,
      assigned_agent: property.assigned_agent_id ? agents[property.assigned_agent_id] || null : null
    })) || [];

    return new Response(
      JSON.stringify({ 
        properties: enrichedProperties, 
        branding: branding || null,
        organization_id: organizationId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
