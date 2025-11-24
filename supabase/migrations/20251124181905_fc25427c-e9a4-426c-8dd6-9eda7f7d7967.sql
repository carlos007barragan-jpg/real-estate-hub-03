-- Convert category from enum to text to support custom categories
ALTER TABLE contacts 
  ALTER COLUMN category TYPE text USING category::text;

-- Convert vendor_subcategory from enum to text to support custom vendor types  
ALTER TABLE contacts
  ALTER COLUMN vendor_subcategory TYPE text USING vendor_subcategory::text;

-- Update default value for category
ALTER TABLE contacts 
  ALTER COLUMN category SET DEFAULT 'other';

-- Add comment explaining the change
COMMENT ON COLUMN contacts.category IS 'Contact category - supports both default and custom values';
COMMENT ON COLUMN contacts.vendor_subcategory IS 'Vendor subcategory - supports both default and custom values';