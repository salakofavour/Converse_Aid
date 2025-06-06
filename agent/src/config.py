import os
from dotenv import load_dotenv
import getpass

# Load environment variables from .env file
load_dotenv()


# Retry settings
MAX_RETRIES = 3
RETRY_BACKOFF = 2


# Required environment variables
REQUIRED_ENV_VARS = [
    "COHERE_API_KEY", 
    "PINECONE_API_KEY", 
    "SUPABASE_URL", 
    "SUPABASE_SERVICE_ROLE_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "INDEX_NAME",
    "TOKEN_URL",
    "GMAIL_URL",
    "LLM_MODEL",
    "LLM_TEMPERATURE"
    # "LLM_MAX_TOKENS"
]

def ensure_env_vars() -> bool:
    """
    Ensure all required environment variables are set.
    If any are missing, prompt the user to enter them.
    
    return:
        bool: True if all variables are set
        
    Raises:
        ValueError: If unable to set a required variable
    """
    missing_vars = []
    
    for var in REQUIRED_ENV_VARS:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"Missing environment variables: {', '.join(missing_vars)}")
        for var in missing_vars:
            try:
                os.environ[var] = getpass.getpass(f"Enter {var}: ")
            except Exception as e:
                raise ValueError(f"Required environment variable {var} could not be set: {str(e)}")
    
    return True 