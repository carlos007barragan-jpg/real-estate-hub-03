

# Pipeline Volume: Use Sale Price from Deal Closed Dialog

## Problem

When a deal is moved to "Sold" and the user enters a sale price in the Deal Closed dialog, that price is saved to `sales_price` on the lead. However, the pipeline volume calculation reads from `lead.value` (a different field). So the pipeline value number never updates with the actual sale amount.

## Solution

Update the deal mapping logic so that when a lead has a `sales_price`, that value is used for the deal's dollar amount on the pipeline. This means:

1. When a deal is closed and a sale price is entered, it automatically shows up as the deal's value on the pipeline card and feeds into the Pipeline Value total.
2. If no `sales_price` exists yet, the system falls back to the existing `lead.value` field.

## Changes

### `src/pages/Pipelines.tsx`

**Deal mapping** (in `populatePipelinesWithLeads`): Change the `commission` field calculation to prefer `sales_price` over `value`:

```
// Before:
commission: parseFloat(lead.value?.replace(/[^0-9.-]+/g, "") || "0")

// After:
commission: parseFloat(
  lead.sales_price || lead.value?.replace(/[^0-9.-]+/g, "") || "0"
)
```

This single change ensures:
- The dollar amount shown on each deal card reflects the actual sale price once entered
- The "Pipeline Value" total at the top sums the real sale prices
- The "Average Deal Size" metric uses actual sale data
- The per-stage subtotals under each column header are accurate
- Deals without a sale price yet still show their estimated value from `lead.value`

No database changes are needed -- `sales_price` is already stored on the `leads` table and already fetched by the `select("*")` query.

