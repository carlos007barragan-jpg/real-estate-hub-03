// Twilio SMS Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

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
    const { to, message, leadId } = await req.json();
    
    // Validate inputs
    if (!to || typeof to !== 'string' || to.length < 10 || to.length > 16) {
      throw new Error('Invalid phone number format');
    }
    if (!message || typeof message !== 'string' || message.length === 0 || message.length > 1000) {
      throw new Error('Message must be between 1 and 1000 characters');
    }
    if (leadId && typeof leadId !== 'string') {
      throw new Error('Invalid leadId format');
    }
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }
    
    // Normalize phone number to E.164 format
    const normalizedPhone = to.replace(/\D/g, ''); // Remove all non-digits
    const e164Phone = normalizedPhone.startsWith('1') 
      ? `+${normalizedPhone}` 
      : `+1${normalizedPhone}`;
    
    console.log('Sending SMS to:', e164Phone);
    
    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
    
    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials not configured');
    }
    
    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', e164Phone);
    formData.append('From', twilioPhone);
    formData.append('Body', message);
    
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
      throw new Error(data.message || 'Failed to send SMS');
    }
    
    console.log('SMS sent successfully:', data.sid);
    
    // Log the SMS to the database
    if (leadId) {
      const { error: logError } = await supabase
        .from('sms_logs')
        .insert({
          user_id: user.id,
          lead_id: leadId,
          to_number: e164Phone,
          message: message,
          status: 'sent',
          message_sid: data.sid,
        });

      if (logError) {
        console.error('Error logging SMS:', logError);
      } else {
        console.log('SMS logged successfully');
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, messageSid: data.sid }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending SMS:', error);
    // Generic error response - details logged server-side only
    const errorMessage = error instanceof Error && 
      (error.message.includes('Invalid') || error.message.includes('not authenticated') || error.message.includes('not configured'))
      ? error.message 
      : 'Failed to send SMS';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
