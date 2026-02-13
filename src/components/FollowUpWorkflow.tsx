import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Phone, MessageSquare, Mail, FileText, CheckCircle2, Clock, SkipForward, Zap, ChevronDown, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScheduleFollowUpDialog } from "./ScheduleFollowUpDialog";

interface FollowUpWorkflowProps {
  leadId: string;
  leadName: string;
  refreshKey?: number;
  onAction?: (actionType: string) => void;
}

interface FollowUp {
  id: string;
  action_type: string;
  scheduled_date: string;
  status: string;
  sequence_order: number;
  template_name: string | null;
  notes: string | null;
}

const ACTION_META: Record<string, { icon: React.ReactNode; label: string; color: string; btnLabel: string }> = {
  call: { icon: <Phone className="h-4 w-4" />, label: "Call", color: "text-primary", btnLabel: "Call Now" },
  sms: { icon: <MessageSquare className="h-4 w-4" />, label: "SMS", color: "text-success", btnLabel: "Send SMS" },
  email: { icon: <Mail className="h-4 w-4" />, label: "Email", color: "text-warning", btnLabel: "Send Email" },
  note: { icon: <FileText className="h-4 w-4" />, label: "Note", color: "text-muted-foreground", btnLabel: "Add Note" },
};

export const FollowUpWorkflow = ({ leadId, leadName, refreshKey = 0, onAction }: FollowUpWorkflowProps) => {
  const { toast } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const fetchFollowUps = async () => {
    const { data } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("lead_id", leadId)
      .order("sequence_order", { ascending: true });
    setFollowUps((data as FollowUp[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFollowUps();
  }, [leadId, refreshKey]);

  const nextPending = followUps.find(f => f.status === "pending");
  const completedCount = followUps.filter(f => f.status === "completed").length;
  const totalCount = followUps.length;

  const isOverdue = nextPending && new Date(nextPending.scheduled_date) < new Date();
  const isDueToday = nextPending && !isOverdue && new Date(nextPending.scheduled_date).toDateString() === new Date().toDateString();

  const handleComplete = async (id: string) => {
    await supabase.from("follow_ups").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Follow-up completed" });
    fetchFollowUps();
  };

  const handleSkip = async (id: string) => {
    await supabase.from("follow_ups").update({ status: "skipped" }).eq("id", id);
    toast({ title: "Follow-up skipped" });
    fetchFollowUps();
  };

  const handleSnooze = async (id: string, days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    await supabase.from("follow_ups").update({ scheduled_date: newDate.toISOString(), status: "snoozed" }).eq("id", id);
    // Then set back to pending so it shows up again
    await supabase.from("follow_ups").update({ status: "pending" }).eq("id", id);
    toast({ title: `Snoozed for ${days} day(s)` });
    fetchFollowUps();
  };

  const handleActionClick = (actionType: string) => {
    onAction?.(actionType);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // No sequence active — show schedule button
  if (!loading && totalCount === 0) {
    return (
      <>
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setScheduleOpen(true)}>
          <CalendarPlus className="h-4 w-4" />
          Schedule Follow-Up Sequence
        </Button>
        <ScheduleFollowUpDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          leadId={leadId}
          leadName={leadName}
          onScheduled={fetchFollowUps}
        />
      </>
    );
  }

  // All completed
  if (!loading && !nextPending && totalCount > 0) {
    return (
      <>
        <Card className="p-3 border border-success/20 bg-success/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Sequence Complete</span>
              <span className="text-xs text-muted-foreground">({completedCount}/{totalCount} steps)</span>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setScheduleOpen(true)}>
              New Sequence
            </Button>
          </div>
        </Card>
        <ScheduleFollowUpDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          leadId={leadId}
          leadName={leadName}
          onScheduled={fetchFollowUps}
        />
      </>
    );
  }

  if (loading || !nextPending) return null;

  const meta = ACTION_META[nextPending.action_type] || ACTION_META.note;

  return (
    <>
      <Card className={`p-3 border ${isOverdue ? "border-destructive/30 bg-destructive/5" : isDueToday ? "border-primary/30 bg-primary/5" : "border-border"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isOverdue ? "bg-destructive/10" : "bg-primary/10"}`}>
              <span className={isOverdue ? "text-destructive" : meta.color}>{meta.icon}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">Next: {meta.label}</span>
                <Badge variant="secondary" className={`text-[10px] ${isOverdue ? "bg-destructive/10 text-destructive" : isDueToday ? "bg-primary/10 text-primary" : ""}`}>
                  <Clock className="h-3 w-3 mr-0.5" />
                  {formatDate(nextPending.scheduled_date)}
                </Badge>
                <span className="text-[10px] text-muted-foreground">Step {nextPending.sequence_order + 1}/{totalCount}</span>
              </div>
              {/* Mini timeline */}
              <div className="flex items-center gap-0.5 mt-2">
                {followUps.map((f, i) => (
                  <div
                    key={f.id}
                    className={`h-1.5 flex-1 rounded-full ${
                      f.status === "completed" ? "bg-success" :
                      f.status === "skipped" ? "bg-muted-foreground/30" :
                      f.id === nextPending.id ? (isOverdue ? "bg-destructive" : "bg-primary") :
                      "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => { handleComplete(nextPending.id); handleActionClick(nextPending.action_type); }}>
              {meta.btnLabel}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleComplete(nextPending.id)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Mark Complete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSkip(nextPending.id)}>
                  <SkipForward className="h-3.5 w-3.5 mr-2" /> Skip
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSnooze(nextPending.id, 1)}>
                  <Clock className="h-3.5 w-3.5 mr-2" /> Snooze 1 Day
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSnooze(nextPending.id, 3)}>
                  <Clock className="h-3.5 w-3.5 mr-2" /> Snooze 3 Days
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      <ScheduleFollowUpDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        leadId={leadId}
        leadName={leadName}
        onScheduled={fetchFollowUps}
      />
    </>
  );
};
