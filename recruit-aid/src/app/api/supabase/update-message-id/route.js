import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { members } = await request.json();
    
    if (!members || !Array.isArray(members)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient();

    // Update each applicant's message_id and headers
    const updates = members.map(({ id, gmailId, messageId, threadId, references, subject }) => 
      supabase
        .from('members')
        .update({
          message_id: messageId || null,
          subject: subject || null,
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
      console.error('Errors updating members:', errors);
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