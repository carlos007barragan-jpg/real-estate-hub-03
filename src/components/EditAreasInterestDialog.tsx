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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const KC_METRO_AREAS = [
  "Kansas City, MO", "Kansas City, KS", "Independence, MO", "Blue Springs, MO",
  "Lee's Summit, MO", "Raytown, MO", "Grandview, MO", "Belton, MO",
  "Pleasant Hill, MO", "Pleasant Valley, MO", "North Kansas City, MO",
  "Gladstone, MO", "Parkville, MO", "Liberty, MO", "Platte City, MO",
  "Smithville, MO", "Kearney, MO", "Overland Park, KS", "Leawood, KS",
  "Lenexa, KS", "Shawnee, KS", "Edwardsville, KS", "Bonner Springs, KS", "Gardner, KS",
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
    // New type-specific fields
    titleCompany?: string | null;
    loanDetails?: string | null;
    llcInformation?: string | null;
    listingDocuments?: string | null;
    titleOffice?: string | null;
  };
  onSaved: () => void;
  transactionType?: string;
}

export const EditAreasInterestDialog = ({
  open,
  onOpenChange,
  leadId,
  currentData,
  onSaved,
  transactionType = "Unassigned",
}: EditAreasInterestDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const type = transactionType || "Unassigned";
  const isDefault = ["Unassigned", "Buyer's", "Rental"].includes(type);

  // Default fields
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [financingType, setFinancingType] = useState("");

  // Type-specific fields
  const [titleCompany, setTitleCompany] = useState("");
  const [loanDetails, setLoanDetails] = useState("");
  const [llcInformation, setLlcInformation] = useState("");
  const [listingDocuments, setListingDocuments] = useState("");
  const [titleOffice, setTitleOffice] = useState("");

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
      setTitleCompany(currentData.titleCompany || "");
      setLoanDetails(currentData.loanDetails || "");
      setLlcInformation(currentData.llcInformation || "");
      setListingDocuments(currentData.listingDocuments || "");
      setTitleOffice(currentData.titleOffice || "");
    }
  }, [open, currentData]);

  const addArea = (area: string) => {
    if (!selectedAreas.includes(area)) setSelectedAreas([...selectedAreas, area]);
  };
  const removeArea = (area: string) => {
    setSelectedAreas(selectedAreas.filter((a) => a !== area));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: any = { last_modified_by: user?.id };

      if (isDefault) {
        updateData.area = selectedAreas.length > 0 ? selectedAreas.join(", ") : null;
        updateData.budget = budget || null;
        updateData.down_payment = downPayment || null;
        updateData.property_type = propertyType || null;
        updateData.financing_type = financingType || null;
      } else if (type === "Funding") {
        updateData.title_company = titleCompany || null;
        updateData.loan_details = loanDetails || null;
        updateData.llc_information = llcInformation || null;
      } else if (type === "Listing") {
        updateData.listing_documents = listingDocuments || null;
      } else if (type === "Wholesale") {
        updateData.title_office = titleOffice || null;
      }
      // Multifamily/Commercial/Investor: no second-card fields to save (or handled elsewhere)

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", leadId);

      if (error) throw error;

      toast({ title: "Success", description: "Details updated" });
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
      case "Funding": return "Loan & LLC Details";
      case "Listing": return "Listing Requirements";
      case "Wholesale": return "Transaction Details";
      case "Multifamily":
      case "Commercial": return "Investment Analysis";
      default: return "Areas of Interest & Budget";
    }
  };

  // Investor and Multifamily/Commercial don't show this dialog
  if (["Investor's", "Multifamily", "Commercial"].includes(type)) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {isDefault ? "Update location preferences, budget, and property type criteria" : `Update ${getDialogTitle().toLowerCase()} for this lead`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* === DEFAULT (Buyer/Renter/Unassigned) === */}
          {isDefault && (
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
                    {KC_METRO_AREAS.filter((a) => !selectedAreas.includes(a)).map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Budget</Label>
                <Select value={budget} onValueChange={setBudget}>
                  <SelectTrigger><SelectValue placeholder="Select budget range" /></SelectTrigger>
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
              <div className="space-y-2">
                <Label>Down Payment Available</Label>
                <Select value={downPayment} onValueChange={setDownPayment}>
                  <SelectTrigger><SelectValue placeholder="Select down payment range" /></SelectTrigger>
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
              <div className="space-y-2">
                <Label>Type of Property</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
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
              <div className="space-y-2">
                <Label>Financing Type</Label>
                <Select value={financingType} onValueChange={setFinancingType}>
                  <SelectTrigger><SelectValue placeholder="Select financing" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conventional">Conventional</SelectItem>
                    <SelectItem value="fha">FHA</SelectItem>
                    <SelectItem value="va">VA</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* === FUNDING === */}
          {type === "Funding" && (
            <>
              <div className="space-y-2">
                <Label>Title Company</Label>
                <Input value={titleCompany} onChange={(e) => setTitleCompany(e.target.value)} placeholder="Enter title company name" />
              </div>
              <div className="space-y-2">
                <Label>Loan Details</Label>
                <Textarea value={loanDetails} onChange={(e) => setLoanDetails(e.target.value)} placeholder="Enter loan details..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>LLC Information</Label>
                <Textarea value={llcInformation} onChange={(e) => setLlcInformation(e.target.value)} placeholder="Enter LLC information..." rows={3} />
              </div>
            </>
          )}

          {/* === LISTING === */}
          {type === "Listing" && (
            <div className="space-y-2">
              <Label>Listing Documents / Notes</Label>
              <Textarea value={listingDocuments} onChange={(e) => setListingDocuments(e.target.value)} placeholder="Enter listing documents or requirements notes..." rows={5} />
            </div>
          )}

          {/* === WHOLESALE === */}
          {type === "Wholesale" && (
            <div className="space-y-2">
              <Label>Title Office</Label>
              <Input value={titleOffice} onChange={(e) => setTitleOffice(e.target.value)} placeholder="Enter title office name" />
            </div>
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