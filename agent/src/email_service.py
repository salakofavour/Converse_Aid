import base64
import os
import requests
from email.message import EmailMessage
from typing import Dict, Any, Optional, List, Union
from src.utils import retry_with_backoff
from src.database import db
from src.auth import auth_service
import resend
import sys
from src.utils import util

class EmailService:
    """
    Handles email operations using the Gmail API.
    
    This class provides methods for searching, reading, and sending emails.
    """
    
    
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
            print("token_info: ", token_info)
            
            # Set up request headers
            headers = {
                "Authorization": f"Bearer {token_info['access_token']}",
                "Accept": "application/json"
            }
            
            # Make the API request
            url = f"{os.environ.get("GMAIL_URL")}me/threads/{thread_id}"
            thread_response = requests.get(url, headers=headers)
            print("thread_response: ", thread_response)
            
            if thread_response.status_code != 200:
                raise ConnectionError(f"Gmail API thread fetch failed: {thread_response.status_code}")
            
            thread = thread_response.json()
            
            return thread
        except Exception as e:
            raise

    @retry_with_backoff()
    def get_message(self, job_id: str, gmail_id: str) -> Dict[str, Any]:
        """
        Get a specific message by its ID and process it.
        
        Args:
            job_id: Job ID to get authentication info
            message_id: Gmail message ID to retrieve
            
        return:
            Processed message dictionary containing subject, body, message_id, etc.
            
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
            url = f"{os.environ.get("GMAIL_URL")}me/messages/{gmail_id}"
            message_response = requests.get(url, headers=headers)
            
            if message_response.status_code != 200:
                raise ConnectionError(f"Gmail API message fetch failed: {message_response.status_code}")
            
            # Get the raw message
            message = message_response.json()
            
            # Process the message using existing extract_message_data method
            processed_message = self.extract_message_data(message)
            
            return processed_message
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
            message_id = next((header['value'] for header in headers if header['name'] == 'Message-Id'), "")
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
    def send_first_message(self, job_id: str, applicant: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a default message to start the email thread.
        
        Args:
            job_id: Job ID
            applicant: The details of the applicant
            
        return:
            API response dictionary
            
        Raises:
            ConnectionError: If Gmail API request fails
        """
        try:
            # Get valid access token
            token_info = auth_service.validate_token(job_id)

            print("token_info: ", token_info)
            
            # Set up request headers
            headers = {
                "Authorization": f"Bearer {token_info['access_token']}",
                "Content-Type": "application/json"
            }


            #Get email components , and personalize it
            job_details = db.get_job_details(job_id)
            
            subject = job_details.get('subject', 'Subject')
            message = job_details.get('default_message', '')
            applicant_name = applicant["name_email"]["name"]
            body = message.replace('{{applicant_name}}', applicant_name)

            To = applicant["name_email"]["email"]
            From = job_details.get('Job_email')
            
            # Create email message
            message = EmailMessage()
            message.set_content(body)
            message["To"] = To
            message["From"] = From
            message["Subject"] = subject
            
            
            # Encode message
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            email_data = {
                "raw": raw
            }
            
            # Send the message
            url = f"{os.environ.get("GMAIL_URL")}me/messages/send"
            response = requests.post(url, headers=headers, json=email_data)

            #check if the send limit has been reached, send user a notification email & exit if so
            send_limit_response = util.check_send_limit(response)
            if send_limit_response.get("isExceeded"):
                self.send_user_notification_email(isJob=True, job_id=job_id, message=send_limit_response.get("message"))
                sys.exit(0);

            print("send reply response: ", response)

            if response.status_code != 200:
                print(f"Error response body: {response.text}")
                raise ConnectionError(f"Failed to send email: {response.status_code}")
            
            
            return response.json()
            
        except Exception as e:
            raise

    @retry_with_backoff()
    def send_reply(self, job_id: str, applicant_id: str, reply_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a reply to an email thread.
        
        Args:
            job_id: Job ID
            applicant_id: The ID of the applicant
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
            message["To"] = reply_params.get('to')  # Should be applicant's email
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
            url = f"{os.environ.get("GMAIL_URL")}me/messages/send"
            response = requests.post(url, headers=headers, json=email_data)

            #check if the send limit has been reached, send user a notification email & exit if so
            send_limit_response = util.check_send_limit(response)
            if send_limit_response.get("isExceeded"):
                self.send_user_notification_email(isJob=True, job_id=job_id, message=send_limit_response.get("message"))
                sys.exit(0);
            
            print("send reply response: ", response)

            if response.status_code != 200:
                print(f"Error response body: {response.text}")
                raise ConnectionError(f"Failed to send email: {response.status_code}")
            
            
            return response.json()
            
        except Exception as e:
            raise
    
    def check_for_new_emails(self, job_id: str, applicant_id: str, applicant_email: str) -> Dict[str, Any]:
        """
        Check for new emails from a specific applicant.
        
        Args:
            job_id: Job ID (needed for auth)
            applicant_id: The ID of the applicant
            applicant_email: The email address of the applicant
            
        return:
            Dict with status and message data if found
            
        Raises:
            Various exceptions based on operations
        """
        try:
            # Get applicant details for context
            applicant = db.get_applicant_details(applicant_id)
            
            # # Build search query for this specific applicant
            # subject = f"subject:{applicant.get('subject', '')}"
            # from_email = f"from:{applicant_email}"
            # search_query = f"{subject} {from_email}" #  eventually I wiill use this implementation along with the start date
            # # search_query = f"subject:Newest Test {from_email}" #previously partly haedcoded
            # # Search for matching emails
            # messages = self.search_emails(job_id, search_query)
            
            # if not messages:
            #     return {"status": "no_emails", "message": f"No emails found from {applicant_email}"}
            
            # # Get the latest message's thread
            # latest_message = messages[0]
            # thread_id = latest_message.get("threadId")

            # #repeatation is below, also need to recheck the importance of overall check. dont need overalll_message_id or this check
            # #the check is dumb because it checks if the thread is the same as what we processed before
            
            # # Check if this is the same thread we've processed before
            # if applicant.get("thread_id") == thread_id and applicant.get("overall_message_id") == latest_message.get("id"):
            #     return {
            #         "status": "no_new_messages", 
            #         "message": "No new messages in the thread since last check"
            #     }
            thread_id = applicant.get("thread_id")
            if not thread_id:
                # raise ValueError("Thread ID not found in applicant record, ensure the user has sent at least one email to the applicant")
                print("Thread ID not found in applicant record, we will send the initial message")
                return {
                "status": "no initial message",
                "message": "No initial message sent to the applicant"
                }
            # Get the full thread
            thread = self.get_thread(job_id, thread_id)
            
            # Get the last message in the thread
            last_message = self.get_last_message(thread)


            # Extract the last message's data
            message_data = self.extract_message_data(last_message)

            # Check if we've already processed this message(or it's from the user/agent. We only want to proceed with processing messages from the applicants)
            if applicant.get("message_id") == message_data.get("message_id"):
                return {
                    "status": "no_new_messages", 
                    "message": "No new messages in the thread since last check"
                }
            
            
            # Update email details in applicant record ->  this is just to supply the body of the applicants response 
            # to the vector search, it annoys me a bit i need to call a db operation just for one variable
            #but that is how needed it is for now. I wont update the body after a reply, as that is not needed
            # I only need the body from an applicants reply
            email_details = {
                "body": message_data["body"]
            }
            
            db.update_applicant_details(applicant_id, email_details)
            
            return {
                "status": "new_message",
                "message": "Found new message",
                "email_data": message_data
            }
            
        except Exception as e:
            raise

    @retry_with_backoff() #implementation to send user a notification email I cannot use the email from here to send important/error email. like the refresh_token error, if that is wrong the email sending will also be wrong so wont send
    #of cousrse i can, the refresh_token and all that is when i want to use the user's email to perform actions. In this I am using the business's email to send emails
    def send_user_notification_email(self, message: str, applicant_id: str="", job_id: str="", isJob: bool=False) -> Dict[str, Any]:
        """
        Send a notification email to the user.
        
        Args:
            message: The message to send to the user
            applicant_id: The ID of the applicant
            job_id: The ID of the job
            isJob: Whether the message is a job message
        return:
            API response dictionary
            
        Raises:
            ConnectionError: If Resend request fails
        """
        try:
            applicant_details = db.get_applicant_details(applicant_id)
            job_details = db.get_job_details(job_id)

            if isJob:
                email_message = message
            else:
                email_message = message.format(applicant_email=applicant_details["name_email"]["email"], subject_title=applicant_details["subject"])

            subject = "Urgent Message from Converse",
            body = email_message

            To = job_details["email"]
            From = os.environ.get("EMAIL_FROM")
            
            # Create email message
            message = EmailMessage()
            message.set_content(body)
            message["To"] = To
            message["From"] = From
            message["Subject"] = subject

            resend.api_key = os.environ.get("RESEND_API_KEY")
            params: resend.Emails.SendParams = {
                "from": From,
                "to": [To],
                "subject": subject,
                "html": "<h2>Dear User, </h2>" + "<p>" + body + "</p>",
            }
            response = resend.Emails.send(params)
            print("send reply response: ", response)

            if response.status_code != 200:
                print(f"Error response body: {response.text}")
                raise ConnectionError(f"Failed to send email: {response.status_code}")
            
            
            return response.json()
            
        except Exception as e:
            raise

# Create a singleton instance
email_service = EmailService()