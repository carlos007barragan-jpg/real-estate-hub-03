

# Dashboard Charts -- Visibility & New Showings Chart

## Summary

Update which charts each role can see on the dashboard, add a new **Showings** chart, and expand the time filter options to **Daily / Weekly / Monthly / Yearly**.

## Chart Visibility by Role

| Chart | Supreme Admin | Admin | Agent |
|-------|:---:|:---:|:---:|
| Revenue | Yes | -- | -- |
| Appointments | Yes | -- | -- |
| Deals Closed | Yes | Yes | Yes |
| Showings (NEW) | Yes | Yes | Yes |

- **Revenue** and **Appointments** remain upper-management only (supreme_admin)
- **Deals Closed** and **Showings** are visible to everyone -- admins and agents can track these metrics too
- All charts show company-wide data, not filtered per individual user

## New "Showings" Chart

- Pulls from the `appointments` table, filtering where `appointment_type` contains "showing" (case-insensitive)
- Displayed as a line graph, same style as the other charts
- Grouped by the same time period selected in the filter

## Time Filter Options

The current **Daily / Monthly / YTD** tabs will be replaced with **Daily / Weekly / Monthly / Yearly**:

- **Daily**: Last 30 days, one data point per day
- **Weekly**: Last 12 weeks, grouped by week
- **Monthly**: Last 12 months, grouped by month
- **Yearly**: All historical data, grouped by year

The filter applies to all charts at once (shared state).

## Technical Details

**File: `src/pages/Dashboard.tsx`**

1. **Chart view state**: Change type from `'daily' | 'monthly' | 'ytd'` to `'daily' | 'weekly' | 'monthly' | 'yearly'`

2. **New state & interface**: Add `ShowingsData` interface (`{ name: string; count: number }`) and `showingsData` state

3. **Update `fetchChartsData`**:
   - Adjust `dateFrom` calculation for the new time ranges (30 days, 12 weeks, 12 months, all-time)
   - Update grouping logic for revenue and deals to support weekly and yearly buckets
   - Update appointments grouping to respect the selected time filter (currently always monthly)
   - Add showings query: filter appointments by `appointment_type` containing "showing", then group by the selected time period

4. **Update chart visibility**:
   - Revenue chart: keep `role === 'supreme_admin'` guard (no change)
   - Appointments chart: keep `role === 'supreme_admin'` guard (no change)
   - Deals Closed chart: already visible to all (no change needed)
   - Showings chart: new card, no role guard (visible to all)

5. **Update tabs UI**:
   - Replace "Daily / Monthly / YTD" with "Daily / Weekly / Monthly / Yearly"
   - Show the time filter tabs on every chart that's visible (remove the conditional hiding for non-supreme-admin on Deals Closed)
   - The tabs on the first visible chart control the shared `chartView` state

6. **Add Showings chart card**: Same line graph style as Appointments, using a distinct color (e.g., the info/blue color), placed after Deals Closed in the grid
