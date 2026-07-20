import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SECRET_KEY = 'rl-migrate-7017-x9';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TABLES = [
  'leads',
  'notes',
  'documents',
  'appointments',
  'lead_deals',
  'inventory',
  'commission_entries',
  'contacts',
  'profiles',
  'pipelines',
  'follow_ups',
  'sellers',
  'property_inquiries',
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: jsonHeaders });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (key !== SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: jsonHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const result: Record<string, unknown> = {};

    for (const table of TABLES) {
      const rows: any[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(from, from + pageSize - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      result[table] = rows;
    }

    // call_summaries aggregate
    const callRows: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('call_logs')
        .select('lead_id, created_at')
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`call_logs: ${error.message}`);
      if (!data || data.length === 0) break;
      callRows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const summaryMap = new Map<string, { lead_id: string; calls: number; last_call: string | null }>();
    for (const r of callRows) {
      if (!r.lead_id) continue;
      const existing = summaryMap.get(r.lead_id);
      if (!existing) {
        summaryMap.set(r.lead_id, { lead_id: r.lead_id, calls: 1, last_call: r.created_at });
      } else {
        existing.calls += 1;
        if (r.created_at && (!existing.last_call || r.created_at > existing.last_call)) {
          existing.last_call = r.created_at;
        }
      }
    }
    result.call_summaries = Array.from(summaryMap.values());

    return new Response(JSON.stringify(result), { headers: jsonHeaders, status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[full-export] error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders });
  }
});
