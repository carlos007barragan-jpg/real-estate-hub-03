import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const propertyId = url.searchParams.get('property_id');
    const organizationId = url.searchParams.get('organization_id');

    if (!propertyId) {
      console.error('Missing property_id parameter');
      return new Response(
        JSON.stringify({ error: 'property_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

    console.log(`Fetching property ${propertyId} for organization ${organizationId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get organization branding
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
        JSON.stringify({ error: 'Property not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch the specific property - must be approved and public
    const { data: property, error: propertyError } = await supabase
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
        payment,
        interest_rate,
        max_loan_amount,
        calculated_rehab_budget,
        finance_type,
        transaction_type,
        market_status,
        status,
        share_token,
        assigned_agent_id,
        commission,
        video_url,
        video_type
      `)
      .eq('id', propertyId)
      .in('user_id', userIds)
      .eq('show_on_public_page', true)
      .eq('public_approval_status', 'approved')
      .single();

    if (propertyError || !property) {
      console.error('Property not found or not public:', propertyError);
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found property: ${property.name}`);

    // Get assigned agent details if available
    let assignedAgent = null;
    if (property.assigned_agent_id) {
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone_number, email')
        .eq('user_id', property.assigned_agent_id)
        .single();

      assignedAgent = agentProfile || null;
    }

    // Get public field settings to know which fields should be visible
    const { data: fieldSettings } = await supabase
      .from('public_field_settings')
      .select('field_name, is_visible, display_order')
      .eq('organization_id', organizationId)
      .eq('is_visible', true)
      .order('display_order', { ascending: true });

    return new Response(
      JSON.stringify({ 
        property: {
          ...property,
          assigned_agent: assignedAgent
        },
        branding: branding || null,
        field_settings: fieldSettings || [],
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
