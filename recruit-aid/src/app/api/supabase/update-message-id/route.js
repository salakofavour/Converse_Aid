import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { applicants } = await request.json();
    
    if (!applicants || !Array.isArray(applicants)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
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
          },
        },
      }
    );

    // Update each applicant's message_id and headers
    const updates = applicants.map(({ id, gmailId, messageId, threadId, references }) => 
      supabase
        .from('applicants')
        .update({
          message_id: messageId || null,
          thread_id: threadId || null,
          reference_id: references || null,
          response: null,
          overall_message_id: gmailId || null,
          body: null
        })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    
    // Check for any errors in the updates
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Errors updating applicants:', errors);
      return NextResponse.json(
        { error: 'Some updates failed', errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating message IDs:', error);
    return NextResponse.json(
      { error: 'Failed to update message IDs' },
      { status: 500 }
    );
  }
} 