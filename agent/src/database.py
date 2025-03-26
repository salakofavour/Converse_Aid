import os
import json
from typing import Dict, Any, Optional, Union, List
from supabase import create_client, Client
from src.utils import retry_with_backoff
import src.config as config

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
            if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_KEY"):
                raise ValueError("Missing Supabase credentials in environment variables")
                
            self.client = create_client(
                os.environ.get("SUPABASE_URL"), 
                os.environ.get("SUPABASE_KEY")
            )
        except Exception as e:
            raise ConnectionError(f"Could not connect to Supabase: {str(e)}")
    
    @retry_with_backoff()
    def get_job_details(self, job_id: str) -> Dict[str, Any]:
        """
        Get details for a specific job.
        
        Args:
            job_id: The UUID of the job
            
        return:
            Dict containing job details
            
        Raises:
            ValueError: If job not found
        """
        try:
            query = (self.client.table("jobs")
                    .select("*")
                    .eq("id", job_id)
                    .execute()
                    )
            
            if not query.data:
                raise ValueError(f"No job found with id: {job_id}")
            
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
            
            if not access_token or not refresh_token:
                raise ValueError(f"Missing tokens for email: {email}")
            
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
            
            # Step 3: Update the entire sender array
            update_result = (self.client.table('profiles')
                    .update({"sender": sender_array})
                    .eq("id", user_id)
                    .execute())
            
            return True
        except Exception as e:
            raise
    
    @retry_with_backoff()
    def update_email_details(self, job_id: str, email_details: Dict[str, Any]) -> bool:
        """
        Update email details in the jobs table.
        
        Args:
            job_id: Job ID
            email_details: Dict containing thread_id, message_id, etc.
            
        return:
            Boolean indicating success
            
        Raises:
            ValueError: If update fails
        """
        try:
            response = (self.client.table('jobs')
                    .update(email_details)
                    .eq("id", job_id)
                    .execute())
                    
            return True
        except Exception as e:
            raise
    
    @retry_with_backoff()
    def update_response(self, job_id: str, response: str) -> bool:
        """
        Update response column in the jobs table.
        
        Args:
            job_id: Job ID
            response: A string which contains a message.
            
        return:
            Boolean indicating success
            
        Raises:
            ValueError: If update fails
        """
        try:
            response = (self.client.table('jobs')
                    .update({"response": response})
                    .eq("id", job_id)
                    .execute())
                    
            return True
        except Exception as e:
            raise

# Create a singleton instance
db = DatabaseService() 