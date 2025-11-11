import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Layers, Building2 } from "lucide-react";

interface PipelineAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onSuccess: () => void;
}

const availablePipelines = [
  { id: "real-estate", name: "Real Estate Sales" },
  { id: "commercial", name: "Commercial Properties" },
];

const pipelineStages = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Showing Scheduled",
  "Offer Made",
  "Under Contract",
  "Closed Won",
  "Closed Lost"
];

export function PipelineAssignmentDialog({ 
  open, 
  onOpenChange, 
  leadId, 
  leadName,
  onSuccess 
}: PipelineAssignmentDialogProps) {
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [selectedStage, setSelectedStage] = useState("New Lead");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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
        description: `${leadName} has been added to ${availablePipelines.find(p => p.id === selectedPipeline)?.name}`,
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
            <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
              <SelectTrigger id="pipeline">
                <SelectValue placeholder="Select a pipeline..." />
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
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger id="stage">
                <SelectValue />
              </SelectTrigger>
               <SelectContent className="z-50 bg-popover">
                 {pipelineStages.map((stage) => (
                   <SelectItem key={stage} value={stage}>
                     {stage}
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
          <Button onClick={handleSave} disabled={saving || !selectedPipeline}>
            {saving ? "Assigning..." : "Assign to Pipeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
