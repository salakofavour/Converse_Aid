import { updateApplicantMessageIds } from '@/lib/applicants';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Verify CSRF protection
    const requestedWith = request.headers.get('x-requested-with');
    if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    const { applicants } = await request.json();
    
    if (!applicants || !Array.isArray(applicants)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Update message IDs
    const result = await updateApplicantMessageIds(applicants);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in applicant message IDs update route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 