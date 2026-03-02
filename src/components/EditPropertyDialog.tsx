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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ExternalLink, CalendarIcon, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

// KC Metro areas for investor multi-select
const KC_METRO_AREAS = [
  "Kansas City, MO", "Kansas City, KS", "Independence, MO", "Blue Springs, MO",
  "Lee's Summit, MO", "Raytown, MO", "Grandview, MO", "Belton, MO",
  "Pleasant Hill, MO", "Pleasant Valley, MO", "North Kansas City, MO",
  "Gladstone, MO", "Parkville, MO", "Liberty, MO", "Platte City, MO",
  "Smithville, MO", "Kearney, MO", "Overland Park, KS", "Leawood, KS",
  "Lenexa, KS", "Shawnee, KS", "Edwardsville, KS", "Bonner Springs, KS", "Gardner, KS",
];

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
  // New type-specific fields
  purchasePrice?: string | null;
  rehabAmount?: string | null;
  estimatedCreditScore?: string | null;
  estimatedCloseDate?: string | null;
  preferredLenderId?: string | null;
  listPrice?: string | null;
  town?: string | null;
  schoolDistrict?: string | null;
  contractPrice?: string | null;
  propertyCondition?: string | null;
  yearBuilt?: string | null;
  numberOfUnits?: number | null;
  unitMix?: string | null;
  capRate?: string | null;
  noi?: string | null;
  zoning?: string | null;
  commercialPropertyType?: string | null;
  timeframe?: string | null;
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

interface LenderContact {
  id: string;
  name: string;
  company: string | null;
}

interface EditPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentData: PropertyData;
  onSaved: () => void;
  transactionType?: string;
}

export const EditPropertyDialog = ({
  open,
  onOpenChange,
  leadId,
  currentData,
  onSaved,
  transactionType = "Unassigned",
}: EditPropertyDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lenderContacts, setLenderContacts] = useState<LenderContact[]>([]);
  const [isInInventory, setIsInInventory] = useState(!!currentData.inventoryId);
  
  // Investor areas multi-select
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const [formData, setFormData] = useState<any>({});
  const [closeDate, setCloseDate] = useState<Date | undefined>(undefined);

  const type = transactionType || "Unassigned";
  const isDefault = ["Unassigned", "Buyer's", "Rental"].includes(type);
  const showInventory = !["Investor's", "Unassigned"].includes(type);
  const inventoryLinked = isInInventory && !!formData.inventoryId;

  useEffect(() => {
    if (open) {
      fetchInventoryItems();
      if (type === "Funding") fetchLenderContacts();
      
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
        purchasePrice: currentData.purchasePrice || "",
        rehabAmount: currentData.rehabAmount || "",
        estimatedCreditScore: currentData.estimatedCreditScore || "",
        preferredLenderId: currentData.preferredLenderId || "",
        listPrice: currentData.listPrice || "",
        town: currentData.town || "",
        schoolDistrict: currentData.schoolDistrict || "",
        contractPrice: currentData.contractPrice || "",
        propertyCondition: currentData.propertyCondition || "",
        yearBuilt: currentData.yearBuilt || "",
        numberOfUnits: currentData.numberOfUnits || "",
        unitMix: currentData.unitMix || "",
        capRate: currentData.capRate || "",
        noi: currentData.noi || "",
        zoning: currentData.zoning || "",
        commercialPropertyType: currentData.commercialPropertyType || "",
        timeframe: currentData.timeframe || "",
      });
      setIsInInventory(!!currentData.inventoryId);
      setCloseDate(currentData.estimatedCloseDate ? new Date(currentData.estimatedCloseDate) : undefined);
      
      // Investor areas
      const areas = currentData.area
        ? currentData.area.split(",").map(a => a.trim()).filter(Boolean)
        : [];
      setSelectedAreas(areas);
    }
  }, [open, currentData, type]);

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

  const fetchLenderContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, company")
        .eq("category", "Lender")
        .order("name", { ascending: true });
      if (error) throw error;
      setLenderContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching lender contacts:", error);
    }
  };

  const handleInventorySelect = (inventoryId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === inventoryId);
    if (selectedItem) {
      const updates: any = {
        ...formData,
        inventoryId,
        propertyAddress: selectedItem.name,
        propertyType: selectedItem.property_type || "",
        bedrooms: selectedItem.bedrooms || 0,
        bathrooms: selectedItem.bathrooms || 0,
        sqft: selectedItem.sqft?.toString() || "",
      };
      // Map price based on transaction type
      if (["Listing", "Wholesale"].includes(type)) {
        updates.listPrice = selectedItem.price?.toString() || "";
      } else if (["Funding", "Multifamily", "Commercial"].includes(type)) {
        updates.purchasePrice = selectedItem.price?.toString() || "";
      } else {
        updates.budget = selectedItem.price?.toString() || "";
      }
      setFormData(updates);
    }
  };

  const addArea = (area: string) => {
    if (!selectedAreas.includes(area)) setSelectedAreas([...selectedAreas, area]);
  };
  const removeArea = (area: string) => {
    setSelectedAreas(selectedAreas.filter(a => a !== area));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updateData: any = {
        property_address: formData.propertyAddress || null,
        property_type: formData.propertyType || null,
        bedrooms: formData.bedrooms || null,
        bathrooms: formData.bathrooms || null,
        sqft: formData.sqft || null,
        property_of_interest: formData.propertyOfInterest || null,
        inventory_id: isInInventory && formData.inventoryId ? formData.inventoryId : null,
        last_modified_by: user?.id,
      };

      // Type-specific saves
      if (isDefault) {
        updateData.sales_price = formData.salesPrice || formData.budget || null;
        updateData.area = formData.area || null;
        updateData.down_payment = formData.downPayment || null;
      } else if (type === "Funding") {
        updateData.purchase_price = formData.purchasePrice || null;
        updateData.rehab_amount = formData.rehabAmount || null;
        updateData.estimated_credit_score = formData.estimatedCreditScore || null;
        updateData.estimated_close_date = closeDate ? format(closeDate, "yyyy-MM-dd") : null;
        updateData.preferred_lender_id = formData.preferredLenderId || null;
      } else if (type === "Listing") {
        updateData.list_price = formData.listPrice || null;
        updateData.town = formData.town || null;
        updateData.school_district = formData.schoolDistrict || null;
      } else if (type === "Wholesale") {
        updateData.contract_price = formData.contractPrice || null;
        updateData.list_price = formData.listPrice || null;
        updateData.property_condition = formData.propertyCondition || null;
        updateData.year_built = formData.yearBuilt || null;
      } else if (type === "Multifamily") {
        updateData.number_of_units = formData.numberOfUnits ? parseInt(formData.numberOfUnits) : null;
        updateData.unit_mix = formData.unitMix || null;
        updateData.cap_rate = formData.capRate || null;
        updateData.noi = formData.noi || null;
        updateData.purchase_price = formData.purchasePrice || null;
        updateData.year_built = formData.yearBuilt || null;
      } else if (type === "Commercial") {
        updateData.commercial_property_type = formData.commercialPropertyType || null;
        updateData.cap_rate = formData.capRate || null;
        updateData.noi = formData.noi || null;
        updateData.purchase_price = formData.purchasePrice || null;
        updateData.zoning = formData.zoning || null;
      } else if (type === "Investor's") {
        updateData.area = selectedAreas.length > 0 ? selectedAreas.join(", ") : null;
        updateData.timeframe = formData.timeframe || null;
      }

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

      if (error) throw error;

      toast({ title: "Success", description: "Property details updated" });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getDialogTitle = () => {
    switch (type) {
      case "Funding": return "Funding Property";
      case "Listing": return "Listing Property";
      case "Wholesale": return "Wholesale Property";
      case "Multifamily": return "Multifamily Property";
      case "Commercial": return "Commercial Property";
      case "Investor's": return "Investor Profile";
      default: return "Edit Property Details";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {type === "Investor's" ? "Update investor profile and preferences" : "Update property information or link to an inventory property"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Inventory Toggle - for all types except Investor */}
          {showInventory && (
            <>
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
                  onCheckedChange={(checked) => {
                    setIsInInventory(checked);
                    if (!checked) setFormData({ ...formData, inventoryId: "" });
                  }}
                />
              </div>
              {isInInventory && (
                <div className="space-y-2">
                  <Label>Select Property from Inventory</Label>
                  <div className="flex gap-2">
                    <Select value={formData.inventoryId} onValueChange={handleInventorySelect}>
                      <SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - {item.property_type || "N/A"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.inventoryId && (
                      <Button type="button" variant="outline" size="icon" onClick={() => navigate(`/inventory#${formData.inventoryId}`)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* === INVESTOR TYPE === */}
          {type === "Investor's" && (
            <>
              <div className="space-y-2">
                <Label>Areas of Interest</Label>
                {selectedAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedAreas.map((area) => (
                      <Badge key={area} variant="secondary" className="gap-1 pr-1">
                        {area}
                        <button type="button" onClick={() => removeArea(area)} className="ml-0.5 hover:bg-muted rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Select onValueChange={addArea} value="">
                  <SelectTrigger><SelectValue placeholder="Add an area..." /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {KC_METRO_AREAS.filter(a => !selectedAreas.includes(a)).map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timeframe to Close</Label>
                <Input value={formData.timeframe} onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })} placeholder="e.g., 30-60 days" />
              </div>
            </>
          )}

          {/* === DEFAULT (Buyer/Renter/Unassigned) === */}
          {isDefault && (
            <>
              <div className="space-y-2">
                <Label>Property of Interest</Label>
                <Input value={formData.propertyOfInterest} onChange={(e) => setFormData({ ...formData, propertyOfInterest: e.target.value })} placeholder="e.g., 123 Main St" disabled={inventoryLinked} />
              </div>
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input value={formData.propertyAddress} onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })} placeholder="Full address" disabled={inventoryLinked} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <Input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })} disabled={inventoryLinked} />
                </div>
                <div className="space-y-2">
                  <Label>Bathrooms</Label>
                  <Input type="number" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })} disabled={inventoryLinked} />
                </div>
                <div className="space-y-2">
                  <Label>Square Feet</Label>
                  <Input value={formData.sqft} onChange={(e) => setFormData({ ...formData, sqft: e.target.value })} placeholder="2000" disabled={inventoryLinked} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sales Price</Label>
                  <Input value={formData.salesPrice || formData.budget} onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value, budget: e.target.value })} placeholder="$450,000" disabled={inventoryLinked} />
                </div>
                <div className="space-y-2">
                  <Label>Down Payment</Label>
                  <Input value={formData.downPayment} onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })} placeholder="$50,000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={formData.propertyType} onValueChange={(v) => setFormData({ ...formData, propertyType: v })} disabled={inventoryLinked}>
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
            </>
          )}

          {/* === FUNDING === */}
          {type === "Funding" && (
            <>
              <div className="space-y-2">
                <Label>Property of Interest</Label>
                <Input value={formData.propertyOfInterest} onChange={(e) => setFormData({ ...formData, propertyOfInterest: e.target.value })} disabled={inventoryLinked} />
              </div>
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input value={formData.propertyAddress} onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })} disabled={inventoryLinked} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Bedrooms</Label><Input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })} disabled={inventoryLinked} /></div>
                <div className="space-y-2"><Label>Bathrooms</Label><Input type="number" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })} disabled={inventoryLinked} /></div>
                <div className="space-y-2"><Label>Sqft</Label><Input value={formData.sqft} onChange={(e) => setFormData({ ...formData, sqft: e.target.value })} disabled={inventoryLinked} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Price</Label>
                  <Input value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} placeholder="$300,000" />
                </div>
                <div className="space-y-2">
                  <Label>Rehab Amount Needed</Label>
                  <Input value={formData.rehabAmount} onChange={(e) => setFormData({ ...formData, rehabAmount: e.target.value })} placeholder="$50,000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Credit Score</Label>
                  <Input value={formData.estimatedCreditScore} onChange={(e) => setFormData({ ...formData, estimatedCreditScore: e.target.value })} placeholder="720" />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Close Date</Label>
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
              <div className="space-y-2">
                <Label>Preferred Lender</Label>
                <Select value={formData.preferredLenderId} onValueChange={(v) => setFormData({ ...formData, preferredLenderId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select lender contact" /></SelectTrigger>
                  <SelectContent>
                    {lenderContacts.map((lender) => (
                      <SelectItem key={lender.id} value={lender.id}>
                        {lender.name}{lender.company ? ` (${lender.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* === LISTING === */}
          {type === "Listing" && (
            <>
              <div className="space-y-2">
                <Label>Property of Interest</Label>
                <Input value={formData.propertyOfInterest} onChange={(e) => setFormData({ ...formData, propertyOfInterest: e.target.value })} disabled={inventoryLinked} />
              </div>
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input value={formData.propertyAddress} onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })} disabled={inventoryLinked} />
              </div>
              <div className="space-y-2">
                <Label>List Price</Label>
                <Input value={formData.listPrice} onChange={(e) => setFormData({ ...formData, listPrice: e.target.value })} placeholder="$450,000" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Beds</Label><Input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })} disabled={inventoryLinked} /></div>
                <div className="space-y-2"><Label>Baths</Label><Input type="number" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })} disabled={inventoryLinked} /></div>
                <div className="space-y-2"><Label>Sqft</Label><Input value={formData.sqft} onChange={(e) => setFormData({ ...formData, sqft: e.target.value })} disabled={inventoryLinked} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Town</Label>
                  <Input value={formData.town} onChange={(e) => setFormData({ ...formData, town: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>School District</Label>
                  <Input value={formData.schoolDistrict} onChange={(e) => setFormData({ ...formData, schoolDistrict: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {/* === WHOLESALE === */}
          {type === "Wholesale" && (
            <>
              <div className="space-y-2">
                <Label>Property of Interest</Label>
                <Input value={formData.propertyOfInterest} onChange={(e) => setFormData({ ...formData, propertyOfInterest: e.target.value })} disabled={inventoryLinked} />
              </div>
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input value={formData.propertyAddress} onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })} disabled={inventoryLinked} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Contract Price</Label><Input value={formData.contractPrice} onChange={(e) => setFormData({ ...formData, contractPrice: e.target.value })} placeholder="$200,000" /></div>
                <div className="space-y-2"><Label>List Price</Label><Input value={formData.listPrice} onChange={(e) => setFormData({ ...formData, listPrice: e.target.value })} placeholder="$250,000" /></div>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Input value={formData.propertyCondition} onChange={(e) => setFormData({ ...formData, propertyCondition: e.target.value })} placeholder="e.g., Needs rehab" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Beds</Label><Input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })} disabled={inventoryLinked} /></div>
                <div className="space-y-2"><Label>Baths</Label><Input type="number" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })} disabled={inventoryLinked} /></div>
                <div className="space-y-2"><Label>Sqft</Label><Input value={formData.sqft} onChange={(e) => setFormData({ ...formData, sqft: e.target.value })} disabled={inventoryLinked} /></div>
              </div>
              <div className="space-y-2">
                <Label>Year Built</Label>
                <Input value={formData.yearBuilt} onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })} placeholder="1985" />
              </div>
            </>
          )}

          {/* === MULTIFAMILY === */}
          {type === "Multifamily" && (
            <>
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input value={formData.propertyAddress} onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })} disabled={inventoryLinked} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Number of Units</Label><Input type="number" value={formData.numberOfUnits} onChange={(e) => setFormData({ ...formData, numberOfUnits: e.target.value })} placeholder="4" /></div>
                <div className="space-y-2"><Label>Unit Mix</Label><Input value={formData.unitMix} onChange={(e) => setFormData({ ...formData, unitMix: e.target.value })} placeholder="2x 1BR, 2x 2BR" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cap Rate</Label><Input value={formData.capRate} onChange={(e) => setFormData({ ...formData, capRate: e.target.value })} placeholder="7.5%" /></div>
                <div className="space-y-2"><Label>NOI</Label><Input value={formData.noi} onChange={(e) => setFormData({ ...formData, noi: e.target.value })} placeholder="$60,000" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Purchase Price</Label><Input value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} placeholder="$800,000" /></div>
                <div className="space-y-2"><Label>Year Built</Label><Input value={formData.yearBuilt} onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })} placeholder="1975" /></div>
              </div>
            </>
          )}

          {/* === COMMERCIAL === */}
          {type === "Commercial" && (
            <>
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input value={formData.propertyAddress} onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })} disabled={inventoryLinked} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property Sub-Type</Label>
                  <Select value={formData.commercialPropertyType} onValueChange={(v) => setFormData({ ...formData, commercialPropertyType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Industrial">Industrial</SelectItem>
                      <SelectItem value="Mixed Use">Mixed Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Sqft</Label><Input value={formData.sqft} onChange={(e) => setFormData({ ...formData, sqft: e.target.value })} disabled={inventoryLinked} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cap Rate</Label><Input value={formData.capRate} onChange={(e) => setFormData({ ...formData, capRate: e.target.value })} placeholder="6.5%" /></div>
                <div className="space-y-2"><Label>NOI</Label><Input value={formData.noi} onChange={(e) => setFormData({ ...formData, noi: e.target.value })} placeholder="$120,000" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Purchase Price</Label><Input value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} placeholder="$1,500,000" /></div>
                <div className="space-y-2"><Label>Zoning</Label><Input value={formData.zoning} onChange={(e) => setFormData({ ...formData, zoning: e.target.value })} placeholder="C-2" /></div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};