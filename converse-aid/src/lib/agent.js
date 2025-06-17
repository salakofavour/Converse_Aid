import { endAgent, initiateAgent } from '@/lib/aws-agent-call';
import { createSupabaseServerClient } from '@/lib/supabase-server';
/**
 * Valid agent states
 */
export const AGENT_STATES = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  PAUSED: 'paused'
};

/**
 * Valid agent actions and their corresponding states
 */
export const AGENT_ACTIONS = {
  START: { name: 'Start', state: AGENT_STATES.RUNNING },
  STOP: { name: 'Stop', state: AGENT_STATES.STOPPED },
  PAUSE: { name: 'Pause', state: AGENT_STATES.PAUSED },
  RESUME: { name: 'Resume', state: AGENT_STATES.RUNNING }
};

/**
 * Valid state transitions
 */
const STATE_TRANSITIONS = {
  'active': [AGENT_STATES.RUNNING, AGENT_STATES.STOPPED, AGENT_STATES.PAUSED],
  [AGENT_STATES.RUNNING]: [AGENT_STATES.STOPPED, AGENT_STATES.PAUSED],
  [AGENT_STATES.STOPPED]: [AGENT_STATES.RUNNING],
  [AGENT_STATES.PAUSED]: [AGENT_STATES.RUNNING, AGENT_STATES.STOPPED],
  'closed': [] // No transitions allowed from closed state
};

/**
 * Gets the current agent state for a job
 * @param {string} jobId - The job ID
 * @returns {Promise<{ success: boolean, state?: string, error?: string }>}
 */
export async function getAgentState(jobId) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get job to verify ownership and get state
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id, agent_state, status')
      .eq('id', jobId)
      .single();

    if (jobError) throw new Error('Failed to get job');

    // Verify ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    if (job.user_id !== user.id) {
      throw new Error('Unauthorized to view this job state');
    }

    return {
      success: true,
      state: job.agent_state || AGENT_STATES.STOPPED,
      jobStatus: job.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Updates the agent state for a job
 * @param {string} jobId - The job ID
 * @param {string} action - The action to perform (Start, Stop, Pause, Resume)
 * @returns {Promise<{ success: boolean, state?: string, error?: string }>}
 */
export async function updateAgentState(jobId, action) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get job to verify ownership and current state
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id, agent_state, status, interval')
      .eq('id', jobId)
      .single();

    if (jobError) throw new Error('Failed to get job');

    // Verify ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    if (job.user_id !== user.id) {
      throw new Error('Unauthorized to update this job state');
    }

    // Get new state from action
    const actionConfig = Object.values(AGENT_ACTIONS).find(a => a.name === action);
    if (!actionConfig) {
      throw new Error('Invalid action');
    }

    // First check if job is active
    if (job.status === 'closed') {
      throw new Error('Cannot modify agent state for closed jobs');
    }

    // Validate state transition based on current agent state
    const currentState = job.agent_state || AGENT_STATES.STOPPED;
    if (!isValidStateTransition(currentState, actionConfig.state)) {
      throw new Error(
        `Invalid state transition: Cannot change from ${currentState} to ${actionConfig.state}. ` +
        `Allowed transitions from ${currentState} are: ${STATE_TRANSITIONS[currentState].join(', ')}`
      );
    }

    if (actionConfig.state === AGENT_STATES.RUNNING) {
      console.log("starting or resuming agent");
      await endAgent(jobId);
      await initiateAgent(jobId, job.interval);
    } else if (actionConfig.state === AGENT_STATES.STOPPED || actionConfig.state === AGENT_STATES.PAUSED) {
      console.log("stopping or pausing agent");
      await endAgent(jobId);
    }

    //after validating state change is valid & correct parameters are provided, send a request to the api gateway endpoint to initiate or end the agent
    //send the job id, and the action to initiate or end the agent
    //if the action is to start or resume the agent, end any agent with the same name first and then initiate the agent
    //if the action is to stop or pause the agent, end the agent
    // Update job state in db
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update({ agent_state: actionConfig.state })
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) throw new Error('Failed to update job state');

    return {
      success: true,
      state: updatedJob.agent_state
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validates if a state transition is allowed
 * @param {string} currentJobStatus - The current job status
 * @param {string} newAgentState - The new agent state
 * @returns {boolean}
 */
function isValidStateTransition(currentJobStatus, newAgentState) {
  // Get valid transitions for current state
  const allowedTransitions = STATE_TRANSITIONS[currentJobStatus] || [];
  
  // Check if transition is allowed
  return allowedTransitions.includes(newAgentState);
}