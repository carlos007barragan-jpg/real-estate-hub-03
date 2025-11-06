import { useEffect, useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

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
  };
}

const CalendarPage = () => {
  const { isAdmin } = useUserRole();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<'team' | 'individual'>('individual');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [view]);

  const fetchAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("tasks")
        .select(`
          *,
          lead:leads(name)
        `)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      // If not admin or viewing individual calendar, filter by user
      if (!isAdmin || view === 'individual') {
        query = query.eq("user_id", user.id);
      }

      const { data: tasks, error } = await query;

      if (error) throw error;

      // Fetch user profiles for agent names
      const userIds = [...new Set(tasks?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, `${p.first_name} ${p.last_name}`.trim()])
      );

      const calendarEvents: CalendarEvent[] = (tasks || []).map(task => {
        const dueDate = new Date(task.due_date);
        return {
          id: task.id,
          title: task.title,
          start: dueDate,
          end: new Date(dueDate.getTime() + 60 * 60 * 1000), // 1 hour duration
          resource: {
            leadId: task.lead_id,
            userId: task.user_id,
            agentName: profileMap.get(task.user_id) || "Unknown Agent",
            description: task.description,
          },
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    toast.info(`${event.title} - ${event.resource.agentName}`);
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View and manage appointments and tasks
            </p>
          </div>
          {isAdmin && (
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="individual">My Calendar</TabsTrigger>
                <TabsTrigger value="team">Team Calendar</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{events.length} appointments</Badge>
            {view === 'team' && (
              <Badge variant="outline">Team View</Badge>
            )}
          </div>
        </div>

        <div style={{ height: '600px' }}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            onSelectEvent={handleEventClick}
            views={['month', 'week', 'day', 'agenda']}
            defaultView="month"
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: 'hsl(var(--primary))',
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
              }
            })}
            tooltipAccessor={(event) => 
              `${event.title}\nAgent: ${event.resource.agentName}\n${event.resource.description || ''}`
            }
          />
        </div>
      </Card>
    </div>
  );
};

export default CalendarPage;
