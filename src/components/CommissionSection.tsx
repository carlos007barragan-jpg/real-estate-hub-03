import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, X, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AgentPayout {
  id?: string;
  agent_name: string;
  agent_user_id: string | null;
  payout_amount: number;
}

interface TeamMember {
  user_id: string;
  name: string;
}

interface CommissionSectionProps {
  leadId: string;
  leadData: any;
  onUpdate?: () => void;
}

export const CommissionSection = ({ leadId, leadData, onUpdate }: CommissionSectionProps) => {
  const { toast } = useToast();
  const [totalCommission, setTotalCommission] = useState(leadData.commission || "");
  const [payouts, setPayouts] = useState<AgentPayout[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [leadId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) return;

      // Fetch existing commission entries and team members in parallel
      const [entriesRes, membersRes] = await Promise.all([
        supabase
          .from("commission_entries")
          .select("*")
          .eq("lead_id", leadId),
        supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .eq("organization_id", profile.organization_id),
      ]);

      if (entriesRes.data && entriesRes.data.length > 0) {
        setPayouts(
          entriesRes.data.map((e: any) => ({
            id: e.id,
            agent_name: e.agent_name,
            agent_user_id: e.agent_user_id,
            payout_amount: Number(e.payout_amount),
          }))
        );
      }

      if (membersRes.data) {
        setTeamMembers(
          membersRes.data.map((p: any) => ({
            user_id: p.user_id,
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
          }))
        );
      }
    } catch (error) {
      console.error("Error loading commission data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addPayout = () => {
    setPayouts([...payouts, { agent_name: "", agent_user_id: null, payout_amount: 0 }]);
  };

  const removePayout = (index: number) => {
    setPayouts(payouts.filter((_, i) => i !== index));
  };

  const updatePayout = (index: number, field: keyof AgentPayout, value: any) => {
    const updated = [...payouts];
    if (field === "agent_user_id" && value) {
      const member = teamMembers.find((m) => m.user_id === value);
      updated[index] = { ...updated[index], agent_user_id: value, agent_name: member?.name || "" };
    } else {
      (updated[index] as any)[field] = value;
    }
    setPayouts(updated);
  };

  const totalPayouts = payouts.reduce((sum, p) => sum + (Number(p.payout_amount) || 0), 0);
  const officeFee = (Number(totalCommission) || 0) - totalPayouts;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) throw new Error("No organization");

      // Update lead commission
      await supabase
        .from("leads")
        .update({ commission: totalCommission || null } as any)
        .eq("id", leadId);

      // Delete existing entries, then insert new ones
      await supabase.from("commission_entries").delete().eq("lead_id", leadId);

      if (payouts.length > 0) {
        const entries = payouts
          .filter((p) => p.agent_name && p.payout_amount > 0)
          .map((p) => ({
            lead_id: leadId,
            agent_name: p.agent_name,
            agent_user_id: p.agent_user_id || null,
            payout_amount: p.payout_amount,
            organization_id: profile.organization_id,
            created_by: user.id,
          }));

        if (entries.length > 0) {
          const { error } = await supabase.from("commission_entries").insert(entries);
          if (error) throw error;
        }
      }

      toast({ title: "Commission saved", description: "Commission details and agent payouts updated." });
      onUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border">
        <CardContent className="p-6">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-success" />
          Commission Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="totalCommission">Total Commission ($)</Label>
            <Input
              id="totalCommission"
              type="number"
              placeholder="e.g. 10000"
              value={totalCommission}
              onChange={(e) => setTotalCommission(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Property</Label>
            <Input value={leadData.propertyOfInterest || leadData.property_of_interest || "N/A"} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label>Close Date</Label>
            <Input value={leadData.closeDate || leadData.close_date || "N/A"} readOnly className="bg-muted/50" />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Agent Payouts</Label>
            <Button variant="outline" size="sm" onClick={addPayout} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add Agent
            </Button>
          </div>

          {payouts.length === 0 && (
            <p className="text-sm text-muted-foreground">No agent payouts added yet.</p>
          )}

          {payouts.map((payout, index) => (
            <div key={index} className="flex items-end gap-3 p-3 rounded-lg border bg-muted/20">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Agent</Label>
                <Select
                  value={payout.agent_user_id || ""}
                  onValueChange={(v) => updatePayout(index, "agent_user_id", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    {teamMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36 space-y-1.5">
                <Label className="text-xs">Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={payout.payout_amount || ""}
                  onChange={(e) => updatePayout(index, "payout_amount", Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="h-9"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removePayout(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="font-semibold text-sm">Office Fee (auto-calculated):</span>
          <span className={`font-bold text-lg ${officeFee >= 0 ? "text-success" : "text-destructive"}`}>
            ${officeFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Commission Details"}
        </Button>
      </CardContent>
    </Card>
  );
};
