

## Problem

Two issues with how transactions display on the Lead Profile:

1. **Phantom transactions**: The system shows the primary pipeline progress bar (from the `leads` table) AND any `lead_deals` records simultaneously, making it look like there are two transactions when there's really only one. For example, Luis Rojo shows a primary pipeline bar at the top plus a deal in the accordion below — but the user only created one transaction.

2. **Post-close lifecycle**: Once a deal is sold/closed, the transaction should be cleared from the active pipeline view entirely. The lead should transition into a "client" state (book of business). To start a new deal, the user should explicitly click "Begin New Transaction."

## Plan

### 1. Hide the primary pipeline bar when a `lead_deals` record exists for that same pipeline

In `src/pages/LeadProfile.tsx`, modify the pipeline progress bar rendering (around line 740) to also hide when there is a matching `lead_deals` entry for the same pipeline. This prevents the duplicate display — the `LeadDealsAccordion` already handles showing that deal.

### 2. Won/closed deals: hide from accordion, show summary instead

In `src/components/LeadDealsAccordion.tsx`, the compact "won" card (lines 184-227) currently still shows the deal with a stage selector. Change this so closed deals are either fully hidden from the accordion or shown as a minimal one-line historical entry (no stage selector, no pipeline controls). The deal data remains in the database for reporting.

### 3. Post-close state: show "Begin New Transaction" button

In `src/pages/LeadProfile.tsx`, when the lead status is "won" and there are no active deals:
- Hide the pipeline bar entirely (already done).
- Show a clean "closed" state with a prominent "Begin New Transaction" button that opens the existing `AddDealDialog`.
- Optionally display a note like "This client's previous deal has been closed."

### 4. Primary pipeline bar: only show when no `lead_deals` exist

The primary pipeline bar uses `leads.pipeline` and `leads.pipeline_stage`. When the user creates a deal via `AddDealDialog`, that deal goes into the `lead_deals` table. The primary bar should only render if there are zero `lead_deals` records — since the accordion handles all deals from that table. This eliminates the double-display issue.

### Technical Details

**`src/pages/LeadProfile.tsx`**:
- Line ~740: Add condition `&& leadDeals.length === 0` to the primary pipeline bar render check, so when deals exist in `lead_deals`, only the accordion shows.
- When `leadData.status === "won"` and all deals are closed: render a "Client — Deal Closed" summary card with a "Begin New Transaction" button.

**`src/components/LeadDealsAccordion.tsx`**:
- Lines 184-227 (won card): Remove the stage `<Select>` dropdown. Make the closed card a simple historical summary — pipeline name, property, close date, sale price. No reopening from here.
- Add a small "Reopen" button (distinct from the stage selector) if users truly need to undo a close, which would reset the deal status back to active and move it to the previous stage.

