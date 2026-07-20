import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SECRET_KEY = 'rl-migrate-7017-x9';
const BUCKET = 'lead-documents';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: jsonHeaders });
  }

  const url = new URL(req.url);
  if (url.searchParams.get('key') !== SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: jsonHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const rows: any[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('documents')
        .select('id, lead_id, file_name, file_path, mime_type, file_size, uploaded_at')
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`documents: ${error.message}`);
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const docs = await Promise.all(rows.map(async (r) => {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(r.file_path, 3600);
        if (error || !data?.signedUrl) {
          return { ...r, signed_url: null, error: error?.message ?? 'no signed url' };
        }
        return { ...r, signed_url: data.signedUrl };
      } catch (e) {
        return { ...r, signed_url: null, error: e instanceof Error ? e.message : 'unknown' };
      }
    }));

    return new Response(JSON.stringify({ docs }), { headers: jsonHeaders, status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[doc-urls] error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders });
  }
});
