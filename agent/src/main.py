import os
import time
import asyncio
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
# memory = MemorySaver()

class State(TypedDict):
    """State object used in the graph."""
    email_response: str
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
        self.applicant_id = None  # Will be set during processing of each applicant
        
        # # Set up LLM and graph
        # self.graph = None
        # self.setup_graph()
        self.graph = None  # Will be set up for each applicant in run()
    
    def setup_graph(self) -> None:
        """Set up the LangGraph for message processing."""
        try:
            memory = MemorySaver()
            # Initialize LLM
            llm = ChatGroq(
                model=config.LLM_MODEL, 
                temperature=config.LLM_TEMPERATURE, 
                max_tokens=config.LLM_MAX_TOKENS, 
                max_retries=3
            )
            
            
            # Define chatbot function
            def chatbot(state: State):
                result = llm.invoke(state["messages"])
                return {"messages": [result]}
            
            # Build graph
            graph_builder = StateGraph(State)
            graph_builder.add_node("chatbot", chatbot)
            graph_builder.add_node("create_message", self.create_message)
            graph_builder.add_node("reply_thread", self.reply_thread)


            # add edges
            graph_builder.add_edge(START, "create_message")
            graph_builder.add_edge("create_message", "reply_thread")
            graph_builder.add_edge("reply_thread", END)

            
            # Compile the graph
            self.graph = graph_builder.compile(checkpointer=memory)
            
        except Exception as e:
            raise

    def create_message(self, state: State) -> Dict[str, Any]:
        """
        Tool function: Create a response message based on email content.
        
        return:
            The updated state with the new message
        """
        try:
            llm = ChatGroq(
                model=config.LLM_MODEL, 
                temperature=config.LLM_TEMPERATURE, 
                max_tokens=config.LLM_MAX_TOKENS, 
                max_retries=3
            )

            # Get applicant details
            applicant = db.get_applicant_details(self.applicant_id)
            
            # Search for relevant information using the last email's body
            email_body = applicant.get("body", "")
            print("email_body: ", email_body)
            receiver = f"hi {applicant.get('name_email', {}).get('name', '')}"

            email_context_prompt = PromptTemplate.from_template(
                """You are a helpful assistant that is given a conversation thread. Your job is to extract the job related context of the last response not starting with {receiver} in a single sentence.
                    Understand that the context is going to be used for a semantic search, so it needs to semantically represent the last response not starting with {receiver}.
                   Conversation Thread: {email_history}\n
                   """
            )
            email_context = llm.invoke(email_context_prompt.invoke({"email_history": email_body, "receiver": receiver}))
            print("email_context: ", email_context)
            search_results = vector_search.search_with_text(self.job_id, email_context)
            # Also provide a summary of the conversation thread in a few sentences.
            # Create a prompt with the context
            if search_results["has_relevant_matches"]:
                context = search_results["context"]
            else:
                context = "Your question is not related to the job in question. Please refrain from asking questions that are not related to this role."
            
            # Generate response using template
            prompt = PromptTemplate.from_template(
                """You are a helpful recruiting assistant that responds to applicants within a given context. Given a conversation history of {email_history},
                    provide a 1-2 paragraph(not more than 2 sentences each, and no breaks between sentences except the paragraph break) well structured response strictly based in the given context. \n"
                    "Context: {context}\n"""

            )
            full_prompt = prompt.invoke({"context": context, "email_history": email_body})
            
            result = llm.invoke(full_prompt.text)
            response = result.content
            
            # Update applicant's response
            # db.update_applicant_response(self.applicant_id, response)
            # Update email response in state
            state["email_response"] = response

            return{
                "email_response": response,
                "messages": state.get("messages", []) +[{
                "content": result.content,
                "role": "assistant"
            }]
                }
            
        except Exception as e:
            # return{"content": f"Failed to create message: {str(e)}", "sequence_complete": True}
            raise
    
    def reply_thread(self, state: State) -> Dict[str, Any]:
        """
        Tool function: Reply to an email thread.
            
        return:
            The updated state with the new message
        """
        try:
            # Get applicant details
            applicant = db.get_applicant_details(self.applicant_id)
            #get email response kept in state gotten from create_message
            new_message = f"Hi {applicant['name_email']['name']}, \n\n {state['email_response']}" #here i will figure out how to add footers.
            
            # # Check if response exists and handle None case
            # if not new_message:
            #     print(f"No response found for applicant {self.applicant_id}, retrying fetch...")
            #     # Could be a timing issue, wait briefly and try once more
            #     time.sleep(1)  # Add import time if not already imported
            #     applicant = db.get_applicant_details(self.applicant_id)
            #     new_message = applicant["response"]
            #     if not new_message:
            #         return {
            #             "content": "Cannot send reply: no response message found in database", 
            #             "sequence_complete": True,
            #             "tool": None,
            #             "stop": True
            #         }
            
            # Prepare reply parameters
            reply_params = {
                "to": applicant["name_email"]["email"],
                "body": new_message,
                "thread_id": applicant["thread_id"],
                "subject": f"Re: {applicant['subject']}" if not applicant['subject'].startswith("Re:") else applicant['subject'],
                "message_id": applicant["message_id"],
                "references": applicant["reference_id"]
            }
            
            # Send the reply
            response = email_service.send_reply(self.job_id, self.applicant_id, reply_params)
            print("response from send_reply: ", response)
            
            if response: #response.get("status") == "success"
                #update applicant details with the new message_id, thread_id and overall_message_id of the just sent email
                message_data = email_service.get_message(self.job_id, response.get("id"))
                print("message_data from recently sent message: ", message_data)

                db.update_applicant_details(self.applicant_id, {
                    "message_id": message_data.get("message_id")
                })

                return {
                    "messages": state.get("messages", []) + [{
                        "content": "Message reply sent successfully",
                        "role": "assistant"
                    }]
                }
            else:
                return {
                    "messages": state.get("messages", []) + [{
                        "content": "Message reply failed",
                        "role": "assistant"
                    }]}
                    
        except Exception as e:
            raise
        
    def stream_graph_updates(self, user_input: str) -> None:
        """
        Process a user input through the graph.
        
        Args:
            user_input: Input message to process
        """
        try:
            if not self.graph:
                raise ValueError("Graph not initialized")
                
            config_data = {
                "configurable": {
                    "thread_id": self.applicant_id # thread_id is an expected value, her it is not the email thread id, its just the name of the parameter
                    # "applicant_id": self.applicant_id
                }
            }
                
            # Initialize state with the user message
            initial_state = {
                "email_body_prompt": "",
                "messages": [{"role": "user", "content": user_input}]
            }
            
            # events = self.graph.stream(
            #     initial_state,
            #     config_data,
            #     stream_mode="values",
            # )
            event = self.graph.invoke(
                initial_state,
                config_data,
            )
            if "messages" in event and event["messages"]:
                for message in event["messages"]:
                    if hasattr(message, "pretty_print"):
                        message.pretty_print()
                    else:
                        print(f"{message.get('role', 'unknown')}: {message.get('content', '')}")
            # for event in events:
            #     if "messages" in event and event["messages"]:
            #         for message in event["messages"]:
            #             if hasattr(message, "pretty_print"):
            #                 message.pretty_print()
            #             else:
            #                 print(f"{message.get('role', 'unknown')}: {message.get('content', '')}")
            
        except Exception as e:
            raise
    
    def run(self) -> Dict[str, Any]:
        """
        Run the email automation workflow for all applicants of a job.
        
        This method:
        1. Validates auth tokens
        2. Gets all applicants for the job
        3. Processes each applicant's email thread
        
        return:
            Dict with status and results information
        """
        try:
            # Validate authentication tokens
            auth_service.validate_token(self.job_id)
            
            # Get all applicants for this job
            applicants = db.get_job_applicants(self.job_id)
            
            if not applicants:
                return {
                    "status": "no_action",
                    "message": "No applicants found for this job"
                }
            print("applicants count", len(applicants))
            results = []
            for applicant in applicants:
                try:
                    # Set current applicant for tools to use
                    self.applicant_id = applicant['id']
                    
                    # Reset graph for each applicant
                    self.setup_graph()

                    # Check for new emails for this applicant
                    email_result = email_service.check_for_new_emails(
                        job_id=self.job_id,
                        applicant_id=applicant['id'],
                        applicant_email=applicant['name_email']['email']
                    )
                    
                    if email_result["status"] == "new_message":
                        print("got here")
                        # Generate a response and Send the reply
                        user_input = "User: Please perform these steps in order: 1. Create one message 2. Send one reply 3. END"
                        self.stream_graph_updates(user_input)

                        results.append({
                            "applicant_id": applicant['id'],
                            "email": applicant['name_email']['email'],
                            "status": "success",
                            "message": "Found new email and sent response",
                            "email_data": email_result.get("email_data")
                                })
                    else:
                        results.append({
                            "applicant_id": applicant['id'],
                            "email": applicant['name_email']['email'],
                            "status": "no_action",
                            "message": email_result.get("message", "No new message, so no action taken")
                        })
                        
                except Exception as e:
                    results.append({
                        "applicant_id": applicant['id'],
                        "email": applicant['name_email']['email'],
                        "status": "error",
                        "message": f"Error processing applicant: {str(e)}"
                    })
                    continue  # Continue with next applicant even if one fails
            
            # Summarize results
            success_count = sum(1 for r in results if r["status"] == "success")
            error_count = sum(1 for r in results if r["status"] == "error")
            no_action_count = sum(1 for r in results if r["status"] == "no_action")
            
            return {
                "status": "completed",
                "summary": {
                    "total_applicants": len(applicants),
                    "successful_responses": success_count,
                    "errors": error_count,
                    "no_action_needed": no_action_count
                },
                "detailed_results": results
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