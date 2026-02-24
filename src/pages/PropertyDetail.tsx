import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { ArrowLeft, MapPin, Home, DollarSign, TrendingUp, Calendar, Building2, ChevronLeft, ChevronRight } from "lucide-react";

interface PropertyDetail {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number | null;
  category: string | null;
  sku: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  payment: number | null;
  interest_rate: number | null;
  market_status: string | null;
  transaction_type: string | null;
  finance_type: string | null;
  is_wholesale: boolean;
  arv: number | null;
  status: string | null;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  commission: number | null;
  property_type: string | null;
  seller_id: string | null;
  down_payment: number | null;
  created_at: string;
  updated_at: string;
}

interface Seller {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, role } = useUserRole();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Memoize photos array to prevent unnecessary recalculations
  const photos = useMemo(() => {
    if (!property) return [];
    
    if (property.photo_urls && Array.isArray(property.photo_urls)) {
      return property.photo_urls;
    }
    
    if (property.photo_url) {
      return [property.photo_url];
    }
    
    return [];
  }, [property?.photo_urls, property?.photo_url]);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  // Reset photo index when property changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [property?.id]);

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      const propertyData = data as any;
      setProperty(propertyData);

      // Fetch seller if exists
      if (propertyData.seller_id) {
        const { data: sellerData, error: sellerError } = await supabase
          .from("sellers" as any)
          .select("*")
          .eq("id", propertyData.seller_id)
          .single();

        if (!sellerError && sellerData) {
          setSeller(sellerData as any);
        }
      }
    } catch (error) {
      console.error("Error fetching property:", error);
      toast({
        title: "Error",
        description: "Failed to fetch property details",
        variant: "destructive",
      });
      navigate("/inventory");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "available": return "default";
      case "pending": return "secondary";
      case "sold": return "destructive";
      case "coming_soon": return "outline";
      default: return "default";
    }
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Property not found</h2>
          <Button onClick={() => navigate("/inventory")} className="mt-4">
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/inventory")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{property.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{property.sku || "Property ID not set"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={getStatusBadgeVariant(property.status)} className="text-sm">
            {property.status?.replace('_', ' ').toUpperCase() || 'AVAILABLE'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Photos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Gallery */}
          <Card className="overflow-hidden">
            <div className="relative aspect-video bg-muted">
              {photos.length > 0 ? (
                <>
                  <img
                    key={`photo-${currentPhotoIndex}-${photos[currentPhotoIndex]}`}
                    src={photos[currentPhotoIndex]}
                    alt={`${property.name} - Photo ${currentPhotoIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={prevPhoto}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={nextPhoto}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                        {currentPhotoIndex + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Property Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {property.description || "No description available for this property."}
              </p>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.bedrooms > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Bedrooms</div>
                    <div className="text-2xl font-bold">{property.bedrooms}</div>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Bathrooms</div>
                    <div className="text-2xl font-bold">{property.bathrooms}</div>
                  </div>
                )}
                {property.sqft > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Square Feet</div>
                    <div className="text-2xl font-bold">{property.sqft.toLocaleString()}</div>
                  </div>
                )}
                {property.quantity > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Units</div>
                    <div className="text-2xl font-bold">{property.quantity}</div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {property.property_type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property Type:</span>
                    <span className="font-medium">{property.property_type}</span>
                  </div>
                )}
                {property.transaction_type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deal Strategy:</span>
                    <span className="font-medium capitalize">{property.transaction_type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {property.market_status && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Status:</span>
                    <span className="font-medium capitalize">{property.market_status.replace(/_/g, ' ')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          {(property.payment || property.interest_rate) && (
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {property.payment > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Monthly Payment</span>
                    <span className="text-lg font-semibold">${property.payment.toLocaleString()}</span>
                  </div>
                )}
                {property.interest_rate > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Interest Rate</span>
                    <span className="text-lg font-semibold">{property.interest_rate}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Pricing & Info */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Listing Price</div>
                <div className="text-3xl font-bold text-primary">
                  ${property.price?.toLocaleString() || '0'}
                </div>
              </div>

              {property.arv > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      After Repair Value (ARV)
                    </div>
                    <div className="text-2xl font-bold">
                      ${property.arv.toLocaleString()}
                    </div>
                  </div>
                </>
              )}

              {role === 'supreme_admin' && property.commission > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Commission (Supreme Admin Only)</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${property.commission.toLocaleString()}
                    </div>
                  </div>
                </>
              )}

              {property.transaction_type === 'owner_finance' && property.down_payment > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Down Payment</div>
                    <div className="text-2xl font-bold">
                      ${property.down_payment.toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Seller Information */}
          {seller && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Seller Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium">{seller.name}</div>
                </div>
                {seller.company && (
                  <div>
                    <div className="text-sm text-muted-foreground">Company</div>
                    <div className="font-medium">{seller.company}</div>
                  </div>
                )}
                {seller.email && (
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{seller.email}</div>
                  </div>
                )}
                {seller.phone && (
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{seller.phone}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Property Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property ID</span>
                <span className="font-medium">{property.sku || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Listed</span>
                <span className="font-medium">
                  {new Date(property.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">
                  {new Date(property.updated_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
