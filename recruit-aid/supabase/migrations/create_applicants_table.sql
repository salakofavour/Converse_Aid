-- Create applicants table
CREATE TABLE IF NOT EXISTS "applicants" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name_email JSONB NOT NULL CHECK (
    jsonb_typeof(name_email->'name') = 'string' AND
    jsonb_typeof(name_email->'email') = 'string'
  ),
  thread_id TEXT,
  message_id TEXT,
  body TEXT,
  response TEXT,
  overall_message_id TEXT,
  subject TEXT,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index on job_id for better query performance
CREATE INDEX applicants_job_id_idx ON applicants(job_id);

-- Add RLS policies
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own applicants through job ownership
CREATE POLICY "Users can view their own applicants through jobs"
  ON applicants
  FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM jobs
      WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to insert applicants for their own jobs
CREATE POLICY "Users can insert applicants for their own jobs"
  ON applicants
  FOR INSERT
  WITH CHECK (
    job_id IN (
      SELECT id FROM jobs
      WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to update applicants for their own jobs
CREATE POLICY "Users can update applicants for their own jobs"
  ON applicants
  FOR UPDATE
  USING (
    job_id IN (
      SELECT id FROM jobs
      WHERE user_id = auth.uid()
    )
  );

-- Policy to allow users to delete applicants for their own jobs
CREATE POLICY "Users can delete applicants for their own jobs"
  ON applicants
  FOR DELETE
  USING (
    job_id IN (
      SELECT id FROM jobs
      WHERE user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_applicants_updated_at
  BEFORE UPDATE ON applicants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 