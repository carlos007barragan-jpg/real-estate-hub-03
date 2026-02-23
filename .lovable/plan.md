

## Archive Leads Feature

### Overview
Add the ability to archive leads so they no longer show up as active, without deleting them. Archived leads can be viewed anytime through a filter on the Leads page.

### How It Works

1. **New lifecycle stage: "Archived"** -- A new stage gets added to the lead lifecycle on the lead profile page, appearing after the existing stages (Contact, Book Consult, Execute Consult, Showings, Moved to Pipeline). When you move a lead to "Archived," it gets flagged in the database and disappears from the default leads view.

2. **Archive button on Lead Profile** -- On the lead profile page, an "Archive" button will appear (likely in the header area near existing actions). Clicking it sets the lead's lifecycle to "Archived" and saves the timestamp of when it was archived. A confirmation dialog will ask before archiving.

3. **Leads page hides archived by default** -- The main Leads page query will exclude archived leads by default so they don't clutter your active list.

4. **"Archived" filter on Leads page** -- A new filter option in the Filters popover lets you toggle to see archived leads. When selected, only archived leads appear. You can also add a quick-access "Archived" tab or badge next to the existing filters.

5. **Unarchive** -- From an archived lead's profile, you can move it back to "Contact" (or any lifecycle stage) to restore it as an active lead.

### Technical Details

```text
Database migration:
  - ALTER TABLE leads ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
  - ALTER TABLE leads ADD COLUMN archived_at timestamptz;

Files to modify:
  - src/pages/LeadProfile.tsx
      - Add "Archived" to leadLifecycleStages array
      - Add archive/unarchive button in the header
      - When lifecycle changes to "Archived", set is_archived=true and archived_at=now()
      - When lifecycle changes away from "Archived", set is_archived=false and archived_at=null
  
  - src/pages/Leads.tsx
      - Add archiveFilter state (default: "active" which excludes archived)
      - Modify the query or client-side filter to exclude leads where is_archived=true by default
      - When archive filter is set to "archived", show only archived leads
      - Update Lead interface to include isArchived and archivedAt fields
  
  - src/components/LeadFilters.tsx
      - Add an "Archive Status" filter with options: Active (default), Archived, All
      - Add props for archiveFilter and onArchiveFilterChange
```

**Lifecycle flow:**
- When a lead's lifecycle is set to "Archived", the system automatically sets `is_archived = true` and `archived_at = now()`
- When unarchived (moved back to any other lifecycle stage), `is_archived = false` and `archived_at = null`
- The Leads page defaults to showing only active (non-archived) leads
- The filter popover includes an "Archive Status" dropdown to toggle between Active, Archived, and All views

