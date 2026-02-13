import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { FollowUpWorkflow } from "./FollowUpWorkflow";

interface FollowUpReminderProps {
  leadId: string;
  leadName: string;
  refreshKey?: number;
  onAction?: (actionType: string) => void;
}

export const FollowUpReminder = ({ leadId, leadName, refreshKey = 0, onAction }: FollowUpReminderProps) => {
  const [daysSinceContact, setDaysSinceContact] = useState<number | null>(null);
  const [hasFollowUps, setHasFollowUps] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const [callsRes, smsRes, followUpsRes] = await Promise.all([
        supabase.from("call_logs").select("created_at").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1),
        supabase.from("sms_logs").select("created_at").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1),
        supabase.from("follow_ups").select("id").eq("lead_id", leadId).limit(1),
      ]);

      setHasFollowUps((followUpsRes.data?.length || 0) > 0);

      const dates = [
        callsRes.data?.[0]?.created_at,
        smsRes.data?.[0]?.created_at,
      ].filter(Boolean).map(d => new Date(d!).getTime());

      if (dates.length === 0) {
        setDaysSinceContact(-1);
      } else {
        const last = Math.max(...dates);
        setDaysSinceContact(Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24)));
      }
    };

    check();
  }, [leadId, refreshKey]);

  if (daysSinceContact === null || hasFollowUps === null) return null;

  const isNever = daysSinceContact === -1;
  const showPassiveBanner = !hasFollowUps && (isNever || daysSinceContact >= 3);

  return (
    <div className="space-y-3">
      {/* Actionable Follow-Up Workflow */}
      <FollowUpWorkflow leadId={leadId} leadName={leadName} refreshKey={refreshKey} onAction={onAction} />

      {/* Passive banner only if no sequence exists and contact is stale */}
      {showPassiveBanner && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
          isNever || daysSinceContact >= 7
            ? 'bg-destructive/5 border-destructive/20'
            : 'bg-warning/5 border-warning/20'
        }`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
            isNever || daysSinceContact >= 7 ? 'bg-destructive/10' : 'bg-warning/10'
          }`}>
            <AlertTriangle className={`h-4 w-4 ${
              isNever || daysSinceContact >= 7 ? 'text-destructive' : 'text-warning'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${
              isNever || daysSinceContact >= 7 ? 'text-destructive' : 'text-warning'
            }`}>
              {isNever ? "Never contacted" : `No contact in ${daysSinceContact} days`}
            </p>
            <p className="text-xs text-muted-foreground">
              {isNever
                ? `${leadName} hasn't been called or messaged yet. Reach out today!`
                : `It's been ${daysSinceContact} days since your last interaction with ${leadName}. Time to follow up!`
              }
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      )}
    </div>
  );
};
