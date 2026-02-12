

# Platform Audit and Improvement Plan

## What's Working Well
- Dashboard, Leads, Pipelines, Contacts, Inventory, Calendar are all connected to the database
- Tasks exist in lead profiles with inline editing support
- Pipeline drag-and-drop is functional
- Authentication and role-based access are in place

---

## Issues Found

### 1. Inbox Page is Entirely Fake
The Inbox page (`/pages/Inbox.tsx`) uses hardcoded mock email data. It is not connected to the database at all -- no emails are sent, received, or stored. It's purely a static UI mockup.

**Recommendation:** Either remove it from the navigation to avoid confusion, or flag it as "Coming Soon" so users don't mistake it for a working feature.

### 2. Pipeline Page Has Hardcoded Fallback Data
The Pipelines page (`/pages/Pipelines.tsx`) contains `mockPipelines` with fake deals (Sarah Johnson, David Kim, Tech Corp Inc, etc.). While real data loads from the database, these mock deals can appear briefly or mix in under certain conditions, causing confusion.

**Recommendation:** Remove the mock deal entries from `mockPipelines` -- keep only the stage structure as a fallback template for new organizations.

### 3. Dashboard Makes 16+ Parallel Database Queries
The Dashboard fires a massive `Promise.all` with 16 separate queries on every load. This is the primary reason it feels slow.

**Recommendation:** Consolidate where possible. For example, several queries fetch from the same table (`call_logs`, `leads`, `appointments`) with slightly different filters -- these can be merged and filtered client-side.

### 4. Leads Page Fetches User Role Redundantly
The Leads page calls `supabase.auth.getUser()` and checks admin role separately, even though `useAuth()` already provides this via `AuthContext`.

**Recommendation:** Use the existing `useAuth()` hook instead of re-fetching.

---

## Tasks Feature Improvements

### 5. Show "Created Date" and "Assigned To" on Tasks
Currently, the `TasksSection` component only shows the task title, description, and due date. You asked to also see:
- **When the task was created** (the `created_at` field already exists in the database)
- **Who the task is assigned to** (the `user_id` field exists -- we just need to look up the user's name)

**Changes:**
- Fetch the profile name for each task's `user_id` and display it as "Assigned to: [Name]"
- Display the `created_at` date formatted as "Created: [date]"
- Show both fields in the task card view mode, beneath the description

---

## Performance Improvements

### 6. Reduce Redundant `supabase.auth.getUser()` Calls
Multiple pages call `supabase.auth.getUser()` independently on mount. The `AuthContext` already stores the session and user info.

**Recommendation:** Replace direct `getUser()` calls with `useAuth()` session data across Leads, Dashboard, and Inventory pages.

### 7. Leads Page Makes 4 Separate Init Calls
`fetchLeads`, `fetchTransactionTypes`, `fetchCurrentUserPhone`, and `fetchAvailableUsers` all run on mount -- each calling `getUser()` separately.

**Recommendation:** Consolidate into a single init function that calls `getUser()` once, then parallelizes the data fetches.

---

## Summary of Changes

| Area | Change | Impact |
|------|--------|--------|
| Inbox | Mark as "Coming Soon" or hide from nav | Prevents user confusion |
| Pipelines | Remove mock deal data from fallback | Cleaner data, no fake entries |
| Dashboard | Merge duplicate queries on same tables | Faster load |
| Tasks | Add created date and assigned-to name | Better task visibility |
| Leads/Dashboard | Use `useAuth()` instead of `getUser()` | Fewer API calls per page |
| Leads | Consolidate 4 init functions into 1 | Fewer round-trips |

---

## Technical Details

### Task Card Enhancement (TasksSection.tsx)
- After fetching tasks, batch-fetch profiles for all unique `user_id` values using a single `.in("user_id", ids)` query
- Display in each task card:
  - "Assigned to: First Last" below description
  - "Created: MMM DD, YYYY" next to or below the due date
- No database schema changes needed -- `created_at` and `user_id` already exist on the `tasks` table

### Inbox "Coming Soon" Treatment
- Replace the mock email UI with a simple centered "Coming Soon" message with an icon
- Or add a "Coming Soon" badge overlay to the existing UI

### Dashboard Query Consolidation
- Merge the duplicate `call_logs` queries (lines 351 vs 369) into one fetch, then filter client-side for totals vs per-agent counts
- Same for `leads` (lines 357 vs 375) and `appointments` (lines 359 vs 377)
- This cuts roughly 6-8 queries down

### Pipeline Mock Data Cleanup
- Keep `mockPipelines` structure but empty the `deals` arrays so no fake names appear

