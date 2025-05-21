# Email Automation System

An automated system for monitoring email threads, generating context-aware responses using vector search, and replying with appropriate information.

## Features

- Automated email monitoring based on search criteria
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
   COHERE_API_KEY=your_cohere_key
   PINECONE_API_KEY=your_pinecone_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_SUPABASE_SERVICE_ROLE_KEY
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   TOKEN_URL=https://oauth2.googleapis.com/token
   ```

## Usage

### Running Manually

```bash
python run.py [--job-id JOB_ID]
```

Options:
- `--job-id`: Specify a job ID to process

### Scheduling with Cron

To run the system periodically, add a cron job:

```bash
# Run every 15 minutes by default(dynamic option comes later)
*/15 * * * * cd /path/to/project && python run.py
```

## Database Schema

### Jobs Table
- `id`: UUID (primary key)
- `user_id`: Reference to profiles table
- `Job_email`: Email address for sending replies
- `thread_id`: Gmail thread ID
- `overall_message_id`: ID of latest message
- `subject`: Email subject
- `body`: Email body content
- `message_id`: Message-ID header
- `references`: References header for threading
- `search_query`: Custom search query

### Profiles Table
- `id`: UUID (primary key)
- `sender`: Array of email configurations containing:
  - `email`: Email address
  - `access_token`: OAuth access token
  - `refresh_token`: OAuth refresh token
  - `access_expires_in`: Token expiration timestamp

## Development

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