import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Calendar, CheckCircle2, Trash2, Pencil, X, Save } from "lucide-react";
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

      // Batch-fetch profile names for all unique user_ids
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
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
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

      toast({
        title: "Task added",
        description: "Task has been created successfully",
      });

      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueDate("");
      setIsAddingTask(false);
      fetchTasks();
    } catch (error: any) {
      console.error("Error adding task:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: newStatus === "completed" ? "Task completed" : "Task reopened",
      });
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      fetchTasks();
      toast({
        title: "Task deleted",
      });
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    // Format date for input[type="date"] - needs YYYY-MM-DD format
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
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
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

      toast({
        title: "Task updated",
        description: "Task has been updated successfully",
      });

      cancelEditing();
      fetchTasks();
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Tasks
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="h-7 text-xs"
          >
            <PlusCircle className="h-3 w-3 mr-1" />
            Add Task
          </Button>
        </div>

        {isAddingTask && (
          <div className="mb-3 space-y-2 p-3 bg-muted/30 rounded-lg">
            <Input
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="text-sm h-8"
            />
            <Textarea
              placeholder="Description (optional)..."
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              className="text-sm min-h-[60px] resize-none"
            />
            <Input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              className="text-sm h-8"
            />
            <div className="flex gap-2">
              <Button onClick={handleAddTask} size="sm" className="h-7 text-xs flex-1">
                Create Task
              </Button>
              <Button
                onClick={() => setIsAddingTask(false)}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[180px]">
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${
                    task.status === "completed" ? "bg-muted/20" : "bg-card"
                  }`}
                >
                  {editingTaskId === task.id ? (
                    // Edit mode
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
                        className="text-sm min-h-[60px] resize-none"
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
                        <Button 
                          onClick={() => handleUpdateTask(task.id)} 
                          size="sm" 
                          className="h-7 text-xs flex-1"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={() => handleToggleTask(task.id, task.status)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            task.status === "completed" ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        )}
                        {task.assignedToName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Assigned to: {task.assignedToName}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            Created: {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(task)}
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTask(task.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};