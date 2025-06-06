import os
import json
from typing import Dict, Any, Optional, Union, List
from supabase import create_client, Client
from src.utils import retry_with_backoff
# from dotenv import load_dotenv
import src.config as config
# load_dotenv()

class DatabaseService:
    """
    Handles all interactions with the Supabase database.
    
    This class provides a clean interface for database operations,
    abstracting away the details of the Supabase API.
    """
    
    def __init__(self):
        """Initialize the database service."""
        self.client = None
        self.connect()
    
    def connect(self) -> None:
        """
        Connect to the Supabase database.
        
        Raises:
            ConnectionError: If unable to connect to Supabase
        """
        try:
            # Ensure we have necessary environment variables
            if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
                raise ValueError("Missing Supabase credentials in environment variables")
                
            self.client = create_client(
                os.environ.get("SUPABASE_URL"),
                os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            )
        except Exception as e:
            raise ConnectionError(f"Could not connect to Supabase: {str(e)}")
    
    @retry_with_backoff()#check jobs
    def get_job_details(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get details for a specific job.
        
        Args:
            job_id: The UUID of the job
            
        return:
            Dict containing job details or None if not found
        """
        try:
            query = (self.client.table("jobs")
                    .select("*")
                    .eq("id", job_id)
                    .execute()
                    )
            
            if not query.data:
                return None
            
            return query.data[0]
        except Exception as e:
            raise
    
    @retry_with_backoff()
    def get_user_tokens(self, user_id: str, email: str) -> Dict[str, Any]:
        """
        Get authentication tokens for a specific user and email.
        
        Args:
            user_id: User ID
            email: Email address associated with the tokens
            
        return:
            Dict containing access_token, refresh_token, and access_expires_in
            
        Raises:
            ValueError: If user or tokens not found
        """
        try:
            tokens_query = (self.client.table('profiles')
                    .select("sender")
                    .eq("id", user_id)
                    .execute()
                    )
                    
            if not tokens_query.data:
                raise ValueError(f"No tokens found for user_id: {user_id}")
            
            values = tokens_query.data[0]['sender']
            
            # Extract tokens for the specific email
            access_token = next((value.get('access_token') for value in values 
                                if value.get('email') == email), None)
            refresh_token = next((value.get('refresh_token') for value in values 
                                if value.get('email') == email), None)
            access_expires_in = next((value.get('access_expires_in') for value in values 
                                    if value.get('email') == email), None)
            
            if not refresh_token:
                raise ValueError(f"Missing refresh tokens for email: {email}")
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "access_expires_in": access_expires_in
            }
        except Exception as e:
            raise
    
    @retry_with_backoff()
    def update_access_token(self, user_id: str, email: str, access_token: str, 
                          access_expires_in: int) -> bool:
        """
        Update the access token and expiration time for a specific email in the sender array.
        If the email doesn't exist in the array, a new entry will be added.
        
        Args:
            user_id: User ID
            email: Email address to match in the sender array
            access_token: New access token
            access_expires_in: Expiration timestamp
            
        return:
            Boolean indicating success
            
        Raises:
            ValueError: If update fails
        """
        try:
            # Step 1: Fetch current sender array
            query = (self.client.table('profiles')
                    .select("sender")
                    .eq("id", user_id)
                    .execute())
            
            if not query.data or len(query.data) == 0:
                raise ValueError(f"No profile found for user_id: {user_id}")
            
            # Get the current sender array
            sender_array = query.data[0].get('sender', [])
            if sender_array is None:
                sender_array = []
            
            # Step 2: Find and update the object matching the email
            email_found = False
            for i, sender_obj in enumerate(sender_array):
                if sender_obj.get('email') == email:
                    # Update this object
                    sender_array[i]['access_token'] = access_token
                    sender_array[i]['access_expires_in'] = access_expires_in
                    email_found = True
                    break
            
            #i dont fully understand the below implementation, i thought it was not neccessary,
            # but the authentication to gmail is invalid without it, i believe the access_token is
            # not updating properly withouth the below
            # If email not found, add a new entry instead of raising an error
            if not email_found:
                print(f"Email {email} not found in sender array. Adding new entry.")
                sender_array.append({
                    'email': email,
                    'access_token': access_token,
                    'access_expires_in': access_expires_in,
                    # Include a placeholder refresh_token to prevent errors in get_user_tokens
                    'refresh_token': 'placeholder_refresh_token'
                })
                raise ValueError(f"Email {email} not found in sender array. User must have removed from settings after creating Job. Inform them to add it back or end the Job.")
            
            # Step 3: Update the entire sender array
            update_result = (self.client.table('profiles')
                    .update({"sender": sender_array})
                    .eq("id", user_id)
                    .execute())
            
            return True
        except Exception as e:
            raise

    
    @retry_with_backoff()
    def get_user_id(self, job_id: str) -> Optional[str]:
        """
        Get the user_id for a specific job.
        
        Args:
            job_id: Job ID
            
        return:
            user_id: The user_id for the job or None if not found
        """
        try:
            response = (self.client.table('jobs')
                    .select("user_id")
                    .eq("id", job_id)
                    .execute())
            if not response.data:
                return None
            return response.data[0]['user_id']
        except Exception as e:
            raise

    @retry_with_backoff()
    def is_subscribed(self, user_id: str) -> Optional[bool]:
        """
        Get the subscription status for a specific user (really the job. if the user s unsubscribed, the job should not run).
        
        Args:
            user_id: User ID
            
        return:
            subscription_status: The subscription status for the job or None if not found
        """
        try:
            response = (self.client.table('subscriptions')
                    .select("status")
                    .eq("user_id", user_id)
                    .execute())
                    
            if not response.data:
                return None
                
            return response.data[0]['status'].lower() == 'trialing' or response.data[0]['status'].lower() == 'active'
        except Exception as e:
            raise

    @retry_with_backoff()
    def get_job_members(self, job_id: str) -> List[Dict[str, Any]]:
        """
        Get all members for a specific job.
        
        Args:
            job_id: The UUID of the job
            
        Returns:
            List of member records
            
        Raises:
            ValueError: If query fails
        """
        try:
            query = (self.client.table('members')
                    .select('id, name_email, thread_id, message_id, body, response, '
                           'overall_message_id, subject, reference_id')
                    .eq('job_id', job_id)
                    .execute())
            
            return query.data
        except Exception as e:
            raise

    @retry_with_backoff()
    def get_member_details(self, member_id: str) -> Dict[str, Any]:
        """
        Get details for a specific member.
        
        Args:
            member_id: The UUID of the member
            
        Returns:
            Dict containing member details
            
        Raises:
            ValueError: If member not found
        """
        try:
            query = (self.client.table('members')
                    .select('*')
                    .eq('id', member_id)
                    .execute())
            
            if not query.data:
                raise ValueError(f"No member found with id: {member_id}")
            
            return query.data[0]
        except Exception as e:
            raise

    # @retry_with_backoff()
    # def update_member_response(self, member_id: str, response: str) -> bool:
    #     """
    #     Update the response field for an member.
        
    #     Args:
    #         member_id: The UUID of the member
    #         response: The response text
            
    #     Returns:
    #         Boolean indicating success
            
    #     Raises:
    #         ValueError: If update fails
    #     """
    #     try:
    #         response = (self.client.table('members')
    #                 .update({"response": response})
    #                 .eq('id', member_id)
    #                 .execute())
            
    #         return True
    #     except Exception as e:
    #         raise

    @retry_with_backoff()
    def update_member_details(self, member_id: str, details: Dict[str, Any]) -> bool:
        """
        Update various details for an member.
        
        Args:
            member_id: The UUID of the member
            details: Dict containing fields to update
            
        Returns:
            Boolean indicating success
            
        Raises:
            ValueError: If update fails
        """
        try:
            # Filter valid fields
            valid_fields = [
                "thread_id", 
                "message_id", 
                "overall_message_id", 
                "subject", 
                "reference_id",
                "body"
            ]
            update_data = {
                k: v for k, v in details.items() 
                if k in valid_fields
            }
            print("update_data: ", update_data)
            
            if not update_data:
                raise ValueError("No valid fields to update")
            
            response = (self.client.table('members')
                    .update(update_data)
                    .eq('id', member_id)
                    .execute())
            
            return True
        except Exception as e:
            raise

# Create a singleton instance
db = DatabaseService() 