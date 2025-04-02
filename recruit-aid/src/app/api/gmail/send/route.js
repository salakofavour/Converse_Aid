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

    // Create email content
    const emailContent = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `From: ${from}`,
      `To: ${to.map(recipient => recipient.email).join(', ')}`,
      'Subject: ' + (subject || 'No Subject'),
      '',
      content
    ].join('\r\n');

    // Encode the email
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Track failed recipients
    const failedRecipients = [];

    try {
      // Send the email
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      failedRecipients.push(...to.map(recipient => recipient.name));
    }

    // Return response based on success/failure
    if (failedRecipients.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'Email sent successfully'
      });
    } else if (failedRecipients.length === to.length) {
      return NextResponse.json(
        { 
          error: 'Failed to send email to all recipients',
          failedRecipients 
        },
        { status: 500 }
      );
    } else {
      return NextResponse.json({ 
        success: true,
        message: 'Email sent with some failures',
        failedRecipients
      });
    }

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 