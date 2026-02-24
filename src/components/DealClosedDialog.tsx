import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";

interface DealClosedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  stageName: string;
  pipelineName?: string;
  propertyOfInterest?: string;
  onSuccess?: () => void;
}

export const DealClosedDialog = ({ open, onOpenChange, leadId, leadName, stageName, pipelineName, propertyOfInterest, onSuccess }: DealClosedDialogProps) => {
  const isHardMoney = pipelineName?.toLowerCase().includes("hard money");
  const priceLabel = isHardMoney ? "Total Financed ($)" : "Sale Price ($)";
  const pricePlaceholder = isHardMoney ? "e.g. 250000" : "e.g. 350000";
  const [salesPrice, setSalesPrice] = useState("");
  const [closeDate, setCloseDate] = useState(new Date().toISOString().split("T")[0]);
  const [property, setProperty] = useState(propertyOfInterest || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update lead with sale details
      const { error } = await supabase
        .from("leads")
        .update({
          sales_price: salesPrice || null,
          close_date: closeDate,
          property_of_interest: property || null,
          status: "won",
        } as any)
        .eq("id", leadId);

      if (error) throw error;

      // Get current user's profile for the notification message
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.organization_id) {
        const closerName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "A team member";

        // Find all org members with admin/supreme_admin roles
        const { data: orgProfiles } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("organization_id", profile.organization_id);

        if (orgProfiles) {
          const orgUserIds = orgProfiles.map(p => p.user_id);

          const { data: adminRoles } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("role", ["admin", "supreme_admin"])
            .in("user_id", orgUserIds);

          if (adminRoles && adminRoles.length > 0) {
            const priceDisplay = salesPrice ? `$${Number(salesPrice).toLocaleString()}` : "Not entered";
            const notifications: any[] = [];

            adminRoles.forEach(r => {
              // Deal closed notification for all admins
              notifications.push({
                user_id: r.user_id,
                title: `🎉 Deal Closed: ${leadName}`,
                description: `${closerName} closed a deal with ${leadName}. ${isHardMoney ? 'Total financed' : 'Sale price'}: ${priceDisplay}.`,
                type: "deal_closed",
                event_type: "deal_closed",
                link: `/leads/${leadId}`,
                entity_id: leadId,
                entity_type: "lead",
                organization_id: profile.organization_id,
                read: false,
              });

              // Commission entry notification for supreme admins only
              if (r.role === "supreme_admin") {
                notifications.push({
                  user_id: r.user_id,
                  title: `Commission Entry Needed: ${leadName}`,
                  description: `${closerName} closed a deal with ${leadName}. ${isHardMoney ? 'Total financed' : 'Sale price'}: ${priceDisplay}. Please enter the commission and agent payout.`,
                  type: "commission_entry_needed",
                  link: `/leads/${leadId}`,
                  entity_id: leadId,
                  entity_type: "lead",
                  organization_id: profile.organization_id,
                  read: false,
                });
              }
            });

            await supabase.from("notifications").insert(notifications);

            // Auto-create ONE commission task assigned to all Supreme Admins
            const supremeAdmins = adminRoles.filter(r => r.role === "supreme_admin");
            if (supremeAdmins.length > 0) {
              const priceFieldLabel = isHardMoney ? "Total financed" : "Sale price";
              const nextDay = new Date(closeDate);
              nextDay.setDate(nextDay.getDate() + 1);
              const dueDateStr = nextDay.toISOString();

              const { data: taskData } = await supabase.from("tasks").insert({
                lead_id: leadId,
                user_id: supremeAdmins[0].user_id,
                title: `Enter commission & payout: ${leadName}`,
                description: `${closerName} closed a deal with ${leadName}. ${priceFieldLabel}: ${priceDisplay}. Property: ${property || "Not entered"}. Close date: ${closeDate}. Please enter the total commission and agent payouts.`,
                due_date: dueDateStr,
                status: "pending",
              }).select("id").single();

              // Assign all Supreme Admins to the single task
              if (taskData) {
                const assigneeRows = supremeAdmins.map(sa => ({ task_id: taskData.id, user_id: sa.user_id }));
                await supabase.from("task_assignees").insert(assigneeRows);
              }
            }
          }
        }
      }

      toast({ title: "🎉 Deal Won!", description: `Sale details recorded for ${leadName}` });
      onOpenChange(false);
      setSalesPrice("");
      setProperty("");
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Deal Closed – Confirm Details
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{leadName}</span> has been moved to <span className="font-semibold">{stageName}</span>. Please confirm the sale details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="salesPrice">{priceLabel}</Label>
            <Input
              id="salesPrice"
              type="number"
              placeholder={pricePlaceholder}
              value={salesPrice}
              onChange={(e) => setSalesPrice(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="closeDate">Close Date</Label>
            <Input
              id="closeDate"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="property">Property Purchased</Label>
            <Input
              id="property"
              type="text"
              placeholder="Property address or description"
              value={property}
              onChange={(e) => setProperty(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Skip for Now</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Confirm Deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
