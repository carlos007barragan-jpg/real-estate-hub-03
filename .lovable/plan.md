

# Follow-Up Workflow System

## Overview
Build a structured follow-up workflow that automatically creates and manages follow-up sequences for leads. This goes beyond the current passive reminder banner by giving agents an actionable, step-by-step follow-up process tied to each lead.

## What It Does

1. **Follow-Up Sequences**: When a lead needs follow-up, agents can schedule a sequence of follow-up steps (e.g., Day 1: Call, Day 3: SMS, Day 7: Email) or pick from pre-built templates.

2. **Actionable Follow-Up Cards**: The current reminder banner becomes interactive -- agents can take action directly from it (schedule a call, send SMS, snooze, or mark as completed).

3. **Follow-Up Task Auto-Creation**: When a follow-up is due, the system auto-creates a task assigned to the lead's agent with the appropriate action type.

4. **Follow-Up Status Tracking**: Each lead shows its follow-up status: Active sequence, Next step due, Completed, or Snoozed.

---

## Implementation Details

### 1. New Database Table: `follow_ups`

Create a `follow_ups` table to track scheduled follow-up actions per lead:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| lead_id | uuid | FK to leads |
| user_id | uuid | Assigned agent |
| action_type | text | "call", "sms", "email", "note" |
| scheduled_date | timestamptz | When this follow-up is due |
| status | text | "pending", "completed", "skipped", "snoozed" |
| notes | text | Optional context |
| completed_at | timestamptz | When it was done |
| template_name | text | Which template was used (if any) |
| sequence_order | integer | Position in a multi-step sequence |
| created_at / updated_at | timestamptz | Timestamps |

RLS policies will restrict access to users in the same organization.

### 2. Upgraded Follow-Up Reminder Component

Replace the passive banner with an interactive follow-up workflow card that shows:
- The next scheduled follow-up action with its type (Call / SMS / Email)
- Quick-action buttons to execute the follow-up right from the card (e.g., "Call Now", "Send SMS")
- Options to snooze (push back 1 day, 3 days, custom), skip, or mark complete
- A mini-timeline showing upcoming follow-up steps in the sequence

### 3. Follow-Up Scheduling Dialog

A new dialog accessible from the lead profile that lets agents:
- Pick a pre-built template (e.g., "New Lead - 7 Day", "Re-engagement - 14 Day", "Hot Lead - 3 Day")
- Or create a custom sequence by adding individual steps with action type + day offset
- Assign the sequence to themselves or another team member

**Pre-built Templates:**
- **Hot Lead (3 Day)**: Day 0 Call, Day 1 SMS, Day 3 Call
- **Standard (7 Day)**: Day 0 Call, Day 2 SMS, Day 5 Email, Day 7 Call
- **Re-engagement (14 Day)**: Day 0 SMS, Day 3 Call, Day 7 SMS, Day 14 Call

### 4. Integration Points

- **Follow-Up Reminder** component updated to query `follow_ups` table and show the next due action
- **Activity Timeline** will include follow-up completions/skips as events
- **LeadQuickStats** will show "Next Follow-Up" date instead of just "Last Contact"
- **Manual call logging and SMS sending** will auto-complete matching pending follow-ups

### Files to Create
- `src/components/FollowUpWorkflow.tsx` -- Main workflow card with actionable next step
- `src/components/ScheduleFollowUpDialog.tsx` -- Dialog for creating/choosing follow-up sequences

### Files to Modify
- `src/components/FollowUpReminder.tsx` -- Replace with the new interactive workflow card
- `src/components/layouts/TwoColumnLayout.tsx` -- Integrate new components and pass callbacks
- `src/components/LeadQuickStats.tsx` -- Add "Next Follow-Up" stat
- `src/components/CallOptionsDialog.tsx` -- Auto-complete follow-ups on call log
- Database migration for `follow_ups` table + RLS policies

