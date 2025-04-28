import { handleGmailAuthCallback, startGmailAuth } from '@/lib/email';
import { NextResponse } from 'next/server';

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

// Handle OAuth callback
export async function POST(request) {
  try {
    const { code, state } = await request.json();
    
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Code and state are required' },
        { status: 400 }
      );
    }

    const result = await handleGmailAuthCallback(code, state);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: result.email,
      message: result.message
    });
  } catch (error) {
    console.error('Error in Gmail auth POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}