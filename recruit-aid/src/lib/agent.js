import { endAgent, initiateAgent } from '@/lib/aws-agent-call';
import { createClient } from '@/lib/supabase';
/**
 * Valid agent states
 */
export const AGENT_STATES = {
  RUNNING: 'Running',
  STOPPED: 'Stopped',
  PAUSED: 'Paused'
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
    const supabase = createClient();

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
    const supabase = createClient();

    // Get job to verify ownership and current state
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
      throw new Error('Unauthorized to update this job state');
    }

    // Get new state from action
    const actionConfig = Object.values(AGENT_ACTIONS).find(a => a.name === action);
    if (!actionConfig) {
      throw new Error('Invalid action');
    }

    // Validate state transition
    const currentState = job.agent_state || AGENT_STATES.STOPPED;
    if (!isValidStateTransition(job.status, actionConfig.state)) {
      throw new Error(`Invalid state transition from ${currentState} to ${actionConfig.state}`);
    }

    //after validating state change is valid & correct parameters are provided, send a request to the api gateway endpoint to initiate or end the agent
    //send the job id, and the action to initiate or end the agent
    //if the action is to start or resume the agent, end any agent with the same name first and then initiate the agent
    //if the action is to stop or pause the agent, end the agent
    if (actionConfig.state === AGENT_STATES.RUNNING) {
      await endAgent(jobId);
      await initiateAgent(jobId);
    } else if (actionConfig.state === AGENT_STATES.STOPPED || actionConfig.state === AGENT_STATES.PAUSED) {
      await endAgent(jobId);
    }

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