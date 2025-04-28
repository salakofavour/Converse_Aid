import { sendThreadReply } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { from, to, content, access_token } = await request.json();
    
    const result = await sendThreadReply({
      from,
      to,
      content,
      access_token
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    if (result.failedRecipients?.length === to.length) {
      return NextResponse.json(
        { 
          error: 'Failed to send email to all recipients',
          failedRecipients: result.failedRecipients 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: result.failedRecipients?.length ? 
        'Some emails were sent successfully' : 
        'All emails sent successfully',
      successCount: result.successfulRecipients.length,
      successfulRecipients: result.successfulRecipients,
      failedRecipients: result.failedRecipients
    });

  } catch (error) {
    console.error('Error in email sending process:', error);
    return NextResponse.json(
      { error: 'Failed to process email sending request' },
      { status: 500 }
    );
  }
} 