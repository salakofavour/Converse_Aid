import time
from functools import wraps
import os
import requests
import json
from typing import Callable, Any, Tuple, Type, Union, List


# Retry mechanism with exponential backoff
# --------------------------------------------------------------
# This decorator provides automatic retries for functions that 
# might fail due to network issues or API rate limits:
# - Retries the function with increasing delays between attempts
# - Raises the final exception after max retries are exhausted
# --------------------------------------------------------------
def retry_with_backoff(
    max_retries: int = 3, 
    backoff_factor: int = 2,
    exceptions: Tuple[Type[Exception], ...] = (requests.RequestException, json.JSONDecodeError)
) -> Callable:
    """
    Decorator that retries the wrapped function when specified exceptions occur.
    
    Args:
        max_retries: Maximum number of retry attempts
        backoff_factor: Exponential backoff multiplier
        exceptions: Tuple of exceptions that should trigger a retry
        
    return:
        Decorator function with retry logic
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            retry_count = 0
            while retry_count < max_retries:
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    retry_count += 1
                    if retry_count == max_retries:
                        raise
                    wait_time = backoff_factor ** retry_count
                    time.sleep(wait_time)
        return wrapper
    return decorator 

class Util:
    """
    Utility class for common functions. class is not necessary as all functions here could be standalone but i like the organization of calling it as one elsewhere
    """


    # def check_job_id_exists(job_id: str) -> bool:
    #     """
    #     Check if a job ID exists in the database.
        
    #     Args:
    #         job_id: Job ID to check
            
    #     Returns:
    #         True if the job ID exists, False otherwise
    #     """
    #     try:
    #         job_details = db.get_job_details(job_id)
    #         return True if job_details is not None else False
    #     except Exception as e:
    #         raise(f"Error checking if job ID exists: {e}")

    # def notification_message(message: str, member_id: str="", job_id: str="", isJob:bool=False) -> str: #this is here incase I need to make changes to the message, I can do it here instead of having to change it in multiple places
    #     """
    #     Generate a notification message for a user.
        
    #     Args:
    #         member_id: The ID of the member
    #         job_id: The ID of the job
    #         message: The message to send to the user
            
    #     Returns:
    #         A dictionary containing the needed information to send a notification message for the user
    #     """
    #     member_details = db.get_member_details(member_id)
    #     job_details = db.get_job_details(job_id)

    #     if isJob:
    #         email_message = message
    #     else:
    #         email_message = message.format(member_email=member_details["name_email"]["email"], subject_title=member_details["subject"])
        
    #     return{
    #         "body": email_message,
    #         "to": job_details["email"],
    #         "subject": "Urgent Message from Converse",
    #         "from": os.environ.get("EMAIL_FROM")
    #     };
    @staticmethod
    def check_send_limit(response: dict) -> bool:
        """
        Checks if the user has exceeded the daily send limit based on the API response.
        If the limit is exceeded, informs the user and exits the program.
        Otherwise, does nothing.
        
        Args:
            response: The response from the email service. Must have a 'status_code' key.
        
        Returns:
             True if the send limit has been reached, False otherwise
        """
        if response.status_code == 429:
            message = "You have reached the limit of emails you can send per day. Please try again tomorrow."
            return {
                "isExceeded": True,
                "message": message
            }
        else:
            return {
                "isExceeded": False
            }

    @staticmethod
    def delete_schedule(job_id: str) -> None: #this is not yet defined but the idea is to call this function to delete a schedule(when the api is finished it will also be called here)
        pass

util = Util()
