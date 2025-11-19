-- Add unique constraint to prevent duplicate transaction types per user
ALTER TABLE transaction_types
ADD CONSTRAINT unique_transaction_type_per_user UNIQUE (user_id, name);