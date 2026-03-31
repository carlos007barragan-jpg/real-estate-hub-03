// Handles inbound calls to the CRM - creates leads and logs calls
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

const sanitizeIdentity = (email: string) =>
  email.replace(/@/g, '_at_').replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '');

const escapeXmlAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const GREETING_TWIML = `
  <Say voice="Polly.Joanna" language="en-US">Thank you for calling Real Living. One of our agents will be with you shortly.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Lupe" language="es-US">Gracias por llamar a Real Living. Uno de nuestros agentes le atenderá en breve.</Say>`;

const VOICEMAIL_TWIML = `
  <Say voice="Polly.Joanna" language="en-US">We're sorry we missed your call. Please leave a message and a Real Living agent will call you back.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Lupe" language="es-US">Lo sentimos, deje un mensaje y un agente le devolverá la llamada.</Say>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const stage = requestUrl.searchParams.get('stage') ?? 'agents';
  const leadIdFromUrl = requestUrl.searchParams.get('leadId');
  const leadOwnerUserIdFromUrl = requestUrl.searchParams.get('leadOwnerUserId');
  const settingsUserIdFromUrl = requestUrl.searchParams.get('settingsUserId');

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    console.log('[INBOUND] Stage:', stage, 'Params:', JSON.stringify(params));

    const from = params['From'];
    const to = params['To'];
    const callSid = params['CallSid'];
    const answeredBy = params['AnsweredBy'] || 'CRM System';
    const dialCallStatus = params['DialCallStatus'];

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

    console.log('[INBOUND] Call from:', from, 'to:', to, 'callSid:', callSid, 'dialCallStatus:', dialCallStatus);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-callback`;
    const recordingCallbackUrlEsc = escapeXmlAttr(recordingCallbackUrl);

    let leadId: string | null = leadIdFromUrl ?? null;
    let leadOwnerUserId: string | null = leadOwnerUserIdFromUrl ?? null;

    // ========== Fetch org-wide CRM settings ==========
    const { data: crmSettings } = await supabase
      .from('crm_settings')
      .select('auto_roundrobin_unanswered, smart_routing_enabled, fallback_phone_1, fallback_phone_2, user_id')
      .limit(1)
      .maybeSingle();

    const autoRoundRobin = crmSettings?.auto_roundrobin_unanswered ?? true;
    const smartRoutingEnabled = crmSettings?.smart_routing_enabled ?? true;
    const settingsUserId = crmSettings?.user_id ?? settingsUserIdFromUrl ?? '';

    console.log('[INBOUND] CRM Settings:', { autoRoundRobin, smartRoutingEnabled, settingsUserId });

    // ========== STAGE: AGENTS ==========
    if (stage === 'agents') {
      const normalizedFrom = normalizePhone(from);
      console.log('[INBOUND] Looking up caller:', from, 'normalized:', normalizedFrom);

      // Look up caller in leads
      const { data: exactLead } = await supabase
        .from('leads')
        .select('id, user_id, name, assigned_to, phone')
        .eq('phone', from)
        .maybeSingle();

      let matchedLead = exactLead;
      if (!matchedLead) {
        // Try normalized lookup
        const { data: allLeads } = await supabase
          .from('leads')
          .select('id, user_id, name, phone, assigned_to')
          .limit(500);
        if (allLeads) {
          matchedLead = allLeads.find(l => normalizePhone(l.phone) === normalizedFrom) || null;
        }
      }

      console.log('[INBOUND] Matched lead:', matchedLead ? { id: matchedLead.id, name: matchedLead.name, assigned_to: matchedLead.assigned_to } : 'NONE');

      leadId = matchedLead?.id ?? null;
      leadOwnerUserId = matchedLead?.user_id ?? null;

      // Determine routing: CASE A (assigned agent) vs CASE B (all agents)
      let assignedAgentUserId: string | null = null;
      let isAssignedLead = false;

      if (smartRoutingEnabled && matchedLead?.assigned_to && matchedLead.assigned_to !== 'unassigned' && matchedLead.assigned_to !== 'discarded') {
        const agentName = matchedLead.assigned_to;
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .limit(200);

        if (allProfiles) {
          const agentMatch = allProfiles.find(p =>
            `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase() === agentName.toLowerCase()
          );
          if (agentMatch) {
            assignedAgentUserId = agentMatch.user_id;
            isAssignedLead = true;
            console.log('[INBOUND] CASE A: Routing to assigned agent:', agentName, assignedAgentUserId);
          }
        }

        await supabase.from('leads').update({
          last_inbound_at: new Date().toISOString(),
          source_call_sid: callSid,
          is_inbound_call: true,
        }).eq('id', matchedLead.id);

        await supabase.from('notes').insert({
          lead_id: matchedLead.id,
          user_id: matchedLead.user_id,
          content: `📞 Inbound call from ${from}. Returning client — routing to assigned agent: ${agentName}.`,
          author: 'System',
          note_type: 'system',
        });
      } else if (matchedLead) {
        await supabase.from('leads').update({
          last_inbound_at: new Date().toISOString(),
          source_call_sid: callSid,
          is_inbound_call: true,
          assigned_to: 'unassigned',
        }).eq('id', matchedLead.id);

        await supabase.from('notes').insert({
          lead_id: matchedLead.id,
          user_id: matchedLead.user_id,
          content: `📞 Inbound call from ${from}. No assigned agent — routing to all agents.`,
          author: 'System',
          note_type: 'system',
        });
      }

      // ======== Create new lead if none found (CASE B - unknown caller) ========
      if (!leadId) {
        console.log('[INBOUND] No existing lead found. Creating new lead for:', from);

        // Find a user_id to own this lead - get the first admin/agent in the org
        const { data: orgProfiles } = await supabase
          .from('profiles')
          .select('user_id, organization_id')
          .not('organization_id', 'is', null)
          .limit(10);

        console.log('[INBOUND] Org profiles found:', orgProfiles?.length ?? 0);

        if (orgProfiles?.length) {
          leadOwnerUserId = orgProfiles[0].user_id;
        } else {
          // Last resort: get any user
          const { data: firstUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
          leadOwnerUserId = firstUser?.users?.[0]?.id ?? null;
        }

        if (!leadOwnerUserId) {
          console.error('[INBOUND] CRITICAL: No users found in system to own the lead');
          throw new Error('No users in system');
        }

        console.log('[INBOUND] Lead owner user_id:', leadOwnerUserId);

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
          console.error('[INBOUND] LEAD INSERT ERROR:', JSON.stringify(leadError));
          throw leadError;
        }

        leadId = newLead.id;
        console.log('[INBOUND] ✅ New lead created successfully:', leadId);

        // Add a system note
        await supabase.from('notes').insert({
          lead_id: leadId,
          user_id: leadOwnerUserId,
          content: `📞 New inbound call from ${from}. Unknown caller — new lead created automatically.`,
          author: 'System',
          note_type: 'system',
        });

        // Create notifications for all admins and agents in the org
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', leadOwnerUserId)
          .maybeSingle();

        const orgId = ownerProfile?.organization_id;
        console.log('[INBOUND] Owner org_id:', orgId);

        if (orgId) {
          // Get all org members to notify
          const { data: orgMembers } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('organization_id', orgId);

          if (orgMembers?.length) {
            const notifications = orgMembers.map(m => ({
              user_id: m.user_id,
              organization_id: orgId,
              type: 'lead_created',
              title: '📞 New Inbound Call',
              description: `Incoming call from ${from} — new lead created. Check Live Calls tab.`,
              link: `/leads/${leadId}`,
              event_type: 'inbound_call',
              entity_type: 'lead',
              entity_id: leadId,
            }));

            const { error: notifError } = await supabase.from('notifications').insert(notifications);
            console.log('[INBOUND] Notifications inserted:', notifications.length, 'error:', notifError ? JSON.stringify(notifError) : 'none');
          }
        }
      }

      // Deduplicate call log
      const { data: existingLog } = await supabase
        .from('call_logs').select('id').eq('call_sid', callSid).maybeSingle();

      if (!existingLog && leadId && leadOwnerUserId) {
        const { error: logError } = await supabase.from('call_logs').insert({
          call_sid: callSid,
          lead_id: leadId,
          user_id: leadOwnerUserId,
          from_number: from,
          to_number: to,
          status: 'in-progress',
          direction: 'inbound',
          answered_by: answeredBy,
        });
        console.log('[INBOUND] Call log inserted, error:', logError ? JSON.stringify(logError) : 'none');
      }

      // Build URLs
      const resolvedSettingsUserId = await resolveSettingsUserId(supabase, settingsUserId || leadOwnerUserId!);
      const statusCallbackUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadId}&userId=${resolvedSettingsUserId}`);
      const fallbackStageUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=fallback&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}&settingsUserId=${resolvedSettingsUserId}`);
      const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER') || to;

      // ---- If round-robin is OFF, skip agents and go to fallback ----
      if (!autoRoundRobin && !isAssignedLead) {
        console.log('[INBOUND] Round-robin OFF and no assigned agent — going straight to fallback');
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${GREETING_TWIML}
  <Redirect method="POST">${fallbackStageUrl}</Redirect>
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      // ======== Build dial targets ========
      const dialTargets: string[] = [];
      const seenPhones = new Set<string>();
      const seenEmails = new Set<string>();

      if (isAssignedLead && assignedAgentUserId) {
        // CASE A: Only assigned agent — check agents table then profiles
        const { data: agentRec } = await supabase
          .from('agents').select('phone_number')
          .eq('user_id', assignedAgentUserId).eq('is_active', true).maybeSingle();

        if (agentRec?.phone_number) {
          dialTargets.push(`<Number>${agentRec.phone_number}</Number>`);
          seenPhones.add(agentRec.phone_number);
        }

        // Also check profiles for phone
        if (!agentRec?.phone_number) {
          const { data: profileRec } = await supabase
            .from('profiles').select('phone_number')
            .eq('user_id', assignedAgentUserId).maybeSingle();
          if (profileRec?.phone_number) {
            dialTargets.push(`<Number>${profileRec.phone_number}</Number>`);
            seenPhones.add(profileRec.phone_number);
          }
        }

        // WebRTC client
        const { data: userRes } = await supabase.auth.admin.getUserById(assignedAgentUserId);
        if (userRes?.user?.email) {
          const identity = sanitizeIdentity(userRes.user.email);
          dialTargets.push(`<Client><Identity>${identity}</Identity></Client>`);
        }
        console.log('[INBOUND] CASE A targets:', dialTargets.length);
      } else {
        // CASE B: ALL active agents + ALL org members with phones
        console.log('[INBOUND] CASE B: Fetching all active agents and org members');

        // 1. Get all from agents table
        const { data: agents, error: agentsError } = await supabase
          .from('agents').select('user_id, phone_number').eq('is_active', true);

        console.log('[INBOUND] Agents table:', agents?.length ?? 0, 'error:', agentsError ? JSON.stringify(agentsError) : 'none');

        if (agents?.length) {
          for (const agent of agents) {
            if (agent.phone_number && !seenPhones.has(agent.phone_number)) {
              dialTargets.push(`<Number>${agent.phone_number}</Number>`);
              seenPhones.add(agent.phone_number);
            }
            // Get email for WebRTC
            const { data: userRes } = await supabase.auth.admin.getUserById(agent.user_id);
            if (userRes?.user?.email && !seenEmails.has(userRes.user.email)) {
              const identity = sanitizeIdentity(userRes.user.email);
              dialTargets.push(`<Client><Identity>${identity}</Identity></Client>`);
              seenEmails.add(userRes.user.email);
            }
          }
        }

        // 2. ALSO get all org members with phone numbers from profiles table
        // This catches users who never registered in the agents table
        let orgId: string | null = null;
        if (leadOwnerUserId) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', leadOwnerUserId)
            .maybeSingle();
          orgId = ownerProfile?.organization_id ?? null;
        }

        if (orgId) {
          const { data: orgProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, phone_number')
            .eq('organization_id', orgId)
            .not('phone_number', 'is', null);

          console.log('[INBOUND] Org profiles with phones:', orgProfiles?.length ?? 0, 'error:', profilesError ? JSON.stringify(profilesError) : 'none');

          if (orgProfiles?.length) {
            for (const profile of orgProfiles) {
              // Add phone if not already seen
              if (profile.phone_number && !seenPhones.has(profile.phone_number)) {
                dialTargets.push(`<Number>${profile.phone_number}</Number>`);
                seenPhones.add(profile.phone_number);
              }
              // Add WebRTC client if not already seen
              const { data: userRes } = await supabase.auth.admin.getUserById(profile.user_id);
              if (userRes?.user?.email && !seenEmails.has(userRes.user.email)) {
                const identity = sanitizeIdentity(userRes.user.email);
                dialTargets.push(`<Client><Identity>${identity}</Identity></Client>`);
                seenEmails.add(userRes.user.email);
              }
            }
          }
        }

        console.log('[INBOUND] CASE B total targets:', dialTargets.length, 'phones:', seenPhones.size, 'clients:', seenEmails.size);
      }

      if (dialTargets.length === 0) {
        console.log('[INBOUND] No dial targets found — going to fallback');
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${GREETING_TWIML}
  <Redirect method="POST">${fallbackStageUrl}</Redirect>
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${GREETING_TWIML}
  <Dial callerId="${twilioPhone}" record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="30" action="${fallbackStageUrl}" method="POST" statusCallback="${statusCallbackUrl}" statusCallbackEvent="completed" statusCallbackMethod="POST">
    ${dialTargets.join('\n    ')}
  </Dial>
</Response>`;

      console.log('[INBOUND] Final TwiML targets count:', dialTargets.length);
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ========== STAGE: FALLBACK ==========
    if (stage === 'fallback') {
      if (!leadId || !leadOwnerUserId) {
        const { data: existingLead } = await supabase
          .from('leads').select('id, user_id').eq('phone', from).maybeSingle();
        leadId = leadId ?? existingLead?.id ?? null;
        leadOwnerUserId = leadOwnerUserId ?? existingLead?.user_id ?? null;
      }

      // If the agent answered and the call completed normally, just hang up
      if (dialCallStatus === 'completed' || dialCallStatus === 'answered') {
        console.log('[INBOUND] Agent answered and call completed — no voicemail needed');
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>', {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      console.log('[INBOUND] Dial status:', dialCallStatus, '— proceeding to fallback/voicemail');

      const resolvedSettingsUserId = await resolveSettingsUserId(supabase, settingsUserIdFromUrl ?? leadOwnerUserId ?? '');
      const statusCallbackUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadId}&userId=${resolvedSettingsUserId}`);
      const voicemailStageUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=voicemail&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}&settingsUserId=${resolvedSettingsUserId}`);

      const fallbackNumbers = [crmSettings?.fallback_phone_1, crmSettings?.fallback_phone_2].filter(
        (n): n is string => typeof n === 'string' && n.length > 0
      );

      if (fallbackNumbers.length === 0) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${VOICEMAIL_TWIML}
  <Record maxLength="120" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" />
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      const numberTargets = fallbackNumbers.map(num => `<Number>${num}</Number>`).join('\n    ');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Please hold while we connect you.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Lupe" language="es-US">Por favor espere mientras lo conectamos.</Say>
  <Dial record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="35" action="${voicemailStageUrl}" method="POST" statusCallback="${statusCallbackUrl}" statusCallbackEvent="completed" statusCallbackMethod="POST">
    ${numberTargets}
  </Dial>
</Response>`;

      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ========== STAGE: VOICEMAIL ==========
    if (stage === 'voicemail') {
      if (dialCallStatus === 'completed' || dialCallStatus === 'answered') {
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>', {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${VOICEMAIL_TWIML}
  <Record maxLength="120" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" />
</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('[INBOUND] ERROR:', error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">We're sorry, an error occurred. Please try again later.</Say>
  <Say voice="Polly.Lupe" language="es-US">Lo sentimos, ha ocurrido un error.</Say>
</Response>`, { headers: { 'Content-Type': 'text/xml' }, status: 500 });
  }
});

async function resolveSettingsUserId(supabase: any, candidateUserId: string): Promise<string> {
  const { data: directSettings } = await supabase
    .from('crm_settings').select('user_id').eq('user_id', candidateUserId).maybeSingle();
  if (directSettings) return candidateUserId;

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('user_id', candidateUserId).maybeSingle();
  const orgId = profile?.organization_id;
  if (!orgId) return candidateUserId;

  const { data: orgProfiles } = await supabase
    .from('profiles').select('user_id').eq('organization_id', orgId);
  const orgUserIds = (orgProfiles ?? []).map((p: any) => p.user_id).filter(Boolean);
  if (orgUserIds.length === 0) return candidateUserId;

  const { data: admins } = await supabase
    .from('user_roles').select('user_id').eq('role', 'admin').in('user_id', orgUserIds).limit(1);
  return admins?.[0]?.user_id ?? candidateUserId;
}
