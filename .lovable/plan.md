

# Fix Commission Visibility and Dashboard Data Population

## Problem Summary

Three issues need to be addressed:

1. **Activity Timeline leaks dollar amounts** -- The commission event currently shows "Total payouts: $X,XXX" to Supreme Admins. Per your request, the timeline should just say "Commission recorded and paid out" without revealing any dollar figures.

2. **Team Payouts chart not populating** -- The Team Payouts section reads from the old `leads.agent_payout` field, but the new Commission system writes to the `commission_entries` table. These need to be connected so payouts entered through the Commission section show up in the Team Payouts chart.

3. **Agent Performance "Deals" not populating** -- The deals count in the Agent Performance table filters by `created_at` (when the lead was created) instead of `close_date` (when the deal actually closed). So recently closed deals that were created more than a month ago won't show up.

## Changes

### 1. Activity Timeline -- Hide Dollar Amounts

**File: `src/components/ActivityTimeline.tsx`**

Change the commission event description from:
- "Total payouts: $X,XXX.XX"

To:
- "Commission recorded and paid out"

The commission event will still only appear for Supreme Admins, but now it contains zero financial details -- just a status indicator that commission processing is complete.

### 2. Team Payouts -- Read from `commission_entries`

**File: `src/pages/Dashboard.tsx`** (in `fetchPayoutsData`)

Instead of reading from `leads.agent_payout` (the old single-agent field), query the `commission_entries` table filtered by the selected period. This will:
- Group payouts by agent name from `commission_entries`
- Count distinct deals per agent
- Show the actual amounts entered through the Commission section

### 3. Agent Performance Deals -- Fix Date Filter

**File: `src/pages/Dashboard.tsx`** (in `fetchDashboardData`)

The "deals" query currently fetches leads with a `close_date` but filters by `created_at >= monthStart`. This misses deals that were created before this month but closed this month. Fix this to filter by `close_date` instead of `created_at` so deals show up in the period they were actually closed.

## Technical Details

| File | Change |
|------|--------|
| `ActivityTimeline.tsx` | Line ~124: change description to "Commission recorded and paid out" (no dollar amount) |
| `Dashboard.tsx` | `fetchPayoutsData`: query `commission_entries` joined with `leads.close_date` instead of `leads.agent_payout` |
| `Dashboard.tsx` | `fetchDashboardData` deals query (~line 637): filter by `close_date` instead of `created_at` |

