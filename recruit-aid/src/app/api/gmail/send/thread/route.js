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

    // Track failed recipients
    const failedRecipients = [];
    const successfulRecipients = [];

    // Send to each recipient individually
    for (const recipient of to) {
      try {
        // Validate thread information
        if (!recipient.overall_message_id) {
          throw new Error('Missing thread information. cannot start thread without sending at least one message');
        }

        // Personalize content for this recipient
        const personalizedContent = content.replaceAll('{{recipientName}}', recipient.name || 'Candidate');

        let references = ''; //the logic here is the referenceId is the messageId of all previous messages. If i had taken previous 
        // messages through the agent, it would be saved in the db, if it is not in db, then there has been only one meessage(the original one from the user)
        //the message id of that has been saved, so the referenceId is the messageId of the previous message.
        let subject ="";
        if(recipient.referenceId){
          references = recipient.referenceId;
        }else{
          references = recipient.messageId;
        }
        if(recipient.subject){
          subject = recipient.subject.startsWith("Re:") ? recipient.subject : "Re: " + recipient.subject;
        }else{
          subject = "Re: Job Application";
        }

        // Create individual email content with threading headers
        const emailHeaders = [
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `From: ${from}`,
          `To: ${recipient.email}`,
          `Subject: ${subject}`,
          `References: ${references}`,
          `In-Reply-To: ${recipient.messageId}`,
          '',
          personalizedContent
        ].join('\r\n');

        // Encode the email
        const encodedEmail = Buffer.from(emailHeaders)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        // Send the email
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedEmail,
            threadId: recipient.threadId
          }
        });

        successfulRecipients.push({
          id: recipient.id,
          email: recipient.email,
          gmailId: response.data.id
        });
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        failedRecipients.push({
          email: recipient.email,
          name: recipient.name,
          error: error.message
        });
      }
    }

    // Return response based on success/failure
    if (failedRecipients.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'All emails sent successfully',
        successCount: successfulRecipients.length,
        successfulRecipients
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
        message: 'Some emails were sent successfully',
        successCount: successfulRecipients.length,
        successfulRecipients,
        failedRecipients
      });
    }

  } catch (error) {
    console.error('Error in email sending process:', error);
    return NextResponse.json(
      { error: 'Failed to process email sending request', details: error.message },
      { status: 500 }
    );
  }
} 