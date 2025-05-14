import { createSupabaseServerClient } from '@/lib/supabase-server';
import { google } from 'googleapis';

// Create an OAuth2 client
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Refreshes the access token for a given email using its refresh token
 * @param {string} email - The email address
 * @param {string} refresh_token - The refresh token
 * @returns {Promise<{ success: boolean, access_token?: string, error?: string }>}
 */
export async function refreshAccessToken(email, refresh_token) {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token });

    const { credentials } = await oauth2Client.refreshAccessToken();
    const { access_token, expiry_date } = credentials;

    //access_token  expiry time from this is in millisecond(access will be refreshed via the web_app to use & not checked against expiry date as it is only occasional and must not fail
    //but via the agent more frequently & since the agent deals with seconds I will convert the result of this to seconds before saving it in db
    const expiry_time_seconds = Math.floor(expiry_date / 1000);

    // Update the token in the database
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error('Failed to get authenticated user');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('sender')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error('Failed to fetch profile');

    const updatedSender = profile.sender.map(sender => 
      sender.email === email 
        ? {
            ...sender,
            access_token,
            access_expires_in: expiry_time_seconds
          }
        : sender
    );

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ sender: updatedSender })
      .eq('id', user.id);

    if (updateError) throw new Error('Failed to update profile');

    //since I refresh the access_token before i send a message when on web, the espiry time does not need to be converted back to milliseconds to use here
    return {
      success: true,
      access_token
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sends a new email to one or more recipients
 * @param {Object} params - The email parameters
 * @param {string} params.from - The sender's email address
 * @param {Array<{id: string, email: string, name?: string}>} params.to - The recipients
 * @param {string} params.subject - The email subject
 * @param {string} params.content - The HTML content of the email
 * @param {string} params.access_token - The Gmail API access token
 * @returns {Promise<{ success: boolean, successfulRecipients?: Array, failedRecipients?: Array, error?: string }>}
 */
export async function sendNewEmail({ from, to, subject, content, access_token }) {
  try {
    if (!from || !to || !content || !access_token) {
      throw new Error('Missing required fields');
    }

    if (to.length > 25) {
      throw new Error('Cannot send to more than 25 recipients at once');
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const successfulRecipients = [];
    const failedRecipients = [];

    for (const recipient of to) {
      try {
        const personalizedContent = content.replaceAll('{{recipient_Name}}', recipient.name || 'Candidate');

        const emailHeaders = [
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `From: ${from}`,
          `To: ${recipient.email}`,
          'Subject: ' + (subject || 'Conversation'),
          '',
          personalizedContent
        ].join('\r\n');

        const encodedEmail = Buffer.from(emailHeaders)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

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
        failedRecipients.push({
          email: recipient.email,
          name: recipient.name,
          error: error.message
        });
      }
    }

    return {
      success: true,
      successfulRecipients,
      failedRecipients
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sends a reply email in an existing thread
 * @param {Object} params - The email parameters
 * @param {string} params.from - The sender's email address
 * @param {Array<{id: string, email: string, name?: string, threadId: string, messageId: string, referenceId?: string, subject?: string}>} params.to - The recipients
 * @param {string} params.content - The HTML content of the email
 * @param {string} params.access_token - The Gmail API access token
 * @returns {Promise<{ success: boolean, successfulRecipients?: Array, failedRecipients?: Array, error?: string }>}
 */
export async function sendThreadReply({ from, to, content, access_token }) {
  try {
    if (!from || !to || !content || !access_token) {
      throw new Error('Missing required fields');
    }

    if (to.length > 25) {
      throw new Error('Cannot send to more than 25 recipients at once');
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const successfulRecipients = [];
    const failedRecipients = [];

    for (const recipient of to) {
      console.log("viewing each recipient", recipient)
      try {
        if (!recipient.overall_message_id) {
          throw new Error('Missing thread information');
        }

        const personalizedContent = content.replaceAll('{{recipient_Name}}', recipient.name || 'Candidate');

        const references = recipient.referenceId || recipient.messageId;
        const subject = recipient.subject?.startsWith("Re:") ? 
          recipient.subject : 
          "Re: " + (recipient.subject || "Conversation");

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

        const encodedEmail = Buffer.from(emailHeaders)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

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
        console.log("error in the send thread reply", error.message)
        failedRecipients.push({
          email: recipient.email,
          name: recipient.name,
          error: error.message
        });
      }
    }

    return {
      success: true,
      successfulRecipients,
      failedRecipients
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Gets email headers for a specific Gmail message
 * @param {string} gmailId - The Gmail message ID
 * @param {string} access_token - The Gmail API access token
 * @returns {Promise<{ success: boolean, messageId?: string, threadId?: string, references?: string, subject?: string, error?: string }>}
 */
export async function getMessageHeaders(gmailId, access_token) {
  try {
    if (!gmailId || !access_token) {
      throw new Error('Gmail ID and access token are required');
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: gmailId,
      format: 'metadata',
      metadataHeaders: ['Message-Id', 'References', 'Subject']
    });

    const headers = response.data.payload.headers;
    const messageId = headers.find(h => h.name === 'Message-Id')?.value || null;
    const references = headers.find(h => h.name === 'References')?.value || null;
    const subject = headers.find(h => h.name === 'Subject')?.value || null;
    const threadId = response.data.threadId || null;

    return {
      success: true,
      messageId,
      threadId,
      references,
      subject
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Starts the Gmail OAuth flow for adding a new sender email
 * @param {string} email - The email address to authenticate
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
 */
export async function startGmailAuth(email) {
  try {
    const oauth2Client = createOAuth2Client();
    const SCOPES = [process.env.GOOGLE_GMAIL_SCOPES];

    const state = Buffer.from(JSON.stringify({ 
      email, 
      timestamp: Date.now() 
    })).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: state,
      include_granted_scopes: true
    });

    return {
      success: true,
      url: authUrl
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handles the Gmail OAuth callback and saves the credentials
 * @param {string} code - The authorization code
 * @param {string} state - The state parameter from the OAuth flow
 * @returns {Promise<{ success: boolean, email?: string, message?: string, error?: string }>}
 */
export async function handleGmailAuthCallback(code, state) {
  try {
    if (!code || !state) {
      throw new Error('Code and state are required');
    }

    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    const { email, timestamp } = decodedState;

    // Check if state is expired (10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      throw new Error('Authorization request expired');
    }

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error('No refresh token received');
    }

    // Save the credentials to the user's profile
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('User not authenticated');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('sender')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error('Failed to fetch profile');

    const senderEmails = profile?.sender || [];
    const emailExists = senderEmails.some(sender => 
      (typeof sender === 'string' ? sender === email : sender.email === email)
    );

    if (emailExists) {
      throw new Error('Email already exists');
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        sender: [...senderEmails, { 
          email, 
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          access_expires_in: tokens.expiry_date,
          refresh_added_at: new Date().toISOString() 
        }]
      })
      .eq('id', user.id);

    if (updateError) throw new Error('Failed to update profile');

    // Fetch the updated profile
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('sender')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated profile:', fetchError);
      // Don't throw here, just return what we have
    }

    return {
      success: true,
      email,
      message: 'Email successfully connected',
      profile: updatedProfile
    };
  } catch (error) {
    console.error('Error in handleGmailAuthCallback:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 