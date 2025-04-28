import { createJob, deleteJob, getJobById, getJobs, updateJob } from '@/lib/jobs';
import { NextResponse } from 'next/server';

// Get all jobs or a specific job
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

    // Check if a specific job ID is requested
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    if (jobId) {
      // Get specific job
      const result = await getJobById(jobId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      return NextResponse.json(result);
    } else {
      // Get all jobs
      const result = await getJobs();
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error in jobs GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new job
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

    const jobData = await request.json();
    
    // Create job
    const result = await createJob(jobData);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in jobs POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a job
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
    const jobId = searchParams.get('id');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const jobData = await request.json();
    
    // Update job
    const result = await updateJob(jobId, jobData);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in jobs PUT route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a job
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
    const jobId = searchParams.get('id');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    // Delete job
    const result = await deleteJob(jobId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in jobs DELETE route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 