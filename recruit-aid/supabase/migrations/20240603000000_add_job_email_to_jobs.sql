-- Add Job_email column to jobs table
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "Job_email" TEXT;

-- Add an index for faster searches by email
CREATE INDEX IF NOT EXISTS jobs_job_email_idx ON "jobs" ("Job_email");

COMMENT ON COLUMN "jobs"."Job_email" IS 'The sender email selected for this job posting'; 