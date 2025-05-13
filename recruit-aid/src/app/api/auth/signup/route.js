import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    });

    if (error) {
      console.error('Error signing up:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create initial profile for the new user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        name: data.user.user_metadata?.name || email.split('@')[0] || '',
        email: email,
        timezone: 'America/New_York', // Default timezone
        sender: [] // Initialize with empty array
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating initial profile:', profileError);
      // Don't return error here as the user was created successfully
      // The profile can be created later if needed
    }

    return NextResponse.json({ 
      success: true,
      profile: profile || null
    });
  } catch (error) {
    console.error('Error in signup route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 