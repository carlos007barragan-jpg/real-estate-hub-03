// Twilio Voice Call Edge Function

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, leadName } = await req.json();
    
    // Validate inputs
    if (!to || typeof to !== 'string' || to.length < 10 || to.length > 16) {
      throw new Error('Invalid phone number format');
    }
    if (leadName && (typeof leadName !== 'string' || leadName.length > 100)) {
      throw new Error('Lead name must be less than 100 characters');
    }
    
    // Normalize phone number to E.164 format
    const normalizedPhone = to.replace(/\D/g, ''); // Remove all non-digits
    const e164Phone = normalizedPhone.startsWith('1') 
      ? `+${normalizedPhone}` 
      : `+1${normalizedPhone}`;
    
    console.log('Making call to:', e164Phone);
    
    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials not configured');
    }
    
    // Make call via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', e164Phone);
    formData.append('From', twilioPhone);
    formData.append('Url', 'http://demo.twilio.com/docs/voice.xml'); // TwiML URL for the call
    
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
    
    console.log('Call initiated successfully:', data.sid);
    
    return new Response(
      JSON.stringify({ success: true, callSid: data.sid }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error making call:', error);
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
