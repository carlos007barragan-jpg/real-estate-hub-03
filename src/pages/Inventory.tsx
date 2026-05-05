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
import { Plus, Trash2, Edit, Download, Search, Filter, Home, Building2, Warehouse, Settings, FileText, ExternalLink, Bed, Bath, Maximize2, Upload, Sparkles, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InventoryFieldSettings from "@/components/InventoryFieldSettings";
import MultiPhotoUpload from "@/components/MultiPhotoUpload";
import PropertyVideoUpload, { uploadPropertyVideo } from "@/components/PropertyVideoUpload";
import BulkPropertyUpload from "@/components/BulkPropertyUpload";


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
  const { isAdmin, role } = useUserRole();
  const isSupremeAdmin = role === 'supreme_admin';
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
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const { toast } = useToast();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dealStrategyFilter, setDealStrategyFilter] = useState("all");
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
  // Deal Strategy options for the new classification
  const dealStrategyOptions = [
    { value: "traditional_listing", label: "Traditional Listing" },
    { value: "wholesale", label: "Wholesale" },
    { value: "owner_finance", label: "Owner Finance" },
    { value: "lease", label: "Lease" },
    { value: "rent_to_own", label: "Rent to Own" },
  ];
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoType, setVideoType] = useState<string | null>(null);
  const [smartPasteText, setSmartPasteText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

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

    // Deal Strategy filter
    if (dealStrategyFilter !== "all") {
      filtered = filtered.filter(item => item.transaction_type === dealStrategyFilter);
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
  }, [items, searchQuery, dealStrategyFilter, statusFilter, propertyTypeFilter, ownerFilter]);

  // Real-time subscription with debouncing
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout>;
    
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

    if (!formData.transaction_type) {
      console.log('❌ Validation failed: deal strategy required');
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: "Deal strategy is required. Please select a deal strategy.",
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
            video_url: videoUrl === "pending-upload" ? null : (videoUrl || null),
            video_type: videoUrl === "pending-upload" ? null : (videoType || null),
          })
          .eq("id", editingItem.id);

        if (error) {
          console.log('❌ Database update error:', error);
          throw error;
        }
        console.log('✅ Item updated successfully');

        // Upload video file if pending
        if (videoFile && videoUrl === "pending-upload") {
          uploadPropertyVideo(videoFile, editingItem.id).then((uploadedVideoUrl) => {
            if (uploadedVideoUrl) {
              supabase.from("inventory").update({ video_url: uploadedVideoUrl, video_type: "upload" }).eq("id", editingItem.id);
            }
          });
        }

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
              fetchInventory();
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
            video_url: videoUrl === "pending-upload" ? null : (videoUrl || null),
            video_type: videoUrl === "pending-upload" ? null : (videoType || null),
          })
          .select()
          .single();

        if (insertError) {
          console.log('❌ Database insert error:', insertError);
          throw insertError;
        }
        console.log('✅ Item created:', newItem?.id);

        // Upload video in background if pending
        if (videoFile && videoUrl === "pending-upload" && newItem) {
          uploadPropertyVideo(videoFile, newItem.id).then((uploadedVideoUrl) => {
            if (uploadedVideoUrl) {
              supabase.from("inventory").update({ video_url: uploadedVideoUrl, video_type: "upload" }).eq("id", newItem.id);
            }
          });
        }

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
              fetchInventory();
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
    // Load existing video
    setVideoUrl((item as any).video_url || null);
    setVideoType((item as any).video_type || null);
    setVideoFile(null);
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

  const getUniqueDealStrategies = () => {
    return dealStrategyOptions;
  };

  const getUniqueStatuses = () => {
    // Statuses are system-defined, not customizable
    return ["available", "pending", "sold", "coming_soon", "under_contract"];
  };

  const getUniquePropertyTypes = () => {
    const systemDefaults = ["Single Family", "Multi Family", "Condo", "Townhouse", "Land", "Commercial", "Luxury", "Multifamily", "Mixed Use"];
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
    setVideoFile(null);
    setVideoUrl(null);
    setVideoType(null);
    setEditingItem(null);
    setSmartPasteText("");
  };

  const handleSmartPaste = async () => {
    if (!smartPasteText.trim()) return;
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-property-info", {
        body: { text: smartPasteText },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const parsed = data?.data;
      if (!parsed) throw new Error("No data returned");

      setFormData(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        sku: parsed.sku || prev.sku,
        description: parsed.description || prev.description,
        price: parsed.price ?? prev.price,
        bedrooms: parsed.bedrooms ?? prev.bedrooms,
        bathrooms: parsed.bathrooms ?? prev.bathrooms,
        sqft: parsed.sqft ?? prev.sqft,
        property_type: parsed.property_type || prev.property_type,
        category: parsed.category || prev.category,
        status: parsed.status || prev.status,
        market_status: parsed.market_status || prev.market_status,
        finance_type: parsed.finance_type || prev.finance_type,
        transaction_type: parsed.transaction_type || prev.transaction_type,
        arv: parsed.arv ?? prev.arv,
        payment: parsed.payment ?? prev.payment,
        interest_rate: parsed.interest_rate ?? prev.interest_rate,
        down_payment: parsed.down_payment ?? prev.down_payment,
        commission: parsed.commission ?? prev.commission,
        is_wholesale: parsed.is_wholesale ?? prev.is_wholesale,
      }));

      toast({
        title: "Fields Auto-Populated",
        description: "Property information has been extracted and filled in. Review and adjust as needed.",
      });
      setSmartPasteText("");
    } catch (error: any) {
      console.error("Smart paste error:", error);
      toast({
        title: "Parsing Failed",
        description: error.message || "Could not extract property information. Try adding more details.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateDescription = async () => {
    setIsGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-property-description", {
        body: { propertyData: formData },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        toast({
          title: "Description Generated",
          description: "AI-generated description has been added. Feel free to edit it.",
        });
      }
    } catch (error: any) {
      console.error("Generate description error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate description. Try filling in more property details first.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
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
              {/* Smart Paste */}
              <div className="space-y-3 p-4 bg-accent/30 border border-accent rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Smart Paste</h3>
                  <Badge variant="outline" className="text-xs">AI</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste property details in any format and AI will auto-fill the fields below
                </p>
                <Textarea
                  value={smartPasteText}
                  onChange={(e) => setSmartPasteText(e.target.value)}
                  placeholder="e.g. 123 Main St, 3 bed 2 bath, 1500 sqft single family home listed at $250,000. Off market, owner finance available..."
                  rows={3}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSmartPaste}
                  disabled={isParsing || !smartPasteText.trim()}
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3 w-3" />
                      Auto-Fill Fields
                    </>
                  )}
                </Button>
              </div>

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
                    <Label htmlFor="transaction_type" className="font-semibold">Deal Strategy *</Label>
                    <Select
                      value={formData.transaction_type}
                      onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                    >
                      <SelectTrigger id="transaction_type" className="border-2">
                        <SelectValue placeholder="Select deal strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {dealStrategyOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="market_status" className="font-semibold">Market Status</Label>
                    <Select
                      value={formData.market_status}
                      onValueChange={(value) => setFormData({ ...formData, market_status: value })}
                    >
                      <SelectTrigger id="market_status" className="border-2">
                        <SelectValue placeholder="Select market status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on_market">On Market</SelectItem>
                        <SelectItem value="off_market">Off Market</SelectItem>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Description</Label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDescription}
                    >
                      {isGeneratingDescription ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-3 w-3" />
                          AI Description
                        </>
                      )}
                    </Button>
                  </div>
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



              {/* Photo Upload */}
              <MultiPhotoUpload
                existingPhotos={existingPhotoUrls}
                onPhotosChange={(files, urls) => {
                  setPhotoFiles(files);
                  setExistingPhotoUrls(urls);
                }}
                maxPhotos={0}
              />

              {/* Video Upload */}
              <PropertyVideoUpload
                existingVideoUrl={videoUrl}
                existingVideoType={videoType}
                onVideoChange={(url, type, file) => {
                  setVideoUrl(url);
                  setVideoType(type);
                  setVideoFile(file || null);
                }}
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
              <Label>Deal Strategy</Label>
              <Select value={dealStrategyFilter} onValueChange={setDealStrategyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Strategies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strategies</SelectItem>
                  {dealStrategyOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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

          {(searchQuery || dealStrategyFilter !== "all" || statusFilter !== "all" || propertyTypeFilter !== "all") && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {filteredItems.length} of {items.length} properties
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setDealStrategyFilter("all");
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
                  <TableHead>Deal Strategy</TableHead>
                  <TableHead className="text-center">Details</TableHead>
                  <TableHead>Age</TableHead>
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
                              <img 
                                src={photoUrl} 
                                alt={item.name} 
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  // Hide broken image (e.g. HEIC format not supported by browser)
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<div class="h-full w-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg></div>';
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-primary">
                          ${item.price?.toLocaleString() || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isSupremeAdmin ? (
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
                        ) : (
                          <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
                            {item.status?.replace('_', ' ').toUpperCase() || 'AVAILABLE'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{item.property_type || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground capitalize">
                          {item.transaction_type ? item.transaction_type.replace(/_/g, ' ') : '—'}
                        </span>
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
                        {item.created_at ? (() => {
                          const uploaded = new Date(item.created_at);
                          const days = Math.max(0, Math.floor((Date.now() - uploaded.getTime()) / 86400000));
                          const ageColor = days <= 7 ? 'text-emerald-600' : days <= 30 ? 'text-amber-600' : 'text-rose-600';
                          return (
                            <div className="flex flex-col leading-tight">
                              <span className="text-xs text-muted-foreground">
                                {uploaded.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className={`text-xs font-medium ${ageColor}`}>
                                {days === 0 ? 'Today' : days === 1 ? '1 day old' : `${days} days old`}
                              </span>
                            </div>
                          );
                        })() : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
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




      {/* Bulk Upload Dialog */}
      <BulkPropertyUpload
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onSuccess={fetchInventory}
      />
    </div>
  );
}