

# Fix Total Sales Volume Chart - Add Time Filter Tabs

## Problem

The Total Sales Volume chart is missing the Daily/Weekly/Monthly/Yearly time filter tabs that all the other charts have. Without those tabs visible on the card, the chart appears static and doesn't give you a way to switch between time periods.

The underlying data logic already responds to the shared `chartView` state (the same one the other charts use), so the only thing missing is the tab UI on the Sales Volume chart card itself.

## Changes

### `src/pages/Dashboard.tsx`

Add the shared time filter tabs (Daily, Weekly, Monthly, Yearly) to the Total Sales Volume chart header, matching the same pattern used by the Deals Closed chart:

- Insert a `Tabs` component with `value={chartView}` and `onValueChange` into the chart header, between the title and the badge
- This connects to the same shared `chartView` state that all other charts already use, so switching the filter on any chart updates all of them simultaneously (existing behavior)

The chart data already recalculates when `chartView` changes (the `fetchChartsData` function re-runs via `useEffect`), so no data-fetching changes are needed -- just adding the missing tab UI.

