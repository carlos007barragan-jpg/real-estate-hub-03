import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePerformanceStandards } from "@/hooks/usePerformanceStandards";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const PerformanceStandardsManager = () => {
  const { session } = useAuth();
  const { standards, refetch, DEFAULT_STANDARDS } = usePerformanceStandards();
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const vals: Record<string, number> = {};
    DEFAULT_STANDARDS.forEach(d => {
      const existing = standards.find(s => s.metric_key === d.metric_key);
      vals[d.metric_key] = existing?.target_value ?? d.target_value;
    });
    setEditValues(vals);
  }, [standards]);

  const handleSave = async () => {
    if (!session?.user) return;
    setSaving(true);

    try {
      // Get user's org
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .single();

      if (!profile?.organization_id) {
        toast.error("No organization found");
        return;
      }

      // Upsert all standards
      const upsertData = DEFAULT_STANDARDS.map(d => ({
        organization_id: profile.organization_id,
        metric_key: d.metric_key,
        category: d.category,
        period: d.period,
        target_value: editValues[d.metric_key] ?? d.target_value,
        label: d.label,
        display_order: d.display_order,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("performance_standards")
        .upsert(upsertData as any, { onConflict: "organization_id,metric_key" });

      if (error) throw error;

      toast.success("Performance standards saved");
      refetch();
    } catch (err: any) {
      console.error("Error saving standards:", err);
      toast.error("Failed to save standards");
    } finally {
      setSaving(false);
    }
  };

  const categoryLabel = (cat: string) => {
    if (cat === "activity") return <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Activity</Badge>;
    if (cat === "pipeline") return <Badge className="bg-info/15 text-info border-info/30 text-xs">Pipeline</Badge>;
    return <Badge className="bg-success/15 text-success border-success/30 text-xs">Production</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Performance Standards</h2>
          <p className="text-sm text-muted-foreground mt-1">Set KPI targets for your agents</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Standards"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right w-32">Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DEFAULT_STANDARDS.map(d => (
            <TableRow key={d.metric_key}>
              <TableCell className="font-medium">{d.label}</TableCell>
              <TableCell>{categoryLabel(d.category)}</TableCell>
              <TableCell className="capitalize text-muted-foreground">{d.period}</TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  min={0}
                  className="w-24 ml-auto text-right"
                  value={editValues[d.metric_key] ?? d.target_value}
                  onChange={(e) => setEditValues(prev => ({
                    ...prev,
                    [d.metric_key]: parseInt(e.target.value) || 0,
                  }))}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
