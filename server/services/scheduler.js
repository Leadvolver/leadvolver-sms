const cron = require('node-cron');
const db = require('../db');

let isRunning = false;

function startScheduler() {
  cron.schedule('* * * * *', async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await processFollowUps();
    } catch (err) {
      console.error('[Scheduler] Error:', err.message);
    } finally {
      isRunning = false;
    }
  });
  console.log('[Scheduler] Follow-up scheduler started (checks every minute)');
}

async function processFollowUps() {
  const { sendSMS } = require('./twilio');
  const { generateFollowUp } = require('./openai');

  const now = new Date().toISOString();

  const due = db.prepare(`
    SELECT fs.id as schedule_id, fs.message_number,
           l.id as lead_id, l.name, l.phone, l.job_type, l.quote_amount, l.status, l.opted_out
    FROM follow_up_schedule fs
    JOIN leads l ON fs.lead_id = l.id
    WHERE fs.scheduled_for <= ?
      AND fs.sent = 0
      AND fs.cancelled = 0
      AND l.opted_out = 0
    ORDER BY fs.scheduled_for ASC
  `).all(now);

  for (const item of due) {
    try {
      const hasReplied = db.prepare(
        `SELECT COUNT(*) as c FROM messages WHERE lead_id = ? AND direction = 'inbound'`
      ).get(item.lead_id).c;

      if (hasReplied > 0) {
        db.prepare(
          `UPDATE follow_up_schedule SET cancelled = 1 WHERE lead_id = ? AND sent = 0 AND cancelled = 0`
        ).run(item.lead_id);
        continue;
      }

      const config = db.prepare('SELECT * FROM campaign_config WHERE id = 1').get();
      const history = db.prepare(
        `SELECT direction, content FROM messages WHERE lead_id = ? ORDER BY sent_at ASC`
      ).all(item.lead_id);

      const message = await generateFollowUp(config, item, item.message_number, history);

      await sendSMS(item.phone, message);

      db.prepare(
        `INSERT INTO messages (lead_id, direction, content) VALUES (?, 'outbound', ?)`
      ).run(item.lead_id, message);

      db.prepare(`UPDATE follow_up_schedule SET sent = 1 WHERE id = ?`).run(item.schedule_id);

      console.log(`[Scheduler] Follow-up #${item.message_number} sent to ${item.name} (${item.phone})`);
    } catch (err) {
      console.error(`[Scheduler] Failed for lead ${item.phone}:`, err.message);
    }
  }
}

function scheduleFollowUpsForLead(leadId, initialSentAt) {
  const base = new Date(initialSentAt).getTime();

  const schedule = [
    { number: 1, daysAfter: 2 },
    { number: 2, daysAfter: 3 },
    { number: 3, daysAfter: 4 },
    { number: 4, daysAfter: 5 },
    { number: 5, daysAfter: 6 },
    { number: 6, daysAfter: 7 },
    { number: 7, daysAfter: 8 }
  ];

  const insert = db.prepare(
    `INSERT INTO follow_up_schedule (lead_id, scheduled_for, message_number) VALUES (?, ?, ?)`
  );

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const scheduledFor = new Date(base + item.daysAfter * 24 * 60 * 60 * 1000).toISOString();
      insert.run(leadId, scheduledFor, item.number);
    }
  });

  insertMany(schedule);
}

function cancelFollowUpsForLead(leadId) {
  db.prepare(
    `UPDATE follow_up_schedule SET cancelled = 1 WHERE lead_id = ? AND sent = 0 AND cancelled = 0`
  ).run(leadId);
}

module.exports = { startScheduler, scheduleFollowUpsForLead, cancelFollowUpsForLead };
