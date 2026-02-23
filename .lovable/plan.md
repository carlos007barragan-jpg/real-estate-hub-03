

## Enhanced Lead Search, Filters, and Expandable Budget/Interest Info

### What This Does
Adds the ability to search and filter leads by their financial info (budget, down payment) and areas of interest directly from the Leads page. Each lead row will also have expandable hidden details showing down payment, budget, and areas of interest -- so you can quickly scan who has money available and where they want to buy, then blast relevant properties to matching clients.

### Changes Overview

**1. Database: Add `monthly_payment` column to leads table**
- The leads table already has `area`, `budget`, `down_payment`, `property_type`, and `financing_type` columns
- Add a new `monthly_payment` text column for desired monthly payment info

**2. Fetch budget/area data in the Leads page (`src/pages/Leads.tsx`)**
- Update the Lead interface to include `area`, `budget`, `downPayment`, `monthlyPayment`, and `propertyType`
- Pull these fields from the database query and map them into the lead objects
- Update the search logic so typing a city name (e.g., "Independence") or a dollar amount matches against area, budget, and down payment fields

**3. Add Area of Interest and Budget filters (`src/components/LeadFilters.tsx`)**
- Add an "Area of Interest" dropdown filter populated with the KC metro area cities (same list used in EditAreasInterestDialog)
- Add a "Down Payment Range" filter with preset ranges (e.g., Under $10k, $10k-$25k, $25k-$50k, $50k-$100k, $100k+)
- These appear inside the existing Filters popover alongside the current filters

**4. Expandable row detail in the leads table (`src/pages/Leads.tsx`)**
- Add a small expand/collapse chevron on each lead row
- When expanded, show a secondary row beneath with: Down Payment, Budget, Monthly Payment, Areas of Interest, and Property Type
- Hidden by default to keep the table clean -- click to reveal

### Technical Details

```text
Files to modify:
  - src/pages/Leads.tsx          (interface, fetch, search, filter logic, expandable rows)
  - src/components/LeadFilters.tsx (new Area + Down Payment filter dropdowns)

Files to create:
  (none - all changes fit in existing files)

Database migration:
  - ALTER TABLE leads ADD COLUMN monthly_payment text;
```

**Search logic enhancement:**
The existing search matches on `name` and `email`. It will be extended to also match on `area`, `budget`, `down_payment`, and `monthly_payment` so typing "Independence" shows all leads interested in Independence, and typing "$25,000" shows leads with that budget/down payment.

**Filter logic for Area of Interest:**
Leads store areas as comma-separated text (e.g., "Independence, MO, Kansas City, KS"). The filter will check if the lead's area string contains the selected city.

**Filter logic for Down Payment:**
Parse the numeric value from the down payment text field and compare against the selected range bracket.

**Expandable row rendering:**
Use a local state `Set<string>` tracking which lead IDs are expanded. Clicking the chevron toggles the ID in/out of the set. The expanded detail renders as an additional `TableRow` with a `colSpan` spanning all columns, showing the financial and interest data in a compact layout.

