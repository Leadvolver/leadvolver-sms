# LeadVolver — Project Map

This is a monorepo with 3 separate products. When working on one, DO NOT touch the others unless explicitly asked.

---

## 1. WEBSITE
**Files:** `public/index.html`, `public/blog.html`, `public/blog-post.html`, `public/admin-blog.html`, `public/style.css`
**Routes:** `/`, `/blog`, `/blog/:slug`, `/admin/blog`
**Deployed:** Netlify (static) AND served by Railway as static files
**Rule:** Only touch these files when the user says "we're working on the website."

---

## 2. CRM
**Frontend:** `public/crm.html`
**Backend routes:** `server/routes/leads.js`, `server/routes/finder.js`, `server/routes/outreach.js`
**Backend services:** `server/services/claude.js`, `server/services/gmail.js`
**Live URL:** https://web-production-40be5.up.railway.app/crm
**GitHub repo (Railway watches this):** https://github.com/Leadvolver/leadvolver-crm
**Rule:** Only touch these files when the user says "we're working on the CRM."

### CRM AI Agents (live inside the CRM):
- 🤖 **AI Lead Finder** — searches web for leads by city + industry (`/api/finder`)
- 📧 **Email Outreach** — AI cold emails + auto follow-up scheduler (`/api/outreach/email`)
- 💼 **LinkedIn Messages** — generates 300-char connection requests (`/api/outreach/linkedin`)

---

## 3. SMS APP
**Frontend:** none (CRM is the UI for this too)
**Backend routes:** `server/routes/campaign.js`, `server/routes/conversations.js`, `server/routes/settings.js`
**Backend services:** `server/services/openai.js`, `server/services/twilio.js`, `server/services/scheduler.js`
**Webhook:** `POST /twilio/webhook`
**Rule:** Only touch these files when the user says "we're working on the SMS app."

---

## 4. LINKEDIN TOOL
**Folder:** `leadvolver-linkedin/`
**Rule:** Only touch when the user says "we're working on the LinkedIn tool."

---

## Shared
**Database:** `server/db.js` + `data/leads.db`
**Server entry:** `server/server.js`
**GitHub (SMS/main repo):** https://github.com/Leadvolver/leadvolver-sms
**GitHub (CRM/Railway repo):** https://github.com/Leadvolver/leadvolver-crm

### When pushing changes:
- CRM changes → push to BOTH `origin` (leadvolver-sms) AND `railway` (leadvolver-crm)
- Website/SMS changes → push to `origin` (leadvolver-sms) only
