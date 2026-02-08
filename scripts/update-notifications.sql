-- Add title field to notifications table if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;

-- Create push_subscriptions table for Web Push API
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_client ON push_subscriptions(client_id);

-- Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for push subscriptions
CREATE POLICY "Allow all operations on push_subscriptions" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
