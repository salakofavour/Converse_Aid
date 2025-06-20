import os
import time
import requests
from typing import Dict, Any, Optional, Union
from src.utils import retry_with_backoff
from src.database import db
import src.config as config


class AuthService:
    """
    Handles authentication with external services.
    
    This class manages token refresh and validation for the Gmail API.
    """
    
    @retry_with_backoff(exceptions=(requests.RequestException, ValueError))
    def refresh_access_token(self, refresh_token: str, user_id: Dict, job_id: str) -> Dict[str, Any]:
        """
        Refreshes an access token using the refresh token.
        
        Args:
            refresh_token: The refresh token
            user_id: Object containing user_id and Job_email from database query
            job_id: The current job ID
        return:
            Dict with new access_token and expiration
            
        Raises:
            ValueError: If refresh token is invalid
            ConnectionError: If token refresh request fails
        """
        try:
            # Extract the email from the user_id object
            if not isinstance(user_id, dict) and not hasattr(user_id, 'data'):
                raise ValueError("user_id must be a database result object with data attribute")
            
            email = user_id.data[0]['Job_email']
            actual_user_id = user_id.data[0]['user_id']
            
            # Validate environment variables
            required_vars = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "TOKEN_URL"]
            for var in required_vars:
                if not os.environ.get(var):
                    raise ValueError(f"Missing required environment variable: {var}")
            
            # Prepare the request payload
            payload = {
                'client_id': os.environ.get("GOOGLE_CLIENT_ID"),
                'client_secret': os.environ.get("GOOGLE_CLIENT_SECRET"),
                'refresh_token': refresh_token,
                'grant_type': 'refresh_token'
            }
            print("refresh token payload: ", refresh_token)
            # Send the request
            token_url = os.environ.get("TOKEN_URL")
            # print("token_url: ", token_url)
            response = requests.post(
                token_url,
                data=payload
            )

            # Check for errors or invalid refresh token
            if response.status_code != 200:
                #check if the error is due to invalid refresh token and send an email to the user to refresh it if so.
                if response.text == "invalid_grant":
                    print("invalid refresh token, informing user")
                    from src.email_service import email_service
                    email_service.send_user_notification_email(isJob=True,job_id=job_id, message=f"Your refresh token has expired. Go to settings & then preference tab and then remove and re-authorize the email - {email} to get a new refresh token. All jobs that currently use it to send emails will not be able to proceed with sending emails till this is done.")
                    
                    raise ValueError(response.text)
                else:
                    print(f"Token refresh failed with status {response.status_code}")
                    print(f"Response body: {response.text}")
                    raise ValueError(f"Invalid refresh token: {response.status_code} - {response.text}")
            
            
            # Parse the response
            response_data = response.json()
            access_token = response_data['access_token']
            expires_in = response_data['expires_in']  # This is in seconds from Google
            current_time = time.time()
            access_expires_in = current_time + expires_in  # Adding seconds to current time

            # Update the database with the new token
            db.update_access_token(actual_user_id, email, access_token, access_expires_in)
            
            return {
                "access_token": access_token,
                "access_expires_in": access_expires_in
            }
            
        except Exception as e:
            raise
    
    def validate_token(self, job_id: str) -> Dict[str, Any]:
        """
        Validates the access token for a job and refreshes if needed.
        
        Args:
            job_id: The job ID
            
        return:
            Dict with access_token and other token info
            
        Raises:
            ValueError: If token validation fails
        """
        try:
            # Get job details
            job_details = db.get_job_details(job_id)
            user_id = job_details['user_id']
            job_email = job_details['Job_email']
            
            # Get token information
            token_info = db.get_user_tokens(user_id, job_email)
            
            # Check if token is valid or needs refreshing
            current_time = time.time()

            
            if (not token_info['access_token'] or 
                not token_info['access_expires_in'] or 
                token_info['access_expires_in'] < current_time):
                
                
                # Refresh the token
                if not token_info['refresh_token']:
                    raise ValueError("Refresh token is missing")
                    
                # Create a mock response object that matches the expected format
                mock_user_data = type('obj', (object,), {
                    'data': [{
                        'user_id': user_id,
                        'Job_email': job_email
                    }]
                })
                    
                new_token_info = self.refresh_access_token(
                    token_info['refresh_token'], 
                    mock_user_data,
                    job_id
                )
                
                # Update the token info with new values
                token_info['access_token'] = new_token_info['access_token']
                token_info['access_expires_in'] = new_token_info['access_expires_in']
            
            return {
                "user_id": user_id,
                "job_email": job_email,
                "access_token": token_info['access_token'],
                "access_expires_in": token_info['access_expires_in']
            }
            
        except Exception as e:
            raise

# Create a singleton instance
auth_service = AuthService() 