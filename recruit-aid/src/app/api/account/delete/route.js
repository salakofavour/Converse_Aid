import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const requestId = Date.now();
  console.log(`[${requestId}] Starting account deletion process`);
  
  try {
    // Verify CSRF protection
    const requestedWith = request.headers.get('x-requested-with');
    if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
      console.error(`[${requestId}] CSRF verification failed`);
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    // Create regular Supabase client for cookie handling
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

    // Create admin client with service role key specifically for user deletion
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY
    );

    // Get current user
    console.log(`[${requestId}] Fetching user details`);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error(`[${requestId}] User authentication failed:`, userError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.log(`[${requestId}] User authenticated successfully. User ID: ${user.id}`);

    // Check if user has an active subscription
    console.log(`[${requestId}] Checking for active subscription`);
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subscriptionError) {
      console.error(`[${requestId}] Error fetching subscription:`, subscriptionError);
    }

    // Handle Stripe subscription and customer deletion
    if (subscription) {
      console.log(`[${requestId}] Found active subscription. Processing Stripe cleanup`);
      try {
        if (subscription.stripe_subscription_id) {
          console.log(`[${requestId}] Deleting Stripe subscription: ${subscription.stripe_subscription_id}`);
          await stripe.subscriptions.del(subscription.stripe_subscription_id);
        }
        if (subscription.stripe_customer_id) {
          console.log(`[${requestId}] Deleting Stripe customer: ${subscription.stripe_customer_id}`);
          await stripe.customers.del(subscription.stripe_customer_id);
        }
      } catch (stripeError) {
        console.error(`[${requestId}] Stripe deletion error:`, stripeError);
        // Continue with account deletion even if Stripe cleanup fails
      }
    }

    // Delete all user data in Supabase
    console.log(`[${requestId}] Starting Supabase data deletion`);
    
    // First get all job IDs for this user
    console.log(`[${requestId}] Fetching user's jobs`);
    const { data: userJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('user_id', user.id);

    if (jobsError) {
      console.error(`[${requestId}] Error fetching jobs:`, jobsError);
    } else {
      console.log(`[${requestId}] Found ${userJobs?.length || 0} jobs`);
    }

    if (userJobs?.length > 0) {
      const jobIds = userJobs.map(job => job.id);
      console.log(`[${requestId}] Deleting applicants for jobs:`, jobIds);
      
      // Delete all applicants associated with user's jobs
      const { error: applicantsError } = await supabase
        .from('applicants')
        .delete()
        .in('job_id', jobIds);

      if (applicantsError) {
        console.error(`[${requestId}] Error deleting applicants:`, applicantsError);
      } else {
        console.log(`[${requestId}] Successfully deleted applicants for all jobs`);
      }
    }

    // Delete remaining user data in specific order
    console.log(`[${requestId}] Deleting jobs`);
    const { error: jobsDeleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('user_id', user.id);
    
    if (jobsDeleteError) {
      console.error(`[${requestId}] Error deleting jobs:`, jobsDeleteError);
    }

    console.log(`[${requestId}] Deleting subscription records`);
    const { error: subscriptionDeleteError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user.id);
    
    if (subscriptionDeleteError) {
      console.error(`[${requestId}] Error deleting subscription records:`, subscriptionDeleteError);
    }

    console.log(`[${requestId}] Deleting profile`);
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    
    if (profileDeleteError) {
      console.error(`[${requestId}] Error deleting profile:`, profileDeleteError);
    }

    // Use admin client for user deletion
    console.log(`[${requestId}] Deleting user account`);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error(`[${requestId}] Error deleting user account:`, deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      );
    }

    // Sign out the user
    console.log(`[${requestId}] Signing out user`);
    await supabase.auth.signOut();

    console.log(`[${requestId}] Account deletion completed successfully`);
    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted'
    });

  } catch (error) {
    console.error(`[${requestId}] Fatal error during account deletion:`, {
      error: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 