import sgMail from '@sendgrid/mail';

// Only set API key if it exists and is valid
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey && apiKey.startsWith('SG.')) {
  sgMail.setApiKey(apiKey);
  console.log('✅ SendGrid configured');
} else {
  console.warn('⚠️  SendGrid API key not configured - email notifications will be disabled');
}

export async function sendPasswordResetEmail(to, resetUrl) {
  if (!apiKey || !apiKey.startsWith('SG.')) {
    console.warn('SendGrid not configured, skipping password reset email');
    return { success: false, error: 'Email service not configured' };
  }
  
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
  
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid email error:', error.response?.body || error.message);
    return { success: false, error: error.message };
  }
}

export async function sendAnnouncementEmail(to, teacherName, className, message, announcementUrl) {
  if (!apiKey || !apiKey.startsWith('SG.')) {
    console.warn('SendGrid not configured, skipping announcement email');
    return { success: false, error: 'Email service not configured' };
  }
  
  // Escape HTML in user-generated content to prevent email rendering issues
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  const escapedTeacherName = teacherName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  const msg = {
    to,
    from: {
      email: process.env.EMAIL_USER || 'no-reply@ccsgoals.me',
      name: 'CCS Goals Classroom'
    },
    replyTo: process.env.EMAIL_USER || 'no-reply@ccsgoals.me',
    subject: `📢 New Announcement in ${className}`,
    
    // Plain text version (important for spam filters)
    text: `
New Class Announcement

${teacherName} posted a new announcement in ${className}:

"${message}"

View in Stream: ${announcementUrl}

---
You're receiving this email because you're enrolled in ${className}.
If you have any questions, please contact your teacher.

CCS Goals Classroom
    `.trim(),
    
    // HTML version
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Announcement in ${className}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #a30c0c 0%, #780606 100%); color: #ffffff; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">📢 New Class Announcement</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="font-size: 16px; color: #333333; line-height: 1.5; margin: 0 0 20px 0;">
                <strong style="color: #a30c0c;">${escapedTeacherName}</strong> posted a new announcement in <strong>${className}</strong>:
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #a30c0c; border-radius: 4px;">
                    <p style="font-size: 15px; color: #495057; line-height: 1.6; margin: 0; white-space: pre-wrap; word-wrap: break-word;">${escapedMessage}</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0 20px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${announcementUrl}" style="display: inline-block; background-color: #a30c0c; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 40px; border-radius: 30px; box-shadow: 0 4px 6px rgba(163,12,12,0.2);">
                      View in Stream
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; border-top: 1px solid #e9ecef;">
              <p style="font-size: 13px; color: #6c757d; line-height: 1.5; margin: 0; text-align: center;">
                You're receiving this email because you're enrolled in <strong>${className}</strong>.
              </p>
              <p style="font-size: 12px; color: #adb5bd; line-height: 1.5; margin: 10px 0 0 0; text-align: center;">
                CCS Goals Classroom • Important Class Communication
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    
    // Anti-spam settings
    categories: ['classroom', 'announcement', 'education'],
    customArgs: {
      class: className,
      type: 'announcement'
    },
    
    // Email tracking (helps with deliverability)
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    },
    
    // Priority header (marks as important)
    headers: {
      'Priority': 'high',
      'Importance': 'high',
      'X-Priority': '1',
      'X-MSMail-Priority': 'High'
    }
  };
  
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid email error:', error.response?.body || error.message);
    return { success: false, error: error.message };
  }
}

// Batch send announcement emails to multiple students
export async function sendBulkAnnouncementEmails(students, teacherName, className, message, announcementUrl) {
  const results = {
    sent: 0,
    failed: 0,
    errors: []
  };
  
  // Send emails in batches to avoid rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(student => 
      sendAnnouncementEmail(student.email, teacherName, className, message, announcementUrl)
        .then(result => {
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push({ email: student.email, error: result.error });
          }
        })
        .catch(err => {
          results.failed++;
          results.errors.push({ email: student.email, error: err.message });
        })
    );
    
    await Promise.all(promises);
    
    // Small delay between batches
    if (i + BATCH_SIZE < students.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

