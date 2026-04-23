const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendSMS } = require('../services/twilio');

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT
      l.id, l.name, l.phone, l.status, l.opted_out, l.ai_paused,
      last_msg.content  AS last_message,
      last_msg.sent_at  AS last_activity,
      last_msg.direction AS last_direction
    FROM leads l
    JOIN (
      SELECT lead_id, content, sent_at, direction
      FROM messages
      WHERE id IN (
        SELECT MAX(id) FROM messages GROUP BY lead_id
      )
    ) last_msg ON last_msg.lead_id = l.id
    WHERE EXISTS (
      SELECT 1 FROM messages WHERE lead_id = l.id AND direction = 'inbound'
    )
    ORDER BY last_msg.sent_at DESC
  `).all();

  res.json(rows);
});

router.get('/:leadId', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const messages = db.prepare(
    `SELECT * FROM messages WHERE lead_id = ? ORDER BY sent_at ASC`
  ).all(req.params.leadId);

  res.json({ lead, messages });
});

router.post('/:leadId/reply', async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    await sendSMS(lead.phone, content.trim());
    db.prepare(
      `INSERT INTO messages (lead_id, direction, content) VALUES (?, 'outbound', ?)`
    ).run(lead.id, content.trim());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send SMS: ' + err.message });
  }
});

router.post('/:leadId/book', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  db.prepare(`UPDATE leads SET status = 'Booked' WHERE id = ?`).run(lead.id);
  db.prepare(
    `UPDATE follow_up_schedule SET cancelled = 1 WHERE lead_id = ? AND sent = 0 AND cancelled = 0`
  ).run(lead.id);

  res.json({ success: true, status: 'Booked' });
});

router.post('/:leadId/takeover', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.leadId);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const newPaused = lead.ai_paused ? 0 : 1;
  db.prepare('UPDATE leads SET ai_paused = ? WHERE id = ?').run(newPaused, lead.id);

  res.json({ ai_paused: newPaused });
});

module.exports = router;
