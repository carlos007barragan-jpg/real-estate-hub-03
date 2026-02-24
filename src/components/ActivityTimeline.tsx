import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, StickyNote, MessageSquare, CheckCircle2, Calendar, Clock, PhoneIncoming, PhoneOutgoing, Filter, Activity, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TimelineEvent {
  id: string;
  type: "note" | "call" | "sms" | "task" | "appointment" | "commission";
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

interface ActivityTimelineProps {
  leadId: string;
  notes: { id: string; content: string; author: string; timestamp: string }[];
  userRole?: string | null;
}

export const ActivityTimeline = ({ leadId, notes, userRole }: ActivityTimelineProps) => {
  const [calls, setCalls] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [commissionData, setCommissionData] = useState<{ total: number; createdAt: string; enteredBy?: string } | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const isSupremeAdmin = userRole === "supreme_admin";

  useEffect(() => {
    const fetchAll = async () => {
      const callsP = supabase.from("call_logs").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
      const smsP = supabase.from("sms_logs").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
      const tasksP = supabase.from("tasks").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
      const aptsP = supabase.from("appointments").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });

      const [callsRes, smsRes, tasksRes, aptsRes] = await Promise.all([callsP, smsP, tasksP, aptsP]);

      setCalls(callsRes.data || []);
      setSmsLogs(smsRes.data || []);
      setTasks(tasksRes.data || []);
      setAppointments(aptsRes.data || []);

      if (isSupremeAdmin) {
        const { data: commEntries } = await supabase.from("commission_entries").select("payout_amount, created_at, created_by").eq("lead_id", leadId);
        if (commEntries && commEntries.length > 0) {
          const total = commEntries.reduce((sum, e) => sum + Number(e.payout_amount || 0), 0);
          const earliest = commEntries.reduce((min: string, e) => e.created_at < min ? e.created_at : min, commEntries[0].created_at);
          
          // Look up who entered the commission
          let enteredBy = "Unknown";
          const createdById = commEntries[0].created_by;
          if (createdById) {
            const { data: creatorProfile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("user_id", createdById)
              .maybeSingle();
            if (creatorProfile) {
              enteredBy = `${creatorProfile.first_name || ""} ${creatorProfile.last_name || ""}`.trim() || "Unknown";
            }
          }
          
          setCommissionData({ total, createdAt: earliest, enteredBy });
        }
      }
    };

    fetchAll();
  }, [leadId, isSupremeAdmin]);

  const events = useMemo(() => {
    const all: TimelineEvent[] = [];

    notes.forEach(n => {
      all.push({
        id: `note-${n.id}`, type: "note", title: "Note added",
        description: n.content, timestamp: n.timestamp, metadata: { author: n.author },
      });
    });

    calls.forEach(c => {
      all.push({
        id: `call-${c.id}`, type: "call",
        title: `${c.direction === "inbound" ? "Inbound" : "Outbound"} call`,
        description: c.status === "completed" ? `Duration: ${Math.floor((c.duration || 0) / 60)}:${((c.duration || 0) % 60).toString().padStart(2, "0")}` : `Status: ${c.status}`,
        timestamp: new Date(c.created_at).toLocaleString(),
        metadata: { direction: c.direction, status: c.status },
      });
    });

    smsLogs.forEach(s => {
      all.push({
        id: `sms-${s.id}`, type: "sms", title: "SMS sent",
        description: s.message?.slice(0, 100) + (s.message?.length > 100 ? "..." : ""),
        timestamp: new Date(s.created_at).toLocaleString(),
      });
    });

    tasks.forEach(t => {
      all.push({
        id: `task-${t.id}`, type: "task",
        title: t.status === "completed" ? "Task completed" : "Task created",
        description: t.title,
        timestamp: new Date(t.status === "completed" && t.completed_at ? t.completed_at : t.created_at).toLocaleString(),
        metadata: { status: t.status },
      });
    });

    appointments.forEach(a => {
      all.push({
        id: `apt-${a.id}`, type: "appointment",
        title: `Appointment: ${a.title}`,
        description: `${a.status} · ${new Date(a.appointment_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${new Date(a.appointment_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        timestamp: new Date(a.created_at).toLocaleString(),
        metadata: { status: a.status },
      });
      // Add a separate "confirmed" event if the appointment was confirmed
      if (a.status === "confirmed" && a.updated_at && a.updated_at !== a.created_at) {
        all.push({
          id: `apt-confirmed-${a.id}`, type: "appointment",
          title: `✓ Appointment Confirmed: ${a.title}`,
          description: `Confirmed for ${new Date(a.appointment_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${new Date(a.appointment_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          timestamp: new Date(a.updated_at).toLocaleString(),
          metadata: { status: "confirmed" },
        });
      }
    });

    if (isSupremeAdmin && commissionData) {
      all.push({
        id: `commission-${leadId}`,
        type: "commission",
        title: "Commission recorded and paid out",
        description: commissionData.enteredBy ? `Entered by ${commissionData.enteredBy}` : "Commission completed",
        timestamp: new Date(commissionData.createdAt).toLocaleString(),
      });
    }

    // Sort by timestamp descending
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return all;
  }, [notes, calls, smsLogs, tasks, appointments, commissionData, isSupremeAdmin, leadId]);

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);

  const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
    note: { icon: <StickyNote className="h-3.5 w-3.5" />, color: "bg-primary/10 text-primary" },
    call: { icon: <Phone className="h-3.5 w-3.5" />, color: "bg-success/10 text-success" },
    sms: { icon: <MessageSquare className="h-3.5 w-3.5" />, color: "bg-info/10 text-info" },
    task: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "bg-warning/10 text-warning" },
    appointment: { icon: <Calendar className="h-3.5 w-3.5" />, color: "bg-accent text-accent-foreground" },
    commission: { icon: <DollarSign className="h-3.5 w-3.5" />, color: "bg-success/10 text-success" },
  };

  const filters = [
    { key: "all", label: "All" },
    { key: "note", label: "Notes" },
    { key: "call", label: "Calls" },
    { key: "sms", label: "SMS" },
    { key: "task", label: "Tasks" },
    { key: "appointment", label: "Appts" },
    ...(isSupremeAdmin ? [{ key: "commission", label: "Commission" }] : []),
  ];

  return (
    <Card className="border overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Activity Timeline</h3>
              <p className="text-[11px] text-muted-foreground">{events.length} events</p>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {filters.map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className="h-7 text-xs px-3"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Timeline */}
        <ScrollArea className="max-h-[400px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="h-6 w-6 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-3">
                {filtered.map(event => {
                  const { icon, color } = iconMap[event.type];

                  return (
                    <div key={event.id} className="flex gap-3 relative">
                      <div className={`z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {event.type}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {event.timestamp}
                          </span>
                          {event.metadata?.author && (
                            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{event.metadata.author}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
};
