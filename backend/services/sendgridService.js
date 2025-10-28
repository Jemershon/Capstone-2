import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendPasswordResetEmail(to, resetUrl) {
  const msg = {
    to,
    from: process.env.EMAIL_USER || 'no-reply@ccsgoals.me',
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };
  return sgMail.send(msg);
}
