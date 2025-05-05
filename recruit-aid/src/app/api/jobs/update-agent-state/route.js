import { getAgentState, updateAgentState } from '@/lib/agent';
import { validateCSRFToken } from '@/lib/csrf';

/**
 * GET /api/jobs/state?id={jobId}
 * Gets the current state of a job's agent
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    if (!jobId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Job ID is required'
      }), { status: 400 });
    }

    const result = await getAgentState(jobId);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500 });
  }
}

/**
 * POST /api/jobs/state
 * Updates the state of a job's agent
 * Body: { jobId: string, action: string }
 */
export async function POST(request) {
  try {
    // Validate CSRF token
    const csrfError = await validateCSRFToken(request);
    if (csrfError) {
      return new Response(JSON.stringify({
        success: false,
        error: csrfError
      }), { status: 403 });
    }

    const body = await request.json();
    const { jobId, action } = body;

    if (!jobId || !action) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Job ID and action are required'
      }), { status: 400 });
    }

    const result = await updateAgentState(jobId, action);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), { status: 500 });
  }
} 