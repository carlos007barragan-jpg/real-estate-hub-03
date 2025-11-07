-- Add financial and transaction fields to inventory table
ALTER TABLE inventory
ADD COLUMN payment numeric,
ADD COLUMN interest_rate numeric,
ADD COLUMN market_status text CHECK (market_status IN ('on_market', 'off_market')),
ADD COLUMN transaction_type text,
ADD COLUMN finance_type text,
ADD COLUMN is_wholesale boolean DEFAULT false;