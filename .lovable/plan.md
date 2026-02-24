

# Restructure Property Categorization

## The Core Insight

Your business has two independent questions for every property, and they can mix freely:

**1. What is the property?** (Property Type)
- Single Family, Multi Family, Condo, Townhouse, Land, Commercial, Luxury, Multifamily, Mixed Use

**2. What are we doing with it?** (Deal Strategy)
- Traditional Listing (on-market, client hires us to sell)
- Wholesale (we acquire off-market, then assign/sell the contract)
- Owner Finance (we or seller carry the note)

Any combination is valid: you can wholesale a multifamily, owner-finance a commercial property, or traditionally list a luxury home.

## Proposed Field Structure

### Keep: Property Type (what is the building?)
Single Family, Multi Family, Condo, Townhouse, Land, Commercial, Luxury, Multifamily, Mixed Use

### Replace Category + Transaction Type + Is Wholesale with: Deal Strategy (what are we doing with it?)
- **Traditional Listing** -- on-market, agent represents seller/buyer
- **Wholesale** -- off-market acquisition, assigning contract
- **Owner Finance** -- seller/we carry the note
- **Lease** -- rental / lease agreement
- **Rent to Own** -- lease with purchase option

### Keep: Market Status
- On Market / Off Market
- (This auto-correlates with Deal Strategy but is still useful as a separate filter since a wholesale deal could technically go on-market)

### Remove
- **Category field** -- no longer needed. "Residential vs Commercial vs Luxury" is already answered by Property Type. Having both was the source of confusion.
- **Transaction Type section** -- replaced by Deal Strategy inside the classification box
- **Finance Type free-text input** -- removed (overlapped with Deal Strategy)
- **Is Wholesale checkbox** -- removed (covered by Deal Strategy = Wholesale)

### Keep (unchanged)
- Down Payment (shows when Deal Strategy = Owner Finance)
- Monthly Payment, Interest Rate, ARV, Commission
- All property details (sqft, beds, baths, etc.)

## How This Looks in the Form

The "Property Classification" box at the top becomes a clean 2x2 grid:

```text
+-------------------------+-------------------------+
| Property Type *         | Deal Strategy *         |
| [Single Family    v]    | [Wholesale         v]   |
+-------------------------+-------------------------+
| Market Status           |                         |
| [Off Market       v]    |                         |
+-------------------------+-------------------------+
```

The separate "Transaction Type" and "Transaction Details" sections below are removed entirely.

## What Happens to Existing Data

- Properties with old `category` values (like "Wholesale", "Off-Market") will still display their stored values -- they just won't appear as options for new entries
- The `category` column stays in the database but won't be used in the form going forward
- `transaction_type` column is reused for the new Deal Strategy values
- No database migration needed

## Files to Modify

**`src/pages/Inventory.tsx`**
- Expand Property Classification box to include Deal Strategy dropdown and Market Status
- Deal Strategy options: traditional_listing, wholesale, owner_finance, lease, rent_to_own
- Remove the standalone "Transaction Type" section (lines 1349-1372)
- Remove the "Transaction Details" section with finance_type input + is_wholesale checkbox (lines 1374-1414)
- Remove the Category dropdown from the classification box (replaced by Deal Strategy)
- Update filter sidebar to use Deal Strategy instead of Category/Transaction Type
- Keep down_payment conditional on `transaction_type === 'owner_finance'`

**`src/components/EditPropertyDialog.tsx`**
- Mirror the same changes: Deal Strategy dropdown, remove category, remove finance_type, remove is_wholesale

**`src/components/InventoryFieldSettings.tsx`**
- Remove the Category customization section (no longer a used field)
- Keep Property Type customization
- Optionally add Deal Strategy customization

**`src/pages/PropertyDetail.tsx`**
- Update display labels: show "Deal Strategy" instead of "Category" and "Transaction Type"
- Remove finance_type display

**`src/pages/OwnerPortalDashboard.tsx`**
- Update any category references to use the new field structure
