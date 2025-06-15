import os
import time
import asyncio
from typing import Dict, Any, Optional, List, Annotated
from langchain_core.prompts import PromptTemplate
from langchain_cohere import ChatCohere
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
from dotenv import load_dotenv

load_dotenv()



class State(TypedDict):
    """State object used in the graph."""
    email_response: str
    messages: List[Dict[str, Any]]




class EmailAutomationApp:
    """
    Main application class for email automation.
    
    This class orchestrates all components and implements the email workflow.
    """
    
    def __init__(self, job_id: Optional[str] = None):
        """
        Initialize the email automation application.
        
        Args:
            job_id: The job ID to process (compulsory)
        """
        # Set up the job ID
        self.job_id = job_id
        self.member_id = None  # Will be set during processing of each member
        

        self.graph = None  # graph will be set up for each member in run()
    
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
                # print("message_data from recently sent message: ", message_data)

                db.update_member_details(self.member_id, {
                    "message_id": message_data.get("message_id"),
                    "thread_id": message_data.get("threadId"),
                    "subject": message_data.get("subject")
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
            llm = ChatCohere(
                model=os.environ.get("LLM_MODEL"), 
                temperature=os.environ.get("LLM_TEMPERATURE"), 
                # max_tokens=os.environ.get("LLM_MAX_TOKENS"), 
                max_retries=3
            )

            # Get member details
            member = db.get_member_details(self.member_id)
            #get job details
            job = db.get_job_details(self.job_id)
            
            # Search for relevant information using the last email's body
            email_body = member.get("body", "")
            # print("email_body: ", email_body)
            receiver = f"Hi {member['name_email']['name']},"
            last_message = email_body.split(receiver)[0]
            print("email_body: ", email_body)
            print("last_message: ", last_message)

            email_context_prompt = PromptTemplate.from_template(
                """Act as a helpful assistant.

                Instructions:
                - The "conversation-thread" is the memory of the discussion. Understand the discussion in "conversation-thread" and then extract the context of "last_message" as it relates to the discussion.
                - if the extracted context is only a greeting or gratitude, create a sentence with the extracted context and return a friendly greeting or gratitude that always starts with "Thank you"and ask how you can help as needed.
                - else if the extracted context is not a greeting or gratitude, return a sentence that is made with the extracted context.
                - Note that the sentence will be used in a semantic search
                "conversation-thread": {email_history}\n
                "last_message": {last_message}
                   """
            )
            email_context = llm.invoke(email_context_prompt.invoke({"email_history": email_body, "last_message": last_message}))

            #if email_context is a salutation return response
            if email_context.content.startswith("Thank you"):
                response = email_context.content
            else:
                print("email_context: ", email_context)
                search_results = vector_search.search_with_text(self.job_id, email_context.content)
 
                # print("did the vector search", search_results)
                # Create a prompt with the context
                if search_results["has_relevant_matches"]:
                    context = search_results["context"]
                else:
                    response = "Your question is not related to this conversation. Please refrain from asking questions that are not related to this conversation."
                    #send a notification email to the user informing the user that an member has asked a question not in KnowledgeBase
                    
                    message = f"member - {member['name_email']['name']} asked a question that is either not related to the job - {job['title']} or not in the KnowledgeBase. We continued the conversation but you can check your email with {member['name_email']['email']} and subject - {member['subject']} to see the question. It is the message before the member is informed not to ask questions that are not related to the job in question."
                    email_service.send_user_notification_email(message, self.member_id, self.job_id)
                    return{
                    "email_response": response,
                    "messages": state.get("messages", []) +[{
                    "role": "assistant"
                }]
                    }
                

                # Generate response using template
                
                prompt = PromptTemplate.from_template(
                    """Act as a professional and friendly email assistant. I need you to create an email response body to an email using only the information provided in "Context" to create coherent sentences. Do not use any external tools or information to answer questions.

                    Instructions:
                    - Use the "Conversation_History" only to match the tone and flow of the conversation, not for factual content.
                    - Using "Email_context", write a clear, concise reply (1-3 short paragraphs separated by new lines) strictly based in "Context".
                    - Never apologize in your response.
                    - Never include salutation in your response.
                    - Never include a closing in your response.
                    - Always return the response in plain text format & text size 14.
                                
                        
                    "Context": {context}\n
                    "Email_context": {email_context}\n
                    "Conversation_History": {email_history}"""

                )
                #context is the result of the similarity search against the knowledge base
                full_prompt = prompt.invoke({"context": context, "email_context": email_context, "email_history": email_body})
                
                print("full_prompt: ", full_prompt)

                result = llm.invoke(full_prompt.text)
                response = result.content
            

            # Update email response in state
            state["email_response"] = response
            print("got here in create_message, finished create message")
            return{
                "email_response": response,
                "messages": state.get("messages", []) +[{
                "role": "assistant"
            }]
                }
            
        except Exception as e:
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

            #get email response kept in state gotten from create_message & create new message
            plain_message = f"""Hi {member['name_email']['name'] or member['name_email']['email']}, \n\n 
            {state['email_response']} \n\n 
            This message was sent with Converse-Aid. Reply to this message to continue conversation.</h6>""" #here i will figure out how to add footers.
            
            html_message = f"""
            Hi {member['name_email']['name'] or member['name_email']['email']},\n
            <p>{state['email_response']}</p>\n
            <p style='text-align: center; font-size: 11px;'>This message was sent with <a href='www.google.com'>Converse-Aid</a>. Reply to this message to continue conversation.</p>""" #here i will figure out how to add footers.

            # Prepare reply parameters
            reply_params = {
                "to": member["name_email"]["email"],
                "plain_body": plain_message,
                "html_body": html_message,
                "thread_id": member["thread_id"],
                "subject": f"Re: {member['subject']}" if not member['subject'].startswith("Re:") else member['subject'],
                "message_id": member["message_id"],
                "references": member["reference_id"]
            }
            
            # Send the reply
            response = email_service.send_reply(self.job_id, self.member_id, reply_params)
            print("response from send_reply: ", response)
            
            if response: 
                #update member details with the new message_id, thread_id and overall_message_id of the just sent email
                message_data = email_service.get_message(self.job_id, response.get("id"))
                # print("message_data from recently sent message: ", message_data)

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
            # Initialize LLM
            llm = ChatCohere(
                model=os.environ.get("LLM_MODEL"), 
                temperature=os.environ.get("LLM_TEMPERATURE"), 
                # max_tokens=os.environ.get("LLM_MAX_TOKENS"), 
                max_retries=3
            )
            

            # Build graph
            graph_builder = StateGraph(State)


            graph_builder.add_node("create_message", self.create_message)
            graph_builder.add_node("reply_thread", self.reply_thread)


            # graph_builder.add_edge(START, "chatbot")
            graph_builder.add_edge(START, "create_message")
            graph_builder.add_edge("create_message", "reply_thread")
            graph_builder.add_edge("reply_thread", END)

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
                 
            # Initialize state with the user message
            initial_state = {
                "email_body_prompt": "",
                "messages": [{"role": "user", "content": user_input}]
            }
            

            event = self.graph.invoke(
                initial_state,
            )
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
            job = db.get_job_details(self.job_id)
            #I am not combining the similar logic of util.delete_scheduler below because if job is not found, user will still try to check first & that will result in error

            if not job or job["status"].lower() == "closed":
                util.delete_schedule(self.job_id)
                return {
                    "status": "Job Agent deleted",
                    "message": "Job does not exist in database or is closed or user is not subscribed. So, Job Agent schedule has also been deleted."
                }
            
            user_id = db.get_user_id(self.job_id)
            is_subscribed = db.is_subscribed(user_id)

            if not is_subscribed:
                util.delete_schedule(self.job_id)
                return {
                    "status": "Job Agent deleted",
                    "message": "user is not subscribed. So, Job Agent schedule has also been deleted."
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
                        # print("start_message_result: ", start_message_result)

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