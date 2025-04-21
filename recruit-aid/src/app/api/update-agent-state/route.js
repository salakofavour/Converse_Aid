import { updateAgentState } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const STATE_MAPPING = {
  'Start': 'Running',
  'Stop': 'Stopped',
  'Pause': 'Paused',
  'Resume': 'Running'
};

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

    // Parse request body
    const { jobId, action } = await request.json();

    if (!jobId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Map action to state
    const newState = STATE_MAPPING[action];
    if (!newState) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    //here is where the api call to the agent will exist, and on success the call to update the agent state in supabase will run
    //idea would be to use the job id to get the start-date and interval from the database and pass them to the agent api call
    //then on success of the agent api call, the job state will be updated in supabase


    // Update job state
    const { data, error } = await updateAgentState(jobId, newState);

    if (error) {
      console.error('Error updating job state:', error);
      return NextResponse.json(
        { error: 'Failed to update job state' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job state updated successfully',
      data
    });

  } catch (error) {
    console.error('Error in update-agent-state route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 