function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured. Set them in Settings.');
  }
  const twilio = require('twilio');
  return twilio(accountSid, authToken);
}

async function sendSMS(to, body) {
  const client = getClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new Error('Twilio phone number not configured. Set it in Settings.');
  }
  const message = await client.messages.create({ body, from, to });
  return message;
}

module.exports = { sendSMS };
