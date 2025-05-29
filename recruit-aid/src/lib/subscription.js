import { sendPaymentFailedNotification } from '@/lib/notifications';
import { stripe } from '@/lib/stripe';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server';
//this file uses the admin/service role key created client for the webhook events (webhook to supabse -> server-to-server)
//only creating the subscription for first time requires webhook.

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
    const supabase = await createSupabaseServerClient();

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If no subscription found, return null as a valid state
    if (error?.code === 'PGRST116') {
      return {
        success: true,
        subscription: null
      };
    }

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
 * @returns {Promise<{ success: boolean, checkoutUrl?: string, error?: string }>}
 */
export async function createSubscription(userId, email) {
  try {
    const supabase = await createSupabaseServerClient();

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
      console.log("new stripe customer created");
    }

    // Create checkout session for payment method setup
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${process.env.PUBLIC_APP_URL}/dashboard/settings/subscription?setup_success=true`,
      cancel_url: `${process.env.PUBLIC_APP_URL}/dashboard/settings/subscription?setup_canceled=true`,
      metadata: {
        supabase_user_id: userId,
        setup_intent: 'subscription_setup',
        has_previous_subscription: existingSubscription ? 'true' : 'false'
      }
    });

    return {
      success: true,
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
 * Creates a Stripe billing portal session
 * @param {string} userId - The user's ID
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
 */
export async function createBillingPortalSession(userId) {
  try {
    const supabase = await createSupabaseServerClient();
    console.log("about to get session URL")
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
      return_url: `${process.env.PUBLIC_APP_URL}/dashboard/settings/subscription`
    });
    console.log("session URL created")
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
    const supabase = createSupabaseAdminClient();

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // Only process if this is a subscription setup
        if (session.metadata?.setup_intent === 'subscription_setup') {
          const userId = session.metadata.supabase_user_id;
          const hasHadPreviousSubscription = session.metadata.has_previous_subscription === 'true';
          
          // Create subscription with trial only for new users
          const subscription = await stripe.subscriptions.create({
            customer: session.customer,
            items: [{ price: process.env.STRIPE_PRICE_ID }],
            trial_period_days: hasHadPreviousSubscription ? 0 : 14,
            metadata: { supabase_user_id: userId }
          });

          // Create or update subscription record
          const now = new Date();
          const trialEnd = hasHadPreviousSubscription ? 
            now : 
            new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
          
          const subscriptionData = {
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscription.id,
            status: hasHadPreviousSubscription ? 
              SUBSCRIPTION_STATUS.ACTIVE : 
              SUBSCRIPTION_STATUS.TRIALING,
            trial_start: hasHadPreviousSubscription ? null : now.toISOString(),
            trial_end: hasHadPreviousSubscription ? null : trialEnd.toISOString(),
            subscription_end: new Date(subscription.current_period_end * 1000).toISOString()
          };

          // Use upsert to create or update the subscription record
          await supabase
            .from('subscriptions')
            .upsert(subscriptionData, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            });

          if (error) throw error;

        }
        break;

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
        await sendPaymentFailedNotification(customer.email);
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

 