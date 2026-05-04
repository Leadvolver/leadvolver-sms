const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, ''),
    },
  });
}

async function sendEmail({ to, subject, body }) {
  const transporter = createTransporter();
  const html = body.replace(/\n/g, '<br>');

  const info = await transporter.sendMail({
    from: `"LeadVolver" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: body,
    html,
  });

  return info.messageId;
}

async function testConnection() {
  const transporter = createTransporter();
  await transporter.verify();
  return true;
}

module.exports = { sendEmail, testConnection };
