import { sendNewEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { from, to, subject, content, access_token } = await request.json();
    
    const result = await sendNewEmail({
      from,
      to,
      subject,
      content,
      access_token
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
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