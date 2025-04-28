import { Resend } from 'resend';

const resend = new Resend(process.env.NEXT_RESEND_API_KEY);

// Send a notification to the user when their subscription is expiring is not implemented completely, the env var are not there and some hardcoded values are used instead should be in env
export async function sendSubscriptionNotification(email, daysUntilExpiry, jobCount) {
  try {
    await resend.emails.send({
      from: process.env.NEXT_FROM_EMAIL,
      to: email,
      subject: `Subscription Expiring in ${daysUntilExpiry} Days`,
      html: `
        <div>
          <h2>Your Converse-Aid Pro Subscription is Expiring Soon</h2>
          <p>Your subscription will expire in ${daysUntilExpiry} days. You currently have ${jobCount} active jobs.</p>
          <p>If you don't renew your subscription:</p>
          <ul>
            <li>You'll be limited to 5 jobs</li>
            <li>Any jobs beyond the 5 most recent will be deleted</li>
            <li>You'll lose access to premium features</li>
          </ul>
          <p>To keep all your jobs and maintain access to premium features, please renew your subscription.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/subscription" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Renew Subscription
          </a>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send subscription notification:', error);
  }
}

export async function sendPaymentFailedNotification(userEmail) {
  try {NEXT_
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: userEmail,
      subject: 'Payment Failed - Action Required',
      html: `
        <h2>Payment Failed for Your Converse-Aid Subscription</h2>
        <p>We were unable to process your payment for your Converse-Aid subscription.</p>
        <p>Please update your payment information to maintain access to all Pro features. If your payment is not updated within 7 days, your subscription will be canceled and any jobs exceeding the 5-job limit will be deleted.</p>
        <p>To update your payment information:</p>
        <ol>
          <li>Log in to your Converse-Aid account</li>
          <li>Go to Settings > Preferences</li>
          <li>Click on "Manage Subscription"</li>
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

// export async function sendSubscriptionEndingNotification(userEmail, daysRemaining, jobCount) {
//   try {
//     await resend.emails.send({
//       from: process.env.NEXT_FROM_EMAIL,
//       to: userEmail,
//       subject: `Subscription Ending in ${daysRemaining} Days`,
//       html: `
//         <h2>Your Converse-Aid Subscription is Ending Soon</h2>
//         <p>Your subscription will expire in ${daysRemaining} days.</p>
//         ${jobCount > 5 ? `
//         <p>You currently have ${jobCount} jobs. When your subscription expires, only your 5 most recent jobs will be retained. The remaining ${jobCount - 5} jobs will be permanently deleted.</p>
//         <p>To keep all your jobs and maintain access to Pro features, please renew your subscription:</p>
//         <ol>
//           <li>Log in to your Converse-Aid account</li>
//           <li>Go to Settings > Preferences</li>
//           <li>Click on "Renew Subscription"</li>
//         </ol>
//         ` : ''}
//         <p>If you need assistance, please don't hesitate to contact our support team.</p>
//       `,
//     });
//   } catch (error) {
//     console.error('Failed to send subscription ending notification:', error);
//     throw error;
//   }
// } 