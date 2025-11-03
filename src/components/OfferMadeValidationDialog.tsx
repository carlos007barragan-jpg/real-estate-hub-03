import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OfferMadeValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | undefined;
  onComplete: () => void;
}

export function OfferMadeValidationDialog({ 
  open, 
  onOpenChange, 
  leadId, 
  onComplete 
}: OfferMadeValidationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [closeDate, setCloseDate] = useState<Date>();
  const [agent, setAgent] = useState("");
  const [commission, setCommission] = useState("");
  const [propertyOfInterest, setPropertyOfInterest] = useState("");
  const [titleOffice, setTitleOffice] = useState("");

  useEffect(() => {
    if (open && leadId) {
      fetchLeadData();
    }
  }, [open, leadId]);

  const fetchLeadData = async () => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("name, spouse_name, close_date, assigned_to, commission, property_of_interest, title_office")
        .eq("id", leadId)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name || "");
        setSpouseName(data.spouse_name || "");
        setCloseDate(data.close_date ? new Date(data.close_date) : undefined);
        setAgent(data.assigned_to || "");
        setCommission(data.commission || "");
        setPropertyOfInterest(data.property_of_interest || "");
        setTitleOffice(data.title_office || "");
      }
    } catch (error) {
      console.error("Error fetching lead data:", error);
      toast.error("Failed to load lead data");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!leadId) return;

    // Validate required fields
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!closeDate) {
      toast.error("Close date is required");
      return;
    }
    if (!agent.trim()) {
      toast.error("Agent is required");
      return;
    }
    if (!commission.trim()) {
      toast.error("Commission is required");
      return;
    }
    if (!propertyOfInterest.trim()) {
      toast.error("Property of interest is required");
      return;
    }
    if (!titleOffice.trim()) {
      toast.error("Title office is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          name,
          spouse_name: spouseName,
          close_date: format(closeDate, "yyyy-MM-dd"),
          assigned_to: agent,
          commission,
          property_of_interest: propertyOfInterest,
          title_office: titleOffice,
        })
        .eq("id", leadId);

      if (error) throw error;

      toast.success("Information saved");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating lead:", error);
      toast.error("Failed to save information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Required Information</DialogTitle>
          <DialogDescription>
            Please fill in all required fields before moving to "Offer Made" stage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              required
            />
          </div>

          <div>
            <Label htmlFor="spouseName">Spouse Name</Label>
            <Input
              id="spouseName"
              value={spouseName}
              onChange={(e) => setSpouseName(e.target.value)}
              placeholder="Spouse name"
            />
          </div>

          <div>
            <Label htmlFor="closeDate">Close Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !closeDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {closeDate ? format(closeDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={closeDate}
                  onSelect={setCloseDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="agent">Agent *</Label>
            <Input
              id="agent"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              placeholder="Assigned agent"
              required
            />
          </div>

          <div>
            <Label htmlFor="commission">Commission *</Label>
            <Input
              id="commission"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="Commission amount"
              required
            />
          </div>

          <div>
            <Label htmlFor="propertyOfInterest">Property of Interest *</Label>
            <Input
              id="propertyOfInterest"
              value={propertyOfInterest}
              onChange={(e) => setPropertyOfInterest(e.target.value)}
              placeholder="Property address or description"
              required
            />
          </div>

          <div>
            <Label htmlFor="titleOffice">Title Office *</Label>
            <Input
              id="titleOffice"
              value={titleOffice}
              onChange={(e) => setTitleOffice(e.target.value)}
              placeholder="Title office name"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleContinue} disabled={loading}>
              {loading ? "Saving..." : "Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
