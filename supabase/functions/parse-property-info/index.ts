import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a property data extraction assistant. Extract property information from the user's text and return it using the extract_property_data function. Extract as many fields as you can find. For fields not mentioned, use null. For numeric fields, extract just the number (no $ or commas). For market_status use "on_market" or "off_market". For finance_type use values like "Conventional", "FHA", "VA", "Cash", "Owner Finance". For property_type use "Single Family", "Multi Family", "Condo", "Townhouse", "Land", or "Commercial". For category use "Residential", "Commercial", "Wholesale", "Off-Market", "Investment", or "Luxury". For status use "available", "pending", "sold", "coming_soon", or "under_contract". For transaction_type use "sale", "lease", "rent_to_own", "owner_finance", or "cash".`
          },
          { role: "user", content: text }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_property_data",
              description: "Extract structured property data from text",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Property address" },
                  sku: { type: "string", description: "Property ID or MLS number" },
                  description: { type: "string", description: "Property description" },
                  price: { type: "number", description: "Listing price" },
                  bedrooms: { type: "integer", description: "Number of bedrooms" },
                  bathrooms: { type: "number", description: "Number of bathrooms" },
                  sqft: { type: "integer", description: "Square footage" },
                  property_type: { type: "string", description: "Property type" },
                  category: { type: "string", description: "Property category" },
                  status: { type: "string", description: "Property status" },
                  market_status: { type: "string", description: "on_market or off_market" },
                  finance_type: { type: "string", description: "Finance type" },
                  transaction_type: { type: "string", description: "Transaction type" },
                  arv: { type: "number", description: "After repair value" },
                  payment: { type: "number", description: "Monthly payment" },
                  interest_rate: { type: "number", description: "Interest rate percentage" },
                  down_payment: { type: "number", description: "Down payment amount" },
                  commission: { type: "number", description: "Commission amount" },
                  is_wholesale: { type: "boolean", description: "Is wholesale property" },
                },
                required: [],
                additionalProperties: false,
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_property_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Could not parse property information" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-property-info error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
