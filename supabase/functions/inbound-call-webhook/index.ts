// Handles inbound calls to the CRM - creates leads, IVR directory, and logs calls
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

// ==================== HELPER FUNCTIONS ====================

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

function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.startsWith('+')) return phone;
  return `+${digits}`;
}

async function buildAllAgentDialTargets(supabase: any, orgId: string | null): Promise<string[]> {
  const dialTargets: string[] = [];
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();

  if (!orgId) {
    console.log('[INBOUND] buildAllAgentDialTargets: no orgId — returning empty');
    return [];
  }

  // Query all profiles with a non-null extension in this org
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, phone_number, email, first_name, last_name, extension')
    .eq('organization_id', orgId)
    .not('extension', 'is', null);

  if (profilesError) {
    console.error('[INBOUND] Error fetching org profiles for dial:', profilesError);
    return [];
  }

  if (!profiles?.length) {
    console.log('[INBOUND] No profiles with extensions found in org:', orgId);
    return [];
  }

  // Fetch roles to exclude marketing
  const userIds = profiles.map((p: any) => p.user_id);
  const { data: roles } = await supabase
    .from('user_roles').select('user_id, role').in('user_id', userIds);
  const roleMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));

  for (const profile of profiles) {
    const role = roleMap.get(profile.user_id);
    // Exclude marketing roles
    if (role === 'marketing' || role === 'marketing_manager') {
      console.log('[INBOUND] Excluding marketing user:', profile.email);
      continue;
    }
    // Exclude test accounts
    if (profile.email && (profile.email.includes('test') || profile.first_name === 'HEHE')) {
      console.log('[INBOUND] Excluding test account:', profile.email);
      continue;
    }

    // Add phone number
    if (profile.phone_number) {
      const e164 = formatE164(profile.phone_number);
      if (!seenPhones.has(e164)) {
        dialTargets.push(`<Number>${e164}</Number>`);
        seenPhones.add(e164);
      }
    }

    // Add WebRTC client
    if (profile.email && !seenEmails.has(profile.email)) {
      dialTargets.push(`<Client><Identity>${sanitizeIdentity(profile.email)}</Identity></Client>`);
      seenEmails.add(profile.email);
    }
  }

  console.log('[INBOUND] buildAllAgentDialTargets:', dialTargets.length, 'targets, phones:', seenPhones.size, 'clients:', seenEmails.size,
    'agents:', profiles.filter((p: any) => !roleMap.get(p.user_id)?.includes('marketing') && p.first_name !== 'HEHE').map((p: any) => `${p.first_name} ${p.last_name} ext${p.extension}`));
  return dialTargets;
}

async function buildSingleAgentDialTargets(supabase: any, agentUserId: string): Promise<string[]> {
  const targets: string[] = [];

  // Phone from agents table
  const { data: agentRec } = await supabase
    .from('agents').select('phone_number')
    .eq('user_id', agentUserId).eq('is_active', true).maybeSingle();

  if (agentRec?.phone_number) {
    targets.push(`<Number>${agentRec.phone_number}</Number>`);
  } else {
    // Fallback to profiles
    const { data: profileRec } = await supabase
      .from('profiles').select('phone_number')
      .eq('user_id', agentUserId).maybeSingle();
    if (profileRec?.phone_number) {
      targets.push(`<Number>${profileRec.phone_number}</Number>`);
    }
  }

  // WebRTC client
  const { data: userRes } = await supabase.auth.admin.getUserById(agentUserId);
  if (userRes?.user?.email) {
    targets.push(`<Client><Identity>${sanitizeIdentity(userRes.user.email)}</Identity></Client>`);
  }

  return targets;
}

interface AgentDirectoryEntry {
  user_id: string;
  first_name: string;
  last_name: string;
  extension: number;
}

async function fetchAgentDirectory(supabase: any, leadOwnerUserId: string): Promise<AgentDirectoryEntry[]> {
  let orgId: string | null = null;
  if (leadOwnerUserId) {
    const { data: p } = await supabase.from('profiles').select('organization_id').eq('user_id', leadOwnerUserId).maybeSingle();
    orgId = p?.organization_id ?? null;
  }
  if (!orgId) return [];

  // Fetch agents that have an extension assigned, ordered by extension
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, extension')
    .eq('organization_id', orgId)
    .not('extension', 'is', null)
    .order('extension', { ascending: true });

  if (!profiles?.length) return [];

  return profiles.map((p: any) => ({
    user_id: p.user_id,
    first_name: p.first_name || 'Agent',
    last_name: p.last_name || '',
    extension: p.extension,
  }));
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const stage = requestUrl.searchParams.get('stage') ?? 'agents';
  const leadIdFromUrl = requestUrl.searchParams.get('leadId');
  const leadOwnerUserIdFromUrl = requestUrl.searchParams.get('leadOwnerUserId');
  const settingsUserIdFromUrl = requestUrl.searchParams.get('settingsUserId');
  const orgIdFromUrl = requestUrl.searchParams.get('orgId');

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
    const digits = params['Digits'];

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-callback`;
    const recordingCallbackUrlEsc = escapeXmlAttr(recordingCallbackUrl);

    let leadId: string | null = leadIdFromUrl ?? null;
    let leadOwnerUserId: string | null = leadOwnerUserIdFromUrl ?? null;

    // Fetch org-wide CRM settings — scope to the org that owns this CRM
    // Wrapped in try/catch so a DB error never prevents TwiML from being returned
    let crmSettings: any = null;
    let orgId: string | null = null;
    let orgUserIds: string[] = [];

    try {
      const { data: allCrmSettings } = await supabase
        .from('crm_settings')
        .select('auto_roundrobin_unanswered, smart_routing_enabled, fallback_phone_1, fallback_phone_2, user_id');

      if (allCrmSettings?.length) {
        for (const s of allCrmSettings) {
          try {
            const { data: profile } = await supabase
              .from('profiles').select('organization_id').eq('user_id', s.user_id).maybeSingle();
            if (profile?.organization_id) {
              crmSettings = s;
              orgId = profile.organization_id;
              break;
            }
          } catch (e) { console.error('[INBOUND] Error resolving org for settings user:', s.user_id, e); }
        }
        if (!crmSettings) crmSettings = allCrmSettings[0];
      }
    } catch (e) {
      console.error('[INBOUND] Error fetching crm_settings:', e);
    }

    // Fallback: if no org resolved, grab the first organization
    if (!orgId) {
      try {
        const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
        orgId = firstOrg?.id ?? null;
        console.log('[INBOUND] Fallback org resolution:', orgId);
      } catch (e) { console.error('[INBOUND] Error fetching fallback org:', e); }
    }

    // Get all user_ids in this org for scoped queries
    if (orgId) {
      try {
        const { data: orgProfiles } = await supabase
          .from('profiles').select('user_id').eq('organization_id', orgId);
        orgUserIds = (orgProfiles ?? []).map((p: any) => p.user_id).filter(Boolean);
      } catch (e) { console.error('[INBOUND] Error fetching org profiles:', e); }
    }

    console.log('[INBOUND] Resolved org:', orgId, 'orgUserIds:', orgUserIds.length);

    const autoRoundRobin = crmSettings?.auto_roundrobin_unanswered ?? true;
    const smartRoutingEnabled = crmSettings?.smart_routing_enabled ?? true;
    const settingsUserId = crmSettings?.user_id ?? settingsUserIdFromUrl ?? '';
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER') || to;

    // ==================== STAGE: AGENTS (initial entry) ====================
    if (stage === 'agents') {
      const normalizedFrom = normalizePhone(from);
      console.log('[INBOUND] Looking up caller:', from, 'normalized:', normalizedFrom);

      // Look up caller in leads — scoped to this org's users
      let matchedLead: any = null;
      if (orgUserIds.length > 0) {
        const { data: exactLead } = await supabase
          .from('leads').select('id, user_id, name, assigned_to, phone')
          .eq('phone', from).in('user_id', orgUserIds).maybeSingle();

        matchedLead = exactLead;
        if (!matchedLead) {
          const { data: orgLeads } = await supabase
            .from('leads').select('id, user_id, name, phone, assigned_to')
            .in('user_id', orgUserIds).limit(500);
          if (orgLeads) {
            matchedLead = orgLeads.find(l => normalizePhone(l.phone) === normalizedFrom) || null;
          }
        }
      } else {
        // Fallback: global lookup if no org resolved
        const { data: exactLead } = await supabase
          .from('leads').select('id, user_id, name, assigned_to, phone')
          .eq('phone', from).maybeSingle();
        matchedLead = exactLead;
        if (!matchedLead) {
          const { data: allLeads } = await supabase
            .from('leads').select('id, user_id, name, phone, assigned_to').limit(500);
          if (allLeads) {
            matchedLead = allLeads.find(l => normalizePhone(l.phone) === normalizedFrom) || null;
          }
        }
      }

      console.log('[INBOUND] Matched lead:', matchedLead ? { id: matchedLead.id, name: matchedLead.name, assigned_to: matchedLead.assigned_to } : 'NONE');

      leadId = matchedLead?.id ?? null;
      leadOwnerUserId = matchedLead?.user_id ?? null;

      // Determine routing for assigned leads
      let assignedAgentUserId: string | null = null;
      let isAssignedLead = false;

      if (smartRoutingEnabled && matchedLead?.assigned_to && matchedLead.assigned_to !== 'unassigned' && matchedLead.assigned_to !== 'discarded') {
        const agentName = matchedLead.assigned_to;
        const { data: allProfiles } = await supabase
          .from('profiles').select('user_id, first_name, last_name').limit(200);

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
          lead_id: matchedLead.id, user_id: matchedLead.user_id,
          content: `📞 Inbound call from ${from}. Returning client — routing to assigned agent: ${agentName}.`,
          author: 'System', note_type: 'system',
        });
      } else if (matchedLead) {
        await supabase.from('leads').update({
          last_inbound_at: new Date().toISOString(),
          source_call_sid: callSid,
          is_inbound_call: true,
          assigned_to: 'unassigned',
        }).eq('id', matchedLead.id);

        await supabase.from('notes').insert({
          lead_id: matchedLead.id, user_id: matchedLead.user_id,
          content: `📞 Inbound call from ${from}. No assigned agent — routing to all agents.`,
          author: 'System', note_type: 'system',
        });
      }

      // Create new lead if none found — scoped to resolved org
      if (!leadId) {
        try {
          console.log('[INBOUND] No existing lead found. Creating new lead for:', from, 'in org:', orgId);

          // Use the first admin/user from the resolved org
          if (orgUserIds.length > 0) {
            const { data: adminRoles } = await supabase
              .from('user_roles').select('user_id')
              .in('role', ['admin', 'supreme_admin'])
              .in('user_id', orgUserIds).limit(1);
            leadOwnerUserId = adminRoles?.[0]?.user_id ?? orgUserIds[0];
          } else {
            const { data: firstUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
            leadOwnerUserId = firstUser?.users?.[0]?.id ?? null;
          }

          if (leadOwnerUserId) {
            const { data: newLead, error: leadError } = await supabase
              .from('leads').insert({
                name: `Inbound Call - ${from}`,
                email: `inbound+${from.replace(/\D/g, '')}@placeholder.com`,
                phone: from, status: 'new', source: 'Inbound Call',
                assigned_to: 'unassigned', pipeline_stage: 'New Lead',
                user_id: leadOwnerUserId, is_inbound_call: true,
                source_call_sid: callSid, last_inbound_at: new Date().toISOString(),
              }).select('id').single();

            if (leadError) {
              console.error('[INBOUND] LEAD INSERT ERROR:', JSON.stringify(leadError));
            } else {
              leadId = newLead.id;
              console.log('[INBOUND] ✅ New lead created:', leadId);

              await supabase.from('notes').insert({
                lead_id: leadId, user_id: leadOwnerUserId,
                content: `📞 New inbound call from ${from}. Unknown caller — new lead created automatically.`,
                author: 'System', note_type: 'system',
              }).catch(() => {});

              // Notify org members
              try {
                const notifOrgId = orgId;
                if (notifOrgId) {
                  const { data: orgMembers } = await supabase
                    .from('profiles').select('user_id').eq('organization_id', notifOrgId);
                  if (orgMembers?.length) {
                    const notifications = orgMembers.map(m => ({
                      user_id: m.user_id, organization_id: notifOrgId, type: 'lead_created',
                      title: '📞 New Inbound Call',
                      description: `Incoming call from ${from} — new lead created. Check Live Calls tab.`,
                      link: `/leads/${leadId}`, event_type: 'inbound_call',
                      entity_type: 'lead', entity_id: leadId,
                    }));
                    await supabase.from('notifications').insert(notifications);
                  }
                }
              } catch (e) { console.error('[INBOUND] Notification error:', e); }
            }
          } else {
            console.error('[INBOUND] No users found in system — skipping lead creation');
          }
        } catch (e) {
          console.error('[INBOUND] Lead creation failed (non-fatal):', e);
        }
      }

      // Deduplicate call log — use an admin from the resolved org
      try {
        const { data: existingLog } = await supabase
          .from('call_logs').select('id').eq('call_sid', callSid).maybeSingle();
        if (!existingLog && leadId) {
          // Find an admin in the org to own the call_log
          let callLogUserId = leadOwnerUserId;
          if (orgUserIds.length > 0) {
            const { data: adminRoles } = await supabase
              .from('user_roles').select('user_id')
              .in('role', ['admin', 'supreme_admin'])
              .in('user_id', orgUserIds).limit(1);
            callLogUserId = adminRoles?.[0]?.user_id ?? orgUserIds[0];
          }
          if (callLogUserId) {
            const { error: clErr } = await supabase.from('call_logs').insert({
              call_sid: callSid, lead_id: leadId, user_id: callLogUserId,
              from_number: from, to_number: to, status: 'in-progress',
              direction: 'inbound', answered_by: answeredBy,
            });
            if (clErr) console.error('[INBOUND] call_log insert error:', JSON.stringify(clErr));
            else console.log('[INBOUND] ✅ call_log created with user_id:', callLogUserId);
          }
        }
      } catch (e) { console.error('[INBOUND] Call log insert error (non-fatal):', e); }

      const resolvedSettingsUserId = await resolveSettingsUserId(supabase, settingsUserId || leadOwnerUserId || '');

      // Helper to build stage URLs with orgId
      const stageUrl = (s: string, extra = '') => `${supabaseUrl}/functions/v1/inbound-call-webhook?stage=${s}&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}&settingsUserId=${resolvedSettingsUserId}&orgId=${orgId}${extra}`;

      // ---- If assigned lead with smart routing, skip IVR and ring assigned agent directly ----
      if (isAssignedLead && assignedAgentUserId) {
        const targets = await buildSingleAgentDialTargets(supabase, assignedAgentUserId);
        const fallbackStageUrl = escapeXmlAttr(stageUrl('roundrobin'));
        const statusCallbackUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadId}&userId=${resolvedSettingsUserId}`);

        if (targets.length === 0) {
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
    ${targets.join('\n    ')}
  </Dial>
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      // ---- If round-robin is OFF, skip IVR and go to fallback ----
      if (!autoRoundRobin) {
        const fallbackStageUrl = escapeXmlAttr(stageUrl('fallback'));
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${GREETING_TWIML}
  <Redirect method="POST">${fallbackStageUrl}</Redirect>
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      // ---- Play IVR menu with <Gather> ----
      const ivrMenuUrl = escapeXmlAttr(stageUrl('ivr-menu'));
      const roundRobinUrl = escapeXmlAttr(stageUrl('roundrobin'));

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${GREETING_TWIML}
  <Pause length="1"/>
  <Gather numDigits="1" timeout="10" action="${ivrMenuUrl}" method="POST">
    <Say voice="Polly.Joanna" language="en-US">To speak with the next available agent, press 0. To reach a specific agent by extension, press 1.</Say>
    <Pause length="1"/>
    <Say voice="Polly.Lupe" language="es-US">Para hablar con el próximo agente disponible, oprima 0. Para comunicarse con un agente específico por extensión, oprima 1.</Say>
  </Gather>
  <Redirect method="POST">${roundRobinUrl}</Redirect>
</Response>`;

      console.log('[INBOUND] Playing IVR menu for caller:', from);
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: IVR-MENU (handle digit 0 or 1) ====================
    if (stage === 'ivr-menu') {
      console.log('[INBOUND] IVR menu digit:', digits);
      const resolvedSettingsUserId = await resolveSettingsUserId(supabase, settingsUserIdFromUrl ?? leadOwnerUserIdFromUrl ?? '');

      if (digits === '1') {
        // Go to directory
        const directoryUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=directory&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&settingsUserId=${resolvedSettingsUserId}`);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${directoryUrl}</Redirect>
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      // Digit 0 or anything else → round-robin
      const roundRobinUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=roundrobin&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&settingsUserId=${resolvedSettingsUserId}`);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${roundRobinUrl}</Redirect>
</Response>`;
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: DIRECTORY (list agents with extensions) ====================
    if (stage === 'directory') {
      console.log('[INBOUND] Building agent directory');
      const resolvedSettingsUserId = await resolveSettingsUserId(supabase, settingsUserIdFromUrl ?? leadOwnerUserIdFromUrl ?? '');
      const directory = await fetchAgentDirectory(supabase, leadOwnerUserIdFromUrl ?? '');

      if (directory.length === 0) {
        console.log('[INBOUND] No agents found for directory — going to round-robin');
        const roundRobinUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=roundrobin&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&settingsUserId=${resolvedSettingsUserId}`);
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">No agents are currently available in the directory. Please hold while we connect you.</Say>
  <Redirect method="POST">${roundRobinUrl}</Redirect>
</Response>`;
        return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
      }

      // Build directory listing TwiML
      const directoryLines = directory.map(a =>
        `For ${a.first_name} ${a.last_name}, press ${a.extension}.`
      ).join(' ');

      // Store directory mapping in URL params (extension -> user_id)
      const dirMap = directory.map(a => `${a.extension}:${a.user_id}`).join(',');
      const dialExtUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=dial-extension&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&settingsUserId=${resolvedSettingsUserId}&dirMap=${encodeURIComponent(dirMap)}`);
      const roundRobinUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=roundrobin&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&settingsUserId=${resolvedSettingsUserId}`);

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" timeout="15" action="${dialExtUrl}" method="POST">
    <Say voice="Polly.Joanna" language="en-US">${directoryLines} To repeat this menu, press star.</Say>
  </Gather>
  <Redirect method="POST">${roundRobinUrl}</Redirect>
</Response>`;

      console.log('[INBOUND] Directory with', directory.length, 'agents');
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: DIAL-EXTENSION (ring specific agent) ====================
    if (stage === 'dial-extension') {
      const dirMapStr = requestUrl.searchParams.get('dirMap') ?? '';
      console.log('[INBOUND] Dial-extension digit:', digits, 'dirMap:', dirMapStr);
      const resolvedSettingsUserId = await resolveSettingsUserId(supabase, settingsUserIdFromUrl ?? leadOwnerUserIdFromUrl ?? '');

      // If star pressed, replay directory
      if (digits === '*') {
        const directoryUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=directory&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&settingsUserId=${resolvedSettingsUserId}`);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Redirect method="POST">${directoryUrl}</Redirect></Response>`, {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      // Parse directory map
      const dirEntries = dirMapStr ? decodeURIComponent(dirMapStr).split(',') : [];
      const extMap = new Map<string, string>();
      for (const entry of dirEntries) {
        const [ext, userId] = entry.split(':');
        if (ext && userId) extMap.set(ext, userId);
      }

      const selectedUserId = digits ? extMap.get(digits) : null;

      if (!selectedUserId) {
        console.log('[INBOUND] Invalid extension — going to round-robin');
        const roundRobinUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=roundrobin&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&settingsUserId=${resolvedSettingsUserId}`);
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Invalid selection. Connecting you to the next available agent.</Say>
  <Redirect method="POST">${roundRobinUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      // Ring selected agent, fallback to round-robin if no answer
      const targets = await buildSingleAgentDialTargets(supabase, selectedUserId);
      const roundRobinUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=roundrobin&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&settingsUserId=${resolvedSettingsUserId}`);
      const statusCallbackUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadIdFromUrl}&userId=${resolvedSettingsUserId}`);

      if (targets.length === 0) {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">That agent is not available. Connecting you to the next available agent.</Say>
  <Redirect method="POST">${roundRobinUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Connecting you now. Please hold.</Say>
  <Dial callerId="${twilioPhone}" record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="30" action="${roundRobinUrl}" method="POST" statusCallback="${statusCallbackUrl}" statusCallbackEvent="completed" statusCallbackMethod="POST">
    ${targets.join('\n    ')}
  </Dial>
</Response>`;

      console.log('[INBOUND] Dialing extension agent:', selectedUserId);
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: ROUNDROBIN (ring all active agents) ====================
    if (stage === 'roundrobin') {
      console.log('[INBOUND] Round-robin stage, dialCallStatus:', dialCallStatus);

      // If a previous dial completed successfully, hang up
      if (dialCallStatus === 'completed' || dialCallStatus === 'answered') {
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>', {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      const resolvedSettingsUserId = await resolveSettingsUserId(supabase, settingsUserIdFromUrl ?? leadOwnerUserIdFromUrl ?? '');
      const fallbackStageUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/inbound-call-webhook?stage=fallback&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&settingsUserId=${resolvedSettingsUserId}`);
      const statusCallbackUrl = escapeXmlAttr(`${supabaseUrl}/functions/v1/call-status-callback?leadId=${leadIdFromUrl}&userId=${resolvedSettingsUserId}`);

      const dialTargets = await buildAllAgentDialTargets(supabase, leadOwnerUserIdFromUrl ?? '');

      if (dialTargets.length === 0) {
        console.log('[INBOUND] No dial targets — going to fallback');
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${fallbackStageUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Please hold while we connect you to the next available agent.</Say>
  <Dial callerId="${twilioPhone}" record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="30" action="${fallbackStageUrl}" method="POST" statusCallback="${statusCallbackUrl}" statusCallbackEvent="completed" statusCallbackMethod="POST">
    ${dialTargets.join('\n    ')}
  </Dial>
</Response>`;

      console.log('[INBOUND] Round-robin dialing', dialTargets.length, 'targets');
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: FALLBACK ====================
    if (stage === 'fallback') {
      if (!leadId || !leadOwnerUserId) {
        const { data: existingLead } = await supabase
          .from('leads').select('id, user_id').eq('phone', from).maybeSingle();
        leadId = leadId ?? existingLead?.id ?? null;
        leadOwnerUserId = leadOwnerUserId ?? existingLead?.user_id ?? null;
      }

      if (dialCallStatus === 'completed' || dialCallStatus === 'answered') {
        console.log('[INBOUND] Agent answered — no voicemail needed');
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>', {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      console.log('[INBOUND] Fallback stage, dialCallStatus:', dialCallStatus);

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

    // ==================== STAGE: VOICEMAIL ====================
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
    console.error('[INBOUND] FATAL ERROR:', error);
    // MUST return 200 with valid TwiML — Twilio shows "application error" on non-200
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${GREETING_TWIML}
  <Say voice="Polly.Joanna" language="en-US">We are experiencing a temporary issue. Please call back shortly.</Say>
  <Say voice="Polly.Lupe" language="es-US">Estamos experimentando un problema temporal. Por favor llame de nuevo.</Say>
</Response>`, { headers: { 'Content-Type': 'text/xml' }, status: 200 });
  }
});
