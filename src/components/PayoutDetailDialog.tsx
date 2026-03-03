import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DollarSign } from "lucide-react";
import { startOfWeek, startOfMonth } from "date-fns";

interface PayoutDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  period: "weekly" | "monthly" | "yearly";
}

interface DealEntry {
  lead_id: string;
  lead_name: string;
  property: string;
  payout_amount: number;
  created_at: string;
}

export const PayoutDetailDialog = ({ open, onOpenChange, agentName, period }: PayoutDetailDialogProps) => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<DealEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    fetchDealDetails();
  }, [open, agentName, period]);

  const fetchDealDetails = async () => {
    setLoading(true);
    try {
      const today = new Date();
      let dateFrom: string;
      if (period === "weekly") {
        dateFrom = startOfWeek(today).toISOString();
      } else if (period === "monthly") {
        dateFrom = startOfMonth(today).toISOString();
      } else {
        dateFrom = new Date(today.getFullYear(), 0, 1).toISOString();
      }

      const { data: entries } = await supabase
        .from("commission_entries")
        .select("lead_id, payout_amount, created_at, agent_name")
        .eq("agent_name", agentName);

      const filtered = (entries || []).filter(e => new Date(e.created_at) >= new Date(dateFrom));

      if (filtered.length === 0) {
        setDeals([]);
        setLoading(false);
        return;
      }

      // Get unique lead IDs and fetch lead names
      const leadIds = [...new Set(filtered.map(e => e.lead_id))];
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, property_of_interest")
        .in("id", leadIds);

      const leadMap = new Map((leads || []).map(l => [l.id, l]));

      // Group by lead_id to combine multiple entries per deal
      const dealMap = new Map<string, DealEntry>();
      filtered.forEach(entry => {
        const lead = leadMap.get(entry.lead_id);
        const existing = dealMap.get(entry.lead_id);
        if (existing) {
          existing.payout_amount += Number(entry.payout_amount || 0);
        } else {
          dealMap.set(entry.lead_id, {
            lead_id: entry.lead_id,
            lead_name: lead?.name || "Unknown",
            property: lead?.property_of_interest || "N/A",
            payout_amount: Number(entry.payout_amount || 0),
            created_at: entry.created_at,
          });
        }
      });

      setDeals(Array.from(dealMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error("Error fetching payout details:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPayout = deals.reduce((sum, d) => sum + d.payout_amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            {agentName} — Payout Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="h-32 bg-muted animate-pulse rounded" />
        ) : deals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No deals found for this period.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead / Deal</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow
                    key={deal.lead_id}
                    className="cursor-pointer"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/leads/${deal.lead_id}`);
                    }}
                  >
                    <TableCell className="font-medium">{deal.lead_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{deal.property}</TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      ${deal.payout_amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between pt-2 border-t border-border px-1">
              <span className="text-sm font-semibold text-foreground">{deals.length} {deals.length === 1 ? "deal" : "deals"}</span>
              <span className="font-bold text-success">${totalPayout.toLocaleString()}</span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
