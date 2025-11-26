import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bed, Bath, Maximize, MapPin, Calendar, Phone, Mail, ChevronLeft, ChevronRight } from "lucide-react";

export default function PublicPropertyDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get("org");
  const [property, setProperty] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredDate: "",
    message: "",
  });

  useEffect(() => {
    if (id && orgId) {
      fetchData();
    }
  }, [id, orgId]);

  const fetchData = async () => {
    try {
      const { data: brandingData } = await supabase
        .from("organization_branding")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      setBranding(brandingData);

      // First, verify the property belongs to this organization
      const { data: orgProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("organization_id", orgId);

      if (profilesError) throw profilesError;

      const userIds = orgProfiles?.map(p => p.user_id) || [];

      if (userIds.length === 0) {
        throw new Error("Organization not found");
      }

      // Fetch property with organization validation
      const { data: propertyData, error } = await supabase
        .from("inventory")
        .select("*, profiles!inventory_assigned_agent_id_fkey(first_name, last_name, phone_number, email)")
        .eq("id", id)
        .in("user_id", userIds)
        .eq("show_on_public_page", true)
        .eq("public_approval_status", "approved")
        .maybeSingle();

      if (error) throw error;
      
      if (!propertyData) {
        throw new Error("Property not found or not available");
      }

      setProperty(propertyData);
    } catch (error) {
      console.error("Error fetching property:", error);
      toast({
        title: "Error",
        description: "Property not found or not available",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('handle-property-inquiry', {
        body: {
          propertyId: id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          preferredDate: formData.preferredDate,
          message: formData.message,
          organizationId: orgId,
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: data.message || "Thank you! An agent will contact you shortly.",
      });

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        preferredDate: "",
        message: "",
      });
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      toast({
        title: "Error",
        description: "Failed to submit inquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Property not found</p>
      </div>
    );
  }

  const photos = property.photo_urls || (property.photo_url ? [property.photo_url] : []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b py-4">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = `/public-properties?org=${orgId}`}
          >
            ← Back to Properties
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery */}
            {photos.length > 0 && (
              <Card className="overflow-hidden">
                <div className="relative aspect-video bg-muted">
                  <img
                    src={photos[currentPhotoIndex]}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={() => setCurrentPhotoIndex((currentPhotoIndex - 1 + photos.length) % photos.length)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setCurrentPhotoIndex((currentPhotoIndex + 1) % photos.length)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {photos.map((_, idx) => (
                          <button
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              idx === currentPhotoIndex ? "bg-white" : "bg-white/50"
                            }`}
                            onClick={() => setCurrentPhotoIndex(idx)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Property Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{property.name}</CardTitle>
                    {property.property_address && (
                      <p className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {property.property_address}
                      </p>
                    )}
                  </div>
                  {property.category && (
                    <Badge style={{ backgroundColor: branding?.primary_color }}>
                      {property.category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6 text-lg">
                  {property.bedrooms > 0 && (
                    <span className="flex items-center gap-2">
                      <Bed className="h-5 w-5" />
                      {property.bedrooms} Beds
                    </span>
                  )}
                  {property.bathrooms > 0 && (
                    <span className="flex items-center gap-2">
                      <Bath className="h-5 w-5" />
                      {property.bathrooms} Baths
                    </span>
                  )}
                  {property.sqft > 0 && (
                    <span className="flex items-center gap-2">
                      <Maximize className="h-5 w-5" />
                      {property.sqft.toLocaleString()} sq ft
                    </span>
                  )}
                </div>

                <div className="text-4xl font-bold" style={{ color: branding?.primary_color }}>
                  ${property.price?.toLocaleString()}
                </div>

                {property.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{property.description}</p>
                  </div>
                )}

                {/* Financial Details for Wholesale/Owner Finance */}
                {(property.arv || property.down_payment) && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Financial Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {property.arv && (
                        <div>
                          <p className="text-sm text-muted-foreground">After Repair Value</p>
                          <p className="text-lg font-semibold">${property.arv.toLocaleString()}</p>
                        </div>
                      )}
                      {property.down_payment && (
                        <div>
                          <p className="text-sm text-muted-foreground">Down Payment</p>
                          <p className="text-lg font-semibold">${property.down_payment.toLocaleString()}</p>
                        </div>
                      )}
                      {property.estimated_repairs && (
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Repairs</p>
                          <p className="text-lg font-semibold">${property.estimated_repairs.toLocaleString()}</p>
                        </div>
                      )}
                      {property.max_loan_amount && (
                        <div>
                          <p className="text-sm text-muted-foreground">65% Loan Amount</p>
                          <p className="text-lg font-semibold">${property.max_loan_amount.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Inquiry Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Showing</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredDate">Preferred Date & Time</Label>
                    <Input
                      id="preferredDate"
                      type="datetime-local"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Any additional information..."
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={submitting}
                    style={{ backgroundColor: branding?.primary_color }}
                  >
                    {submitting ? "Submitting..." : "Request Showing"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Agent Contact */}
            {property.profiles && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact Agent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-semibold">
                    {property.profiles.first_name} {property.profiles.last_name}
                  </p>
                  {property.profiles.phone_number && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {property.profiles.phone_number}
                    </p>
                  )}
                  {property.profiles.email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {property.profiles.email}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}