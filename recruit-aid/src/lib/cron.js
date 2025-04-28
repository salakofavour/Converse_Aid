import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a server-side Supabase client for cron operations
 * @returns {Promise<Object>} Supabase client instance
 */
async function createCronSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  );
}

/**
 * Updates a subscription status in the database
 * @param {Object} supabase - Supabase client
 * @param {Object} params - Parameters for the update
 * @param {string} params.subscriptionId - Database subscription ID
 * @param {string} params.status - New subscription status
 * @param {string} params.userId - User ID associated with the subscription
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateSubscriptionStatus({ supabase, subscriptionId, status, userId }) {
  const timestamp = new Date().toISOString();
  
  try {
    // Update subscription status
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({ 
        status,
        updated_at: timestamp
      })
      .eq('id', subscriptionId);
      
    if (subError) throw new Error(`Failed to update subscription: ${subError.message}`);

    // If subscription is cancelled/unpaid, update user's subscription status
    if (['canceled', 'unpaid'].includes(status)) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_subscribed: false,
          updated_at: timestamp
        })
        .eq('id', userId);
        
      if (profileError) throw new Error(`Failed to update profile: ${profileError.message}`);
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Checks all active subscriptions and updates their status if needed
 * @returns {Promise<{success: boolean, error?: string, stats?: {checked: number, updated: number, failed: number}}>}
 */
export async function checkSubscriptions() {
  const stats = {
    checked: 0,
    updated: 0,
    failed: 0
  };
  
  try {
    const supabase = await createCronSupabaseClient();
    
    // Get all active subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, user_id')
      .eq('status', 'active');
      
    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    // Process subscriptions in parallel with rate limiting
    const batchSize = 3; // Process 3 subscriptions at a time
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      await Promise.all(batch.map(async (subscription) => {
        try {
          stats.checked++;
          
          // Get subscription from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.stripe_subscription_id
          );
          
          // If subscription status has changed
          if (stripeSubscription.status !== 'active') {
            const result = await updateSubscriptionStatus({
              supabase,
              subscriptionId: subscription.id,
              status: stripeSubscription.status,
              userId: subscription.user_id
            });
            
            if (result.success) {
              stats.updated++;
            } else {
              stats.failed++;
              console.error(`Failed to update subscription ${subscription.id}:`, result.error);
            }
          }
        } catch (error) {
          stats.failed++;
          console.error(`Error processing subscription ${subscription.id}:`, error);
        }
      }));
      
      // Add small delay between batches to avoid rate limits
      if (i + batchSize < subscriptions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error in checkSubscriptions:', error);
    return {
      success: false,
      error: error.message,
      stats
    };
  }
}

/**
 * Checks if a specific subscription is still active
 * @param {string} subscriptionId - The Stripe subscription ID to check
 * @returns {Promise<{success: boolean, error?: string, subscription?: {isActive: boolean, status: string, currentPeriodEnd: string}}>}
 */
export async function checkSubscriptionStatus(subscriptionId) {
  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return {
      success: true,
      subscription: {
        isActive: stripeSubscription.status === 'active',
        status: stripeSubscription.status,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString()
      }
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 