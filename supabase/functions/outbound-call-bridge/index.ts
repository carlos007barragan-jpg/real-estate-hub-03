import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    console.log('[outbound-call-bridge] Request received:', { leadPhone, leadName, leadId });

    // Validate inputs
    if (!leadPhone || typeof leadPhone !== 'string' || leadPhone.length < 7 || leadPhone.length > 20) {
      throw new Error('Invalid lead phone number');
    }

    // Get the authenticated user using service role (more reliable)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[outbound-call-bridge] No Authorization header present');
      throw new Error('Not authenticated - no auth header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the JWT using service role
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[outbound-call-bridge] Auth failed:', authError?.message);
      throw new Error('Not authenticated');
    }
    console.log('[outbound-call-bridge] Authenticated user:', user.id, user.email);

    // Get agent's phone number - try agents table first, then profiles
    const { data: agent, error: agentErr } = await supabaseAdmin
      .from('agents')
      .select('phone_number')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    console.log('[outbound-call-bridge] Agents table lookup:', { agent, error: agentErr?.message });

    let agentPhone = agent?.phone_number;

    // Fallback to profiles.phone_number if agents table has no entry
    if (!agentPhone) {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('phone_number')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[outbound-call-bridge] Profile lookup:', { phone: profile?.phone_number, error: profileErr?.message });
      agentPhone = profile?.phone_number;
    }

    if (!agentPhone) {
      console.error('[outbound-call-bridge] No phone number found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'No phone number registered. Go to Settings > General to register your phone number.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
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

    console.log('[outbound-call-bridge] Twilio env check:', {
      hasSid: !!accountSid,
      hasToken: !!authToken,
      hasPhone: !!twilioPhone,
    });

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error(`Twilio credentials not configured: SID=${!!accountSid} TOKEN=${!!authToken} PHONE=${!!twilioPhone}`);
    }

    // Build TwiML URL
    const twimlUrl = `${supabaseUrl}/functions/v1/outbound-call-bridge?action=twiml&to=${encodeURIComponent(e164LeadPhone)}&callerId=${encodeURIComponent(twilioPhone)}&leadId=${encodeURIComponent(leadId || '')}`;

    console.log('[outbound-call-bridge] Initiating bridge call:', {
      agentPhone,
      leadPhone: e164LeadPhone,
      twimlUrl,
    });

    // Call the agent's phone via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;

    const formData = new URLSearchParams();
    formData.append('To', agentPhone);
    formData.append('From', twilioPhone);
    formData.append('Url', twimlUrl);
    formData.append('Timeout', '30');

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
      console.error('[outbound-call-bridge] Twilio API error:', response.status, data);
      throw new Error(data.message || `Twilio error ${response.status}`);
    }

    console.log('[outbound-call-bridge] Bridge call initiated, CallSid:', data.sid);

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[outbound-call-bridge] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
