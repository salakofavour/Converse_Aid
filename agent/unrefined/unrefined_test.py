import os
import requests
import time
import base64
import getpass
import json
from dotenv import load_dotenv
from typing import Annotated
from langchain_core.messages import BaseMessage
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from pinecone.grpc import PineconeGRPC as Pinecone
# from langchain.tools import Tool
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from email.message import EmailMessage
from supabase import create_client, Client


# Constants
# SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
# CLIENT_SECRET_FILE = "credentials.json"
INDEX_NAME = "test1"  # Will be dynamic in the future
GMAIL_URL="https://gmail.googleapis.com/gmail/v1/users/"

# Global variables for email context
gmail_thread_id = ""
overall_message_id = ""
receiver = "salakofavour0@gmail.com"
sender = "favoursalako041@gmail.com"
subject = ""
body = ""
message_id = ""
references = ""
job_id = "f97535bd-7939-4dfc-bfd4-a063c38bd95d" #this will be gotten from the db, but for now, it is a static value

#load env variables
load_dotenv()

# Initialize memory saver
memory = MemorySaver()

# Environment setup function -> if keys are not in .env then ask via terminal
def set_env_vars():
    required_vars = ["GROQ_API_KEY", "PINECONE_API_KEY", "SUPABASE_URL", "SUPABASE_KEY"]
    for var in required_vars:
        if not os.environ.get(var):
            os.environ[var] = getpass.getpass(f"{var}: ")

# Initialize services
def initialize_services():
    #Initialize Supabase db
    supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
    
    return supabase

# State definition
class State(TypedDict):
    email_body_prompt: str
    messages: Annotated[list, add_messages]

# Create message tool
def create_message() -> str:
    """
    Checks the global body variable against the Pinecone index and returns a response grounded in the results.
        
    return:
        A string with context that is dependent on the search results
    """

    # Args:
    #     query: The question to search for in the knowledge base
    # Initialize Pinecone
    pc = Pinecone(api_Key=os.environ.get("PINECONE_API_KEY"))

    supabase = initialize_services()

    #Get variables to use from db
    query = (supabase.table("jobs")
            .select("*")
            .eq("id", job_id)
            .execute()
            )
    
    if not query.data:
        print("No job found with the given id.")
        return "No Job found with given id"

    print("query result from select", query)

    index = pc.Index(INDEX_NAME) # for now this will still be the test defined above but eventually it will be the job id from db
    pinecone_query = query.data[0]["body"]
    
    # Embed query
    embedding = pc.inference.embed(
        model="multilingual-e5-large",
        inputs=[pinecone_query],
        parameters={"input_type": "query"}
    )

    # Search for relevant information
    results = index.query(
        namespace="example1",
        vector=embedding[0]['values'],
        top_k=3,
        include_values=False,
        include_metadata=True,
    )

    # Process results
    context = ""
    for match in results.matches:
        if match.score >= 0.8:
            context += match.metadata["text"] + "\n\n"
    
    if not context:
        context = "Your question is not related to the job in question. Please refrain from asking questions that are not related to this role."

    # Generate response
    prompt = PromptTemplate.from_template(
        "Provide a simple 2 sentences response that is strictly based on the following text {defined_context} in a professional tone."
    )
    full_prompt = prompt.invoke({"defined_context": context})
    
    return full_prompt.text

# Reply to thread tool -> message is sent to receiver, but find a way to process query so it looks smooth (this is all looks, functionality is good)
def reply_thread(new_message: str):
    """
    Send an email message reply to an email thread.
    
    Args:
        new_message: The content to send as the body of the reply

    return:
        A string saying the message was sent    
    """
    # return:        The sent message's id
    # global gmail_thread_id, subject, message_id, references, receiver, sender
    global receiver  #still need a way to do receiver from db as receiver is an array and must go through all

    supabase = initialize_services()

    print("uuid variable", job_id)

    #Get variables to use from db
    query = (supabase.table('jobs')
            .select("*")
            .eq("id", job_id)
            .execute()
            )

    if not query.data:
        print("No job found with the given id.")
        return "No Job found with given id"

    print("query result from select", query)

    tokens = (supabase.table('profiles')
            .select("sender")
            .eq("id", query.data[0]['user_id'])
            .execute()
            )

    values=tokens.data[0]['sender']

    access_token = next((value.get('access_token') for value in values if value.get('email') == query.data[0]['Job_email']), None)


    header={
        "Authorization": f"Bearer {access_token}"
    }

    #assign values from the supabase db result to variables to use
    gmail_thread_id = query.data[0]["thread_id"]
    subject = query.data[0]["subject"]
    message_id = query.data[0]["message_id"]
    references = query.data[0]["references"]
    sender = query.data[0]["Job_email"]

    message = EmailMessage()
    message.set_content(new_message)
    message["To"] = receiver
    message["From"] = sender
    message["Subject"] = f"Re: {subject}" if not subject.startswith("Re:") else subject
    
    if references:
        message["References"] = f"{references} {message_id}"
    else:
        message["References"] = message_id
        
    message["In-Reply-To"] = message_id

    # Encode and send message
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    email = {"raw": raw, "threadId": gmail_thread_id}
    
    send_message = requests.send(GMAIL_URL+"me/messages/send", headers=header, data=json.dumps(email))

    print("response",  send_message.json())
    return "Message sent successfully"

# Main application setup
def setup_application():
    # Set environment variables
    set_env_vars()

    print("Environment variables set")
    
    # Initialize LLM
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, max_tokens=100, max_retries=3)
    
    print("LLM initialized")
    # Define tools -> with the current way, there would be no need for tool, just the llm to take context, and return the message in create_message function
    tools = [create_message, reply_thread] #
    llm_with_tools = llm.bind_tools(tools)
    
    print("LLM with tools initialized")
    
    # Define chatbot function
    def chatbot(state: State):
        return {"messages": [llm_with_tools.invoke(state["messages"])]}
    
    # Build graph
    graph_builder = StateGraph(State)
    graph_builder.add_node("chatbot", chatbot)
    
    tool_node = ToolNode(tools)
    graph_builder.add_node("tools", tool_node)
    
    graph_builder.add_conditional_edges("chatbot", tools_condition)
    graph_builder.add_edge(START, "chatbot")
    graph_builder.add_edge("tools", "chatbot")
    
    return graph_builder.compile(checkpointer=memory)


# Check for new emails and process them   on gmail, itself, I will check how to query with multiple values and use here
def check_and_process_emails()->bool:
    """
    Checks for new emails matching the provided search_for variable, processes them, and optionally responds.
            
    return:
        Boolean to indicate if the new email exists and was processed successfully
    """
    # Args:
    # query: Search query for Gmail
    # global gmail_thread_id, subject, message_id, references, body
    #Checks for new emails matching the query gotten from the db, processes them, and optionally responds. # for now it is not coming from db, but from the search_for variable

    
    # Initialize services
    supabase = initialize_services()

    #Get variables to use from db
    query = (supabase.table('jobs')
            .select("*")
            .eq("id", job_id)
            .execute()
            )
    if not query.data:
        print("No job found with the given id.")
        return "No Job found with given id"

    print("query result from select", query)

    #use the user_id to get the latest access token and refresh token from the profiles table in the database
    tokens = (supabase.table('profiles')
            .select("sender")
            .eq("id", query.data[0]['user_id'])
            .execute()
            )
    print("what does tokens contain", tokens)
    
    values=tokens.data[0]['sender']

    access_token = next((value.get('access_token') for value in values if value.get('email') == query.data[0]['Job_email']), None)


    header={
        "Authorization": f"Bearer {access_token}"
    }

    #assign values from the supabase db result to variables to use
    search_for = "subject:Trial to see how this goes" #this is what we would be searching by, will be applicants email, as well as the subject of the email, will make some adjustment and additions to this
    gmail_thread_id = query.data[0]["thread_id"]
    subject = query.data[0]["subject"]
    overall_message_id = query.data[0]["overall_message_id"]
    body = query.data[0]["body"]
    message_id = query.data[0]["message_id"]
    references = query.data[0]["references"]

    # Search for emails matching the query
    result = requests.list(GMAIL_URL+"me/messages?q={search_for}", headers=header)
    messages = result.json().get('messages', [])
    
    if not messages:
        print("No new emails found matching the query.")
        return {"status": "no_emails", "message": "No new emails found matching the query."}
    
    # Get the latest message
    latest_message = messages[0]
    thread_id = latest_message.get("threadId")
    
    # Get the full thread to find the latest message in the conversation
    thread = requests.get(GMAIL_URL+"me/threads/{thread_id}", headers=header)
    # service.users().threads().get(userId='me', id=thread_id).execute()
    last_message = thread.json().get('messages', [])[-1] #this is the last message in the thread
    
    # Check if we've already processed this message
    if gmail_thread_id == thread_id and overall_message_id == last_message.get('id'):
        print("No new messages in the thread since last check.")
        return {"status": "no_new_messages", "message": "No new messages in the thread since last check."}
    
    # Update global variables with the new message information
    gmail_thread_id = thread_id
    overall_message_id = last_message.get('id')
    
    # Extract message details
    payload = last_message['payload']
    headers = payload['headers']
    
    # Update global variables
    subject = next((header['value'] for header in headers if header['name'] == 'Subject'), "")
    
    # Get body - handle different message structures
    if 'parts' in payload:
        encoded_body = payload['parts'][0]['body']['data']
    else:
        encoded_body = payload['body']['data']
    
    body = base64.urlsafe_b64decode(encoded_body).decode("utf-8")
    message_id = next((header['value'] for header in headers if header['name'] == 'Message-ID'), "")
    references = next((header['value'] for header in headers if header['name'] == 'References'), "")
    
    #upserting the email information into a db
    response = (supabase.table('jobs')
            .update({"thread_id": gmail_thread_id, "overall_message_id":overall_message_id, "subject": subject, "body": body, "message_id": message_id, "references": references})
            .eq("id", job_id)
            .execute())
    print("db upsert response", response)

    print(f"Found new message in thread: {subject}")
    return True #if it gets to this stage it meanse there was a new message and all processing worked


    # #technically, this will always run as it is true, No?    
    # if respond:
    #     # Generate a response based on the email body
    #     response = create_message(body)
    #     # stream_graph_updates(graph, response)
    #     # Reply to the thread with the generated response
    #     reply_result = reply_thread(response)
        
    #     return {
    #         "status": "responded",
    #         "message": "Successfully processed email and sent response",
    #         "email_details": {
    #             "thread_id": gmail_thread_id,
    #             "subject": subject,
    #             "response": response
    #         },
    #         "reply_result": reply_result
    #     }
    
    # return {
    #     "status": "processed",
    #     "message": "Successfully processed email",
    #     "email_details": {
    #         "thread_id": gmail_thread_id,
    #         "subject": subject,
    #         "body": body
    #     }
    # }

def confirm_refresh_and_access_token(): #first point of contact in flow. It ensurres there is both a valid access token and refresh token and this decides the ongoing flow
    """
    Confirms if the access token is expired and needs to be refreshed. 
    It uses the refresh token to refresh the access token.
    
    return:
        data in the senders column of profile table if the access token is valid otherwise calls the create_access_token function to create a new access token
    """
    supabase = initialize_services()

    # Get the user_id associated with the job_id
    user_id = (supabase.table('jobs')
            .select("user_id, Job_email")
            .eq("id", job_id)
            .execute()
            )
    print("what does user contain", user_id)

    #use the user_id to get the latest access token and refresh token from the profiles table in the database
    tokens = (supabase.table('profiles')
            .select("sender")
            .eq("id", user_id.data[0]['user_id'])
            .execute()
            )
    print("what does tokens contain", tokens)
    
    values=tokens.data[0]['sender']

    access_token = next((value.get('access_token') for value in values if value.get('email') == user_id.data[0]['Job_email']), None)
    refresh_token = next((value.get('refresh_token') for value in values if value.get('email') == user_id.data[0]['Job_email']), None)
    access_expires_in = next((value.get('access_expires_in') for value in values if value.get('email') == user_id.data[0]['Job_email']), None)
    
    #check if access token is none or expired.
    if access_token is None or access_expires_in is None or access_expires_in < time.time():
        create_access_token(refresh_token, user_id)
    else:

        return tokens.data[0]





#creates a  new access token with the refresh token. The response informs us if the refresh_token is still valid
def create_access_token(refresh_token, user_id):
    
    supabase = initialize_services()
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
        return "invalid refresh_token"
    
    #parse the response to get the access token
    access_token = response.json()['access_token']
    access_expires_in = time.time() + response.json()['expires_in'] #this is the time in seconds when the access token will expire

    #update the access token and expires in in the database
    response = (supabase.table('profiles')
            .update({ 
                "data": supabase.raw("data || ?", [{"access_token": access_token, "access_expires_in": access_expires_in}])
                })
            .eq("id", user_id.data[0]['user_id'])
            .execute())
    
    print("updated access token and expires in in the database", response)
    return "access token created"





# Stream graph updates
def stream_graph_updates(graph, user_input: str, config: dict = None):
    if config is None:
        config = {"configurable": {"thread_id": "1"}}
        
    events = graph.stream(
        {"messages": [{"role": "user", "content": user_input}]},
        config,
        stream_mode="values",
    )
    
    for event in events:
        event["messages"][-1].pretty_print()










# Main execution
if __name__ == "__main__":
    graph = setup_application()

    # Check for new emails and process them automatically
    result = check_and_process_emails()

    if result==True:
        user_input = "User: Create a message"
        stream_graph_updates(graph, user_input)
        user_input = "User: Reply to the thread with the previously created message once"
        stream_graph_updates(graph, user_input)
        print("END of flow")

    print("No process, END of flow")


    # Example usage
    # If you want to manually test with a specific prompt:
    # if result["status"] == "no_emails" or result["status"] == "no_new_messages":
    #     print("No new emails to process. Running example query instead.")
        # user_input = "User: Create a message"
        # stream_graph_updates(graph, user_input)