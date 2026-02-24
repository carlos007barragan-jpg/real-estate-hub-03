

# Deal Won Workflow: Split Into Agent + Supreme Admin Steps

## Overview

When a deal moves to the final pipeline stage (Won/Funded), the workflow changes from a single commission dialog to a two-step process:

1. **Step 1 -- Agent/Admin confirms the sale details** (all roles see this)
2. **Step 2 -- Supreme Admins get a task notification** to enter the financial details

This ensures agents record what they know (sale price, close date, property) and Supreme Admins handle the financials (commission for the agency, payout to the agent).

---

## Step 1: Deal Closed Dialog (All Roles)

When ANY user moves a deal to Won/Funded, they see a confirmation dialog with:

- **Sale Price** -- how much the property sold for
- **Close Date** -- pre-filled with today
- **Property Purchased** -- pre-filled from `property_of_interest` if available

No commission fields. The lead status is set to "won". Confetti still fires.

After saving, the system automatically creates a notification for every Supreme Admin in the organization telling them to go enter the commission and agent payout.

---

## Step 2: Supreme Admin Financial Entry (Task Notification)

Supreme Admins receive a notification:
- **Title**: "Commission Entry Needed: [Client Name]"
- **Description**: "[Agent/Admin] closed a deal. Sale price: $X. Please enter the commission and agent payout."
- **Link**: Goes to `/leads/{id}`

From the lead profile, the Supreme Admin opens the Edit Deal dialog which now includes:
- **Sales Price** (read-only or editable -- already entered by the agent)
- **Commission** (existing field -- brokerage commission)
- **Agent Payout** (new field -- what the closing agent gets paid)

This feeds into the revenue tracker for real-time financial reporting.

---

## Database Changes

Add two new columns to the `leads` table:
- `sales_price` (text, nullable) -- the final sale price
- `agent_payout` (text, nullable) -- how much the agent is paid

No new tables, no new RLS policies needed (existing leads policies already cover org-level access).

---

## Technical Details

### Files to Modify

**`src/components/CommissionDialog.tsx`** -- Repurpose as DealClosedDialog
- Rename component to `DealClosedDialog`
- Change title to "Deal Closed -- Confirm Details"
- Replace commission field with **Sale Price** input
- Add **Property Purchased** field (pre-filled from `property_of_interest`)
- Keep **Close Date** field
- On save: update lead with `sales_price`, `close_date`, `property_of_interest`, `status: 'won'`
- After save: query all `supreme_admin` users in the org, insert a notification for each with type `commission_entry_needed` and link to `/leads/{id}`

**`src/pages/Pipelines.tsx`**
- Remove the `role === 'supreme_admin' || role === 'admin'` check -- show the dialog for ALL roles
- Update import and state variable names from `CommissionDialog` to `DealClosedDialog`
- Pass `property_of_interest` to the dialog

**`src/pages/LeadProfile.tsx`**
- Same role-gate removal -- all roles see the deal-closed confirmation
- Update import to `DealClosedDialog`

**`src/components/EditDealDialog.tsx`**
- Add **Sales Price** field
- Add **Agent Payout** field alongside existing Commission field
- These are where Supreme Admins complete the financial details after clicking the notification

**Database migration**
```sql
ALTER TABLE leads ADD COLUMN sales_price text;
ALTER TABLE leads ADD COLUMN agent_payout text;
```

