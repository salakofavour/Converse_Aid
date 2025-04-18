-- Add job_count column to profiles table
alter table public.profiles 
add column job_count integer not null default 0;

comment on column public.profiles.job_count is 'Number of jobs created by the user. Used for subscription limits.';

-- Create function to maintain job count
create or replace function public.update_job_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles 
    set job_count = job_count + 1
    where id = NEW.user_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.profiles 
    set job_count = job_count - 1
    where id = OLD.user_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql;

comment on function public.update_job_count() is 'Automatically maintains the job_count in profiles table when jobs are created or deleted';

-- Create triggers to maintain job count
create trigger job_count_insert_trigger
  after insert on public.jobs
  for each row
  execute function public.update_job_count();

create trigger job_count_delete_trigger
  after delete on public.jobs
  for each row
  execute function public.update_job_count();

-- Initialize job count for existing profiles
update public.profiles p
set job_count = (
  select count(*)
  from public.jobs j
  where j.user_id = p.id
); 