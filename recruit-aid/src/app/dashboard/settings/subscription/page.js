'use client';

import { CancellationWarningModal } from '@/components/modals/CancellationWarningModal';
import { createBrowserClient } from '@supabase/ssr';
import { redirect, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [jobCount, setJobCount] = useState(0);
  const [user, setUser] = useState(null);
  const [showCancellationWarning, setShowCancellationWarning] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Handle Stripe redirect results
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('setup_success') === 'true') {
      toast.success('Payment method setup successful');
      // Remove the query parameters
      window.history.replaceState({}, '', window.location.pathname);
    } else if (searchParams.get('setup_canceled') === 'true') {
      toast.info('Payment method setup cancelled');
      // Remove the query parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load subscription data
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          return {
            redirect: {
              destination: '/signin',
              permanent: false,
            },
          };
        }

        setUser(user);

        // Get subscription status and job count
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select(`
            status,
            trial_start,
            trial_end,
            subscription_end,
            stripe_customer_id
          `)
          .eq('user_id', user.id)
          .single();

        // Get job count
        const { count: jobCountData } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!subscription && !jobCountData) {
          redirect('/dashboard');
        }

        setSubscriptionData(subscription);
        setJobCount(jobCountData || 0);
      } catch (err) {
        console.error('Error loading subscription data:', err);
        setError('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSubscriptionAction = async (action) => {
    if (action === 'cancel' && jobCount > 5) {
      setShowCancellationWarning(true);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/subscriptions/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} subscription`);
      }

      // Handle successful response
      if (data.url) {
        // If we have a URL, redirect to Stripe
        window.location.href = data.url;
      } else if (data.success) {
        // If successful but no URL (e.g., cancellation), refresh the page
        toast.success(action === 'cancel' ? 'Subscription cancelled' : 'Trial started successfully');
        router.refresh();
      }
    } catch (err) {
      console.error(`Error ${action}ing subscription:`, err);
      toast.error(`Failed to ${action} subscription`);
    } finally {
      setLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to access billing portal');
      }

      // Redirect to Stripe Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error accessing billing portal:', err);
      toast.error('Failed to access billing portal');
    } finally {
      setLoading(false);
    }
  };

  const handleCancellationConfirm = () => {
    setShowCancellationWarning(false);
    handleSubscriptionAction('cancel');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)] text-red-500">
        {error}
      </div>
    );
  }

  const isSubscribed = subscriptionData?.status === 'active';
  const isTrialing = subscriptionData?.status === 'trialing';
  const trialEnd = subscriptionData?.trial_end ? new Date(subscriptionData.trial_end) : null;
  const subscriptionEnd = subscriptionData?.subscription_end ? new Date(subscriptionData.subscription_end) : null;
  const hasStripeAccount = !!subscriptionData?.stripe_customer_id;

  // Calculate days remaining for trial or subscription
  const now = new Date();
  let daysRemaining = null;
  if (isTrialing && trialEnd) {
    daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } else if (isSubscribed && subscriptionEnd) {
    daysRemaining = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CancellationWarningModal 
        isOpen={showCancellationWarning}
        onClose={() => setShowCancellationWarning(false)}
        onConfirm={handleCancellationConfirm}
        jobCount={jobCount}
      />

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-gray-600 mt-2">Select the plan that best fits your needs</p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-start gap-8 mb-12">
          {/* Free Plan */}
          <div className="flex-1 w-full md:max-w-md p-8 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Free Plan</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <span className="mr-3 text-green-500">✓</span>
                Up to 5 jobs
              </li>
              <li className="flex items-center">
                <span className="mr-3 text-green-500">✓</span>
                Basic features
              </li>
            </ul>
            <p className="text-3xl font-bold mb-4">$0/month</p>
          </div>

          {/* Pro Plan */}
          <div className="flex-1 w-full md:max-w-md p-8 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Pro Plan</h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <span className="mr-3 text-green-500">✓</span>
                Unlimited jobs
              </li>
              <li className="flex items-center">
                <span className="mr-3 text-green-500">✓</span>
                Priority Support
              </li>
              <li className="flex items-center">
                <span className="mr-3 text-green-500">✓</span>
                All features included
              </li>
              {isTrialing && trialEnd && (
                <li className="text-sm text-gray-600 mt-4">
                  Trial ends in {daysRemaining} days ({trialEnd.toLocaleDateString()})
                </li>
              )}
              {isSubscribed && subscriptionEnd && (
                <li className="text-sm text-gray-600 mt-4">
                  Renews in {daysRemaining} days ({subscriptionEnd.toLocaleDateString()})
                </li>
              )}
            </ul>
            <p className="text-3xl font-bold mb-4">$10/month</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center mb-12">
          {isSubscribed ? (
            <button 
              onClick={() => handleSubscriptionAction('cancel')}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Cancel Subscription'}
            </button>
          ) : (
            <button 
              onClick={() => handleSubscriptionAction('create-checkout')}
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isTrialing ? 'Upgrade to Pro' : 'Start 14-Day Free Trial')}
            </button>
          )}
          {hasStripeAccount && (
            <button
              className="ml-4 px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={handleBillingPortal}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Manage Billing'}
            </button>
          )}
        </div>

        {/* Current Usage */}
        <div className="text-center text-gray-600">
          Current Usage: {jobCount} jobs
          {jobCount > 5 && !isSubscribed && !isTrialing && (
            <span className="text-red-500 ml-2">
              (Exceeds free plan limit)
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 