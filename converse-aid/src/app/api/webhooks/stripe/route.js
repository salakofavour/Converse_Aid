import { stripe } from '@/lib/stripe';
import { handleWebhookEvent } from '@/lib/subscription';
import { NextResponse } from 'next/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Add this to exclude this route from authentication middleware
export const config = {
  matcher: []
}

export async function POST(req) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    const result = await handleWebhookEvent(event);
    
    if (!result.success) {
      throw new Error("Webhook error");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 