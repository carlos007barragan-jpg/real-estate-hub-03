import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MultiAgentSelect } from "@/components/MultiAgentSelect";
import { PlusCircle, Calendar, CheckCircle2, Trash2, Pencil, Save, ChevronDown, ChevronRight, AlertTriangle, Clock, Users, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const QUICK_TASK_PRESETS = [
  { label: "Call Back", title: "Call back lead", description: "Follow up with a return phone call" },
  { label: "Send Text", title: "Send follow-up text", description: "Send a text message to check in" },
  { label: "Send Email", title: "Send follow-up email", description: "Send an email with property details or updates" },
  { label: "Schedule Showing", title: "Schedule property showing", description: "Coordinate and confirm a showing appointment" },
  { label: "Send Contract", title: "Send contract/docs", description: "Prepare and send required documents or contracts" },
  { label: "Verify Info", title: "Verify lead information", description: "Confirm contact details, budget, and preferences" },
  { label: "Update CRM", title: "Update CRM notes", description: "Add latest interaction notes and update lead status" },
  { label: "Pre-Approval", title: "Request pre-approval letter", description: "Ask lead to provide mortgage pre-approval documentation" },
  { label: "Follow Up Offer", title: "Follow up on submitted offer", description: "Check status and response on the submitted offer" },
  { label: "Negotiate", title: "Negotiate terms", description: "Follow up on counter-offer or negotiate deal terms" },
  { label: "Title/Escrow", title: "Verify title & escrow status", description: "Check title clearance and escrow progress" },
  { label: "More Showings", title: "Follow up with more property showings", description: "Schedule additional property viewings based on client preferences" },
  { label: "Office Consult", title: "Follow up for office consultation", description: "Arrange an in-office meeting to review options and next steps" },
  { label: "Inspection", title: "Schedule home inspection", description: "Coordinate and confirm home inspection appointment" },
  { label: "Appraisal", title: "Follow up on appraisal", description: "Check appraisal status and review results" },
  { label: "Closing Prep", title: "Prepare for closing", description: "Confirm closing date, documents, and final walkthrough" },
  { label: "Client Check-In", title: "Client check-in call", description: "Touch base with client to review progress and answer questions" },
  { label: "Comp Analysis", title: "Run comparable market analysis", description: "Pull comps and prepare CMA report for the client" },
  { label: "Referral Ask", title: "Ask for referral", description: "Request referrals from satisfied client after closing" },
  { label: "Send Properties", title: "Send out property options", description: "Email or text curated property listings matching client criteria" },
  { label: "New Listings", title: "Follow up with new property listings", description: "Share newly available properties that match client preferences" },
  { label: "Post-Showing", title: "Follow up after showing", description: "Check in with client for feedback after property viewing" },
  { label: "Open House", title: "Invite to open house", description: "Send open house details and confirm attendance" },
  { label: "Price Update", title: "Notify of price change", description: "Inform client about a price reduction or update on a property of interest" },
  { label: "Market Update", title: "Send market update", description: "Share relevant market trends and neighborhood insights with client" },
];

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  user_id: string;
  assigneeNames?: string[];
  assigneeIds?: string[];
}

interface TasksSectionProps {
  leadId: string;
}

export const TasksSection = ({ leadId }: TasksSectionProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignees, setEditAssignees] = useState<string[]>([]);
  const [overdueOpen, setOverdueOpen] = useState(true);
  const [pendingOpen, setPendingOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [leadId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const tasksData = data || [];

      // Fetch assignees for all tasks
      const taskIds = tasksData.map(t => t.id);
      let assigneeMap = new Map<string, string[]>();

      if (taskIds.length > 0) {
        const { data: assignees } = await supabase
          .from("task_assignees")
          .select("task_id, user_id")
          .in("task_id", taskIds);

        if (assignees) {
          for (const a of assignees) {
            const existing = assigneeMap.get(a.task_id) || [];
            existing.push(a.user_id);
            assigneeMap.set(a.task_id, existing);
          }
        }
      }

      // Get all unique user IDs (from tasks + assignees)
      const allUserIds = new Set<string>();
      tasksData.forEach(t => allUserIds.add(t.user_id));
      assigneeMap.forEach(ids => ids.forEach(id => allUserIds.add(id)));

      let profileMap = new Map<string, string>();
      if (allUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", [...allUserIds]);

        profileMap = new Map(
          (profiles || []).map(p => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown User'])
        );
      }

      setTasks(tasksData.map(t => {
        const ids = assigneeMap.get(t.id) || [t.user_id];
        return {
          ...t,
          assigneeIds: ids,
          assigneeNames: ids.map(id => profileMap.get(id) || 'Unknown User'),
        };
      }));
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      toast({ title: "Error", description: "Task title is required", variant: "destructive" });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const assignees = newTaskAssignees.length > 0 ? newTaskAssignees : [user.id];

      const { data: taskData, error } = await supabase.from("tasks").insert({
        lead_id: leadId, user_id: user.id, title: newTaskTitle,
        description: newTaskDescription || null, due_date: newTaskDueDate || null, status: "pending",
      }).select("id").single();
      if (error) throw error;

      // Insert assignees
      const assigneeRows = assignees.map(uid => ({ task_id: taskData.id, user_id: uid }));
      const { error: assigneeError } = await supabase.from("task_assignees").insert(assigneeRows);
      if (assigneeError) console.error("Error adding assignees:", assigneeError);

      toast({ title: "Task added", description: "Task has been created successfully" });
      setNewTaskTitle(""); setNewTaskDescription(""); setNewTaskDueDate(""); setNewTaskAssignees([]); setIsAddingTask(false);
      fetchTasks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const completed_at = newStatus === "completed" ? new Date().toISOString() : null;
    try {
      const { error } = await supabase.from("tasks").update({ status: newStatus, completed_at }).eq("id", taskId);
      if (error) throw error;
      fetchTasks();
      toast({ title: newStatus === "completed" ? "Task completed" : "Task reopened" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      fetchTasks();
      toast({ title: "Task deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "");
    setEditAssignees(task.assigneeIds || [task.user_id]);
  };

  const cancelEditing = () => {
    setEditingTaskId(null); setEditTitle(""); setEditDescription(""); setEditDueDate(""); setEditAssignees([]);
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!editTitle.trim()) {
      toast({ title: "Error", description: "Task title is required", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("tasks").update({
        title: editTitle, description: editDescription || null, due_date: editDueDate || null,
      }).eq("id", taskId);
      if (error) throw error;

      // Update assignees: delete old, insert new
      await supabase.from("task_assignees").delete().eq("task_id", taskId);
      if (editAssignees.length > 0) {
        const assigneeRows = editAssignees.map(uid => ({ task_id: taskId, user_id: uid }));
        await supabase.from("task_assignees").insert(assigneeRows);
      }

      toast({ title: "Task updated" });
      cancelEditing();
      fetchTasks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === "completed") return false;
    return new Date(task.due_date) < new Date();
  };

  const isDueSoon = (task: Task) => {
    if (!task.due_date || task.status === "completed" || isOverdue(task)) return false;
    const due = new Date(task.due_date);
    const hoursUntil = (due.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntil <= 2;
  };

  const formatDueLabel = (task: Task) => {
    if (!task.due_date) return null;
    const due = new Date(task.due_date);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (task.status === "completed") {
      return due.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
    if (diffMs < 0) {
      const overdueMins = Math.abs(diffMins);
      if (overdueMins < 60) return `Overdue by ${overdueMins}m`;
      const overdueHrs = Math.abs(diffHours);
      if (overdueHrs < 24) return `Overdue by ${overdueHrs}h`;
      return `Overdue · ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    if (diffMins < 60) return `Due in ${diffMins}m`;
    if (diffHours <= 2) return `Due in ${diffHours}h`;
    return due.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const overdueTasks = tasks.filter(t => isOverdue(t));
  const pendingTasks = tasks.filter(t => t.status !== "completed" && !isOverdue(t));
  const completedTasks = tasks.filter(t => t.status === "completed");

  const renderTask = (task: Task, borderColor: string) => (
    <div
      key={task.id}
      className={`group relative pl-4 pr-3 py-3 rounded-lg border bg-card transition-all hover:shadow-sm border-l-[3px] ${borderColor}`}
    >
      {editingTaskId === task.id ? (
        <div className="space-y-2">
          <Input placeholder="Task title..." value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm h-9" autoFocus />
          <Textarea placeholder="Description (optional)..." value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="text-sm min-h-[50px] resize-none" />
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="text-sm h-8 flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            <div className="flex-1">
              <MultiAgentSelect selectedIds={editAssignees} onSelectionChange={setEditAssignees} placeholder="Assign to..." />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => handleUpdateTask(task.id)} size="sm" className="h-8 text-xs flex-1 gap-1">
              <Save className="h-3 w-3" /> Save
            </Button>
            <Button onClick={cancelEditing} variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.status === "completed"}
            onCheckedChange={() => handleToggleTask(task.id, task.status)}
            className="mt-1 shrink-0 h-5 w-5"
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              {task.due_date && (
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  isOverdue(task)
                    ? "bg-destructive/10 text-destructive"
                    : isDueSoon(task)
                      ? "bg-warning/10 text-warning"
                      : "bg-muted text-muted-foreground font-normal"
                }`}>
                  {isOverdue(task) ? <AlertTriangle className="h-3 w-3" /> : isDueSoon(task) ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                  {formatDueLabel(task)}
                </span>
              )}
              {task.assigneeNames && task.assigneeNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.assigneeNames.map((name, i) => (
                    <span key={i} className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={() => startEditing(task)} className="h-7 w-7 text-muted-foreground hover:text-primary">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const SectionHeader = ({ icon: Icon, label, count, color, isOpen, onToggle }: { icon: any; label: string; count: number; color: string; isOpen: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full py-2 px-1 text-left group/header"
    >
      {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</span>
      <Badge variant="secondary" className={`text-[10px] h-4 px-1.5 ml-auto ${count === 0 ? 'opacity-50' : ''}`}>
        {count}
      </Badge>
    </button>
  );

  return (
    <Card className="border overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Tasks</h3>
              <p className="text-[11px] text-muted-foreground">
                {pendingTasks.length + overdueTasks.length} active · {completedTasks.length} done
              </p>
            </div>
          </div>
          <Button
            variant={isAddingTask ? "secondary" : "default"}
            size="sm"
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="h-8 text-xs gap-1"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Task
          </Button>
        </div>

        {/* Add Task Form */}
        {isAddingTask && (
          <div className="mb-4 p-4 bg-muted/30 rounded-xl border border-dashed border-primary/20 space-y-3">
            {/* Quick Task Presets */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Tasks</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TASK_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 rounded-full hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                    onClick={() => {
                      setNewTaskTitle(preset.title);
                      setNewTaskDescription(preset.description);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/50" />

            <Input
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="text-sm h-9 bg-background"
              autoFocus
            />
            <Textarea
              placeholder="Add details (optional)..."
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              className="text-sm min-h-[50px] resize-none bg-background"
            />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input type="datetime-local" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="text-sm h-8 flex-1 bg-background" />
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              <div className="flex-1">
                <MultiAgentSelect selectedIds={newTaskAssignees} onSelectionChange={setNewTaskAssignees} placeholder="Assign to (default: me)..." />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleAddTask} size="sm" className="h-8 text-xs flex-1">Create Task</Button>
              <Button onClick={() => setIsAddingTask(false)} variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
            </div>
          </div>
        )}

        {/* Task Groups */}
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No tasks yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create your first task above</p>
            </div>
          ) : (
            <>
              {/* Overdue */}
              {overdueTasks.length > 0 && (
                <Collapsible open={overdueOpen} onOpenChange={setOverdueOpen}>
                  <CollapsibleTrigger asChild>
                    <div>
                      <SectionHeader icon={AlertTriangle} label="Overdue" count={overdueTasks.length} color="text-destructive" isOpen={overdueOpen} onToggle={() => setOverdueOpen(!overdueOpen)} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 pb-3 pl-1">
                      {overdueTasks.map(t => renderTask(t, "border-l-destructive"))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Pending */}
              <Collapsible open={pendingOpen} onOpenChange={setPendingOpen}>
                <CollapsibleTrigger asChild>
                  <div>
                    <SectionHeader icon={Clock} label="Pending" count={pendingTasks.length} color="text-primary" isOpen={pendingOpen} onToggle={() => setPendingOpen(!pendingOpen)} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pb-3 pl-1">
                    {pendingTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">All caught up! 🎉</p>
                    ) : (
                      pendingTasks.map(t => renderTask(t, "border-l-primary"))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Completed */}
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
                <CollapsibleTrigger asChild>
                  <div>
                    <SectionHeader icon={CheckCircle2} label="Completed" count={completedTasks.length} color="text-success" isOpen={completedOpen} onToggle={() => setCompletedOpen(!completedOpen)} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pb-3 pl-1">
                    {completedTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">No completed tasks</p>
                    ) : (
                      completedTasks.map(t => renderTask(t, "border-l-success"))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
