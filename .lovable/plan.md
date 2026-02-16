

# Make Property Public: 2541 Grandview Blvd

## Problem
The property "2541 Grandview Blvd, Kansas City, KS 66102" is not appearing on the public website because:
- `show_on_public_page` is set to `false`
- `public_approval_status` is set to `pending`

## Current API Behavior
- The `/public-properties` list endpoint returns ALL properties but flags each with `is_public: true/false`. The external website filters on this flag client-side.
- The `/public-property-detail` endpoint explicitly requires `show_on_public_page = true` AND `public_approval_status = 'approved'` -- so even direct links to this property would fail.

## Fix

### 1. Database Update
Run a migration to set this property as public and approved:

```sql
UPDATE inventory
SET show_on_public_page = true,
    public_approval_status = 'approved'
WHERE id = '298546fd-9ddc-42a4-8303-982682bcc80c';
```

This single change will:
- Make the property appear with `is_public: true` in the list endpoint (so the external site shows it)
- Allow the detail endpoint to return the full property data (so clicking into it works)

### 2. No Code Changes Needed
Both edge functions are already working correctly. The issue is purely a data state problem -- the property was never approved for public display.

## Technical Notes
- The `public-properties` endpoint returns all properties and maps `show_on_public_page` to `is_public` for the external app
- The `public-property-detail` endpoint enforces both `show_on_public_page = true` and `public_approval_status = 'approved'` as server-side filters
- After this update, the property will appear on the next sync/refresh of the external website
