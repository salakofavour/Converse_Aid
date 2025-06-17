import { uploadVectors } from '@/lib/pinecone-ops';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/jobs
export async function GET() {
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

    // Get all jobs for the user
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error in jobs GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/jobs
export async function POST(request) {
  try {
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

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert([
        {
          ...jobData,
          user_id: user.id
        }
      ])
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
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
      console.log("Uploading to Pinecone", job.id);
    const pineconeInfo = {
        id: job.id,
        content_to_upload
    };
    await uploadVectors(pineconeInfo);
    } catch (pineconeError) {
    console.error('Error updating Pinecone vectors:', pineconeError);
    // Don't throw the error as the DB update was successful
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error in jobs POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
