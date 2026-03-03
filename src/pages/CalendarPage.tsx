import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, startOfDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, CheckSquare, AlertTriangle } from "lucide-react";
import { AddAppointmentDialog } from "@/components/AddAppointmentDialog";
import { CalendarFilters } from "@/components/CalendarFilters";
import { UpcomingAppointments } from "@/components/UpcomingAppointments";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop<CalendarEvent, object>(BigCalendar);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'appointment' | 'task';
  resource: {
    leadId: string;
    userId: string;
    agentName: string;
    description?: string;
    status: string;
  };
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  lead_id: string;
  user_id: string;
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const { session, isAdmin } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'team' | 'individual'>('individual');
  const [calendarView, setCalendarView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [agents, setAgents] = useState<Array<{ userId: string; agentName: string }>>([]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [view, session?.user?.id]);

  const fetchData = useCallback(async () => {
    try {
      const user = session?.user;
      if (!user) return;

      // Get user's organization
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const orgId = userProfile?.organization_id;

      // Get org user IDs for organization-wide queries
      let orgUserIds: string[] = [user.id];
      if (orgId) {
        const { data: orgProfiles } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("organization_id", orgId);
        orgUserIds = orgProfiles?.map(p => p.user_id) || [user.id];
      }

      // Fetch appointments
      let appointmentQuery = supabase
        .from("appointments")
        .select(`
          *,
          lead:leads(name)
        `)
        .order("appointment_date", { ascending: true });

      // If not admin or viewing individual calendar, filter by user
      if (!isAdmin || view === 'individual') {
        appointmentQuery = appointmentQuery.eq("user_id", user.id);
      }

      // Fetch tasks - RLS handles organization filtering
      const tasksQuery = supabase
        .from("tasks")
        .select("*")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      const [appointmentsResult, tasksResult] = await Promise.all([
        appointmentQuery,
        tasksQuery
      ]);

      if (appointmentsResult.error) throw appointmentsResult.error;
      if (tasksResult.error) throw tasksResult.error;

      const appointments = appointmentsResult.data || [];
      const tasksData = tasksResult.data || [];
      setTasks(tasksData);

      // Fetch user profiles for agent names
      const allUserIds = [...new Set([
        ...appointments.map(a => a.user_id),
        ...tasksData.map(t => t.user_id)
      ])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", allUserIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'])
      );

      // Create appointment events
      const appointmentEvents: CalendarEvent[] = appointments.map(appointment => {
        const appointmentDate = new Date(appointment.appointment_date);
        const duration = appointment.duration || 60;
        return {
          id: appointment.id,
          title: appointment.title,
          start: appointmentDate,
          end: new Date(appointmentDate.getTime() + duration * 60 * 1000),
          type: 'appointment' as const,
          resource: {
            leadId: appointment.lead_id,
            userId: appointment.user_id,
            agentName: profileMap.get(appointment.user_id) || "Unknown Agent",
            description: appointment.description,
            status: appointment.status,
          },
        };
      });

      // Create task events
      const taskEvents: CalendarEvent[] = tasksData
        .filter(task => task.due_date)
        .map(task => {
          const dueDate = new Date(task.due_date!);
          return {
            id: `task-${task.id}`,
            title: `📋 ${task.title}`,
            start: dueDate,
            end: new Date(dueDate.getTime() + 30 * 60 * 1000), // 30 min duration for display
            type: 'task' as const,
            resource: {
              leadId: task.lead_id,
              userId: task.user_id,
              agentName: profileMap.get(task.user_id) || "Unknown",
              description: task.description || undefined,
              status: task.status,
            },
          };
        });

      const allEvents = [...appointmentEvents, ...taskEvents];
      setEvents(allEvents);
      
      // Extract unique agents
      const uniqueAgents = Array.from(
        new Map(
          allEvents.map((e) => [e.resource.userId, { userId: e.resource.userId, agentName: e.resource.agentName }])
        ).values()
      );
      setAgents(uniqueAgents);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  }, [view, isAdmin, session?.user]);

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.resource.agentName.toLowerCase().includes(query)
      );
    }

    // Agent filter
    if (selectedAgent !== "all") {
      filtered = filtered.filter((e) => e.resource.userId === selectedAgent);
    }

    // Status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter((e) => e.resource.status === selectedStatus);
    }

    return filtered;
  }, [events, searchQuery, selectedAgent, selectedStatus]);

  // Task stats
  const taskStats = useMemo(() => {
    const today = startOfDay(new Date());
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status !== 'completed').length;
    const pastDue = tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      return new Date(t.due_date) < today;
    }).length;
    return { total, completed, pending, pastDue };
  }, [tasks]);

  const handleEventClick = (event: CalendarEvent) => {
    try {
      if (event.resource.leadId) {
        navigate(`/leads/${event.resource.leadId}`);
      }
    } catch (error) {
      console.error("Error navigating to lead:", error);
      toast.error("Failed to open lead profile");
    }
  };

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    const newDate = new Date(currentDate);
    
    if (action === 'PREV') {
      if (calendarView === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (calendarView === 'week') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() - 1);
      }
    } else if (action === 'NEXT') {
      if (calendarView === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (calendarView === 'week') {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
    } else {
      setCurrentDate(new Date());
      return;
    }
    
    setCurrentDate(newDate);
  };

  const handleEventDrop = useCallback(async ({ event, start, end }: any) => {
    // Only allow dragging appointments, not tasks
    if (event.type === 'task') {
      toast.error("Tasks cannot be rescheduled from the calendar");
      return;
    }

    try {
      // Optimistically update UI
      setEvents(prevEvents => 
        prevEvents.map(e => 
          e.id === event.id 
            ? { ...e, start, end }
            : e
        )
      );

      const { error } = await supabase
        .from('appointments')
        .update({ appointment_date: start.toISOString() })
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Appointment rescheduled');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
      fetchData();
    }
  }, []);

  const handleEventResize = useCallback(async ({ event, start, end }: any) => {
    // Only allow resizing appointments, not tasks
    if (event.type === 'task') {
      toast.error("Tasks cannot be resized");
      return;
    }

    try {
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      // Optimistically update UI
      setEvents(prevEvents => 
        prevEvents.map(e => 
          e.id === event.id 
            ? { ...e, start, end }
            : e
        )
      );

      const { error } = await supabase
        .from('appointments')
        .update({ 
          appointment_date: start.toISOString(),
          duration: durationMinutes 
        })
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Appointment updated');
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
      fetchData();
    }
  }, []);

  // No full-page loading block - render immediately, data populates progressively

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Calendar
          </h1>
          <p className="text-muted-foreground">
            View and manage your appointments and tasks
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual">My Calendar</TabsTrigger>
                <TabsTrigger value="team">Team Calendar</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <AddAppointmentDialog onSuccess={fetchData} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search appointments and tasks by title or agent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats Bar - Appointments */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {filteredEvents.filter(e => e.type === 'appointment').length}
              </p>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
              <Badge className="h-5 w-5 bg-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {filteredEvents.filter(e => e.type === 'appointment' && e.resource.status === 'completed').length}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
              <Badge className="h-5 w-5 bg-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {filteredEvents.filter(e => e.type === 'appointment' && e.resource.status === 'pending').length}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        
        {view === 'team' && (
          <Card className="p-4 bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-info/20 flex items-center justify-center">
                <Badge className="h-5 w-5 bg-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(filteredEvents.map(e => e.resource.userId)).size}
                </p>
                <p className="text-xs text-muted-foreground">Team Members</p>
              </div>
            </div>
          </Card>
        )}

        {/* Task Stats */}
        <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{taskStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{taskStats.completed}</p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{taskStats.pending}</p>
              <p className="text-xs text-muted-foreground">Tasks Pending</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{taskStats.pastDue}</p>
              <p className="text-xs text-muted-foreground">Past Due</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary"></div>
          <span className="text-muted-foreground">Appointments</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-violet-500"></div>
          <span className="text-muted-foreground">Tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success"></div>
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive"></div>
          <span className="text-muted-foreground">Past Due Tasks</span>
        </div>
      </div>

      {/* Main Calendar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <CalendarFilters
            agents={agents}
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />
          <UpcomingAppointments 
            events={filteredEvents.filter(e => e.type === 'appointment')} 
            onEventClick={handleEventClick} 
            onRefresh={fetchData} 
          />
        </div>

        {/* Calendar Card */}
        <Card className="lg:col-span-3 overflow-hidden">
        {/* Calendar Controls */}
        <div className="p-4 md:p-6 border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate('TODAY')}
              >
                Today
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleNavigate('PREV')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleNavigate('NEXT')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-lg font-semibold text-foreground ml-2">
                {format(currentDate, 'MMMM yyyy')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as View)}>
                <TabsList>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="agenda">Agenda</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="p-4 md:p-6">
          <div style={{ height: '650px' }} className="calendar-wrapper">
            <DnDCalendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              view={calendarView}
              date={currentDate}
              onNavigate={setCurrentDate}
              onView={setCalendarView}
              onSelectEvent={handleEventClick}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              draggableAccessor={(event) => event.type === 'appointment'}
              resizable
              views={['month', 'week', 'day', 'agenda']}
              toolbar={false}
              eventPropGetter={(event) => {
                const isTask = event.type === 'task';
                const isCompleted = event.resource.status === 'completed';
                const isPastDue = isTask && !isCompleted && new Date(event.start) < startOfDay(new Date());
                
                let backgroundColor = 'hsl(var(--primary))'; // Default appointment color
                
                if (isTask) {
                  if (isPastDue) {
                    backgroundColor = 'hsl(var(--destructive))';
                  } else if (isCompleted) {
                    backgroundColor = 'hsl(var(--success))';
                  } else {
                    backgroundColor = 'hsl(262 83% 58%)'; // Violet for tasks
                  }
                } else if (isCompleted) {
                  backgroundColor = 'hsl(var(--success))';
                }
                
                return {
                  style: {
                    backgroundColor,
                    borderRadius: '6px',
                    opacity: isCompleted ? 0.7 : 0.9,
                    color: 'white',
                    border: '0px',
                    display: 'block',
                    padding: '4px 8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  },
                  className: 'hover:scale-105 hover:shadow-lg'
                };
              }}
              tooltipAccessor={(event) => 
                `${event.title}\nAgent: ${event.resource.agentName}\nStatus: ${event.resource.status}\n${event.resource.description || ''}`
              }
            />
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
};

export default CalendarPage;