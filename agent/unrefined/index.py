import os
import getpass
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
import base64
from email.message import EmailMessage

# Constants
SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]
CLIENT_SECRET_FILE = "credentials.json"
INDEX_NAME = "test1"  # Will be dynamic in the future

# Global variables for email context
gmail_thread_id = ""
overall_message_id = ""
receiver = "salakofavour0@gmail.com"
sender = "favoursalako041@gmail.com"
subject = ""
body = ""
message_id = ""
references = ""

# Initialize memory saver
memory = MemorySaver()

# Environment setup function -> if keys are not in .env then ask via terminal
def set_env_vars():
    required_vars = ["GROQ_API_KEY", "PINECONE_API_KEY"]
    for var in required_vars:
    if not os.environ.get(var):
        os.environ[var] = getpass.getpass(f"{var}: ")

# Initialize services
def initialize_services():
    # Initialize Pinecone
pc = Pinecone(api_Key=os.environ.get("PINECONE_API_KEY"))

    # Initialize Gmail API
flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
creds = flow.run_local_server(port=0)
service = build('gmail', 'v1', credentials=creds)

    return pc, service

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

    pc, _ = initialize_services()
    index = pc.Index(INDEX_NAME)
    query = body
    
    # Embed query
    embedding = pc.inference.embed(
    model="multilingual-e5-large",
    inputs=[query],
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
def reply_thread(query: str):
    """
    Send an email message reply to an email thread.
    
    Args:
        query: The content to send as the body of the reply

    return:
        A string saying the message was sent    
    """
    # return:        The sent message's id
    global gmail_thread_id, subject, message_id, references, receiver, sender
    
    _, service = initialize_services()

    message = EmailMessage()
    message.set_content(query)
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
    
    send_message = service.users().messages().send(userId='me', body=email).execute()

    print("response",  send_message)
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
def check_and_process_emails(query="from:salakofavour0@gmail.com")->bool:
    """
    Checks for new emails matching the query, processes them, and optionally responds.
    
    Args:
        query: Search query for Gmail
        respond: Whether to automatically respond to found emails
        
    return:
        Dictionary with status and any relevant information
    """
    global gmail_thread_id, subject, message_id, references, body
    
    # Initialize services
    _, service = initialize_services()
    
    # Search for emails matching the query
    result = service.users().messages().list(userId='me', q=query).execute()
    messages = result.get('messages', [])
    
    if not messages:
        print("No new emails found matching the query.")
        return {"status": "no_emails", "message": "No new emails found matching the query."}
    
    # Get the latest message
    latest_message = messages[0]
    thread_id = latest_message.get("threadId")
    
    # Get the full thread to find the latest message in the conversation
    thread = service.users().threads().get(userId='me', id=thread_id).execute()
    last_message = thread.get('messages', [])[-1]
    
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

    if result:
    user_input = "User: Create a message"
        stream_graph_updates(graph, user_input)
        user_input = "User: Reply to the thread with the previously created message once"
        stream_graph_updates(graph, user_input)
        print("END of flow")


    # Example usage
    # If you want to manually test with a specific prompt:
    # if result["status"] == "no_emails" or result["status"] == "no_new_messages":
    #     print("No new emails to process. Running example query instead.")
        # user_input = "User: Create a message"
        # stream_graph_updates(graph, user_input)