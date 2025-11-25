import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Home, Bed, Bath, Maximize2, DollarSign, TrendingUp, Wrench } from "lucide-react";
import { toast } from "sonner";

interface Property {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  acquisition_price: number | null;
  arv: number | null;
  estimated_repairs: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  photo_urls?: any;
  property_type: string | null;
}

export default function DispoSheet() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('id');
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Property not found");
        return;
      }

      setProperty(data);
      
      // Extract photos - handle Json type from Supabase
      const photoUrls: string[] = [];
      if (Array.isArray(data.photo_urls)) {
        data.photo_urls.forEach((url) => {
          if (typeof url === 'string') {
            photoUrls.push(url);
          }
        });
      }
      setPhotos(photoUrls);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading property details...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Property not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Home className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">Wholesale Property</CardTitle>
            </div>
            <CardDescription>Investment Opportunity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photos Gallery */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Property photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}

            {/* Property Address */}
            <div>
              <h2 className="text-2xl font-bold mb-2">{property.name}</h2>
              <Badge>{property.property_type}</Badge>
            </div>

            <Separator />

            {/* Key Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="font-semibold">{property.bedrooms || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="font-semibold">{property.bathrooms || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Maximize2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Square Feet</p>
                  <p className="font-semibold">{property.sqft || 'N/A'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Financial Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Financial Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Asking Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">
                      ${property.price?.toLocaleString() || 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Acquisition Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      ${property.acquisition_price?.toLocaleString() || 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      ARV (After Repair Value)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      ${property.arv?.toLocaleString() || 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Estimated Repairs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      ${property.estimated_repairs?.toLocaleString() || 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {property.acquisition_price && property.arv && property.estimated_repairs && (
                <Card className="bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Potential Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      ${(property.arv - property.acquisition_price - property.estimated_repairs).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      ARV - Acquisition - Repairs = Potential Profit
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Description */}
            {property.description && (
              <div>
                <h3 className="text-xl font-semibold mb-2">Property Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{property.description}</p>
              </div>
            )}

            <Separator />

            {/* Contact Information */}
            <div className="bg-secondary/20 p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-2">Interested in this property?</h3>
              <p className="text-muted-foreground mb-4">
                Contact us today for more information and to schedule a viewing
              </p>
              <p className="font-semibold">Contact your real estate agent</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
