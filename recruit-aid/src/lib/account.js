// Account management functions

import { deletePineconeNamespaceDirect } from '@/lib/pinecone-ops';
import { stripe } from '@/lib/stripe';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server';
import { fetchWithCSRF } from './fetchWithCSRF';

/**
 * Changes the email address for the authenticated user
 * @param {string} newEmail - The new email address
 * @returns {Promise<{ success: boolean, message: string, error?: string }>}
 */
export async function changeEmail(newEmail) {
  try {
    const response = await fetchWithCSRF('/api/account/change-email', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: newEmail })
    });

    if (!response.ok) {
      throw new Error('Failed to change email');
    }

    return await response.json();
  } catch (err) {
    console.error('Error changing email:', err);
    throw err;
  }
}

/**
 * Deletes a user's account and all associated data
 * @param {string} userId - The ID of the user to delete
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteAccount(userId) {
  try {
    const supabase = await createSupabaseServerClient();
    const requestId = Date.now(); // For logging purposes

    // Get subscription details
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subscriptionError) {
      console.error(`[${requestId}] Error fetching subscription:`, subscriptionError);
    }

    // Handle Stripe cleanup
    if (subscription) {
      try {
        if (subscription.stripe_subscription_id) {
          await stripe.subscriptions.del(subscription.stripe_subscription_id);
        }
        if (subscription.stripe_customer_id) {
          await stripe.customers.del(subscription.stripe_customer_id);
        }
      } catch (stripeError) {
        console.error(`[${requestId}] Stripe deletion error:`, stripeError);
        // Continue with account deletion even if Stripe cleanup fails
      }
    }

    // Get all job IDs for this user
    const { data: userJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('user_id', userId);

    if (jobsError) {
      console.error(`[${requestId}] Error fetching jobs:`, jobsError);
    }

    // Delete job-related data
    if (userJobs?.length > 0) {
      const jobIds = userJobs.map(job => job.id);
      
      // Delete members for all jobs
      const { error: membersError } = await supabase
        .from('members')
        .delete()
        .in('job_id', jobIds);

      if (membersError) {
        console.error(`[${requestId}] Error deleting members:`, membersError);
      }

      // Delete Pinecone data for all jobs
      await Promise.all(jobIds.map(jobId => deletePineconeNamespaceDirect(jobId)));
    }

    // Delete remaining user data in specific order
    const deleteOperations = [
      {
        table: 'jobs',
        error: 'jobs'
      },
      {
        table: 'subscriptions',
        error: 'subscription records'
      },
      {
        table: 'profiles',
        error: 'profile'
      }
    ];

    for (const operation of deleteOperations) {
      const { error } = await supabase
        .from(operation.table)
        .delete()
        .eq(operation.table === 'profiles' ? 'id' : 'user_id', userId);

      if (error) {
        console.error(`[${requestId}] Error deleting ${operation.error}:`, error);
      }
    }

    // Delete the user account using admin client
    const supabaseAdmin = await createSupabaseAdminClient();
    
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(deleteError.message);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets sender credentials for a specific email
 * @param {string} email - The email to get credentials for
 * @returns {Promise<{ success: boolean, sender?: Object, error?: string }>}
 */
export async function getSenderCredentials(email) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get the profile with sender info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('sender')
      .single();

    if (profileError) throw new Error('Failed to fetch profile');

    // Find the sender credentials for the given email
    const sender = profile.sender?.find(s => 
      (typeof s === 'string' ? s === email : s.email === email)
    );

    if (!sender) throw new Error('Sender credentials not found');

    return {
      success: true,
      sender
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await fetchWithCSRF('/api/account/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    if (!response.ok) {
      throw new Error('Failed to change password');
    }

    return await response.json();
  } catch (err) {
    console.error('Error changing password:', err);
    throw err;
  }
}
