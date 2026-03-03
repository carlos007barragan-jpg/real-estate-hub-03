

## Plan: Separate Transaction Cards for Secondary Deals

### Problem
Secondary deals (from `lead_deals` table) are currently squeezed into the bottom of the primary Property card as small entries labeled "Property of Interest 2/3." They show only an address and a tiny edit button, making it hard to view or manage deal-specific data like sales price, commission, close date, and transaction type.

### Solution
Remove the `DealPropertyEntry` items from inside the primary Property card and instead render each secondary deal as its own full standalone card in the sidebar. Each card will display all relevant deal information and provide inline editing.

### Changes

**1. `src/components/layouts/TwoColumnLayout.tsx`**
- Remove the `DealPropertyEntry` component and the section that renders `leadDeals` inside the Property card (lines 668-683).
- After the Property card (and before or after the second card), render a new `DealTransactionCard` for each item in `leadDeals`.
- Each card will show:
  - Header: "Transaction {N}" with a badge for transaction type (e.g., "Funding", "Buyer's")
  - Property of interest address
  - Property specs (beds, baths, sqft, type) if available
  - Financial fields: sales price, commission, agent payout, points charged, total fee
  - Close date and title office
  - Edit button that opens the existing `EditDealPropertyDialog` (already built with full fields)

**2. New component: `DealTransactionCard` (inline in TwoColumnLayout or extracted)**
- A self-contained card component receiving a `deal` record from `lead_deals`.
- Displays all fields from the deal record in a clean layout matching the primary Property card's style.
- Edit button opens `EditDealPropertyDialog` with the deal's data.
- Transaction type is shown as an editable badge or displayed prominently.

### What stays the same
- The primary Property card continues to show Transaction 1 data from the `leads` table.
- The `LeadDealsAccordion` above the two-column layout continues to show pipeline progress for secondary deals.
- The `EditDealPropertyDialog` remains the editing mechanism -- it already supports all the fields needed.

### Technical Details
- Data source: `leadDeals` array already passed into `TwoColumnLayout` from `LeadProfile.tsx`.
- Each card reads from the `lead_deals` table columns: `property_of_interest`, `property_address`, `property_type`, `bedrooms`, `bathrooms`, `sqft`, `sales_price`, `commission`, `agent_payout`, `points_charged`, `total_fee`, `title_office`, `close_date`, `transaction_type`, `down_payment`.
- On save from `EditDealPropertyDialog`, the existing `onLeadUpdate` callback refreshes both `leads` and `lead_deals` data.

