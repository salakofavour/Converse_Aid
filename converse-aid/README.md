# Converse-Aid

An AI platform used to create conversation agents.

## Features

- **User Authentication**: Secure magic link authentication with Supabase
- **Dashboard**: Overview of active & total jobs(agents) recruitment activities and key metrics
- **Job Management**: Create and manage jobs
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, professional interface with light blue and white color scheme

## Tech Stack

- **Frontend**: Next.js 15, React 19
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS, Bootstrap, shadcn/ui
- **Form Handling**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Converse-Aid.git
   cd Converse-Aid
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
      # Supabase 
      NEXT_PUBLIC_SUPABASE_URL
      NEXT_PUBLIC_SUPABASE_ANON_KEY
      NEXT_SUPABASE_SERVICE_ROLE_KEY


      # Google OAuth
      GOOGLE_CLIENT_ID
      GOOGLE_CLIENT_SECRET
      GOOGLE_REDIRECT_URI

      #GMAIL SCOPE
      GOOGLE_GMAIL_SCOPES

      # Pinecone
      NEXT_PINECONE_API_KEY
      NEXT_PINECONE_INDEX_NAME

      # Stripe test keys
      NEXT_PUBLIC_STRIPE_SECRET_KEY
      STRIPE_PRICE_ID
      STRIPE_WEBHOOK_SECRET

      # General
      PUBLIC_APP_URL=http://localhost:3000

      # Resend
      NEXT_RESEND_API_KEY
      NEXT_FROM_EMAIL=senderemail@example.com

      # AWS Endpoint & API_KEY
      AGENT_CREATE_SCHEDULE
      AGENT_DELETE_SCHEDULE
      AGENT_API_KEY


4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/src/app`: Next.js app router pages and layouts
- `/src/components`: Reusable React components
- `/src/lib`: Utility functions and Supabase client
- `/public`: Static assets

## Deployment

This application can be easily deployed on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/Converse-Aid)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
