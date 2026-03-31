import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Normalize phone number to digits-only for matching
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

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
      source: requestSource,
    } = body;

    // Normalize field names (snake_case from external app, camelCase from legacy)
    const propId = propertyId || property_id;
    let orgId = organizationId || organization_id;
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
        console.error('Invalid API key provided:', keyError?.message);
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('API key org:', keyRecord.organization_id, 'Request org:', orgId);

      if (orgId && keyRecord.organization_id !== orgId) {
        console.error('Org mismatch - key org:', keyRecord.organization_id, 'request org:', orgId);
        return new Response(
          JSON.stringify({ error: 'API key does not match organization' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use the API key's organization if none provided in body
      if (!orgId) {
        orgId = keyRecord.organization_id;
        console.log('No org in body, using API key org:', orgId);
      }

      await supabase
        .from('organization_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRecord.id);
    }

    // Check if lead exists — try exact match first, then normalized phone
    let existingLead = null;

    const { data: exactMatch } = await supabase
      .from('leads')
      .select('*')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .limit(1)
      .single();

    existingLead = exactMatch;

    // If no exact match, try normalized phone search
    if (!existingLead && phone) {
      const normalizedPhone = normalizePhone(phone);
      const { data: allLeads } = await supabase
        .from('leads')
        .select('*')
        .limit(500);

      if (allLeads) {
        existingLead = allLeads.find(l => normalizePhone(l.phone) === normalizedPhone) || null;
      }
    }

    let leadId = existingLead?.id;
    let isNewLead = false;

    if (existingLead) {
      // Merge newer data into existing lead (newer wins for non-empty fields)
      console.log("Merging into existing lead:", existingLead.id, existingLead.name);

      let propertyName = null;
      if (propId) {
        const { data: property } = await supabase
          .from('inventory')
          .select('name, property_address')
          .eq('id', propId)
          .single();
        propertyName = property?.name || property?.property_address;
      }

      const mergeUpdate: Record<string, any> = {
        last_inbound_at: new Date().toISOString(),
      };

      // Update name if the existing one is a placeholder
      if (existingLead.name?.startsWith('Inbound Call') && fullName) {
        mergeUpdate.name = fullName;
      }
      // Update email if existing is a placeholder
      if (existingLead.email?.includes('@placeholder.com') && email) {
        mergeUpdate.email = email;
      }
      // Update property of interest if provided
      if (propertyName) {
        mergeUpdate.property_of_interest = propertyName;
      }

      await supabase
        .from('leads')
        .update(mergeUpdate)
        .eq('id', existingLead.id);

      // Add a note about the new inquiry
      await supabase
        .from('notes')
        .insert({
          lead_id: existingLead.id,
          user_id: existingLead.user_id,
          content: `🌐 New website inquiry from ${fullName} (${email}, ${phone})${propertyName ? ` for property: ${propertyName}` : ''}${message ? `. Message: ${message}` : ''}`,
          author: 'System',
          note_type: 'system',
        });

    } else {
      // Create new lead if doesn't exist
      console.log("Creating new lead for:", email);

      let propertyName = null;
      let propertyUserId = null;

      if (propId) {
        const { data: property } = await supabase
          .from('inventory')
          .select('name, property_address, user_id')
          .eq('id', propId)
          .single();
        propertyName = property?.name || property?.property_address;
        propertyUserId = property?.user_id;
      }

      // If no user_id from property, find an org admin to assign
      if (!propertyUserId && orgId) {
        const { data: orgProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('organization_id', orgId)
          .limit(1)
          .single();
        propertyUserId = orgProfile?.user_id;
      }

      if (!propertyUserId) {
        console.error('Cannot create lead: no valid user_id found');
        return new Response(
          JSON.stringify({ error: 'Could not determine organization owner for lead assignment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: newLead, error: createLeadError } = await supabase
        .from('leads')
        .insert({
          name: fullName,
          email,
          phone,
          source: requestSource || 'Online Lead - Website',
          status: 'new',
          pipeline_stage: 'New Lead',
          lead_lifecycle: 'Contact',
          property_of_interest: propertyName,
          user_id: propertyUserId,
          assigned_to: 'unassigned',
          is_inbound_call: false,
          last_inbound_at: new Date().toISOString(),
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
    let property = null;
    if (propId) {
      const { data } = await supabase
        .from('inventory')
        .select('name, property_address, assigned_agent_id')
        .eq('id', propId)
        .maybeSingle();
      property = data;
    }

    const propertyLabel = property?.name || property?.property_address || 'a property';
    const leadLabel = fullName || email || 'A visitor';

    // Create appointment if date provided
    if (prefDate && leadId) {
      const agentId = property?.assigned_agent_id || (await supabase
        .from('profiles')
        .select('user_id')
        .eq('organization_id', orgId)
        .limit(1)
        .maybeSingle()).data?.user_id;

      if (agentId) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            lead_id: leadId,
            user_id: agentId,
            appointment_date: prefDate,
            title: `Showing Request: ${propertyLabel}`,
            description: message || 'Property showing request',
            appointment_type: 'Property Showing',
            status: 'pending'
          });

        if (appointmentError) console.error("Error creating appointment:", appointmentError);
      }
    }

    // Notify assigned agent or admins
    if (property?.assigned_agent_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: property.assigned_agent_id,
          type: 'showing_request',
          title: existingLead ? '📋 Returning Lead — New Showing Request' : 'New Showing Request',
          description: `${leadLabel} requested a showing for ${propertyLabel}${existingLead ? ' (existing lead merged)' : ''}`,
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
            description: `New inquiry from ${leadLabel} for ${propertyLabel}. Assign an agent to confirm appointment.`,
            status: 'pending',
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadId,
        merged: !!existingLead,
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
