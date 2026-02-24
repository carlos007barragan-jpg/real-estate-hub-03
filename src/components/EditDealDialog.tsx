import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeamMember {
  user_id: string;
  name: string;
}

interface EditDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | undefined;
  onSave: () => void;
}

export function EditDealDialog({ open, onOpenChange, leadId, onSave }: EditDealDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [closeDate, setCloseDate] = useState<Date>();
  const [agent, setAgent] = useState("");
  const [commission, setCommission] = useState("");
  const [salesPrice, setSalesPrice] = useState("");
  const [agentPayout, setAgentPayout] = useState("");
  const [propertyOfInterest, setPropertyOfInterest] = useState("");
  const [titleOffice, setTitleOffice] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (open) {
      fetchTeamMembers();
      if (leadId) {
        fetchLeadData();
      }
    }
  }, [open, leadId]);

  const fetchTeamMembers = async () => {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) return;

      // Fetch all profiles in the organization
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .eq("organization_id", profile.organization_id);

      if (error) throw error;

      const members = (profiles || []).map((p) => ({
        user_id: p.user_id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown",
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  const fetchLeadData = async () => {
    if (!leadId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("name, spouse_name, close_date, assigned_to, commission, property_of_interest, title_office, sales_price, agent_payout")
        .eq("id", leadId)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name || "");
        setSpouseName(data.spouse_name || "");
        setCloseDate(data.close_date ? new Date(data.close_date) : undefined);
        setAgent(data.assigned_to || "");
        setCommission(data.commission || "");
        setSalesPrice((data as any).sales_price || "");
        setAgentPayout((data as any).agent_payout || "");
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

  const handleSave = async () => {
    if (!leadId) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("leads")
        .update({
          name,
          spouse_name: spouseName,
          close_date: closeDate ? format(closeDate, "yyyy-MM-dd") : null,
          assigned_to: agent,
          commission,
          sales_price: salesPrice || null,
          agent_payout: agentPayout || null,
          property_of_interest: propertyOfInterest,
          title_office: titleOffice,
          last_modified_by: user?.id,
        } as any)
        .eq("id", leadId);

      if (error) throw error;

      toast.success("Deal updated successfully");
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating lead:", error);
      toast.error("Failed to update deal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
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
            <Label htmlFor="closeDate">Close Date</Label>
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
            <Label htmlFor="agent">Agent</Label>
            <Select value={agent} onValueChange={setAgent}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="not_assigned">Not Assigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.name}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="salesPrice">Sales Price</Label>
            <Input
              id="salesPrice"
              value={salesPrice}
              onChange={(e) => setSalesPrice(e.target.value)}
              placeholder="Final sale price"
            />
          </div>

          <div>
            <Label htmlFor="commission">Commission (Agency)</Label>
            <Input
              id="commission"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="Agency commission amount"
            />
          </div>

          <div>
            <Label htmlFor="agentPayout">Agent Payout</Label>
            <Input
              id="agentPayout"
              value={agentPayout}
              onChange={(e) => setAgentPayout(e.target.value)}
              placeholder="Amount paid to closing agent"
            />
          </div>

          <div>
            <Label htmlFor="propertyOfInterest">Property of Interest</Label>
            <Input
              id="propertyOfInterest"
              value={propertyOfInterest}
              onChange={(e) => setPropertyOfInterest(e.target.value)}
              placeholder="Property address or description"
            />
          </div>

          <div>
            <Label htmlFor="titleOffice">Title Office</Label>
            <Input
              id="titleOffice"
              value={titleOffice}
              onChange={(e) => setTitleOffice(e.target.value)}
              placeholder="Title office name"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
