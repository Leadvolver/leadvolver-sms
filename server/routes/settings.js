const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../../.env');

function readEnvFile() {
  try { return fs.readFileSync(ENV_PATH, 'utf8'); } catch { return ''; }
}

function writeEnvVar(content, key, value) {
  const escaped = value.replace(/\n/g, '\\n');
  const lines = content.split('\n');
  let found = false;

  const updated = lines.map(line => {
    if (/^\s*#/.test(line)) return line;
    const match = line.match(/^([A-Z_]+)\s*=/);
    if (match && match[1] === key) {
      found = true;
      return `${key}=${escaped}`;
    }
    return line;
  });

  if (!found) updated.push(`${key}=${escaped}`);
  return updated.filter((l, i, arr) => l !== '' || i === arr.length - 1).join('\n');
}

function mask(value, last = 4) {
  if (!value) return '';
  if (value.length <= last) return '***';
  return '***' + value.slice(-last);
}

router.get('/', (req, res) => {
  res.json({
    twilio_account_sid: mask(process.env.TWILIO_ACCOUNT_SID),
    twilio_auth_token: process.env.TWILIO_AUTH_TOKEN ? '***masked***' : '',
    twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || '',
    openai_api_key: mask(process.env.OPENAI_API_KEY, 6)
  });
});

router.post('/save', (req, res) => {
  const { twilio_account_sid, twilio_auth_token, twilio_phone_number, openai_api_key } = req.body;

  const updates = {
    TWILIO_ACCOUNT_SID: twilio_account_sid,
    TWILIO_AUTH_TOKEN: twilio_auth_token,
    TWILIO_PHONE_NUMBER: twilio_phone_number,
    OPENAI_API_KEY: openai_api_key
  };

  let content = readEnvFile();

  for (const [key, val] of Object.entries(updates)) {
    if (!val || !val.trim() || val.includes('***')) continue;
    content = writeEnvVar(content, key, val.trim());
    process.env[key] = val.trim();
  }

  try {
    fs.writeFileSync(ENV_PATH, content.endsWith('\n') ? content : content + '\n');
    res.json({ success: true, message: 'Settings saved. API keys are active immediately.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not write .env file: ' + err.message });
  }
});

router.post('/test-sms', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  try {
    const { sendSMS } = require('../services/twilio');
    await sendSMS(phone.trim(), 'Test message from your Lead Reactivation Platform — everything is working correctly!');
    res.json({ success: true, message: `Test SMS sent to ${phone}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
