import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Users, Phone, Mail, UserPlus, Calendar as CalendarIcon, CheckCircle2, Circle, AlertTriangle, Power, DollarSign } from "lucide-react";
import { AgentMetricDetailDialog, MetricType } from "@/components/AgentMetricDetailDialog";
import { MyPayoutsCard } from "@/components/MyPayoutsCard";
import { AgentKPIPanel } from "@/components/AgentKPIPanel";
import { AgentLeaderboard } from "@/components/AgentLeaderboard";
import { PayoutDetailDialog } from "@/components/PayoutDetailDialog";
import { useAuth } from "@/contexts/AuthContext";
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
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
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
  tasksCompleted: number;
  tasksPending: number;
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
  netAmount: number;
}

interface DealsData {
  name: string;
  deals: number;
}

interface AppointmentsData {
  name: string;
  count: number;
}

interface ShowingsData {
  name: string;
  count: number;
}

interface SalesVolumeData {
  name: string;
  volume: number;
}

interface PayoutData {
  name: string;
  amount: number;
  deals: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { session, isAdmin: cachedIsAdmin, role } = useAuth();
  const [loading, setLoading] = useState(false);
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
  const [appointmentsData, setAppointmentsData] = useState<AppointmentsData[]>([]);
  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [showingsData, setShowingsData] = useState<ShowingsData[]>([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [payoutsData, setPayoutsData] = useState<PayoutData[]>([]);
  const [allTimeTotalPayout, setAllTimeTotalPayout] = useState({ amount: 0, deals: 0 });
  const [totalSalesVolume, setTotalSalesVolume] = useState(0);
  const [salesVolumeData, setSalesVolumeData] = useState<SalesVolumeData[]>([]);
  const [payoutsPeriod, setPayoutsPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [payoutDetailAgent, setPayoutDetailAgent] = useState<string | null>(null);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [performancePeriod, setPerformancePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [rawPerfData, setRawPerfData] = useState<{
    calls: any[]; messages: any[]; leads: any[]; appointments: any[]; deals: any[]; tasks: any[];
    userRoles: any[]; agentPhones: any[]; profiles: any[];
  }>({ calls: [], messages: [], leads: [], appointments: [], deals: [], tasks: [], userRoles: [], agentPhones: [], profiles: [] });
  const [metricDialog, setMetricDialog] = useState<{
    open: boolean;
    agentName: string;
    metricType: MetricType;
    items: { id: string; leadId: string; leadName: string; title: string; subtitle?: string; date?: string; status?: string }[];
  }>({ open: false, agentName: "", metricType: "calls", items: [] });

  const openMetricDetail = (agentId: string, agentName: string, metricType: MetricType) => {
    const { calls, messages, leads, appointments, deals, tasks } = rawPerfData;
    const now = new Date();
    let periodStart: Date;
    if (performancePeriod === 'daily') periodStart = startOfDay(now);
    else if (performancePeriod === 'weekly') periodStart = startOfWeek(now);
    else periodStart = startOfMonth(now);

    const filterByPeriod = (data: any[]) => data.filter(item => new Date(item.created_at) >= periodStart);

    // Build a lead name lookup from raw leads + we need all leads for lookups
    const leadNameMap = new Map<string, string>();
    leads.forEach((l: any) => leadNameMap.set(l.id, l.name || "Unknown Lead"));

    let items: { id: string; leadId: string; leadName: string; title: string; subtitle?: string; date?: string; status?: string }[] = [];

    switch (metricType) {
      case "tasksCompleted":
        items = tasks.filter((t: any) => t.user_id === agentId && t.status === "completed").map((t: any) => ({
          id: t.id, leadId: t.lead_id, leadName: leadNameMap.get(t.lead_id) || "Unknown Lead",
          title: t.title, subtitle: t.description, date: t.completed_at || t.due_date, status: "completed",
        }));
        break;
      case "tasksPending":
        items = tasks.filter((t: any) => t.user_id === agentId && t.status !== "completed").map((t: any) => ({
          id: t.id, leadId: t.lead_id, leadName: leadNameMap.get(t.lead_id) || "Unknown Lead",
          title: t.title, subtitle: t.description, date: t.due_date, status: t.status,
        }));
        break;
      case "calls":
        items = filterByPeriod(calls).filter((c: any) => c.user_id === agentId).map((c: any) => ({
          id: c.id, leadId: c.lead_id, leadName: leadNameMap.get(c.lead_id) || "Unknown Lead",
          title: `Call to ${c.to_number}`, subtitle: c.status === "completed" ? `${c.duration || 0}s` : undefined,
          date: c.created_at, status: c.status,
        }));
        break;
      case "messages":
        items = filterByPeriod(messages).filter((m: any) => m.user_id === agentId).map((m: any) => ({
          id: m.id, leadId: m.lead_id, leadName: leadNameMap.get(m.lead_id) || "Unknown Lead",
          title: `SMS to ${m.to_number}`, subtitle: m.message?.slice(0, 80), date: m.created_at, status: m.status,
        }));
        break;
      case "newLeads":
        items = filterByPeriod(leads).filter((l: any) => l.user_id === agentId).map((l: any) => ({
          id: l.id, leadId: l.id, leadName: l.name || "Unknown Lead",
          title: `Source: ${l.source}`, subtitle: l.phone, date: l.created_at, status: l.status,
        }));
        break;
      case "appointments":
        items = filterByPeriod(appointments).filter((a: any) => a.user_id === agentId).map((a: any) => ({
          id: a.id, leadId: a.lead_id, leadName: leadNameMap.get(a.lead_id) || "Unknown Lead",
          title: a.title, subtitle: a.appointment_type, date: a.appointment_date, status: a.status,
        }));
        break;
      case "appointmentsCompleted":
        items = filterByPeriod(appointments).filter((a: any) => a.user_id === agentId && a.status === "completed").map((a: any) => ({
          id: a.id, leadId: a.lead_id, leadName: leadNameMap.get(a.lead_id) || "Unknown Lead",
          title: a.title, subtitle: a.appointment_type, date: a.appointment_date, status: "completed",
        }));
        break;
      case "propertyShowings":
        items = filterByPeriod(appointments).filter((a: any) => a.user_id === agentId && a.appointment_type?.toLowerCase().includes("showing")).map((a: any) => ({
          id: a.id, leadId: a.lead_id, leadName: leadNameMap.get(a.lead_id) || "Unknown Lead",
          title: a.title, subtitle: a.description, date: a.appointment_date, status: a.status,
        }));
        break;
      case "deals":
        items = filterByPeriod(deals).filter((d: any) => d.user_id === agentId).map((d: any) => ({
          id: d.id || d.user_id, leadId: d.id || "", leadName: leadNameMap.get(d.id) || "Deal",
          title: "Closed Deal", date: d.created_at,
        }));
        break;
    }

    setMetricDialog({ open: true, agentName, metricType, items });
  };

  // Fetch lead names for metric detail lookups
  useEffect(() => {
    const fetchLeadNames = async () => {
      if (!rawPerfData.calls.length && !rawPerfData.tasks.length) return;
      const allLeadIds = new Set<string>();
      rawPerfData.calls.forEach((c: any) => c.lead_id && allLeadIds.add(c.lead_id));
      rawPerfData.messages.forEach((m: any) => m.lead_id && allLeadIds.add(m.lead_id));
      rawPerfData.tasks.forEach((t: any) => t.lead_id && allLeadIds.add(t.lead_id));
      rawPerfData.appointments.forEach((a: any) => a.lead_id && allLeadIds.add(a.lead_id));
      
      if (allLeadIds.size === 0) return;
      const ids = Array.from(allLeadIds);
      // Fetch in chunks of 100
      const allLeads: any[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { data } = await supabase.from("leads").select("id, name, phone, source, status").in("id", chunk);
        if (data) allLeads.push(...data);
      }
      // Update leads in rawPerfData to include names for lookups
      setRawPerfData(prev => ({ ...prev, leads: [...prev.leads, ...allLeads.filter(l => !prev.leads.find((pl: any) => pl.id === l.id))] }));
    };
    fetchLeadNames();
  }, [rawPerfData.calls.length, rawPerfData.tasks.length]);

  // Recompute agent stats when performance period changes
  useEffect(() => {
    const { calls, messages, leads, appointments, deals, tasks, userRoles, agentPhones, profiles } = rawPerfData;
    if (!userRoles.length) return;

    const now = new Date();
    let periodStart: Date;
    if (performancePeriod === 'daily') {
      periodStart = startOfDay(now);
    } else if (performancePeriod === 'weekly') {
      periodStart = startOfWeek(now);
    } else {
      periodStart = startOfMonth(now);
    }

    const filterByPeriod = (data: any[]) => data.filter(item => new Date(item.created_at) >= periodStart);
    const filterTasksByPeriod = (data: any[]) => {
      if (performancePeriod === 'daily') {
        return data; // tasks don't have created_at filtering - use due_date or show all
      }
      return data;
    };

    const countByUserId = (data: any[]) => {
      const counts = new Map<string, number>();
      data.forEach(item => {
        counts.set(item.user_id, (counts.get(item.user_id) || 0) + 1);
      });
      return counts;
    };

    const filteredCalls = filterByPeriod(calls);
    const filteredMessages = filterByPeriod(messages);
    const filteredLeads = filterByPeriod(leads);
    const filteredAppointments = filterByPeriod(appointments);
    const filteredDeals = filterByPeriod(deals);

    const agentPhoneMap = new Map(agentPhones.map((a: any) => [a.user_id, a]));
    const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

    // Build a set of online user IDs from live presence data
    const liveUserIds = new Set(liveUsers.map(u => u.user_id));

    const callsCounts = countByUserId(filteredCalls);
    const messagesCounts = countByUserId(filteredMessages);
    const leadsCounts = countByUserId(filteredLeads);
    const appointmentsCounts = countByUserId(filteredAppointments);
    const completedAppointmentsCounts = countByUserId(filteredAppointments.filter((a: any) => a.status === 'completed'));
    const dealsCounts = countByUserId(filteredDeals);
    const showingsCounts = countByUserId(filteredAppointments.filter((a: any) => a.appointment_type?.toLowerCase().includes('showing')));
    const tasksCompletedCounts = countByUserId(tasks.filter((t: any) => t.status === 'completed'));
    const tasksPendingCounts = countByUserId(tasks.filter((t: any) => t.status !== 'completed'));

    const agentStatsData = userRoles.map((userRole: any) => {
      const profile = profileMap.get(userRole.user_id);
      const name = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Unknown User";
      // Use live presence data for online status (matches Active Users card)
      const isOnline = liveUserIds.has(userRole.user_id);

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
        tasksCompleted: tasksCompletedCounts.get(userRole.user_id) || 0,
        tasksPending: tasksPendingCounts.get(userRole.user_id) || 0,
        status: isOnline ? "active" : "offline",
      } as AgentStats;
    });

    setAgentStats(agentStatsData);
  }, [performancePeriod, rawPerfData, liveUsers]);

  useEffect(() => {
    if (!session?.user) return;

    const userId = session.user.id;
    setIsAdmin(cachedIsAdmin);
    setCurrentUserId(userId);

    // Only need to fetch agent phone, role is already cached
    const init = async () => {
      const { data: agentResult } = await supabase
        .from("agents")
        .select("phone_number")
        .eq("user_id", userId)
        .maybeSingle();

      const userPhone = agentResult?.phone_number || null;
      setCurrentUserPhone(userPhone);

      // Fire both in parallel
      fetchDashboardData(cachedIsAdmin, userPhone);
      setupPresenceTracking(userId);
    };
    init();
  }, [session?.user?.id, cachedIsAdmin]);

  // Removed duplicate fetchUpcomingAppointments useEffect - already called in fetchDashboardData

  // Removed unused checkAdminStatus and fetchCurrentUserPhone - handled inline in initializeDashboard

  const fetchUpcomingAppointments = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) return;

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

      if (!cachedIsAdmin) {
        query = query.eq("user_id", userId);
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

        if (!cachedIsAdmin) {
          weekQuery = weekQuery.eq("user_id", userId);
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
  }, [session?.user?.id, cachedIsAdmin]);

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
    fetchSalesVolumeData();
  }, [chartView, session?.user?.id]);

  // Fetch team payouts data for supreme admins
  useEffect(() => {
    if (role === 'supreme_admin') {
      fetchPayoutsData();
    }
  }, [payoutsPeriod, role, session?.user?.id]);

  const fetchPayoutsData = async () => {
    if (!session?.user) return;

    const today = new Date();
    let dateFrom: string;

    if (payoutsPeriod === 'weekly') {
      dateFrom = startOfWeek(today).toISOString();
    } else if (payoutsPeriod === 'monthly') {
      dateFrom = startOfMonth(today).toISOString();
    } else {
      // yearly - start of current year
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      dateFrom = startOfYear.toISOString();
    }

    try {
      // Query commission_entries AND closed leads with commission
      const [entriesRes, leadsRes] = await Promise.all([
        supabase
          .from("commission_entries")
          .select("agent_name, payout_amount, lead_id, created_at"),
        supabase
          .from("leads")
          .select("id, name, commission, close_date")
          .not("close_date", "is", null)
          .not("commission", "is", null),
      ]);

      if (entriesRes.error) throw entriesRes.error;

      const allEntries = entriesRes.data || [];
      const closedLeads = leadsRes.data || [];

      // Build a map of total agent payouts per lead
      const agentPayoutsByLead = new Map<string, number>();
      allEntries.forEach((e: any) => {
        const current = agentPayoutsByLead.get(e.lead_id) || 0;
        agentPayoutsByLead.set(e.lead_id, current + Number(e.payout_amount || 0));
      });

      // Calculate all-time totals (all commissions, not just agent payouts)
      const allTimeCommission = closedLeads.reduce((sum, l) => sum + parseFloat(l.commission || '0'), 0);
      const allTimeLeadIds = new Set(closedLeads.filter(l => parseFloat(l.commission || '0') > 0).map(l => l.id));
      setAllTimeTotalPayout({ amount: allTimeCommission, deals: allTimeLeadIds.size });

      // Filter entries by period
      const filtered = allEntries.filter(e => new Date(e.created_at) >= new Date(dateFrom));

      // Filter leads by close_date in period
      const filteredLeads = closedLeads.filter(l => l.close_date && new Date(l.close_date) >= new Date(dateFrom));

      // Group agent payouts by agent name
      const payoutMap = new Map<string, { amount: number; leadIds: Set<string> }>();
      filtered.forEach((entry: any) => {
        const agentName = entry.agent_name || "Unassigned";
        const amount = Number(entry.payout_amount || 0);
        if (amount > 0) {
          const existing = payoutMap.get(agentName) || { amount: 0, leadIds: new Set<string>() };
          existing.amount += amount;
          existing.leadIds.add(entry.lead_id);
          payoutMap.set(agentName, existing);
        }
      });

      // Calculate company/office earnings for the period
      let companyAmount = 0;
      const companyLeadIds = new Set<string>();
      filteredLeads.forEach(lead => {
        const commission = parseFloat(lead.commission || '0');
        if (commission > 0) {
          const agentPayout = agentPayoutsByLead.get(lead.id) || 0;
          const officeFee = commission - agentPayout;
          if (officeFee > 0) {
            companyAmount += officeFee;
            companyLeadIds.add(lead.id);
          }
        }
      });

      const data: PayoutData[] = Array.from(payoutMap.entries())
        .map(([name, { amount, leadIds }]) => ({ name, amount, deals: leadIds.size }))
        .sort((a, b) => b.amount - a.amount);

      // Add company row if there are office earnings
      if (companyAmount > 0) {
        data.push({ name: "🏢 Company (Office Fee)", amount: companyAmount, deals: companyLeadIds.size });
      }

      setPayoutsData(data);
    } catch (error) {
      console.error("Error fetching payouts data:", error);
    }
  };

  const setupPresenceTracking = useCallback(async (userId: string) => {
    const channel = supabase.channel('dashboard-presence', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

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
        // Use cached profile data from a single query
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', userId)
          .maybeSingle();

        await channel.track({
          user_id: userId,
          name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Unknown User',
          role: role || 'agent',
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [role]);

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
      const user = session?.user;
      if (!user) return;

      // Use provided values or fall back to state
      const isUserAdmin = adminStatus !== undefined ? adminStatus : isAdmin;
      const currentPhone = userPhone !== undefined ? userPhone : currentUserPhone;

      console.log('Fetching dashboard data with:', { isUserAdmin, currentPhone });

      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      // Parallelize all initial queries
      // Get all profiles in the organization (RLS will handle filtering)
      const { data: orgProfiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, organization_id");

      const orgUserIds = (orgProfiles || []).map(p => p.user_id);

      // Consolidated queries - merged duplicates to reduce round-trips
      const [
        callsResult,
        messagesResult,
        leadsResult,
        allUserRolesResult,
        agentPhonesResult,
        profilesResult,
        allTasksResult,
        allAppointmentsResult,
        allDealsResult,
      ] = await Promise.all([
        // call_logs: fetch full month (used for totals AND per-agent counts)
        !isUserAdmin && currentPhone 
          ? supabase.from("call_logs").select("*").eq("to_number", currentPhone).gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString())
          : supabase.from("call_logs").select("*").gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString()),
        // sms_logs: fetch full month
        !isUserAdmin && currentPhone
          ? supabase.from("sms_logs").select("*").eq("to_number", currentPhone).gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString())
          : supabase.from("sms_logs").select("*").gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString()),
        // leads (new): fetch full month
        !isUserAdmin && currentPhone
          ? supabase.from("leads").select("*").eq("status", "new").or(`agent_phone.eq.${currentPhone},agent_phone.is.null`).gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString())
          : supabase.from("leads").select("*").eq("status", "new").gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString()),
        supabase.from("user_roles").select("user_id, role").in("user_id", orgUserIds),
        supabase.from("agents").select("*"),
        supabase.from("profiles").select("*").in("user_id", orgUserIds),
        // tasks: only pending/in-progress tasks needed for Today + Past Due widgets
        supabase
          .from("tasks")
          .select("*")
          .or(`and(due_date.gte.${todayStart.toISOString()},due_date.lte.${todayEnd.toISOString()},status.neq.completed),and(due_date.lt.${todayStart.toISOString()},status.neq.completed)`)
          .order("due_date", { ascending: true }),
        // appointments: fetch full month
        supabase.from("appointments").select("*").gte("created_at", monthStart.toISOString()).lte("created_at", monthEnd.toISOString()),
        // deals (leads with close_date): filter by close_date instead of created_at
        !isUserAdmin && currentPhone
          ? supabase.from("leads").select("user_id, created_at, close_date").or(`agent_phone.eq.${currentPhone},agent_phone.is.null`).not("close_date", "is", null).gte("close_date", monthStart.toISOString().split('T')[0]).lte("close_date", monthEnd.toISOString().split('T')[0])
          : supabase.from("leads").select("user_id, created_at, close_date").not("close_date", "is", null).gte("close_date", monthStart.toISOString().split('T')[0]).lte("close_date", monthEnd.toISOString().split('T')[0]),
      ]);

      // Filter to weekly for summary cards
      const weekCalls = (callsResult.data || []).filter(c => new Date(c.created_at) >= weekStart && new Date(c.created_at) <= weekEnd);
      const weekMessages = (messagesResult.data || []).filter(m => new Date(m.created_at) >= weekStart && new Date(m.created_at) <= weekEnd);
      const weekLeads = (leadsResult.data || []).filter(l => new Date(l.created_at) >= weekStart && new Date(l.created_at) <= weekEnd);
      const weekAppointments = (allAppointmentsResult.data || []).filter(a => new Date(a.created_at) >= weekStart && new Date(a.created_at) <= weekEnd);

      // Set totals (weekly)
      setTotalCalls(weekCalls.length);
      setTotalMessages(weekMessages.length);
      setTotalNewLeads(weekLeads.length);

      // Filter tasks client-side: today's tasks, past due tasks
      const allTasks = allTasksResult.data || [];
      const todayTasksFiltered = allTasks.filter(t => {
        if (!t.due_date || t.status === 'completed') return false;
        const d = new Date(t.due_date);
        return d >= todayStart && d <= todayEnd;
      });
      const pastDueFiltered = allTasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < todayStart && t.status !== 'completed';
      });

      setTotalAppointments(weekAppointments.length);
      setTodayTasks(todayTasksFiltered.filter(t => t.user_id === user.id));
      setPastDueTasks(pastDueFiltered.filter(t => t.user_id === user.id));

      // Create maps
      const agentPhoneMap = new Map((agentPhonesResult.data || []).map((a) => [a.user_id, a]));
      const profileMap = new Map((profilesResult.data || []).map((p) => [p.user_id, p]));

      // Group past due tasks by member
      const tasksByMember = new Map<string, Task[]>();
      pastDueFiltered.forEach((task: Task) => {
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

      // Count active team members (online within last 3 minutes)
      const now = Date.now();
      const activeCount = (profilesResult.data || []).filter(p => {
        const lastActive = p.last_active_at ? new Date(p.last_active_at).getTime() : 0;
        return now - lastActive < 3 * 60 * 1000;
      }).length;
      setActiveAgents(activeCount);

      // Store raw data for agent performance period filtering
      setRawPerfData({
        calls: callsResult.data || [],
        messages: messagesResult.data || [],
        leads: leadsResult.data || [],
        appointments: allAppointmentsResult.data || [],
        deals: allDealsResult.data || [],
        tasks: allTasks,
        userRoles: allUserRolesResult.data || [],
        agentPhones: agentPhonesResult.data || [],
        profiles: profilesResult.data || [],
      });

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

  const getChartDateKey = (date: Date, view?: string): string => {
    const v = view || chartView;
    if (v === 'daily') {
      return format(date, 'MMM d');
    } else if (v === 'weekly') {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      return `Week of ${format(monday, 'MMM d')}`;
    } else if (v === 'monthly') {
      return format(date, 'MMM yyyy');
    } else {
      return format(date, 'yyyy');
    }
  };

  const getChartSortKey = (date: Date, view?: string): string => {
    const v = view || chartView;
    if (v === 'daily') {
      return format(date, 'yyyy-MM-dd');
    } else if (v === 'weekly') {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      return format(monday, 'yyyy-MM-dd');
    } else if (v === 'monthly') {
      return format(date, 'yyyy-MM');
    } else {
      return format(date, 'yyyy');
    }
  };

  const fetchChartsData = async () => {
    if (!session?.user) return;

    const today = new Date();
    let dateFrom: string | null = null;

    if (chartView === 'daily') {
      dateFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (chartView === 'weekly') {
      dateFrom = new Date(today.getTime() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (chartView === 'monthly') {
      const twelveMonthsAgo = new Date(today);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      dateFrom = twelveMonthsAgo.toISOString();
    }
    // yearly: dateFrom stays null (all data)

    // Build queries
    let closedLeadsQuery = supabase
      .from("leads")
      .select("*")
      .not("close_date", "is", null);
    if (dateFrom) closedLeadsQuery = closedLeadsQuery.gte("close_date", dateFrom);

    let apptsQuery = supabase
      .from("appointments")
      .select("id, appointment_date, appointment_type, status")
      .order("appointment_date", { ascending: true });
    if (dateFrom) apptsQuery = apptsQuery.gte("appointment_date", dateFrom);

    // Also fetch commission_entries for net income calculation
    const [closedLeadsRes, apptsRes, commissionEntriesRes] = await Promise.all([
      closedLeadsQuery,
      apptsQuery,
      supabase.from("commission_entries").select("lead_id, payout_amount"),
    ]);

    // Build a map of total payouts per lead
    const payoutsByLead = new Map<string, number>();
    (commissionEntriesRes.data || []).forEach((entry: any) => {
      const current = payoutsByLead.get(entry.lead_id) || 0;
      payoutsByLead.set(entry.lead_id, current + Number(entry.payout_amount || 0));
    });

    // Process revenue & deals
    const closedLeads = closedLeadsRes.data;
    if (closedLeads) {
      const revenueMap = new Map<string, { sortKey: string; amount: number; netAmount: number }>();
      const dealsMap = new Map<string, { sortKey: string; deals: number }>();

      closedLeads.forEach(lead => {
        const closeDate = new Date(lead.close_date);
        const key = getChartDateKey(closeDate);
        const sortKey = getChartSortKey(closeDate);
        const commission = parseFloat(lead.commission || '0');
        const payout = payoutsByLead.get(lead.id) || 0;
        const net = commission - payout;

        const rev = revenueMap.get(key);
        revenueMap.set(key, {
          sortKey,
          amount: (rev?.amount || 0) + commission,
          netAmount: (rev?.netAmount || 0) + net,
        });

        const deal = dealsMap.get(key);
        dealsMap.set(key, { sortKey, deals: (deal?.deals || 0) + 1 });
      });

      const sortedRevenue = Array.from(revenueMap.entries())
        .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey));
      setRevenueData(sortedRevenue.map(([name, { amount, netAmount }]) => ({ name, amount, netAmount })));

      const sortedDeals = Array.from(dealsMap.entries())
        .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey));
      setDealsData(sortedDeals.map(([name, { deals }]) => ({ name, deals })));
    }

    // Process appointments & showings
    const allAppts = apptsRes.data;
    if (allAppts) {
      const countMap = new Map<string, { sortKey: string; count: number }>();
      const showingsMap = new Map<string, { sortKey: string; count: number }>();

      allAppts.forEach(apt => {
        const date = new Date(apt.appointment_date);
        const key = getChartDateKey(date);
        const sortKey = getChartSortKey(date);

        const existing = countMap.get(key);
        countMap.set(key, { sortKey, count: (existing?.count || 0) + 1 });

        if (apt.appointment_type?.toLowerCase().includes('showing')) {
          const s = showingsMap.get(key);
          showingsMap.set(key, { sortKey, count: (s?.count || 0) + 1 });
        }
      });

      const sortedAppts = Array.from(countMap.entries())
        .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey));
      setAppointmentsData(sortedAppts.map(([name, { count }]) => ({ name, count })));

      const sortedShowings = Array.from(showingsMap.entries())
        .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey));
      setShowingsData(sortedShowings.map(([name, { count }]) => ({ name, count })));
    }
  };

  const fetchSalesVolumeData = async () => {
    if (!session?.user) return;

    const today = new Date();
    let dateFrom: string | null = null;

    if (chartView === 'daily') {
      dateFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (chartView === 'weekly') {
      dateFrom = new Date(today.getTime() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (chartView === 'monthly') {
      const twelveMonthsAgo = new Date(today);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      dateFrom = twelveMonthsAgo.toISOString();
    }

    const parseMoney = (raw: string | null) => Number((raw || "").replace(/[^0-9.-]/g, "")) || 0;

    let query = supabase
      .from("leads")
      .select("close_date, sales_price, value")
      .not("close_date", "is", null);
    if (dateFrom) query = query.gte("close_date", dateFrom);

    const { data: closedLeads } = await query;

    if (closedLeads) {
      const salesVolumeMap = new Map<string, { sortKey: string; volume: number }>();
      let runningTotal = 0;

      closedLeads.forEach(lead => {
        const price = parseMoney(lead.sales_price) || parseMoney(lead.value);
        if (price > 0 && lead.close_date) {
          runningTotal += price;
          const closeDate = new Date(lead.close_date);
          const key = getChartDateKey(closeDate, chartView);
          const sortKey = getChartSortKey(closeDate, chartView);
          const existing = salesVolumeMap.get(key);
          salesVolumeMap.set(key, { sortKey, volume: (existing?.volume || 0) + price });
        }
      });

      setTotalSalesVolume(runningTotal);

      const sortedSalesVolume = Array.from(salesVolumeMap.entries())
        .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey));
      setSalesVolumeData(sortedSalesVolume.map(([name, { volume }]) => ({ name, volume })));
    }
  };

  const handleToggleAgentStatus = async (agentUserId: string, currentStatus: "active" | "offline") => {
    const newIsActive = currentStatus === "offline";
    try {
      // Check if agent record exists
      const { data: existing } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", agentUserId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("agents")
          .update({ is_active: newIsActive })
          .eq("user_id", agentUserId);
        if (error) throw error;
      } else {
        // Create agent record with a placeholder phone number
        const { error } = await supabase
          .from("agents")
          .insert({ user_id: agentUserId, phone_number: "", is_active: newIsActive });
        if (error) throw error;
      }

      // Update local state immediately
      setAgentStats(prev =>
        prev.map(a =>
          a.id === agentUserId ? { ...a, status: newIsActive ? "active" : "offline" } : a
        )
      );
      toast.success(`Agent status set to ${newIsActive ? "active" : "offline"}`);
    } catch (error: any) {
      console.error("Error toggling agent status:", error);
      toast.error("Failed to update agent status");
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
      if (newStatus === "completed") {
        setPastDueTasks((prev) => prev.filter((task) => task.id !== taskId));
      }
    } else {
      if (newStatus === "completed") {
        setTodayTasks((prev) => prev.filter((task) => task.id !== taskId));
      } else {
        setTodayTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
      }
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

      {/* Agent KPI Panel - visible to all */}
      <AgentKPIPanel />

      {/* Agent Leaderboard - Admin/Supreme Admin only */}
      {(role === 'supreme_admin' || role === 'admin') && <AgentLeaderboard />}

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


      {/* Past Due Tasks - Only current user's own */}
      {pastDueTasks.length > 0 && (
        <div className="mb-8">
        <Card className="p-6 border-destructive/50 bg-destructive/5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">Your Past Due Tasks</h2>
              <Badge variant="destructive" className="ml-2">{pastDueTasks.length}</Badge>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pastDueTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-destructive/30 bg-card hover:bg-destructive/10 transition-colors"
                >
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={() => handleToggleTask(task.id, task.status, true)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/leads/${task.lead_id}`)}>
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
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/leads/${task.lead_id}`)}>
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
                          onClick={() => {
                            if (lead?.id) {
                              navigate(`/leads/${lead.id}`);
                            }
                          }}
                          className={`p-3 rounded-lg border transition-colors cursor-pointer hover:shadow-md ${getAppointmentHighlight(appointment)}`}
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

      {/* My Payouts - Agents and Admins (non-supreme-admin) */}
      {(role === 'admin' || role === 'agent') && <MyPayoutsCard userId={currentUserId} />}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart - Supreme Admin only */}
        {role === 'supreme_admin' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Revenue</h2>
            </div>
            <Tabs value={chartView} onValueChange={(v) => setChartView(v as any)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `$${Number(value).toLocaleString()}`,
                  name === "amount" ? "Total Company Revenue" : "Net Earned Income"
                ]}
              />
              <Legend formatter={(value) => value === "amount" ? "Total Company Revenue" : "Net Earned Income"} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--success))", r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="netAmount" 
                stroke="hsl(var(--info))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--info))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        )}

        {/* Team Payouts Chart - Supreme Admin only */}
        {role === 'supreme_admin' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              <h2 className="text-xl font-semibold text-foreground">Team Payouts</h2>
            </div>
            <Tabs value={payoutsPeriod} onValueChange={(v) => setPayoutsPeriod(v as any)}>
              <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {payoutsData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              No payout data for this period
            </div>
          ) : (
            <div className="space-y-1">
              {payoutsData.map((agent) => (
                 <div
                   key={agent.name}
                   className="flex items-center justify-between py-3 px-3 rounded-md border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                   onClick={() => setPayoutDetailAgent(agent.name)}
                 >
                   <span className="font-medium text-foreground">{agent.name}</span>
                   <div className="flex items-center gap-6">
                     <span className="text-sm text-muted-foreground">
                       {agent.deals} {agent.deals === 1 ? 'deal' : 'deals'} closed
                     </span>
                     <span className="font-bold text-success min-w-[90px] text-right">
                       ${agent.amount.toLocaleString()}
                     </span>
                   </div>
                 </div>
               ))}
               <div className="border-t border-border my-3" />
               <div className="flex items-center justify-between py-3 px-3 bg-muted/30 rounded-md">
                 <span className="font-semibold text-foreground">Total Commission (All Time)</span>
                 <div className="flex items-center gap-6">
                   <span className="text-sm text-muted-foreground">{allTimeTotalPayout.deals} total deals</span>
                   <span className="font-bold text-success min-w-[90px] text-right">${allTimeTotalPayout.amount.toLocaleString()}</span>
                 </div>
               </div>
             </div>
          )}
        </Card>
        )}
        <PayoutDetailDialog
          open={!!payoutDetailAgent}
          onOpenChange={(open) => { if (!open) setPayoutDetailAgent(null); }}
          agentName={payoutDetailAgent || ""}
          period={payoutsPeriod}
        />


        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h2 className="text-xl font-semibold text-foreground">Deals Closed</h2>
            </div>
            {role !== 'supreme_admin' && (
              <Tabs value={chartView} onValueChange={(v) => setChartView(v as any)}>
                <TabsList>
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
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

        {/* Showings Chart - visible to all */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-info" />
              <h2 className="text-xl font-semibold text-foreground">Showings</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={showingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--info))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--info))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Appointments Chart - Supreme Admin only */}
        {role === 'supreme_admin' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Appointments</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={appointmentsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        )}

        {/* Total Sales Volume Chart - Admin and Supreme Admin */}
        {(role === 'supreme_admin' || role === 'admin') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Total Sales Volume</h2>
            </div>
            <Badge variant="secondary" className="text-sm">
              ${totalSalesVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesVolumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Sales Volume']}
                labelFormatter={(label) => `Closed: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="volume" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        )}
      </div>

      {/* Agent Performance Table - Supreme Admin + Admin only */}
      {(role === 'supreme_admin' || role === 'admin') && (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Agent Performance</h2>
          <Tabs value={performancePeriod} onValueChange={(v) => setPerformancePeriod(v as 'daily' | 'weekly' | 'monthly')}>
            <TabsList>
              <TabsTrigger value="daily">Today</TabsTrigger>
              <TabsTrigger value="weekly">This Week</TabsTrigger>
              <TabsTrigger value="monthly">This Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {agentStats.length === 0 ? (
          <p className="text-muted-foreground text-sm">No agent data available</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tasks Completed</TableHead>
                <TableHead className="text-right">Tasks Pending</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="text-right">New Leads</TableHead>
                <TableHead className="text-right">Appointments</TableHead>
                <TableHead className="text-right">Appts Completed</TableHead>
                <TableHead className="text-right">Showings</TableHead>
                <TableHead className="text-right">Deals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentStats.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${
                        agent.status === "active" ? "bg-success animate-pulse" : "bg-muted-foreground"
                      }`} />
                      <Badge
                        variant="secondary"
                        className={
                          agent.status === "active"
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {agent.status === "active" ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success cursor-pointer hover:underline" onClick={() => openMetricDetail(agent.id, agent.name, "tasksCompleted")}>{agent.tasksCompleted}</TableCell>
                  <TableCell className="text-right font-semibold text-warning cursor-pointer hover:underline" onClick={() => openMetricDetail(agent.id, agent.name, "tasksPending")}>{agent.tasksPending}</TableCell>
                  <TableCell className="text-right font-semibold cursor-pointer hover:underline" onClick={() => openMetricDetail(agent.id, agent.name, "calls")}>{agent.calls}</TableCell>
                  <TableCell className="text-right font-semibold cursor-pointer hover:underline" onClick={() => openMetricDetail(agent.id, agent.name, "messages")}>{agent.messages}</TableCell>
                  <TableCell className="text-right font-semibold cursor-pointer hover:underline" onClick={() => openMetricDetail(agent.id, agent.name, "newLeads")}>{agent.newLeads}</TableCell>
                  <TableCell className="text-right font-semibold cursor-pointer hover:underline" onClick={() => openMetricDetail(agent.id, agent.name, "appointments")}>{agent.appointments}</TableCell>
                  <TableCell className="text-right font-semibold cursor-pointer hover:underline" onClick={() => openMetricDetail(agent.id, agent.name, "appointmentsCompleted")}>{agent.appointmentsCompleted}</TableCell>
                  <TableCell className="text-right font-semibold cursor-pointer hover:underline" onClick={() => openMetricDetail(agent.id, agent.name, "propertyShowings")}>{agent.propertyShowings}</TableCell>
                  <TableCell className="text-right font-semibold cursor-pointer hover:underline" onClick={() => openMetricDetail(agent.id, agent.name, "deals")}>{agent.deals}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      )}

      <AgentMetricDetailDialog
        open={metricDialog.open}
        onOpenChange={(open) => setMetricDialog(prev => ({ ...prev, open }))}
        agentName={metricDialog.agentName}
        metricType={metricDialog.metricType}
        items={metricDialog.items}
      />
    </div>
  );
};

export default Dashboard;
