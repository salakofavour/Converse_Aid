import { getMessageHeaders, refreshAccessToken } from '@/lib/email';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

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
    const supabase = await createSupabaseServerClient();
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

    // Get the first sender's credentials
    const sender = profile.sender[0];
    if (!sender) {
      throw new Error('No sender configured');
    }

    // Check if token needs refresh (I am saving te access token in db in seconds, so I am converting date.now to seconds before comaprison.)
    const now = Math.floor(Date.now() / 1000);
    // const now = Date.now();
    let access_token = sender.access_token;
    
    if (now >= sender.access_expires_in) {
      // Token expired, refresh it
      const refreshResult = await refreshAccessToken(sender.email, sender.refresh_token);

      if (!refreshResult.success) {
        throw new Error('Failed to refresh access token');
      }
      access_token = refreshResult.access_token;
    }

    // Get message headers
    const result = await getMessageHeaders(gmailId, access_token);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({
      messageId: result.messageId,
      threadId: result.threadId,
      references: result.references,
      subject: result.subject,
      gmailId
    });

  } catch (error) {
    console.error('Error fetching Gmail message headers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message headers' },
      { status: 500 }
    );
  }
} 