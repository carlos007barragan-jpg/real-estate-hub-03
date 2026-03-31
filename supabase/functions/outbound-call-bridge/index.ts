// Outbound Call Bridge - Click-to-call flow:
// 1. Calls the agent's phone first
// 2. When agent answers, dials the lead's phone
// 3. Bridges both parties
//
// Also serves TwiML for the agent leg (when ?action=twiml)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const action = requestUrl.searchParams.get('action');

  // ---- TwiML endpoint: when agent answers, dial the lead ----
  if (action === 'twiml') {
    const leadPhone = requestUrl.searchParams.get('to');
    const callerId = requestUrl.searchParams.get('callerId');
    const leadId = requestUrl.searchParams.get('leadId');

    if (!leadPhone || !callerId) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Missing parameters.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-callback`;
    const statusCallbackUrl = leadId
      ? `${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadId}`
      : '';

    // TwiML: tell agent they're being connected, then dial the lead
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you now.</Say>
  <Dial callerId="${callerId}" record="record-from-answer" recordingStatusCallback="${recordingCallbackUrl}" recordingStatusCallbackMethod="POST"${statusCallbackUrl ? ` statusCallback="${statusCallbackUrl}" statusCallbackEvent="completed" statusCallbackMethod="POST"` : ''}>
    <Number>${leadPhone}</Number>
  </Dial>
</Response>`;

    return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
  }

  // ---- REST endpoint: initiate the call to agent's phone ----
  try {
    const { leadPhone, leadName, leadId } = await req.json();

    // Validate inputs
    if (!leadPhone || typeof leadPhone !== 'string' || leadPhone.length < 7 || leadPhone.length > 20) {
      throw new Error('Invalid lead phone number');
    }

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Not authenticated');

    // Get agent's registered phone number
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('phone_number')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!agent?.phone_number) {
      throw new Error('No phone number registered. Go to Settings > General to register your phone number.');
    }

    // Normalize lead phone to E.164
    const normalizedLeadPhone = leadPhone.replace(/\D/g, '');
    const e164LeadPhone = normalizedLeadPhone.startsWith('1')
      ? `+${normalizedLeadPhone}`
      : `+1${normalizedLeadPhone}`;

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials not configured');
    }

    // Build TwiML URL - when agent answers, this TwiML will dial the lead
    const twimlUrl = `${supabaseUrl}/functions/v1/outbound-call-bridge?action=twiml&to=${encodeURIComponent(e164LeadPhone)}&callerId=${encodeURIComponent(twilioPhone)}&leadId=${encodeURIComponent(leadId || '')}`;

    console.log('Initiating outbound bridge call:', {
      agentPhone: agent.phone_number,
      leadPhone: e164LeadPhone,
      twimlUrl,
    });

    // Call the agent's phone via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;

    const formData = new URLSearchParams();
    formData.append('To', agent.phone_number);
    formData.append('From', twilioPhone);
    formData.append('Url', twimlUrl);
    formData.append('Timeout', '30');

    // Add status callback for the agent leg
    if (leadId) {
      const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadId}&userId=${user.id}`;
      formData.append('StatusCallback', statusCallbackUrl);
      formData.append('StatusCallbackEvent', 'completed');
      formData.append('StatusCallbackMethod', 'POST');
    }

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', data);
      throw new Error(data.message || 'Failed to initiate call');
    }

    console.log('Bridge call initiated, CallSid:', data.sid);

    // Log the call
    await supabaseAdmin.from('call_logs').insert({
      call_sid: data.sid,
      lead_id: leadId,
      user_id: user.id,
      from_number: twilioPhone,
      to_number: e164LeadPhone,
      status: 'initiating',
      direction: 'outbound',
    });

    return new Response(
      JSON.stringify({ success: true, callSid: data.sid }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in outbound call bridge:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
