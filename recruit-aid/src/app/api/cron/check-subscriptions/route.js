import { fetchWithCSRF } from '@/lib/fetchWithCSRF';
import { sendSubscriptionNotification } from '@/lib/notifications';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function cleanupExcessJobs(supabase, userId) {
  // Get all jobs for user, ordered by created_at desc
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, namespace_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!jobs || jobs.length <= 5) return;

  // Keep only the 5 most recent jobs
  const jobsToDelete = jobs.slice(5);

  // Delete excess jobs from Pinecone
  for (const job of jobsToDelete) {
    if (job.namespace_id) {
      try {
        await fetchWithCSRF('/api/pinecone/delete-namespace', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ namespaceId: job.namespace_id }),
        });
      } catch (error) {
        console.error(`Failed to delete Pinecone namespace for job ${job.id}:`, error);
        // Continue with other deletions even if one fails
      }
    }
  }

  // Delete from Supabase
  await supabase
    .from('jobs')
    .delete()
    .in('id', jobsToDelete.map(job => job.id));
}

export async function GET(request) {
  try {
    // Verify CRON secret to ensure this is a legitimate request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient();

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
      .in('status', ['active', 'trialing']);

    if (!subscriptions) return NextResponse.json({ success: true });

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
          .update({ status: 'expired' })
          .eq('id', subscription.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 