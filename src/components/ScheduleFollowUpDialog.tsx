import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, MessageSquare, Mail, FileText, Plus, Trash2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScheduleFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  onScheduled?: () => void;
}

interface TemplateStep {
  action_type: string;
  day: number;
}

interface Template {
  name: string;
  steps: TemplateStep[];
}

const FALLBACK_TEMPLATES: Template[] = [
  { name: "Hot Lead (3 Day)", steps: [{ action_type: "call", day: 0 }, { action_type: "sms", day: 1 }, { action_type: "call", day: 3 }] },
  { name: "Standard (7 Day)", steps: [{ action_type: "call", day: 0 }, { action_type: "sms", day: 2 }, { action_type: "email", day: 5 }, { action_type: "call", day: 7 }] },
  { name: "Re-engagement (14 Day)", steps: [{ action_type: "sms", day: 0 }, { action_type: "call", day: 3 }, { action_type: "sms", day: 7 }, { action_type: "call", day: 14 }] },
];

const ACTION_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-3.5 w-3.5" />,
  sms: <MessageSquare className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  note: <FileText className="h-3.5 w-3.5" />,
};

const ACTION_COLORS: Record<string, string> = {
  call: "bg-primary/10 text-primary",
  sms: "bg-success/10 text-success",
  email: "bg-warning/10 text-warning",
  note: "bg-muted text-muted-foreground",
};

export const ScheduleFollowUpDialog = ({ open, onOpenChange, leadId, leadName, onScheduled }: ScheduleFollowUpDialogProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customSteps, setCustomSteps] = useState<TemplateStep[]>([{ action_type: "call", day: 0 }]);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(FALLBACK_TEMPLATES);
  const [manualWorkflows, setManualWorkflows] = useState<{ id: string; name: string; steps: TemplateStep[] }[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      // Load follow-up templates
      const { data } = await supabase
        .from("follow_up_templates")
        .select("name, steps")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (data && data.length > 0) {
        setTemplates(data.map((t: any) => {
          const steps = typeof t.steps === 'string' ? JSON.parse(t.steps) : t.steps;
          return { name: t.name, steps: Array.isArray(steps) ? steps : [] };
        }));
      }

      // Load manual-trigger workflows
      const { data: wfData } = await supabase
        .from("workflows")
        .select("id, name, steps")
        .eq("trigger_type", "manual")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (wfData) {
        setManualWorkflows(wfData.map((w: any) => {
          const rawSteps = typeof w.steps === 'string' ? JSON.parse(w.steps) : w.steps;
          const stepsArr = Array.isArray(rawSteps) ? rawSteps : [];
          return {
            id: w.id,
            name: w.name,
            steps: stepsArr.map((s: any) => ({
              action_type: s.action_type,
              day: s.day_offset ?? s.day ?? 0,
            })),
          };
        }));
      }
    };
    load();
  }, [open]);

  const addStep = () => {
    const lastDay = customSteps.length > 0 ? customSteps[customSteps.length - 1].day : 0;
    setCustomSteps([...customSteps, { action_type: "call", day: lastDay + 1 }]);
  };

  const removeStep = (index: number) => {
    setCustomSteps(customSteps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: "action_type" | "day", value: string | number) => {
    const updated = [...customSteps];
    updated[index] = { ...updated[index], [field]: value };
    setCustomSteps(updated);
  };

  const handleSchedule = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let steps: TemplateStep[];
      let templateName: string | null = null;

      if (mode === "template") {
        // Check if it's a manual workflow
        if (selectedTemplate.startsWith("wf:")) {
          const wfName = selectedTemplate.slice(3);
          const wf = manualWorkflows.find(w => w.name === wfName);
          if (!wf) throw new Error("Select a workflow");
          steps = wf.steps;
          templateName = wf.name;
        } else {
          const template = templates.find(t => t.name === selectedTemplate);
          if (!template) throw new Error("Select a template");
          steps = template.steps;
          templateName = template.name;
        }
      } else {
        if (customSteps.length === 0) throw new Error("Add at least one step");
        steps = customSteps;
      }

      // Delete existing pending follow-ups for this lead
      await supabase
        .from("follow_ups")
        .delete()
        .eq("lead_id", leadId)
        .eq("status", "pending");

      const now = new Date();
      const rows = steps.map((step, index) => {
        const scheduledDate = new Date(now);
        scheduledDate.setDate(scheduledDate.getDate() + step.day);
        return {
          lead_id: leadId,
          user_id: user.id,
          action_type: step.action_type,
          scheduled_date: scheduledDate.toISOString(),
          status: "pending",
          template_name: templateName,
          sequence_order: index,
        };
      });

      const { error } = await supabase.from("follow_ups").insert(rows);
      if (error) throw error;

      toast({ title: "Follow-up scheduled", description: `${steps.length} step sequence created for ${leadName}` });
      onOpenChange(false);
      onScheduled?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setMode("template");
      setSelectedTemplate("");
      setCustomSteps([{ action_type: "call", day: 0 }]);
    }
    onOpenChange(isOpen);
  };

  const previewSteps = mode === "template"
    ? (selectedTemplate.startsWith("wf:")
        ? manualWorkflows.find(w => w.name === selectedTemplate.slice(3))?.steps
        : templates.find(t => t.name === selectedTemplate)?.steps) || []
    : customSteps;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Schedule Follow-Up Sequence
          </DialogTitle>
          <DialogDescription>
            Create a follow-up sequence for {leadName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === "template" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("template")}
              className="flex-1"
            >
              Use Template
            </Button>
            <Button
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("custom")}
              className="flex-1"
            >
              Custom Sequence
            </Button>
          </div>

          {mode === "template" ? (
            <div className="space-y-3">
              {manualWorkflows.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Workflows</p>
                  {manualWorkflows.map((wf) => (
                    <button
                      key={`wf-${wf.id}`}
                      onClick={() => setSelectedTemplate(`wf:${wf.name}`)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTemplate === `wf:${wf.name}`
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <p className="text-sm font-medium">⚡ {wf.name}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {(wf.steps ?? []).map((step, i) => (
                          <Badge key={i} variant="secondary" className={`text-[10px] gap-1 ${ACTION_COLORS[step.action_type]}`}>
                            {ACTION_ICONS[step.action_type]}
                            Day {step.day}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                  <Separator />
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Templates</p>
                </>
              )}
              {templates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => setSelectedTemplate(template.name)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTemplate === template.name
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{template.name}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {(template.steps ?? []).map((step, i) => (
                      <Badge key={i} variant="secondary" className={`text-[10px] gap-1 ${ACTION_COLORS[step.action_type]}`}>
                        {ACTION_ICONS[step.action_type]}
                        Day {step.day}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {customSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select value={step.action_type} onValueChange={(v) => updateStep(index, "action_type", v)}>
                    <SelectTrigger className="h-9 w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">📞 Call</SelectItem>
                      <SelectItem value="sms">💬 SMS</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="note">📝 Note</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5 flex-1">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Day</Label>
                    <Input
                      type="number"
                      min="0"
                      value={step.day}
                      onChange={(e) => updateStep(index, "day", parseInt(e.target.value) || 0)}
                      className="h-9 w-20"
                    />
                  </div>
                  {customSteps.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeStep(index)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addStep} className="w-full gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Step
              </Button>
            </div>
          )}

          {/* Preview */}
          {previewSteps.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">SEQUENCE PREVIEW</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {previewSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground text-xs">→</span>}
                      <Badge variant="secondary" className={`text-[10px] gap-1 ${ACTION_COLORS[step.action_type]}`}>
                        {ACTION_ICONS[step.action_type]}
                        Day {step.day}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button
            onClick={handleSchedule}
            disabled={saving || (mode === "template" && !selectedTemplate) || (mode === "custom" && customSteps.length === 0)}
          >
            {saving ? "Scheduling..." : "Schedule Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
