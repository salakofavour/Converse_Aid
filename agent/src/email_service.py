import base64
import json
import requests
from email.message import EmailMessage
from typing import Dict, Any, Optional, List, Union
from src.utils import retry_with_backoff
from src.database import db
from src.auth import auth_service
import src.config as config

class EmailService:
    """
    Handles email operations using the Gmail API.
    
    This class provides methods for searching, reading, and sending emails.
    """
    
    @retry_with_backoff()
    def search_emails(self, job_id: str, search_query: str) -> List[Dict[str, Any]]:
        """
        Search for emails matching a query.
        
        Args:
            job_id: Job ID to get authentication info
            search_query: Gmail search query string
            
        return:
            List of matching message dictionaries
            
        Raises:
            ConnectionError: If Gmail API request fails
        """
        try:
            # Get valid access token
            token_info = auth_service.validate_token(job_id)
            
            # Set up request headers
            headers = {
                "Authorization": f"Bearer {token_info['access_token']}"
            }
            
            # Make the API request
            url = f"{config.GMAIL_URL}me/messages?q={search_query}"
            result = requests.get(url, headers=headers)
            
            if result.status_code != 200:
                raise ConnectionError(f"Gmail API search failed: {result.status_code}")
            
            # Parse results
            messages = result.json().get('messages', [])
            
            return messages
        except Exception as e:
            raise
    
    @retry_with_backoff()
    def get_thread(self, job_id: str, thread_id: str) -> Dict[str, Any]:
        """
        Get all messages in a thread.
        
        Args:
            job_id: Job ID to get authentication info
            thread_id: Thread ID to retrieve
            
        return:
            Thread dictionary with messages
            
        Raises:
            ConnectionError: If Gmail API request fails
        """
        try:
            # Get valid access token
            token_info = auth_service.validate_token(job_id)
            
            # Set up request headers
            headers = {
                "Authorization": f"Bearer {token_info['access_token']}"
            }
            
            # Make the API request
            url = f"{config.GMAIL_URL}me/threads/{thread_id}"
            thread_response = requests.get(url, headers=headers)
            
            if thread_response.status_code != 200:
                raise ConnectionError(f"Gmail API thread fetch failed: {thread_response.status_code}")
            
            thread = thread_response.json()
            
            return thread
        except Exception as e:
            raise
    
    def get_last_message(self, thread: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract the last message from a thread.
        
        Args:
            thread: Thread dictionary
            
        return:
            Last message dictionary
            
        Raises:
            ValueError: If thread has no messages
        """
        try:
            messages = thread.get('messages', [])
            
            if not messages:
                raise ValueError("Thread contains no messages")
            
            last_message = messages[-1]
            
            return last_message
        except Exception as e:
            raise
    
    def extract_message_data(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant data from a message.
        
        Args:
            message: Message dictionary
            
        return:
            Dict with subject, body, message_id, id, threadId and references
            
        Raises:
            ValueError: If message is malformed
        """
        try:
            # Extract message details
            payload = message['payload']
            headers = payload['headers']
            
            # Extract headers
            subject = next((header['value'] for header in headers if header['name'] == 'Subject'), "")
            message_id = next((header['value'] for header in headers if header['name'] == 'Message-ID'), "")
            references = next((header['value'] for header in headers if header['name'] == 'References'), "")
            
            # Get body - handle different message structures
            if 'parts' in payload:
                encoded_body = payload['parts'][0]['body']['data']
            else:
                encoded_body = payload['body']['data']
            
            body = base64.urlsafe_b64decode(encoded_body).decode("utf-8")
            
            return {
                "subject": subject,
                "body": body,
                "message_id": message_id,
                "references": references,
                "id": message['id'],
                "threadId": message['threadId']
            }
        except Exception as e:
            raise
    
    @retry_with_backoff()
    def send_reply(self, job_id: str, reply_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a reply to an email thread.
        
        Args:
            job_id: Job ID
            reply_params: Dict with reply parameters (to, body, thread_id, etc.)
            
        return:
            API response dictionary
            
        Raises:
            ConnectionError: If Gmail API request fails
        """
        try:
            # Get valid access token
            token_info = auth_service.validate_token(job_id)
            
            # Set up request headers
            headers = {
                "Authorization": f"Bearer {token_info['access_token']}",
                "Content-Type": "application/json"
            }
            
            # Create email message
            message = EmailMessage()
            message.set_content(reply_params.get('body', ''))
            message["To"] = reply_params.get('to', config.DEFAULT_RECEIVER)
            message["From"] = reply_params.get('from', token_info['job_email'])
            message["Subject"] = reply_params.get('subject', '')
            
            # Add message threading headers
            if reply_params.get('references'):
                message["References"] = f"{reply_params['references']} {reply_params['message_id']}"
            else:
                message["References"] = reply_params['message_id']
                
            message["In-Reply-To"] = reply_params['message_id']
            
            # Encode message
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            email_data = {
                "raw": raw, 
                "threadId": reply_params['thread_id']
            }
            
            # Send the message
            url = f"{config.GMAIL_URL}me/messages/send"
            response = requests.post(url, headers=headers, json=email_data)
            print("reply response: ", response)

            if response.status_code != 200:
                print(f"Error response body: {response.text}")
                raise ConnectionError(f"Failed to send email: {response.status_code}")
            
            return response.json()
            
        except Exception as e:
            raise
    
    def check_for_new_emails(self, job_id: str, search_query: Optional[str] = None) -> Dict[str, Any]:
        """
        Check for new emails and process them if found.
        
        Args:
            job_id: Job ID
            search_query: Custom search query (optional)
            
        return:
            Dict with status and message data if found
            
        Raises:
            Various exceptions based on operations
        """
        try:
            # Get job details for context
            job_details = db.get_job_details(job_id)
            
            # If no search query provided, use default or from job
            if not search_query:
                #the below commented out is the search query we are going for later but for now, we wait.
                # subject = f"subject:{job_details.get('subject', "")}"
                # from_email = f"from:{job_details.get('Job_email', "")}"
                # to_email = f"to:{config.DEFAULT_RECEIVER}"
                # start_date = f"after:{job_details.get('flow_start_date', "")}"
                # search_query = f"{subject} {from_email} {to_email} {start_date}"
                search_query = job_details.get('search_query', "subject:Trial to see how this goes")
            
            # Search for matching emails
            messages = self.search_emails(job_id, search_query)
            
            if not messages:
                return {"status": "no_emails", "message": "No emails found matching the query"}
            
            # Get the latest message's thread
            latest_message = messages[0]
            thread_id = latest_message.get("threadId")
            
            # Check if this is the same thread we've processed before
            if job_details.get("thread_id") == thread_id and job_details.get("overall_message_id") == latest_message.get("id"):
                return {
                    "status": "no_new_messages", 
                    "message": "No new messages in the thread since last check"
                }
            
            # Get the full thread
            thread = self.get_thread(job_id, thread_id)
            
            # Get the last message in the thread
            last_message = self.get_last_message(thread)
            
            # Check if we've already processed this message
            if job_details.get("thread_id") == thread_id and job_details.get("overall_message_id") == last_message.get("id"):
                return {
                    "status": "no_new_messages", 
                    "message": "No new messages in the thread since last check"
                }
            
            # Extract the message data
            message_data = self.extract_message_data(last_message)
            
            # Update email details in database
            email_details = {
                "thread_id": thread_id,
                "overall_message_id": last_message.get("id"),
                "subject": message_data["subject"],
                "body": message_data["body"],
                "message_id": message_data["message_id"],
                "references": message_data["references"]
            }
            
            db.update_email_details(job_id, email_details)
            
            return {
                "status": "new_message",
                "message": "Found new message",
                "email_data": message_data
            }
            
        except Exception as e:
            return {"status": "error", "message": f"Error checking for new emails: {str(e)}"}

# Create a singleton instance
email_service = EmailService() 