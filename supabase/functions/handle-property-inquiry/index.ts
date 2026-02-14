import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Support both formats: { name } (new) and { firstName, lastName } (legacy)
    const firstName = body.firstName || (body.name ? body.name.split(' ')[0] : '');
    const lastName = body.lastName || (body.name ? body.name.split(' ').slice(1).join(' ') : '');
    const fullName = body.name || `${firstName} ${lastName}`.trim();

    const {
      propertyId, property_id,
      email, phone,
      preferredDate, preferred_date,
      message,
      organizationId, organization_id,
      inquiry_type,
    } = body;

    // Normalize field names (snake_case from external app, camelCase from legacy)
    const propId = propertyId || property_id;
    const orgId = organizationId || organization_id;
    const prefDate = preferredDate || preferred_date;

    console.log("Processing property inquiry for:", email, "type:", inquiry_type || 'general');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

      if (orgId && keyRecord.organization_id !== orgId) {
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

    // Check if lead exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .limit(1)
      .single();

    let leadId = existingLead?.id;
    let isNewLead = false;

    // Create new lead if doesn't exist
    if (!existingLead) {
      console.log("Creating new lead for:", email);

      const { data: property } = await supabase
        .from('inventory')
        .select('name, property_address, user_id')
        .eq('id', propId)
        .single();

      const { data: newLead, error: createLeadError } = await supabase
        .from('leads')
        .insert({
          name: fullName,
          email,
          phone,
          source: inquiry_type === 'showing' ? 'Public Showing Request' : 'Public Property Inquiry',
          status: 'new',
          pipeline_stage: 'New Lead',
          lead_lifecycle: 'Contact',
          property_of_interest: property?.name || property?.property_address,
          user_id: property?.user_id
        })
        .select()
        .single();

      if (createLeadError) throw createLeadError;
      leadId = newLead.id;
      isNewLead = true;
    }

    // Create property inquiry record
    const { error: inquiryError } = await supabase
      .from('property_inquiries')
      .insert({
        property_id: propId,
        lead_id: leadId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        preferred_date: prefDate,
        message,
        organization_id: orgId,
        status: 'pending'
      });

    if (inquiryError) throw inquiryError;

    // Get property and assigned agent info
    const { data: property } = await supabase
      .from('inventory')
      .select('name, property_address, assigned_agent_id')
      .eq('id', propId)
      .single();

    // Create appointment if date provided
    if (prefDate && leadId) {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          lead_id: leadId,
          user_id: property?.assigned_agent_id || (await supabase
            .from('profiles')
            .select('user_id')
            .eq('organization_id', orgId)
            .limit(1)
            .single()).data?.user_id,
          appointment_date: prefDate,
          title: `Showing Request: ${property?.name || property?.property_address}`,
          description: message,
          appointment_type: 'Property Showing',
          status: 'pending'
        });

      if (appointmentError) console.error("Error creating appointment:", appointmentError);
    }

    // Notify assigned agent or admins
    if (property?.assigned_agent_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: property.assigned_agent_id,
          type: 'showing_request',
          title: 'New Showing Request',
          description: `${fullName} requested a showing for ${property.name || property.property_address}`,
          link: `/leads/${leadId}`
        });
    } else if (isNewLead) {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('organization_id', orgId);

      const { data: adminIds } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .in('user_id', adminProfiles?.map(p => p.user_id) || []);

      for (const admin of adminIds || []) {
        await supabase
          .from('tasks')
          .insert({
            lead_id: leadId,
            user_id: admin.user_id,
            title: 'Assign Agent for Property Inquiry',
            description: `New inquiry from ${fullName} for ${property?.name}. Assign an agent to confirm appointment.`,
            status: 'pending',
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadId,
        message: "Thank you! An agent will contact you shortly to confirm your appointment."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handle-property-inquiry:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
