

## Plan: Collapsible Pipeline Stages + Filters + Card Data Fix

### Problem Summary
1. Pipeline stages can't be collapsed — "Sold" and other won stages clutter the view
2. No way to filter deals by status (active/closed) or time period (this month, this year)
3. Deal cards in "Sold" stages don't show accurate dollar amounts and close dates
4. Too much horizontal scrolling needed with many stages open

### Changes

#### 1. Collapsible Stage Columns
- Add a collapse/expand arrow button to each stage header (ChevronDown/ChevronRight toggle)
- Store collapsed state per stage in component state
- **Won/Sold stages auto-collapse by default** using the existing `wonStageNames` list
- When collapsed, the stage column shrinks to just the header (name + deal count + value) with no cards visible
- Collapsed columns become narrow (~80px width) to save horizontal space
- Clicking the arrow or header expands them back

#### 2. Pipeline Filters
- Add a filter dropdown next to the search bar with options:
  - **All Deals** (default)
  - **Active Only** — excludes deals in won/sold stages
  - **Closed/Won Only** — only deals in won/sold stages
  - **This Month** — deals with close_date in current month
  - **This Year** — deals with close_date in current year
- Filter is applied client-side on top of the existing search filter
- Uses the existing `wonStageNames` array for active/closed classification

#### 3. Fix Dollar Amount & Close Date on Sold Cards
- In `populatePipelinesWithLeads`, the primary lead card currently pulls `commission` from `sales_price || value` and `closeDate` from `timeframe`
- For leads with `status === "won"` or in a won stage, update the mapping to also use `lead.close_date` (the actual close date field) formatted as a date, and `lead.sales_price` properly
- For `lead_deals` cards, `close_date` is already used — just ensure it formats correctly
- The `closeDate` field on the Deal interface will prefer `close_date` (actual date) over `timeframe` (text like "30 days")

### Technical Details

**File: `src/pages/Pipelines.tsx`**

- Add state: `collapsedStages` as `Set<string>` initialized with won stage IDs
- Add state: `dealFilter` as string (`"all" | "active" | "closed" | "this-month" | "this-year"`)
- After pipelines load, auto-collapse stages whose names match `wonStageNames`
- In the stage rendering loop, conditionally render cards or a compact collapsed view
- Add filter Select component in the header bar
- Apply filter logic in `filteredPipeline` computation
- Fix the `Deal` mapping: use `lead.close_date` when available, format as locale date string; use `lead.sales_price` as the commission value consistently

No database changes needed — this is purely a UI enhancement.

