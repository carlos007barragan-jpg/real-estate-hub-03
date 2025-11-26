import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink } from "lucide-react";

export default function PublicPageSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [formData, setFormData] = useState({
    logoUrl: "",
    primaryColor: "#000000",
    secondaryColor: "#666666",
    publicPageTitle: "Properties",
    publicPageDescription: "",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);

        const { data: branding, error } = await supabase
          .from("organization_branding")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (branding) {
          setFormData({
            logoUrl: branding.logo_url || "",
            primaryColor: branding.primary_color || "#000000",
            secondaryColor: branding.secondary_color || "#666666",
            publicPageTitle: branding.public_page_title || "Properties",
            publicPageDescription: branding.public_page_description || "",
            contactEmail: branding.contact_email || "",
            contactPhone: branding.contact_phone || "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organization_branding")
        .upsert({
          organization_id: organizationId,
          logo_url: formData.logoUrl,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          public_page_title: formData.publicPageTitle,
          public_page_description: formData.publicPageDescription,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Public page settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = `${window.location.origin}/public-properties?org=${organizationId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({
      title: "Copied!",
      description: "Public page URL copied to clipboard",
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Public Page Settings</h1>
          <p className="text-muted-foreground">
            Customize how your properties appear to the public
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Public Page URL</CardTitle>
            <CardDescription>Share this link with potential buyers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={publicUrl} readOnly />
              <Button variant="outline" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" onClick={() => window.open(publicUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Customize your public page appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={formData.publicPageTitle}
                onChange={(e) => setFormData({ ...formData, publicPageTitle: e.target.value })}
                placeholder="Properties"
              />
            </div>

            <div>
              <Label htmlFor="description">Page Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={formData.publicPageDescription}
                onChange={(e) => setFormData({ ...formData, publicPageDescription: e.target.value })}
                placeholder="Explore our available properties..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}