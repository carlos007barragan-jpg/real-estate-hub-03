import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layers, Building2, Tag, PlusCircle } from "lucide-react";

interface PipelineOption {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}

interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onSuccess: () => void;
}

export function AddDealDialog({ open, onOpenChange, leadId, leadName, onSuccess }: AddDealDialogProps) {
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [dealLabel, setDealLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [availablePipelines, setAvailablePipelines] = useState<PipelineOption[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (!profile?.organization_id) return;

        const [pipelinesRes, txTypesRes] = await Promise.all([
          supabase
            .from("pipelines")
            .select("id, name, stages")
            .eq("organization_id", profile.organization_id)
            .order("display_order", { ascending: true }),
          supabase
            .from("transaction_types")
            .select("id, name")
            .eq("organization_id", profile.organization_id)
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
        ]);

        const pipelines: PipelineOption[] = (pipelinesRes.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          stages: p.stages as { id: string; name: string }[],
        }));

        setAvailablePipelines(pipelines);
        setTransactionTypes(txTypesRes.data || []);

        if (pipelines.length > 0) {
          setSelectedPipeline(pipelines[0].id);
          if (pipelines[0].stages.length > 0) {
            setSelectedStage(pipelines[0].stages[0].name);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Reset state
    setSelectedPipeline("");
    setSelectedStage("");
    setTransactionType("");
    setDealLabel("");
    fetchData();
  }, [open]);

  useEffect(() => {
    const pipeline = availablePipelines.find(p => p.id === selectedPipeline);
    if (pipeline && pipeline.stages.length > 0) {
      setSelectedStage(pipeline.stages[0].name);
    }
  }, [selectedPipeline, availablePipelines]);

  // Auto-suggest deal label from transaction type
  useEffect(() => {
    if (transactionType) {
      const txName = transactionTypes.find(t => t.name === transactionType)?.name;
      if (txName) {
        setDealLabel(`${txName} Deal`);
      }
    }
  }, [transactionType, transactionTypes]);

  const currentPipeline = availablePipelines.find(p => p.id === selectedPipeline);
  const pipelineStages = currentPipeline?.stages || [];

  const handleSave = async () => {
    if (!selectedPipeline) {
      toast({ title: "Pipeline Required", description: "Please select a pipeline", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("No organization found");

      const label = dealLabel || `${currentPipeline?.name || "Pipeline"} Deal`;

      const { error } = await supabase
        .from("lead_deals")
        .insert({
          lead_id: leadId,
          pipeline_id: selectedPipeline,
          pipeline_stage: selectedStage,
          transaction_type: transactionType || null,
          deal_label: label,
          created_by: user.id,
          organization_id: profile.organization_id,
        } as any);

      if (error) throw error;

      toast({
        title: "Transaction Added",
        description: `${label} has been added to ${leadName}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Add Transaction
          </DialogTitle>
          <DialogDescription>
            Add a new transaction for <strong>{leadName}</strong>. Each transaction tracks its own pipeline, stage, and financials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Pipeline
            </Label>
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading..." : "Select a pipeline..."} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                {availablePipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Initial Stage
            </Label>
            <Select value={selectedStage} onValueChange={setSelectedStage} disabled={loading || !selectedPipeline}>
              <SelectTrigger>
                <SelectValue placeholder="Select a stage..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                {pipelineStages.map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Transaction Type
            </Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type (optional)..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                {transactionTypes.map((t) => (
                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Deal Label</Label>
            <Input
              placeholder="e.g. Wholesale Deal"
              value={dealLabel}
              onChange={(e) => setDealLabel(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedPipeline || loading}>
            {saving ? "Adding..." : "Add Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
