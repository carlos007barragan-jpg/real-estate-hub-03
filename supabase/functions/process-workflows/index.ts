import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Find all pending follow-ups that are due (scheduled_date <= now)
    const { data: dueFollowUps, error: fetchError } = await supabase
      .from("follow_ups")
      .select(`
        id, lead_id, user_id, action_type, scheduled_date, notes, 
        sequence_order, workflow_instance_id
      `)
      .eq("status", "pending")
      .lte("scheduled_date", new Date().toISOString())
      .order("scheduled_date", { ascending: true })
      .limit(100);

    if (fetchError) throw fetchError;

    if (!dueFollowUps || dueFollowUps.length === 0) {
      return new Response(
        JSON.stringify({ message: "No due follow-ups", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let tasksCreated = 0;
    let notificationsCreated = 0;

    for (const followUp of dueFollowUps) {
      // Get lead name for context
      const { data: lead } = await supabase
        .from("leads")
        .select("name")
        .eq("id", followUp.lead_id)
        .maybeSingle();

      const leadName = lead?.name || "Unknown Lead";
      const actionLabel =
        followUp.action_type === "call" ? "📞 Call" :
        followUp.action_type === "sms" ? "💬 SMS" :
        followUp.action_type === "email" ? "📧 Email" : "📋 Task";

      const taskTitle = followUp.notes || `${actionLabel} ${leadName}`;

      // Check if a task already exists for this follow-up (prevent duplicates)
      const { data: existingTask } = await supabase
        .from("tasks")
        .select("id")
        .eq("lead_id", followUp.lead_id)
        .eq("user_id", followUp.user_id)
        .eq("title", taskTitle)
        .eq("status", "pending")
        .maybeSingle();

      if (!existingTask) {
        // Create task
        const { error: taskError } = await supabase.from("tasks").insert({
          lead_id: followUp.lead_id,
          user_id: followUp.user_id,
          title: taskTitle,
          description: `Auto-created by workflow. Action: ${followUp.action_type}. Step ${followUp.sequence_order + 1}.`,
          status: "pending",
          due_date: followUp.scheduled_date,
        });

        if (!taskError) tasksCreated++;
      }

      // Get user's organization for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, first_name, last_name")
        .eq("user_id", followUp.user_id)
        .maybeSingle();

      // Create reminder notification
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: followUp.user_id,
        organization_id: profile?.organization_id || null,
        type: "workflow_reminder",
        title: `Follow-up Due: ${actionLabel}`,
        description: `You need to ${followUp.action_type} ${leadName}. ${followUp.notes ? `Note: ${followUp.notes}` : ""}`,
        link: `/leads/${followUp.lead_id}`,
        event_type: "workflow_step_due",
        entity_type: "lead",
        entity_id: followUp.lead_id,
      });

      if (!notifError) notificationsCreated++;

      // Mark follow-up as "completed" (task was created)
      await supabase
        .from("follow_ups")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", followUp.id);

      // Check if all follow-ups for this workflow instance are done
      if (followUp.workflow_instance_id) {
        const { data: remaining } = await supabase
          .from("follow_ups")
          .select("id")
          .eq("workflow_instance_id", followUp.workflow_instance_id)
          .eq("status", "pending");

        if (!remaining || remaining.length === 0) {
          await supabase
            .from("workflow_instances")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", followUp.workflow_instance_id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Workflow automation processed",
        processed: dueFollowUps.length,
        tasksCreated,
        notificationsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Workflow automation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
