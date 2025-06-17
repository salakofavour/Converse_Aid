## Important 
 - The converse-aid folder contains the webapp & the agent folder contains the agent functionality.
 - Always create the initial message and save it before initiating the agent.
 - The interval is the difference between agent checking for new messages and replying if one exists.
 - A user can add multiple emails to serve as senders for different jobs/task agents.

## Database Schema
The database schema of both the webapp & the agent

### Jobs Table
create table public.jobs (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text not null,
  job_start_date date not null,
  job_end_date date not null,
  status text not null default 'active'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  about text null,
  more_details text null,
  "Job_email" text null,
  agent_state public.agent_state_enum null,
  subject text null,
  default_message text null,
  original_filename text null,
  file_uploaded boolean not null default false,
  interval numeric null,
  constraint Jobs_pkey primary key (id),
  constraint Jobs_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists jobs_job_email_idx on public.jobs using btree ("Job_email") TABLESPACE pg_default;

create index IF not exists jobs_status_idx on public.jobs using btree (status) TABLESPACE pg_default;

create index IF not exists jobs_user_id_idx on public.jobs using btree (user_id) TABLESPACE pg_default;

create trigger job_count_delete_trigger
after DELETE on jobs for EACH row
execute FUNCTION update_job_count ();

create trigger job_count_insert_trigger
after INSERT on jobs for EACH row
execute FUNCTION update_job_count ();

create trigger update_jobs_updated_at BEFORE
update on jobs for EACH row
execute FUNCTION update_updated_at_column ();

create trigger update_members_subject_trigger
after
update OF subject on jobs for EACH row
execute FUNCTION update_members_subject ();


### Members Table
create table public.members (
  id uuid not null default gen_random_uuid (),
  job_id uuid null,
  name_email jsonb not null,
  thread_id text null,
  message_id text null,
  body text null,
  response text null,
  overall_message_id text null,
  subject text null,
  reference_id text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint applicants_pkey primary key (id),
  constraint applicants_job_id_fkey foreign KEY (job_id) references jobs (id) on delete CASCADE,
  constraint applicants_name_email_check check (
    (
      (
        jsonb_typeof((name_email -> 'name'::text)) = 'string'::text
      )
      and (
        jsonb_typeof((name_email -> 'email'::text)) = 'string'::text
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists applicants_job_id_idx on public.members using btree (job_id) TABLESPACE pg_default;

create trigger update_applicants_updated_at BEFORE
update on members for EACH row
execute FUNCTION update_updated_at_column ();


### Profiles Table
create table public.profiles (
  id uuid not null,
  name text null,
  email text not null,
  company text null,
  role text null,
  phone text null,
  timezone text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  sender jsonb null default '[]'::jsonb,
  job_count integer not null default 0,
  constraint Profiles_pkey primary key (id),
  constraint Profiles_email_key unique (email),
  constraint Profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists profiles_id_idx on public.profiles using btree (id) TABLESPACE pg_default;

create index IF not exists profiles_sender_idx on public.profiles using gin (sender) TABLESPACE pg_default;

create trigger update_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at_column ();


### Subscriptions Table
create table public.subscriptions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  status text not null,
  trial_start timestamp with time zone null,
  trial_end timestamp with time zone null,
  subscription_end timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_user_id_key unique (user_id),
  constraint subscriptions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint subscriptions_status_check check (
    (
      status = any (
        array[
          'trialing'::text,
          'active'::text,
          'canceled'::text,
          'incomplete'::text,
          'incomplete_expired'::text,
          'past_due'::text,
          'unpaid'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists subscriptions_user_id_idx on public.subscriptions using btree (user_id) TABLESPACE pg_default;

create index IF not exists subscriptions_stripe_customer_id_idx on public.subscriptions using btree (stripe_customer_id) TABLESPACE pg_default;

create index IF not exists subscriptions_status_idx on public.subscriptions using btree (status) TABLESPACE pg_default;

create trigger update_subscriptions_updated_at BEFORE
update on subscriptions for EACH row
execute FUNCTION update_subscription_updated_at ();

FUNCTIONS:

delete_jobs_for_expired_subscriptions -> 
BEGIN
    DELETE FROM "jobs"
    WHERE user_id IN (
        SELECT user_id
        FROM "subscriptions"
        WHERE subscription_end < NOW() - INTERVAL '3 days'
    );
END;


update_job_count ->
BEGIN
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
END;

update_members_subject ->
BEGIN
    UPDATE "members"
    SET subject = NEW.subject
    WHERE job_id = NEW.id;
    RETURN NEW;
END;

update_subscription_updated_at ->
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;


update_updated_at_column ->
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;


# Custom data type
Enumerated type -> agent_state_enum : running, stopped, paused

## Agent architecture
The agent folder is containerized via docker & pushed to AWS ecr and a task is created in AWS ECS.

## AWS 
api gateway(POST & DELETE) (POST -> start agent, resume agent, DELETE -> pause agent, stop agent) that initiate respective lambda functions

# 3 lambda functions & 1 queue:
- WorkerQueue : A queue that receives a message every interval that the created scheduled rule runs and gets the job_id & then initiates the run_container ith the job_id.

 - run_container: function to run the created task in ECS & pass the job_id to it as it needs a job_id passed to it to run.
import json
import boto3
import os

ecs = boto3.client('ecs')

def lambda_handler(event, context):
    job_id = event.get("job_id")  # You pass this in the event payload

    response = ecs.run_task(
        cluster='simple-cluster',
        launchType='FARGATE',
        taskDefinition='taskName',
        count=1,
        platformVersion='LATEST',
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': ["subnet-",
                            "subnet-",
                            "subnet-",
                            "---",
                            "---"],  
# Update with your subnet(s)
                'securityGroups': ['sg'],  # Update with your security group(s)
                'assignPublicIp': 'ENABLED'
            }
        },
        overrides={
            'containerOverrides': [
                {
                    'name': 'agent-container',  # Must match the container name in your task def
                    'command': ['python', 'run.py', '--job-id', str(job_id)]
                }
            ]
        }
    )

    print("Run task response:", response.json)
    return response.json


 - delete_schedule: function that deletes the event scheduler rule that has the same name as the job_id passed
import json
import boto3

eventbridge = boto3.client('events')

def lambda_handler(event, context):
    try:
        # The event should directly contain the 'name' field, without being wrapped in 'body'
        name = event.get('name')

        if not name:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Name is required to delete the schedule.'})
            }

        rule_name = f"schedule_{name}"
        target_id = f"Target_{name}"

        # 1. Remove the target from the rule
        eventbridge.remove_targets(
            Rule=rule_name,
            Ids=[target_id]
        )

        # 2. Delete the rule
        eventbridge.delete_rule(
            Name=rule_name
        )

        return {
            'statusCode': 200,
            'body': json.dumps({'message': f'Schedule {rule_name} deleted successfully.'})
        }

    except Exception as e:
        print(f"Error deleting schedule: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


 - create_schedule: function to create an event scheduler rule based on the passed job_id & interval
import json
import boto3
from botocore.exceptions import ClientError


eventbridge = boto3.client('events', region_name='us-east-1')
sqs = boto3.client('sqs', region_name='us-east-1')

AWS_ACCOUNT_ID = ''# put account id here
QUEUE_ARN = 'arn:aws:sqs:us-east-1:{AWS_ACCOUNT_ID}:workerQueue'
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/{AWS_ACCOUNT_ID}/workerQueue'


def lambda_handler(event, context):
    try:
        # The event should directly contain the 'name' and 'interval' fields
        name = event.get('name')
        interval = event.get('interval', 15)  # Default to 15 minutes if not provided

        if not name:
            raise ValueError("Missing 'name' parameter")

        rule_name = f"schedule_{name}"

        # 1. Create EventBridge Rule
        eventbridge.put_rule(
            Name=rule_name,
            ScheduleExpression = f"rate({interval} {'minute' if interval == 1 else 'minutes'})",
            State='ENABLED'
        )

        # 2. Set the rule target to SQS queue
        eventbridge.put_targets(
            Rule=rule_name,
            Targets=[
                {
                    'Id': f'Target_{name}',
                    'Arn': QUEUE_ARN,
                    'Input': json.dumps({'name': name, 'interval': interval}),
                }
            ]
        )

        # 3. Grant EventBridge permission to send to SQS
        sqs.set_queue_attributes(
            QueueUrl=QUEUE_URL,
            Attributes={
                'Policy': json.dumps({
                    "Version": "2012-10-17",
                    "Id": f"{QUEUE_ARN}/SQSDefaultPolicy",
                    "Statement": [
                        {
                            "Sid": f"Allow_EventBridge_{name}",
                            "Effect": "Allow",
                            "Principal": { "Service": "events.amazonaws.com" },
                            "Action": "SQS:SendMessage",
                            "Resource": QUEUE_ARN,
                            "Condition": {
                                "ArnEquals": { "aws:SourceArn": f"arn:aws:events:us-east-1:{AWS_ACCOUNT_ID}:rule/{rule_name}" }
                            }
                        }
                    ]
                })
            }
        )

        return {
            'statusCode': 200,
            'body': json.dumps({'message': f'Schedule {rule_name} created successfully.'}),
        }

    except ClientError as err:
        print(f"Error creating schedule: {err}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(err)}),
        }

    except ValueError as ve:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': str(ve)}),
        }