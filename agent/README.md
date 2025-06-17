# Email Automation System

An automated system for monitoring email threads, generating context-aware responses using vector search, and replying with appropriate information.

## Features

- Automated email monitoring based on message_id & thred_id
- Semantic search for knowledge retrieval using Pinecone
- OAuth token management for Gmail API
- Automated response generation via LLM
- Response threading and email chain management
- Persistent job and email state in Supabase

## Architecture

The system is organized into modular components:

- **Database Service**: Handles Supabase interactions for storing job and email details
- **Authentication Service**: Manages OAuth token validation and refresh
- **Email Service**: Handles Gmail API operations for finding and sending emails
- **Vector Search Service**: Interfaces with Pinecone for semantic search
- **Main Application**: Orchestrates the workflow

## Installation

### Prerequisites

- Python 3.9+
- Supabase account and project
- Pinecone account and index
- Gmail API credentials
- Cohere API key

### Setup

1. Clone this repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Create a `.env` file with the required credentials:
   ```
   COHERE_API_KEY
   PINECONE_API_KEY
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY

   # Google OAuth
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET

   #GOOGLE GMAIL API
   TOKEN_URL=https://oauth2.googleapis.com/token
   GMAIL_URL=https://gmail.googleapis.com/gmail/v1/users/


   #Pinecone index name*****
   INDEX_NAME

   #LLM settings
   LLM_MODEL
   LLM_TEMPERATURE

   #Resend Email Config
   RESEND_API_KEY
   COMPANY_EMAIL=senderemail@example.com

   #AWS detail
   AGENT_DELETE_SCHEDULE
   AGENT_API_KEY
   ```

## Usage

### Running Manually

```bash
python run.py [--job-id JOB_ID]
```

Options:
- `--job-id`: Specify a job ID to process


### Project Structure

```
.
├── src/
│   ├── __init__.py        # Package initialization
│   ├── auth.py            # Authentication services
│   ├── config.py          # Configuration and constants
│   ├── database.py        # Database operations
│   ├── email_service.py   # Email operations
│   ├── main.py            # Main application logic
│   ├── utils.py           # Utility functions
│   └── vector_search.py   # Vector search operations
├── .env                   # Environment variables
├── README.md              # Documentation
├── requirements.txt       # Dependencies
└── run.py                 # CLI entry point
```

### Error Handling

The system uses comprehensive error handling with:

- Automatic retries with exponential backoff
- Detailed error information
- Appropriate status codes and messages

## License

This project is licensed under the MIT License - see the LICENSE file for details. 