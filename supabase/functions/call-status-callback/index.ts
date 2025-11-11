// Handles call status updates to track who answered the call
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
    // Validate input parameters
    const callSid = params['CallSid'];
    const callStatus = params['CallStatus'];
    const duration = params['CallDuration'];
    const answeredBy = params['AnsweredBy'];
    const calledNumber = params['Called'];
    const dialCallStatus = params['DialCallStatus'];
    
    if (!callSid || typeof callSid !== 'string' || callSid.length > 50) {
      console.error('Invalid CallSid parameter');
      return new Response('Invalid request', { status: 400, headers: corsHeaders });
    }
    if (!callStatus || typeof callStatus !== 'string' || callStatus.length > 50) {
      console.error('Invalid CallStatus parameter');
      return new Response('Invalid request', { status: 400, headers: corsHeaders });
    }
    
    // Get leadId and userId from query params
    const url = new URL(req.url);
    const leadId = url.searchParams.get('leadId');
    const userId = url.searchParams.get('userId');
    
    console.log('Call status callback:', { callSid, callStatus, duration, answeredBy, calledNumber, leadId });
    
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
    
    // If call was answered and we have a leadId, assign lead to the agent who answered
    if (callStatus === 'answered' && leadId && calledNumber) {
      const { data: agent } = await supabase
        .from('agents')
        .select('user_id, phone_number')
        .eq('phone_number', calledNumber)
        .single();
      
      if (agent) {
        const { data: userData } = await supabase.auth.admin.getUserById(agent.user_id);
        const agentName = userData?.user?.email?.split('@')[0] || 'Unknown Agent';
        
        await supabase
          .from('leads')
          .update({ assigned_to: agentName, agent_phone: calledNumber })
          .eq('id', leadId);
        
        console.log(`Lead ${leadId} assigned to ${agentName}`);
      }
    }
    
    // Handle unanswered calls with auto round-robin
    if ((dialCallStatus === 'no-answer' || dialCallStatus === 'busy') && leadId && userId) {
      const { data: settings } = await supabase
        .from('crm_settings')
        .select('auto_roundrobin_unanswered, last_assigned_agent_index')
        .eq('user_id', userId)
        .maybeSingle();

      if (settings?.auto_roundrobin_unanswered) {
        const { data: agents } = await supabase
          .from('agents')
          .select('user_id, phone_number')
          .eq('is_active', true);

        if (agents && agents.length > 0) {
          const nextIndex = (settings.last_assigned_agent_index || 0) % agents.length;
          const nextAgent = agents[nextIndex];

          await supabase.from('leads').update({
            assigned_to: `Agent ${nextAgent.phone_number.substring(nextAgent.phone_number.length - 4)}`,
            agent_phone: nextAgent.phone_number,
          }).eq('id', leadId);

          await supabase.from('crm_settings').update({ last_assigned_agent_index: nextIndex + 1 }).eq('user_id', userId);
          
          console.log(`Auto-assigned unanswered lead ${leadId} via round-robin`);
        }
      }
    }
    
    console.log('Call status updated successfully');
    
    return new Response('OK', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in call status callback:', error);
    // Generic error response - details logged server-side only
    return new Response('An error occurred', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
});
