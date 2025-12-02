import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layers, Building2 } from "lucide-react";

interface PipelineOption {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}

interface PipelineAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onSuccess: () => void;
}

export function PipelineAssignmentDialog({ 
  open, 
  onOpenChange, 
  leadId, 
  leadName,
  onSuccess 
}: PipelineAssignmentDialogProps) {
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [saving, setSaving] = useState(false);
  const [availablePipelines, setAvailablePipelines] = useState<PipelineOption[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch pipelines from database
  useEffect(() => {
    const fetchPipelines = async () => {
      if (!open) return;
      
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (!userProfile?.organization_id) return;

        const { data: pipelines, error } = await supabase
          .from("pipelines")
          .select("id, name, stages")
          .eq("organization_id", userProfile.organization_id)
          .order("display_order", { ascending: true });

        if (error) throw error;

        const pipelineOptions: PipelineOption[] = (pipelines || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          stages: p.stages as { id: string; name: string }[],
        }));

        setAvailablePipelines(pipelineOptions);

        // Set default selections
        if (pipelineOptions.length > 0 && !selectedPipeline) {
          setSelectedPipeline(pipelineOptions[0].id);
          if (pipelineOptions[0].stages.length > 0) {
            setSelectedStage(pipelineOptions[0].stages[0].name);
          }
        }
      } catch (error) {
        console.error("Error fetching pipelines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPipelines();
  }, [open]);

  // Update stage when pipeline changes
  useEffect(() => {
    const pipeline = availablePipelines.find(p => p.id === selectedPipeline);
    if (pipeline && pipeline.stages.length > 0) {
      setSelectedStage(pipeline.stages[0].name);
    }
  }, [selectedPipeline, availablePipelines]);

  const currentPipeline = availablePipelines.find(p => p.id === selectedPipeline);
  const pipelineStages = currentPipeline?.stages || [];

  const handleSave = async () => {
    if (!selectedPipeline) {
      toast({
        title: "Pipeline Required",
        description: "Please select a pipeline",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("leads")
        .update({
          pipeline: selectedPipeline,
          pipeline_stage: selectedStage,
          lead_lifecycle: "Moved to Pipeline",
          last_modified_by: user?.id,
        })
        .eq("id", leadId);

      if (error) throw error;

      toast({
        title: "Pipeline Assigned",
        description: `${leadName} has been added to ${currentPipeline?.name || 'pipeline'}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error assigning pipeline:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Assign to Pipeline
          </DialogTitle>
          <DialogDescription>
            Choose a pipeline and initial stage for <strong>{leadName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="pipeline" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Pipeline
            </Label>
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline} disabled={loading}>
              <SelectTrigger id="pipeline">
                <SelectValue placeholder={loading ? "Loading..." : "Select a pipeline..."} />
              </SelectTrigger>
               <SelectContent className="z-50 bg-popover">
                 {availablePipelines.map((pipeline) => (
                   <SelectItem key={pipeline.id} value={pipeline.id}>
                     {pipeline.name}
                   </SelectItem>
                 ))}
               </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Initial Stage
            </Label>
            <Select value={selectedStage} onValueChange={setSelectedStage} disabled={loading || !selectedPipeline}>
              <SelectTrigger id="stage">
                <SelectValue placeholder="Select a stage..." />
              </SelectTrigger>
               <SelectContent className="z-50 bg-popover">
                 {pipelineStages.map((stage) => (
                   <SelectItem key={stage.id} value={stage.name}>
                     {stage.name}
                   </SelectItem>
                 ))}
               </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedPipeline || loading}>
            {saving ? "Assigning..." : "Assign to Pipeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
