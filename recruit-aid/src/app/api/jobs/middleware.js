import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function checkJobLimit(userId) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();

  // Check subscription status
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single();

  // Get job count
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const isSubscribed = data?.status === 'active' || data?.status === 'trialing';

  // If not subscribed and has more than 5 jobs, prevent creation
  if (!isSubscribed && count >= 5) {
    return NextResponse.json(
      { error: 'Free plan limited to 5 jobs. Please upgrade to create more jobs.' },
      { status: 403 }
    );
  }

  return {
    allowed: true
  };
} 