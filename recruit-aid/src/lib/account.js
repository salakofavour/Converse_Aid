// Account management functions

import { deletePineconeNamespace } from '@/lib/pinecone-callRoute';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';

/**
 * Changes the email address for the authenticated user
 * @param {string} newEmail - The new email address
 * @returns {Promise<{ success: boolean, message: string, error?: string }>}
 */
export async function changeEmail(newEmail) {
  try {
    const response = await fetch('/api/account/change-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ newEmail })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to change email');
    }

    return {
      success: true,
      message: data.message
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Deletes a user's account and all associated data
 * @param {string} userId - The ID of the user to delete
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteAccount(userId) {
  try {
    const supabase = createClient();
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
      await Promise.all(jobIds.map(jobId => deletePineconeNamespace(jobId)));
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
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
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
    const supabase = createClient();
    
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