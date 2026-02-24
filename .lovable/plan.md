

# Commission Management System

## Overview

When a deal closes, a task is automatically created for Supreme Admins with all deal details pre-filled. Supreme Admins can then enter the total commission, pay out multiple agents, and the system automatically calculates the office fee. The dashboard gets a dual revenue tracker showing total revenue vs. net income after payouts.

## Part 1: Auto-Create Commission Task on Deal Close

**File: `src/components/DealClosedDialog.tsx`**

When `handleSave` runs, after notifications are inserted, automatically create a task for each Supreme Admin:

- **Title**: "Enter commission & payout: {leadName}"
- **Description**: Auto-populated with closer name, sales price/total financed, property, and close date -- pulled from the data just entered
- **Due date**: Day after the close date (not a static offset from today)
- **Assigned to**: Each Supreme Admin in the organization
- **Linked to**: The lead via `lead_id`

These tasks will automatically show up in the lead's Tasks tab and on the Supreme Admin's dashboard.

## Part 2: New `commission_entries` Table

A new database table to support multiple agent payouts per deal:

```text
commission_entries
  - id (uuid, PK)
  - lead_id (uuid, FK to leads)
  - agent_name (text) -- who got paid
  - agent_user_id (uuid, nullable) -- link to team member if applicable
  - payout_amount (numeric)
  - organization_id (uuid)
  - created_at (timestamptz)
  - created_by (uuid) -- who entered this record
```

RLS policies will scope all access to the user's organization. Only admins/supreme_admins can insert, update, and delete entries. All org members can view.

## Part 3: Commission Entry UI on Lead Profile

**New component: `src/components/CommissionSection.tsx`**

Visible only to Supreme Admins on the lead profile (when `status = 'won'`):

```text
+----------------------------------------------+
| Commission Details                            |
+----------------------------------------------+
| Total Commission    [ $10,000       ]         |
| Property            123 Main St (read-only)   |
| Close Date          Jan 15, 2026 (read-only)  |
+----------------------------------------------+
| Agent Payouts                    [+ Add Agent]|
| John Smith          $4,500       [x Remove]   |
| Sarah Lee           $2,000       [x Remove]   |
+----------------------------------------------+
| Office Fee (auto-calculated):     $3,500      |
+----------------------------------------------+
| [Save Commission Details]                     |
+----------------------------------------------+
```

- Total commission saves to the existing `leads.commission` field
- Each agent payout saves to the new `commission_entries` table
- Office fee = Total Commission - Sum of Agent Payouts (calculated live, not stored)
- Agent dropdown pulls from the organization's team members

## Part 4: Dual Revenue Tracker on Dashboard

**File: `src/pages/Dashboard.tsx`**

Update the existing "Revenue" chart (Supreme Admin only) to show two lines:

- **Total Company Revenue** (green): Sum of `leads.commission` for closed deals
- **Net Earned Income** (blue): Total commission minus sum of `commission_entries.payout_amount` for those same deals

The chart keeps the existing Daily/Weekly/Monthly/Yearly tabs. The legend clearly labels both lines so you can see at a glance how much was generated vs. how much was kept after paying agents.

## Technical Summary

| Change | File(s) |
|--------|---------|
| Auto-create task on deal close | `DealClosedDialog.tsx` |
| New commission_entries table + RLS | Database migration |
| Commission entry UI | New `CommissionSection.tsx`, update `LeadProfile.tsx` |
| Dual revenue chart | `Dashboard.tsx` |

No external dependencies needed. All data comes from existing tables plus the new `commission_entries` table.
