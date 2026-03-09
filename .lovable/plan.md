

# Automated Buyer Lead Workflow with Consult Confirmation Logic

## What this solves
When a new lead is created, the system should automatically generate a structured task sequence based on whether the buyer consult has already happened. Tasks include consult scheduling, confirmation follow-ups, pre-appointment reminders, and post-consult document requirements.

## Two Paths

### Path A: New Lead (no prior consult)
The system auto-creates these tasks after lead insertion:

| Day | Task | Special Behavior |
|-----|------|-------------------|
| 0 | Introduction Call | Standard task |
| 0 | Send property options | Standard task |
| 1 | Schedule Buyer Consult | Has **Confirmed / Not Confirmed** action buttons |
| — | *If Not Confirmed:* Follow-up call to reschedule | Auto-created when marked "not confirmed" |
| — | *If Confirmed:* Two reminder tasks auto-created | See below |

**When consult is confirmed** (agent marks task as "Confirmed" and enters a date):
- **Day before appointment**: Task — "Confirmation call: Are you still coming?"
- **2 hours before appointment**: Task — "Final check-in call + send address/details"
- **After consult date**: Task — "Upload Buyer Consult sheet & ID to CRM"
- **After consult date**: Task — "Update CRM with search criteria (budget, area, beds, etc.)"

### Path B: Walk-in / Referral / Consult Already Done
| Day | Task |
|-----|------|
| 0 | Upload buyer consult documents & ID |
| 0 | Update CRM with search criteria |
| 1 | Send matching properties |
| 2 | Follow-up call — review sent properties |
| 4 | Schedule property showings |

## Implementation

### 1. Database: Add columns to `leads` table
Migration to add:
- `initial_consult_completed` (boolean, default false)
- `consult_date` (timestamptz, nullable)
- `consult_notes` (text, nullable)

### 2. Update `CreateLeadDialog.tsx`
- Add "Buyer Consult Already Completed?" toggle (visible when transaction type contains "Buyer")
- When toggled ON: show consult date picker and consult notes textarea
- After successful lead insert, call a new function `createBuyerOnboardingTasks()` that generates the appropriate task sequence (Path A or Path B) into the `tasks` table

### 3. Add consult confirmation UI to `TasksSection.tsx`
- For tasks with title matching "Schedule Buyer Consult", render two action buttons: **Confirmed** and **Not Confirmed**
- **Confirmed**: Opens a date picker for the consult date, then:
  - Updates the lead's `consult_date` field
  - Auto-creates the reminder tasks (day-before call, hours-before call)
  - Auto-creates post-consult tasks (upload docs, update CRM)
  - Marks the scheduling task as completed
- **Not Confirmed**: 
  - Creates a new follow-up task "Re-attempt consult scheduling" due next day
  - Marks the current task as completed with a note

### 4. Task creation helper function
New utility in `CreateLeadDialog.tsx` (or extracted to a shared util):

```text
createBuyerOnboardingTasks(leadId, userId, consultAlreadyDone, consultDate?)
  → inserts 4-5 tasks into `tasks` table with calculated due_dates
```

For Path A tasks, `due_date` is offset from `now()`. For confirmation-triggered tasks, `due_date` is calculated relative to the confirmed consult date.

### Files changed
- **Database migration** — Add 3 columns to `leads`
- **`src/components/CreateLeadDialog.tsx`** — Consult toggle, extra fields, auto-task generation on submit
- **`src/components/TasksSection.tsx`** — Confirmed/Not Confirmed buttons on consult scheduling tasks, with follow-up task auto-creation logic

