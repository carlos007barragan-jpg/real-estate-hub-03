import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PropertyData {
  propertyAddress: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: string | null;
  budget: string | null;
  area: string | null;
  downPayment: string | null;
  financingType: string | null;
  propertyOfInterest: string | null;
  inventoryId: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  price: number | null;
}

interface EditPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentData: PropertyData;
  onSaved: () => void;
}

export const EditPropertyDialog = ({
  open,
  onOpenChange,
  leadId,
  currentData,
  onSaved,
}: EditPropertyDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isInInventory, setIsInInventory] = useState(!!currentData.inventoryId);
  
  const [formData, setFormData] = useState({
    propertyAddress: currentData.propertyAddress || "",
    propertyType: currentData.propertyType || "",
    bedrooms: currentData.bedrooms || 0,
    bathrooms: currentData.bathrooms || 0,
    sqft: currentData.sqft || "",
    budget: currentData.budget || "",
    area: currentData.area || "",
    downPayment: currentData.downPayment || "",
    financingType: currentData.financingType || "",
    propertyOfInterest: currentData.propertyOfInterest || "",
    inventoryId: currentData.inventoryId || "",
  });

  useEffect(() => {
    if (open) {
      fetchInventoryItems();
      // Reset form when dialog opens
      setFormData({
        propertyAddress: currentData.propertyAddress || "",
        propertyType: currentData.propertyType || "",
        bedrooms: currentData.bedrooms || 0,
        bathrooms: currentData.bathrooms || 0,
        sqft: currentData.sqft || "",
        budget: currentData.budget || "",
        area: currentData.area || "",
        downPayment: currentData.downPayment || "",
        financingType: currentData.financingType || "",
        propertyOfInterest: currentData.propertyOfInterest || "",
        inventoryId: currentData.inventoryId || "",
      });
      setIsInInventory(!!currentData.inventoryId);
    }
  }, [open, currentData]);

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, name, property_type, bedrooms, bathrooms, sqft, price")
        .order("name", { ascending: true });

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
    }
  };

  const handleInventorySelect = (inventoryId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === inventoryId);
    if (selectedItem) {
      setFormData({
        ...formData,
        inventoryId,
        propertyAddress: selectedItem.name,
        propertyType: selectedItem.property_type || "",
        bedrooms: selectedItem.bedrooms || 0,
        bathrooms: selectedItem.bathrooms || 0,
        sqft: selectedItem.sqft?.toString() || "",
        budget: selectedItem.price?.toString() || "",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        property_address: formData.propertyAddress || null,
        property_type: formData.propertyType || null,
        bedrooms: formData.bedrooms || null,
        bathrooms: formData.bathrooms || null,
        sqft: formData.sqft || null,
        budget: formData.budget || null,
        area: formData.area || null,
        down_payment: formData.downPayment || null,
        financing_type: formData.financingType || null,
        property_of_interest: formData.propertyOfInterest || null,
        inventory_id: isInInventory && formData.inventoryId ? formData.inventoryId : null,
      };

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property details updated",
      });

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property Details</DialogTitle>
          <DialogDescription>
            Update property information or link to an inventory property
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link to Inventory Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base font-medium">Property in Inventory</Label>
                <p className="text-sm text-muted-foreground">
                  Link this lead to a property from your inventory
                </p>
              </div>
            </div>
            <Switch
              checked={isInInventory}
              onCheckedChange={(checked) => {
                setIsInInventory(checked);
                if (!checked) {
                  setFormData({ ...formData, inventoryId: "" });
                }
              }}
            />
          </div>

          {/* Inventory Selection */}
          {isInInventory && (
            <div className="space-y-2">
              <Label htmlFor="inventoryId">Select Property from Inventory</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.inventoryId}
                  onValueChange={handleInventorySelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} - {item.property_type || "N/A"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.inventoryId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/inventory#${formData.inventoryId}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Property Details */}
          <div className="space-y-2">
            <Label htmlFor="propertyOfInterest">Property of Interest</Label>
            <Input
              id="propertyOfInterest"
              value={formData.propertyOfInterest}
              onChange={(e) => setFormData({ ...formData, propertyOfInterest: e.target.value })}
              placeholder="e.g., 123 Main St"
              disabled={isInInventory && !!formData.inventoryId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyAddress">Property Address</Label>
            <Input
              id="propertyAddress"
              value={formData.propertyAddress}
              onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
              placeholder="Full address"
              disabled={isInInventory && !!formData.inventoryId}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g., Downtown"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
                disabled={isInInventory && !!formData.inventoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Family">Single Family</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                  <SelectItem value="Land">Land</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
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
                onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                disabled={isInInventory && !!formData.inventoryId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })}
                disabled={isInInventory && !!formData.inventoryId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sqft">Square Feet</Label>
              <Input
                id="sqft"
                value={formData.sqft}
                onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                placeholder="2000"
                disabled={isInInventory && !!formData.inventoryId}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="$450,000"
                disabled={isInInventory && !!formData.inventoryId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="downPayment">Down Payment</Label>
              <Input
                id="downPayment"
                value={formData.downPayment}
                onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                placeholder="$50,000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="financingType">Financing Type</Label>
            <Select
              value={formData.financingType}
              onValueChange={(value) => setFormData({ ...formData, financingType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select financing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conventional">Conventional</SelectItem>
                <SelectItem value="fha">FHA</SelectItem>
                <SelectItem value="va">VA</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
