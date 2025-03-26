-- Create profiles table
CREATE TABLE IF NOT EXISTS "profiles" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  role TEXT,
  phone TEXT,
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON "profiles"
  FOR SELECT
  USING (auth.uid() = id);

-- Policy for users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON "profiles"
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON "profiles"
  FOR UPDATE
  USING (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON "profiles"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create index on id for faster queries
CREATE INDEX IF NOT EXISTS profiles_id_idx ON "profiles" (id); 