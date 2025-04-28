import os
from dotenv import load_dotenv
import getpass

# Load environment variables from .env file
load_dotenv()

# Application constants
# --------------------------------------------------------------
# Centralizing all configuration values:
# - Makes it easier to modify settings in one place
# - Prevents hardcoded values scattered throughout the code
# - Allows for environment-specific configurations
# --------------------------------------------------------------

# API endpoints and URLs
# GMAIL_URL = "https://gmail.googleapis.com/gmail/v1/users/"
# TOKEN_URL = os.environ.get("TOKEN_URL", "https://oauth2.googleapis.com/token")

# Pinecone settings
# INDEX_NAME = "test1"  # Will be something else, not sure what yet, the name is just too blehh, but it will have to do for now.

# Retry settings
MAX_RETRIES = 3
RETRY_BACKOFF = 2

# Email settings (these could be moved to database in future)
# DEFAULT_RECEIVER = "salakofavour0@gmail.com"
# DEFAULT_SENDER = "favoursalako041@gmail.com"

 # For testing/development
# DEFAULT_JOB_ID= "20bcf612-161e-4940-ae81-4ae5728d1e8c"

# LLM settings
# LLM_MODEL = "llama-3.3-70b-versatile"
# LLM_TEMPERATURE = 0
# LLM_MAX_TOKENS = 100

# Required environment variables
REQUIRED_ENV_VARS = [
    "GROQ_API_KEY", 
    "PINECONE_API_KEY", 
    "SUPABASE_URL", 
    "SUPABASE_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "DEFAULT_JOB_ID",
    "INDEX_NAME",
    "TOKEN_URL",
    "GMAIL_URL",
    "LLM_MODEL",
    "LLM_TEMPERATURE",
    "LLM_MAX_TOKENS"
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