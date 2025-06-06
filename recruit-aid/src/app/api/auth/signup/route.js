import { sendWelcomeEmail } from '@/lib/notifications';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log("hit signup route");
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.PUBLIC_APP_URL}/auth/callback`
      }
    });

    console.log("complete signup route");

    if (error) {
      console.error('Error signing up:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Send welcome email
    await sendWelcomeEmail(email); //No checking error here because it's not a critical error & regardless of sending or not, the user will be created

    return NextResponse.json({ 
      success: true,
    });
  } catch (error) {
    console.error('Error in signup route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 