import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Phone, MessageSquare, Mail, FileText, Plus, Trash2, GripVertical, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TemplateStep {
  action_type: string;
  day: number;
}

interface Template {
  id: string;
  name: string;
  steps: TemplateStep[];
  is_active: boolean;
  display_order: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-3 w-3" />,
  sms: <MessageSquare className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  note: <FileText className="h-3 w-3" />,
};

const ACTION_COLORS: Record<string, string> = {
  call: "bg-primary/10 text-primary",
  sms: "bg-success/10 text-success",
  email: "bg-warning/10 text-warning",
  note: "bg-muted text-muted-foreground",
};

const DEFAULT_TEMPLATES: Omit<Template, "id">[] = [
  {
    name: "Hot Lead (3 Day)",
    steps: [{ action_type: "call", day: 0 }, { action_type: "sms", day: 1 }, { action_type: "call", day: 3 }],
    is_active: true,
    display_order: 0,
  },
  {
    name: "Standard (7 Day)",
    steps: [{ action_type: "call", day: 0 }, { action_type: "sms", day: 2 }, { action_type: "email", day: 5 }, { action_type: "call", day: 7 }],
    is_active: true,
    display_order: 1,
  },
  {
    name: "Re-engagement (14 Day)",
    steps: [{ action_type: "sms", day: 0 }, { action_type: "call", day: 3 }, { action_type: "sms", day: 7 }, { action_type: "call", day: 14 }],
    is_active: true,
    display_order: 2,
  },
];

export const FollowUpTemplatesManager = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSteps, setEditSteps] = useState<TemplateStep[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSteps, setNewSteps] = useState<TemplateStep[]>([{ action_type: "call", day: 0 }]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("follow_up_templates")
      .select("*")
      .order("display_order", { ascending: true });

    if (data && data.length > 0) {
      setTemplates(data.map((t: any) => ({ ...t, steps: t.steps as TemplateStep[] })));
    } else {
      // Seed defaults on first load
      await seedDefaults();
    }
    setLoading(false);
  };

  const seedDefaults = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const rows = DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      user_id: user.id,
      organization_id: profile?.organization_id || null,
      steps: JSON.stringify(t.steps),
    }));

    const { data: inserted } = await supabase.from("follow_up_templates").insert(rows).select();
    if (inserted) {
      setTemplates(inserted.map((t: any) => ({ ...t, steps: t.steps as TemplateStep[] })));
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("follow_up_templates").update({ is_active: active }).eq("id", id);
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t));
  };

  const handleDelete = async (id: string) => {
    await supabase.from("follow_up_templates").delete().eq("id", id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast({ title: "Template deleted" });
  };

  const startEdit = (template: Template) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditSteps([...template.steps]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditSteps([]);
  };

  const saveEdit = async () => {
    if (!editName.trim() || editSteps.length === 0) return;
    await supabase.from("follow_up_templates").update({ name: editName, steps: JSON.stringify(editSteps) }).eq("id", editingId!);
    setTemplates(prev => prev.map(t => t.id === editingId ? { ...t, name: editName, steps: editSteps } : t));
    cancelEdit();
    toast({ title: "Template updated" });
  };

  const handleCreate = async () => {
    if (!newName.trim() || newSteps.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: inserted } = await supabase.from("follow_up_templates").insert({
      name: newName,
      steps: JSON.stringify(newSteps),
      user_id: user.id,
      organization_id: profile?.organization_id || null,
      display_order: templates.length,
    }).select().single();

    if (inserted) {
      setTemplates(prev => [...prev, { ...inserted, steps: inserted.steps as unknown as TemplateStep[] }]);
      setCreating(false);
      setNewName("");
      setNewSteps([{ action_type: "call", day: 0 }]);
      toast({ title: "Template created" });
    }
  };

  const renderStepsEditor = (steps: TemplateStep[], setSteps: (s: TemplateStep[]) => void) => (
    <div className="space-y-2 mt-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <Select value={step.action_type} onValueChange={(v) => { const u = [...steps]; u[i] = { ...u[i], action_type: v }; setSteps(u); }}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">📞 Call</SelectItem>
              <SelectItem value="sms">💬 SMS</SelectItem>
              <SelectItem value="email">📧 Email</SelectItem>
              <SelectItem value="note">📝 Note</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground">Day</Label>
            <Input
              type="number"
              min="0"
              value={step.day}
              onChange={(e) => { const u = [...steps]; u[i] = { ...u[i], day: parseInt(e.target.value) || 0 }; setSteps(u); }}
              className="h-8 w-16 text-xs"
            />
          </div>
          {steps.length > 1 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => {
        const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
        setSteps([...steps, { action_type: "call", day: lastDay + 1 }]);
      }}>
        <Plus className="h-3 w-3" /> Add Step
      </Button>
    </div>
  );

  if (loading) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Follow-Up Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure reusable follow-up sequences for your team</p>
        </div>
        {!creating && (
          <Button size="sm" className="gap-1" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New Template
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Create form */}
        {creating && (
          <Card className="p-4 border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">New Template</Label>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCreating(false); setNewName(""); setNewSteps([{ action_type: "call", day: 0 }]); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input placeholder="Template name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 mb-2" />
            {renderStepsEditor(newSteps, setNewSteps)}
            <Button size="sm" className="mt-3 gap-1" onClick={handleCreate} disabled={!newName.trim() || newSteps.length === 0}>
              <Save className="h-3.5 w-3.5" /> Save Template
            </Button>
          </Card>
        )}

        {/* Existing templates */}
        {templates.map((template) => (
          <Card key={template.id} className={`p-4 border ${!template.is_active ? "opacity-60" : ""}`}>
            {editingId === template.id ? (
              <div>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 mb-2" />
                {renderStepsEditor(editSteps, setEditSteps)}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="gap-1" onClick={saveEdit}><Save className="h-3.5 w-3.5" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{template.name}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {template.steps.map((step, i) => (
                      <Badge key={i} variant="secondary" className={`text-[10px] gap-1 ${ACTION_COLORS[step.action_type]}`}>
                        {ACTION_ICONS[step.action_type]}
                        Day {step.day}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={template.is_active} onCheckedChange={(v) => handleToggleActive(template.id, v)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(template)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </Card>
  );
};
