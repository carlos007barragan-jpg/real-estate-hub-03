// Handles inbound calls to the CRM - creates leads and logs calls
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize phone number to digits-only for matching
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

// Sanitize identity for WebRTC (must match get-twilio-token)
const sanitizeIdentity = (email: string) =>
  email.replace(/@/g, '_at_').replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '');

// Escape XML-sensitive characters for TwiML attributes
const escapeXmlAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const BILINGUAL_GREETING =
  'Thank you for calling Real Living. One of our agents will be with you shortly. Gracias por llamar a Real Living. Uno de nuestros agentes le atenderá en breve.';

const BILINGUAL_VOICEMAIL =
  "We're sorry we missed your call. Please leave a message and a Real Living agent will call you back. Lo sentimos, deje un mensaje y un agente le devolverá la llamada.";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const stage = requestUrl.searchParams.get('stage') ?? 'agents';
  const leadIdFromUrl = requestUrl.searchParams.get('leadId');
  const leadOwnerUserIdFromUrl = requestUrl.searchParams.get('leadOwnerUserId');
  const settingsUserIdFromUrl = requestUrl.searchParams.get('settingsUserId');
  const dialCallStatus = null as string | null; // will be read from form

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    console.log('Inbound call webhook params:', JSON.stringify({ stage, query: Object.fromEntries(requestUrl.searchParams), params }));

    const from = params['From'];
    const to = params['To'];
    const callSid = params['CallSid'];
    const answeredBy = params['AnsweredBy'] || 'CRM System';
    const dialCallStatusParam = params['DialCallStatus'];

    // Validate inputs
    if (!from || from.length === 0 || from.length > 20) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' }, status: 400,
      });
    }
    if (!to || to.length === 0 || to.length > 20) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' }, status: 400,
      });
    }
    if (!callSid || callSid.length > 50) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request.</Say></Response>', {
        headers: { 'Content-Type': 'text/xml' }, status: 400,
      });
    }

    console.log('Inbound call received:', { stage, from, to, callSid, answeredBy, dialCallStatusParam });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-callback`;
    const recordingCallbackUrlEsc = escapeXmlAttr(recordingCallbackUrl);

    let leadId: string | null = leadIdFromUrl ?? null;
    let leadOwnerUserId: string | null = leadOwnerUserIdFromUrl ?? null;

    // ========== STAGE: AGENTS (first attempt) ==========
    if (stage === 'agents') {
      // --- STEP 2: Smart Caller Identification ---
      const normalizedFrom = normalizePhone(from);

      // Try exact match first
      const { data: exactLead } = await supabase
        .from('leads')
        .select('id, user_id, name, assigned_to, phone')
        .eq('phone', from)
        .maybeSingle();

      // If no exact match, try normalized search
      let matchedLead = exactLead;
      if (!matchedLead) {
        const { data: allLeads } = await supabase
          .from('leads')
          .select('id, user_id, name, phone, assigned_to')
          .limit(500);

        if (allLeads) {
          matchedLead = allLeads.find(l => normalizePhone(l.phone) === normalizedFrom) || null;
        }
      }

      leadId = matchedLead?.id ?? null;
      leadOwnerUserId = matchedLead?.user_id ?? null;

      // Determine if this is CASE A (assigned agent) or CASE B (new/unassigned)
      let assignedAgentUserId: string | null = null;
      let isAssignedLead = false;

      if (matchedLead && matchedLead.assigned_to && matchedLead.assigned_to !== 'unassigned' && matchedLead.assigned_to !== 'discarded') {
        // CASE A: Existing lead with an assigned agent — find agent's user_id by name
        const agentName = matchedLead.assigned_to;
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('user_id, phone_number, email')
          .or(`first_name.ilike.%${agentName.split(' ')[0]}%`)
          .limit(10);

        if (agentProfile) {
          // Match by full name (first + last)
          const match = agentProfile.find(p => {
            const { data: prof } = { data: p }; // already have it
            return true; // we'll do a better match below
          });
        }

        // Better approach: query profiles where first_name || ' ' || last_name = assigned_to
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('user_id, phone_number, email')
          .limit(100);

        if (matchedProfiles) {
          // We need to also get first/last names - profiles has them
          const { data: allProfiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, phone_number, email')
            .limit(100);

          if (allProfiles) {
            const agentMatch = allProfiles.find(p =>
              `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase() === agentName.toLowerCase()
            );
            if (agentMatch) {
              assignedAgentUserId = agentMatch.user_id;
              isAssignedLead = true;
              console.log('CASE A: Returning lead with assigned agent:', agentName, assignedAgentUserId);
            }
          }
        }

        // Update lead
        await supabase.from('leads').update({
          last_inbound_at: new Date().toISOString(),
          source_call_sid: callSid,
          is_inbound_call: true,
        }).eq('id', matchedLead.id);

        await supabase.from('notes').insert({
          lead_id: matchedLead.id,
          user_id: matchedLead.user_id,
          content: `📞 Inbound call received from ${from} at ${new Date().toLocaleString()}. Returning client — routing to assigned agent: ${agentName}.`,
          author: 'System',
          note_type: 'system',
        });
      } else if (matchedLead) {
        // Existing lead but unassigned — treat as CASE B
        console.log('Existing lead, unassigned. Treating as CASE B.');
        await supabase.from('leads').update({
          last_inbound_at: new Date().toISOString(),
          source_call_sid: callSid,
          is_inbound_call: true,
          assigned_to: 'unassigned',
        }).eq('id', matchedLead.id);

        await supabase.from('notes').insert({
          lead_id: matchedLead.id,
          user_id: matchedLead.user_id,
          content: `📞 Inbound call received from ${from} at ${new Date().toLocaleString()}. Returning contact — no assigned agent, routing to all agents.`,
          author: 'System',
          note_type: 'system',
        });
      }

      // If no lead exists, create a new one (CASE B)
      if (!leadId) {
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
            last_inbound_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (leadError) {
          console.error('Error creating lead:', leadError);
          throw leadError;
        }

        leadId = newLead.id;
        console.log('CASE B: Created new lead:', leadId);
      }

      // Create call log (deduplicate by call_sid)
      const { data: existingCallLog } = await supabase
        .from('call_logs')
        .select('id')
        .eq('call_sid', callSid)
        .maybeSingle();

      if (!existingCallLog && leadId && leadOwnerUserId) {
        await supabase.from('call_logs').insert({
          call_sid: callSid,
          lead_id: leadId,
          user_id: leadOwnerUserId,
          from_number: from,
          to_number: to,
          status: 'in-progress',
          direction: 'inbound',
          answered_by: answeredBy,
        });
      }

      // --- Build dial targets ---
      const settingsUserId = await resolveSettingsUserId(supabase, settingsUserIdFromUrl ?? leadOwnerUserId);
      const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadId}&userId=${settingsUserId}`;
      const statusCallbackUrlEsc = escapeXmlAttr(statusCallbackUrl);
      const fallbackStageUrl = `${supabaseUrl}/functions/v1/inbound-call-webhook?stage=fallback&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}&settingsUserId=${settingsUserId}`;
      const fallbackStageUrlEsc = escapeXmlAttr(fallbackStageUrl);
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER') || to;

      const dialTargets: string[] = [];

      if (isAssignedLead && assignedAgentUserId) {
        // CASE A: Only ring the assigned agent
        const { data: agentRec } = await supabase
          .from('agents')
          .select('phone_number')
          .eq('user_id', assignedAgentUserId)
          .eq('is_active', true)
          .maybeSingle();

        if (agentRec?.phone_number) {
          dialTargets.push(`<Number>${agentRec.phone_number}</Number>`);
        }

        // Also ring their browser client
        const { data: userRes } = await supabase.auth.admin.getUserById(assignedAgentUserId);
        if (userRes?.user?.email) {
          dialTargets.push(`<Client><Identity>${sanitizeIdentity(userRes.user.email)}</Identity></Client>`);
        }

        console.log('CASE A: Routing to assigned agent only. Targets:', dialTargets.length);
      } else {
        // CASE B: Ring ALL active agents
        const { data: agents } = await supabase
          .from('agents')
          .select('user_id, phone_number')
          .eq('is_active', true);

        if (agents && agents.length > 0) {
          for (const agent of agents) {
            if (agent.phone_number && agent.phone_number.length > 0) {
              dialTargets.push(`<Number>${agent.phone_number}</Number>`);
            }
            const { data: userRes, error: userError } = await supabase.auth.admin.getUserById(agent.user_id);
            if (!userError && userRes?.user?.email) {
              dialTargets.push(`<Client><Identity>${sanitizeIdentity(userRes.user.email)}</Identity></Client>`);
            }
          }
        }

        // Fallback: try lead owner
        if (dialTargets.length === 0 && leadOwnerUserId) {
          const { data: ownerAgent } = await supabase
            .from('agents')
            .select('phone_number')
            .eq('user_id', leadOwnerUserId)
            .maybeSingle();

          if (ownerAgent?.phone_number) {
            dialTargets.push(`<Number>${ownerAgent.phone_number}</Number>`);
          }
          const { data: ownerRes } = await supabase.auth.admin.getUserById(leadOwnerUserId);
          if (ownerRes?.user?.email) {
            dialTargets.push(`<Client><Identity>${sanitizeIdentity(ownerRes.user.email)}</Identity></Client>`);
          }
        }

        console.log('CASE B: Routing to all active agents. Targets:', dialTargets.length);
      }

      // If no targets, jump to fallback
      if (dialTargets.length === 0) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${BILINGUAL_GREETING}</Say>
  <Redirect method="POST">${fallbackStageUrlEsc}</Redirect>
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      const allTargets = dialTargets.join('\n    ');

      // STEP 1: Bilingual greeting then dial agents with 30s timeout
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${BILINGUAL_GREETING}</Say>
  <Dial callerId="${twilioPhone}" record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="30" action="${fallbackStageUrlEsc}" method="POST" statusCallback="${statusCallbackUrlEsc}" statusCallbackEvent="completed" statusCallbackMethod="POST">
    ${allTargets}
  </Dial>
  <Redirect method="POST">${fallbackStageUrlEsc}</Redirect>
</Response>`;

      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ========== STAGE: FALLBACK ==========
    if (stage === 'fallback') {
      if (!leadId || !leadOwnerUserId) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, user_id')
          .eq('phone', from)
          .maybeSingle();
        leadId = leadId ?? existingLead?.id ?? null;
        leadOwnerUserId = leadOwnerUserId ?? existingLead?.user_id ?? null;
      }

      // If agent answered, don't proceed to fallback
      if (dialCallStatusParam === 'completed') {
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>', {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      const settingsUserId = await resolveSettingsUserId(supabase, settingsUserIdFromUrl ?? leadOwnerUserId ?? '');
      const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadId}&userId=${settingsUserId}`;
      const statusCallbackUrlEsc = escapeXmlAttr(statusCallbackUrl);

      const { data: crmSettings } = await supabase
        .from('crm_settings')
        .select('fallback_phone_1, fallback_phone_2')
        .eq('user_id', settingsUserId)
        .maybeSingle();

      const fallbackNumbers = [crmSettings?.fallback_phone_1, crmSettings?.fallback_phone_2].filter(
        (n): n is string => typeof n === 'string' && n.length > 0
      );

      // No fallback numbers → voicemail
      if (fallbackNumbers.length === 0) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${BILINGUAL_VOICEMAIL}</Say>
  <Record maxLength="120" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" />
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      const numberTargets = fallbackNumbers.map(num => `<Number>${num}</Number>`).join('\n    ');

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while we connect you. Por favor espere mientras lo conectamos.</Say>
  <Dial record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="35" statusCallback="${statusCallbackUrlEsc}" statusCallbackEvent="completed" statusCallbackMethod="POST">
    ${numberTargets}
  </Dial>
  <Say voice="Polly.Joanna">${BILINGUAL_VOICEMAIL}</Say>
  <Record maxLength="120" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" />
</Response>`;

      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // Should not reach here
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in inbound call webhook:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're sorry, an error occurred. Please try again later. Lo sentimos, ha ocurrido un error. Intente de nuevo más tarde.</Say>
</Response>`;
    return new Response(errorTwiml, { headers: { 'Content-Type': 'text/xml' }, status: 500 });
  }
});

async function resolveSettingsUserId(supabase: any, candidateUserId: string): Promise<string> {
  const { data: directSettings } = await supabase
    .from('crm_settings')
    .select('user_id')
    .eq('user_id', candidateUserId)
    .maybeSingle();

  if (directSettings) return candidateUserId;

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

  return admins?.[0]?.user_id ?? candidateUserId;
}
