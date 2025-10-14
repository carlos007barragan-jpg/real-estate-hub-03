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
    const { error } = await supabase
      .from('call_logs')
      .update({
        recording_url: recordingUrl,
        recording_duration: parseInt(recordingDuration),
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('call_sid', callSid);
    
    if (error) {
      console.error('Error updating call log:', error);
      throw error;
    }
    
    console.log('Call log updated successfully');
    
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
