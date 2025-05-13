import { deletePineconeNamespaceDirect, uploadVectors } from '@/lib/pinecone-ops';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/jobs/[jobId]
export async function GET(request, { params }) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 401 }
      );
    }

    const { jobId } = await params;

    // Get the specific job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError) {
      console.error('Error fetching job:', jobError);
      return NextResponse.json(
        { error: 'Failed to fetch job' },
        { status: 500 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error in job GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/jobs/[jobId]
export async function PUT(request, { params }) {
  try {
    const { jobId } = await params;
    const jobData = await request.json();

    // Extract file_content before sending to Supabase
    const file_content = jobData.file_content;
    delete jobData.file_content;

    const supabase = await createSupabaseServerClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 401 }
      );
    }

    // Update the specific job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .update(jobData)
      .eq('id', jobId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (jobError) {
      console.error('Error updating job:', jobError);
      return NextResponse.json(
        { error: 'Failed to update job' },
        { status: 500 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // If there's file content, update Pinecone vectors with it, else update Pinecone with about and more_details
    let content_to_upload = null;
    if (file_content) {
      content_to_upload = file_content;
    } else if(jobData.about || jobData.more_details) {
      content_to_upload = jobData.about + jobData.more_details;
    }

    try {
    const pineconeInfo = {
        id: jobId,
        content_to_upload
    };
    await uploadVectors(pineconeInfo);
    } catch (pineconeError) {
    console.error('Error updating Pinecone vectors:', pineconeError);
    // Don't throw the error as the DB update was successful
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error in job PUT route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[jobId]
export async function DELETE(request, { params }) {
  try {
    const { jobId } = await params;

    const supabase = await createSupabaseServerClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 401 }
      );
    }

    // Delete the specific job
    const { error: jobError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
      .eq('user_id', user.id);

    if (jobError) {
      console.error('Error deleting job:', jobError);
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      );
    }

    //Delete from Pinecone
    try {
      await deletePineconeNamespaceDirect(jobId.toString());
    } catch (pineconeError) {
      console.error('Error deleting Pinecone namespace:', pineconeError);
      // Don't throw here as the job is already deleted from Supabase
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in job DELETE route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 