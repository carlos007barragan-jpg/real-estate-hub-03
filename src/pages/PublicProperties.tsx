import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bath, Bed, Home, MapPin, Ruler } from "lucide-react";

interface PublicProperty {
  property_id: string;
  address: string;
  city: string | null;
  state: string | null;
  price: number | null;
  terms: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  description: string | null;
  cover_photo_url: string | null;
  photos: string[];
  is_public: boolean;
  property_type: string | null;
  finance_type: string | null;
  market_status: string | null;
  status: string | null;
  category: string | null;
}

interface Branding {
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  public_page_title: string | null;
  public_page_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export default function PublicProperties() {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("org");
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setError("No organization specified.");
      setLoading(false);
      return;
    }
    fetchProperties();
  }, [orgId]);

  const fetchProperties = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("public-properties", {
        body: null,
        headers: { "Content-Type": "application/json" },
        method: "GET",
      });

      // Use fetch directly since we need query params
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/public-properties?organization_id=${orgId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!resp.ok) throw new Error("Failed to fetch properties");
      const result = await resp.json();

      const publicProps = (result.properties || []).filter((p: PublicProperty) => p.is_public);
      setProperties(publicProps);
      setBranding(result.branding || null);
    } catch (err: any) {
      console.error("Error fetching public properties:", err);
      setError("Failed to load properties.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Contact for Price";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
  };

  const primaryColor = branding?.primary_color || "#1a1a2e";
  const title = branding?.public_page_title || "Available Properties";
  const description = branding?.public_page_description || "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b" style={{ borderBottomColor: primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {branding?.logo_url && (
              <img src={branding.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {description && <p className="text-gray-600 mt-1">{description}</p>}
            </div>
          </div>
        </div>
      </header>

      {/* Properties Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {properties.length === 0 ? (
          <div className="text-center py-16">
            <Home className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">No properties available</h2>
            <p className="text-gray-500 mt-2">Check back soon for new listings.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <Card key={property.property_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gray-200 relative">
                  {property.cover_photo_url ? (
                    <img
                      src={property.cover_photo_url}
                      alt={property.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  {property.market_status && (
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      {property.market_status}
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                      {formatPrice(property.price)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">{property.address}</h3>
                  {(property.city || property.state) && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3" />
                      {[property.city, property.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {property.bedrooms != null && (
                      <span className="flex items-center gap-1"><Bed className="w-4 h-4" />{property.bedrooms} bd</span>
                    )}
                    {property.bathrooms != null && (
                      <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{property.bathrooms} ba</span>
                    )}
                    {property.sqft != null && (
                      <span className="flex items-center gap-1"><Ruler className="w-4 h-4" />{property.sqft.toLocaleString()} sqft</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {property.property_type && <Badge variant="outline">{property.property_type}</Badge>}
                    {property.finance_type && <Badge variant="outline">{property.finance_type}</Badge>}
                    {property.terms && <Badge variant="outline">{property.terms}</Badge>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Contact Footer */}
        {(branding?.contact_email || branding?.contact_phone) && (
          <div className="mt-12 text-center p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Interested? Get in touch</h3>
            <div className="flex justify-center gap-6 text-sm text-gray-600">
              {branding.contact_email && <a href={`mailto:${branding.contact_email}`} className="hover:underline">{branding.contact_email}</a>}
              {branding.contact_phone && <a href={`tel:${branding.contact_phone}`} className="hover:underline">{branding.contact_phone}</a>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
