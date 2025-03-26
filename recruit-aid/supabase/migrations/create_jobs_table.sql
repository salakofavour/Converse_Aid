-- Create jobs table
CREATE TABLE IF NOT EXISTS "jobs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  flow_start_date DATE NOT NULL,
  flow_end_date DATE NOT NULL,
  responsibilities TEXT,
  requirements TEXT,
  applicants JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  status_manually_set BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own jobs
CREATE POLICY "Users can view their own jobs"
  ON "jobs"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own jobs
CREATE POLICY "Users can insert their own jobs"
  ON "jobs"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own jobs
CREATE POLICY "Users can update their own jobs"
  ON "jobs"
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy for users to delete their own jobs
CREATE POLICY "Users can delete their own jobs"
  ON "jobs"
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON "jobs"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON "jobs" (user_id);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS jobs_status_idx ON "jobs" (status); 