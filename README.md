# ReActivate — AI SMS Lead Reactivation Platform

A single-operator AI-powered SMS platform that re-engages cold leads using Twilio (SMS) and OpenAI (GPT-4o).

---

## Stack

- **Frontend**: Plain HTML, CSS, JavaScript (no framework)
- **Backend**: Node.js + Express
- **Database**: SQLite via `better-sqlite3`
- **SMS**: Twilio Node SDK
- **AI**: OpenAI GPT-4o
- **Scheduler**: `node-cron` (checks every minute for due follow-ups)

---

## Setup

### 1. Install dependencies

```bash
cd /path/to/project
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
```

You can also set these from the **Settings** view inside the app — they are written directly to `.env` and applied immediately without a restart.

### 3. Run

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Twilio Webhook

Point your Twilio phone number's **incoming message webhook** to:

```
POST  http://your-public-url/twilio/webhook
```

For local development, use [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Then set `https://xxxx.ngrok.io/twilio/webhook` as your Twilio webhook URL.

---

## Campaign Flow

1. **Import leads** — upload a CSV with columns: `name`, `phone`, `job_type`, `quote_amount`
2. **Configure campaign** — set AI persona, company, goal, initial message, and follow-up style
3. **Launch** — initial SMS sends immediately to all Pending/Active leads
4. **Follow-ups** auto-send via AI:
   - Follow-up 1: 2 days after initial
   - Follow-ups 2–7: once per day (days 3–8)
   - Stops the moment a lead replies
5. **Inbound replies** are handled by GPT-4o automatically
6. **Conversations view** shows all replied leads with full threads

---

## CSV Format

Accepted column names (case-insensitive, spaces/hyphens normalized):

| Column | Aliases |
|--------|---------|
| `name` | `full_name`, `first_name` + `last_name` |
| `phone` | `mobile`, `cell`, `phone_number` |
| `job_type` | `service`, `service_type`, `type` |
| `quote_amount` | `quote`, `amount`, `price` |

Duplicate phone numbers are skipped on import.

---

## Database

SQLite database is stored at `data/leads.db` (auto-created on first run). Tables:

- `leads` — contact list with status and opt-out tracking
- `messages` — full inbound/outbound message history per lead
- `campaign_config` — single-row campaign configuration
- `follow_up_schedule` — scheduled follow-up jobs

---

## GDPR / Opt-Out

- Any lead texting the configured opt-out keyword (default: `STOP`) is immediately marked opted out and removed from all future sends
- Manual opt-out toggle available per lead in the Leads table
- Opted-out leads are never messaged again regardless of campaign state
