import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  );
}

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    
    // Get the profile with sender info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('sender')
      .single();

    if (profileError) {
      throw new Error('Failed to fetch profile');
    }

    // Find the sender credentials for the given email
    const sender = profile.sender?.find(s => 
      (typeof s === 'string' ? s === email : s.email === email)
    );

    if (!sender) {
      return NextResponse.json(
        { error: 'Sender credentials not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ sender });

  } catch (error) {
    console.error('Error getting sender credentials:', error);
    return NextResponse.json(
      { error: 'Failed to get sender credentials' },
      { status: 500 }
    );
  }
} 