

# Update Public Properties API for External App Integration

## Problem
The other Lovable app expects properties in a specific JSON format, but our `public-properties` endpoint returns data in a different structure. We also need to include all financial details (interest rate, down payment, payment, etc.) and return all property types -- not just owner-financed ones.

## Changes

### 1. Update `public-properties` Edge Function
Remap the response to match the format the other app expects, while also including all the extra financial fields our CRM tracks:

**Field mapping (ours to theirs):**
- `id` maps to `property_id`
- `name` maps to `address` (our "name" field stores the property address)
- `price` stays as `price`
- `photo_url` maps to `cover_photo_url`
- `photo_urls` maps to `photos`
- `finance_type` maps to `financing_options` (as an array)
- `transaction_type` maps to `terms`
- `show_on_public_page` maps to `is_public`

**Additional financial fields included:**
- `down_payment`, `interest_rate`, `payment`, `max_loan_amount`
- `arv`, `acquisition_price`, `estimated_repairs`, `calculated_rehab_budget`
- `market_status`, `status`, `category`

**Filter change:** Remove the requirement for `show_on_public_page = true` and `public_approval_status = 'approved'` so ALL inventory properties for the organization are available to the external app. The `is_public` flag will still be included so the other app can filter if needed.

### 2. Update `handle-property-inquiry` Edge Function
Accept the payload format the other app sends:
- `name` (full name) instead of separate `firstName`/`lastName`
- `inquiry_type` field
- Map incoming fields to our existing lead/inquiry creation logic

### 3. Tell the Other App What to Expect
After updating, the response format will be:

```text
{
  "properties": [
    {
      "property_id": "uuid",
      "address": "123 Main St",
      "price": 250000,
      "terms": "Sale",
      "bedrooms": 3,
      "bathrooms": 2,
      "sqft": 1800,
      "description": "...",
      "cover_photo_url": "https://...",
      "photos": ["https://..."],
      "is_public": true,
      "property_type": "House",
      "financing_options": ["Owner Finance"],
      "finance_type": "Owner Finance",
      "down_payment": 25000,
      "interest_rate": 8.5,
      "payment": 1500,
      "max_loan_amount": 200000,
      "arv": 300000,
      "acquisition_price": 180000,
      "estimated_repairs": 20000,
      "calculated_rehab_budget": 25000,
      "market_status": "Active",
      "status": "Available",
      "category": "Residential",
      "assigned_agent": { ... }
    }
  ],
  "branding": { ... },
  "organization_id": "..."
}
```

---

## Technical Details

**Files to modify:**
- `supabase/functions/public-properties/index.ts` -- remap response fields, remove public-only filter, add all financial columns to the select query
- `supabase/functions/handle-property-inquiry/index.ts` -- accept both the new payload format (`name` as single field, `inquiry_type`) and the existing format for backward compatibility

**No database changes needed** -- all fields already exist in the inventory table.
