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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ExternalLink, CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

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
  propertyIndex?: number;
}

export const EditDealPropertyDialog = ({
  open,
  onOpenChange,
  deal,
  onSaved,
  propertyIndex,
}: EditDealPropertyDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isInInventory, setIsInInventory] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [closeDate, setCloseDate] = useState<Date | undefined>(undefined);

  const type = deal?.transaction_type || "Buyer's";
  const isDefault = ["Unassigned", "Buyer's", "Rental"].includes(type);

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
        commission: deal.commission || "",
        agentPayout: deal.agent_payout || "",
        titleOffice: deal.title_office || "",
        pointsCharged: deal.points_charged || "",
        totalFee: deal.total_fee || "",
      });
      setCloseDate(deal.close_date ? new Date(deal.close_date) : undefined);
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
        commission: formData.commission || null,
        agent_payout: formData.agentPayout || null,
        title_office: formData.titleOffice || null,
        points_charged: formData.pointsCharged || null,
        total_fee: formData.totalFee || null,
        close_date: closeDate ? format(closeDate, "yyyy-MM-dd") : null,
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

  const getDialogTitle = () => {
    const suffix = propertyIndex !== undefined ? ` ${propertyIndex}` : "";
    switch (type) {
      case "Funding": return `Funding Property${suffix}`;
      case "Listing": return `Listing Property${suffix}`;
      case "Wholesale": return `Wholesale Property${suffix}`;
      case "Multifamily": return `Multifamily Property${suffix}`;
      case "Commercial": return `Commercial Property${suffix}`;
      default: return `Edit Property of Interest${suffix}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
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
              <div className="flex gap-2">
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
            </div>
          )}

          {/* Property Address - always shown */}
          <div className="space-y-2">
            <Label>Property of Interest</Label>
            <Input
              value={formData.propertyOfInterest}
              onChange={(e) => setFormData({ ...formData, propertyOfInterest: e.target.value })}
              placeholder="e.g., 123 Main St"
            />
          </div>

          <div className="space-y-2">
            <Label>Property Address</Label>
            <Input
              value={formData.propertyAddress}
              onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value, propertyOfInterest: e.target.value })}
              placeholder="Full property address"
            />
          </div>

          {/* Beds / Baths / Sqft - always shown */}
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

          {/* Property Type - always shown */}
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
                <SelectItem value="Duplex">Duplex</SelectItem>
                <SelectItem value="Triplex">Triplex</SelectItem>
                <SelectItem value="Fourplex">Fourplex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Financial fields - Sales Price / Down Payment */}
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

          {/* Commission / Agent Payout */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Commission</Label>
              <Input
                value={formData.commission}
                onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                placeholder="e.g. 3%"
              />
            </div>
            <div className="space-y-2">
              <Label>Agent Payout</Label>
              <Input
                value={formData.agentPayout}
                onChange={(e) => setFormData({ ...formData, agentPayout: e.target.value })}
                placeholder="$5,000"
              />
            </div>
          </div>

          {/* Points / Total Fee - for Funding/Wholesale */}
          {(type === "Funding" || type === "Wholesale") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points Charged</Label>
                <Input
                  value={formData.pointsCharged}
                  onChange={(e) => setFormData({ ...formData, pointsCharged: e.target.value })}
                  placeholder="2"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Fee</Label>
                <Input
                  value={formData.totalFee}
                  onChange={(e) => setFormData({ ...formData, totalFee: e.target.value })}
                  placeholder="$6,000"
                />
              </div>
            </div>
          )}

          {/* Title Office */}
          <div className="space-y-2">
            <Label>Title Office</Label>
            <Input
              value={formData.titleOffice}
              onChange={(e) => setFormData({ ...formData, titleOffice: e.target.value })}
              placeholder="Title office name"
            />
          </div>

          {/* Close Date */}
          <div className="space-y-2">
            <Label>Close Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {closeDate ? format(closeDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={closeDate} onSelect={setCloseDate} initialFocus />
              </PopoverContent>
            </Popover>
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
