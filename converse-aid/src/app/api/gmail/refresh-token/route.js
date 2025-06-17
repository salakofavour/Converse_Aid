import { refreshAccessToken } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { refresh_token, email } = await request.json();

    if (!refresh_token || !email) {
      return NextResponse.json(
        { error: 'Refresh token and email are required' },
        { status: 400 }
      );
    }

    const result = await refreshAccessToken(email, refresh_token);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      access_token: result.access_token
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
} 