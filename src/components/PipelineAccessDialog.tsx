import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Pipeline {
  id: string;
  name: string;
}

interface PipelineAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  organizationId: string;
}

export const PipelineAccessDialog = ({
  open,
  onOpenChange,
  userId,
  userName,
  organizationId,
}: PipelineAccessDialogProps) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: pipes }, { data: access }] = await Promise.all([
          supabase
            .from("pipelines")
            .select("id, name")
            .eq("organization_id", organizationId)
            .order("display_order", { ascending: true }),
          supabase
            .from("pipeline_access")
            .select("pipeline_id")
            .eq("user_id", userId)
            .eq("organization_id", organizationId),
        ]);

        // Dedupe pipelines by name (org may have duplicates)
        const seen = new Set<string>();
        const unique: Pipeline[] = [];
        for (const p of pipes || []) {
          if (!seen.has(p.name)) {
            seen.add(p.name);
            unique.push(p);
          }
        }
        setPipelines(unique);
        setGranted(new Set((access || []).map((a) => a.pipeline_id)));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load pipelines");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, userId, organizationId]);

  const toggle = (pipelineId: string) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(pipelineId)) next.delete(pipelineId);
      else next.add(pipelineId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Fetch current state to compute diff
      const { data: existing } = await supabase
        .from("pipeline_access")
        .select("id, pipeline_id")
        .eq("user_id", userId)
        .eq("organization_id", organizationId);

      const existingMap = new Map(
        (existing || []).map((r) => [r.pipeline_id, r.id])
      );

      const toAdd: string[] = [];
      const toRemove: string[] = [];

      for (const pid of granted) {
        if (!existingMap.has(pid)) toAdd.push(pid);
      }
      for (const [pid, rowId] of existingMap) {
        if (!granted.has(pid)) toRemove.push(rowId);
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (toAdd.length > 0) {
        const { error } = await supabase.from("pipeline_access").insert(
          toAdd.map((pid) => ({
            user_id: userId,
            pipeline_id: pid,
            organization_id: organizationId,
            granted_by: user?.id,
          }))
        );
        if (error) throw error;
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("pipeline_access")
          .delete()
          .in("id", toRemove);
        if (error) throw error;
      }

      toast.success("Pipeline access updated");
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pipeline Access — {userName}</DialogTitle>
          <DialogDescription>
            Choose which pipelines this user can view. Admins and Supreme Admins
            always see all pipelines regardless of these settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pipelines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pipelines found in this organization.
            </p>
          ) : (
            pipelines.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={granted.has(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                />
                <span className="text-sm font-medium">{p.name}</span>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
