import os
import time
import asyncio
from typing import Dict, Any, Optional, List, Annotated
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
# from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from typing_extensions import TypedDict

from src.database import db
from src.auth import auth_service
from src.email_service import email_service
from src.vector_search import vector_search
import src.config as config
from src.utils import util
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
        self.job_id = job_id or os.environ.get("DEFAULT_JOB_ID")
        self.member_id = None  # Will be set during processing of each member
        
        # # Set up LLM and graph
        # self.graph = None
        # self.setup_graph()
        self.graph = None  # Will be set up for each member in run()
    
    #normal function, not as a tool. tool = too much hassle
    def start_message(self) -> str:
        """
        function: This is the function used to start the conversation. Message to send is gotten from database.
            
        return:
            A string saying the initial message has been sent on success or failed to send on failure.
        """
        try:
            # Get member details first
            member = db.get_member_details(self.member_id)
            if not member:
                raise ValueError(f"No member found with ID {self.member_id}")
                
            # Send the message
            response = email_service.send_first_message(self.job_id, member)
            print("response from send_first_message: ", response)
            
            if response: 
                # Update member details with the new message_id
                message_data = email_service.get_message(self.job_id, response.get("id"))
                print("message_data from recently sent message: ", message_data)

                db.update_member_details(self.member_id, {
                    "message_id": message_data.get("message_id"),
                    "thread_id": message_data.get("message_id")
                })

                return "Initial Message sent successfully"
            else:
                return "Initial Message failed"
                    
        except Exception as e:
            raise ValueError(f"Error sending initial message: {str(e)}")

    def create_message(self, state: State) -> Dict[str, Any]:
        """
        Tool function: Create a response message based on email content.
        
        return:
            The updated state with the new message
        """
        try:
            llm = ChatGroq(
                model=os.environ.get("LLM_MODEL"), 
                temperature=os.environ.get("LLM_TEMPERATURE"), 
                max_tokens=os.environ.get("LLM_MAX_TOKENS"), 
                max_retries=3
            )

            # Get member details
            member = db.get_member_details(self.member_id)
            
            # Search for relevant information using the last email's body
            email_body = member.get("body", "")
            print("email_body: ", email_body)
            receiver = f"hi {member.get('name_email', {}).get('name', '')}"

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
                #send a notification email to the user informing the user that an member has asked a question not in KnowledgeBase
                message = util.notification_message(self.member_id, self.job_id, "member - {member_email} asked a question that is  either not related to the job in question or not in the KnowledgeBase. We continued the conversation but you can check your email with {member_email} and subject - {subject_title} to see the question. It is the message before the member is informed not to ask questions that are not related to the job in question.")
                email_service.send_user_notification_email(message)
            
            # Generate response using template
            prompt = PromptTemplate.from_template(
                """You are a helpful recruiting assistant that responds to members within a given context. Given a conversation history of {email_history},
                    if email_context is completely a greeting, respond with a complementary greeting & ask how you can help in 2-3 sentences.
                    else provide a 1-2 paragraph(not more than 2 sentences each, and no breaks between sentences except the paragraph break) well structured response strictly based in the given context. \n"
                    "Context: {context}\n"""

            )
            full_prompt = prompt.invoke({"context": context, "email_history": email_body})
            
            result = llm.invoke(full_prompt.text)
            response = result.content
            
            # Update member's response
            # db.update_member_response(self.member_id, response)
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
            The updated state informing the llm that the reply has been sent on success or failed to send on failure.
        """
        try:
            # Get member details
            member = db.get_member_details(self.member_id)
            #get email response kept in state gotten from create_message
            new_message = f"Hi {member['name_email']['name']}, \n\n {state['email_response']}" #here i will figure out how to add footers.
            
            # # Check if response exists and handle None case
            # if not new_message:
            #     print(f"No response found for member {self.member_id}, retrying fetch...")
            #     # Could be a timing issue, wait briefly and try once more
            #     time.sleep(1)  # Add import time if not already imported
            #     member = db.get_member_details(self.member_id)
            #     new_message = member["response"]
            #     if not new_message:
            #         return {
            #             "content": "Cannot send reply: no response message found in database", 
            #             "sequence_complete": True,
            #             "tool": None,
            #             "stop": True
            #         }
            
            # Prepare reply parameters
            reply_params = {
                "to": member["name_email"]["email"],
                "body": new_message,
                "thread_id": member["thread_id"],
                "subject": f"Re: {member['subject']}" if not member['subject'].startswith("Re:") else member['subject'],
                "message_id": member["message_id"],
                "references": member["reference_id"]
            }
            
            # Send the reply
            response = email_service.send_reply(self.job_id, self.member_id, reply_params)
            print("response from send_reply: ", response)
            
            if response: #response.get("status") == "success"
                #update member details with the new message_id, thread_id and overall_message_id of the just sent email
                message_data = email_service.get_message(self.job_id, response.get("id"))
                print("message_data from recently sent message: ", message_data)

                db.update_member_details(self.member_id, {
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
        
    def setup_graph(self) -> None:
        """Set up the LangGraph for message processing."""
        try:
            # memory = MemorySaver()
            # Initialize LLM
            llm = ChatGroq(
                model=os.environ.get("LLM_MODEL"), 
                temperature=os.environ.get("LLM_TEMPERATURE"), 
                max_tokens=os.environ.get("LLM_MAX_TOKENS"), 
                max_retries=3
            )
            
            tools = [self.create_message, self.reply_thread]
            
            # Define chatbot function with better tool routing
            def chatbot(state: State): 
                # use LLM to decide
                llm_with_tools = llm.bind_tools(tools)
                result = llm_with_tools.invoke(state["messages"])
                return {"messages": [result]}
            
            # Build graph
            graph_builder = StateGraph(State)
            graph_builder.add_node("chatbot", chatbot)

            # Add tool node
            tool_node = ToolNode(tools)
            graph_builder.add_node("tools", tool_node)

            # Set up proper conditional edges
            graph_builder.add_conditional_edges(
                "chatbot",
                tools_condition,
            )

            graph_builder.add_edge(START, "chatbot")
            graph_builder.add_edge("tools", "chatbot")

            # Compile the graph
            self.graph = graph_builder.compile()
            
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
                
            # config_data = {
            #     "configurable": {
            #         "thread_id": self.member_id # thread_id is an expected value, her it is not the email thread id, its just the name of the parameter
            #         # "member_id": self.member_id
            #     }
            # }
                
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
                # config_data,
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
        Run the email automation workflow for all members of a job.
        
        This method:
        1. Validates auth tokens
        2. Gets all members for the job
        3. Processes each member's email thread
        
        return:
            Dict with status and results information
        """
        try:
            # The first step will be to check if the job_id exists in the db, if it does not, return a message saying the job does not exist & delete the schedule
            if not db.get_job_details(self.job_id):
                util.delete_schedule(self.job_id)
                return {
                    "status": "no_action",
                    "message": "Job does not exist. Functionality to delete schedule will be added in the future."
                }
            # Validate authentication tokens
            auth_service.validate_token(self.job_id)
            
            # Get all members for this job
            members = db.get_job_members(self.job_id)
            
            if not members:
                return {
                    "status": "no_action",
                    "message": "No members found for this job"
                }
            print("members count", len(members))
            results = []
            for member in members:
                try:
                    # Set current member for tools to use
                    self.member_id = member['id']
                    
                    # Reset graph for each member
                    self.setup_graph()
                    

                    # Check for new emails from this member
                    email_result = email_service.check_for_new_emails(
                        job_id=self.job_id,
                        member_id=member['id'],
                        member_email=member['name_email']['email']
                    )

                    # Check if the member has not received an initial message from the user/agent
                    if email_result["status"] == "no initial message":
                        print("no initial message, sending initial message")

                        # Directly call the start_message function to send the default initial message
                        start_message_result = self.start_message()
                        print("start_message_result: ", start_message_result)

                        results.append({
                            "member_id": member['id'],
                            "email": member['name_email']['email'],
                            "status": "success",
                            "message": "Sent the default initial message"
                                })
                    
                    elif email_result["status"] == "new_message":
                        # Generate a response and Send the reply
                        user_input = "User: Please perform these steps in order: 1. Create one message 2. Send one reply 3. END"
                        self.stream_graph_updates(user_input)

                        results.append({
                            "member_id": member['id'],
                            "email": member['name_email']['email'],
                            "status": "success",
                            "message": "Found new email and sent response",
                            "email_data": email_result.get("email_data")
                                })
                    else:
                        results.append({
                            "member_id": member['id'],
                            "email": member['name_email']['email'],
                            "status": "no_action",
                            "message": email_result.get("message", "No new message, so no action taken")
                        })
                        
                except Exception as e:
                    results.append({
                        "member_id": member['id'],
                        "email": member['name_email']['email'],
                        "status": "error",
                        "message": f"Error processing member: {str(e)}"
                    })
                    continue  # Continue with next member even if one fails
            
            # Summarize results
            success_count = sum(1 for r in results if r["status"] == "success")
            error_count = sum(1 for r in results if r["status"] == "error")
            no_action_count = sum(1 for r in results if r["status"] == "no_action")
            
            return {
                "status": "completed",
                "summary": {
                    "total_members": len(members),
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