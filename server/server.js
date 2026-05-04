require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const path = require('path');
const db = require('./db');
const { startScheduler, cancelFollowUpsForLead } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/leads',          require('./routes/leads'));
app.use('/api/campaign',       require('./routes/campaign'));
app.use('/api/conversations',  require('./routes/conversations'));
app.use('/api/settings',       require('./routes/settings'));
app.use('/api/blog',           require('./routes/blog'));
app.use('/api/finder',         require('./routes/finder'));
app.use('/api/outreach',       require('./routes/outreach'));

app.post('/twilio/webhook', (req, res) => {
  res.type('text/xml').send('<Response></Response>');

  const { From, Body } = req.body || {};
  if (!From || !Body) return;

  setImmediate(() => {
    handleInboundSMS(From.trim(), Body.trim()).catch(err =>
      console.error('[Webhook] Processing error:', err.message)
    );
  });
});

const HOT_KEYWORDS = [
  'yes', 'yep', 'yeah', 'sure', 'interested', "let's talk", 'lets talk',
  'book', 'call me', 'schedule', 'when can', 'available', 'sounds good',
  'absolutely', 'definitely', 'of course', 'i would like', 'please do'
];

async function handleInboundSMS(phone, body) {
  const lead = db.prepare('SELECT * FROM leads WHERE phone = ?').get(phone);
  if (!lead) {
    console.log(`[Webhook] Unknown number: ${phone}`);
    return;
  }

  const config = db.prepare('SELECT * FROM campaign_config WHERE id = 1').get();
  const optOutKeyword = (config?.opt_out_keyword || 'STOP').toUpperCase().trim();

  if (body.toUpperCase().trim() === optOutKeyword || body.toUpperCase().includes(optOutKeyword)) {
    db.prepare(`UPDATE leads SET opted_out = 1, status = 'Opted Out' WHERE id = ?`).run(lead.id);
    cancelFollowUpsForLead(lead.id);
    console.log(`[Webhook] ${lead.name} opted out`);
    return;
  }

  db.prepare(
    `INSERT INTO messages (lead_id, direction, content) VALUES (?, 'inbound', ?)`
  ).run(lead.id, body);

  cancelFollowUpsForLead(lead.id);

  const bodyLower = body.toLowerCase();
  const isHot = HOT_KEYWORDS.some(kw => bodyLower.includes(kw));

  if (isHot) {
    db.prepare(`UPDATE leads SET status = 'Hot' WHERE id = ?`).run(lead.id);
  } else if (!['Hot', 'Booked', 'Opted Out'].includes(lead.status)) {
    db.prepare(`UPDATE leads SET status = 'Replied' WHERE id = ?`).run(lead.id);
  }

  const fresh = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead.id);
  if (fresh.ai_paused || fresh.opted_out) return;

  try {
    const { generateReply } = require('./services/openai');
    const { sendSMS } = require('./services/twilio');

    const history = db.prepare(
      `SELECT direction, content FROM messages WHERE lead_id = ? ORDER BY sent_at ASC LIMIT 30`
    ).all(lead.id);

    const historyWithoutLast = history.slice(0, -1);
    const aiReply = await generateReply(config, historyWithoutLast, body);

    await sendSMS(phone, aiReply);

    db.prepare(
      `INSERT INTO messages (lead_id, direction, content) VALUES (?, 'outbound', ?)`
    ).run(lead.id, aiReply);

    console.log(`[Webhook] AI replied to ${lead.name}`);
  } catch (err) {
    console.error(`[Webhook] AI/SMS error for ${lead.name}:`, err.message);
  }
}

app.get('/blog', (req, res) => res.sendFile(path.join(__dirname, '../public/blog.html')));
app.get('/blog/:slug', (req, res) => res.sendFile(path.join(__dirname, '../public/blog-post.html')));
app.get('/admin/blog', (req, res) => res.sendFile(path.join(__dirname, '../public/admin-blog.html')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Twilio webhook URL: http://your-ngrok-url/twilio/webhook\n`);
  startScheduler();
});

module.exports = app;
