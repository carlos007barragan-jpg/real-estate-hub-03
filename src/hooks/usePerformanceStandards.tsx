import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PerformanceStandard {
  id: string;
  organization_id: string;
  metric_key: string;
  category: string;
  period: string;
  target_value: number;
  label: string;
  display_order: number;
}

const DEFAULT_STANDARDS: Omit<PerformanceStandard, "id" | "organization_id">[] = [
  // Daily Activity
  { metric_key: "daily_calls", category: "activity", period: "daily", target_value: 35, label: "Outbound Calls", display_order: 1 },
  { metric_key: "daily_tasks", category: "activity", period: "daily", target_value: 20, label: "Daily Tasks", display_order: 2 },
  { metric_key: "daily_upcoming_appointments", category: "activity", period: "daily", target_value: 2, label: "Upcoming Appointments", display_order: 3 },
  { metric_key: "daily_appointments", category: "activity", period: "daily", target_value: 2, label: "Appointments Set", display_order: 4 },
  // Weekly Pipeline
  { metric_key: "weekly_new_leads", category: "pipeline", period: "weekly", target_value: 25, label: "New Leads Entered", display_order: 5 },
  { metric_key: "weekly_qualified", category: "pipeline", period: "weekly", target_value: 10, label: "Qualified Leads", display_order: 6 },
  { metric_key: "weekly_appointments", category: "pipeline", period: "weekly", target_value: 10, label: "Appointments Scheduled", display_order: 7 },
  { metric_key: "weekly_showings", category: "pipeline", period: "weekly", target_value: 5, label: "Property Showings", display_order: 8 },
  { metric_key: "weekly_offers", category: "pipeline", period: "weekly", target_value: 3, label: "Offers Submitted", display_order: 9 },
  // Monthly Production
  { metric_key: "monthly_deals", category: "production", period: "monthly", target_value: 5, label: "Deals Closed", display_order: 10 },
  { metric_key: "monthly_investor_deals", category: "production", period: "monthly", target_value: 1, label: "Investor Deals", display_order: 11 },
  { metric_key: "monthly_referrals", category: "production", period: "monthly", target_value: 2, label: "Referrals", display_order: 12 },
];

export const usePerformanceStandards = () => {
  const { session } = useAuth();
  const [standards, setStandards] = useState<PerformanceStandard[]>([]);
  const [loading, setLoading] = useState(true);

  const getTarget = (metricKey: string): number => {
    const standard = standards.find(s => s.metric_key === metricKey);
    if (standard) return standard.target_value;
    const defaultStandard = DEFAULT_STANDARDS.find(s => s.metric_key === metricKey);
    return defaultStandard?.target_value || 0;
  };

  const fetchStandards = async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from("performance_standards")
        .select("*")
        .order("display_order");
      if (error) throw error;
      setStandards((data || []) as PerformanceStandard[]);
    } catch (err) {
      console.error("Error fetching performance standards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandards();
  }, [session?.user?.id]);

  return { standards, loading, getTarget, refetch: fetchStandards, DEFAULT_STANDARDS };
};
