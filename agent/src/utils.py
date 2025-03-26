import time
from functools import wraps
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