import { getAgentConfig, updateAgentConfig } from '@/lib/agent';
import { validateCSRFToken } from '@/lib/csrf';

/**
 * GET /api/update-agent-state?id={jobId}
 * Gets the current configuration of a job's agent
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

    const result = await getAgentConfig(jobId);
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
 * POST /api/update-agent-state
 * Updates the configuration of a job's agent
 * Body: { jobId: string, config: AgentConfig }
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
    const { jobId, config } = body;

    if (!jobId || !config) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Job ID and configuration are required'
      }), { status: 400 });
    }

    //request to the api gateway endpoint to initiate or end the agent

    const result = await updateAgentConfig(jobId, config);
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