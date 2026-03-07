import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Phone, MessageSquare, Calendar, Target, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformanceStandards } from "@/hooks/usePerformanceStandards";
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from "date-fns";

interface KPIMetric {
  key: string;
  label: string;
  actual: number;
  target: number;
  icon: React.ReactNode;
}

const getProgressColor = (percent: number) => {
  if (percent >= 100) return "bg-success";
  if (percent >= 50) return "bg-warning";
  return "bg-destructive";
};

const getStatusBadge = (percent: number) => {
  if (percent >= 100) return <Badge className="bg-success/15 text-success border-success/30 text-xs">On Target</Badge>;
  if (percent >= 50) return <Badge className="bg-warning/15 text-warning border-warning/30 text-xs">Behind</Badge>;
  return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">Needs Focus</Badge>;
};

const KPIRow = ({ metric }: { metric: KPIMetric }) => {
  const percent = metric.target > 0 ? Math.min((metric.actual / metric.target) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="flex items-center gap-2 w-48 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {metric.icon}
        </div>
        <span className="text-sm font-medium text-foreground truncate">{metric.label}</span>
      </div>
      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 relative">
          <Progress value={percent} className="h-3" />
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${getProgressColor(percent)}`}
            style={{ width: `${percent}%`, maxWidth: "100%" }}
          />
        </div>
        <span className="text-sm font-bold text-foreground w-16 text-right">
          {metric.actual} / {metric.target}
        </span>
        {getStatusBadge(percent)}
      </div>
    </div>
  );
};

export const AgentKPIPanel = () => {
  const { session } = useAuth();
  const { getTarget, loading: standardsLoading } = usePerformanceStandards();
  const [panelOpen, setPanelOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(true);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    dailyCalls: 0,
    dailyConversations: 0,
    dailyFollowUps: 0,
    dailyAppointments: 0,
    weeklyNewLeads: 0,
    weeklyQualified: 0,
    weeklyAppointments: 0,
    weeklyShowings: 0,
    weeklyOffers: 0,
    monthlyDeals: 0,
    monthlyCommission: 0,
  });

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const now = new Date();
    const dayStart = startOfDay(now).toISOString();
    const dayEnd = endOfDay(now).toISOString();
    const weekStart = startOfWeek(now).toISOString();
    const weekEnd = endOfWeek(now).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    const fetchMetrics = async () => {
      const [callsRes, followUpsRes, dailyApptsRes, weeklyLeadsRes, weeklyApptsRes, weeklyDealsRes, monthlyDealsRes, commissionRes] = await Promise.all([
        // Daily calls
        supabase.from("call_logs").select("id, duration").eq("user_id", userId).gte("created_at", dayStart).lte("created_at", dayEnd),
        // Daily follow-ups
        supabase.from("follow_ups").select("id").eq("user_id", userId).gte("created_at", dayStart).lte("created_at", dayEnd),
        // Daily appointments
        supabase.from("appointments").select("id").eq("user_id", userId).gte("created_at", dayStart).lte("created_at", dayEnd),
        // Weekly new leads
        supabase.from("leads").select("id, pipeline_stage").eq("user_id", userId).gte("created_at", weekStart).lte("created_at", weekEnd),
        // Weekly appointments (all)
        supabase.from("appointments").select("id, appointment_type").eq("user_id", userId).gte("appointment_date", weekStart).lte("appointment_date", weekEnd),
        // Weekly deals (offers submitted - lead_deals)
        supabase.from("lead_deals").select("id, pipeline_stage, status").eq("created_by", userId).gte("created_at", weekStart).lte("created_at", weekEnd),
        // Monthly closed deals
        supabase.from("lead_deals").select("id, status, close_date").eq("created_by", userId).eq("status", "won").gte("close_date", monthStart).lte("close_date", monthEnd),
        // Monthly commission
        supabase.from("commission_entries").select("payout_amount").eq("agent_user_id", userId).gte("created_at", monthStart).lte("created_at", monthEnd),
      ]);

      const calls = callsRes.data || [];
      const conversations = calls.filter((c: any) => (c.duration || 0) >= 60);
      const followUps = followUpsRes.data || [];
      const dailyAppts = dailyApptsRes.data || [];
      const weeklyLeads = weeklyLeadsRes.data || [];
      const weeklyAppts = weeklyApptsRes.data || [];
      const weeklyDeals = weeklyDealsRes.data || [];
      const monthlyDeals = monthlyDealsRes.data || [];
      const commissions = commissionRes.data || [];

      const qualifiedLeads = weeklyLeads.filter((l: any) => l.pipeline_stage !== "New Lead");
      const weeklyShowings = weeklyAppts.filter((a: any) => a.appointment_type?.toLowerCase().includes("showing"));
      const weeklyOffers = weeklyDeals.filter((d: any) => d.pipeline_stage?.toLowerCase().includes("offer"));
      const totalCommission = commissions.reduce((sum: number, c: any) => sum + Number(c.payout_amount || 0), 0);

      setMetrics({
        dailyCalls: calls.length,
        dailyConversations: conversations.length,
        dailyFollowUps: followUps.length,
        dailyAppointments: dailyAppts.length,
        weeklyNewLeads: weeklyLeads.length,
        weeklyQualified: qualifiedLeads.length,
        weeklyAppointments: weeklyAppts.length,
        weeklyShowings: weeklyShowings.length,
        weeklyOffers: weeklyOffers.length,
        monthlyDeals: monthlyDeals.length,
        monthlyCommission: totalCommission,
      });
    };

    fetchMetrics();
  }, [session?.user?.id]);

  if (standardsLoading) return null;

  const dailyMetrics: KPIMetric[] = [
    { key: "daily_calls", label: "Outbound Calls", actual: metrics.dailyCalls, target: getTarget("daily_calls"), icon: <Phone className="h-4 w-4 text-primary" /> },
    { key: "daily_conversations", label: "Conversations", actual: metrics.dailyConversations, target: getTarget("daily_conversations"), icon: <MessageSquare className="h-4 w-4 text-info" /> },
    { key: "daily_follow_ups", label: "Follow-ups", actual: metrics.dailyFollowUps, target: getTarget("daily_follow_ups"), icon: <Target className="h-4 w-4 text-warning" /> },
    { key: "daily_appointments", label: "Appointments Set", actual: metrics.dailyAppointments, target: getTarget("daily_appointments"), icon: <Calendar className="h-4 w-4 text-success" /> },
  ];

  const weeklyMetrics: KPIMetric[] = [
    { key: "weekly_new_leads", label: "New Leads", actual: metrics.weeklyNewLeads, target: getTarget("weekly_new_leads"), icon: <TrendingUp className="h-4 w-4 text-primary" /> },
    { key: "weekly_qualified", label: "Qualified Leads", actual: metrics.weeklyQualified, target: getTarget("weekly_qualified"), icon: <Target className="h-4 w-4 text-info" /> },
    { key: "weekly_appointments", label: "Appointments", actual: metrics.weeklyAppointments, target: getTarget("weekly_appointments"), icon: <Calendar className="h-4 w-4 text-success" /> },
    { key: "weekly_showings", label: "Property Showings", actual: metrics.weeklyShowings, target: getTarget("weekly_showings"), icon: <Target className="h-4 w-4 text-warning" /> },
    { key: "weekly_offers", label: "Offers Submitted", actual: metrics.weeklyOffers, target: getTarget("weekly_offers"), icon: <TrendingUp className="h-4 w-4 text-destructive" /> },
  ];

  const dailyScore = dailyMetrics.reduce((sum, m) => sum + Math.min((m.actual / Math.max(m.target, 1)) * 100, 100), 0) / dailyMetrics.length;

  return (
    <Collapsible open={panelOpen} onOpenChange={setPanelOpen} className="mb-8">
      <Card className="p-6">
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-xl font-semibold text-foreground">My Performance</h2>
            <p className="text-sm text-muted-foreground">Track your daily activity, pipeline, and production</p>
          </div>
          <div className="flex items-center gap-3">
            <AgentScoreBadge score={dailyScore} />
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${panelOpen ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">

      {/* Daily Activity */}
      <Collapsible open={dailyOpen} onOpenChange={setDailyOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors mb-2">
          <span className="font-medium text-foreground">Daily Activity</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dailyOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-1">
          {dailyMetrics.map(m => <KPIRow key={m.key} metric={m} />)}
        </CollapsibleContent>
      </Collapsible>

      {/* Weekly Pipeline */}
      <Collapsible open={weeklyOpen} onOpenChange={setWeeklyOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors mb-2 mt-3">
          <span className="font-medium text-foreground">Weekly Pipeline</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${weeklyOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-1">
          {weeklyMetrics.map(m => <KPIRow key={m.key} metric={m} />)}
        </CollapsibleContent>
      </Collapsible>

      {/* Monthly Production */}
      <Collapsible open={monthlyOpen} onOpenChange={setMonthlyOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors mb-2 mt-3">
          <span className="font-medium text-foreground">Monthly Production</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${monthlyOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 px-1">
            <Card className="p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">Deals Closed</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {metrics.monthlyDeals}
                <span className="text-base font-normal text-muted-foreground"> / {getTarget("monthly_deals")}</span>
              </p>
            </Card>
            <Card className="p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">Commission Earned</p>
              <p className="text-3xl font-bold text-success mt-1">
                ${metrics.monthlyCommission.toLocaleString()}
              </p>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const AgentScoreBadge = ({ score }: { score: number }) => {
  const rounded = Math.round(score);
  let label: string;
  let className: string;

  if (rounded >= 90) {
    label = "Elite Producer";
    className = "bg-success/15 text-success border-success/30";
  } else if (rounded >= 75) {
    label = "Performing";
    className = "bg-info/15 text-info border-info/30";
  } else if (rounded >= 60) {
    label = "Needs Coaching";
    className = "bg-warning/15 text-warning border-warning/30";
  } else {
    label = "Performance Plan";
    className = "bg-destructive/15 text-destructive border-destructive/30";
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold text-foreground">{rounded}%</span>
      <Badge className={className}>{label}</Badge>
    </div>
  );
};
