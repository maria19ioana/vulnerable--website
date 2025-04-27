const nodemailer = require('nodemailer');

// Configure transporter
// For production, use actual SMTP credentials
// For development/testing, use ethereal.email for testing
let transporter;

async function createTransporter() {
  if (transporter) return transporter;

  // If environment variables are set for a real email service, use those
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Create a SMTP transporter with real credentials
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    console.log('Email configured with real SMTP service');
    return transporter;
  }
  
  // Otherwise, create a test account on ethereal.email for development
  console.log('No email configuration found, using ethereal test account');
  const testAccount = await nodemailer.createTestAccount();

  // Create a SMTP transporter object
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log('Email test account created:', testAccount.web);
  return transporter;
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body
 * @param {string} options.html - HTML email body
 * @returns {Promise<Object>} - Email send info
 */
async function sendEmail(options) {
  try {
    const emailTransporter = await createTransporter();
    const fromEmail = process.env.EMAIL_FROM || '"ClubConnect" <clubconnect@example.com>';
    
    const info = await emailTransporter.sendMail({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });

    console.log('Email sent:', info.messageId);
    
    // For test accounts, log the URL where the message can be viewed
    if (!process.env.EMAIL_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL:', previewUrl);
      // Add previewUrl to the info object for easier access
      info.previewUrl = previewUrl;
    }
    
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send a club invitation email
 * @param {Object} options - Invite options
 * @param {string} options.email - Recipient email address
 * @param {string} options.clubName - Name of the club
 * @param {string} options.inviteLink - Club invitation link
 * @param {string} options.role - Role being offered (member, admin, etc.)
 * @returns {Promise<Object>} - Email send info
 */
async function sendInviteEmail(options) {
  const text = `
Hello!

You've been invited to join the club "${options.clubName}" on ClubConnect as a ${options.role}.

Click the link below to accept the invitation:
${options.inviteLink}

This invite link will expire in 7 days.

Best regards,
The ClubConnect Team
  `;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4a6ee0;">Club Invitation</h2>
  <p>Hello!</p>
  <p>You've been invited to join the club <strong>"${options.clubName}"</strong> on ClubConnect as a <strong>${options.role}</strong>.</p>
  
  <div style="margin: 30px 0; text-align: center;">
    <a href="${options.inviteLink}" style="background-color: #4a6ee0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
      Accept Invitation
    </a>
  </div>
  
  <p>Or copy and paste this link in your browser:</p>
  <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">
    ${options.inviteLink}
  </p>
  
  <p style="color: #666; font-size: 0.9em;">This invite link will expire in 7 days.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 0.8em;">
    Best regards,<br>
    The ClubConnect Team
  </p>
</div>
  `;

  return sendEmail({
    to: options.email,
    subject: `Invitation to join ${options.clubName} on ClubConnect`,
    text,
    html
  });
}

module.exports = {
  sendEmail,
  sendInviteEmail
}; 