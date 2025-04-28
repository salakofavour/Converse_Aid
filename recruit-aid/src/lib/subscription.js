import { sendSubscriptionNotification } from '@/lib/notifications';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase';

/**
 * Valid subscription statuses
 */
export const SUBSCRIPTION_STATUS = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  PAST_DUE: 'past_due',
  UNPAID: 'unpaid'
};

/**
 * Gets a user's subscription details
 * @param {string} userId - The user's ID
 * @returns {Promise<{ success: boolean, subscription?: Object, error?: string }>}
 */
export async function getSubscription(userId) {
  try {
    const supabase = createClient();

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw new Error('Failed to get subscription');

    return {
      success: true,
      subscription
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Creates a new subscription with trial period
 * @param {string} userId - The user's ID
 * @param {string} email - The user's email
 * @returns {Promise<{ success: boolean, subscription?: Object, checkoutUrl?: string, error?: string }>}
 */
export async function createSubscription(userId, email) {
  try {
    const supabase = createClient();

    // Check for existing subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('status, stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (existingSubscription?.status === SUBSCRIPTION_STATUS.ACTIVE || 
        existingSubscription?.status === SUBSCRIPTION_STATUS.TRIALING) {
      throw new Error('Already have an active subscription');
    }

    // Get or create Stripe customer
    let stripeCustomerId = existingSubscription?.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId }
      });
      stripeCustomerId = customer.id;
    }

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      trial_period_days: 14,
      metadata: { supabase_user_id: userId }
    });

    // Create or update subscription record
    const now = new Date();
    const trialEnd = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
    const subscriptionData = {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      status: SUBSCRIPTION_STATUS.TRIALING,
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      subscription_end: new Date(subscription.current_period_end * 1000).toISOString()
    };

    if (existingSubscription) {
      await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('subscriptions')
        .insert(subscriptionData);
    }

    // Create checkout session for payment method setup
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription?setup_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription?setup_canceled=true`,
    });

    return {
      success: true,
      subscription: {
        id: subscription.id,
        status: SUBSCRIPTION_STATUS.TRIALING,
        trial_end: trialEnd.toISOString()
      },
      checkoutUrl: session.url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancels a user's subscription
 * @param {string} userId - The user's ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function cancelSubscription(userId) {
  try {
    const supabase = createClient();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    // Cancel the subscription at period end
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({ status: SUBSCRIPTION_STATUS.CANCELED })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Creates a Stripe billing portal session
 * @param {string} userId - The user's ID
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
 */
export async function createBillingPortalSession(userId) {
  try {
    const supabase = createClient();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (!subscription?.stripe_customer_id) {
      throw new Error('No billing account found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription`
    });

    return {
      success: true,
      url: session.url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handles Stripe webhook events
 * @param {Object} event - The Stripe webhook event
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function handleWebhookEvent(event) {
  try {
    const supabase = createClient();

    switch (event.type) {
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            subscription_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await supabase
          .from('subscriptions')
          .update({
            status: SUBSCRIPTION_STATUS.CANCELED,
            subscription_end: new Date(deletedSubscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', deletedSubscription.id);
        break;

      case 'invoice.payment_failed':
        const invoice = event.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer);
        await sendSubscriptionNotification(customer.email);
        break;
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
 * Checks and updates subscription statuses
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function checkSubscriptions() {
  try {
    const supabase = createClient();
    const now = new Date();

    // Get all active and trial subscriptions with profiles
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles!inner (
          email,
          job_count
        )
      `)
      .in('status', [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING]);

    if (!subscriptions) return { success: true };

    for (const subscription of subscriptions) {
      const subscriptionEnd = new Date(subscription.subscription_end);
      const daysUntilExpiry = Math.ceil(
        (subscriptionEnd.getTime() - now.getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      // Send notifications at 7, 4, and 1 day(s) before expiry
      if ([7, 4, 1].includes(daysUntilExpiry)) {
        if (subscription.profiles.job_count > 5) {
          await sendSubscriptionNotification(
            subscription.profiles.email,
            daysUntilExpiry,
            subscription.profiles.job_count
          );
        }
      }

      // If subscription has expired
      if (daysUntilExpiry <= 0) {
        if (subscription.profiles.job_count > 5) {
          await cleanupExcessJobs(supabase, subscription.user_id);
        }

        // Update subscription status
        await supabase
          .from('subscriptions')
          .update({ status: SUBSCRIPTION_STATUS.UNPAID })
          .eq('id', subscription.id);
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
} 