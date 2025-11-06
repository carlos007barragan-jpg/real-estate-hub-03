import { useEffect, useState } from "react";
import { TrendingUp, Users, Phone, Mail, UserPlus, Calendar as CalendarIcon, CheckCircle2, Circle } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgentStats {
  id: string;
  name: string;
  calls: number;
  messages: number;
  newLeads: number;
  status: "active" | "offline";
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  lead_id: string;
}

interface LiveUser {
  user_id: string;
  name: string;
  role: string;
  last_seen: Date;
}

interface RevenueData {
  name: string;
  amount: number;
}

interface DealsData {
  name: string;
  deals: number;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalNewLeads, setTotalNewLeads] = useState(0);
  const [activeAgents, setActiveAgents] = useState(0);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [dealsData, setDealsData] = useState<DealsData[]>([]);
  const [chartView, setChartView] = useState<'daily' | 'monthly' | 'ytd'>('monthly');

  useEffect(() => {
    fetchDashboardData();
    setupPresenceTracking();
  }, []);

  useEffect(() => {
    fetchChartsData();
  }, [chartView]);

  const setupPresenceTracking = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Subscribe to presence channel
    const channel = supabase.channel('dashboard-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track current user presence
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      updateLiveUsers(presenceState);
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('User joined:', newPresences);
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('User left:', leftPresences);
    });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Get current user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        await channel.track({
          user_id: user.id,
          name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Unknown User',
          role: roleData?.role || 'agent',
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  };

  const updateLiveUsers = async (presenceState: any) => {
    const users: LiveUser[] = [];
    
    for (const userId in presenceState) {
      const presences = presenceState[userId];
      if (presences && presences.length > 0) {
        const presence = presences[0];
        users.push({
          user_id: presence.user_id,
          name: presence.name,
          role: presence.role,
          last_seen: new Date(presence.online_at),
        });
      }
    }
    
    setLiveUsers(users);
  };

  useEffect(() => {
    setActiveAgents(liveUsers.length);
  }, [liveUsers]);
  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);

      // Fetch calls for this week
      const { data: calls, error: callsError } = await supabase
        .from("call_logs")
        .select("*")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (callsError) throw callsError;
      setTotalCalls(calls?.length || 0);

      // Fetch messages for this week
      const { data: messages, error: messagesError } = await supabase
        .from("sms_logs")
        .select("*")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (messagesError) throw messagesError;
      setTotalMessages(messages?.length || 0);

      // Fetch new leads for this week
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("status", "new")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (leadsError) throw leadsError;
      setTotalNewLeads(leads?.length || 0);

      // Fetch all users with agent role
      const { data: agentRoles, error: agentRolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "agent");

      if (agentRolesError) throw agentRolesError;

      // Fetch agents table to check phone setup status
      const { data: agentPhones } = await supabase
        .from("agents")
        .select("*");

      // Create map of agent phone setups
      const agentPhoneMap = new Map(
        (agentPhones || []).map((a) => [a.user_id, a])
      );

      // Fetch all profiles for the agents
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*");

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Count active agents (those with phone setup and marked active)
      const activeCount = (agentRoles || []).filter(role => {
        const agentPhone = agentPhoneMap.get(role.user_id);
        return agentPhone?.is_active === true;
      }).length;
      setActiveAgents(activeCount);

      // Build agent stats for all agent users
      const agentStatsData = await Promise.all(
        (agentRoles || []).map(async (agentRole) => {
          const { data: agentCalls } = await supabase
            .from("call_logs")
            .select("*")
            .eq("user_id", agentRole.user_id)
            .gte("created_at", weekStart.toISOString())
            .lte("created_at", weekEnd.toISOString());

          const { data: agentMessages } = await supabase
            .from("sms_logs")
            .select("*")
            .eq("user_id", agentRole.user_id)
            .gte("created_at", weekStart.toISOString())
            .lte("created_at", weekEnd.toISOString());

          const { data: agentLeads } = await supabase
            .from("leads")
            .select("*")
            .eq("user_id", agentRole.user_id)
            .eq("status", "new")
            .gte("created_at", weekStart.toISOString())
            .lte("created_at", weekEnd.toISOString());

          const profile = profileMap.get(agentRole.user_id);
          const name = profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
            : "Unknown Agent";

          const agentPhone = agentPhoneMap.get(agentRole.user_id);
          const isActive = agentPhone?.is_active === true;

          return {
            id: agentRole.user_id,
            name: name || "Unknown Agent",
            calls: agentCalls?.length || 0,
            messages: agentMessages?.length || 0,
            newLeads: agentLeads?.length || 0,
            status: isActive ? "active" : "offline",
          } as AgentStats;
        })
      );

      setAgentStats(agentStatsData);

      // Fetch today's tasks for the current user
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .gte("due_date", todayStart.toISOString())
        .lte("due_date", todayEnd.toISOString())
        .order("due_date", { ascending: true });

      if (tasksError) throw tasksError;
      setTodayTasks(tasks || []);

      // Fetch revenue and deals data
      await fetchChartsData();
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchChartsData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch closed deals (leads with status 'closed' or having close_date)
    const { data: closedLeads } = await supabase
      .from("leads")
      .select("*")
      .not("close_date", "is", null)
      .gte("close_date", chartView === 'ytd' ? startOfYear.toISOString() : 
           chartView === 'monthly' ? startOfMonth.toISOString() : 
           last7Days.toISOString());

    if (closedLeads) {
      // Calculate revenue data
      const revenueMap = new Map<string, number>();
      const dealsMap = new Map<string, number>();

      closedLeads.forEach(lead => {
        const closeDate = new Date(lead.close_date);
        let key: string;
        
        if (chartView === 'daily') {
          key = closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (chartView === 'monthly') {
          key = closeDate.toLocaleDateString('en-US', { month: 'short' });
        } else {
          key = closeDate.toLocaleDateString('en-US', { month: 'short' });
        }

        const commission = parseFloat(lead.commission || '0');
        revenueMap.set(key, (revenueMap.get(key) || 0) + commission);
        dealsMap.set(key, (dealsMap.get(key) || 0) + 1);
      });

      const revenueArray = Array.from(revenueMap.entries()).map(([name, amount]) => ({
        name,
        amount
      }));

      const dealsArray = Array.from(dealsMap.entries()).map(([name, deals]) => ({
        name,
        deals
      }));

      setRevenueData(revenueArray);
      setDealsData(dealsArray);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      return;
    }

    setTodayTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
    toast.success(`Task ${newStatus === "completed" ? "completed" : "reopened"}`);
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

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
              <p className="text-sm text-muted-foreground mt-1">This week</p>
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
              <p className="text-sm text-muted-foreground mt-1">This week</p>
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
              <p className="text-sm text-muted-foreground mt-1">This week</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Users</p>
              <p className="text-3xl font-bold text-foreground mt-2">{liveUsers.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-warning" />
            </div>
          </div>
          {liveUsers.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {liveUsers.slice(0, 3).map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-2 text-xs"
                >
                  <Circle className="h-2 w-2 fill-success text-success" />
                  <span className="text-foreground truncate">{user.name || 'Unknown'}</span>
                </div>
              ))}
              {liveUsers.length > 3 && (
                <p className="text-xs text-muted-foreground pl-4">
                  +{liveUsers.length - 3} more
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Calendar with Today's Tasks */}
      <div className="mb-8">
        <Card className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Calendar</h2>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Today's Tasks</h2>
              </div>
              {todayTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No tasks due today</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={() => handleToggleTask(task.id, task.status)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm ${
                            task.status === "completed"
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {format(new Date(task.due_date), "h:mm a")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Revenue</h2>
            </div>
            <Tabs value={chartView} onValueChange={(v) => setChartView(v as any)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="ytd">YTD</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `$${Number(value).toLocaleString()}`}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Deals Chart */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <h2 className="text-xl font-semibold text-foreground">Deals Closed</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dealsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="deals" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--success))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Agent Performance</h2>
        {agentStats.length === 0 ? (
          <p className="text-muted-foreground text-sm">No agent data available</p>
        ) : (
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
              {agentStats.map((agent) => (
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
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
