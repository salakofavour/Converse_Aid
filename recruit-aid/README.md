# Converse-Aid

A modern recruitment management platform built with Next.js, Supabase, Bootstrap, and shadcn/ui.

## Features

- **User Authentication**: Secure magic link authentication with Supabase
- **Dashboard**: Overview of recruitment activities and key metrics
- **Job Management**: Create and manage job postings
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
   - Add your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
   - Add your Pinecone API key to the `.env` file
      NEXT_PINECONE_API_KEY=your_pinecone_api_key_here 

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
