// Handles inbound calls to the CRM - creates leads and logs calls
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    const answeredBy = formData.get('AnsweredBy') as string || 'CRM System';
    
    console.log('Inbound call received:', { from, to, callSid, answeredBy });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if lead exists with this phone number
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, user_id')
      .eq('phone', from)
      .single();
    
    let leadId = existingLead?.id;
    let userId = existingLead?.user_id;
    
    // If no lead exists, create a new one
    if (!leadId) {
      // Choose an owner for the new lead: first active agent, else first user
      const { data: activeAgents } = await supabase
        .from('agents')
        .select('user_id')
        .eq('is_active', true)
        .limit(1);

      if (activeAgents && activeAgents.length > 0) {
        userId = activeAgents[0].user_id;
      } else {
        const { data: firstUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
        userId = firstUser?.users[0]?.id;
      }
      
      if (!userId) {
        throw new Error('No users found in the system');
      }
      
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          name: `Inbound Call - ${from}`,
          email: `inbound+${from.replace(/\D/g, '')}@placeholder.com`,
          phone: from,
          status: 'new',
          source: 'Inbound Call',
          assigned_to: 'unassigned',
          pipeline_stage: 'New Lead',
          user_id: userId,
          is_inbound_call: true,
          source_call_sid: callSid,
        })
        .select('id')
        .single();
      
      if (leadError) {
        console.error('Error creating lead:', leadError);
        throw leadError;
      }
      
      leadId = newLead.id;
      console.log('Created new lead:', leadId);
    }
    
    // Check if call log already exists (Twilio may call webhook multiple times)
    const { data: existingCallLog } = await supabase
      .from('call_logs')
      .select('id')
      .eq('call_sid', callSid)
      .single();
    
    // Only create call log if it doesn't exist
    if (!existingCallLog) {
      const { error: callLogError } = await supabase
        .from('call_logs')
        .insert({
          call_sid: callSid,
          lead_id: leadId,
          user_id: userId,
          from_number: from,
          to_number: to,
          status: 'in-progress',
          direction: 'inbound',
          answered_by: answeredBy,
        });
      
      if (callLogError) {
        console.error('Error creating call log:', callLogError);
        // Don't throw error - we still want to return valid TwiML
      }
    } else {
      console.log('Call log already exists for call_sid:', callSid);
    }
    
    // Get all active agents
    const { data: agents } = await supabase
      .from('agents')
      .select('phone_number, user_id')
      .eq('is_active', true);
    
    // Get recording callback URL and escape XML-sensitive characters for attributes
    const escapeXmlAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-callback`;
    const recordingCallbackUrlEsc = escapeXmlAttr(recordingCallbackUrl);
    const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadId}&userId=${userId}`;
    const statusCallbackUrlEsc = escapeXmlAttr(statusCallbackUrl);
    
    // Helper function to sanitize identity (must match get-twilio-token)
    const sanitizeIdentity = (email: string) => {
      return email.replace(/@/g, '_at_').replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    };

    // Build dial targets with active agent client identities
    let dialTargets = '';
    const identities: string[] = [];
    if (agents && agents.length > 0) {
      for (const agent of agents) {
        const { data: userRes, error: userError } = await supabase.auth.admin.getUserById(agent.user_id);
        if (!userError && userRes?.user?.email) {
          identities.push(sanitizeIdentity(userRes.user.email));
        }
      }
    }

    // If no identities from active agents, attempt to ring the lead owner
    if (identities.length === 0 && userId) {
      const { data: ownerRes, error: ownerError } = await supabase.auth.admin.getUserById(userId);
      if (!ownerError && ownerRes?.user?.email) {
        identities.push(sanitizeIdentity(ownerRes.user.email));
      }
    }

    if (identities.length > 0) {
      dialTargets = identities
        .map(id => `<Client statusCallback="${statusCallbackUrlEsc}" statusCallbackMethod="POST" statusCallbackEvent="answered completed"><Identity>${id}</Identity></Client>`) 
        .join('\n    ');
    } else {
      // Fallback to a default PSTN number if no web agents are configured
      dialTargets = `<Number>${Deno.env.get('TWILIO_PHONE_NUMBER')}</Number>`;
    }

    console.log('Dial identities resolved:', identities, 'Dial targets built:', dialTargets);
    
    // Return TwiML to ring web agents or capture voicemail
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Please hold while we connect you to an agent.</Say>
  <Dial record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="45">
    ${dialTargets}
  </Dial>
  <Say voice="alice">We're sorry, no one is available to take your call. Please leave a message after the tone.</Say>
  <Record maxLength="120" recordingStatusCallback="${recordingCallbackUrl}" recordingStatusCallbackMethod="POST" />
</Response>`;

    return new Response(twiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error in inbound call webhook:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry, an error occurred. Please try again later.</Say>
</Response>`;
    
    return new Response(errorTwiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
      status: 500,
    });
  }
});
