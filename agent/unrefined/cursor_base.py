// ... existing code ...

# Main application setup
def setup_application():
    # Set environment variables
    set_env_vars()
    
    # Initialize LLM
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, max_tokens=100, max_retries=3)
    
    # Define tools
    tools = [create_message, get_email_variables, reply_thread]
    llm_with_tools = llm.bind_tools(tools)
    
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

# Check for new emails and process them
def check_and_process_emails(query="from:salakofavour0@gmail.com", respond=True):
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
    
    if respond:
        # Generate a response based on the email body
        response = create_message(body)
        
        # Reply to the thread with the generated response
        reply_result = reply_thread(response)
        
        return {
            "status": "responded",
            "message": "Successfully processed email and sent response",
            "email_details": {
                "thread_id": gmail_thread_id,
                "subject": subject,
                "response": response
            },
            "reply_result": reply_result
        }
    
    return {
        "status": "processed",
        "message": "Successfully processed email",
        "email_details": {
            "thread_id": gmail_thread_id,
            "subject": subject,
            "body": body
        }
    }

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
    
    # If you want to manually test with a specific prompt:
    if result["status"] == "no_emails" or result["status"] == "no_new_messages":
        print("No new emails to process. Running example query instead.")
        user_input = "User: Create a message"
        stream_graph_updates(graph, user_input)