-- Make custom fields organization-wide instead of per-user
-- Add organization_id column to custom_fields
ALTER TABLE custom_fields
ADD COLUMN organization_id uuid REFERENCES organizations(id);

-- Populate organization_id for existing records
UPDATE custom_fields cf
SET organization_id = (
  SELECT p.organization_id 
  FROM profiles p 
  WHERE p.user_id = cf.user_id 
  LIMIT 1
);

-- Update RLS policies for organization-wide access
DROP POLICY IF EXISTS "Users can view custom fields in their organization" ON custom_fields;
DROP POLICY IF EXISTS "Only admins can create custom fields" ON custom_fields;
DROP POLICY IF EXISTS "Only admins can update custom fields" ON custom_fields;
DROP POLICY IF EXISTS "Only admins can delete custom fields" ON custom_fields;
DROP POLICY IF EXISTS "Admins can view all custom fields" ON custom_fields;

CREATE POLICY "Users can view custom fields in their organization"
ON custom_fields
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Only admins can create custom fields in their organization"
ON custom_fields
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Only admins can update custom fields in their organization"
ON custom_fields
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Only admins can delete custom fields in their organization"
ON custom_fields
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

-- Same for transaction types
ALTER TABLE transaction_types
ADD COLUMN organization_id uuid REFERENCES organizations(id);

UPDATE transaction_types tt
SET organization_id = (
  SELECT p.organization_id 
  FROM profiles p 
  WHERE p.user_id = tt.user_id 
  LIMIT 1
);

DROP POLICY IF EXISTS "Users can view transaction types in their organization" ON transaction_types;
DROP POLICY IF EXISTS "Only admins can create transaction types" ON transaction_types;
DROP POLICY IF EXISTS "Only admins can update transaction types" ON transaction_types;
DROP POLICY IF EXISTS "Only admins can delete transaction types" ON transaction_types;
DROP POLICY IF EXISTS "Admins can view all transaction types" ON transaction_types;

CREATE POLICY "Users can view transaction types in their organization"
ON transaction_types
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Only admins can create transaction types in their organization"
ON transaction_types
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin') AND
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Only admins can update transaction types in their organization"
ON transaction_types
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Only admins can delete transaction types in their organization"
ON transaction_types
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
);