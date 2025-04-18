import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const PRICE_ID = process.env.STRIPE_PRICE_ID;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          async getAll() {
            return cookieStore.getAll();
          },
          async setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', session.user.id)
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
        email: session.user.email,
        metadata: {
          supabase_user_id: session.user.id
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
        supabase_user_id: session.user.id
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
        .eq('user_id', session.user.id);
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          user_id: session.user.id,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          status: 'trialing',
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString()
        });
    }

    return NextResponse.json({ 
      success: true,
      subscription: {
        id: subscription.id,
        status: 'trialing',
        trial_end: trialEnd.toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 