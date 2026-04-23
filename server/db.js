const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'leads.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    job_type TEXT DEFAULT '',
    quote_amount TEXT DEFAULT '',
    status TEXT DEFAULT 'Pending',
    opted_out INTEGER DEFAULT 0,
    ai_paused INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS campaign_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    persona_name TEXT DEFAULT '',
    company_name TEXT DEFAULT '',
    goal TEXT DEFAULT 'Book a Call',
    initial_message TEXT DEFAULT '',
    followup_style TEXT DEFAULT 'Professional',
    opt_out_keyword TEXT DEFAULT 'STOP',
    include_opt_out_text INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO campaign_config (id) VALUES (1);

  CREATE TABLE IF NOT EXISTS follow_up_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    scheduled_for DATETIME NOT NULL,
    message_number INTEGER NOT NULL,
    sent INTEGER DEFAULT 0,
    cancelled INTEGER DEFAULT 0,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );
`);

module.exports = db;
