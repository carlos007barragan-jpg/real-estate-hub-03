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
    const to = formData.get('To') as string;
    
    console.log('Voice webhook called with To:', to);
    
    // Return TwiML to dial the destination number
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${Deno.env.get('TWILIO_PHONE_NUMBER')}">${to}</Dial>
</Response>`;

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
      status: 500,
    });
  }
});
