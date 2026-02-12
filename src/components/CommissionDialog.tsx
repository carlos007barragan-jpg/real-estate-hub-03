import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";

interface CommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  stageName: string;
  onSuccess?: () => void;
}

export const CommissionDialog = ({ open, onOpenChange, leadId, leadName, stageName, onSuccess }: CommissionDialogProps) => {
  const [commission, setCommission] = useState("");
  const [closeDate, setCloseDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!commission.trim()) {
      toast({ title: "Commission required", description: "Please enter the commission amount", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          commission: commission,
          close_date: closeDate,
          status: "won",
        })
        .eq("id", leadId);

      if (error) throw error;

      toast({ title: "🎉 Deal Won!", description: `Commission of $${commission} recorded for ${leadName}` });
      onOpenChange(false);
      setCommission("");
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
            <DollarSign className="h-5 w-5 text-primary" />
            Deal Won – Enter Commission
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{leadName}</span> has been moved to <span className="font-semibold">{stageName}</span>. Please enter the commission details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="commission">Commission Amount ($)</Label>
            <Input
              id="commission"
              type="number"
              placeholder="e.g. 5000"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Skip for Now</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Commission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
