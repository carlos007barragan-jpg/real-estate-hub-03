// Handles inbound calls to the CRM - IVR directory, direct extension, and queue

const SUPABASE_JS_URL = 'https://esm.sh/@supabase/supabase-js@2.39.3';
let supabaseModulePromise: Promise<any> | null = null;

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

function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.startsWith('+')) return phone;
  return `+${digits}`;
}

const VOICEMAIL_TWIML = `
  <Say voice="Polly.Joanna" language="en-US">We're sorry we missed your call. Please leave a message and a Real Living agent will call you back.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Lupe" language="es-US">Lo sentimos, deje un mensaje y un agente le devolverá la llamada.</Say>`;

const FALLBACK_TWIML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling Real Living. Please hold while we connect you.</Say>
</Response>`;

function xmlResponse(twiml: string, status = 200): Response {
  return new Response(twiml, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/xml',
    },
  });
}

function fallbackResponse(error: unknown, context = 'FATAL ERROR'): Response {
  console.error(`[INBOUND] ${context}:`, error);
  return xmlResponse(FALLBACK_TWIML, 200);
}

async function getCreateClient() {
  if (!supabaseModulePromise) {
    supabaseModulePromise = import(SUPABASE_JS_URL);
  }

  const mod = await supabaseModulePromise;
  if (!mod?.createClient) {
    throw new Error('Failed to load Supabase client module');
  }

  return mod.createClient as (url: string, key: string) => any;
}

// ==================== HELPER FUNCTIONS ====================

function isExcluded(profile: any, roleMap: Map<string, string>): boolean {
  const role = roleMap.get(profile.user_id);
  if (role === 'marketing' || role === 'marketing_manager') return true;
  const emailLower = (profile.email || '').toLowerCase();
  if (emailLower.includes('bond') || emailLower.includes('ceotech')) return true;
  if (profile.first_name === 'HEHE' || emailLower.includes('test')) return true;
  return false;
}

async function getOrgProfilesWithRoles(supabase: any, orgId: string | null) {
  if (!orgId) return { profiles: [], roleMap: new Map<string, string>() };

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, phone_number, email, first_name, last_name, extension')
    .eq('organization_id', orgId)
    .not('extension', 'is', null);

  if (error || !profiles?.length) return { profiles: [], roleMap: new Map<string, string>() };

  const userIds = profiles.map((p: any) => p.user_id);
  const { data: roles } = await supabase
    .from('user_roles').select('user_id, role').in('user_id', userIds);
  const roleMap = new Map<string, string>((roles ?? []).map((r: any) => [r.user_id, r.role]));

  return { profiles, roleMap };
}

async function buildSingleAgentDialTargets(supabase: any, agentUserId: string): Promise<string[]> {
  const targets: string[] = [];

  const { data: profileRec } = await supabase
    .from('profiles').select('phone_number, email')
    .eq('user_id', agentUserId).maybeSingle();

  if (profileRec?.phone_number) {
    targets.push(`<Number>${formatE164(profileRec.phone_number)}</Number>`);
  }
  if (profileRec?.email) {
    targets.push(`<Client><Identity>${sanitizeIdentity(profileRec.email)}</Identity></Client>`);
  }

  return targets;
}

interface AgentDirectoryEntry {
  user_id: string;
  first_name: string;
  last_name: string;
  extension: number;
}

async function fetchDirectoryAgents(supabase: any, orgId: string): Promise<AgentDirectoryEntry[]> {
  const { profiles, roleMap } = await getOrgProfilesWithRoles(supabase, orgId);
  const eligible = profiles
    .filter((p: any) => !isExcluded(p, roleMap))
    .sort((a: any, b: any) => (a.extension || 0) - (b.extension || 0));

  return eligible.map((p: any) => ({
    user_id: p.user_id,
    first_name: p.first_name || 'Agent',
    last_name: p.last_name || '',
    extension: p.extension,
  }));
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const requestUrl = new URL(req.url);
    const stage = requestUrl.searchParams.get('stage') ?? 'greeting';
    const leadIdFromUrl = requestUrl.searchParams.get('leadId');
    const leadOwnerUserIdFromUrl = requestUrl.searchParams.get('leadOwnerUserId');
    const orgIdFromUrl = requestUrl.searchParams.get('orgId');

    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    console.log('[INBOUND] Stage:', stage, 'Params:', JSON.stringify(params));

    const from = params['From'];
    const to = params['To'];
    const callSid = params['CallSid'];
    const dialCallStatus = params['DialCallStatus'];
    const digits = params['Digits'];

    if (!from || from.length === 0 || from.length > 20) {
      return fallbackResponse(new Error('Invalid or missing From parameter'), 'REQUEST VALIDATION');
    }
    if (!to || to.length === 0 || to.length > 20) {
      return fallbackResponse(new Error('Invalid or missing To parameter'), 'REQUEST VALIDATION');
    }
    if (!callSid || callSid.length > 50) {
      return fallbackResponse(new Error('Invalid or missing CallSid parameter'), 'REQUEST VALIDATION');
    }

    const createClient = await getCreateClient();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const recordingCallbackUrl = `${supabaseUrl}/functions/v1/recording-callback`;
    const recordingCallbackUrlEsc = escapeXmlAttr(recordingCallbackUrl);
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER') || to;

    // Resolve organization from CRM settings or fallback
    let orgId: string | null = orgIdFromUrl;
    let orgUserIds: string[] = [];

    if (!orgId) {
      try {
        const { data: allCrmSettings } = await supabase
          .from('crm_settings')
          .select('user_id');
        if (allCrmSettings?.length) {
          for (const s of allCrmSettings) {
            const { data: profile } = await supabase
              .from('profiles').select('organization_id').eq('user_id', s.user_id).maybeSingle();
            if (profile?.organization_id) {
              orgId = profile.organization_id;
              break;
            }
          }
        }
      } catch (e) { console.error('[INBOUND] Error fetching crm_settings:', e); }
    }

    if (!orgId) {
      try {
        const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
        orgId = firstOrg?.id ?? null;
      } catch (e) { console.error('[INBOUND] Error fetching fallback org:', e); }
    }

    if (orgId) {
      try {
        const { data: orgProfiles } = await supabase
          .from('profiles').select('user_id').eq('organization_id', orgId);
        orgUserIds = (orgProfiles ?? []).map((p: any) => p.user_id).filter(Boolean);
      } catch (e) { console.error('[INBOUND] Error fetching org profiles:', e); }
    }

    console.log('[INBOUND] Resolved org:', orgId, 'orgUserIds:', orgUserIds.length);

    const stageUrl = (s: string, extra = '') =>
      `${supabaseUrl}/functions/v1/inbound-call-webhook?stage=${s}&leadId=${leadIdFromUrl}&leadOwnerUserId=${leadOwnerUserIdFromUrl}&orgId=${orgId}${extra}`;

    // ==================== STAGE: GREETING (initial entry) ====================
    if (stage === 'greeting') {
      const normalizedFrom = normalizePhone(from);
      console.log('[INBOUND] Looking up caller:', from, 'normalized:', normalizedFrom);

      // Look up caller in leads
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

      let leadId = matchedLead?.id ?? null;
      let leadOwnerUserId = matchedLead?.user_id ?? null;

      // Update existing lead
      if (matchedLead) {
        await supabase.from('leads').update({
          last_inbound_at: new Date().toISOString(),
          source_call_sid: callSid,
          is_inbound_call: true,
        }).eq('id', matchedLead.id);

        const { error: existingLeadNoteError } = await supabase.from('notes').insert({
          lead_id: matchedLead.id, user_id: matchedLead.user_id,
          content: `📞 Inbound call from ${from}. ${matchedLead.assigned_to && matchedLead.assigned_to !== 'unassigned' ? `Returning client — assigned to ${matchedLead.assigned_to}.` : 'No assigned agent.'}`,
          author: 'System', note_type: 'system',
        });

        if (existingLeadNoteError) {
          console.error('[INBOUND] Existing lead note insert error:', JSON.stringify(existingLeadNoteError));
        }
      }

      // Create new lead if none found
      if (!leadId) {
        try {
          console.log('[INBOUND] No existing lead found. Creating new lead for:', from);

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

              const { error: newLeadNoteError } = await supabase.from('notes').insert({
                lead_id: leadId, user_id: leadOwnerUserId,
                content: `📞 New inbound call from ${from}. Unknown caller — new lead created automatically.`,
                author: 'System', note_type: 'system',
              });

              if (newLeadNoteError) {
                console.error('[INBOUND] New lead note insert error:', JSON.stringify(newLeadNoteError));
              }

              // Notify org members
              try {
                if (orgId) {
                  const { data: orgMembers } = await supabase
                    .from('profiles').select('user_id').eq('organization_id', orgId);
                  if (orgMembers?.length) {
                    const notifications = orgMembers.map(m => ({
                      user_id: m.user_id, organization_id: orgId, type: 'lead_created',
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
          }
        } catch (e) {
          console.error('[INBOUND] Lead creation failed (non-fatal):', e);
        }
      }

      // Create call_log record
      try {
        const { data: existingLog } = await supabase
          .from('call_logs').select('id').eq('call_sid', callSid).maybeSingle();
        if (!existingLog && leadId) {
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
              from_number: from, to_number: to, status: 'queued',
              direction: 'inbound', answered_by: 'CRM System',
            });
            if (clErr) console.error('[INBOUND] call_log insert error:', JSON.stringify(clErr));
            else console.log('[INBOUND] ✅ call_log created for caller:', from);
          }
        }
      } catch (e) { console.error('[INBOUND] Call log insert error (non-fatal):', e); }

      // Check if caller has an assigned agent → route directly (smart routing)
      const smartRoutingEnabled = true; // default
      try {
        const { data: settings } = await supabase
          .from('crm_settings').select('smart_routing_enabled').limit(1).maybeSingle();
        if (settings !== null && settings.smart_routing_enabled === false) {
          // Smart routing disabled — go to IVR
        } else if (matchedLead?.assigned_to && matchedLead.assigned_to !== 'unassigned' && matchedLead.assigned_to !== 'discarded') {
          // Route to assigned agent directly
          const agentName = matchedLead.assigned_to;
          const { data: allProfiles } = await supabase
            .from('profiles').select('user_id, first_name, last_name').limit(200);
          const agentMatch = allProfiles?.find((p: any) =>
            `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase() === agentName.toLowerCase()
          );

          if (agentMatch) {
            console.log('[INBOUND] Smart routing to assigned agent:', agentName);
            const targets = await buildSingleAgentDialTargets(supabase, agentMatch.user_id);
            const queueFallbackUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));

            if (targets.length > 0) {
              const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Thank you for calling Real Living. We're connecting you to your agent now.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Lupe" language="es-US">Gracias por llamar a Real Living. Lo estamos conectando con su agente.</Say>
  <Dial callerId="${twilioPhone}" record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="30" action="${queueFallbackUrl}" method="POST">
    ${targets.join('\n    ')}
  </Dial>
</Response>`;
              return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
            }
          }
        }
      } catch (e) { console.error('[INBOUND] Smart routing check error:', e); }

      // Play IVR greeting + gather
      const ivrActionUrl = escapeXmlAttr(stageUrl('ivr-input', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
      const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" numDigits="1" timeout="5" action="${ivrActionUrl}" method="POST">
    <Say voice="Polly.Joanna" language="en-US">Thank you for calling Real Living. Para Español, oprima dos. If you know your party's extension, you may dial it at any time. For a company directory, press 3.</Say>
    <Pause length="1"/>
    <Say voice="Polly.Lupe" language="es-US">Gracias por llamar a Real Living. Para Español, oprima dos. Si conoce la extensión de su agente, puede marcarla en cualquier momento. Para un directorio de la compañía, oprima tres.</Say>
  </Gather>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`;

      console.log('[INBOUND] Playing IVR greeting for caller:', from);
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: IVR-INPUT (handle digit press) ====================
    if (stage === 'ivr-input') {
      console.log('[INBOUND] IVR input digit:', digits);
      const leadId = leadIdFromUrl;
      const leadOwnerUserId = leadOwnerUserIdFromUrl;

      if (digits === '3') {
        // Go to directory
        const directoryUrl = escapeXmlAttr(stageUrl('directory', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${directoryUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      if (digits === '2') {
        // Spanish — replay greeting in Spanish then gather extension
        const ivrActionUrl = escapeXmlAttr(stageUrl('ivr-input', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
        const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" numDigits="1" timeout="5" action="${ivrActionUrl}" method="POST">
    <Say voice="Polly.Lupe" language="es-US">Gracias por llamar a Real Living. Si conoce la extensión de su agente, puede marcarla ahora. Para un directorio de la compañía, oprima tres.</Say>
  </Gather>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      // Any other digit (1-9) → treat as extension number
      if (digits && /^[1-9]$/.test(digits)) {
        const dialExtUrl = escapeXmlAttr(stageUrl('dial-extension', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}&ext=${digits}`));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${dialExtUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      // Default: go to queue
      const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: DIRECTORY (list agents with extensions) ====================
    if (stage === 'directory') {
      console.log('[INBOUND] Building agent directory');
      const leadId = leadIdFromUrl;
      const leadOwnerUserId = leadOwnerUserIdFromUrl;
      const resolvedOrgId = orgIdFromUrl ?? orgId;

      if (!resolvedOrgId) {
        const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">The directory is not available. Please hold.</Say>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      const directory = await fetchDirectoryAgents(supabase, resolvedOrgId);

      if (directory.length === 0) {
        const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">No agents are currently available in the directory. Please hold.</Say>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      const directoryLines = directory.map(a =>
        `For ${a.first_name} ${a.last_name}, press ${a.extension}.`
      ).join(' ');

      const dirMap = directory.map(a => `${a.extension}:${a.user_id}`).join(',');
      const dialExtUrl = escapeXmlAttr(stageUrl('dial-extension-from-dir', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}&dirMap=${encodeURIComponent(dirMap)}`));
      const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" timeout="10" action="${dialExtUrl}" method="POST">
    <Say voice="Polly.Joanna" language="en-US">${directoryLines} To repeat this menu, press star.</Say>
  </Gather>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`;

      console.log('[INBOUND] Directory with', directory.length, 'agents');
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: DIAL-EXTENSION (direct extension from IVR) ====================
    if (stage === 'dial-extension') {
      const ext = requestUrl.searchParams.get('ext');
      const leadId = leadIdFromUrl;
      const leadOwnerUserId = leadOwnerUserIdFromUrl;
      const resolvedOrgId = orgIdFromUrl ?? orgId;

      console.log('[INBOUND] Direct extension dial, ext:', ext);

      if (!ext || !resolvedOrgId) {
        const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Invalid extension. Please hold while we connect you.</Say>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      // Look up extension in profiles
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('organization_id', resolvedOrgId)
        .eq('extension', parseInt(ext))
        .maybeSingle();

      if (!agentProfile) {
        const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">That extension is not recognized. Please hold while we connect you.</Say>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      const targets = await buildSingleAgentDialTargets(supabase, agentProfile.user_id);
      const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));

      if (targets.length === 0) {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">That agent is not available. Please hold.</Say>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Connecting you to ${agentProfile.first_name} ${agentProfile.last_name}. Please hold.</Say>
  <Dial callerId="${twilioPhone}" record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="30" action="${queueUrl}" method="POST">
    ${targets.join('\n    ')}
  </Dial>
</Response>`;

      console.log('[INBOUND] Dialing extension', ext, '→', agentProfile.first_name, agentProfile.last_name);
      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: DIAL-EXTENSION-FROM-DIR (from directory listing) ====================
    if (stage === 'dial-extension-from-dir') {
      const dirMapStr = requestUrl.searchParams.get('dirMap') ?? '';
      const leadId = leadIdFromUrl;
      const leadOwnerUserId = leadOwnerUserIdFromUrl;

      console.log('[INBOUND] Directory selection, digit:', digits);

      if (digits === '*') {
        const directoryUrl = escapeXmlAttr(stageUrl('directory', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Redirect method="POST">${directoryUrl}</Redirect></Response>`, {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      const dirEntries = dirMapStr ? decodeURIComponent(dirMapStr).split(',') : [];
      const extMap = new Map<string, string>();
      for (const entry of dirEntries) {
        const [ext, userId] = entry.split(':');
        if (ext && userId) extMap.set(ext, userId);
      }

      const selectedUserId = digits ? extMap.get(digits) : null;
      const queueUrl = escapeXmlAttr(stageUrl('queue', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));

      if (!selectedUserId) {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Invalid selection. Please hold.</Say>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      const targets = await buildSingleAgentDialTargets(supabase, selectedUserId);

      if (targets.length === 0) {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">That agent is not available. Please hold.</Say>
  <Redirect method="POST">${queueUrl}</Redirect>
</Response>`, { headers: { 'Content-Type': 'text/xml' } });
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Connecting you now. Please hold.</Say>
  <Dial callerId="${twilioPhone}" record="record-from-answer" recordingStatusCallback="${recordingCallbackUrlEsc}" recordingStatusCallbackMethod="POST" timeout="30" action="${queueUrl}" method="POST">
    ${targets.join('\n    ')}
  </Dial>
</Response>`;

      return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ==================== STAGE: QUEUE (hold caller in Twilio queue) ====================
    if (stage === 'queue') {
      const leadId = requestUrl.searchParams.get('leadId') ?? leadIdFromUrl;
      const leadOwnerUserId = requestUrl.searchParams.get('leadOwnerUserId') ?? leadOwnerUserIdFromUrl;

      // If a previous Dial completed successfully, just hang up
      if (dialCallStatus === 'completed' || dialCallStatus === 'answered') {
        // Update call_log status
        try {
          await supabase.from('call_logs').update({ status: 'completed' }).eq('call_sid', callSid);
        } catch (e) { console.error('[INBOUND] Error updating call_log:', e); }
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup /></Response>', {
          headers: { 'Content-Type': 'text/xml' },
        });
      }

      // If we got here from a failed Dial, update call_log to reflect no-answer
      if (dialCallStatus && dialCallStatus !== 'completed' && dialCallStatus !== 'answered') {
        try {
          await supabase.from('call_logs').update({ status: 'no-answer' }).eq('call_sid', callSid);
        } catch (e) { console.error('[INBOUND] Error updating call_log:', e); }
      }

      console.log('[INBOUND] Putting caller into queue, leadId:', leadId);

      // Update call_log to queued status
      try {
        await supabase.from('call_logs').update({ status: 'queued' }).eq('call_sid', callSid);
      } catch (e) { console.error('[INBOUND] Error updating call_log to queued:', e); }

      const voicemailUrl = escapeXmlAttr(stageUrl('voicemail', `&leadId=${leadId}&leadOwnerUserId=${leadOwnerUserId}`));

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">Please hold, an agent will be with you shortly.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Lupe" language="es-US">Por favor espere, un agente le atenderá en breve.</Say>
  <Enqueue waitUrl="/hold-music" waitUrlMethod="POST">inbound-queue</Enqueue>
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

      // Update call_log
      try {
        await supabase.from('call_logs').update({ status: 'no-answer' }).eq('call_sid', callSid);
      } catch (e) { console.error('[INBOUND] Error updating call_log:', e); }

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
    return fallbackResponse(error, 'FATAL ERROR');
  }
});
