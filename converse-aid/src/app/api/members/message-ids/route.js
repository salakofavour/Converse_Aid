 
import { validateCSRFToken } from '@/lib/csrf';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const csrfError = await validateCSRFToken(request);
    if (csrfError) {
      return NextResponse.json({ error: csrfError }, { status: 403 });
    }

    const { updates } = await request.json();
    
    if (!updates) {
      return NextResponse.json(
        { error: ' data is missing' },
        { status: 400 }
      );
    }
    console.log("checking info to update in message-id", updates)


    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const successfulUpdates = [];
    const failedUpdates = [];
    // Update message IDs for each member
    updates.forEach(async (update) => {
    const { data, error } = await supabase
    .from('members')
    .update({
      thread_id: update.threadId,
      message_id: update.messageId,
      overall_message_id: update.gmailId,
      reference_id: update.references
    })
    .eq('id', update.id);

    if (error) {
      failedUpdates.push({
        id: update.id,
        error: error.message
      });
    } else {
      successfulUpdates.push({
        id: update.id,
        message: 'Message IDs updated successfully'
      });
    }
  });

    return NextResponse.json({
      successfulUpdates,
      failedUpdates
    });
  } catch (error) {
    console.error('Error in member message IDs update route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 