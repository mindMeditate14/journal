import nodemailer from 'nodemailer';
import logger from './logger.js';

let transporter = null;

/**
 * Initialize email transporter (uses VPS mail server)
 */
function initializeTransporter() {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    logger.warn('Email configuration incomplete. Emails will not be sent.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // TLS if port 587, SSL if port 465
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  logger.info(`📧 Email service initialized: ${smtpHost}:${smtpPort}`);
  return transporter;
}

/**
 * Send email
 */
async function send({ to, subject, html, text, from }) {
  try {
    const transport = initializeTransporter();

    if (!transport) {
      logger.warn(`Email not sent (no configuration): ${subject}`);
      return { success: false, error: 'Email service not configured' };
    }

    const mailOptions = {
      from: from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, ''),
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`📧 Email sent: ${subject} → ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`❌ Failed to send email: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Send bulk emails
 */
async function sendBulk(emails) {
  const results = [];

  for (const email of emails) {
    const result = await send(email);
    results.push(result);
  }

  return results;
}

/**
 * Test email configuration
 */
async function testConnection() {
  try {
    const transport = initializeTransporter();
    if (!transport) {
      return { success: false, error: 'Email service not configured' };
    }

    await transport.verify();
    logger.info('✅ Email service connection verified');
    return { success: true };
  } catch (error) {
    logger.error(`❌ Email service verification failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export default {
  send,
  sendBulk,
  testConnection,
};
