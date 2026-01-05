// Voice webhook for TwiML App - handles browser calling

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
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }
    
    // Log incoming request for debugging
    console.log('Voice webhook called with params:', JSON.stringify(params));
    
    // Get the destination number
    const to = params['To'];
    const from = params['From'];
    const callSid = params['CallSid'];
    
    console.log(`Processing call - To: ${to}, From: ${from}, CallSid: ${callSid}`);
    
    if (!to || typeof to !== 'string' || to.length === 0) {
      console.error('Invalid or missing To parameter');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid phone number.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    // Get the caller ID from environment
    const callerId = Deno.env.get('TWILIO_PHONE_NUMBER');
    if (!callerId) {
      console.error('TWILIO_PHONE_NUMBER not configured');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Phone system not configured.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    
    console.log(`Using caller ID: ${callerId}`);
    
    // Get the recording callback URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-callback`;
    
    // Return TwiML to dial the destination number with recording enabled
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId}" record="record-from-answer" recordingStatusCallback="${recordingCallbackUrl}" recordingStatusCallbackMethod="POST">
    <Number>${to}</Number>
  </Dial>
</Response>`;

    console.log('Returning TwiML:', twiml);

    return new Response(twiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error in voice webhook:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred. Please try again.</Say>
</Response>`;
    
    return new Response(errorTwiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
});
