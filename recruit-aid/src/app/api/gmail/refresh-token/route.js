import { createServerClient } from '@supabase/ssr';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

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
    const { refresh_token, email } = await request.json();

    if (!refresh_token || !email) {
      return NextResponse.json(
        { error: 'Refresh token and email are required' },
        { status: 400 }
      );
    }

    // Set the refresh token
    oauth2Client.setCredentials({
      refresh_token: refresh_token
    });

    // Get new access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    const { access_token, expiry_date } = credentials;

    // Update the sender info in the profiles table
    const supabase = await createServerSupabaseClient();
    //Get authenticated user Id
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error('Failed to get authenticated user');
    const userId = user.id;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('sender')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch profile');
    }

    // Update the sender's access token and expiry
    const updatedSender = profile.sender.map(sender => 
      sender.email === email 
        ? {
            ...sender,
            access_token,
            access_expires_in: expiry_date
          }
        : sender
    );

    console.log("Updated sender", updatedSender);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ sender: updatedSender })
      .eq('id', userId)
      .single();

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    return NextResponse.json({ 
      success: true,
      access_token,
      access_expires_in: expiry_date
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
} 