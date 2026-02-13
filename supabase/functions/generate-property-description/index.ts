import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { propertyData } = await req.json();
    if (!propertyData) {
      return new Response(JSON.stringify({ error: "Property data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const details = [];
    if (propertyData.name) details.push(`Address: ${propertyData.name}`);
    if (propertyData.property_type) details.push(`Type: ${propertyData.property_type}`);
    if (propertyData.bedrooms) details.push(`Bedrooms: ${propertyData.bedrooms}`);
    if (propertyData.bathrooms) details.push(`Bathrooms: ${propertyData.bathrooms}`);
    if (propertyData.sqft) details.push(`Sqft: ${propertyData.sqft}`);
    if (propertyData.price) details.push(`Price: $${propertyData.price.toLocaleString()}`);
    if (propertyData.category) details.push(`Category: ${propertyData.category}`);
    if (propertyData.market_status) details.push(`Market: ${propertyData.market_status}`);
    if (propertyData.finance_type) details.push(`Finance: ${propertyData.finance_type}`);
    if (propertyData.transaction_type) details.push(`Transaction: ${propertyData.transaction_type}`);
    if (propertyData.arv) details.push(`ARV: $${propertyData.arv.toLocaleString()}`);
    if (propertyData.is_wholesale) details.push("Wholesale property");

    const prompt = details.length > 0
      ? `Property details:\n${details.join("\n")}`
      : "No specific details provided. Write a generic real estate listing description.";

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
            content: `You are a professional real estate listing copywriter. Write a compelling, concise property description (2-4 sentences) based on the provided property details. Focus on key selling points, location appeal, and features. Use professional real estate language. Do NOT include the price or address in the description—those are shown separately. Do NOT use markdown formatting. Just return the plain text description.`
          },
          { role: "user", content: prompt }
        ],
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
    const description = data.choices?.[0]?.message?.content?.trim();

    if (!description) {
      return new Response(JSON.stringify({ error: "Could not generate description" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-property-description error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
