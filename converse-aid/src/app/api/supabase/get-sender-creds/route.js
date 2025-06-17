 
import { getSenderCredentials } from '@/lib/account';
import { validateCSRFToken } from '@/lib/csrf';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Validate CSRF token
    const csrfError = await validateCSRFToken(request);
    if (csrfError) {
      return NextResponse.json({
        success: false,
        error: csrfError
      }, { status: 403 });
    }

    // Get email from request body
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get sender credentials
    const result = await getSenderCredentials(email);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sender: result.sender
    });
  } catch (error) {
    console.error('Error getting sender credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 