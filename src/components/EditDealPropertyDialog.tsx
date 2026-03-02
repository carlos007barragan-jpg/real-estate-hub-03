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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ExternalLink, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InventoryItem {
  id: string;
  name: string;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  price: number | null;
}

interface EditDealPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: any;
  onSaved: () => void;
}

export const EditDealPropertyDialog = ({
  open,
  onOpenChange,
  deal,
  onSaved,
}: EditDealPropertyDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isInInventory, setIsInInventory] = useState(false);

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (open && deal) {
      fetchInventoryItems();
      setFormData({
        propertyOfInterest: deal.property_of_interest || "",
        propertyAddress: deal.property_address || "",
        propertyType: deal.property_type || "",
        bedrooms: deal.bedrooms || 0,
        bathrooms: deal.bathrooms || 0,
        sqft: deal.sqft || "",
        salesPrice: deal.sales_price || "",
        downPayment: deal.down_payment || "",
      });
      setIsInInventory(false);
    }
  }, [open, deal]);

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
        propertyOfInterest: selectedItem.name,
        propertyAddress: selectedItem.name,
        propertyType: selectedItem.property_type || "",
        bedrooms: selectedItem.bedrooms || 0,
        bathrooms: selectedItem.bathrooms || 0,
        sqft: selectedItem.sqft?.toString() || "",
        salesPrice: selectedItem.price?.toString() || "",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        property_of_interest: formData.propertyOfInterest || null,
        property_address: formData.propertyAddress || null,
        property_type: formData.propertyType || null,
        bedrooms: formData.bedrooms || null,
        bathrooms: formData.bathrooms || null,
        sqft: formData.sqft || null,
        sales_price: formData.salesPrice || null,
        down_payment: formData.downPayment || null,
      };

      const { error } = await supabase
        .from("lead_deals")
        .update(updateData)
        .eq("id", deal.id);

      if (error) throw error;

      toast({ title: "Success", description: "Deal property details updated" });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property of Interest — {deal?.deal_label || deal?.transaction_type || "Deal"}</DialogTitle>
          <DialogDescription>Update the property address and details for this transaction</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Inventory Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base font-medium">Property in Inventory</Label>
                <p className="text-sm text-muted-foreground">Link to a property from your inventory</p>
              </div>
            </div>
            <Switch
              checked={isInInventory}
              onCheckedChange={setIsInInventory}
            />
          </div>

          {isInInventory && (
            <div className="space-y-2">
              <Label>Select Property from Inventory</Label>
              <Select onValueChange={handleInventorySelect}>
                <SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {item.property_type || "N/A"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Property Address</Label>
            <Input
              value={formData.propertyAddress}
              onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value, propertyOfInterest: e.target.value })}
              placeholder="Full property address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bedrooms</Label>
              <Input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bathrooms</Label>
              <Input
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Square Feet</Label>
              <Input
                value={formData.sqft}
                onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                placeholder="2000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sales Price</Label>
              <Input
                value={formData.salesPrice}
                onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value })}
                placeholder="$450,000"
              />
            </div>
            <div className="space-y-2">
              <Label>Down Payment</Label>
              <Input
                value={formData.downPayment}
                onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                placeholder="$50,000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select value={formData.propertyType} onValueChange={(v) => setFormData({ ...formData, propertyType: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
