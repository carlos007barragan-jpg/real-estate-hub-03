

## Plan: Fix Pipeline Card Data Routing and Move Scroll Bar to Top

### Problem Summary
1. **Duplicate/wrong property on pipeline card**: The lead "Milian Erazo" has `pipeline` set on the primary `leads` record, AND has an active `lead_deals` entry for the same pipeline. This creates two cards — the primary one showing the OLD/closed property address (7234 Hanford Ave) instead of the active deal's property (3139 W Barker Circle).
2. **Scroll bar is at the bottom** of the pipeline board, making it hard to navigate horizontally.

### Changes

#### 1. Skip primary lead card when a `lead_deal` exists for the same pipeline (`src/pages/Pipelines.tsx`)
- The `leadDealsByLeadAndPipeline` map is already built (lines 314-321) but never used
- In the `leads.forEach` loop (line 361), add a check: if this lead already has a `lead_deal` entry for the resolved `pipelineId`, skip creating the primary card — the `lead_deals` loop will handle it with the correct property address
- This prevents duplicate cards and ensures the correct property (from `lead_deals.property_of_interest`) is shown

#### 2. Move horizontal scroll bar to top of pipeline board (`src/pages/Pipelines.tsx`)
- Change the `overflow-x-auto pb-4` container (line 1092) to use CSS `transform: scaleY(-1)` on the scroll container, and `scaleY(-1)` again on the inner content to flip the scrollbar to the top while keeping content right-side up
- Alternatively, add a duplicate scrollbar at the top using a synced scroll approach

### Technical Detail

**Deduplication logic (line ~373, after resolving pipelineId):**
```text
if lead has lead_deals for this pipelineId → skip primary card
```

This uses the already-built `leadDealsByLeadAndPipeline` map. The secondary deal card (from `leadDeals.forEach`) already correctly reads `ld.property_of_interest`, `ld.sales_price`, and `ld.close_date`.

**Scroll bar flip** uses a CSS technique on the scroll container:
```css
.scroll-top { transform: rotateX(180deg); overflow-x: auto; }
.scroll-top > * { transform: rotateX(180deg); }
```

### Files to Edit
- `src/pages/Pipelines.tsx`

