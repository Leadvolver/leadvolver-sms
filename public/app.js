/* ─── State ───────────────────────────────────────────────────── */
const state = {
  leads: [],
  filteredLeads: [],
  currentView: 'leads',
  selectedLeadId: null,
  convPollTimer: null,
  threadPollTimer: null
};

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
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

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
    if (el) el.textContent = data.prompt || 'Fill in the persona name and company name to see the preview.';
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
  state.threadPollTimer = setInterval(() => loadThread(leadId), 4000);
}

async function loadThread(leadId) {
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
    const btn = e.currentTarget;
    try {
      const result = await api('POST', `/api/conversations/${btn.dataset.id}/takeover`);
      toast(result.ai_paused ? 'AI paused. You can now reply manually.' : 'AI resumed.');
      await loadThread(btn.dataset.id);
    } catch (err) { toast(err.message, 'error'); }
  });

  el.querySelector('#book-btn')?.addEventListener('click', async (e) => {
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
      <div class="msg-meta">${m.direction === 'outbound' ? 'AI / You' : 'Lead'} · ${formatTime(m.sent_at)}</div>
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
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

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
