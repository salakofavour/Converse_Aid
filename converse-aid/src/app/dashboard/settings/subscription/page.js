'use client';

import { fetchWithCSRF } from '@/lib/fetchWithCSRF';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function Subscription() {
  const [subscription, setSubscription] = useState(null);
  const [jobCount, setJobCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadSubscription();
    loadJobCount();
  }, []);

  const loadJobCount = async () => {
    try {
      const response = await fetchWithCSRF('/api/jobs/count');
      if (!response.ok) {
        throw new Error('Failed to load job count');
      }
      const data = await response.json();
      setJobCount(data.count || 0);
    } catch (err) {
      console.error('Error loading job count:', err);
      toast.error('Failed to load job count');
    }
  };

  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithCSRF('/api/subscriptions/check-subscription');
      if (!response.ok) {
        throw new Error('Failed to load subscription');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load subscription');
      }
      setSubscription(data.subscription);
    } catch (err) {
      console.error('Error loading subscription:', err);
      toast.error('Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setIsUpdating(true);
      console.log("hit create-checkout in page");
      const response = await fetchWithCSRF('/api/subscriptions/create-checkout', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      toast.error('Failed to create checkout session');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setIsUpdating(true);
      const response = await fetchWithCSRF('/api/subscriptions/portal', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('No portal URL returned');
      }

      // Redirect to Stripe Portal
      window.location.href = data.url;
    } catch (err) {
      console.error('Error creating portal session:', err);
      toast.error('Failed to open billing portal');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isSubscribed = subscription?.status === 'active';
  const isTrialing = subscription?.status === 'trialing';
  const hasNoSubscription = !subscription;
  const isCanceled = subscription?.status === 'canceled';
  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end) : null;
  const subscriptionEnd = subscription?.subscription_end ? new Date(subscription.subscription_end) : null;
  const hasStripeAccount = !!subscription?.stripe_customer_id;

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
                14 days free trial
              </li>
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
            <p className="text-3xl font-bold mb-4">$40/month</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center mb-12">
          {(hasNoSubscription || isCanceled) ? (
            <button 
              onClick={handleUpgrade}
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              disabled={isUpdating}
            >
              {isUpdating ? 'Processing...' : 'Upgrade to Pro'}
            </button>
          ) : (isSubscribed || isTrialing) && hasStripeAccount ? (
            <button
              className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={handleManageBilling}
              disabled={isUpdating}
            >
              {isUpdating ? 'Loading...' : 'Manage Billing'}
            </button>
          ) : null}
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