import { useState } from "react";
import { Plus, Settings, Trash2, Edit, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Deal {
  id: string;
  title: string;
  client: string;
  value: number;
  date: string;
  priority: "high" | "medium" | "low";
}

interface Stage {
  id: string;
  name: string;
  deals: Deal[];
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

interface PipelineManagerProps {
  pipelines: Pipeline[];
  onUpdate: (pipelines: Pipeline[]) => void;
  currentPipelineId: string;
  onSelectPipeline: (id: string) => void;
}

export function PipelineManager({
  pipelines,
  onUpdate,
  currentPipelineId,
  onSelectPipeline,
}: PipelineManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "pipeline" | "stage";
    id: string;
    pipelineId?: string;
  } | null>(null);

  const handleCreatePipeline = () => {
    if (!newPipelineName.trim()) {
      toast.error("Pipeline name is required");
      return;
    }

    const newPipeline: Pipeline = {
      id: `pipeline-${Date.now()}`,
      name: newPipelineName,
      stages: [
        { id: `stage-${Date.now()}-1`, name: "New", deals: [] },
        { id: `stage-${Date.now()}-2`, name: "In Progress", deals: [] },
        { id: `stage-${Date.now()}-3`, name: "Closed", deals: [] },
      ],
    };

    onUpdate([...pipelines, newPipeline]);
    setNewPipelineName("");
    toast.success("Pipeline created");
  };

  const handleUpdatePipelineName = (pipelineId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error("Pipeline name is required");
      return;
    }

    onUpdate(
      pipelines.map((p) =>
        p.id === pipelineId ? { ...p, name: newName } : p
      )
    );
    toast.success("Pipeline updated");
  };

  const handleDeletePipeline = (pipelineId: string) => {
    if (pipelines.length === 1) {
      toast.error("Cannot delete the last pipeline");
      return;
    }

    const newPipelines = pipelines.filter((p) => p.id !== pipelineId);
    onUpdate(newPipelines);

    if (currentPipelineId === pipelineId) {
      onSelectPipeline(newPipelines[0].id);
    }

    toast.success("Pipeline deleted");
    setDeleteConfirm(null);
  };

  const handleAddStage = (pipelineId: string) => {
    if (!newStageName.trim()) {
      toast.error("Stage name is required");
      return;
    }

    onUpdate(
      pipelines.map((p) =>
        p.id === pipelineId
          ? {
              ...p,
              stages: [
                ...p.stages,
                { id: `stage-${Date.now()}`, name: newStageName, deals: [] },
              ],
            }
          : p
      )
    );

    setNewStageName("");
    toast.success("Stage added");
  };

  const handleUpdateStageName = (
    pipelineId: string,
    stageId: string,
    newName: string
  ) => {
    if (!newName.trim()) {
      toast.error("Stage name is required");
      return;
    }

    onUpdate(
      pipelines.map((p) =>
        p.id === pipelineId
          ? {
              ...p,
              stages: p.stages.map((s) =>
                s.id === stageId ? { ...s, name: newName } : s
              ),
            }
          : p
      )
    );

    toast.success("Stage updated");
  };

  const handleDeleteStage = (pipelineId: string, stageId: string) => {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (pipeline && pipeline.stages.length === 1) {
      toast.error("Cannot delete the last stage");
      return;
    }

    onUpdate(
      pipelines.map((p) =>
        p.id === pipelineId
          ? {
              ...p,
              stages: p.stages.filter((s) => s.id !== stageId),
            }
          : p
      )
    );

    toast.success("Stage deleted");
    setDeleteConfirm(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Settings className="h-4 w-4" />
            Manage Pipelines
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Pipelines</DialogTitle>
            <DialogDescription>
              Create, edit, and organize your sales pipelines and stages
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create New Pipeline */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label>Create New Pipeline</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Pipeline name"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreatePipeline();
                  }}
                />
                <Button onClick={handleCreatePipeline}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </div>
            </div>

            {/* Existing Pipelines */}
            <div className="space-y-4">
              {pipelines.map((pipeline) => (
                <div
                  key={pipeline.id}
                  className="space-y-3 p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={pipeline.name}
                      onChange={(e) =>
                        handleUpdatePipelineName(pipeline.id, e.target.value)
                      }
                      className="font-semibold"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setDeleteConfirm({
                          type: "pipeline",
                          id: pipeline.id,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Stages */}
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Stages
                    </Label>
                    {pipeline.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <Badge variant="outline" className="w-8 justify-center">
                          {index + 1}
                        </Badge>
                        <Input
                          value={stage.name}
                          onChange={(e) =>
                            handleUpdateStageName(
                              pipeline.id,
                              stage.id,
                              e.target.value
                            )
                          }
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDeleteConfirm({
                              type: "stage",
                              id: stage.id,
                              pipelineId: pipeline.id,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}

                    {/* Add New Stage */}
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="New stage name"
                        value={
                          editingPipeline?.id === pipeline.id
                            ? newStageName
                            : ""
                        }
                        onChange={(e) => {
                          setEditingPipeline(pipeline);
                          setNewStageName(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddStage(pipeline.id);
                            setEditingPipeline(null);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          handleAddStage(pipeline.id);
                          setEditingPipeline(null);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Stage
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "pipeline"
                ? "This will delete the pipeline and all its deals. This action cannot be undone."
                : "This will delete the stage and move all its deals to the first stage. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm?.type === "pipeline") {
                  handleDeletePipeline(deleteConfirm.id);
                } else if (
                  deleteConfirm?.type === "stage" &&
                  deleteConfirm.pipelineId
                ) {
                  handleDeleteStage(deleteConfirm.pipelineId, deleteConfirm.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
