import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Trash2, Edit, Download, Search, Filter, Home, Building2, Warehouse, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import InventoryFieldSettings from "@/components/InventoryFieldSettings";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number | null;
  category: string | null;
  sku: string | null;
  photo_url: string | null;
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

export default function Inventory() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSellerDialogOpen, setIsSellerDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [customFieldOptions, setCustomFieldOptions] = useState<any[]>([]);
  const { toast } = useToast();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 1,
    price: 0,
    category: "",
    sku: "",
    payment: 0,
    interest_rate: 0,
    market_status: "",
    transaction_type: "",
    finance_type: "",
    is_wholesale: false,
    arv: 0,
    status: "available",
    sqft: 0,
    bedrooms: 0,
    bathrooms: 0,
    commission: 0,
    property_type: "",
    seller_id: "",
    down_payment: 0,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [sellerFormData, setSellerFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  useEffect(() => {
    fetchInventory();
    fetchSellers();
    fetchCustomFieldOptions();
  }, []);

  // Filter items whenever search or filters change
  useEffect(() => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Property type filter
    if (propertyTypeFilter !== "all") {
      filtered = filtered.filter(item => item.property_type === propertyTypeFilter);
    }

    setFilteredItems(filtered);
  }, [items, searchQuery, categoryFilter, statusFilter, propertyTypeFilter]);

  // Real-time subscription
  useEffect(() => {
    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory'
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    const fieldOptionsChannel = supabase
      .channel('field-options-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_field_options'
        },
        () => {
          fetchCustomFieldOptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(fieldOptionsChannel);
    };
  }, []);


  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data as any) || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from("sellers" as any)
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setSellers((data as any) || []);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch sellers",
        variant: "destructive",
      });
    }
  };

  const fetchCustomFieldOptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("inventory_field_options")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setCustomFieldOptions(data || []);
    } catch (error) {
      console.error("Error fetching custom field options:", error);
    }
  };

  const uploadPhoto = async (file: File, itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${itemId}.${fileExt}`;

      console.log("Uploading photo:", fileName);

      const { error: uploadError } = await supabase.storage
        .from("inventory-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("inventory-photos")
        .getPublicUrl(fileName);

      console.log("Photo uploaded successfully:", data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error("Error in uploadPhoto:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Property name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.status) {
      toast({
        title: "Validation Error",
        description: "Status is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.property_type) {
      toast({
        title: "Validation Error",
        description: "Property type is required. Please add property types in Field Settings first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to add properties",
          variant: "destructive",
        });
        return;
      }

      let photoUrl = editingItem?.photo_url || null;

      if (editingItem) {
        // Update existing item
        if (photoFile) {
          photoUrl = await uploadPhoto(photoFile, editingItem.id);
        }

        const { error } = await supabase
          .from("inventory")
          .update({
            ...formData,
            seller_id: formData.seller_id || null,
            photo_url: photoUrl,
          })
          .eq("id", editingItem.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Inventory item updated successfully",
        });
      } else {
        // Create new item
        const { data: newItem, error: insertError } = await supabase
          .from("inventory")
          .insert({
            ...formData,
            seller_id: formData.seller_id || null,
            user_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (photoFile && newItem) {
          photoUrl = await uploadPhoto(photoFile, newItem.id);
          await supabase
            .from("inventory")
            .update({ photo_url: photoUrl })
            .eq("id", newItem.id);
        }

        toast({
          title: "Success",
          description: "Inventory item added successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchInventory();
    } catch (error: any) {
      console.error("Error saving inventory:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save inventory item",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      quantity: item.quantity,
      price: item.price || 0,
      category: item.category || "",
      sku: item.sku || "",
      payment: item.payment || 0,
      interest_rate: item.interest_rate || 0,
      market_status: item.market_status || "",
      transaction_type: item.transaction_type || "",
      finance_type: item.finance_type || "",
      is_wholesale: item.is_wholesale || false,
      arv: item.arv || 0,
      status: item.status || "available",
      sqft: item.sqft || 0,
      bedrooms: item.bedrooms || 0,
      bathrooms: item.bathrooms || 0,
      commission: item.commission || 0,
      property_type: item.property_type || "",
      seller_id: item.seller_id || "",
      down_payment: item.down_payment || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log("Attempting to delete inventory item:", id);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to delete properties");
      }

      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Supabase delete error:", error);
        throw error;
      }

      console.log("Delete successful");
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
      fetchInventory();
    } catch (error: any) {
      console.error("Error deleting inventory:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  const downloadPhoto = async (photoUrl: string, propertyName: string) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${propertyName.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Photo downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading photo:", error);
      toast({
        title: "Error",
        description: "Failed to download photo",
        variant: "destructive",
      });
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

  const getCustomOptions = (fieldType: string) => {
    return customFieldOptions
      .filter(opt => opt.field_type === fieldType)
      .map(opt => opt.option_value);
  };

  const getUniqueCategories = () => {
    const customCats = getCustomOptions("category");
    if (customCats.length > 0) return customCats;
    
    const categories = items.map(item => item.category).filter(Boolean);
    const uniqueCategories = Array.from(new Set(categories)) as string[];
    
    // Provide default options if none exist
    if (uniqueCategories.length === 0) {
      return ["Residential", "Commercial", "Investment", "Luxury", "Vacation"];
    }
    
    return uniqueCategories;
  };

  const getUniqueStatuses = () => {
    const customStatuses = getCustomOptions("status");
    if (customStatuses.length > 0) return customStatuses;
    
    return ["available", "pending", "sold", "coming_soon", "under_contract"];
  };

  const getUniquePropertyTypes = () => {
    const customTypes = getCustomOptions("property_type");
    if (customTypes.length > 0) return customTypes;
    
    const types = items.map(item => item.property_type).filter(Boolean);
    const uniqueTypes = Array.from(new Set(types)) as string[];
    
    // Provide default options if none exist
    if (uniqueTypes.length === 0) {
      return ["Single Family", "Multi Family", "Condo", "Townhouse", "Land", "Commercial"];
    }
    
    return uniqueTypes;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      quantity: 1,
      price: 0,
      category: "",
      sku: "",
      payment: 0,
      interest_rate: 0,
      market_status: "",
      transaction_type: "",
      finance_type: "",
      is_wholesale: false,
      arv: 0,
      status: "available",
      sqft: 0,
      bedrooms: 0,
      bathrooms: 0,
      commission: 0,
      property_type: "",
      seller_id: "",
      down_payment: 0,
    });
    setPhotoFile(null);
    setEditingItem(null);
  };

  const handleSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingSeller) {
        const { error } = await supabase
          .from("sellers" as any)
          .update(sellerFormData)
          .eq("id", editingSeller.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Seller updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("sellers" as any)
          .insert({
            ...sellerFormData,
            user_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Seller added successfully",
        });
      }

      setIsSellerDialogOpen(false);
      resetSellerForm();
      fetchSellers();
    } catch (error) {
      console.error("Error saving seller:", error);
      toast({
        title: "Error",
        description: "Failed to save seller",
        variant: "destructive",
      });
    }
  };

  const handleEditSeller = (seller: Seller) => {
    setEditingSeller(seller);
    setSellerFormData({
      name: seller.name,
      email: seller.email || "",
      phone: seller.phone || "",
      company: seller.company || "",
    });
    setIsSellerDialogOpen(true);
  };

  const handleDeleteSeller = async (id: string) => {
    try {
      const { error } = await supabase
        .from("sellers" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Seller deleted successfully",
      });
      fetchSellers();
    } catch (error) {
      console.error("Error deleting seller:", error);
      toast({
        title: "Error",
        description: "Failed to delete seller",
        variant: "destructive",
      });
    }
  };

  const resetSellerForm = () => {
    setSellerFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
    });
    setEditingSeller(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Property Inventory</h1>
          <p className="text-muted-foreground mt-1">Track and manage your active property listings</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg">
                <Settings className="mr-2 h-4 w-4" />
                Field Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customize Fields</DialogTitle>
                <DialogDescription>
                  Manage your custom categories, statuses, and property types
                </DialogDescription>
              </DialogHeader>
              <InventoryFieldSettings />
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit" : "Add"} Property</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update" : "Add"} property details, photos, and pricing information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Property Address *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., 123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">Property ID / SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="e.g., PROP-001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Property description, features, location details..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="property_type">Property Type *</Label>
                    <Select
                      value={formData.property_type}
                      onValueChange={(value) => setFormData({ ...formData, property_type: value })}
                    >
                      <SelectTrigger id="property_type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUniquePropertyTypes().map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUniqueCategories().map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUniqueStatuses().map(status => (
                          <SelectItem key={status} value={status}>
                            {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Property Details</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sqft">Square Feet</Label>
                    <Input
                      id="sqft"
                      type="number"
                      min="0"
                      value={formData.sqft}
                      onChange={(e) => setFormData({ ...formData, sqft: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      min="0"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Units Available</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              </div>

              {/* Listing Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Listing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Listing Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arv">ARV ($)</Label>
                    <Input
                      id="arv"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.arv}
                      onChange={(e) => setFormData({ ...formData, arv: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commission">Commission ($)</Label>
                    <Input
                      id="commission"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.commission}
                      onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment">Monthly Payment ($)</Label>
                    <Input
                      id="payment"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.payment}
                      onChange={(e) => setFormData({ ...formData, payment: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                    <Input
                      id="interest_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      max="100"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  {formData.transaction_type === 'owner_finance' && (
                    <div className="space-y-2">
                      <Label htmlFor="down_payment">Down Payment ($)</Label>
                      <Input
                        id="down_payment"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.down_payment}
                        onChange={(e) => setFormData({ ...formData, down_payment: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Type */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Transaction Type</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transaction_type">Transaction Type</Label>
                    <Select
                      value={formData.transaction_type}
                      onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                    >
                      <SelectTrigger id="transaction_type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">Sale</SelectItem>
                        <SelectItem value="lease">Lease</SelectItem>
                        <SelectItem value="rent_to_own">Rent to Own</SelectItem>
                        <SelectItem value="owner_finance">Owner Finance</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Transaction Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="finance_type">Finance Type</Label>
                    <Input
                      id="finance_type"
                      value={formData.finance_type}
                      onChange={(e) => setFormData({ ...formData, finance_type: e.target.value })}
                      placeholder="e.g., Conventional, FHA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="market_status">Market Status</Label>
                    <Select
                      value={formData.market_status}
                      onValueChange={(value) => setFormData({ ...formData, market_status: value })}
                    >
                      <SelectTrigger id="market_status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on_market">On Market</SelectItem>
                        <SelectItem value="off_market">Off Market</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_wholesale"
                    checked={formData.is_wholesale}
                    onChange={(e) => setFormData({ ...formData, is_wholesale: e.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="is_wholesale" className="cursor-pointer">Wholesale Property</Label>
                </div>
              </div>

              {/* Seller Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Seller Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="seller_id">Property Seller</Label>
                  <Select
                    value={formData.seller_id}
                    onValueChange={(value) => setFormData({ ...formData, seller_id: value })}
                  >
                    <SelectTrigger id="seller_id">
                      <SelectValue placeholder="Select seller (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.name} {seller.company ? `(${seller.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Property Photo</h3>
                <div className="space-y-2">
                  <Label htmlFor="photo">Upload Photo (Optional - can be added later)</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                  {editingItem?.photo_url && !photoFile && (
                    <img src={editingItem.photo_url} alt="Current" className="mt-2 h-32 w-48 object-cover rounded-lg border" />
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? "Update" : "Add"} Property
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getUniqueCategories().map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {getUniqueStatuses().map(status => (
                    <SelectItem key={status} value={status}>
                      {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Property Type</Label>
              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {getUniquePropertyTypes().map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(searchQuery || categoryFilter !== "all" || statusFilter !== "all" || propertyTypeFilter !== "all") && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredItems.length} of {items.length} properties
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                  setPropertyTypeFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {items.length === 0 ? "No properties yet" : "No properties match your filters"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {items.length === 0 ? "Add your first property to get started" : "Try adjusting your search criteria"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/inventory/${item.id}`)}
            >
              <div className="relative h-48 bg-muted">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge variant={getStatusBadgeVariant(item.status)}>
                    {item.status?.replace('_', ' ').toUpperCase() || 'AVAILABLE'}
                  </Badge>
                  {item.is_wholesale && (
                    <Badge variant="outline" className="bg-background">Wholesale</Badge>
                  )}
                </div>
                {item.photo_url && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadPhoto(item.photo_url!, item.name);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="line-clamp-1">{item.name}</span>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {item.description || "No description available"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Property Details */}
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {item.bedrooms > 0 && (
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Beds</span>
                      <span className="font-medium">{item.bedrooms}</span>
                    </div>
                  )}
                  {item.bathrooms > 0 && (
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Baths</span>
                      <span className="font-medium">{item.bathrooms}</span>
                    </div>
                  )}
                  {item.sqft > 0 && (
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Sq Ft</span>
                      <span className="font-medium">{item.sqft.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Listing Price</span>
                    <span className="text-xl font-bold text-primary">
                      ${item.price?.toLocaleString() || '0'}
                    </span>
                  </div>
                  {item.arv > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">ARV</span>
                      <span className="font-medium">${item.arv.toLocaleString()}</span>
                    </div>
                  )}
                  {isAdmin && item.commission > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Commission</span>
                      <span className="font-medium text-green-600">${item.commission.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="flex flex-wrap gap-2">
                  {item.property_type && (
                    <Badge variant="outline">{item.property_type}</Badge>
                  )}
                  {item.category && (
                    <Badge variant="secondary">{item.category}</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(item);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id, item.name);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Sellers Management Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Property Sellers</CardTitle>
              <CardDescription>Manage sellers for your property inventory</CardDescription>
            </div>
            <Dialog open={isSellerDialogOpen} onOpenChange={(open) => {
              setIsSellerDialogOpen(open);
              if (!open) resetSellerForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Seller
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSeller ? "Edit" : "Add"} Seller</DialogTitle>
                  <DialogDescription>
                    {editingSeller ? "Update" : "Add"} seller contact information
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSellerSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seller_name">Name *</Label>
                    <Input
                      id="seller_name"
                      required
                      value={sellerFormData.name}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, name: e.target.value })}
                      placeholder="e.g., John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seller_company">Company</Label>
                    <Input
                      id="seller_company"
                      value={sellerFormData.company}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, company: e.target.value })}
                      placeholder="e.g., ABC Realty"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seller_email">Email</Label>
                    <Input
                      id="seller_email"
                      type="email"
                      value={sellerFormData.email}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, email: e.target.value })}
                      placeholder="e.g., john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seller_phone">Phone</Label>
                    <Input
                      id="seller_phone"
                      type="tel"
                      value={sellerFormData.phone}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, phone: e.target.value })}
                      placeholder="e.g., (555) 123-4567"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsSellerDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingSeller ? "Update" : "Add"} Seller
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {sellers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sellers added yet. Add your first seller to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {sellers.map((seller) => (
                <div key={seller.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium">{seller.name}</div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {seller.company && <div>Company: {seller.company}</div>}
                      {seller.email && <div>Email: {seller.email}</div>}
                      {seller.phone && <div>Phone: {seller.phone}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSeller(seller)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSeller(seller.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}