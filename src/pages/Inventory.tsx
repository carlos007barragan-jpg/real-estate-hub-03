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
import { Plus, Trash2, Edit, Download, Search, Filter, Home, Building2, Warehouse, Settings, FileText, ExternalLink, Bed, Bath, Maximize2, Upload } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InventoryFieldSettings from "@/components/InventoryFieldSettings";
import MultiPhotoUpload from "@/components/MultiPhotoUpload";
import BulkPropertyUpload from "@/components/BulkPropertyUpload";
import { PropertyApprovalDialog } from "@/components/PropertyApprovalDialog";

interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number | null;
  category: string | null;
  sku: string | null;
  photo_url: string | null;
  photo_urls?: string[] | any;
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
  public_approval_status?: string;
  show_on_public_page?: boolean;
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
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSellerDialogOpen, setIsSellerDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [customFieldOptions, setCustomFieldOptions] = useState<any[]>([]);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedPropertyForApproval, setSelectedPropertyForApproval] = useState<any>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const { toast } = useToast();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");

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
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);

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

    // Owner filter
    if (ownerFilter !== "all") {
      filtered = filtered.filter(item => item.user_id === ownerFilter);
    }

    setFilteredItems(filtered);
  }, [items, searchQuery, categoryFilter, statusFilter, propertyTypeFilter, ownerFilter]);

  // Real-time subscription with debouncing
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
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
          // Debounce to prevent multiple rapid fetches
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('🔄 Real-time update detected, refreshing inventory...');
            fetchInventory();
          }, 500);
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
      clearTimeout(debounceTimer);
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(fieldOptionsChannel);
    };
  }, []);


  const fetchInventory = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Get current user's organization
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        throw profileError;
      }
      
      const currentOrgId = profileData?.organization_id;
      
      if (!currentOrgId) {
        console.warn("User has no organization, showing only their own inventory");
        // If no organization, show only user's own inventory
        const { data, error } = await supabase
          .from("inventory")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setItems((data as any) || []);
      } else {
        // Fetch inventory for all users in the same organization
        const { data: orgProfiles, error: orgProfilesError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("organization_id", currentOrgId);

        if (orgProfilesError) throw orgProfilesError;
        
        const orgUserIds = orgProfiles?.map(p => p.user_id) || [];
        
        // Fetch inventory only for users in the same organization
        const { data, error } = await supabase
          .from("inventory")
          .select("*")
          .in("user_id", orgUserIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setItems((data as any) || []);
      }
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

  const uploadPhotos = async (files: File[], itemId: string): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${itemId}-${index}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("inventory-photos")
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("inventory-photos")
          .getPublicUrl(fileName);

        return data.publicUrl;
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Error uploading photos:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('⚠️ Form already submitting, ignoring duplicate submission');
      return;
    }
    
    setIsSubmitting(true);
    console.log('🏠 Form submitted');
    console.log('🏠 Form data:', formData);
    console.log('🏠 Photo files:', photoFiles.length);
    console.log('🏠 Existing photo URLs:', existingPhotoUrls);
    
    // Validate required fields
    if (!formData.name.trim()) {
      console.log('❌ Validation failed: name required');
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: "Property name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.status) {
      console.log('❌ Validation failed: status required');
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: "Status is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.property_type) {
      console.log('❌ Validation failed: property_type required');
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: "Property type is required. Please select a property type.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      console.log('❌ Validation failed: category required');
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: "Property category is required. Please select a category.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ All validations passed');
    
    try {
      console.log('🔐 Getting authenticated user...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user');
        setIsSubmitting(false);
        toast({
          title: "Authentication Error",
          description: "You must be logged in to add properties",
          variant: "destructive",
        });
        return;
      }
      console.log('✅ User authenticated:', user.id);

      let photoUrls: string[] = existingPhotoUrls;

      if (editingItem) {
        console.log('📝 Updating existing item:', editingItem.id);
        
        // Update database immediately with existing photo URLs
        console.log('💾 Updating database...');
        const { error } = await supabase
          .from("inventory")
          .update({
            ...formData,
            seller_id: formData.seller_id || null,
            market_status: formData.market_status || null,
            transaction_type: formData.transaction_type || null,
            finance_type: formData.finance_type || null,
            photo_urls: existingPhotoUrls,
            photo_url: existingPhotoUrls[0] || null,
          })
          .eq("id", editingItem.id);

        if (error) {
          console.log('❌ Database update error:', error);
          throw error;
        }
        console.log('✅ Item updated successfully');

        // Upload new photos in the background if any
        if (photoFiles.length > 0) {
          console.log('📤 Starting background photo upload for', photoFiles.length, 'new photos...');
          
          toast({
            title: "Property Updated",
            description: `Uploading ${photoFiles.length} new photo${photoFiles.length > 1 ? 's' : ''}...`,
          });

          // Upload photos in background
          uploadPhotos(photoFiles, editingItem.id)
            .then((newPhotoUrls) => {
              console.log('✅ Background upload complete:', newPhotoUrls.length, 'photos');
              const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls];
              
              // Update with all photos
              return supabase
                .from("inventory")
                .update({ 
                  photo_urls: allPhotoUrls,
                  photo_url: allPhotoUrls[0] || null,
                })
                .eq("id", editingItem.id);
            })
            .then(() => {
              toast({
                title: "Photos Uploaded",
                description: "All new photos have been successfully uploaded",
              });
            })
            .catch((error) => {
              console.error('❌ Background photo upload error:', error);
              toast({
                title: "Photo Upload Failed",
                description: "Some photos failed to upload. Please try editing the property again.",
                variant: "destructive",
              });
            });
        } else {
          toast({
            title: "Success",
            description: "Inventory item updated successfully",
          });
        }
      } else {
        console.log('➕ Creating new item...');
        // Create new item
        const { data: newItem, error: insertError } = await supabase
          .from("inventory")
          .insert({
            ...formData,
            seller_id: formData.seller_id || null,
            market_status: formData.market_status || null,
            transaction_type: formData.transaction_type || null,
            finance_type: formData.finance_type || null,
            user_id: user.id,
          })
          .select()
          .single();

        if (insertError) {
          console.log('❌ Database insert error:', insertError);
          throw insertError;
        }
        console.log('✅ Item created:', newItem?.id);

        // Upload photos in the background without blocking
        if (photoFiles.length > 0 && newItem) {
          console.log('📤 Starting background photo upload for', photoFiles.length, 'photos...');
          
          // Show immediate success message
          toast({
            title: "Property Created",
            description: `Uploading ${photoFiles.length} photo${photoFiles.length > 1 ? 's' : ''}...`,
          });

          // Upload photos in background
          uploadPhotos(photoFiles, newItem.id)
            .then((uploadedUrls) => {
              console.log('✅ Background upload complete:', uploadedUrls.length, 'photos');
              
              // Update the item with photo URLs
              return supabase
                .from("inventory")
                .update({ 
                  photo_urls: uploadedUrls,
                  photo_url: uploadedUrls[0] || null,
                })
                .eq("id", newItem.id);
            })
            .then(() => {
              toast({
                title: "Photos Uploaded",
                description: "All photos have been successfully uploaded",
              });
            })
            .catch((error) => {
              console.error('❌ Background photo upload error:', error);
              toast({
                title: "Photo Upload Failed",
                description: "Some photos failed to upload. Please try editing the property to add them again.",
                variant: "destructive",
              });
            });
        } else {
          toast({
            title: "Success",
            description: "Inventory item added successfully",
          });
        }
      }

      console.log('🎉 Operation completed successfully');
      setIsDialogOpen(false);
      resetForm();
      setIsSubmitting(false);
      // Real-time subscription will handle the refresh
    } catch (error: any) {
      setIsSubmitting(false);
      console.error("❌ Error saving inventory:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
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
    // Load existing photos from photo_urls or fallback to photo_url
    const existingPhotos = (item as any).photo_urls || (item.photo_url ? [item.photo_url] : []);
    setExistingPhotoUrls(existingPhotos);
    setPhotoFiles([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    console.log("🗑️ Delete button clicked for:", name, "ID:", id);
    
    try {
      // Check authentication first
      console.log("🔐 Checking authentication...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("❌ Not authenticated");
        toast({
          title: "Authentication Required",
          description: "You must be logged in to delete properties",
          variant: "destructive",
        });
        return;
      }
      console.log("✅ User authenticated:", user.id);

      // Verify item exists before deleting
      console.log("🔍 Verifying item exists...");
      const { data: existingItem, error: fetchError } = await supabase
        .from("inventory")
        .select("id, name, user_id")
        .eq("id", id)
        .single();

      if (fetchError || !existingItem) {
        console.log("❌ Item not found:", fetchError);
        toast({
          title: "Not Found",
          description: "This property no longer exists",
          variant: "destructive",
        });
        await fetchInventory();
        return;
      }
      console.log("✅ Item exists:", existingItem);

      // Confirm deletion
      console.log("⚠️ Showing confirmation dialog...");
      const confirmed = window.confirm(
        `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`
      );
      
      if (!confirmed) {
        console.log("⏹️ Delete cancelled by user");
        return;
      }
      console.log("✅ User confirmed deletion");

      console.log("🗑️ Executing delete operation...");
      const { error: deleteError, count } = await supabase
        .from("inventory")
        .delete({ count: 'exact' })
        .eq("id", id);

      if (deleteError) {
        console.log("❌ Delete error:", deleteError);
        throw deleteError;
      }

      console.log("✅ Delete successful. Rows affected:", count);
      
      toast({
        title: "Success",
        description: `"${name}" has been deleted successfully`,
      });
      
      // Manually refresh the list immediately
      console.log("🔄 Refreshing inventory list...");
      await fetchInventory();
      console.log("✅ Inventory refreshed");
    } catch (error: any) {
      console.error("❌ Error deleting inventory:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete property. Please try again.",
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

  const handleQuickStatusChange = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("inventory")
        .update({ status: newStatus })
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Property marked as ${newStatus.replace('_', ' ')}`,
      });
      fetchInventory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
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
    const systemDefaults = ["Residential", "Commercial", "Wholesale", "Off-Market", "Investment", "Luxury"];
    const customCats = getCustomOptions("category");
    const hiddenDefaults = customFieldOptions
      .filter(opt => opt.field_type === "category" && !opt.is_active)
      .map(opt => opt.option_value);
    
    // Filter out hidden system defaults
    const availableDefaults = systemDefaults.filter(def => !hiddenDefaults.includes(def));
    
    // Merge available defaults with custom options, removing duplicates
    const allCategories = [...availableDefaults, ...customCats];
    return Array.from(new Set(allCategories));
  };

  const getUniqueStatuses = () => {
    // Statuses are system-defined, not customizable
    return ["available", "pending", "sold", "coming_soon", "under_contract"];
  };

  const getUniquePropertyTypes = () => {
    const systemDefaults = ["Single Family", "Multi Family", "Condo", "Townhouse", "Land", "Commercial"];
    const customTypes = getCustomOptions("property_type");
    const hiddenDefaults = customFieldOptions
      .filter(opt => opt.field_type === "property_type" && !opt.is_active)
      .map(opt => opt.option_value);
    
    // Filter out hidden system defaults
    const availableDefaults = systemDefaults.filter(def => !hiddenDefaults.includes(def));
    
    // Merge available defaults with custom options, removing duplicates
    const allTypes = [...availableDefaults, ...customTypes];
    return Array.from(new Set(allTypes));
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
    setPhotoFiles([]);
    setExistingPhotoUrls([]);
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

  // No blocking loading state - render immediately

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Property Inventory</h1>
          <p className="text-muted-foreground mt-1">Track and manage your active property listings</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
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
            </>
          )}
          <Button variant="outline" size="lg" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
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
              {/* Property Classification - Primary Search Fields */}
              <div className="space-y-4 p-4 bg-primary/5 border-2 border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary">Search Criteria</Badge>
                  <h3 className="text-lg font-semibold">Property Classification</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  These fields are used for searching and filtering properties
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="property_type" className="font-semibold">Property Type *</Label>
                    <Select
                      value={formData.property_type}
                      onValueChange={(value) => setFormData({ ...formData, property_type: value })}
                    >
                      <SelectTrigger id="property_type" className="border-2">
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
                    <Label htmlFor="category" className="font-semibold">Property Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="category" className="border-2">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUniqueCategories().map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

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
              <MultiPhotoUpload
                existingPhotos={existingPhotoUrls}
                onPhotosChange={(files, urls) => {
                  setPhotoFiles(files);
                  setExistingPhotoUrls(urls);
                }}
                maxPhotos={10}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : (editingItem ? "Update" : "Add") + " Property"}
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

      {/* Property Table */}
      <Card>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Home className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {items.length === 0 ? "No properties yet" : "No properties match your filters"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {items.length === 0 ? "Add your first property to get started" : "Try adjusting your search criteria"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Property</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const photoUrl = item.photo_urls && Array.isArray(item.photo_urls) && item.photo_urls.length > 0
                    ? item.photo_urls[0]
                    : item.photo_url;

                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/inventory/${item.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0">
                            {photoUrl ? (
                              <img src={photoUrl} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            {item.is_wholesale && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">Wholesale</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-primary">
                          ${item.price?.toLocaleString() || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs cursor-pointer hover:opacity-80">
                                {item.status?.replace('_', ' ').toUpperCase() || 'AVAILABLE'}
                              </Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                            {getUniqueStatuses().map(s => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => handleQuickStatusChange(item.id, s)}
                                className={item.status === s ? "bg-accent" : ""}
                              >
                                {s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{item.property_type || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{item.category || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                          {item.bedrooms > 0 && (
                            <span className="flex items-center gap-1" title="Bedrooms">
                              <Bed className="h-3.5 w-3.5" /> {item.bedrooms}
                            </span>
                          )}
                          {item.bathrooms > 0 && (
                            <span className="flex items-center gap-1" title="Bathrooms">
                              <Bath className="h-3.5 w-3.5" /> {item.bathrooms}
                            </span>
                          )}
                          {item.sqft > 0 && (
                            <span className="flex items-center gap-1" title="Sq Ft">
                              <Maximize2 className="h-3.5 w-3.5" /> {item.sqft.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && item.public_approval_status !== 'approved' && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPropertyForApproval(item);
                                setApprovalDialogOpen(true);
                              }}
                            >
                              Review
                            </Button>
                          )}
                          {isAdmin && item.is_wholesale && item.public_approval_status === 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                const dispoLink = `${window.location.origin}/dispo-sheet?id=${item.id}`;
                                navigator.clipboard.writeText(dispoLink);
                                toast({
                                  title: "Link Copied!",
                                  description: "Dispo sheet link copied to clipboard",
                                });
                                window.open(dispoLink, '_blank');
                              }}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id, item.name);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {/* Property Approval Dialog */}
      {selectedPropertyForApproval && (
        <PropertyApprovalDialog
          property={selectedPropertyForApproval}
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          onSuccess={() => {
            fetchInventory();
            setSelectedPropertyForApproval(null);
          }}
        />
      )}
      {/* Bulk Upload Dialog */}
      <BulkPropertyUpload
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onSuccess={fetchInventory}
      />
    </div>
  );
}