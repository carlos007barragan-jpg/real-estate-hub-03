import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetUrl } = await req.json();
    console.log("Syncing from Google Sheet:", sheetUrl);

    // Extract sheet ID from URL
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      throw new Error("Invalid Google Sheets URL");
    }
    const sheetId = sheetIdMatch[1];

    // Get CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    console.log("Fetching CSV from:", csvUrl);
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}. Make sure the sheet is publicly accessible.`);
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // Parse CSV header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log("CSV Headers:", headers);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Not authenticated");
    }

    let syncCount = 0;

    // Process each row (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      
      const rowData: any = {
        user_id: user.id,
        google_sheet_row_id: `${sheetId}_${i}`,
      };

      // Map columns (flexible mapping)
      headers.forEach((header, index) => {
        const value = values[index];
        if (!value) return;

        if (header.includes('name') || header.includes('item')) {
          rowData.name = value;
        } else if (header.includes('description') || header.includes('desc')) {
          rowData.description = value;
        } else if (header.includes('quantity') || header.includes('qty')) {
          rowData.quantity = parseInt(value) || 0;
        } else if (header.includes('price') || header.includes('cost')) {
          rowData.price = parseFloat(value.replace(/[$,]/g, '')) || 0;
        } else if (header.includes('category') || header.includes('type')) {
          rowData.category = value;
        } else if (header.includes('sku') || header.includes('code')) {
          rowData.sku = value;
        }
      });

      // Only insert if we have at least a name
      if (rowData.name) {
        // Check if this row already exists
        const { data: existing } = await supabase
          .from('inventory')
          .select('id')
          .eq('google_sheet_row_id', rowData.google_sheet_row_id)
          .single();

        if (existing) {
          // Update existing item
          const { error } = await supabase
            .from('inventory')
            .update(rowData)
            .eq('id', existing.id);

          if (error) {
            console.error("Error updating row:", error);
          } else {
            syncCount++;
          }
        } else {
          // Insert new item
          const { error } = await supabase
            .from('inventory')
            .insert(rowData);

          if (error) {
            console.error("Error inserting row:", error);
          } else {
            syncCount++;
          }
        }
      }
    }

    console.log(`Successfully synced ${syncCount} items`);

    return new Response(
      JSON.stringify({ 
        success: true,
        count: syncCount,
        message: `Synced ${syncCount} items from Google Sheets`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-google-sheets function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Make sure the Google Sheet is publicly accessible and has the correct format"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});