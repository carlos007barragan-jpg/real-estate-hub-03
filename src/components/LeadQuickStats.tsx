import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Phone, CheckCircle2, Calendar, Clock, MessageSquare, AlertTriangle } from "lucide-react";

interface LeadQuickStatsProps {
  leadId: string;
}

export const LeadQuickStats = ({ leadId }: LeadQuickStatsProps) => {
  const [stats, setStats] = useState({
    daysSinceContact: 0,
    totalCalls: 0,
    tasksCompleted: 0,
    totalTasks: 0,
    nextAppointment: null as string | null,
    totalMessages: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch all stats in parallel
      const [callsRes, tasksRes, appointmentsRes, smsRes] = await Promise.all([
        supabase.from("call_logs").select("created_at", { count: "exact" }).eq("lead_id", leadId).order("created_at", { ascending: false }),
        supabase.from("tasks").select("status", { count: "exact" }).eq("lead_id", leadId),
        supabase.from("appointments").select("appointment_date, status").eq("lead_id", leadId).gte("appointment_date", new Date().toISOString()).eq("status", "pending").order("appointment_date", { ascending: true }).limit(1),
        supabase.from("sms_logs").select("created_at", { count: "exact" }).eq("lead_id", leadId).order("created_at", { ascending: false }),
      ]);

      // Calculate days since last contact (most recent call or SMS)
      const lastCallDate = callsRes.data?.[0]?.created_at;
      const lastSmsDate = smsRes.data?.[0]?.created_at;
      const lastContactDates = [lastCallDate, lastSmsDate].filter(Boolean).map(d => new Date(d!).getTime());
      const lastContact = lastContactDates.length > 0 ? Math.max(...lastContactDates) : null;
      const daysSinceContact = lastContact 
        ? Math.floor((Date.now() - lastContact) / (1000 * 60 * 60 * 24)) 
        : -1; // -1 means never contacted

      const tasksCompleted = tasksRes.data?.filter(t => t.status === "completed").length || 0;
      const totalTasks = tasksRes.count || 0;
      const nextAppointment = appointmentsRes.data?.[0]?.appointment_date || null;

      setStats({
        daysSinceContact,
        totalCalls: callsRes.count || 0,
        tasksCompleted,
        totalTasks,
        nextAppointment,
        totalMessages: smsRes.count || 0,
      });
    };

    fetchStats();
  }, [leadId]);

  const formatNextAppointment = (date: string | null) => {
    if (!date) return "None";
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const contactLabel = stats.daysSinceContact === -1 
    ? "Never" 
    : stats.daysSinceContact === 0 
      ? "Today" 
      : `${stats.daysSinceContact}d ago`;

  const contactUrgent = stats.daysSinceContact >= 3 || stats.daysSinceContact === -1;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className={`p-3 border ${contactUrgent ? 'border-destructive/30 bg-destructive/5' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          {contactUrgent ? (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Last Contact</span>
        </div>
        <p className={`text-lg font-bold ${contactUrgent ? 'text-destructive' : 'text-foreground'}`}>
          {contactLabel}
        </p>
      </Card>

      <Card className="p-3 border">
        <div className="flex items-center gap-2 mb-1">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Calls / SMS</span>
        </div>
        <p className="text-lg font-bold text-foreground">
          {stats.totalCalls} / {stats.totalMessages}
        </p>
      </Card>

      <Card className="p-3 border">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Tasks Done</span>
        </div>
        <p className="text-lg font-bold text-foreground">
          {stats.tasksCompleted}<span className="text-sm font-normal text-muted-foreground">/{stats.totalTasks}</span>
        </p>
      </Card>

      <Card className="p-3 border">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Next Appt</span>
        </div>
        <p className="text-lg font-bold text-foreground">
          {formatNextAppointment(stats.nextAppointment)}
        </p>
      </Card>
    </div>
  );
};
