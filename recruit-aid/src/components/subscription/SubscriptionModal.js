'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { toast } from 'sonner';

export function SubscriptionModal({ isOpen, onClose, jobCount, isTrialExpired = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please sign in to subscribe');
        router.push('/login');
        return;
      }

      // Create checkout session
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
      });

      const { url } = await response.json();

      if (!url) {
        throw new Error('Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to start subscription process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={isOpen} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {isTrialExpired ? 'Trial Period Ended' : 'Upgrade to Pro'}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <p className="text-muted mb-4">
          {isTrialExpired ? (
            <>
              Your trial period has ended. You currently have {jobCount} jobs.
              Upgrade to Pro to:
            </>
          ) : (
            <>
              You have reached the limit of 5 jobs on the free plan.
              Upgrade to Pro to:
            </>
          )}
        </p>

        <ul className="list-group mb-4">
          <li className="list-group-item">Create unlimited job postings</li>
          <li className="list-group-item">Access advanced candidate matching</li>
          <li className="list-group-item">Get priority support</li>
          <li className="list-group-item">Unlock premium features</li>
        </ul>

        <div className="card bg-light">
          <div className="card-body">
            <h5 className="card-title">Pro Plan</h5>
            <p className="h2 mb-2">$29/month</p>
            <p className="text-muted small">Cancel anytime</p>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <button 
          type="button" 
          className="btn btn-outline-secondary" 
          onClick={onClose}
        >
          Maybe Later
        </button>
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={handleSubscribe} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Processing...
            </>
          ) : 'Upgrade Now'}
        </button>
      </Modal.Footer>
    </Modal>
  );
} 