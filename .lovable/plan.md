

# Clean Up Property Display on Lead Profile

## Problem
Right now, there are "Transaction 1 / Transaction 2" cards sitting between the pipeline progress bar and the deals accordion. They look messy, show "No property assigned" even when a property exists, and duplicate information. The user wants a cleaner approach.

## What Changes

### 1. Remove the Transaction Cards from the Main Content Area
Delete the "Properties of Interest - Separate boxes per transaction" block in `LeadProfile.tsx` (lines 799-842). Those cards will no longer appear between the pipeline bar and the accordion.

### 2. Update the Sidebar Property Card to Show Multiple Properties
In `TwoColumnLayout.tsx`, the existing "Property" card on the left sidebar will be enhanced to list properties from all active transactions:

- **Primary transaction property** -- labeled with the pipeline name (e.g., "Owner Finance Sales")
- **Each additional deal's property** -- labeled with the deal label or transaction type (e.g., "Wholesale Deal")

Each property entry will show:
- A small label like "Transaction 1" or "Transaction 2"
- The property address (or "No property assigned" if empty)
- A separator between multiple properties

This keeps everything in one clean card on the left side rather than scattered boxes in the main content area.

### 3. Pass Deal Data to TwoColumnLayout
`TwoColumnLayout` currently doesn't receive deal data. We'll pass `leadDeals` as a new prop so it can render the additional property addresses in the sidebar Property card.

---

## Technical Details

**Files to modify:**

1. **`src/pages/LeadProfile.tsx`**
   - Remove lines 799-842 (the transaction cards block)
   - Pass `leadDeals` as a prop to `TwoColumnLayout`

2. **`src/components/layouts/TwoColumnLayout.tsx`**
   - Add `leadDeals` to the component props interface
   - In the Property card section (~line 474), add a section that iterates over `leadDeals` and renders each deal's `property_of_interest` with a label (transaction type or deal label)
   - Use a `Separator` between the primary property info and each additional deal's property
   - Each deal property entry: small "Transaction N" label + MapPin icon + address

## What Stays the Same
- The deals accordion below still shows full deal details (stage selector, financials, etc.)
- The pipeline progress bar at the top is unchanged
- The pipeline board cards continue showing property addresses as before

