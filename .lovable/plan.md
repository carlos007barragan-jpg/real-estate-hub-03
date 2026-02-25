

# Multi-Transaction Support for Lead Profiles

## What This Does
Lets you add up to 3 separate transactions to a single lead -- each with its own pipeline, stage, transaction type, commission, and financials. For example, the same person could be in a Funding pipeline AND a Wholesale pipeline at the same time.

The current layout stays exactly the same. You just get an "Add Transaction" button, and additional deals appear as collapsible sections below the existing pipeline bar.

## How It Will Work

1. **Current view is unchanged** -- the existing pipeline progress bar, stage selector, sidebar cards, and everything else stays where it is for the lead's primary/first transaction
2. **"+ Add Transaction" button** appears in the header badges area (next to the existing pipeline badge). Click it to open a dialog
3. **Dialog asks for**: Pipeline, initial stage, transaction type, and a label (auto-filled, e.g. "Wholesale Deal")
4. **Additional transactions appear as collapsible accordion sections** between the primary pipeline bar and the two-column layout. Each section shows:
   - Deal label and transaction type badge
   - Its own pipeline progress bar with stage selector
   - Its own financial fields (sales price, commission, agent payout, property, title office, close date)
   - Edit and Remove buttons
5. **Max 3 total deals** -- button hides when limit is reached
6. When an additional deal hits a won/closed stage, the Deal Closed dialog fires for that specific deal
7. **Pipelines board** -- a lead can now appear on multiple pipeline boards simultaneously

---

## Technical Steps

### Step 1: Database -- Create `lead_deals` table

```text
lead_deals
-----------
id                    UUID PK (gen_random_uuid())
lead_id               UUID NOT NULL
pipeline_id           UUID NOT NULL
pipeline_stage        TEXT NOT NULL
transaction_type      TEXT
deal_label            TEXT
status                TEXT DEFAULT 'active'  (active / won / lost)
display_order         INT DEFAULT 1
sales_price           TEXT
commission            TEXT
agent_payout          TEXT
property_of_interest  TEXT
title_office          TEXT
close_date            DATE
created_by            UUID NOT NULL
organization_id       UUID NOT NULL
created_at            TIMESTAMPTZ DEFAULT now()
updated_at            TIMESTAMPTZ DEFAULT now()
```

- RLS policies: Organization-scoped using `get_user_organization_id(auth.uid())`
- Validation trigger: Block inserts when 3 active deals already exist for the same lead
- Add optional `deal_id` column (nullable UUID) to `commission_entries` so commissions can link to a specific deal
- Enable realtime on `lead_deals` for live updates

### Step 2: Data Migration
- For every lead that currently has a non-null `pipeline` value, insert a corresponding row into `lead_deals` so no existing data is lost
- The `leads.pipeline` and `leads.pipeline_stage` columns remain in place (the primary deal continues to use them as before, no breaking changes to other pages)

### Step 3: New Component -- `AddDealDialog.tsx`
- Dialog with fields for:
  - Pipeline (dropdown fetched from DB, same pattern as `PipelineAssignmentDialog`)
  - Initial stage (populated from selected pipeline's stages)
  - Transaction type (fetched from `transaction_types` table)
  - Deal label (auto-suggested from transaction type, editable)
- On save: inserts into `lead_deals` with the current user's org

### Step 4: Lead Profile UI -- `LeadProfile.tsx`
- Fetch `lead_deals` for the current lead on load
- Add "+ Add Transaction" button in the header badges area (hidden when 3 deals exist)
- Below the existing pipeline progress bar, render an accordion for each additional deal (deals beyond the first):
  - Each accordion item: deal label, pipeline name, stage progress bar, stage selector, financial fields, edit/remove controls
  - Collapsed by default to keep the page clean
- When an additional deal's stage hits a won stage, fire `DealClosedDialog` scoped to that deal (passing `dealId`)

### Step 5: Pipelines Board -- `Pipelines.tsx`
- When populating pipeline columns, also query `lead_deals` so a lead can appear in multiple pipelines
- Stage drag-and-drop on the board updates the correct `lead_deals` row (or `leads.pipeline_stage` for the primary deal)

### Step 6: Commission Scoping
- Add optional `deal_id` column to `commission_entries`
- `DealClosedDialog` accepts an optional `dealId` prop; when closing an additional deal, commission entries get tagged with that `deal_id`
- `CommissionSection` groups/labels entries by deal when multiple exist

### Step 7: Edit Deal Dialog
- `EditDealDialog` accepts an optional `dealId` prop
- When provided, reads/writes from `lead_deals` instead of `leads`

## What Stays the Same
- The entire current lead profile layout (header, lifecycle bar, pipeline bar, two-column layout with sidebar cards)
- Contact info, activity timeline, tasks, messaging, documents, appointments
- Single-deal leads look and work identically to today
- No columns removed from the `leads` table

## Implementation Order
1. Database migration (table + trigger + commission_entries column + data migration)
2. `AddDealDialog` component
3. `LeadProfile.tsx` -- fetch deals, render accordion, add button
4. `Pipelines.tsx` -- read from `lead_deals`
5. `DealClosedDialog` + `CommissionSection` scoping
6. `EditDealDialog` scoping

