import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Phone, MessageSquare, UserPlus, Calendar, CheckCircle2, Clock, Home, Handshake } from "lucide-react";

export type MetricType = "tasksCompleted" | "tasksPending" | "calls" | "messages" | "newLeads" | "appointments" | "appointmentsCompleted" | "propertyShowings" | "deals";

interface MetricItem {
  id: string;
  leadId: string;
  leadName: string;
  title: string;
  subtitle?: string;
  date?: string;
  status?: string;
}

interface AgentMetricDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  metricType: MetricType;
  items: MetricItem[];
}

const metricConfig: Record<MetricType, { label: string; icon: React.ReactNode; color: string }> = {
  tasksCompleted: { label: "Tasks Completed", icon: <CheckCircle2 className="h-5 w-5" />, color: "text-success" },
  tasksPending: { label: "Tasks Pending", icon: <Clock className="h-5 w-5" />, color: "text-warning" },
  calls: { label: "Calls", icon: <Phone className="h-5 w-5" />, color: "text-primary" },
  messages: { label: "Messages", icon: <MessageSquare className="h-5 w-5" />, color: "text-info" },
  newLeads: { label: "New Leads", icon: <UserPlus className="h-5 w-5" />, color: "text-success" },
  appointments: { label: "Appointments", icon: <Calendar className="h-5 w-5" />, color: "text-primary" },
  appointmentsCompleted: { label: "Appointments Completed", icon: <CheckCircle2 className="h-5 w-5" />, color: "text-success" },
  propertyShowings: { label: "Property Showings", icon: <Home className="h-5 w-5" />, color: "text-primary" },
  deals: { label: "Deals", icon: <Handshake className="h-5 w-5" />, color: "text-success" },
};

export const AgentMetricDetailDialog = ({
  open,
  onOpenChange,
  agentName,
  metricType,
  items,
}: AgentMetricDetailDialogProps) => {
  const navigate = useNavigate();
  const config = metricConfig[metricType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={config.color}>{config.icon}</span>
            {agentName} — {config.label}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No items found</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/leads/${item.leadId}`);
                  }}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground">{item.leadName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {item.date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.date), "MMM d, h:mm a")}
                        </p>
                      )}
                      {item.status && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {item.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
