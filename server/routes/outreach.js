const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateColdEmail, generateLinkedInMessage } = require('../services/claude');
const { sendEmail } = require('../services/gmail');

function ensureOutreachTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      company TEXT,
      industry TEXT,
      city TEXT,
      website TEXT,
      linkedin TEXT,
      title TEXT,
      notes TEXT,
      email_count INTEGER DEFAULT 0,
      last_email_at DATETIME,
      replied INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_email TEXT NOT NULL,
      scheduled_for DATETIME NOT NULL,
      followup_number INTEGER NOT NULL,
      sent INTEGER DEFAULT 0,
      cancelled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

ensureOutreachTables();

// Generate email preview (no sending)
router.post('/email/generate', async (req, res) => {
  const { lead } = req.body;
  if (!lead || !lead.email) return res.status(400).json({ error: 'lead with email required' });

  try {
    const existing = db.prepare('SELECT email_count FROM outreach_leads WHERE email = ?').get(lead.email);
    const emailNumber = existing ? existing.email_count + 1 : 1;
    const email = await generateColdEmail(lead, emailNumber);
    res.json({ subject: email.subject, body: email.body, emailNumber });
  } catch (err) {
    console.error('[Outreach] Generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Send email + schedule follow-ups
router.post('/email/send', async (req, res) => {
  const { lead, subject, body } = req.body;
  if (!lead || !lead.email || !subject || !body) {
    return res.status(400).json({ error: 'lead, subject, and body required' });
  }

  try {
    await sendEmail({ to: lead.email, subject, body });

    // Upsert into outreach_leads
    const existing = db.prepare('SELECT id, email_count FROM outreach_leads WHERE email = ?').get(lead.email);
    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`UPDATE outreach_leads SET email_count = email_count + 1, last_email_at = ? WHERE email = ?`)
        .run(now, lead.email);
    } else {
      db.prepare(`INSERT INTO outreach_leads (name, email, company, industry, city, website, linkedin, title, notes, email_count, last_email_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`)
        .run(lead.name || '', lead.email, lead.company || '', lead.industry || '',
             lead.city || '', lead.website || '', lead.linkedin || '',
             lead.title || '', lead.notes || '', now);

      // Schedule 3-day follow-ups (up to 5)
      const insert = db.prepare(`INSERT INTO email_followups (lead_email, scheduled_for, followup_number) VALUES (?, ?, ?)`);
      const scheduleFollowUps = db.transaction(() => {
        for (let i = 1; i <= 5; i++) {
          const scheduledFor = new Date(Date.now() + i * 3 * 24 * 60 * 60 * 1000).toISOString();
          insert.run(lead.email, scheduledFor, i + 1);
        }
      });
      scheduleFollowUps();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Outreach] Send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Mark lead as replied (cancels follow-ups)
router.post('/email/replied', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  db.prepare(`UPDATE outreach_leads SET replied = 1 WHERE email = ?`).run(email);
  db.prepare(`UPDATE email_followups SET cancelled = 1 WHERE lead_email = ? AND sent = 0`).run(email);
  res.json({ success: true });
});

// Generate LinkedIn message
router.post('/linkedin', async (req, res) => {
  const { lead } = req.body;
  if (!lead) return res.status(400).json({ error: 'lead required' });
  try {
    const message = await generateLinkedInMessage(lead);
    res.json({ message });
  } catch (err) {
    console.error('[Outreach] LinkedIn error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get outreach status for a lead email
router.get('/status/:email', (req, res) => {
  const record = db.prepare('SELECT * FROM outreach_leads WHERE email = ?').get(req.params.email);
  res.json(record || { email_count: 0, replied: 0 });
});

module.exports = router;
