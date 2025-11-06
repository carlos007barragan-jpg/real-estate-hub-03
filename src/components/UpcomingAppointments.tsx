import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User } from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  resource: {
    leadId: string;
    agentName: string;
    status: string;
  };
}

interface UpcomingAppointmentsProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export const UpcomingAppointments = ({ events, onEventClick }: UpcomingAppointmentsProps) => {
  const upcomingEvents = events
    .filter((e) => !isPast(e.start) || isToday(e.start))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM dd");
  };

  return (
    <Card className="p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Upcoming</h3>
      </div>

      <ScrollArea className="h-[calc(100%-3rem)]">
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No upcoming appointments
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                  <Badge
                    variant={event.resource.status === "completed" ? "secondary" : "default"}
                    className="text-xs shrink-0"
                  >
                    {event.resource.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{getDateLabel(event.start)} at {format(event.start, "h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <User className="h-3 w-3" />
                  <span>{event.resource.agentName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
