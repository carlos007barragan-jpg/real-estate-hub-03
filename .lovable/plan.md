
# Workflow Automation Engine — IMPLEMENTED

## What Was Built

### Database
- `workflows` table — Supreme Admin defines workflow templates with trigger type, steps, and stop conditions
- `workflow_instances` table — tracks active workflow runs per lead
- `follow_ups` table extended with `workflow_instance_id` column
- DB trigger `trigger_new_lead_workflows` — auto-starts "new_lead" workflows when a lead is created
- DB trigger `trigger_pipeline_stage_workflows` — auto-starts stage-specific workflows + auto-stops "new_lead" workflows when lead enters pipeline
- `start_workflow_for_lead()` DB function — creates instance + follow_up steps

### Settings UI (Supreme Admin Only)
- `WorkflowBuilder` component in Settings → Workflows tab
- Create/edit/delete workflows with trigger type, steps, stop conditions
- Pipeline stage selector for stage-triggered workflows
- Visual step builder with action types + day offsets

### Automation
- `process-workflows` edge function — processes due follow-ups, creates tasks + notifications
- Cron job runs every 15 minutes to check for due follow-ups

### Lead Profile
- `FollowUpWorkflow` — shows active workflow progress with action buttons
- `ScheduleFollowUpDialog` — supports manual workflow triggers + templates
- `LeadQuickStats` — shows "Next Follow-Up" stat
- `CallOptionsDialog` — auto-completes matching call follow-ups on manual log

### Workflow Types
1. **New Lead** — auto-starts on lead creation, stops when assigned to pipeline
2. **Pipeline Stage** — triggers when lead enters a specific stage (e.g., document collection)
3. **Manual** — agent starts from lead profile
