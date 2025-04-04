import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function POST(request) {
  try {
    const { from, to, subject, content, access_token } = await request.json();

    if (!from || !to || !content || !access_token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check recipient limit
    if (to.length > 25) {
      return NextResponse.json(
        { error: 'Cannot send to more than 25 recipients at once' },
        { status: 400 }
      );
    }

    // Set up Gmail API
    oauth2Client.setCredentials({ access_token });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const successfulRecipients = [];
    const failedRecipients = [];

    // Send to each recipient individually
    for (const recipient of to) {
      try {
        // Create personalized content
        const personalizedContent = content.replace(
          /\{recipient\.name\}/g,
          recipient.name || ''
        );

        // Create email content
        const emailHeaders = [
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `From: ${from}`,
          `To: ${recipient.email}`,
          'Subject: ' + (subject || 'No Subject'),
          '',
          personalizedContent
        ].join('\r\n');

        const encodedEmail = Buffer.from(emailHeaders).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        // Send the email
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedEmail
          }
        });

        successfulRecipients.push({
          id: recipient.id,
          email: recipient.email,
          gmailId: response.data.id
        });
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        failedRecipients.push({
          email: recipient.email,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      successfulRecipients,
      failedRecipients
    });

  } catch (error) {
    console.error('Error in email sending process:', error);
    return NextResponse.json(
      { error: 'Failed to process email sending request', details: error.message },
      { status: 500 }
    );
  }
} 