import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";

interface CalendarFiltersProps {
  agents: Array<{ userId: string; agentName: string }>;
  selectedAgent: string;
  onAgentChange: (agent: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

export const CalendarFilters = ({
  agents,
  selectedAgent,
  onAgentChange,
  selectedStatus,
  onStatusChange,
}: CalendarFiltersProps) => {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Filters</h3>
      </div>

      <div className="space-y-2">
        <Label>Agent</Label>
        <Select value={selectedAgent} onValueChange={onAgentChange}>
          <SelectTrigger>
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.userId} value={agent.userId}>
                {agent.agentName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 border-t space-y-2">
        <Label className="text-xs text-muted-foreground">COLOR LEGEND</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="h-3 w-3 p-0 bg-primary" />
            <span className="text-sm">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="h-3 w-3 p-0 bg-success" />
            <span className="text-sm">Completed</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
