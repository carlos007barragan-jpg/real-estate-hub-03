// Handles Twilio recording callbacks to store recording URLs
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
    const callSid = formData.get('CallSid') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;
    
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
    
    // Trigger transcription in the background
    const transcriptionUrl = `${supabaseUrl}/functions/v1/transcribe-call`;
    fetch(transcriptionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ callSid }),
    }).catch(error => {
      console.error('Error triggering transcription:', error);
    });
    
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
