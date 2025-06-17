import { validateCSRFToken } from '@/lib/csrf';
import { handleGmailAuthCallback, startGmailAuth } from '@/lib/email';
import { NextResponse } from 'next/server';

// Prevent caching of this route
export const dynamic = 'force-dynamic';

// Generate authorization URL
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const result = await startGmailAuth(email);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Error in Gmail auth GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OAuth 
export async function POST(request) {
  console.log('POST /api/gmail/auth route handler called');
  try {
    // Validate CSRF token
    const csrfError = await validateCSRFToken(request);
    if (csrfError) {
      console.error('CSRF validation failed:', csrfError);
      return NextResponse.json({ error: csrfError }, { status: 403 });
    }

    // First check if there's a body
    const contentType = request.headers.get('content-type');
    // console.log('Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type:', contentType);
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Try to parse the body
    let body;
    try {
      body = await request.json();
      console.log('Successfully parsed request body:', body);
    } catch (err) {
      console.error('Error parsing request body:', err);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { code, state } = body;

    if (!code || !state) {
      console.error('Missing required parameters:', { hasCode: !!code, hasState: !!state });
      return NextResponse.json(
        { error: 'Code and state are required' },
        { status: 400 }
      );
    }

    console.log('Processing Gmail auth callback with:', { 
      code: code.substring(0, 10) + '...',
      state: typeof state === 'string' ? state.substring(0, 20) + '...' : state
    });

    const result = await handleGmailAuthCallback(code, state);
    console.log('Gmail auth callback result:', { 
      success: result.success,
      hasError: !!result.error,
      email: result.email
    });
    
    if (!result.success) {
      console.error('Gmail auth callback failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: result.email,
      message: result.message,
      profile: result.profile // Include profile data in response
    });
  } catch (error) {
    console.error('Error in Gmail auth POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}