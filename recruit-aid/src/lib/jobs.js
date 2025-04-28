import { uploadVectors } from '@/lib/pinecone';
import { createClient } from '@/lib/supabase';

/**
 * Creates a new job
 * @param {Object} jobData - The job data
 * @param {string} jobData.title - Job title
 * @param {string} jobData.about - About the job (was responsibilities)
 * @param {string} jobData.more_details - More details (was qualifications)
 * @param {string} jobData.job_start_date - Start date of the job flow (YYYY-MM-DD)
 * @param {string} jobData.job_end_date - End date of the job flow (YYYY-MM-DD)
 * @param {string} jobData.Job_email - Email address for job communications
 * @returns {Promise<{ success: boolean, job?: Object, error?: string }>}
 */
export async function createJob(jobData) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    // Check job count limit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('job_count')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error('Failed to get profile');
    
    // Free tier limit is 5 jobs
    if (profile.job_count >= 5) {
      throw new Error('Job limit reached. Please upgrade your subscription to create more jobs.');
    }

    // Determine status based on end date
    const currentDate = new Date();
    const endDate = new Date(jobData.job_end_date);
    const status = currentDate <= endDate ? 'active' : 'closed';

    // Add user_id and metadata to the job data
    const jobWithMetadata = {
      ...jobData,
      user_id: user.id,
      status,
      created_at: new Date().toISOString()
    };

    // Insert the job
    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert(jobWithMetadata)
      .select()
      .single();

    if (insertError) throw new Error('Failed to create job');

    // Create vectors in Pinecone
    try {
      await uploadVectors(job);
    } catch (pineconeError) {
      console.error('Error creating Pinecone vectors:', pineconeError);
      // Don't throw as the DB insert was successful
    }

    return {
      success: true,
      job
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets all jobs for the current user
 * @returns {Promise<{ success: boolean, jobs?: Array<Object>, error?: string }>}
 */
export async function getJobs() {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    // Get all jobs for the user
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (jobsError) throw new Error('Failed to get jobs');

    return {
      success: true,
      jobs
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets a specific job by ID
 * @param {string} jobId - The job ID
 * @returns {Promise<{ success: boolean, job?: Object, error?: string }>}
 */
export async function getJobById(jobId) {
  try {
    const supabase = createClient();

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) throw new Error('Failed to get job');

    return {
      success: true,
      job
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Updates a job
 * @param {string} jobId - The job ID
 * @param {Object} jobData - The job data to update
 * @returns {Promise<{ success: boolean, job?: Object, error?: string }>}
 */
export async function updateJob(jobId, jobData) {
  try {
    const supabase = createClient();

    // Get current job to verify ownership
    const { data: currentJob, error: currentJobError } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (currentJobError) throw new Error('Failed to get current job');

    // Verify ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    if (currentJob.user_id !== user.id) {
      throw new Error('Unauthorized to update this job');
    }

    // Update the job
    const { data: job, error: updateError } = await supabase
      .from('jobs')
      .update(jobData)
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) throw new Error('Failed to update job');

    // Update vectors in Pinecone if job content changed
    if (!jobData.subject && !jobData.default_message) {
      try {
        await uploadVectors(job);
      } catch (pineconeError) {
        console.error('Error updating Pinecone vectors:', pineconeError);
        // Don't throw as the DB update was successful
      }
    }

    return {
      success: true,
      job
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Deletes a job
 * @param {string} jobId - The job ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteJob(jobId) {
  try {
    const supabase = createClient();

    // Get current job to verify ownership
    const { data: currentJob, error: currentJobError } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (currentJobError) throw new Error('Failed to get current job');

    // Verify ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    if (currentJob.user_id !== user.id) {
      throw new Error('Unauthorized to delete this job');
    }

    // Delete the job
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (deleteError) throw new Error('Failed to delete job');

    // Delete vectors from Pinecone
    try {
      await deletePineconeNamespace(jobId);
    } catch (pineconeError) {
      console.error('Error deleting Pinecone vectors:', pineconeError);
      // Don't throw as the DB delete was successful
    }

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets the job count for the current user
 * @returns {Promise<{ success: boolean, count?: number, error?: string }>}
 */
export async function getJobCount() {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    // Get job count from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('job_count')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error('Failed to get profile');

    return {
      success: true,
      count: profile.job_count
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Valid job states and their transitions
 */
const STATE_MAPPING = {
  'Start': 'Running',
  'Stop': 'Stopped',
  'Pause': 'Paused',
  'Resume': 'Running'
};

/**
 * Updates the state of a job
 * @param {string} jobId - The job ID
 * @param {string} action - The action to perform (Start, Stop, Pause, Resume)
 * @returns {Promise<{ success: boolean, job?: Object, error?: string }>}
 */
export async function updateJobState(jobId, action) {
  try {
    const supabase = createClient();

    // Get current job to verify ownership
    const { data: currentJob, error: currentJobError } = await supabase
      .from('jobs')
      .select('user_id, status')
      .eq('id', jobId)
      .single();

    if (currentJobError) throw new Error('Failed to get current job');

    // Verify ownership
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    if (currentJob.user_id !== user.id) {
      throw new Error('Unauthorized to update this job state');
    }

    // Map action to new state
    const newState = STATE_MAPPING[action];
    if (!newState) {
      throw new Error('Invalid action');
    }

    // Validate state transition
    if (!isValidStateTransition(currentJob.status, newState)) {
      throw new Error(`Invalid state transition from ${currentJob.status} to ${newState}`);
    }

    // Update job state
    const { data: job, error: updateError } = await supabase
      .from('jobs')
      .update({ status: newState })
      .eq('id', jobId)
      .select()
      .single();

    if (updateError) throw new Error('Failed to update job state');

    return {
      success: true,
      job
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets the current state of a job
 * @param {string} jobId - The job ID
 * @returns {Promise<{ success: boolean, state?: string, error?: string }>}
 */
export async function getJobState(jobId) {
  try {
    const supabase = createClient();

    // Get job state
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    if (jobError) throw new Error('Failed to get job state');

    return {
      success: true,
      state: job.status
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
 * @param {string} currentState - The current state
 * @param {string} newState - The new state
 * @returns {boolean}
 */
function isValidStateTransition(currentState, newState) {
  // Define valid transitions
  const validTransitions = {
    'active': ['Running', 'Stopped', 'Paused'],
    'Running': ['Stopped', 'Paused'],
    'Stopped': ['Running'],
    'Paused': ['Running', 'Stopped'],
    'closed': [] // No transitions allowed from closed state
  };

  // Get valid transitions for current state
  const allowedTransitions = validTransitions[currentState] || [];
  
  // Check if transition is allowed
  return allowedTransitions.includes(newState);
} 