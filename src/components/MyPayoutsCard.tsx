import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth } from "date-fns";
import { PayoutDetailDialog } from "@/components/PayoutDetailDialog";

interface MyPayoutsCardProps {
  userId: string | null;
}

export const MyPayoutsCard = ({ userId }: MyPayoutsCardProps) => {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [agentName, setAgentName] = useState("");
  const [dealsCount, setDealsCount] = useState(0);
  const [totalPayout, setTotalPayout] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      const today = new Date();
      let dateFrom: string;

      if (period === 'weekly') {
        dateFrom = startOfWeek(today).toISOString();
      } else if (period === 'monthly') {
        dateFrom = startOfMonth(today).toISOString();
      } else {
        dateFrom = new Date(today.getFullYear(), 0, 1).toISOString();
      }

      const [profileRes, entriesRes] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name").eq("user_id", userId).maybeSingle(),
        supabase.from("commission_entries").select("payout_amount, lead_id, created_at").eq("agent_user_id", userId),
      ]);

      if (profileRes.data) {
        setAgentName(`${profileRes.data.first_name || ""} ${profileRes.data.last_name || ""}`.trim());
      }

      const filtered = (entriesRes.data || []).filter(e => new Date(e.created_at) >= new Date(dateFrom));
      const leadIds = new Set(filtered.map(e => e.lead_id));
      const total = filtered.reduce((sum, e) => sum + Number(e.payout_amount || 0), 0);

      setDealsCount(leadIds.size);
      setTotalPayout(total);
      setLoading(false);
    };

    fetchData();
  }, [userId, period]);

  if (!userId) return null;

  return (
    <div className="mb-8">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            <h2 className="text-xl font-semibold text-foreground">My Payouts</h2>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {loading ? (
          <div className="h-[80px] bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div
              className="flex items-center justify-between py-3 px-3 rounded-md border border-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowDetail(true)}
            >
              <span className="font-medium text-foreground">{agentName || "You"}</span>
              <div className="flex items-center gap-6">
                <span className="text-sm text-muted-foreground">
                  {dealsCount} {dealsCount === 1 ? 'deal' : 'deals'} closed
                </span>
                <span className="font-bold text-success min-w-[90px] text-right">
                  ${totalPayout.toLocaleString()}
                </span>
              </div>
            </div>
            <PayoutDetailDialog
              open={showDetail}
              onOpenChange={setShowDetail}
              agentName={agentName}
              period={period}
            />
          </>
        )}
      </Card>
    </div>
  );
};
