const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function normalizePhone(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\D/g, '');
  if (cleaned.length === 10) return '+1' + cleaned;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return '+' + cleaned;
  if (cleaned.length >= 7) return '+' + cleaned;
  return null;
}

function normalizeKey(key) {
  return key.toLowerCase().trim().replace(/[\s\-\/]+/g, '_');
}

router.post('/import', upload.single('csv'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const text = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '');

    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
      bom: true
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV is empty or has no data rows.' });
    }

    const insert = db.prepare(
      `INSERT OR IGNORE INTO leads (name, phone, job_type, quote_amount) VALUES (?, ?, ?, ?)`
    );

    let imported = 0;
    let skipped = 0;

    const run = db.transaction((rows) => {
      for (const raw of rows) {
        const row = {};
        for (const [k, v] of Object.entries(raw)) {
          row[normalizeKey(k)] = typeof v === 'string' ? v.trim() : v;
        }

        const phone = normalizePhone(
          row.phone || row.mobile || row.cell || row.phone_number || row.mobile_number || ''
        );

        if (!phone) { skipped++; continue; }

        const name = (
          row.name ||
          row.full_name ||
          ((row.first_name || '') + ' ' + (row.last_name || '')).trim() ||
          'Unknown'
        ).trim() || 'Unknown';

        const jobType = (
          row.job_type || row.jobtype || row.service || row.service_type || row.type || ''
        ).trim();

        const quoteAmount = (
          row.quote_amount || row.quote || row.amount || row.price || ''
        ).trim();

        const result = insert.run(name, phone, jobType, quoteAmount);
        if (result.changes > 0) imported++;
        else skipped++;
      }
    });

    run(records);

    res.json({ imported, skipped, total: records.length });
  } catch (err) {
    console.error('CSV import error:', err);
    res.status(500).json({ error: 'Failed to parse CSV: ' + err.message });
  }
});

router.get('/', (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.json(leads);
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
  const active = db.prepare(
    `SELECT COUNT(*) as c FROM leads WHERE status IN ('Active','Replied','Hot') AND opted_out = 0`
  ).get().c;
  const hot = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'Hot'`).get().c;
  const booked = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE status = 'Booked'`).get().c;
  res.json({ total, active, hot, booked });
});

router.patch('/:id/optout', (req, res) => {
  const { id } = req.params;
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const newOptOut = lead.opted_out ? 0 : 1;
  const newStatus = newOptOut
    ? 'Opted Out'
    : (lead.status === 'Opted Out' ? 'Pending' : lead.status);

  db.prepare('UPDATE leads SET opted_out = ?, status = ? WHERE id = ?').run(newOptOut, newStatus, id);

  if (newOptOut) {
    const { cancelFollowUpsForLead } = require('../services/scheduler');
    cancelFollowUpsForLead(id);
  }

  res.json({ opted_out: newOptOut, status: newStatus });
});

router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['Pending', 'Active', 'Replied', 'Hot', 'Booked', 'Opted Out', 'Completed'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
  res.json({ status });
});

router.delete('/all', (req, res) => {
  db.prepare('DELETE FROM follow_up_schedule').run();
  db.prepare('DELETE FROM messages').run();
  db.prepare('DELETE FROM leads').run();
  res.json({ success: true });
});

module.exports = router;
