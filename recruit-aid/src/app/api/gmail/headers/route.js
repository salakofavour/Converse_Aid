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

export async function GET(request) {
  try {
    // Get gmail-id from URL params
    const { searchParams } = new URL(request.url);
    const gmailId = searchParams.get('gmailId');

    if (!gmailId) {
      return NextResponse.json(
        { error: 'gmail-id parameter is required' },
        { status: 400 }
      );
    }

    // Get authenticated user and their profile
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error('Failed to get authenticated user');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('sender')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch profile');
    }

    // Get the first sender's credentials (assuming the first sender is the active one)
    const sender = profile.sender[0];
    if (!sender) {
      throw new Error('No sender configured');
    }

    // Check if token needs refresh
    const now = Date.now();
    if (now >= sender.access_expires_in) {
      // Token expired, refresh it
      oauth2Client.setCredentials({
        refresh_token: sender.refresh_token
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      const { access_token, expiry_date } = credentials;

      // Update the sender's access token and expiry
      const updatedSender = profile.sender.map(s => 
        s.email === sender.email 
          ? { ...s, access_token, access_expires_in: expiry_date }
          : s
      );

      await supabase
        .from('profiles')
        .update({ sender: updatedSender })
        .eq('id', user.id);

      // Use the new access token
      oauth2Client.setCredentials({ access_token });
    } else {
      // Use existing access token
      oauth2Client.setCredentials({ access_token: sender.access_token });
    }

    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get message headers
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: gmailId,
      format: 'metadata',
      metadataHeaders: ['Message-Id', 'References']
    });

    // Extract headers
    const headers = response.data.payload.headers;
    const messageId = headers.find(h => h.name === 'Message-Id')?.value || null;
    const references = headers.find(h => h.name === 'References')?.value || null;
    const threadId = response.data.threadId || null;

    return NextResponse.json({
      messageId,
      threadId,
      references,
      gmailId
    });

  } catch (error) {
    console.log('Error fetching Gmail message headers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message headers' },
      { status: 500 }
    );
  }
} 