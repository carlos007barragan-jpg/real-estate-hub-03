

# Commission Task Deduplication, Deal Revert Cleanup, and Audit Trail

## What Changes

1. **Commission tasks disappear for all admins when any one completes it** -- When any Supreme Admin saves commission details, all "Enter commission & payout" tasks for that lead are marked as completed. Completed tasks already don't show in the pending/overdue sections of the dashboard task bar, so they effectively disappear.

2. **Track who entered the commission** -- The `commission_entries` table already stores a `created_by` field (the user ID of the person who saved). The collapsed commission card and the activity timeline will now display the name of the Supreme Admin who recorded the commission (e.g., "Entered by Carlos Reyes"), so any discrepancies can be traced back.

3. **Deal revert cleans everything up** -- When a deal is moved OUT of a won/final stage back to an earlier stage in the pipeline, the system automatically:
   - Deletes all commission entries for that lead
   - Resets the lead's commission, sales_price, close_date, and status fields
   - Deletes any pending commission tasks for that lead
   - The activity timeline naturally stops showing the commission event (no entries exist)
   - Moving the deal back to a won stage re-triggers confetti and the DealClosedDialog, prompting fresh entry

## Technical Details

### File: `src/components/CommissionSection.tsx`

**Task completion on save:**
After successfully saving commission entries in `handleSave`, add:
```
await supabase
  .from("tasks")
  .update({ status: "completed", completed_at: new Date().toISOString() })
  .eq("lead_id", leadId)
  .ilike("title", "%Enter commission%payout%");
```
This marks all commission-related tasks for every Supreme Admin as completed in one query.

**Show who entered the commission:**
- On load (`fetchData`), also fetch the `created_by` user ID from the first commission entry
- Look up that user's name from the profiles already fetched (team members list)
- Display "Entered by [Name]" in the collapsed summary card beneath "Commission Complete"

### File: `src/components/ActivityTimeline.tsx`

**Show who recorded the commission:**
- When fetching commission entries for Supreme Admins, also select the `created_by` field
- Look up the name from the profiles table
- Display "Entered by [Name]" as part of the description (keeping it to just that -- no dollar amounts)

### File: `src/pages/Pipelines.tsx`

**Deal revert detection in `performStageChange`:**
After the existing won-stage detection block (~line 756), add a revert block:

1. Check if the PREVIOUS stage was a won stage (using `wonStageNames` and `isLastStage` logic on `activeStage`)
2. Check if the NEW stage is NOT a won stage
3. If reverting:
   - Delete `commission_entries` where `lead_id` matches
   - Update the lead: set `commission = null`, `sales_price = null`, `close_date = null`, `status = 'active'`
   - Delete tasks where `lead_id` matches and title contains "Enter commission & payout"
   - Show toast: "Deal reverted -- commission data cleared"

| File | Change Summary |
|------|---------------|
| `CommissionSection.tsx` | Mark all commission tasks as completed on save; show "Entered by [Name]" in collapsed card |
| `ActivityTimeline.tsx` | Show "Entered by [Name]" in commission event description (no dollar amounts) |
| `Pipelines.tsx` | Add revert logic: delete commission entries, reset lead fields, delete tasks when deal leaves won stage |

No database migrations needed -- all operations use existing tables and columns.
