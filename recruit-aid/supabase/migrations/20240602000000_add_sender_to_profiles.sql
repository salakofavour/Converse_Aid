-- Add sender field to profiles table
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS sender JSONB DEFAULT '[]'::jsonb;

-- Create index on sender for faster queries
CREATE INDEX IF NOT EXISTS profiles_sender_idx ON "profiles" USING GIN (sender);

-- Comment on sender field
COMMENT ON COLUMN "profiles".sender IS 'List of sender email addresses'; 