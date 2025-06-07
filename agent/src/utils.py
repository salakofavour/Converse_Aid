import time
from functools import wraps
import os
import json
import requests
from typing import Callable, Any, Tuple, Type, Union, List
import src.config as config


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
        """
        Delete a schedule for a job.
        
        Args:
            job_id: The ID of the job to delete the schedule for
            
        """
        api_key = os.environ.get('AGENT_API_KEY')
        delete_schedule_url = os.environ.get('AGENT_DELETE_SCHEDULE')
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key
        }
        response = requests.post(delete_schedule_url, json={"job_id": job_id}, headers=headers)
        if response.status_code == 200:
            return True
        else:
            return False

util = Util()
