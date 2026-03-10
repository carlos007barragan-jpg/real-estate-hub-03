import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const organizationId = url.searchParams.get('organization_id');

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

      if (keyRecord.organization_id !== organizationId) {
        return new Response(
          JSON.stringify({ error: 'API key does not match organization' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('organization_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRecord.id);
    }

    // Get organization branding
    const { data: branding } = await supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    // Get user IDs for this organization
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('organization_id', organizationId);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch organization data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = profiles?.map(p => p.user_id) || [];

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ properties: [], branding: branding || null, organization_id: organizationId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ALL inventory properties for this organization (no public-only filter)
    const { data: properties, error: propertiesError } = await supabase
      .from('inventory')
      .select(`
        id, name, description, price, category, property_type,
        bedrooms, bathrooms, sqft, photo_url, photo_urls,
        arv, acquisition_price, estimated_repairs, calculated_rehab_budget,
        down_payment, interest_rate, payment, max_loan_amount,
        finance_type, transaction_type, market_status, status,
        share_token, assigned_agent_id, show_on_public_page,
        city, state, video_url, video_type
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch properties' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${properties?.length || 0} properties`);

    // Get assigned agent details
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

    // Remap properties to the format the external app expects
    const mappedProperties = (properties || []).map(p => ({
      property_id: p.id,
      address: p.name,
      city: p.city || null,
      state: p.state || null,
      price: p.price,
      terms: p.transaction_type,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      description: p.description,
      cover_photo_url: p.photo_url,
      photos: p.photo_urls || [],
      is_public: p.show_on_public_page || false,
      property_type: p.property_type,
      financing_options: p.finance_type ? [p.finance_type] : [],
      finance_type: p.finance_type,
      down_payment: p.down_payment ?? null,
      monthly_payment: p.payment ?? null,
      interest_rate: p.interest_rate ?? null,
      payment: p.payment,
      max_loan_amount: p.max_loan_amount,
      arv: p.arv,
      acquisition_price: p.acquisition_price,
      estimated_repairs: p.estimated_repairs,
      calculated_rehab_budget: p.calculated_rehab_budget,
      market_status: p.market_status,
      status: p.status,
      category: p.category,
      share_token: p.share_token,
      assigned_agent: p.assigned_agent_id ? agents[p.assigned_agent_id] || null : null,
      video_url: p.video_url || null,
      video_type: p.video_type || null,
    }));

    return new Response(
      JSON.stringify({ properties: mappedProperties, branding: branding || null, organization_id: organizationId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
