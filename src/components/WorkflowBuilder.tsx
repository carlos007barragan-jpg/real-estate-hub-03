import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Phone, MessageSquare, Mail, FileText, Plus, Trash2, Pencil, Save, X, Zap, PlayCircle, GitBranch, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkflowStep {
  action_type: string;
  day_offset: number;
  title: string;
  description?: string;
}

interface Workflow {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  steps: WorkflowStep[];
  stop_condition: string;
  is_active: boolean;
  display_order: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-3 w-3" />,
  sms: <MessageSquare className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  task: <FileText className="h-3 w-3" />,
};

const ACTION_COLORS: Record<string, string> = {
  call: "bg-primary/10 text-primary",
  sms: "bg-success/10 text-success",
  email: "bg-warning/10 text-warning",
  task: "bg-muted text-muted-foreground",
};

const TRIGGER_LABELS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  new_lead: { label: "New Lead Created", icon: <PlayCircle className="h-4 w-4" />, description: "Starts automatically when a new lead is added" },
  pipeline_stage: { label: "Pipeline Stage Change", icon: <GitBranch className="h-4 w-4" />, description: "Starts when a lead enters a specific pipeline stage" },
  manual: { label: "Manual Trigger", icon: <Zap className="h-4 w-4" />, description: "Agent starts it manually from the lead profile" },
};

export const WorkflowBuilder = () => {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pipelines, setPipelines] = useState<{ name: string; stages: string[] }[]>([]);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState("new_lead");
  const [formStageName, setFormStageName] = useState("");
  const [formPipelineName, setFormPipelineName] = useState("");
  const [formStopCondition, setFormStopCondition] = useState("assigned_to_pipeline");
  const [formSteps, setFormSteps] = useState<WorkflowStep[]>([{ action_type: "call", day_offset: 0, title: "Initial call" }]);

  useEffect(() => {
    fetchWorkflows();
    fetchPipelines();
  }, []);

  const fetchWorkflows = async () => {
    const { data } = await supabase
      .from("workflows")
      .select("*")
      .order("display_order", { ascending: true });
    if (data) {
      setWorkflows(data.map((w: any) => ({ ...w, steps: w.steps as unknown as WorkflowStep[] })));
    }
    setLoading(false);
  };

  const fetchPipelines = async () => {
    const { data } = await supabase
      .from("pipelines")
      .select("name, stages")
      .order("display_order", { ascending: true });
    if (data) {
      setPipelines(data.map((p: any) => ({
        name: p.name,
        stages: Array.isArray(p.stages) ? (p.stages as any[]).map((s: any) => typeof s === "string" ? s : s.name || s.label || "") : [],
      })));
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormTrigger("new_lead");
    setFormStageName("");
    setFormPipelineName("");
    setFormStopCondition("assigned_to_pipeline");
    setFormSteps([{ action_type: "call", day_offset: 0, title: "Initial call" }]);
  };

  const startEdit = (w: Workflow) => {
    setEditingId(w.id);
    setFormName(w.name);
    setFormTrigger(w.trigger_type);
    setFormStageName(w.trigger_config?.stage_name || "");
    setFormPipelineName(w.trigger_config?.pipeline_name || "");
    setFormStopCondition(w.stop_condition);
    setFormSteps([...w.steps]);
    setCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreating(false);
    resetForm();
  };

  const buildTriggerConfig = () => {
    if (formTrigger === "pipeline_stage") {
      return { stage_name: formStageName, pipeline_name: formPipelineName || undefined };
    }
    return {};
  };

  const handleSave = async () => {
    if (!formName.trim() || formSteps.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const payload = {
      name: formName,
      trigger_type: formTrigger,
      trigger_config: buildTriggerConfig() as any,
      steps: formSteps as any,
      stop_condition: formStopCondition,
      user_id: user.id,
      organization_id: profile?.organization_id || null,
    };

    if (editingId) {
      await supabase.from("workflows").update(payload).eq("id", editingId);
      toast({ title: "Workflow updated" });
    } else {
      await supabase.from("workflows").insert([{ ...payload, display_order: workflows.length }] as any);
      toast({ title: "Workflow created" });
    }
    cancelEdit();
    fetchWorkflows();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("workflows").delete().eq("id", id);
    setWorkflows(prev => prev.filter(w => w.id !== id));
    toast({ title: "Workflow deleted" });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("workflows").update({ is_active: active }).eq("id", id);
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, is_active: active } : w));
  };

  const addStep = () => {
    const lastDay = formSteps.length > 0 ? formSteps[formSteps.length - 1].day_offset : 0;
    setFormSteps([...formSteps, { action_type: "call", day_offset: lastDay + 1, title: "" }]);
  };

  const updateStep = (index: number, field: keyof WorkflowStep, value: any) => {
    const updated = [...formSteps];
    updated[index] = { ...updated[index], [field]: value };
    setFormSteps(updated);
  };

  const removeStep = (index: number) => {
    setFormSteps(formSteps.filter((_, i) => i !== index));
  };

  const allStages = pipelines.flatMap(p => p.stages.map(s => ({ pipeline: p.name, stage: s })));

  const renderForm = () => (
    <Card className="p-5 border-primary/30 bg-primary/5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{editingId ? "Edit Workflow" : "New Workflow"}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Workflow Name</Label>
          <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. New Lead Follow-Up" className="h-9 mt-1" />
        </div>

        <div>
          <Label className="text-xs">Trigger</Label>
          <Select value={formTrigger} onValueChange={setFormTrigger}>
            <SelectTrigger className="h-9 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_lead">🚀 New Lead Created</SelectItem>
              <SelectItem value="pipeline_stage">📋 Pipeline Stage Change</SelectItem>
              <SelectItem value="manual">⚡ Manual Trigger</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">{TRIGGER_LABELS[formTrigger]?.description}</p>
        </div>

        {formTrigger === "pipeline_stage" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Pipeline (optional)</Label>
              <Select value={formPipelineName} onValueChange={setFormPipelineName}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="Any pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Pipeline</SelectItem>
                  {pipelines.map(p => (
                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Stage Name</Label>
              <Select value={formStageName} onValueChange={setFormStageName}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="Select stage..." />
                </SelectTrigger>
                <SelectContent>
                  {(formPipelineName
                    ? allStages.filter(s => s.pipeline === formPipelineName)
                    : allStages
                  ).map((s, i) => (
                    <SelectItem key={i} value={s.stage}>
                      {s.stage} {!formPipelineName ? `(${s.pipeline})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {formTrigger === "new_lead" && (
          <div>
            <Label className="text-xs">Auto-Stop Condition</Label>
            <Select value={formStopCondition} onValueChange={setFormStopCondition}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned_to_pipeline">Stop when lead enters a pipeline</SelectItem>
                <SelectItem value="never">Never auto-stop (run all steps)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        <div>
          <Label className="text-xs font-semibold">WORKFLOW STEPS</Label>
          <div className="space-y-2 mt-2">
            {formSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 bg-background rounded-lg p-2 border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 shrink-0 w-12">
                  Day {step.day_offset}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Select value={step.action_type} onValueChange={(v) => updateStep(i, "action_type", v)}>
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">📞 Call</SelectItem>
                        <SelectItem value="sms">💬 SMS</SelectItem>
                        <SelectItem value="email">📧 Email</SelectItem>
                        <SelectItem value="task">📋 Task</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      value={step.day_offset}
                      onChange={(e) => updateStep(i, "day_offset", parseInt(e.target.value) || 0)}
                      className="h-8 w-16 text-xs"
                      placeholder="Day"
                    />
                    {formSteps.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeStep(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <Input
                    value={step.title}
                    onChange={(e) => updateStep(i, "title", e.target.value)}
                    placeholder="Step title (e.g. 'Call the lead', 'Collect proof of income')"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-1" onClick={addStep}>
              <Plus className="h-3 w-3" /> Add Step
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">PREVIEW</p>
          <div className="flex items-center gap-1 flex-wrap">
            {formSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground text-xs">→</span>}
                <Badge variant="secondary" className={`text-[10px] gap-1 ${ACTION_COLORS[step.action_type]}`}>
                  {ACTION_ICONS[step.action_type]}
                  Day {step.day_offset}: {step.title || "Untitled"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="gap-1" onClick={handleSave} disabled={!formName.trim() || formSteps.length === 0}>
          <Save className="h-3.5 w-3.5" /> {editingId ? "Update" : "Create"} Workflow
        </Button>
        <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
      </div>
    </Card>
  );

  if (loading) return null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Workflow Automation</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure automated follow-up sequences, task creation, and reminders for your team
            </p>
          </div>
          {!creating && !editingId && (
            <Button size="sm" className="gap-1" onClick={() => { setCreating(true); resetForm(); }}>
              <Plus className="h-4 w-4" /> New Workflow
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>How it works:</strong> "New Lead" workflows auto-start when a lead is created and stop when assigned to a pipeline.
            "Pipeline Stage" workflows trigger when a lead enters a specific stage (e.g., document collection when "Under Contract").
            Each step auto-creates a task assigned to the lead's agent on the scheduled day.
          </span>
        </div>
      </Card>

      {/* Create/Edit form */}
      {(creating || editingId) && renderForm()}

      {/* Existing workflows */}
      {workflows.map((workflow) => editingId === workflow.id ? null : (
        <Card key={workflow.id} className={`p-4 border ${!workflow.is_active ? "opacity-60" : ""}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{workflow.name}</p>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {TRIGGER_LABELS[workflow.trigger_type]?.icon}
                  {TRIGGER_LABELS[workflow.trigger_type]?.label}
                </Badge>
                {workflow.trigger_type === "pipeline_stage" && workflow.trigger_config?.stage_name && (
                  <Badge variant="secondary" className="text-[10px]">
                    Stage: {workflow.trigger_config.stage_name}
                  </Badge>
                )}
                {workflow.trigger_type === "new_lead" && (
                  <Badge variant="secondary" className="text-[10px]">
                    Stops: {workflow.stop_condition === "assigned_to_pipeline" ? "When in pipeline" : "Never"}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {workflow.steps.map((step, i) => (
                  <Badge key={i} variant="secondary" className={`text-[10px] gap-1 ${ACTION_COLORS[step.action_type]}`}>
                    {ACTION_ICONS[step.action_type]}
                    Day {step.day_offset}: {step.title}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <Switch checked={workflow.is_active} onCheckedChange={(v) => handleToggle(workflow.id, v)} />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(workflow)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(workflow.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {workflows.length === 0 && !creating && (
        <Card className="p-8 text-center border-dashed">
          <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No workflows configured yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first workflow to automate follow-ups and task creation</p>
          <Button size="sm" className="mt-4 gap-1" onClick={() => { setCreating(true); resetForm(); }}>
            <Plus className="h-4 w-4" /> Create First Workflow
          </Button>
        </Card>
      )}
    </div>
  );
};
