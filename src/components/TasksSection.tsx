import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Calendar, CheckCircle2, Trash2, Pencil, X, Save, AlertTriangle } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
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
        lead_id: leadId,
        user_id: user.id,
        title: newTaskTitle,
        description: newTaskDescription || null,
        due_date: newTaskDueDate || null,
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Task added", description: "Task has been created successfully" });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueDate("");
      setIsAddingTask(false);
      fetchTasks();
    } catch (error: any) {
      console.error("Error adding task:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const completed_at = newStatus === "completed" ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, completed_at })
        .eq("id", taskId);

      if (error) throw error;
      fetchTasks();
      toast({ title: newStatus === "completed" ? "Task completed" : "Task reopened" });
    } catch (error: any) {
      console.error("Error updating task:", error);
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
      console.error("Error deleting task:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    if (task.due_date) {
      const date = new Date(task.due_date);
      setEditDueDate(date.toISOString().split('T')[0]);
    } else {
      setEditDueDate("");
    }
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
    setEditDueDate("");
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!editTitle.trim()) {
      toast({ title: "Error", description: "Task title is required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editTitle,
          description: editDescription || null,
          due_date: editDueDate || null,
        })
        .eq("id", taskId);

      if (error) throw error;
      toast({ title: "Task updated", description: "Task has been updated successfully" });
      cancelEditing();
      fetchTasks();
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const pendingTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const filteredTasks = activeTab === "pending" ? pendingTasks : completedTasks;

  return (
    <Card className="border">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Tasks</h3>
            {pendingTasks.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {pendingTasks.length} pending
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="h-7 text-xs"
          >
            <PlusCircle className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>

        {/* Add Task Form */}
        {isAddingTask && (
          <div className="mb-4 space-y-2 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
            <Input
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="text-sm h-9"
              autoFocus
            />
            <Textarea
              placeholder="Add details (optional)..."
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              className="text-sm min-h-[50px] resize-none"
            />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="text-sm h-8 flex-1"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleAddTask} size="sm" className="h-8 text-xs flex-1">
                Create Task
              </Button>
              <Button onClick={() => setIsAddingTask(false)} variant="ghost" size="sm" className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-3 p-0.5 bg-muted/50 rounded-md">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 text-xs py-1.5 px-3 rounded transition-colors font-medium ${
              activeTab === "pending"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending ({pendingTasks.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 text-xs py-1.5 px-3 rounded transition-colors font-medium ${
              activeTab === "completed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed ({completedTasks.length})
          </button>
        </div>

        {/* Task List */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-7 w-7 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                {activeTab === "pending" ? "No pending tasks" : "No completed tasks"}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`group p-3 rounded-lg border transition-all ${
                  task.status === "completed"
                    ? "bg-muted/20 border-border/50"
                    : isOverdue(task.due_date)
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-card hover:border-primary/30"
                }`}
              >
                {editingTaskId === task.id ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Task title..."
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-sm h-8"
                      autoFocus
                    />
                    <Textarea
                      placeholder="Description (optional)..."
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="text-sm min-h-[50px] resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="text-sm h-8 flex-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdateTask(task.id)} size="sm" className="h-7 text-xs flex-1">
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button onClick={cancelEditing} variant="ghost" size="sm" className="h-7 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={() => handleToggleTask(task.id, task.status)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${
                        task.status === "completed" ? "line-through text-muted-foreground" : ""
                      }`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        {task.due_date && (
                          <span className={`flex items-center gap-1 text-[11px] ${
                            isOverdue(task.due_date) && task.status !== "completed"
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }`}>
                            {isOverdue(task.due_date) && task.status !== "completed" && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {task.assignedToName && (
                          <span className="text-[11px] text-muted-foreground">{task.assignedToName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(task)}
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};
