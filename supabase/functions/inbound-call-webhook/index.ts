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
      // Get first user as default (in production, route to appropriate user)
      const { data: firstUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      userId = firstUser?.users[0]?.id;
      
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
    
    // Create call log entry
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
    }
    
    // Get recording callback URL
    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-callback`;
    const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-status-callback`;
    
    // Return TwiML to record the call and forward to agents
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for calling. Your call is being recorded. Please hold while we connect you.</Say>
  <Record maxLength="1800" recordingStatusCallback="${recordingCallbackUrl}" recordingStatusCallbackMethod="POST" />
  <Dial record="record-from-answer" recordingStatusCallback="${recordingCallbackUrl}" recordingStatusCallbackMethod="POST" timeout="30">
    <Number statusCallback="${statusCallbackUrl}" statusCallbackMethod="POST" statusCallbackEvent="answered completed">${Deno.env.get('TWILIO_PHONE_NUMBER')}</Number>
  </Dial>
  <Say voice="Polly.Joanna">We're sorry, no one is available to take your call. Please leave a message after the tone.</Say>
  <Record maxLength="120" />
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
  <Say voice="Polly.Joanna">We're sorry, an error occurred. Please try again later.</Say>
</Response>`;
    
    return new Response(errorTwiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
      status: 500,
    });
  }
});
