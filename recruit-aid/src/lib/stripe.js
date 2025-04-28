import Stripe from 'stripe';

if (!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

 