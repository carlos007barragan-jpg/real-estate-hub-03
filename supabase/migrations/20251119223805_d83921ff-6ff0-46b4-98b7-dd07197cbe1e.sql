-- Update custom_fields policies: only admins can create/update/delete
DROP POLICY IF EXISTS "Users can create their own custom fields" ON custom_fields;
DROP POLICY IF EXISTS "Users can update their own custom fields" ON custom_fields;
DROP POLICY IF EXISTS "Users can delete their own custom fields" ON custom_fields;

CREATE POLICY "Only admins can create custom fields"
ON custom_fields
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update custom fields"
ON custom_fields
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete custom fields"
ON custom_fields
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Update transaction_types policies: only admins can create/update/delete
DROP POLICY IF EXISTS "Users can create their own transaction types" ON transaction_types;
DROP POLICY IF EXISTS "Users can update their own transaction types" ON transaction_types;
DROP POLICY IF EXISTS "Users can delete their own transaction types" ON transaction_types;

CREATE POLICY "Only admins can create transaction types"
ON transaction_types
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update transaction types"
ON transaction_types
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete transaction types"
ON transaction_types
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Ensure all users in organization can view custom fields and transaction types
DROP POLICY IF EXISTS "Users can view their own custom fields" ON custom_fields;
DROP POLICY IF EXISTS "Users can view their own transaction types" ON transaction_types;

CREATE POLICY "Users can view custom fields in their organization"
ON custom_fields
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT p.user_id
    FROM profiles p
    WHERE p.organization_id = (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view transaction types in their organization"
ON transaction_types
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT p.user_id
    FROM profiles p
    WHERE p.organization_id = (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);