

# Transaction-Type-Specific Lead Profile Fields (Final Updated Plan)

## Overview

The Property card and Areas of Interest & Budget card on the lead profile sidebar will dynamically transform based on the selected transaction type. Each type gets tailored fields. Additionally, for the **Listing** type (and others where relevant), users can link an inventory property to pre-fill details -- just like the current buyer flow.

## Transaction Type Field Layouts

### Unassigned / Buyer's / Renter
Current layout unchanged -- Property of Interest, Address, Beds/Baths/Sqft, Inventory link, Areas of Interest, Budget, Down Payment, Financing Type.

### Funding
**Property Card -- "Funding Property"**
- Inventory link toggle (pre-fills fields from inventory if linked)
- Property of Interest
- Property Address
- Bedrooms / Bathrooms
- Purchase Price
- Rehab Amount Needed
- Estimated Credit Score
- Estimated Close Date (date picker)
- Preferred Lender (dropdown filtering contacts where category = 'Lender')

**Second Card -- "Loan & LLC Details"**
- Title Company
- Loan Details (textarea)
- LLC Information (textarea)

### Listing
**Property Card -- "Listing Property"**
- Inventory link toggle (pre-fills Address, List Price, Beds/Baths/Sqft, Property Type from inventory)
- Property of Interest
- Property Address
- List Price
- Beds / Baths / Sqft
- Town
- School District

**Second Card -- "Listing Requirements"**
- Listing documents/notes textarea

### Wholesale
**Property Card -- "Wholesale Property"**
- Inventory link toggle (pre-fills from inventory)
- Property of Interest
- Property Address
- Contract Price
- List Price
- Condition
- Beds / Baths / Sqft
- Year Built

**Second Card -- "Transaction Details"**
- Title Office

### Multifamily
**Property Card -- "Multifamily Property"**
- Inventory link toggle (pre-fills from inventory)
- Property Address
- Number of Units
- Unit Mix
- Cap Rate
- NOI
- Purchase Price
- Year Built

**Second Card -- "Investment Analysis"**
- Summary display (no areas/budget/financing fields)

### Commercial
**Property Card -- "Commercial Property"**
- Inventory link toggle (pre-fills from inventory)
- Property Address
- Property Sub-Type (Office / Retail / Industrial / Mixed Use)
- Sqft
- Cap Rate
- NOI
- Purchase Price
- Zoning

**Second Card -- "Investment Analysis"**
- Summary display (no areas/budget/financing fields)

### Investor
**Property Card -- "Investor Profile"**
- Areas of Interest (multi-select, same KC metro list)
- Timeframe to Close

**Second Card -- "Tracked Deals"**
- Repeatable section to add multiple property entries, each with:
  - Property of Interest (text)
  - Property Address
  - Budget
  - Status (Interested, Under Contract, Closed)
- Add Deal / Remove Deal buttons
- Stored as JSON array in `investor_deals` column

## Inventory Pre-Fill Logic

All transaction types (except Investor and Unassigned) will have the same inventory link toggle already present in the buyer flow. When a user toggles "Property in Inventory" ON and selects a property:

- **Common fields**: Property Address (from `name`), Property Type, Beds, Baths, Sqft are pre-filled and disabled
- **Listing**: Also pre-fills List Price from inventory `price`
- **Funding**: Also pre-fills Purchase Price from inventory `price`
- **Wholesale**: Pre-fills List Price from inventory `price`
- **Multifamily/Commercial**: Pre-fills Purchase Price from inventory `price`

The inventory badge and "View Property" link appear on the card just like they do today for buyer leads.

## Database Migration

New columns added to the `leads` table (all nullable):

| Column | Type | Used By |
|---|---|---|
| title_company | text | Funding, Wholesale |
| loan_details | text | Funding |
| llc_information | text | Funding |
| purchase_price | text | Funding, Multifamily, Commercial |
| rehab_amount | text | Funding |
| estimated_credit_score | text | Funding |
| estimated_close_date | date | Funding |
| preferred_lender_id | uuid (FK to contacts.id) | Funding |
| list_price | text | Listing, Wholesale |
| town | text | Listing |
| school_district | text | Listing |
| contract_price | text | Wholesale |
| property_condition | text | Wholesale |
| year_built | text | Wholesale, Multifamily |
| listing_documents | text | Listing |
| number_of_units | integer | Multifamily |
| unit_mix | text | Multifamily |
| cap_rate | text | Multifamily, Commercial |
| noi | text | Multifamily, Commercial |
| zoning | text | Commercial |
| commercial_property_type | text | Commercial |
| investor_deals | jsonb (default '[]') | Investor |

Total: 22 new columns. No RLS changes needed -- existing lead policies cover them automatically.

## Code Changes

### 1. Database Migration
Single migration adding all 22 columns to `leads`.

### 2. LeadProfile.tsx
Map all 22 new database columns into the `leadData` object so they flow to the layout components.

### 3. TwoColumnLayout.tsx
- Read `transactionType` from state (already exists).
- **Property card**: Conditionally render different headings and field sets per transaction type. Show inventory badge and link for all types that support it.
- **Areas & Budget card**: Conditionally render different headings and field sets per transaction type. For Investor, render the "Tracked Deals" repeatable UI.
- Pass `transactionType` to both edit dialogs.

### 4. EditPropertyDialog.tsx
- Accept optional `transactionType` prop.
- Keep the existing inventory link toggle for all types except Investor.
- When inventory is selected, pre-fill the type-appropriate fields (e.g., List Price for Listing, Purchase Price for Funding).
- Conditionally show/hide field groups based on transaction type:
  - **Funding**: Property of Interest, Address, Beds/Baths, Purchase Price, Rehab Amount, Credit Score, Close Date, Preferred Lender dropdown
  - **Listing**: Property of Interest, Address, List Price, Beds/Baths/Sqft, Town, School District
  - **Wholesale**: Property of Interest, Address, Contract Price, List Price, Condition, Beds/Baths/Sqft, Year Built
  - **Multifamily**: Address, Number of Units, Unit Mix, Cap Rate, NOI, Purchase Price, Year Built
  - **Commercial**: Address, Commercial Property Type, Sqft, Cap Rate, NOI, Purchase Price, Zoning
  - **Investor**: Areas of Interest, Timeframe to Close
  - **Default**: Current fields unchanged

### 5. EditAreasInterestDialog.tsx
- Accept optional `transactionType` prop.
- **Funding**: Title Company, Loan Details, LLC Information
- **Listing**: Listing Documents/Requirements
- **Wholesale**: Title Office
- **Multifamily / Commercial**: Minimal or hidden
- **Investor**: Hidden (deals managed in dedicated UI)
- **Default**: Current fields unchanged

## File Summary

| File | Change |
|---|---|
| Database migration | Add 22 new nullable columns to `leads` |
| `src/pages/LeadProfile.tsx` | Map new columns into leadData |
| `src/components/layouts/TwoColumnLayout.tsx` | Conditional card rendering by type; inventory badge for all linked types; Investor multi-deal UI; pass transactionType to dialogs |
| `src/components/EditPropertyDialog.tsx` | Accept transactionType; inventory pre-fill per type; type-specific field visibility; Preferred Lender dropdown; save new columns |
| `src/components/EditAreasInterestDialog.tsx` | Accept transactionType; type-specific fields; save new columns |

