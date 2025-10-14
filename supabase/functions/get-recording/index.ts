// Proxy endpoint to fetch Twilio recordings with authentication

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordingUrl } = await req.json();
    
    if (!recordingUrl) {
      throw new Error('Recording URL is required');
    }

    console.log('Fetching recording from:', recordingUrl);
    
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Fetch the recording from Twilio with authentication
    const response = await fetch(recordingUrl, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
    });

    if (!response.ok) {
      console.error('Twilio recording fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch recording: ${response.statusText}`);
    }

    // Get the audio data
    const audioData = await response.arrayBuffer();
    
    console.log('Recording fetched successfully, size:', audioData.byteLength);

    // Return the audio file with proper headers
    return new Response(audioData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/wav',
        'Content-Length': audioData.byteLength.toString(),
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching recording:', error);
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
