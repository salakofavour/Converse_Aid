import { getJobCount } from '@/lib/jobs';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Verify CSRF protection
    const requestedWith = request.headers.get('x-requested-with');
    if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    // Get job count
    const result = await getJobCount();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in job count route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 