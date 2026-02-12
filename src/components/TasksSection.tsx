import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlusCircle, Calendar, CheckCircle2, Trash2, Pencil, Save, ChevronDown, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  user_id: string;
  assignedToName?: string;
}

interface TasksSectionProps {
  leadId: string;
}

export const TasksSection = ({ leadId }: TasksSectionProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
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
      const tasks = data || [];

      const userIds = [...new Set(tasks.map(t => t.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", userIds);

        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown User'])
        );
        setTasks(tasks.map(t => ({ ...t, assignedToName: profileMap.get(t.user_id) || 'Unknown User' })));
      } else {
        setTasks(tasks);
      }
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

      const { error } = await supabase.from("tasks").insert({
        lead_id: leadId, user_id: user.id, title: newTaskTitle,
        description: newTaskDescription || null, due_date: newTaskDueDate || null, status: "pending",
      });
      if (error) throw error;
      toast({ title: "Task added", description: "Task has been created successfully" });
      setNewTaskTitle(""); setNewTaskDescription(""); setNewTaskDueDate(""); setIsAddingTask(false);
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
    setEditDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : "");
  };

  const cancelEditing = () => {
    setEditingTaskId(null); setEditTitle(""); setEditDescription(""); setEditDueDate("");
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
      toast({ title: "Task updated" });
      cancelEditing();
      fetchTasks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === "completed") return false;
    const due = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
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
            <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="text-sm h-8 flex-1" />
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
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                  isOverdue(task)
                    ? "bg-destructive/10 text-destructive font-medium"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isOverdue(task) ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {task.assignedToName && (
                <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {task.assignedToName}
                </span>
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
              <Input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="text-sm h-8 flex-1 bg-background" />
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
