// Handles inbound calls to the CRM - creates leads and logs calls
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const stage = requestUrl.searchParams.get('stage') ?? 'agents'; // agents | fallback
  const leadIdFromUrl = requestUrl.searchParams.get('leadId');
  const leadOwnerUserIdFromUrl = requestUrl.searchParams.get('leadOwnerUserId');
  const settingsUserIdFromUrl = requestUrl.searchParams.get('settingsUserId');

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    console.log('Inbound call webhook params:', JSON.stringify({ stage, query: Object.fromEntries(requestUrl.searchParams), params }));

    // Validate input parameters
    const from = params['From'];
    const to = params['To'];
    const callSid = params['CallSid'];
    const answeredBy = params['AnsweredBy'] || 'CRM System';
    const dialCallStatus = params['DialCallStatus'];

    if (!from || typeof from !== 'string' || from.length === 0 || from.length > 20) {
      console.error('Invalid From parameter');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 400,
      });
    }
    if (!to || typeof to !== 'string' || to.length === 0 || to.length > 20) {
      console.error('Invalid To parameter');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 400,
      });
    }
    if (!callSid || typeof callSid !== 'string' || callSid.length > 50) {
      console.error('Invalid CallSid parameter');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' },
        status: 400,
      });
    }

    console.log('Inbound call received:', { stage, from, to, callSid, answeredBy, dialCallStatus });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get recording callback URL and escape XML-sensitive characters for attributes
    const escapeXmlAttr = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Helper function to sanitize identity (must match get-twilio-token)
    const sanitizeIdentity = (email: string) => {
      return email.replace(/@/g, '_at_').replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    };

    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-callback`;
    const recordingCallbackUrlEsc = escapeXmlAttr(recordingCallbackUrl);

    let leadId: string | null = leadIdFromUrl ?? null;
    let leadOwnerUserId: string | null = leadOwnerUserIdFromUrl ?? null;

    // Stage: agents (first attempt) → find/create lead + log call
    if (stage === 'agents') {
      // Check if lead exists with this phone number
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id, user_id')
        .eq('phone', from)
        .maybeSingle();

      leadId = existingLead?.id ?? null;
      leadOwnerUserId = existingLead?.user_id ?? null;

      // If no lead exists, create a new one
      if (!leadId) {
        // Choose an owner for the new lead: first active agent, else first user
        const { data: activeAgents } = await supabase
          .from('agents')
          .select('user_id')
          .eq('is_active', true)
          .limit(1);

        if (activeAgents && activeAgents.length > 0) {
          leadOwnerUserId = activeAgents[0].user_id;
        } else {
          const { data: firstUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
          leadOwnerUserId = firstUser?.users[0]?.id;
        }

        if (!leadOwnerUserId) {
          console.error('No users found in the system');
          throw new Error('System configuration error');
        }

        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            name: `Inbound Call - ${from}`,
            email: `inbound+${from.replace(/\D/g, '')}@placeholder.com`,
            phone: from,
            status: 'new',
            source: 'Inbound Call',
            assigned_to: 'unassigned',
            pipeline_stage: 'New Lead',
            user_id: leadOwnerUserId,
            is_inbound_call: true,
            source_call_sid: callSid,
          })
          .select('id')
          .single();

        if (leadError) {
          console.error('Error creating lead:', leadError);
          throw leadError;
        }

        leadId = newLead.id;
        console.log('Created new lead:', leadId);
      }

      // Check if call log already exists (Twilio may call webhook multiple times)
      const { data: existingCallLog } = await supabase
        .from('call_logs')
        .select('id')
        .eq('call_sid', callSid)
        .maybeSingle();

      // Only create call log if it doesn't exist
      if (!existingCallLog && leadId && leadOwnerUserId) {
        const { error: callLogError } = await supabase.from('call_logs').insert({
          call_sid: callSid,
          lead_id: leadId,
          user_id: leadOwnerUserId,
          from_number: from,
          to_number: to,
          status: 'in-progress',
          direction: 'inbound',
          answered_by: answeredBy,
        });

        if (callLogError) {
          console.error('Error creating call log:', callLogError);
          // Don't throw error - we still want to return valid TwiML
        }
      } else {
        console.log('Call log already exists for call_sid:', callSid);
      }
    }

    // Stage: fallback can be hit without leadId/userId (e.g. if Twilio calls the action but query params got stripped)
    if (!leadId || !leadOwnerUserId) {
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id, user_id')
        .eq('phone', from)
        .maybeSingle();

      leadId = leadId ?? existingLead?.id ?? null;
      leadOwnerUserId = leadOwnerUserId ?? existingLead?.user_id ?? null;
    }

    if (!leadId || !leadOwnerUserId) {
      console.error('Unable to resolve lead for inbound call', { leadId, leadOwnerUserId, from });
      throw new Error('Unable to resolve lead');
    }

    // Resolve which user owns call routing settings (usually the org admin)
    const settingsUserId = await resolveSettingsUserId(supabase, settingsUserIdFromUrl ?? leadOwnerUserId);

    const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadId}&userId=${settingsUserId}`;
    const statusCallbackUrlEsc = escapeXmlAttr(statusCallbackUrl);

    const fallbackStageUrl = `${supabaseUrl}/functions/v1/inbound-call-webhook?stage=fallback&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}&settingsUserId=${settingsUserId}`;
    const fallbackStageUrlEsc = escapeXmlAttr(fallbackStageUrl);

    // ---- Stage: fallback (only dial the fallback phone numbers) ----
    if (stage === 'fallback') {
      // If an agent DID answer (DialCallStatus=completed), do not proceed to fallback numbers.
      if (dialCallStatus === 'completed') {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup />
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      const { data: crmSettings } = await supabase
        .from('crm_settings')
        .select('fallback_phone_1, fallback_phone_2')
        .eq('user_id', settingsUserId)
        .maybeSingle();

      const fallbackNumbers = [crmSettings?.fallback_phone_1, crmSettings?.fallback_phone_2].filter(
        (n): n is string => typeof n === 'string' && n.length > 0
      );

      const numberTargets = fallbackNumbers.map((num) => `<Number>${num}</Number>`).join('\n    ');

      // If no fallback numbers are configured, go straight to voicemail
      if (fallbackNumbers.length === 0) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry, no one is available to take your call. Please leave a message after the tone.</Say>
  <Record maxLength="120" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" />
</Response>`;

        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please hold while we connect you.</Say>
  <Dial record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="35" statusCallback="${statusCallbackUrlEsc}" statusCallbackEvent="completed" statusCallbackMethod="POST">
    ${numberTargets}
  </Dial>
  <Say voice="alice">We're sorry, no one is available to take your call. Please leave a message after the tone.</Say>
  <Record maxLength="120" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" />
</Response>`;

      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ---- Stage: agents (dial CRM web clients first) ----

    // Get all active agents
    const { data: agents } = await supabase
      .from('agents')
      .select('user_id')
      .eq('is_active', true);

    // Build dial targets with active agent client identities
    const identities: string[] = [];

    if (agents && agents.length > 0) {
      for (const agent of agents) {
        const { data: userRes, error: userError } = await supabase.auth.admin.getUserById(agent.user_id);
        if (!userError && userRes?.user?.email) {
          identities.push(sanitizeIdentity(userRes.user.email));
        }
      }
    }

    // If no identities from active agents, attempt to ring the lead owner
    if (identities.length === 0 && leadOwnerUserId) {
      const { data: ownerRes, error: ownerError } = await supabase.auth.admin.getUserById(leadOwnerUserId);
      if (!ownerError && ownerRes?.user?.email) {
        identities.push(sanitizeIdentity(ownerRes.user.email));
      }
    }

    const clientTargets = identities.map((id) => `<Client><Identity>${id}</Identity></Client>`).join('\n    ');

    console.log('Dial identities resolved:', identities, 'Dial targets built:', clientTargets);

    // If we have no web clients to ring, jump straight to fallback stage
    if (identities.length === 0) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${fallbackStageUrlEsc}</Redirect>
</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Return TwiML: ring web clients → (action) fallback stage (only on no-answer/busy/failed/etc)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Please hold while we connect you to an agent.</Say>
  <Dial record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="25" action="${fallbackStageUrlEsc}" method="POST" statusCallback="${statusCallbackUrlEsc}" statusCallbackEvent="completed" statusCallbackMethod="POST">
    ${clientTargets}
  </Dial>
  <Redirect method="POST">${fallbackStageUrlEsc}</Redirect>
</Response>`;

    return new Response(twiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error in inbound call webhook:', error);
    // Generic error response - details logged server-side only
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry, an error occurred. Please try again later.</Say>
</Response>`;

    return new Response(errorTwiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
      status: 500,
    });
  }
});

async function resolveSettingsUserId(supabase: any, candidateUserId: string): Promise<string> {
  // If this user has settings, use them.
  const { data: directSettings } = await supabase
    .from('crm_settings')
    .select('user_id')
    .eq('user_id', candidateUserId)
    .maybeSingle();

  if (directSettings) return candidateUserId;

  // Otherwise, try to find an admin in the same organization and use THEIR settings.
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', candidateUserId)
    .maybeSingle();

  const orgId = profile?.organization_id;
  if (!orgId) return candidateUserId;

  const { data: orgProfiles } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('organization_id', orgId);

  const orgUserIds = (orgProfiles ?? []).map((p: any) => p.user_id).filter(Boolean);
  if (orgUserIds.length === 0) return candidateUserId;

  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .in('user_id', orgUserIds)
    .limit(1);

  const adminId = admins?.[0]?.user_id;
  return adminId ?? candidateUserId;
}

