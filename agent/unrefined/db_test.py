import os
import requests
import time
from dotenv import load_dotenv
from supabase import create_client, Client

#load env variables
load_dotenv()

job_id="f97535bd-7939-4dfc-bfd4-a063c38bd95d"

#initialize supabase client
supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

#define the table name
# query = (supabase.table('profiles')
#             .select("*")
#             .execute()
#             )

# print("all query result", query)

# query = (supabase.table("jobs")
#             .select("*")
#             .eq("id", job_id)
#             .execute()
#             )

# print("query result", query)

# Get the user_id associated with the job_id
user_id = (supabase.table('jobs')
         .select("user_id, Job_email")
        .eq("id", job_id)
        .execute()
        )
print("what does user contain", user_id)

# #use the user_id to get the latest access token and refresh token from the profiles table in the database
tokens = (supabase.table('profiles')
        .select("sender")
        .eq("id", user_id.data[0]['user_id'])
        .execute()
        )
print("what does tokens contain", tokens)

# message_id = next((header['value'] for header in headers if header['name'] == 'Message-ID'), "")
values=tokens.data[0]['sender']

access_token = next((value.get('access_token') for value in values if value.get('email') == user_id.data[0]['Job_email']), None)
refresh_token = next((value.get('refresh_token') for value in values if value.get('email') == user_id.data[0]['Job_email']), None)

print("access token", access_token)
# refresh_token = tokens.data[0]['refresh_token'] or None


    #payload to get access token with the refresh token
payload = {
    'client_id': os.environ.get("GOOGLE_CLIENT_ID"),
    'client_secret': os.environ.get("GOOGLE_CLIENT_SECRET"),
    'refresh_token': refresh_token,
    'grant_type': 'refresh_token'
}
#api post request to get access token with the refresh token
response = requests.post(
    os.environ.get("TOKEN_URL"),
    data=payload
)

print("geting access token with refresh token response", response)

if response.status_code != 200:
    print("invalid refresh_token")
    exit()

#parse the response to get the access token
access_token = response.json()['access_token']
access_expires_in = time.time() + response.json()['expires_in'] #this is the time in seconds when the access token will expire

values[0].update({"access_token": access_token, "access_expires_in": access_expires_in})
print("checking:", [values[0]])
#update the access token and expires in in the database
response = (supabase.table('profiles')
        .update({ 
            "sender" : [values[0]]
            })
        .eq("id", user_id.data[0]['user_id'])
        .execute())

print("updated access token and expires in in the database", response)

user_id = (supabase.table('jobs')
         .select("user_id, Job_email")
        .eq("id", job_id)
        .execute()
        )
print("what does user contain", user_id)

# #use the user_id to get the latest access token and refresh token from the profiles table in the database
tokens = (supabase.table('profiles')
        .select("sender")
        .eq("id", user_id.data[0]['user_id'])
        .execute()
        )
print("what does tokens contain", tokens)

# message_id = next((header['value'] for header in headers if header['name'] == 'Message-ID'), "")
values=tokens.data[0]['sender']

access_token = next((value.get('access_token') for value in values if value.get('email') == user_id.data[0]['Job_email']), None)

# print("refresh token", refresh_token)
header={
        "Authorization": f"Bearer {access_token}"
    }
response = requests.get('https://gmail.googleapis.com/gmail/v1/users/me/labels', headers=header)
    
if response.status_code == 200:
    labels = response.json()
    print("Labels:", labels)
else:
    print("error getting labels", response)