

# Commission Section: Collapse After Save + Activity Timeline Entry

## What Changes

1. **Commission section collapses after saving** -- Once saved, the form minimizes into a compact "Commission Complete" summary card showing just the total commission and office fee. A small "Edit" button lets Supreme Admins re-open it if adjustments are needed later.

2. **Commission entry added to the Activity Timeline** -- After saving, a "commission" event appears in the timeline showing "Commission recorded" with the total amount. This entry is only visible to Supreme Admins (filtered out for all other roles), keeping payout details internal.

## Technical Details

### File: `src/components/CommissionSection.tsx`

- Add a `saved` state that starts as `true` when existing commission entries are found on load, or becomes `true` after a successful save.
- When `saved` is true, render a collapsed summary card:
  - Shows "Commission Complete" with a checkmark icon
  - Displays total commission and office fee as read-only text
  - An "Edit" button sets `saved = false` to re-open the full form
- When `saved` is false (no data yet, or editing), show the current full form as-is.
- After `handleSave` succeeds, also insert an activity note into the `lead_notes` table (or a timeline-compatible record) with a special type marker so the timeline can identify it.

### File: `src/components/ActivityTimeline.tsx`

- Add a new event type: `"commission"` with a DollarSign icon and a distinct color (e.g., green/success).
- Fetch commission entries for the lead (just checking if any exist and the total) -- but only if the current user's role is `supreme_admin`.
- If the user is not a Supreme Admin, commission events are simply not added to the timeline array, so they never appear.
- Add "Commission" to the filter chip list (only shown for Supreme Admins).

### File: `src/components/layouts/TwoColumnLayout.tsx`

- Pass the user's `role` to `ActivityTimeline` so it can conditionally show/hide commission events.
- The existing `role === 'supreme_admin' && leadData.status === 'won'` guard on CommissionSection stays as-is.

### Data Flow

- Commission save writes to `leads.commission` and `commission_entries` (already implemented).
- The Activity Timeline reads from `commission_entries` to generate a single summary event per lead (not one per agent -- just "Commission recorded: $X total").
- No new database tables or migrations needed. The timeline reads existing data.

