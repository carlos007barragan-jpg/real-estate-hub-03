

# Fix Deal Closing Workflow and Add Agent Payout Visibility

## Problems Identified

1. **Commission task not routing correctly**: When a deal is closed (moved to a "won" stage), the `DealClosedDialog` creates commission entry tasks for ALL supreme admins. You want this task assigned specifically to Carlos only.

2. **Agents and Admins can't see their payouts**: The "Team Payouts" section on the Dashboard is restricted to `supreme_admin` role only. Agents and admins have no way to see their individual payout information (their name, deals they closed, total payout amount).

---

## Plan

### 1. Route commission tasks to Carlos specifically

In `DealClosedDialog.tsx`, change the commission task creation logic:
- Instead of assigning the "Enter commission & payout" task to ALL supreme admins, query for Carlos's profile specifically (by name or user ID) and assign the task only to him.
- Keep notifications going to all supreme admins for visibility, but the actionable task goes to Carlos alone.
- Carlos's user ID: `fe50d35a-9f1b-4388-a039-913df7394556`

### 2. Add "My Payouts" section for Agents and Admins

On the Dashboard, add a new card visible to agents and admins (non-supreme-admin roles) that shows their individual payout data:
- **Agent Name** (their own name)
- **Deals Closed** (count of unique leads with commission entries for them)
- **Total Payout** (sum of their payout amounts)
- Period filtering (Weekly / Monthly / Yearly) matching the existing pattern
- This queries `commission_entries` filtered by `agent_user_id` matching the current user's ID

### 3. Verify deal closing flow end-to-end

Ensure the full pipeline works:
- Drag deal to won stage -> DealClosedDialog appears -> User enters details -> Task created for Carlos -> Commission section appears on lead profile

---

## Technical Details

### File Changes

**`src/components/DealClosedDialog.tsx`**
- In the `handleSave` function, replace the loop over all `supremeAdmins` for task creation with a lookup for Carlos specifically (hardcode his user ID or look up by name "Carlos Barragan" within the org)
- Keep notification inserts for all supreme admins unchanged (they still get notified)
- Only the task + task_assignees creation targets Carlos

**`src/pages/Dashboard.tsx`**
- Add a new "My Payouts" card visible to `admin` and `agent` roles
- Query `commission_entries` where `agent_user_id = current_user_id`
- Display: agent's name, number of deals closed, total payout amount
- Include the same Weekly/Monthly/Yearly period tabs
- Position it near the existing "Deals Closed" chart section

