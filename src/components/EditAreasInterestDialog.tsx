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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const KC_METRO_AREAS = [
  "Kansas City, MO",
  "Kansas City, KS",
  "Independence",
  "Blue Springs",
  "Lee's Summit",
  "Raytown",
  "Grandview",
  "Belton",
  "Pleasant Hill",
  "Pleasant Valley",
  "North Kansas City",
  "Gladstone",
  "Parkville",
  "Liberty",
  "Platte City",
  "Smithville",
  "Kearney",
  "Overland Park",
  "Leawood",
  "Lenexa",
  "Shawnee",
  "Edwardsville",
  "Bonner Springs",
  "Gardner",
];

interface EditAreasInterestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentData: {
    area: string | null;
    budget: string | null;
    downPayment: string | null;
    propertyType: string | null;
    financingType: string | null;
  };
  onSaved: () => void;
}

export const EditAreasInterestDialog = ({
  open,
  onOpenChange,
  leadId,
  currentData,
  onSaved,
}: EditAreasInterestDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // area can be comma-separated for multi-select
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [financingType, setFinancingType] = useState("");

  useEffect(() => {
    if (open) {
      const areas = currentData.area
        ? currentData.area.split(",").map((a) => a.trim()).filter(Boolean)
        : [];
      setSelectedAreas(areas);
      setBudget(currentData.budget || "");
      setDownPayment(currentData.downPayment || "");
      setPropertyType(currentData.propertyType || "");
      setFinancingType(currentData.financingType || "");
    }
  }, [open, currentData]);

  const addArea = (area: string) => {
    if (!selectedAreas.includes(area)) {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  const removeArea = (area: string) => {
    setSelectedAreas(selectedAreas.filter((a) => a !== area));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("leads")
        .update({
          area: selectedAreas.length > 0 ? selectedAreas.join(", ") : null,
          budget: budget || null,
          down_payment: downPayment || null,
          property_type: propertyType || null,
          financing_type: financingType || null,
          last_modified_by: user?.id,
        })
        .eq("id", leadId);

      if (error) throw error;

      toast({ title: "Success", description: "Areas of interest & budget updated" });
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Areas of Interest & Budget</DialogTitle>
          <DialogDescription>
            Update location preferences, budget, and property type criteria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Areas of Interest - multi-select */}
          <div className="space-y-2">
            <Label>Areas of Interest</Label>
            {selectedAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedAreas.map((area) => (
                  <Badge key={area} variant="secondary" className="gap-1 pr-1">
                    {area}
                    <button
                      type="button"
                      onClick={() => removeArea(area)}
                      className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Select onValueChange={addArea} value="">
              <SelectTrigger>
                <SelectValue placeholder="Add an area..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {KC_METRO_AREAS.filter((a) => !selectedAreas.includes(a)).map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger>
                <SelectValue placeholder="Select budget range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Under $100,000">Under $100,000</SelectItem>
                <SelectItem value="$100,000 - $150,000">$100,000 - $150,000</SelectItem>
                <SelectItem value="$150,000 - $200,000">$150,000 - $200,000</SelectItem>
                <SelectItem value="$200,000 - $250,000">$200,000 - $250,000</SelectItem>
                <SelectItem value="$250,000 - $300,000">$250,000 - $300,000</SelectItem>
                <SelectItem value="$300,000 - $400,000">$300,000 - $400,000</SelectItem>
                <SelectItem value="$400,000 - $500,000">$400,000 - $500,000</SelectItem>
                <SelectItem value="$500,000+">$500,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Down Payment */}
          <div className="space-y-2">
            <Label htmlFor="downPayment">Down Payment Available</Label>
            <Select value={downPayment} onValueChange={setDownPayment}>
              <SelectTrigger>
                <SelectValue placeholder="Select down payment range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Under $5,000">Under $5,000</SelectItem>
                <SelectItem value="$5,000 - $10,000">$5,000 - $10,000</SelectItem>
                <SelectItem value="$10,000 - $15,000">$10,000 - $15,000</SelectItem>
                <SelectItem value="$15,000 - $20,000">$15,000 - $20,000</SelectItem>
                <SelectItem value="$20,000 - $30,000">$20,000 - $30,000</SelectItem>
                <SelectItem value="$30,000 - $50,000">$30,000 - $50,000</SelectItem>
                <SelectItem value="$50,000 - $100,000">$50,000 - $100,000</SelectItem>
                <SelectItem value="$100,000+">$100,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label htmlFor="propertyType">Type of Property</Label>
            <Select
              value={propertyType}
              onValueChange={setPropertyType}
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
                <SelectItem value="Duplex">Duplex</SelectItem>
                <SelectItem value="Triplex">Triplex</SelectItem>
                <SelectItem value="Fourplex">Fourplex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Financing Type */}
          <div className="space-y-2">
            <Label htmlFor="financingType">Financing Type</Label>
            <Select
              value={financingType}
              onValueChange={setFinancingType}
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
