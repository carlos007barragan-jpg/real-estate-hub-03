import { TrendingUp, Users, Phone, Mail, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Agent {
  id: string;
  name: string;
  calls: number;
  messages: number;
  newLeads: number;
  status: "active" | "offline";
}

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "John Smith",
    calls: 45,
    messages: 128,
    newLeads: 12,
    status: "active",
  },
  {
    id: "2",
    name: "Maria Garcia",
    calls: 38,
    messages: 95,
    newLeads: 8,
    status: "active",
  },
  {
    id: "3",
    name: "Alex Johnson",
    calls: 52,
    messages: 142,
    newLeads: 15,
    status: "offline",
  },
  {
    id: "4",
    name: "Lisa Chen",
    calls: 41,
    messages: 110,
    newLeads: 10,
    status: "active",
  },
];

const Dashboard = () => {
  const totalCalls = mockAgents.reduce((sum, agent) => sum + agent.calls, 0);
  const totalMessages = mockAgents.reduce((sum, agent) => sum + agent.messages, 0);
  const totalNewLeads = mockAgents.reduce((sum, agent) => sum + agent.newLeads, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your team's performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
              <p className="text-3xl font-bold text-foreground mt-2">{totalCalls}</p>
              <p className="text-sm text-success mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12% from last week
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Messages Sent</p>
              <p className="text-3xl font-bold text-foreground mt-2">{totalMessages}</p>
              <p className="text-sm text-success mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +8% from last week
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-info" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">New Leads</p>
              <p className="text-3xl font-bold text-foreground mt-2">{totalNewLeads}</p>
              <p className="text-sm text-success mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +15% from last week
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {mockAgents.filter((a) => a.status === "active").length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                of {mockAgents.length} total
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Business Growth Chart Placeholder */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Business Growth</h2>
        <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Growth chart visualization area</p>
        </div>
      </Card>

      {/* Agent Performance Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Agent Performance</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Messages</TableHead>
              <TableHead className="text-right">New Leads</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAgents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">{agent.name}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      agent.status === "active"
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {agent.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">{agent.calls}</TableCell>
                <TableCell className="text-right font-semibold">{agent.messages}</TableCell>
                <TableCell className="text-right font-semibold">{agent.newLeads}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Dashboard;
