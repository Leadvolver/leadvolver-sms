/* ─── State ───────────────────────────────────────────────────── */
const state = {
  leads: [],
  filteredLeads: [],
  currentView: 'leads',
  selectedLeadId: null,
  convPollTimer: null,
  threadPollTimer: null,
  demo: false,
  demoData: null
};

/* ─── Demo Data ───────────────────────────────────────────────── */
const DEMO_LEADS = [
  { id: 1001, name: 'James Miller',   phone: '+1 (555) 012-3456', job_type: 'Kitchen Renovation',   quote_amount: '$18,500', status: 'Booked',    opted_out: false },
  { id: 1002, name: 'Sarah Thompson', phone: '+1 (555) 023-4567', job_type: 'Bathroom Remodel',     quote_amount: '$9,200',  status: 'Hot',       opted_out: false },
  { id: 1003, name: 'Robert Garcia',  phone: '+1 (555) 034-5678', job_type: 'Full Home Renovation', quote_amount: '$47,000', status: 'Hot',       opted_out: false },
  { id: 1004, name: 'Emily Chen',     phone: '+1 (555) 045-6789', job_type: 'Kitchen Renovation',   quote_amount: '$22,000', status: 'Replied',   opted_out: false },
  { id: 1005, name: 'Marcus Johnson', phone: '+1 (555) 056-7890', job_type: 'Basement Finishing',   quote_amount: '$31,000', status: 'Replied',   opted_out: false },
  { id: 1006, name: 'Amanda Wilson',  phone: '+1 (555) 067-8901', job_type: 'Bathroom Remodel',     quote_amount: '$11,500', status: 'Active',    opted_out: false },
  { id: 1007, name: 'David Martinez', phone: '+1 (555) 078-9012', job_type: 'Roof Replacement',     quote_amount: '$14,000', status: 'Active',    opted_out: false },
  { id: 1008, name: 'Jessica Brown',  phone: '+1 (555) 089-0123', job_type: 'Full Home Renovation', quote_amount: '$58,000', status: 'Active',    opted_out: false },
  { id: 1009, name: 'Kevin Taylor',   phone: '+1 (555) 090-1234', job_type: 'Kitchen Renovation',   quote_amount: '$16,800', status: 'Opted Out', opted_out: true  },
  { id: 1010, name: 'Lisa Anderson',  phone: '+1 (555) 001-2345', job_type: 'Bathroom Remodel',     quote_amount: '$7,500',  status: 'Active',    opted_out: false },
];

function buildDemoData() {
  const now = Date.now();
  const H = 3600000;
  const ago = ms => new Date(now - ms).toISOString();

  const threads = {
    1001: {
      lead: { id: 1001, name: 'James Miller', phone: '+1 (555) 012-3456', status: 'Booked', ai_paused: false },
      messages: [
        { direction: 'outbound', content: "Hi James, this is Maya from ProReno. You reached out a while back about a kitchen renovation. Are you still looking to get that done?", sent_at: ago(72 * H) },
        { direction: 'inbound',  content: "Hey yeah actually we were just talking about this last week", sent_at: ago(70 * H) },
        { direction: 'outbound', content: "That's great timing James. A lot of homeowners in your area are booking for this quarter. Would a quick 15 minute call work this week to go over your project?", sent_at: ago(69.5 * H) },
        { direction: 'inbound',  content: "Sure I can do Thursday afternoon", sent_at: ago(48 * H) },
        { direction: 'outbound', content: "Perfect. I'll book you in for Thursday at 2pm. You'll get a confirmation shortly. Looking forward to it!", sent_at: ago(47 * H) },
        { direction: 'inbound',  content: "Sounds good thanks", sent_at: ago(2 * H) },
      ]
    },
    1002: {
      lead: { id: 1002, name: 'Sarah Thompson', phone: '+1 (555) 023-4567', status: 'Hot', ai_paused: false },
      messages: [
        { direction: 'outbound', content: "Hi Sarah, this is Maya from ProReno. You inquired about a bathroom remodel a few months back. Is that still something you're looking into?", sent_at: ago(56 * H) },
        { direction: 'inbound',  content: "Yes actually we still want to do it we just got busy", sent_at: ago(54 * H) },
        { direction: 'outbound', content: "Totally understandable. Would it help to jump on a quick call this week to see what's possible within your budget?", sent_at: ago(53.5 * H) },
        { direction: 'inbound',  content: "Yeah that could work what days do you have", sent_at: ago(50 * H) },
      ]
    },
    1003: {
      lead: { id: 1003, name: 'Robert Garcia', phone: '+1 (555) 034-5678', status: 'Hot', ai_paused: false },
      messages: [
        { direction: 'outbound', content: "Hi Robert, Maya here from ProReno. You reached out about a full home renovation. Still on your radar?", sent_at: ago(30 * H) },
        { direction: 'inbound',  content: "Honestly yes we have been putting it off but we need to get it done before summer", sent_at: ago(28 * H) },
        { direction: 'outbound', content: "Smart thinking, summer is when most contractors get fully booked. Want to lock in a quick call so we can go over scope and pricing before spots fill up?", sent_at: ago(27.5 * H) },
        { direction: 'inbound',  content: "Let's do it yes", sent_at: ago(26 * H) },
      ]
    },
    1004: {
      lead: { id: 1004, name: 'Emily Chen', phone: '+1 (555) 045-6789', status: 'Replied', ai_paused: false },
      messages: [
        { direction: 'outbound', content: "Hi Emily, this is Maya from ProReno. You inquired about a kitchen renovation a while back. Still interested?", sent_at: ago(28 * H) },
        { direction: 'inbound',  content: "Hi yes I remember, we are still thinking about it", sent_at: ago(27 * H) },
        { direction: 'outbound', content: "No worries at all. Are there any questions I can answer to help you move forward?", sent_at: ago(26.5 * H) },
        { direction: 'inbound',  content: "We are mainly wondering about timeline and cost", sent_at: ago(24 * H) },
      ]
    },
    1005: {
      lead: { id: 1005, name: 'Marcus Johnson', phone: '+1 (555) 056-7890', status: 'Replied', ai_paused: false },
      messages: [
        { direction: 'outbound', content: "Hey Marcus, Maya from ProReno here. You reached out about finishing your basement. Still something you want to do?", sent_at: ago(8 * H) },
        { direction: 'inbound',  content: "Yeah we do, been sitting on it for a while", sent_at: ago(7 * H) },
        { direction: 'outbound', content: "Totally get it. These projects take planning. Want to set up a quick call so we can map out what it would look like for your space?", sent_at: ago(6.5 * H) },
        { direction: 'inbound',  content: "Sure send me some times", sent_at: ago(4 * H) },
      ]
    }
  };

  const convList = Object.values(threads).map(t => {
    const last = t.messages[t.messages.length - 1];
    return {
      id: t.lead.id,
      name: t.lead.name,
      status: t.lead.status,
      last_message: last.content,
      last_direction: last.direction,
      last_activity: last.sent_at
    };
  }).sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));

  return { threads, convList };
}

function enterDemoMode() {
  state.demo = true;
  state.demoData = buildDemoData();
  state.selectedLeadId = null;
  document.getElementById('demo-banner').style.display = 'flex';
  document.body.classList.add('demo-active');
  const badge = document.getElementById('conv-badge');
  if (badge) { badge.textContent = '2'; badge.style.display = 'inline-block'; }
  switchView('leads');
}

function exitDemoMode() {
  state.demo = false;
  state.demoData = null;
  state.selectedLeadId = null;
  document.getElementById('demo-banner').style.display = 'none';
  document.body.classList.remove('demo-active');
  const badge = document.getElementById('conv-badge');
  if (badge) badge.style.display = 'none';
  switchView('leads');
}

/* ─── Toast ───────────────────────────────────────────────────── */
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

/* ─── Loading ─────────────────────────────────────────────────── */
function setLoading(show, text = 'Processing…') {
  const overlay = document.getElementById('loading-overlay');
  document.getElementById('loading-text').textContent = text;
  if (show) overlay.classList.add('show');
  else overlay.classList.remove('show');
}

/* ─── API ─────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = {
    method,
    headers: {}
  };

  if (body instanceof FormData) {
    opts.body = body;
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

/* ─── Navigation ──────────────────────────────────────────────── */
function switchView(view) {
  if (state.convPollTimer) { clearInterval(state.convPollTimer); state.convPollTimer = null; }
  if (state.threadPollTimer) { clearInterval(state.threadPollTimer); state.threadPollTimer = null; }

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.remove('active'));

  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  state.currentView = view;

  if (view === 'leads')         initLeadsView();
  if (view === 'campaign')      initCampaignView();
  if (view === 'conversations') initConversationsView();
  if (view === 'settings')      initSettingsView();
}

/* ──────────────────────────────────────────────────────────────
   VIEW 1: LEADS
   ────────────────────────────────────────────────────────────── */
async function initLeadsView() {
  if (state.demo) {
    state.leads = DEMO_LEADS;
    applyLeadFilters();
    document.getElementById('stat-total').textContent  = '10';
    document.getElementById('stat-active').textContent = '5';
    document.getElementById('stat-hot').textContent    = '2';
    document.getElementById('stat-booked').textContent = '1';
    return;
  }
  await Promise.all([loadLeads(), loadStats()]);
}

async function loadLeads() {
  try {
    const leads = await api('GET', '/api/leads');
    state.leads = leads;
    applyLeadFilters();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadStats() {
  try {
    const stats = await api('GET', '/api/leads/stats');
    document.getElementById('stat-total').textContent  = stats.total;
    document.getElementById('stat-active').textContent = stats.active;
    document.getElementById('stat-hot').textContent    = stats.hot;
    document.getElementById('stat-booked').textContent = stats.booked;
  } catch (_) {}
}

function applyLeadFilters() {
  const search = (document.getElementById('lead-search')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('status-filter')?.value || '';

  state.filteredLeads = state.leads.filter(l => {
    const matchSearch = !search ||
      l.name.toLowerCase().includes(search) ||
      l.phone.includes(search);
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  renderLeadsTable();
}

function renderLeadsTable() {
  const tbody = document.getElementById('leads-tbody');
  const table = document.getElementById('leads-table');
  const empty = document.getElementById('leads-empty');

  if (state.filteredLeads.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  table.style.display = 'table';
  empty.style.display = 'none';

  tbody.innerHTML = state.filteredLeads.map(lead => `
    <tr data-id="${lead.id}">
      <td class="name-cell">${esc(lead.name)}</td>
      <td class="phone-cell">${esc(lead.phone)}</td>
      <td>${esc(lead.job_type || '—')}</td>
      <td class="mono">${esc(lead.quote_amount || '—')}</td>
      <td>${statusBadge(lead.status)}</td>
      <td class="toggle-wrap">
        <label class="toggle" title="${lead.opted_out ? 'Remove opt-out' : 'Mark as opted out'}">
          <input type="checkbox" class="optout-toggle" data-id="${lead.id}" ${lead.opted_out ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.optout-toggle').forEach(cb => {
    cb.addEventListener('change', () => toggleOptOut(cb.dataset.id));
  });
}

function statusBadge(status) {
  const cls = {
    'Pending':   'badge-pending',
    'Active':    'badge-active',
    'Replied':   'badge-replied',
    'Hot':       'badge-hot',
    'Booked':    'badge-booked',
    'Opted Out': 'badge-opted-out',
    'Completed': 'badge-completed'
  }[status] || 'badge-pending';
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

async function toggleOptOut(id) {
  if (state.demo) { toast('Demo Mode — actions disabled.', 'info'); await initLeadsView(); return; }
  try {
    const result = await api('PATCH', `/api/leads/${id}/optout`);
    const lead = state.leads.find(l => l.id == id);
    if (lead) {
      lead.opted_out = result.opted_out;
      lead.status = result.status;
    }
    applyLeadFilters();
    await loadStats();
    toast(result.opted_out ? 'Lead marked as opted out.' : 'Opt-out removed.');
  } catch (err) {
    toast(err.message, 'error');
    await loadLeads();
  }
}

async function handleCsvUpload(file) {
  if (state.demo) { toast('Demo Mode — actions disabled.', 'info'); return; }
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return toast('Please upload a .csv file.', 'error');
  }

  setLoading(true, 'Importing leads…');
  try {
    const form = new FormData();
    form.append('csv', file);
    const result = await api('POST', '/api/leads/import', form);
    toast(`Imported ${result.imported} lead${result.imported !== 1 ? 's' : ''}. ${result.skipped} skipped.`);
    await Promise.all([loadLeads(), loadStats()]);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(false);
    document.getElementById('csv-upload').value = '';
  }
}

async function launchCampaign() {
  if (state.demo) { toast('Demo Mode — actions disabled.', 'info'); return; }
  const confirmed = confirm(
    'Launch campaign now? This will send the initial SMS to all Pending and Active leads immediately.'
  );
  if (!confirmed) return;

  setLoading(true, 'Launching campaign…');
  try {
    const result = await api('POST', '/api/campaign/launch');
    toast(`Campaign launched — ${result.sent} message${result.sent !== 1 ? 's' : ''} sent. ${result.failed} failed.`);
    if (result.failed > 0) {
      toast(`${result.failed} messages failed to send. Check your Twilio credentials.`, 'error');
    }
    await Promise.all([loadLeads(), loadStats()]);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(false);
  }
}

/* ──────────────────────────────────────────────────────────────
   VIEW 2: CAMPAIGN
   ────────────────────────────────────────────────────────────── */
async function initCampaignView() {
  try {
    const config = await api('GET', '/api/campaign');
    populateCampaignForm(config);
    updatePromptPreview();
    setupCampaignLivePreview();
  } catch (err) {
    toast('Could not load campaign config.', 'error');
  }
}

function populateCampaignForm(config) {
  if (!config) return;
  setVal('persona-name', config.persona_name);
  setVal('company-name', config.company_name);
  setVal('campaign-goal', config.goal);
  setVal('initial-message', config.initial_message);
  setVal('followup-style', config.followup_style);
  setVal('optout-keyword', config.opt_out_keyword || 'STOP');
  const cb = document.getElementById('include-optout');
  if (cb) cb.checked = !!config.include_opt_out_text;
}

function setupCampaignLivePreview() {
  const previewTriggers = ['persona-name', 'company-name', 'campaign-goal'];
  previewTriggers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', debounce(updatePromptPreview, 400));
  });
}

async function updatePromptPreview() {
  try {
    const data = await api('GET', '/api/campaign/preview');
    const el = document.getElementById('prompt-preview');
    if (el) el.textContent = data.prompt || 'Fill in the persona name and company name to see the prompt preview.';
  } catch (_) {}
}

async function saveCampaign() {
  const payload = {
    persona_name:        getVal('persona-name'),
    company_name:        getVal('company-name'),
    goal:                getVal('campaign-goal'),
    initial_message:     getVal('initial-message'),
    followup_style:      getVal('followup-style'),
    opt_out_keyword:     getVal('optout-keyword') || 'STOP',
    include_opt_out_text: document.getElementById('include-optout')?.checked ? 1 : 0
  };

  if (!payload.initial_message.trim()) {
    return toast('Please enter an initial message.', 'error');
  }

  setLoading(true, 'Saving…');
  try {
    await api('POST', '/api/campaign/save', payload);
    toast('Campaign saved successfully.');
    updatePromptPreview();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(false);
  }
}

/* ──────────────────────────────────────────────────────────────
   VIEW 3: CONVERSATIONS
   ────────────────────────────────────────────────────────────── */
async function initConversationsView() {
  if (state.demo) {
    renderConvList(state.demoData.convList);
    const badge = document.getElementById('conv-badge');
    if (badge) { badge.textContent = '2'; badge.style.display = 'inline-block'; }
    await selectConversation('1001');
    return;
  }
  await loadConversations();
  state.convPollTimer = setInterval(loadConversations, 5000);
}

async function loadConversations() {
  try {
    const convs = await api('GET', '/api/conversations');
    renderConvList(convs);

    const badge = document.getElementById('conv-badge');
    if (badge) {
      const hotCount = convs.filter(c => c.status === 'Hot').length;
      if (hotCount > 0) {
        badge.textContent = hotCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    if (state.selectedLeadId) {
      const still = convs.find(c => c.id == state.selectedLeadId);
      if (still) updateThreadHeader(still);
    }
  } catch (_) {}
}

function renderConvList(convs) {
  const container = document.getElementById('conv-items');
  const empty = document.getElementById('conv-empty');

  if (convs.length === 0) {
    empty.style.display = 'flex';
    container.innerHTML = '';
    return;
  }

  empty.style.display = 'none';

  container.innerHTML = convs.map(c => `
    <div class="conv-item ${c.id == state.selectedLeadId ? 'active' : ''}" data-id="${c.id}">
      <div class="conv-item-header">
        <span class="conv-item-name">${esc(c.name)}</span>
        <span class="conv-item-time">${relativeTime(c.last_activity)}</span>
      </div>
      <div class="conv-item-preview">${
        c.last_direction === 'inbound' ? '← ' : '→ '
      }${esc((c.last_message || '').slice(0, 60))}${(c.last_message || '').length > 60 ? '…' : ''}</div>
      <div>${statusBadge(c.status)}</div>
    </div>
  `).join('');

  container.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => selectConversation(item.dataset.id));
  });
}

async function selectConversation(leadId) {
  state.selectedLeadId = leadId;

  document.querySelectorAll('.conv-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id == leadId);
  });

  if (state.threadPollTimer) { clearInterval(state.threadPollTimer); state.threadPollTimer = null; }

  await loadThread(leadId);

  if (!state.demo) {
    state.threadPollTimer = setInterval(() => loadThread(leadId), 4000);
  }
}

async function loadThread(leadId) {
  if (state.demo) {
    const thread = state.demoData.threads[leadId];
    if (thread) renderThread(thread.lead, thread.messages);
    return;
  }
  try {
    const data = await api('GET', `/api/conversations/${leadId}`);
    renderThread(data.lead, data.messages);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderThread(lead, messages) {
  const placeholder = document.getElementById('thread-placeholder');
  const content = document.getElementById('thread-content');

  if (placeholder) placeholder.style.display = 'none';
  if (content) content.style.display = 'flex';

  renderThreadHeader(lead);
  renderThreadMessages(messages);
  renderThreadActions(lead);
}

function renderThreadHeader(lead) {
  const el = document.getElementById('thread-header');
  if (!el) return;

  el.innerHTML = `
    <div>
      <div class="thread-lead-name">${esc(lead.name)}</div>
      <div class="thread-lead-phone">${esc(lead.phone)} &nbsp;·&nbsp; ${statusBadge(lead.status)}</div>
    </div>
    <div class="thread-header-actions">
      <button class="btn btn-ghost btn-sm" id="takeover-btn" data-id="${lead.id}" data-paused="${lead.ai_paused}">
        ${lead.ai_paused
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume AI'
          : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Take Over'}
      </button>
      <button class="btn btn-accent btn-sm" id="book-btn" data-id="${lead.id}" ${lead.status === 'Booked' ? 'disabled' : ''}>
        ${lead.status === 'Booked' ? '✓ Booked' : 'Mark as Booked'}
      </button>
    </div>
  `;

  el.querySelector('#takeover-btn')?.addEventListener('click', async (e) => {
    if (state.demo) { toast('Demo Mode — actions disabled.', 'info'); return; }
    const btn = e.currentTarget;
    try {
      const result = await api('POST', `/api/conversations/${btn.dataset.id}/takeover`);
      toast(result.ai_paused ? 'AI paused. You can now reply manually.' : 'AI resumed.');
      await loadThread(btn.dataset.id);
    } catch (err) { toast(err.message, 'error'); }
  });

  el.querySelector('#book-btn')?.addEventListener('click', async (e) => {
    if (state.demo) { toast('Demo Mode — actions disabled.', 'info'); return; }
    const btn = e.currentTarget;
    if (btn.disabled) return;
    try {
      await api('POST', `/api/conversations/${btn.dataset.id}/book`);
      toast('Lead marked as booked!');
      await Promise.all([loadThread(btn.dataset.id), loadConversations()]);
    } catch (err) { toast(err.message, 'error'); }
  });
}

function updateThreadHeader(conv) {
  const nameEl = document.querySelector('.thread-lead-name');
  if (nameEl) nameEl.textContent = conv.name;
}

function renderThreadMessages(messages) {
  const el = document.getElementById('thread-messages');
  if (!el) return;

  if (messages.length === 0) {
    el.innerHTML = '<div class="empty-state"><p>No messages yet.</p></div>';
    return;
  }

  el.innerHTML = messages.map(m => `
    <div>
      <div class="msg-bubble msg-${m.direction}">
        ${esc(m.content)}
      </div>
      <div class="msg-meta ${m.direction === 'outbound' ? 'msg-meta-right' : ''}">${m.direction === 'outbound' ? 'AI / You' : 'Lead'} · ${formatTime(m.sent_at)}</div>
    </div>
  `).join('');

  el.scrollTop = el.scrollHeight;
}

function renderThreadActions(lead) {
  const el = document.getElementById('thread-actions');
  if (!el) return;

  if (lead.ai_paused) {
    el.innerHTML = `
      <div class="ai-paused-notice">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
        </svg>
        AI paused — you are in control
      </div>
      <div class="manual-reply-area">
        <textarea id="manual-reply-input" rows="2" placeholder="Type a message…"></textarea>
        <button class="btn btn-accent" id="send-manual-btn" data-id="${lead.id}">Send</button>
      </div>
    `;

    const sendBtn = el.querySelector('#send-manual-btn');
    const textarea = el.querySelector('#manual-reply-input');

    sendBtn?.addEventListener('click', () => sendManualReply(lead.id, textarea));
    textarea?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendManualReply(lead.id, textarea);
      }
    });
  } else {
    el.innerHTML = `
      <div style="font-size:12px; color:var(--text3); padding:4px 0;">
        AI is handling replies. Click <strong style="color:var(--text2)">Take Over</strong> to reply manually.
      </div>
    `;
  }
}

async function sendManualReply(leadId, textarea) {
  if (state.demo) { toast('Demo Mode — actions disabled.', 'info'); return; }
  const content = textarea.value.trim();
  if (!content) return;

  textarea.disabled = true;
  try {
    await api('POST', `/api/conversations/${leadId}/reply`, { content });
    textarea.value = '';
    await loadThread(leadId);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    textarea.disabled = false;
    textarea.focus();
  }
}

/* ──────────────────────────────────────────────────────────────
   VIEW 4: SETTINGS
   ────────────────────────────────────────────────────────────── */
async function initSettingsView() {
  try {
    const settings = await api('GET', '/api/settings');
    if (settings.twilio_account_sid) setPlaceholder('twilio-sid', settings.twilio_account_sid);
    if (settings.twilio_auth_token)  setPlaceholder('twilio-token', settings.twilio_auth_token);
    if (settings.twilio_phone_number) setVal('twilio-phone', settings.twilio_phone_number);
    if (settings.openai_api_key)     setPlaceholder('openai-key', settings.openai_api_key);
  } catch (_) {}

  const webhookEl = document.getElementById('webhook-url-display');
  if (webhookEl) webhookEl.textContent = window.location.origin + '/twilio/webhook';
}

async function saveSettings() {
  const payload = {
    twilio_account_sid:  getVal('twilio-sid'),
    twilio_auth_token:   getVal('twilio-token'),
    twilio_phone_number: getVal('twilio-phone'),
    openai_api_key:      getVal('openai-key')
  };

  if (!Object.values(payload).some(v => v && !v.includes('***'))) {
    return toast('No new values to save.', 'info');
  }

  setLoading(true, 'Saving settings…');
  try {
    const result = await api('POST', '/api/settings/save', payload);
    toast(result.message || 'Settings saved.');
    ['twilio-sid', 'twilio-token', 'openai-key'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    await initSettingsView();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(false);
  }
}

async function sendTestSms() {
  const phone = getVal('test-phone');
  if (!phone) return toast('Enter a phone number to test.', 'error');

  setLoading(true, 'Sending test SMS…');
  try {
    const result = await api('POST', '/api/settings/test-sms', { phone });
    toast(result.message || 'Test SMS sent!');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setLoading(false);
  }
}

/* ─── Utilities ───────────────────────────────────────────────── */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function setPlaceholder(id, value) {
  const el = document.getElementById(id);
  if (el) el.placeholder = value || '';
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'UTC'
  }) + ' UTC';
}

/* ─── Init ────────────────────────────────────────────────────── */
function init() {
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('demo-btn').addEventListener('click', () => {
    if (state.demo) exitDemoMode();
    else enterDemoMode();
  });

  document.getElementById('exit-demo-btn').addEventListener('click', exitDemoMode);

  document.getElementById('csv-upload').addEventListener('change', e => {
    handleCsvUpload(e.target.files[0]);
  });

  const uploadLabel = document.querySelector('label[for="csv-upload"]');
  if (uploadLabel) {
    uploadLabel.addEventListener('dragover', e => { e.preventDefault(); uploadLabel.style.borderColor = 'var(--accent)'; });
    uploadLabel.addEventListener('dragleave', () => { uploadLabel.style.borderColor = ''; });
    uploadLabel.addEventListener('drop', e => {
      e.preventDefault();
      uploadLabel.style.borderColor = '';
      const file = e.dataTransfer?.files[0];
      if (file) handleCsvUpload(file);
    });
  }

  document.getElementById('launch-btn').addEventListener('click', launchCampaign);

  document.getElementById('lead-search').addEventListener('input', debounce(applyLeadFilters, 250));
  document.getElementById('status-filter').addEventListener('change', applyLeadFilters);

  document.getElementById('save-campaign-btn').addEventListener('click', saveCampaign);
  document.getElementById('refresh-preview-btn').addEventListener('click', updatePromptPreview);

  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('test-sms-btn').addEventListener('click', sendTestSms);

  switchView('leads');
}

document.addEventListener('DOMContentLoaded', init);
