import { google } from 'googleapis';

// Create an OAuth2 client
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Create a Gmail service with the given refresh token
export function createGmailService(refreshToken) {
  const oauth2Client = createOAuth2Client();
  
  // Set credentials using the refresh token
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
  
  // Create and return the Gmail service
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Send an email using the Gmail API
export async function sendEmail(refreshToken, { to, subject, body }) {
  try {
    const gmail = createGmailService(refreshToken);
    
    // Create the email content
    const emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ].join('\r\n');
    
    // Encode the email content
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send the email
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });
    
    return { success: true, messageId: res.data.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Verify that the refresh token is valid
export async function verifyRefreshToken(refreshToken) {
  try {
    const oauth2Client = createOAuth2Client();
    
    // Set credentials using the refresh token
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    // Try to get a new access token
    const { token } = await oauth2Client.getAccessToken();
    
    return { valid: !!token };
  } catch (error) {
    console.error('Error verifying refresh token:', error);
    return { valid: false, error: error.message };
  }
} 