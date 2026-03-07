import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformanceStandards } from "@/hooks/usePerformanceStandards";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { Trophy, Medal, Award, ChevronDown } from "lucide-react";

interface AgentScore {
  userId: string;
  name: string;
  activityScore: number;
  pipelineScore: number;
  closingsScore: number;
  totalScore: number;
  rank: number;
}

const getScoreBadge = (score: number) => {
  if (score >= 90) return <Badge className="bg-success/15 text-success border-success/30 text-xs">Elite Producer</Badge>;
  if (score >= 75) return <Badge className="bg-info/15 text-info border-info/30 text-xs">Performing</Badge>;
  if (score >= 60) return <Badge className="bg-warning/15 text-warning border-warning/30 text-xs">Needs Coaching</Badge>;
  return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">Performance Plan</Badge>;
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-warning" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
};

export const AgentLeaderboard = () => {
  const { session } = useAuth();
  const { getTarget } = usePerformanceStandards();
  const [agents, setAgents] = useState<AgentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetchLeaderboard();
  }, [session?.user?.id]);

  const fetchLeaderboard = async () => {
    const now = new Date();
    const dayStart = startOfDay(now).toISOString();
    const dayEnd = endOfDay(now).toISOString();
    const weekStart = startOfWeek(now).toISOString();
    const weekEnd = endOfWeek(now).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    try {
      // Get all agents in org
      const { data: profiles } = await supabase.from("profiles").select("user_id, first_name, last_name, organization_id");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");

      if (!profiles || !roles) return;

      const agentRoles = roles.filter((r: any) => r.role === "agent");
      const agentUserIds = agentRoles.map((r: any) => r.user_id);

      if (agentUserIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch all data for scoring
      const [callsRes, followUpsRes, dailyApptsRes, weeklyLeadsRes, weeklyApptsRes, weeklyDealsRes, monthlyDealsRes] = await Promise.all([
        supabase.from("call_logs").select("user_id, duration").in("user_id", agentUserIds).gte("created_at", dayStart).lte("created_at", dayEnd),
        supabase.from("follow_ups").select("user_id").in("user_id", agentUserIds).gte("created_at", dayStart).lte("created_at", dayEnd),
        supabase.from("appointments").select("user_id").in("user_id", agentUserIds).gte("created_at", dayStart).lte("created_at", dayEnd),
        supabase.from("leads").select("user_id, pipeline_stage").in("user_id", agentUserIds).gte("created_at", weekStart).lte("created_at", weekEnd),
        supabase.from("appointments").select("user_id, appointment_type").in("user_id", agentUserIds).gte("appointment_date", weekStart).lte("appointment_date", weekEnd),
        supabase.from("lead_deals").select("created_by, pipeline_stage").in("created_by", agentUserIds).gte("created_at", weekStart).lte("created_at", weekEnd),
        supabase.from("lead_deals").select("created_by, status").in("created_by", agentUserIds).eq("status", "won").gte("close_date", monthStart).lte("close_date", monthEnd),
      ]);

      const calls = callsRes.data || [];
      const followUps = followUpsRes.data || [];
      const dailyAppts = dailyApptsRes.data || [];
      const weeklyLeads = weeklyLeadsRes.data || [];
      const weeklyAppts = weeklyApptsRes.data || [];
      const weeklyDeals = weeklyDealsRes.data || [];
      const monthlyDeals = monthlyDealsRes.data || [];

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      const countForUser = (data: any[], userId: string, field: string = "user_id") =>
        data.filter((d: any) => d[field] === userId).length;

      const cap100 = (val: number) => Math.min(val, 100);

      const scored: AgentScore[] = agentUserIds.map((uid: string) => {
        const profile = profileMap.get(uid);
        const name = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown" : "Unknown";

        // Activity (40%) - daily metrics
        const userCalls = countForUser(calls, uid);
        const userConvos = calls.filter((c: any) => c.user_id === uid && (c.duration || 0) >= 60).length;
        const userFollowUps = countForUser(followUps, uid);
        const userDailyAppts = countForUser(dailyAppts, uid);

        const activityPcts = [
          cap100((userCalls / Math.max(getTarget("daily_calls"), 1)) * 100),
          cap100((userConvos / Math.max(getTarget("daily_conversations"), 1)) * 100),
          cap100((userFollowUps / Math.max(getTarget("daily_follow_ups"), 1)) * 100),
          cap100((userDailyAppts / Math.max(getTarget("daily_appointments"), 1)) * 100),
        ];
        const activityScore = activityPcts.reduce((a, b) => a + b, 0) / activityPcts.length;

        // Pipeline (30%) - weekly metrics
        const userNewLeads = countForUser(weeklyLeads, uid);
        const userQualified = weeklyLeads.filter((l: any) => l.user_id === uid && l.pipeline_stage !== "New Lead").length;
        const userWeeklyAppts = countForUser(weeklyAppts, uid);
        const userShowings = weeklyAppts.filter((a: any) => a.user_id === uid && a.appointment_type?.toLowerCase().includes("showing")).length;
        const userOffers = weeklyDeals.filter((d: any) => d.created_by === uid && d.pipeline_stage?.toLowerCase().includes("offer")).length;

        const pipelinePcts = [
          cap100((userNewLeads / Math.max(getTarget("weekly_new_leads"), 1)) * 100),
          cap100((userQualified / Math.max(getTarget("weekly_qualified"), 1)) * 100),
          cap100((userWeeklyAppts / Math.max(getTarget("weekly_appointments"), 1)) * 100),
          cap100((userShowings / Math.max(getTarget("weekly_showings"), 1)) * 100),
          cap100((userOffers / Math.max(getTarget("weekly_offers"), 1)) * 100),
        ];
        const pipelineScore = pipelinePcts.reduce((a, b) => a + b, 0) / pipelinePcts.length;

        // Closings (30%) - monthly
        const userMonthlyDeals = monthlyDeals.filter((d: any) => d.created_by === uid).length;
        const closingsScore = cap100((userMonthlyDeals / Math.max(getTarget("monthly_deals"), 1)) * 100);

        const totalScore = activityScore * 0.4 + pipelineScore * 0.3 + closingsScore * 0.3;

        return { userId: uid, name, activityScore, pipelineScore, closingsScore, totalScore, rank: 0 };
      });

      scored.sort((a, b) => b.totalScore - a.totalScore);
      scored.forEach((a, i) => (a.rank = i + 1));

      setAgents(scored);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 mb-8">
        <div className="h-6 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </Card>
    );
  }

  if (agents.length === 0) return null;

  return (
    <Card className="p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h2 className="text-xl font-semibold text-foreground">Agent Leaderboard</h2>
        </div>
        <Badge variant="secondary" className="text-xs">Weekly Score</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead className="text-right">Activity (40%)</TableHead>
            <TableHead className="text-right">Pipeline (30%)</TableHead>
            <TableHead className="text-right">Closings (30%)</TableHead>
            <TableHead className="text-right">Total Score</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.userId}>
              <TableCell>{getRankIcon(agent.rank)}</TableCell>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell className="text-right">{Math.round(agent.activityScore)}%</TableCell>
              <TableCell className="text-right">{Math.round(agent.pipelineScore)}%</TableCell>
              <TableCell className="text-right">{Math.round(agent.closingsScore)}%</TableCell>
              <TableCell className="text-right font-bold">{Math.round(agent.totalScore)}%</TableCell>
              <TableCell>{getScoreBadge(Math.round(agent.totalScore))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
