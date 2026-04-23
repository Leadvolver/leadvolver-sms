const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendSMS } = require('../services/twilio');
const { scheduleFollowUpsForLead } = require('../services/scheduler');
const { buildSystemPrompt } = require('../services/openai');

router.get('/', (req, res) => {
  const config = db.prepare('SELECT * FROM campaign_config WHERE id = 1').get();
  res.json(config || {});
});

router.post('/save', (req, res) => {
  const {
    persona_name,
    company_name,
    goal,
    initial_message,
    followup_style,
    opt_out_keyword,
    include_opt_out_text
  } = req.body;

  db.prepare(`
    UPDATE campaign_config SET
      persona_name = ?,
      company_name = ?,
      goal = ?,
      initial_message = ?,
      followup_style = ?,
      opt_out_keyword = ?,
      include_opt_out_text = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(
    (persona_name || '').trim(),
    (company_name || '').trim(),
    goal || 'Book a Call',
    (initial_message || '').trim(),
    followup_style || 'Professional',
    (opt_out_keyword || 'STOP').trim(),
    include_opt_out_text ? 1 : 0
  );

  const config = db.prepare('SELECT * FROM campaign_config WHERE id = 1').get();
  res.json(config);
});

router.get('/preview', (req, res) => {
  const config = db.prepare('SELECT * FROM campaign_config WHERE id = 1').get();
  if (!config) return res.json({ prompt: '' });
  res.json({ prompt: buildSystemPrompt(config) });
});

router.post('/launch', async (req, res) => {
  const config = db.prepare('SELECT * FROM campaign_config WHERE id = 1').get();

  if (!config || !config.initial_message || !config.initial_message.trim()) {
    return res.status(400).json({ error: 'Please configure an initial message before launching.' });
  }

  const leads = db.prepare(
    `SELECT * FROM leads WHERE opted_out = 0 AND status IN ('Pending', 'Active')`
  ).all();

  if (leads.length === 0) {
    return res.status(400).json({ error: 'No eligible leads found. Import leads or check their status.' });
  }

  let sent = 0;
  let failed = 0;
  const errors = [];
  const now = new Date().toISOString();

  for (const lead of leads) {
    try {
      let message = config.initial_message
        .replace(/\{name\}/gi, lead.name)
        .replace(/\{job_type\}/gi, lead.job_type || 'your project')
        .replace(/\{quote_amount\}/gi, lead.quote_amount || '');

      if (config.include_opt_out_text) {
        const keyword = config.opt_out_keyword || 'STOP';
        message += `\n\nReply ${keyword} to unsubscribe.`;
      }

      await sendSMS(lead.phone, message);

      db.prepare(
        `INSERT INTO messages (lead_id, direction, content, sent_at) VALUES (?, 'outbound', ?, ?)`
      ).run(lead.id, message, now);

      db.prepare(`UPDATE leads SET status = 'Active' WHERE id = ?`).run(lead.id);

      db.prepare(
        `UPDATE follow_up_schedule SET cancelled = 1 WHERE lead_id = ? AND sent = 0 AND cancelled = 0`
      ).run(lead.id);

      scheduleFollowUpsForLead(lead.id, now);

      sent++;
    } catch (err) {
      console.error(`Launch: failed to send to ${lead.phone}:`, err.message);
      errors.push({ phone: lead.phone, error: err.message });
      failed++;
    }
  }

  res.json({ sent, failed, total: leads.length, errors: errors.slice(0, 5) });
});

module.exports = router;
