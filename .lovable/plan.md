

# Update Appointments Chart to Show All Appointments

## What Changes

The "Appointments Confirmed" chart will be updated to show **all appointments** (regardless of status), so you can see the full picture -- past performance and future trajectory -- as a line graph on your dashboard.

## How It Will Look

- Chart title changes to **"Appointments"**
- The line graph shows appointments grouped by month, including:
  - Past months: how many appointments were booked historically
  - Current month: what's happening now
  - Future months: upcoming scheduled appointments, so you can see if the trend is going up or down
- All appointment statuses are included (pending, confirmed, completed, cancelled) to give you the complete volume picture

## Who Sees It

- Same as before: only visible to Carlos and Leilani (supreme_admin role)

## Technical Details

**File: `src/pages/Dashboard.tsx`**

1. Rename the `AppointmentsConfirmedData` interface to `AppointmentsData`, changing the `confirmed` field to `count`
2. Update the state variable name from `appointmentsConfirmedData` to `appointmentsData`
3. Modify the database query to remove `.eq("status", "confirmed")` -- fetch all appointments
4. Update the data processing to use the `count` field name
5. Update the chart rendering:
   - Title: "Appointments" instead of "Appointments Confirmed"
   - `dataKey` changes from `"confirmed"` to `"count"`
   - Everything else (line style, color, dots, layout) stays the same

