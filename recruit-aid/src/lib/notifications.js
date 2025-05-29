import { Resend } from 'resend';

const resend = new Resend(process.env.NEXT_RESEND_API_KEY);



export async function sendPaymentFailedNotification(userEmail) {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: userEmail,
      subject: 'Subscription Payment Failed - Action Required',
      html: `
        <h2>Payment Failed for Your Converse-Aid Subscription</h2>
        <p>We were unable to process your payment for your Converse-Aid subscription.</p>
        <p>Please update your payment information to renew access to all Pro features. If your payment is not updated within 3 days, your subscription will be canceled and any jobs exceeding the 5-job limit will be deleted.</p>
        <p>To update your payment information:</p>
        <ol>
          <li>Log in to your Converse-Aid account</li>
          <li>Go to Settings > Preferences</li>
          <li>Click on "View Plans" and then "Manage Subscription"</li>
          <li>Update your payment details</li>
        </ol>
        <p>If you need assistance, please don't hesitate to contact our support team.</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send payment failure notification:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(userEmail) {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: userEmail,
      subject: 'Welcome to Converse-Aid',
      html: `
        <h2>Welcome to Converse-Aid</h2>
        <p>Thank you for signing up for Converse-Aid. We're excited to have you on board!</p>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      `
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}