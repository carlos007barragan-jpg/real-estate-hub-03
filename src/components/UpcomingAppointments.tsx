import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, User, CalendarCheck, CalendarClock } from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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
  onRefresh?: () => void;
}

export const UpcomingAppointments = ({ events, onEventClick, onRefresh }: UpcomingAppointmentsProps) => {
  const { toast } = useToast();

  const handleConfirm = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from("appointments").update({ status: "confirmed" }).eq("id", eventId);
      if (error) throw error;
      toast({ title: "Appointment confirmed" });
      onRefresh?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  // Real-time subscription for appointment changes
  useEffect(() => {
    const channel = supabase
      .channel('appointments-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          if (onRefresh) {
            onRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);
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
                {(event.resource.status === "pending" || event.resource.status === "confirmed") && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                    {event.resource.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleConfirm(e, event.id)}
                        className="h-6 text-[11px] flex-1 gap-1 border-success/30 text-success hover:bg-success/10 hover:text-success"
                      >
                        <CalendarCheck className="h-3 w-3" /> Confirm
                      </Button>
                    )}
                    {event.resource.status === "confirmed" && (
                      <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                        ✓ Confirmed
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
