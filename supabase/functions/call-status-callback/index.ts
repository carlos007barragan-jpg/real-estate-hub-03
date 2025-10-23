// Handles call status updates to track who answered the call
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
    const callStatus = formData.get('CallStatus') as string;
    const duration = formData.get('CallDuration') as string;
    const answeredBy = formData.get('AnsweredBy') as string;
    
    console.log('Call status callback:', { callSid, callStatus, duration, answeredBy });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const updateData: any = {
      status: callStatus,
      updated_at: new Date().toISOString(),
    };
    
    if (duration) {
      updateData.duration = parseInt(duration);
    }
    
    if (answeredBy) {
      updateData.answered_by = answeredBy;
    }
    
    const { error } = await supabase
      .from('call_logs')
      .update(updateData)
      .eq('call_sid', callSid);
    
    if (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
    
    console.log('Call status updated successfully');
    
    return new Response('OK', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in call status callback:', error);
    return new Response('Error', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
});
