import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const PRICE_ID = process.env.STRIPE_PRICE_ID;

export async function POST(request) {
  try {
    // Verify CSRF protection
    const requestedWith = request.headers.get('x-requested-with');
    if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();

    if (existingSubscription?.status === 'active' || existingSubscription?.status === 'trialing') {
      return NextResponse.json(
        { error: 'Already have an active subscription' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId;
    if (existingSubscription?.stripe_customer_id) {
      stripeCustomerId = existingSubscription.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      });
      stripeCustomerId = customer.id;
    }

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: PRICE_ID }],
      trial_period_days: 14,
      metadata: {
        supabase_user_id: user.id
      }
    });

    // Create or update subscription record
    const now = new Date();
    const trialEnd = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days from now

    if (existingSubscription) {
      await supabase
        .from('subscriptions')
        .update({
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          status: 'trialing',
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString()
        })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          status: 'trialing',
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString()
        });
    }

    // Create a Stripe checkout session for payment method setup
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription?setup_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription?setup_canceled=true`,
    });

    return NextResponse.json({ 
      success: true,
      subscription: {
        id: subscription.id,
        status: 'trialing',
        trial_end: trialEnd.toISOString()
      },
      url: session.url // Include the checkout URL for payment method setup
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 