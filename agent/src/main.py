import os
import time
from typing import Dict, Any, Optional, List, Annotated
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from typing_extensions import TypedDict

from src.utils import retry_with_backoff
from src.database import db
from src.auth import auth_service
from src.email_service import email_service
from src.vector_search import vector_search
import src.config as config

# Initialize memory saver for the graph
memory = MemorySaver()

class State(TypedDict):
    """State object used in the graph."""
    email_body_prompt: str
    messages: List[Dict[str, Any]]

# Function to add messages to the state
def add_messages_to_state(state: State, messages: List[Dict[str, Any]]) -> State:
    """Add messages to the state."""
    if 'messages' not in state:
        state['messages'] = []
    state['messages'].extend(messages)
    return state

class EmailAutomationApp:
    """
    Main application class for email automation.
    
    This class orchestrates all components and implements the email workflow.
    """
    
    def __init__(self, job_id: Optional[str] = None):
        """
        Initialize the email automation application.
        
        Args:
            job_id: The job ID to process (optional, defaults to config)
        """
        # Set up the job ID
        self.job_id = job_id or config.DEFAULT_JOB_ID
        
        # Set up LLM and graph
        self.graph = None
        self.setup_graph()
    
    def setup_graph(self) -> None:
        """Set up the LangGraph for message processing."""
        try:
            # Initialize LLM
            llm = ChatGroq(
                model=config.LLM_MODEL, 
                temperature=config.LLM_TEMPERATURE, 
                max_tokens=config.LLM_MAX_TOKENS, 
                max_retries=3
            )
            
            # Define tools
            tools = [self.create_message, self.reply_thread]
            llm_with_tools = llm.bind_tools(tools)
            
            # Define chatbot function
            def chatbot(state: State):
                result = llm_with_tools.invoke(state["messages"])
                return {"messages": [result]}
            
            # Build graph
            graph_builder = StateGraph(State)
            graph_builder.add_node("chatbot", chatbot)
            
            tool_node = ToolNode(tools)
            graph_builder.add_node("tools", tool_node)
            
            graph_builder.add_conditional_edges("chatbot", tools_condition)
            graph_builder.add_edge(START, "chatbot")
            graph_builder.add_edge("tools", "chatbot")
            
            # Compile the graph
            self.graph = graph_builder.compile(checkpointer=memory)
            
        except Exception as e:
            raise
    
    def create_message(self) -> str:
        """
        Tool function: Create a response message based on email content.
        
        return:
            The response from the LLM or an error message
        """
        try:
            # Get job details
            job = db.get_job_details(self.job_id)
            
            # Search for relevant information using the email body
            email_body = job.get("body", "")
            search_results = vector_search.search_with_text(email_body)
            
            # Create a prompt with the context
            if search_results["has_relevant_matches"]:
                context = search_results["context"]
            else:
                context = "Your question is not related to the job in question. Please refrain from asking questions that are not related to this role."
            
            # Generate response using template
            prompt = PromptTemplate.from_template(
                "Provide a simple 2 sentences response that is strictly based on the following text {defined_context} in a professional tone."
            )
            full_prompt = prompt.invoke({"defined_context": context})
            llm = ChatGroq(
                model=config.LLM_MODEL, 
                temperature=config.LLM_TEMPERATURE, 
                max_tokens=config.LLM_MAX_TOKENS, 
                max_retries=3
            )
            result = llm.invoke(full_prompt.text)
            response = result.content
            db.update_response(self.job_id, response)
            
            return result.content
            
        except Exception as e:
            return f"Failed to create message: {str(e)}"
    
    def reply_thread(self) -> str:
        """
        Tool function: Reply to an email thread.
        
            
        return:
            A string displaying a success message or an error message
        """
        try:
            # Get job details
            job = db.get_job_details(self.job_id)

            new_message = job["response"]
            
            # Prepare reply parameters
            reply_params = {
                "to": config.DEFAULT_RECEIVER,  # This could be dynamic
                "body": new_message,
                "thread_id": job["thread_id"],
                "subject": f"Re: {job['subject']}" if not job['subject'].startswith("Re:") else job['subject'],
                "message_id": job["message_id"],
                "references": job["references"]
            }
            print("view body: ", new_message)
            
            # Send the reply
            email_service.send_reply(self.job_id, reply_params)
            
            return "Message reply sent successfully"
            
        except Exception as e:
            return f"Failed to send message: {str(e)}"
    
    def stream_graph_updates(self, user_input: str) -> None:
        """
        Process a user input through the graph.
        
        Args:
            user_input: Input message to process
        """
        try:
            if not self.graph:
                raise ValueError("Graph not initialized")
                
            config_data = {"configurable": {"thread_id": self.job_id}}
                
            # Initialize state with the user message
            initial_state = {
                "email_body_prompt": "",
                "messages": [{"role": "user", "content": user_input}]
            }
            
            events = self.graph.stream(
                initial_state,
                config_data,
                stream_mode="values",
            )
            
            for event in events:
                if "messages" in event and event["messages"]:
                    for message in event["messages"]:
                        if hasattr(message, "pretty_print"):
                            message.pretty_print()
                        else:
                            print(f"{message.get('role', 'unknown')}: {message.get('content', '')}")
            
        except Exception as e:
            raise
    
    def run(self) -> Dict[str, Any]:
        """
        Run the email automation workflow.
        
        This method:
        1. Validates auth tokens
        2. Checks for new emails
        3. Creates and sends responses if needed
        
        return:
            Dict with status and result information
        """
        try:
            # Validate authentication tokens
            auth_service.validate_token(self.job_id)
            
            # Check for new emails
            email_result = email_service.check_for_new_emails(self.job_id)
            
            if email_result["status"] == "new_message":
                # Generate a response and then Send the reply
                user_input = "User: Create a message, and then reply to the thread once"
                self.stream_graph_updates(user_input)
                
                return {
                    "status": "success",
                    "message": "Found new email and sent response",
                    "email_data": email_result.get("email_data")
                }
            else:
                return {
                    "status": "no_action",
                    "message": email_result.get("message", "No action taken")
                }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error: {str(e)}"
            }

def main(job_id: Optional[str] = None):
    """
    Main entry point for the application.
    
    This function sets up the environment and runs the email automation workflow.

    return:
        A text saying the message was sent successfully or an error message
    """
    try:
        # Ensure environment is properly set up
        config.ensure_env_vars()
        
        # Create and run the application
        app = EmailAutomationApp(job_id)
        result = app.run()
        
        return result
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Critical error: {str(e)}"
        }

if __name__ == "__main__":
    # Run the application
    main() 