import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Bed, Bath, Maximize, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Property {
  id: string;
  name: string;
  property_address?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  property_type?: string;
  photo_url?: string;
  photo_urls?: string[];
  arv?: number;
  category?: string;
  description?: string;
}

interface OrganizationBranding {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  public_page_title: string;
  public_page_description: string;
  contact_email: string;
  contact_phone: string;
}

export default function PublicProperties() {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("org");
  const [properties, setProperties] = useState<Property[]>([]);
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    if (orgId) {
      fetchData();
    }
  }, [orgId]);

  const fetchData = async () => {
    try {
      // Fetch organization branding
      const { data: brandingData, error: brandingError } = await supabase
        .from("organization_branding")
        .select("*")
        .eq("organization_id", orgId)
        .single();

      if (brandingError) console.error("Error fetching branding:", brandingError);
      else setBranding(brandingData);

      // Fetch public properties for this organization
      const { data: orgProfiles } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("organization_id", orgId);

      const userIds = orgProfiles?.map(p => p.user_id) || [];

      const { data: propertiesData, error: propertiesError } = await supabase
        .from("inventory")
        .select("*")
        .in("user_id", userIds)
        .eq("show_on_public_page", true)
        .eq("public_approval_status", "approved")
        .order("created_at", { ascending: false });

      if (propertiesError) throw propertiesError;
      setProperties((propertiesData as any) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch = 
      property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || property.category === categoryFilter;
    const matchesType = propertyTypeFilter === "all" || property.property_type === propertyTypeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

  const categories = Array.from(new Set(properties.map(p => p.category).filter(Boolean)));
  const propertyTypes = Array.from(new Set(properties.map(p => p.property_type).filter(Boolean)));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Invalid organization ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Search and Filters */}
      <div className="border-b py-6 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address, name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {propertyTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="container mx-auto px-4 py-8">
        {filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No properties found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card 
                key={property.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => window.location.href = `/public-property/${property.id}?org=${orgId}`}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={property.photo_url || property.photo_urls?.[0] || "/placeholder.svg"}
                    alt={property.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {property.category && (
                    <Badge 
                      className="absolute top-2 left-2"
                      style={{ backgroundColor: branding?.primary_color }}
                    >
                      {property.category}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-1">{property.name}</h3>
                  {property.property_address && (
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {property.property_address}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    {property.bedrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        {property.bedrooms}
                      </span>
                    )}
                    {property.bathrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        {property.bathrooms}
                      </span>
                    )}
                    {property.sqft > 0 && (
                      <span className="flex items-center gap-1">
                        <Maximize className="h-4 w-4" />
                        {property.sqft.toLocaleString()} sq ft
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold" style={{ color: branding?.primary_color }}>
                      ${property.price?.toLocaleString()}
                    </span>
                    <Button 
                      size="sm"
                      style={{ backgroundColor: branding?.primary_color }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}