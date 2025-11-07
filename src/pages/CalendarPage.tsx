import { useEffect, useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
  resource: {
    leadId: string;
    userId: string;
    agentName: string;
    description?: string;
    status: string;
  };
}

const CalendarPage = () => {
  const { isAdmin } = useUserRole();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<'team' | 'individual'>('individual');
  const [calendarView, setCalendarView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [agents, setAgents] = useState<Array<{ userId: string; agentName: string }>>([]);

  useEffect(() => {
    fetchAppointments();
  }, [view]);

  useEffect(() => {
    applyFilters();
  }, [events, searchQuery, selectedAgent, selectedStatus]);

  const fetchAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("appointments")
        .select(`
          *,
          lead:leads(name)
        `)
        .order("appointment_date", { ascending: true });

      // If not admin or viewing individual calendar, filter by user
      if (!isAdmin || view === 'individual') {
        query = query.eq("user_id", user.id);
      }

      const { data: appointments, error } = await query;

      if (error) throw error;

      // Fetch user profiles for agent names
      const userIds = [...new Set(appointments?.map(a => a.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, `${p.first_name} ${p.last_name}`.trim()])
      );

      const calendarEvents: CalendarEvent[] = (appointments || []).map(appointment => {
        const appointmentDate = new Date(appointment.appointment_date);
        const duration = appointment.duration || 60;
        return {
          id: appointment.id,
          title: appointment.title,
          start: appointmentDate,
          end: new Date(appointmentDate.getTime() + duration * 60 * 1000),
          resource: {
            leadId: appointment.lead_id,
            userId: appointment.user_id,
            agentName: profileMap.get(appointment.user_id) || "Unknown Agent",
            description: appointment.description,
            status: appointment.status,
          },
        };
      });

      setEvents(calendarEvents);
      
      // Extract unique agents
      const uniqueAgents = Array.from(
        new Map(
          calendarEvents.map((e) => [e.resource.userId, { userId: e.resource.userId, agentName: e.resource.agentName }])
        ).values()
      );
      setAgents(uniqueAgents);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
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

    setFilteredEvents(filtered);
  };

  const handleEventClick = (event: CalendarEvent) => {
    window.location.href = `/leads/${event.resource.leadId}`;
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

  const handleEventDrop = async ({ event, start, end }: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ appointment_date: start.toISOString() })
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Appointment rescheduled');
      fetchAppointments();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    try {
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      const { error } = await supabase
        .from('appointments')
        .update({ 
          appointment_date: start.toISOString(),
          duration: durationMinutes 
        })
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Appointment updated');
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

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
          <AddAppointmentDialog onSuccess={fetchAppointments} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search appointments by title or agent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{filteredEvents.length}</p>
              <p className="text-xs text-muted-foreground">Total Appointments</p>
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
                {filteredEvents.filter(e => e.resource.status === 'completed').length}
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
                {filteredEvents.filter(e => e.resource.status === 'pending').length}
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
          <UpcomingAppointments events={filteredEvents} onEventClick={handleEventClick} onRefresh={fetchAppointments} />
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
              draggableAccessor={() => true}
              resizable
              views={['month', 'week', 'day', 'agenda']}
              toolbar={false}
              eventPropGetter={(event) => {
                const isCompleted = event.resource.status === 'completed';
                return {
                  style: {
                    backgroundColor: isCompleted 
                      ? 'hsl(var(--success))' 
                      : 'hsl(var(--primary))',
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
