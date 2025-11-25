import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Home, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MultiPhotoUpload from "@/components/MultiPhotoUpload";

interface Property {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  property_type: string | null;
  transaction_type: string | null;
  status: string | null;
  photo_urls?: any;
  acquisition_price: number | null;
  estimated_repairs: number | null;
  arv: number | null;
  created_at: string;
}

export default function OwnerPortalDashboard() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    bedrooms: 0,
    bathrooms: 0,
    sqft: 0,
    property_type: "For Sale",
    transaction_type: "",
    status: "available",
    acquisition_price: 0,
    estimated_repairs: 0,
    arv: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchProperties();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/owner-login");
      return;
    }

    // Verify user is an owner
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'owner_user')
      .maybeSingle();

    if (!roles) {
      toast.error("Access denied. Owner account required.");
      await supabase.auth.signOut();
      navigate("/owner-login");
    }
  };

  const fetchProperties = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/owner-login");
  };

  const openDialog = (property?: Property) => {
    if (property) {
      setEditingProperty(property);
      setFormData({
        name: property.name,
        description: property.description || "",
        price: property.price || 0,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        sqft: property.sqft || 0,
        property_type: property.property_type || "For Sale",
        transaction_type: property.transaction_type || "",
        status: property.status || "available",
        acquisition_price: property.acquisition_price || 0,
        estimated_repairs: property.estimated_repairs || 0,
        arv: property.arv || 0,
      });
      const urls = Array.isArray(property.photo_urls) ? property.photo_urls : [];
      setExistingPhotoUrls(urls);
    } else {
      setEditingProperty(null);
      setFormData({
        name: "",
        description: "",
        price: 0,
        bedrooms: 0,
        bathrooms: 0,
        sqft: 0,
        property_type: "For Sale",
        transaction_type: "",
        status: "available",
        acquisition_price: 0,
        estimated_repairs: 0,
        arv: 0,
      });
      setExistingPhotoUrls([]);
    }
    setPhotoFiles([]);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const propertyData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        sqft: formData.sqft,
        property_type: formData.property_type,
        transaction_type: formData.transaction_type,
        status: formData.status,
        acquisition_price: formData.acquisition_price,
        estimated_repairs: formData.estimated_repairs,
        arv: formData.arv,
        user_id: user.id,
        quantity: 1,
      };

      if (editingProperty) {
        const { error } = await supabase
          .from('inventory')
          .update(propertyData)
          .eq('id', editingProperty.id);
        if (error) throw error;
        toast.success("Property updated!");
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert(propertyData);
        if (error) throw error;
        toast.success("Property added!");
      }

      setIsDialogOpen(false);
      fetchProperties();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Property removed!");
      fetchProperties();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">My Properties</h1>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">{properties.length} properties</p>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardHeader>
                <CardTitle>{property.name}</CardTitle>
                <CardDescription>
                  <Badge variant="outline">{property.property_type}</Badge>
                  {property.status && (
                    <Badge className="ml-2" variant={property.status === 'sold' ? 'default' : 'secondary'}>
                      {property.status}
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">${property.price?.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">
                    {property.bedrooms} bed • {property.bathrooms} bath • {property.sqft} sqft
                  </p>
                  {property.description && (
                    <p className="text-sm line-clamp-2">{property.description}</p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openDialog(property)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(property.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty ? "Edit Property" : "Add Property"}</DialogTitle>
            <DialogDescription>
              {editingProperty ? "Update" : "Add"} property details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Address</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property_type">Type</Label>
                <Select value={formData.property_type} onValueChange={(value) => setFormData({ ...formData, property_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rental">Rental</SelectItem>
                    <SelectItem value="For Sale">For Sale</SelectItem>
                    <SelectItem value="Wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sqft">Sq Ft</Label>
                <Input
                  id="sqft"
                  type="number"
                  value={formData.sqft}
                  onChange={(e) => setFormData({ ...formData, sqft: Number(e.target.value) })}
                />
              </div>
            </div>
            {formData.property_type === "Wholesale" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="acquisition_price">Acquisition Price</Label>
                  <Input
                    id="acquisition_price"
                    type="number"
                    value={formData.acquisition_price}
                    onChange={(e) => setFormData({ ...formData, acquisition_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arv">ARV</Label>
                  <Input
                    id="arv"
                    type="number"
                    value={formData.arv}
                    onChange={(e) => setFormData({ ...formData, arv: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_repairs">Est. Repairs</Label>
                  <Input
                    id="estimated_repairs"
                    type="number"
                    value={formData.estimated_repairs}
                    onChange={(e) => setFormData({ ...formData, estimated_repairs: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Photos</Label>
              <MultiPhotoUpload
                existingPhotos={existingPhotoUrls}
                onPhotosChange={(newFiles, existingUrls) => {
                  setPhotoFiles(newFiles);
                  setExistingPhotoUrls(existingUrls);
                }}
                maxPhotos={10}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingProperty ? "Update" : "Add"} Property
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
