// Twilio Access Token Generator

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const apiKey = Deno.env.get('TWILIO_API_KEY');
    const apiSecret = Deno.env.get('TWILIO_API_SECRET');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    if (!accountSid || !authToken || !apiKey || !apiSecret || !twilioPhone) {
      throw new Error('Twilio credentials not configured');
    }

    const { identity } = await req.json();
    
    // Generate access token using Twilio REST API
    const token = await generateToken(accountSid, apiKey, apiSecret, identity, twilioPhone);
    
    return new Response(
      JSON.stringify({ token }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating token:', error);
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

async function generateToken(
  accountSid: string,
  apiKey: string,
  apiSecret: string,
  identity: string,
  outgoingApplicationSid: string
): Promise<string> {
  const header = {
    cty: 'twilio-fpa;v=1',
    typ: 'JWT',
    alg: 'HS256'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    jti: `${apiKey}-${now}`,
    iss: apiKey,
    sub: accountSid,
    nbf: now,
    exp: now + 3600,
    grants: {
      identity,
      voice: {
        outgoing: {
          application_sid: outgoingApplicationSid
        }
      }
    }
  };

  const base64Header = base64UrlEncode(JSON.stringify(header));
  const base64Payload = base64UrlEncode(JSON.stringify(payload));
  const signature = await createSignature(`${base64Header}.${base64Payload}`, apiSecret);
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
