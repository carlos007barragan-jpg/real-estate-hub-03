

# Add "Net Total Earnings" Summary to Team Payouts

## What This Does
Adds a summary row at the bottom of the Team Payouts card (Supreme Admin view) showing the **all-time net total earnings** across all agents. This gives a cumulative view since the current period filter only shows weekly/monthly/yearly slices.

## Changes

### 1. Dashboard.tsx - Fetch All-Time Total
- Add a new state variable `allTimeTotalPayout` (number)
- In the existing `fetchPayoutsData` function, after the filtered calculation, also compute the **unfiltered** total from all `commission_entries` (sum of all `payout_amount` values, no date filter)
- Store this in `allTimeTotalPayout`

### 2. Dashboard.tsx - Render Net Total Row
- Below the agent payout list (after the `.map()` block), add a styled summary row:
  - A horizontal separator
  - A row showing "Net Total Earnings" on the left and the all-time total amount on the right in bold green
  - Also show total deal count (unique lead_ids across all entries)

## Technical Details
- The `fetchPayoutsData` function already fetches all entries without a date filter (`supabase.from("commission_entries").select(...)`) and then filters client-side. The unfiltered `entries` array is already available -- we just need to sum it separately before the period filter is applied.
- New state: `const [allTimeTotalPayout, setAllTimeTotalPayout] = useState({ amount: 0, deals: 0 })`
- In `fetchPayoutsData`, before the `filtered` variable, compute:
  ```
  const allLeadIds = new Set(entries.map(e => e.lead_id));
  const allTotal = entries.reduce((sum, e) => sum + Number(e.payout_amount || 0), 0);
  setAllTimeTotalPayout({ amount: allTotal, deals: allLeadIds.size });
  ```
- In the JSX, after the payouts list `div`, add:
  ```
  <Separator className="my-3" />
  <div className="flex items-center justify-between py-3 px-3 bg-muted/30 rounded-md">
    <span className="font-semibold text-foreground">Net Total Earnings</span>
    <div className="flex items-center gap-6">
      <span className="text-sm text-muted-foreground">{deals} total deals</span>
      <span className="font-bold text-success min-w-[90px] text-right">${amount}</span>
    </div>
  </div>
  ```

