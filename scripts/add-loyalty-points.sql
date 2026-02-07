-- Add loyalty points to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_loyalty_points ON clients(loyalty_points);

-- Update existing clients to have 0 points if null
UPDATE clients SET loyalty_points = 0 WHERE loyalty_points IS NULL;
