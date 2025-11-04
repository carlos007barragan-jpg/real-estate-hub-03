// Handles Twilio recording callbacks to store recording URLs
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate Twilio signature for security
async function validateTwilioSignature(req: Request, params: Record<string, string>): Promise<boolean> {
  const signature = req.headers.get('X-Twilio-Signature');
  if (!signature) {
    console.error('Missing X-Twilio-Signature header');
    return false;
  }

  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN not configured');
    return false;
  }

  const url = req.url;
  const data = Object.keys(params).sort().map(key => key + params[key]).join('');
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const messageData = encoder.encode(url + data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  
  return signature === expectedSignature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Recording callback received');
    
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }
    
    // Validate Twilio signature
    const isValid = await validateTwilioSignature(req, params);
    if (!isValid) {
      console.error('Invalid Twilio signature');
      return new Response('Unauthorized', { status: 401 });
    }
    
    const callSid = params['CallSid'];
    const recordingUrl = params['RecordingUrl'];
    const recordingDuration = params['RecordingDuration'];
    
    console.log('Recording callback received:', { callSid, recordingUrl, recordingDuration });
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update the call log with recording information
    // Only update recording fields, preserve existing duration
    const { data: existingLog } = await supabase
      .from('call_logs')
      .select('duration')
      .eq('call_sid', callSid)
      .single();

    const updateData: any = {
      recording_url: recordingUrl,
      recording_duration: parseInt(recordingDuration),
      updated_at: new Date().toISOString(),
    };

    // Only update status if the call doesn't already have a duration set
    if (!existingLog?.duration) {
      updateData.status = 'completed';
    }

    const { error } = await supabase
      .from('call_logs')
      .update(updateData)
      .eq('call_sid', callSid);
    
    if (error) {
      console.error('Error updating call log:', error);
      throw error;
    }
    
    console.log('Call log updated successfully');
    
    // Trigger transcription asynchronously
    setTimeout(async () => {
      try {
        const transcriptionUrl = `${supabaseUrl}/functions/v1/transcribe-call`;
        const response = await fetch(transcriptionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ callSid }),
        });
        
        if (!response.ok) {
          console.error('Transcription failed:', await response.text());
        } else {
          console.log('Transcription triggered successfully');
        }
      } catch (error) {
        console.error('Error triggering transcription:', error);
      }
    }, 1000); // Wait 1 second to ensure DB update is fully committed
    
    return new Response('OK', { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in recording callback:', error);
    return new Response('Error', { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
});
