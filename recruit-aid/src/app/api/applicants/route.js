import { createApplicant, deleteApplicant, getApplicants, updateApplicant } from '@/lib/applicants';
import { NextResponse } from 'next/server';

// Get all applicants for a job
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

    // Get job ID from query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get applicants
    const result = await getApplicants(jobId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in applicants GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new applicant
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

    const { jobId, ...applicantData } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Create applicant
    const result = await createApplicant(jobId, applicantData);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in applicants POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update an applicant
export async function PUT(request) {
  try {
    // Verify CSRF protection
    const requestedWith = request.headers.get('x-requested-with');
    if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('id');

    if (!applicantId) {
      return NextResponse.json(
        { error: 'Applicant ID is required' },
        { status: 400 }
      );
    }

    const applicantData = await request.json();

    // Update applicant
    const result = await updateApplicant(applicantId, applicantData);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in applicants PUT route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete an applicant
export async function DELETE(request) {
  try {
    // Verify CSRF protection
    const requestedWith = request.headers.get('x-requested-with');
    if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const applicantId = searchParams.get('id');

    if (!applicantId) {
      return NextResponse.json(
        { error: 'Applicant ID is required' },
        { status: 400 }
      );
    }

    // Delete applicant
    const result = await deleteApplicant(applicantId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in applicants DELETE route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 