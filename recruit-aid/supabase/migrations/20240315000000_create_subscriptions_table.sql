-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid')),
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON "subscriptions"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own subscription
CREATE POLICY "Users can insert their own subscription"
  ON "subscriptions"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own subscription
CREATE POLICY "Users can update their own subscription"
  ON "subscriptions"
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON "subscriptions"
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON "subscriptions" (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON "subscriptions" (stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON "subscriptions" (status); 