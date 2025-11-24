-- Fix organization-related foreign key constraints to allow user deletion

-- Contact category options should cascade delete when organization is deleted
ALTER TABLE contact_category_options
DROP CONSTRAINT IF EXISTS contact_category_options_organization_id_fkey,
ADD CONSTRAINT contact_category_options_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;

-- Vendor subcategory options should cascade delete when organization is deleted
ALTER TABLE vendor_subcategory_options
DROP CONSTRAINT IF EXISTS vendor_subcategory_options_organization_id_fkey,
ADD CONSTRAINT vendor_subcategory_options_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;

-- Transaction types should cascade delete when organization is deleted
ALTER TABLE transaction_types
DROP CONSTRAINT IF EXISTS transaction_types_organization_id_fkey,
ADD CONSTRAINT transaction_types_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;

-- Custom fields should cascade delete when organization is deleted
ALTER TABLE custom_fields
DROP CONSTRAINT IF EXISTS custom_fields_organization_id_fkey,
ADD CONSTRAINT custom_fields_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE CASCADE;

-- Profiles organization link should set to null
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey,
ADD CONSTRAINT profiles_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT contact_category_options_organization_id_fkey ON contact_category_options
IS 'Cascade delete custom contact categories when organization is deleted';
COMMENT ON CONSTRAINT vendor_subcategory_options_organization_id_fkey ON vendor_subcategory_options
IS 'Cascade delete custom vendor types when organization is deleted';
COMMENT ON CONSTRAINT transaction_types_organization_id_fkey ON transaction_types
IS 'Cascade delete transaction types when organization is deleted';
COMMENT ON CONSTRAINT custom_fields_organization_id_fkey ON custom_fields
IS 'Cascade delete custom fields when organization is deleted';
COMMENT ON CONSTRAINT profiles_organization_id_fkey ON profiles
IS 'Set organization to NULL when organization is deleted';