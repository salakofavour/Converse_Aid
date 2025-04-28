import { createClient } from '@/lib/supabase';

/**
 * Creates a new applicant for a job
 * @param {string} jobId - The job ID
 * @param {Object} applicantData - The applicant data
 * @param {string} applicantData.name - Applicant's name
 * @param {string} applicantData.email - Applicant's email
 * @returns {Promise<{ success: boolean, applicant?: Object, error?: string }>}
 */
export async function createApplicant(jobId, applicantData) {
  try {
    const supabase = createClient();

    // Verify job ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (jobError) throw new Error('Failed to verify job ownership');

    // Verify current user owns the job
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    if (job.user_id !== user.id) {
      throw new Error('Unauthorized to add applicants to this job');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(applicantData.email)) {
      throw new Error('Invalid email format');
    }

    // Insert the applicant
    const { data: applicant, error: insertError } = await supabase
      .from('applicants')
      .insert({
        job_id: jobId,
        name_email: {
          name: applicantData.name.trim(),
          email: applicantData.email.trim()
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw new Error('Failed to create applicant');

    return {
      success: true,
      applicant
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets all applicants for a job
 * @param {string} jobId - The job ID
 * @returns {Promise<{ success: boolean, applicants?: Array<Object>, error?: string }>}
 */
export async function getApplicants(jobId) {
  try {
    const supabase = createClient();

    // Verify job ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (jobError) throw new Error('Failed to verify job ownership');

    // Verify current user owns the job
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    if (job.user_id !== user.id) {
      throw new Error('Unauthorized to view applicants for this job');
    }

    // Get all applicants for the job
    const { data: applicants, error: applicantsError } = await supabase
      .from('applicants')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (applicantsError) throw new Error('Failed to get applicants');

    return {
      success: true,
      applicants
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Updates an applicant's information
 * @param {string} applicantId - The applicant ID
 * @param {Object} applicantData - The applicant data to update
 * @returns {Promise<{ success: boolean, applicant?: Object, error?: string }>}
 */
export async function updateApplicant(applicantId, applicantData) {
  try {
    const supabase = createClient();

    // Get applicant to verify ownership through job
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('job_id')
      .eq('id', applicantId)
      .single();

    if (applicantError) throw new Error('Failed to get applicant');

    // Verify job ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', applicant.job_id)
      .single();

    if (jobError) throw new Error('Failed to verify job ownership');

    // Verify current user owns the job
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    if (job.user_id !== user.id) {
      throw new Error('Unauthorized to update this applicant');
    }

    // If email is being updated, validate format
    if (applicantData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(applicantData.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Prepare update data
    const updateData = {};
    if (applicantData.name || applicantData.email) {
      updateData.name_email = {
        name: applicantData.name?.trim() || applicant.name_email.name,
        email: applicantData.email?.trim() || applicant.name_email.email
      };
    }
    if (applicantData.status) {
      updateData.status = applicantData.status;
    }
    if (applicantData.notes) {
      updateData.notes = applicantData.notes;
    }

    // Update the applicant
    const { data: updatedApplicant, error: updateError } = await supabase
      .from('applicants')
      .update(updateData)
      .eq('id', applicantId)
      .select()
      .single();

    if (updateError) throw new Error('Failed to update applicant');

    return {
      success: true,
      applicant: updatedApplicant
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Deletes an applicant
 * @param {string} applicantId - The applicant ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteApplicant(applicantId) {
  try {
    const supabase = createClient();

    // Get applicant to verify ownership through job
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('job_id')
      .eq('id', applicantId)
      .single();

    if (applicantError) throw new Error('Failed to get applicant');

    // Verify job ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', applicant.job_id)
      .single();

    if (jobError) throw new Error('Failed to verify job ownership');

    // Verify current user owns the job
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Failed to get user');

    if (job.user_id !== user.id) {
      throw new Error('Unauthorized to delete this applicant');
    }

    // Delete the applicant
    const { error: deleteError } = await supabase
      .from('applicants')
      .delete()
      .eq('id', applicantId);

    if (deleteError) throw new Error('Failed to delete applicant');

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
 * Updates applicant message IDs and headers after email sending
 * @param {Array<Object>} updates - Array of applicant updates
 * @param {string} updates[].id - Applicant ID
 * @param {string} updates[].gmailId - Gmail message ID
 * @param {string} updates[].messageId - Email Message-ID header
 * @param {string} updates[].threadId - Gmail thread ID
 * @param {string} updates[].references - Email References header
 * @param {string} updates[].subject - Email subject
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function updateApplicantMessageIds(updates) {
  try {
    const supabase = createClient();

    // Process updates in parallel
    const updatePromises = updates.map(async ({ id, gmailId, messageId, threadId, references, subject }) => {
      const { error } = await supabase
        .from('applicants')
        .update({
          message_id: messageId || null,
          subject: subject || null,
          thread_id: threadId || null,
          reference_id: references || null,
          response: null,
          overall_message_id: gmailId || null,
          body: null
        })
        .eq('id', id);

      if (error) throw new Error(`Failed to update applicant ${id}: ${error.message}`);
    });

    await Promise.all(updatePromises);

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