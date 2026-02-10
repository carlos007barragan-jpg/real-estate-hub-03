import { useEffect, useState } from "react";
import { TrendingUp, Users, Phone, Mail, UserPlus, Calendar as CalendarIcon, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
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
  appointments: number;
  appointmentsCompleted: number;
  propertyShowings: number;
  deals: number;
  status: "active" | "offline";
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

interface PastDueTasksByMember {
  userId: string;
  memberName: string;
  tasks: Task[];
}

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  appointment_date: string;
  appointment_type: string | null;
  duration: number;
  user_id: string;
  lead_id: string;
  status: string;
  lead?: {
    name: string;
  };
  user?: {
    first_name: string;
    last_name: string;
  };
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
  const [pastDueTasks, setPastDueTasks] = useState<Task[]>([]);
  const [pastDueTasksByMember, setPastDueTasksByMember] = useState<PastDueTasksByMember[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [dealsData, setDealsData] = useState<DealsData[]>([]);
  const [chartView, setChartView] = useState<'daily' | 'monthly' | 'ytd'>('monthly');
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const initializeDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Parallel fetch admin status + agent phone
      const [adminResult, agentResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
        supabase.from("agents").select("phone_number").eq("user_id", user.id).maybeSingle(),
      ]);

      const isUserAdmin = !!adminResult.data;
      const userPhone = agentResult.data?.phone_number || null;
      setIsAdmin(isUserAdmin);
      setCurrentUserPhone(userPhone);
      setCurrentUserId(user.id);

      // Fetch dashboard data and setup presence in parallel
      fetchDashboardData(isUserAdmin, userPhone);
      setupPresenceTracking();
    };
    
    initializeDashboard();
  }, []);

  // Removed duplicate fetchUpcomingAppointments useEffect - already called in fetchDashboardData

  // Removed unused checkAdminStatus and fetchCurrentUserPhone - handled inline in initializeDashboard

  const fetchUpcomingAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
      // First, try to get appointments in the next 48 hours
      let query = supabase
        .from("appointments")
        .select("*")
        .gte("appointment_date", now.toISOString())
        .lte("appointment_date", fortyEightHoursLater.toISOString())
        .order("appointment_date", { ascending: true });

      // If not admin, only show user's own appointments
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data: fortyEightHourData, error: fortyEightHourError } = await query;
      
      if (fortyEightHourError) throw fortyEightHourError;

      // If no appointments in 48 hours, get appointments for the next week
      let appointmentsData = fortyEightHourData;
      
      if (!fortyEightHourData || fortyEightHourData.length === 0) {
        let weekQuery = supabase
          .from("appointments")
          .select("*")
          .gte("appointment_date", now.toISOString())
          .lte("appointment_date", oneWeekLater.toISOString())
          .order("appointment_date", { ascending: true });

        if (!isAdmin) {
          weekQuery = weekQuery.eq("user_id", user.id);
        }

        const { data: weekData, error: weekError } = await weekQuery;
        
        if (weekError) throw weekError;
        
        appointmentsData = weekData;
      }

      // Fetch related leads and profiles
      if (appointmentsData && appointmentsData.length > 0) {
        const leadIds = [...new Set(appointmentsData.map(a => a.lead_id))];
        const userIds = [...new Set(appointmentsData.map(a => a.user_id))];

        const [leadsResult, profilesResult] = await Promise.all([
          supabase.from("leads").select("id, name").in("id", leadIds),
          supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds)
        ]);

        const leadsMap = new Map((leadsResult.data || []).map(l => [l.id, l]));
        const profilesMap = new Map((profilesResult.data || []).map(p => [p.user_id, p]));

        const enrichedAppointments = appointmentsData.map(apt => ({
          ...apt,
          lead: leadsMap.get(apt.lead_id),
          user: profilesMap.get(apt.user_id)
        }));

        setUpcomingAppointments(enrichedAppointments as any);
      } else {
        setUpcomingAppointments([]);
      }
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
    }
  };

  const getAppointmentHighlight = (appointment: Appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();
    const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Urgent appointments (within 2 hours)
    if (hoursUntil <= 2 && hoursUntil > 0) {
      return "border-l-4 border-l-destructive bg-destructive/5";
    }
    
    // Team meetings (appointment_type contains 'team')
    if (appointment.appointment_type?.toLowerCase().includes('team')) {
      return "border-l-4 border-l-info bg-info/5";
    }
    
    // Personal meetings (default)
    return "border-l-4 border-l-primary bg-primary/5";
  };

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
    const usersMap = new Map<string, LiveUser>();
    
    for (const key in presenceState) {
      const presences = presenceState[key];
      if (presences && presences.length > 0) {
        const presence = presences[0];
        // Deduplicate by user_id to prevent showing same user multiple times
        if (presence.user_id && !usersMap.has(presence.user_id)) {
          usersMap.set(presence.user_id, {
            user_id: presence.user_id,
            name: presence.name,
            role: presence.role,
            last_seen: new Date(presence.online_at),
          });
        }
      }
    }
    
    setLiveUsers(Array.from(usersMap.values()));
  };

  useEffect(() => {
    setActiveAgents(liveUsers.length);
  }, [liveUsers]);
  const fetchDashboardData = async (adminStatus?: boolean, userPhone?: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use provided values or fall back to state
      const isUserAdmin = adminStatus !== undefined ? adminStatus : isAdmin;
      const currentPhone = userPhone !== undefined ? userPhone : currentUserPhone;

      console.log('Fetching dashboard data with:', { isUserAdmin, currentPhone });

      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      // Parallelize all initial queries
      // Get all profiles in the organization (RLS will handle filtering)
      const { data: orgProfiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, organization_id");

      const orgUserIds = (orgProfiles || []).map(p => p.user_id);

      const [
        callsResult,
        messagesResult,
        leadsResult,
        appointmentsResult,
        allUserRolesResult,
        agentPhonesResult,
        profilesResult,
        tasksResult,
        pastDueTasksResult,
        allCallsResult,
        allMessagesResult,
        allLeadsResult,
        allAppointmentsResult,
        allCompletedAppointmentsResult,
        allDealsResult,
        allShowingsResult
      ] = await Promise.all([
        // For non-admins, filter by assigned agent phone
        !isUserAdmin && currentPhone 
          ? supabase.from("call_logs").select("*").eq("to_number", currentPhone).gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString())
          : supabase.from("call_logs").select("*").gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString()),
        !isUserAdmin && currentPhone
          ? supabase.from("sms_logs").select("*").eq("to_number", currentPhone).gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString())
          : supabase.from("sms_logs").select("*").gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString()),
        !isUserAdmin && currentPhone
          ? supabase.from("leads").select("*").eq("status", "new").or(`agent_phone.eq.${currentPhone},agent_phone.is.null`).gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString())
          : supabase.from("leads").select("*").eq("status", "new").gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString()),
        supabase.from("tasks").select("*").gte("due_date", weekStart.toISOString()).lte("due_date", weekEnd.toISOString()),
        supabase.from("user_roles").select("user_id, role").in("user_id", orgUserIds),
        supabase.from("agents").select("*"),
        supabase.from("profiles").select("*").in("user_id", orgUserIds),
        // Fetch today's tasks - RLS handles organization filtering
        supabase.from("tasks").select("*").gte("due_date", todayStart.toISOString()).lte("due_date", todayEnd.toISOString()).order("due_date", { ascending: true }),
        // Fetch past due tasks - RLS handles organization filtering
        supabase.from("tasks").select("*").not("due_date", "is", null).lt("due_date", todayStart.toISOString()).neq("status", "completed").order("due_date", { ascending: true }),
        // Fetch all agent data at once (with filtering for non-admins)
        !isUserAdmin && currentPhone
          ? supabase.from("call_logs").select("user_id").eq("to_number", currentPhone).gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString())
          : supabase.from("call_logs").select("user_id").gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString()),
        !isUserAdmin && currentPhone
          ? supabase.from("sms_logs").select("user_id").eq("to_number", currentPhone).gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString())
          : supabase.from("sms_logs").select("user_id").gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString()),
        !isUserAdmin && currentPhone
          ? supabase.from("leads").select("user_id").eq("status", "new").or(`agent_phone.eq.${currentPhone},agent_phone.is.null`).gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString())
          : supabase.from("leads").select("user_id").eq("status", "new").gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString()),
        supabase.from("appointments").select("user_id").gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString()),
        supabase.from("appointments").select("user_id").eq("status", "completed").gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString()),
        !isUserAdmin && currentPhone
          ? supabase.from("leads").select("user_id").or(`agent_phone.eq.${currentPhone},agent_phone.is.null`).not("close_date", "is", null).gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString())
          : supabase.from("leads").select("user_id").not("close_date", "is", null).gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString()),
        supabase.from("appointments").select("user_id").ilike("appointment_type", "%showing%").gte("created_at", weekStart.toISOString()).lte("created_at", weekEnd.toISOString())
      ]);

      // Set totals
      setTotalCalls(callsResult.data?.length || 0);
      setTotalMessages(messagesResult.data?.length || 0);
      setTotalNewLeads(leadsResult.data?.length || 0);
      setTotalAppointments(appointmentsResult.data?.length || 0);
      setTodayTasks(tasksResult.data || []);
      setPastDueTasks(pastDueTasksResult.data || []);

      // Create maps
      const agentPhoneMap = new Map((agentPhonesResult.data || []).map((a) => [a.user_id, a]));
      const profileMap = new Map((profilesResult.data || []).map((p) => [p.user_id, p]));

      // Group past due tasks by member
      const pastDueTasksData = pastDueTasksResult.data || [];
      const tasksByMember = new Map<string, Task[]>();
      pastDueTasksData.forEach((task: Task) => {
        const existing = tasksByMember.get(task.user_id) || [];
        existing.push(task);
        tasksByMember.set(task.user_id, existing);
      });

      const groupedTasks: PastDueTasksByMember[] = Array.from(tasksByMember.entries()).map(([userId, tasks]) => {
        const profile = profileMap.get(userId);
        const memberName = profile 
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User"
          : "Unknown User";
        return { userId, memberName, tasks };
      });
      
      // Sort by member name
      groupedTasks.sort((a, b) => a.memberName.localeCompare(b.memberName));
      setPastDueTasksByMember(groupedTasks);
      
      // Count occurrences for each agent
      const countByUserId = (data: any[]) => {
        const counts = new Map<string, number>();
        data.forEach(item => {
          counts.set(item.user_id, (counts.get(item.user_id) || 0) + 1);
        });
        return counts;
      };

      const callsCounts = countByUserId(allCallsResult.data || []);
      const messagesCounts = countByUserId(allMessagesResult.data || []);
      const leadsCounts = countByUserId(allLeadsResult.data || []);
      const appointmentsCounts = countByUserId(allAppointmentsResult.data || []);
      const completedAppointmentsCounts = countByUserId(allCompletedAppointmentsResult.data || []);
      const dealsCounts = countByUserId(allDealsResult.data || []);
      const showingsCounts = countByUserId(allShowingsResult.data || []);

      // Count active team members
      const activeCount = (allUserRolesResult.data || []).filter(role => {
        const agentPhone = agentPhoneMap.get(role.user_id);
        return agentPhone?.is_active === true;
      }).length;
      setActiveAgents(activeCount);

      // Build agent stats without additional queries - now showing ALL team members
      const agentStatsData = (allUserRolesResult.data || []).map((userRole) => {
        const profile = profileMap.get(userRole.user_id);
        const name = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Unknown User";
        const agentPhone = agentPhoneMap.get(userRole.user_id);
        const isActive = agentPhone?.is_active === true;

        return {
          id: userRole.user_id,
          name: name || "Unknown User",
          calls: callsCounts.get(userRole.user_id) || 0,
          messages: messagesCounts.get(userRole.user_id) || 0,
          newLeads: leadsCounts.get(userRole.user_id) || 0,
          appointments: appointmentsCounts.get(userRole.user_id) || 0,
          appointmentsCompleted: completedAppointmentsCounts.get(userRole.user_id) || 0,
          propertyShowings: showingsCounts.get(userRole.user_id) || 0,
          deals: dealsCounts.get(userRole.user_id) || 0,
          status: isActive ? "active" : "offline",
        } as AgentStats;
      });

      setAgentStats(agentStatsData);

      // Fetch upcoming appointments and charts data in parallel
      await Promise.all([
        fetchUpcomingAppointments(),
        fetchChartsData()
      ]);
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

  const handleToggleTask = async (taskId: string, currentStatus: string, isPastDue: boolean = false) => {
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

    if (isPastDue) {
      // Remove from past due tasks when completed
      if (newStatus === "completed") {
        setPastDueTasks((prev) => prev.filter((task) => task.id !== taskId));
      }
    } else {
      setTodayTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    }
    toast.success(`Task ${newStatus === "completed" ? "completed" : "reopened"}`);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-5 w-72 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
              <div className="h-48 bg-muted animate-pulse rounded" />
            </Card>
          ))}
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Appointments</p>
              <p className="text-3xl font-bold text-foreground mt-2">{totalAppointments}</p>
              <p className="text-sm text-muted-foreground mt-1">This week</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-accent-foreground" />
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

      {/* Past Due Tasks - Organized by Member */}
      {pastDueTasksByMember.length > 0 && (
        <div className="mb-8">
        <Card className="p-6 border-destructive/50 bg-destructive/5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">Past Due Tasks</h2>
              <Badge variant="destructive" className="ml-2">{pastDueTasks.length}</Badge>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pastDueTasksByMember.map((memberGroup) => {
                const isOwnTasks = memberGroup.userId === currentUserId;
                return (
                  <div key={memberGroup.userId}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-destructive/20 flex items-center justify-center">
                        <span className="text-xs font-medium text-destructive">
                          {memberGroup.memberName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm text-foreground">{memberGroup.memberName}</h3>
                      <Badge variant="outline" className="text-xs">{memberGroup.tasks.length} past due task{memberGroup.tasks.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    {/* Only show individual tasks for the current user's own tasks */}
                    {isOwnTasks && (
                      <div className="space-y-2 pl-8">
                        {memberGroup.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-card hover:bg-destructive/10 transition-colors"
                          >
                            <Checkbox
                              checked={task.status === "completed"}
                              onCheckedChange={() => handleToggleTask(task.id, task.status, true)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                              {task.due_date && (
                                <p className="text-xs text-destructive mt-1">
                                  Was due: {format(new Date(task.due_date), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Calendar with Today's Tasks */}
      <div className="mb-8">
        <Card className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
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
                        onCheckedChange={() => handleToggleTask(task.id, task.status, false)}
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
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Upcoming Appointments</h2>
                </div>
                <a href="/calendar" className="text-sm text-primary hover:underline">
                  View full calendar →
                </a>
              </div>
              <div className="flex-1 space-y-3 max-h-96 overflow-y-auto">
                {upcomingAppointments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No upcoming appointments</p>
                ) : (
                  <>
                    <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border-l-4 border-l-destructive bg-destructive/5"></div>
                        <span>Urgent (within 2h)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border-l-4 border-l-info bg-info/5"></div>
                        <span>Team Meeting</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border-l-4 border-l-primary bg-primary/5"></div>
                        <span>Personal</span>
                      </div>
                    </div>
                    {upcomingAppointments.map((appointment) => {
                      const appointmentDate = new Date(appointment.appointment_date);
                      const lead = appointment.lead as any;
                      const profile = appointment.user as any;
                      const assignedTo = profile
                        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                        : "Unknown";

                      return (
                        <div
                          key={appointment.id}
                          className={`p-3 rounded-lg border transition-colors ${getAppointmentHighlight(appointment)}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground">
                                {appointment.title}
                              </p>
                              {lead && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  with {lead.name}
                                </p>
                              )}
                              {isAdmin && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Agent: {assignedTo}
                                </p>
                              )}
                              {appointment.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {appointment.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-foreground">
                                {format(appointmentDate, "MMM d")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(appointmentDate, "h:mm a")}
                              </p>
                              {appointment.duration && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {appointment.duration} min
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
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
                <TableHead className="text-right">Appointments</TableHead>
                <TableHead className="text-right">Appointments Completed</TableHead>
                <TableHead className="text-right">Property Showings</TableHead>
                <TableHead className="text-right">Deals</TableHead>
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
                  <TableCell className="text-right font-semibold">{agent.appointments}</TableCell>
                  <TableCell className="text-right font-semibold">{agent.appointmentsCompleted}</TableCell>
                  <TableCell className="text-right font-semibold">{agent.propertyShowings}</TableCell>
                  <TableCell className="text-right font-semibold">{agent.deals}</TableCell>
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
