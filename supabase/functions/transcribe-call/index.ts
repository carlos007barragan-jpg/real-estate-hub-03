// Transcribes call recordings using OpenAI Whisper
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { callSid } = await req.json();
    
    if (!callSid) {
      throw new Error('Call SID is required');
    }
    
    console.log('Transcribing call:', callSid);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the call log with recording URL
    const { data: callLog, error: fetchError } = await supabase
      .from('call_logs')
      .select('recording_url')
      .eq('call_sid', callSid)
      .single();
    
    if (fetchError || !callLog?.recording_url) {
      throw new Error('Recording URL not found for call');
    }
    
    console.log('Fetching recording from:', callLog.recording_url);
    
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!accountSid || !authToken || !openAIKey) {
      throw new Error('Required credentials not configured');
    }
    
    // Fetch the recording from Twilio
    const audioResponse = await fetch(callLog.recording_url, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
    });
    
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch recording: ${audioResponse.statusText}`);
    }
    
    // Get audio data as blob
    const audioBlob = await audioResponse.blob();
    
    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    
    // Send to OpenAI for transcription
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: formData,
    });
    
    if (!transcriptionResponse.ok) {
      throw new Error(`OpenAI transcription failed: ${await transcriptionResponse.text()}`);
    }
    
    const transcriptionResult = await transcriptionResponse.json();
    const transcription = transcriptionResult.text;
    
    console.log('Transcription completed, length:', transcription.length);
    
    // Update call log with transcription
    const { error: updateError } = await supabase
      .from('call_logs')
      .update({
        transcription,
        updated_at: new Date().toISOString(),
      })
      .eq('call_sid', callSid);
    
    if (updateError) {
      console.error('Error updating call log with transcription:', updateError);
      throw updateError;
    }
    
    return new Response(
      JSON.stringify({ success: true, transcription }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error transcribing call:', error);
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
