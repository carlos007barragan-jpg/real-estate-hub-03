import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PropertyApprovalDialogProps {
  property: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PropertyApprovalDialog({ property, open, onOpenChange, onSuccess }: PropertyApprovalDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    arv: property?.arv || "",
    estimatedRepairs: property?.estimated_repairs || "",
    downPayment: property?.down_payment || "",
    maxLoanAmount: property?.max_loan_amount || "",
    calculatedRehabBudget: property?.calculated_rehab_budget || "",
    marketCompsCompleted: property?.market_comps_completed || false,
    arvEntered: property?.arv_entered || false,
    adminNotes: property?.admin_notes || "",
    showOnPublicPage: property?.show_on_public_page !== false, // Default to true
  });

  // Calculate 65% rule values
  const calculate65Rule = () => {
    const arvValue = parseFloat(formData.arv as string) || 0;
    const purchasePrice = parseFloat(property?.price) || 0;
    const maxLoan = arvValue * 0.65;
    const suggestedDown = purchasePrice * 0.1;
    const rehabBudget = maxLoan - purchasePrice;

    setFormData({
      ...formData,
      maxLoanAmount: maxLoan.toFixed(2),
      downPayment: suggestedDown.toFixed(2),
      calculatedRehabBudget: rehabBudget > 0 ? rehabBudget.toFixed(2) : "0",
      arvEntered: true,
    });
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("inventory")
        .update({
          arv: parseFloat(formData.arv as string) || null,
          estimated_repairs: parseFloat(formData.estimatedRepairs as string) || null,
          down_payment: parseFloat(formData.downPayment as string) || null,
          max_loan_amount: parseFloat(formData.maxLoanAmount as string) || null,
          calculated_rehab_budget: parseFloat(formData.calculatedRehabBudget as string) || null,
          market_comps_completed: formData.marketCompsCompleted,
          arv_entered: formData.arvEntered,
          admin_notes: formData.adminNotes,
          show_on_public_page: formData.showOnPublicPage,
          public_approval_status: "approved",
          admin_reviewed_at: new Date().toISOString(),
          admin_reviewed_by: user?.id,
        })
        .eq("id", property.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property approved and updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error approving property:", error);
      toast({
        title: "Error",
        description: "Failed to approve property",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("inventory")
        .update({
          public_approval_status: "rejected",
          admin_reviewed_at: new Date().toISOString(),
          admin_reviewed_by: user?.id,
          admin_notes: formData.adminNotes,
          show_on_public_page: false,
        })
        .eq("id", property.id);

      if (error) throw error;

      toast({
        title: "Property Rejected",
        description: "Property has been marked as rejected",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error rejecting property:", error);
      toast({
        title: "Error",
        description: "Failed to reject property",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review & Approve Property</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{property?.name}</h3>
            <p className="text-sm text-muted-foreground">Purchase Price: ${property?.price?.toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="marketComps"
                checked={formData.marketCompsCompleted}
                onCheckedChange={(checked) => setFormData({ ...formData, marketCompsCompleted: checked as boolean })}
              />
              <Label htmlFor="marketComps" className="cursor-pointer">
                Market Comps Completed
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="arv">After Repair Value (ARV) *</Label>
            <div className="flex gap-2">
              <Input
                id="arv"
                type="number"
                value={formData.arv}
                onChange={(e) => setFormData({ ...formData, arv: e.target.value })}
                placeholder="Enter ARV"
              />
              <Button type="button" onClick={calculate65Rule}>Calculate 65% Rule</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxLoan">65% Loan Amount</Label>
              <Input
                id="maxLoan"
                type="number"
                value={formData.maxLoanAmount}
                onChange={(e) => setFormData({ ...formData, maxLoanAmount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="downPayment">Suggested Down Payment (10%)</Label>
              <Input
                id="downPayment"
                type="number"
                value={formData.downPayment}
                onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="repairs">Estimated Repairs</Label>
              <Input
                id="repairs"
                type="number"
                value={formData.estimatedRepairs}
                onChange={(e) => setFormData({ ...formData, estimatedRepairs: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rehab">Potential Rehab Budget</Label>
              <Input
                id="rehab"
                type="number"
                value={formData.calculatedRehabBudget}
                onChange={(e) => setFormData({ ...formData, calculatedRehabBudget: e.target.value })}
                readOnly
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Admin Notes</Label>
            <Textarea
              id="notes"
              rows={4}
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              placeholder="Internal notes about this property..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="showPublic"
              checked={formData.showOnPublicPage}
              onCheckedChange={(checked) => setFormData({ ...formData, showOnPublicPage: checked as boolean })}
            />
            <Label htmlFor="showPublic" className="cursor-pointer">
              Show on Public Page
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={loading}>
            Reject
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            {loading ? "Saving..." : "Approve Property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}