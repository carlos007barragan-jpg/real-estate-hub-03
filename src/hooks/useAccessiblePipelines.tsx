import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AccessiblePipeline {
  id: string;
  name: string;
}

/**
 * Returns the pipelines the current user is allowed to view.
 * - Admins / Supreme Admins: all pipelines in their organization.
 * - Agents: only pipelines they've been explicitly granted access to via pipeline_access.
 */
export const useAccessiblePipelines = () => {
  const { session, isAdmin, roleLoading } = useAuth();
  const [pipelines, setPipelines] = useState<AccessiblePipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user || roleLoading) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);

      // Admins see all pipelines in their org
      if (isAdmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!profile?.organization_id) {
          if (!cancelled) {
            setPipelines([]);
            setLoading(false);
          }
          return;
        }

        const { data } = await supabase
          .from("pipelines")
          .select("id, name")
          .eq("organization_id", profile.organization_id)
          .order("display_order", { ascending: true });

        if (!cancelled) {
          setPipelines(data || []);
          setLoading(false);
        }
        return;
      }

      // Agents: join pipeline_access -> pipelines
      const { data } = await supabase
        .from("pipeline_access")
        .select("pipeline:pipelines (id, name)")
        .eq("user_id", session.user.id);

      const list: AccessiblePipeline[] = (data || [])
        .map((row: any) => row.pipeline)
        .filter(Boolean);

      if (!cancelled) {
        setPipelines(list);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, isAdmin, roleLoading]);

  const pipelineNames = pipelines.map((p) => p.name);

  return { pipelines, pipelineNames, loading, isAdmin };
};
