// ── V2 STATE MACHINE ──────────────────────────────────────────────────────
const V2 = {
  screen: 'landing',
  wizard: { step: 0, data: {} },
  run: null,
  portfolio: [],
  selectedProvider: 'anthropic',
};

const V2_SCREENS = ['landing','wizard','copilot','dashboard','portfolio'];

const V2_AGENTS = [
  { id:1,  name:'Demographics',       ico:'📊' },
  { id:2,  name:'Gap Analysis',       ico:'📈' },
  { id:3,  name:'Site Selection',     ico:'📍' },
  { id:4,  name:'Real Estate',        ico:'🏢' },
  { id:5,  name:'Compliance',         ico:'⚖️' },
  { id:6,  name:'Competitive Intel',  ico:'🔍' },
  { id:7,  name:'Financials',         ico:'💰' },
  { id:8,  name:'Executive Summary',  ico:'📋' },
  { id:9,  name:'Business Plan',      ico:'🏦' },
  { id:10, name:'Project Plan',       ico:'🗂️' },
  { id:11, name:'Market Map',         ico:'🗺️' },
  { id:12, name:'Grant Search',       ico:'💵' },
  { id:13, name:'Competitor Deep',    ico:'🎯' },
  { id:14, name:'Code Review',        ico:'🔬' },
  { id:15, name:'QA Testing',         ico:'✅' },
  { id:16, name:'Build vs Buy',       ico:'🏗️' },
  { id:17, name:'Sources',            ico:'📚' },
];

const V2_PROVIDERS = {
  anthropic:    { name:'Anthropic Claude',   model:'claude-sonnet-4-6',  ico:'🟣' },
  openai:       { name:'OpenAI GPT-4o',      model:'gpt-4o',             ico:'🟢' },
  gemini:       { name:'Google Gemini',      model:'gemini-1.5-pro',     ico:'🔵' },
  openai_compat:{ name:'Local / Custom',     model:'llama3',             ico:'⚪' },
};

function v2GoTo(screen) {
  // Handle Traditional View — uses CSS class on body instead of a v2 screen
  if (screen === 'traditional') {
    document.body.classList.add('v2-traditional');
    // Scroll the v1 content into view
    const shell = document.getElementById('v1-shell');
    if (shell) shell.scrollIntoView({ behavior: 'instant', block: 'start' });
    window.scrollTo(0, 0);
    return;
  }

  // Leaving traditional view
  document.body.classList.remove('v2-traditional');

  V2.screen = screen;
  V2_SCREENS.forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (el) el.classList.toggle('active', s === screen);
  });

  // Update global nav active state
  const navMap = { landing: 'gnav-landing', dashboard: 'gnav-dashboard', portfolio: 'gnav-portfolio' };
  ['gnav-landing','gnav-dashboard','gnav-portfolio','gnav-classic'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  const activeId = navMap[screen];
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) el.classList.add('active');
  }

  // Scroll overlay back to top on screen change
  const overlay = document.getElementById('v2-overlay');
  if (overlay) overlay.scrollTo({ top: 0, behavior: 'smooth' });

  if (screen === 'portfolio') v2RenderPortfolio();
  if (screen === 'dashboard') {
    if (V2.run) v2RenderDashboard(V2.run);
    else if (typeof v2ShowDashboardEmpty === 'function') v2ShowDashboardEmpty();
  }
  if (screen === 'wizard' && typeof v2CheckWizardDraft === 'function') v2CheckWizardDraft();
}

function v2ToggleMobileNav() {
  const nav = document.getElementById('v2-mobile-nav');
  const btn = document.getElementById('v2-ham-btn');
  if (!nav) return;
  const open = nav.classList.toggle('open');
  if (btn) btn.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

function v2ToggleChat() {
  const widget = document.getElementById('v2-chat-widget');
  if (!widget) return;
  const isCollapsed = widget.classList.contains('collapsed');
  widget.classList.toggle('collapsed', !isCollapsed);
  // Update the toggle button label
  const btn = document.getElementById('v2-chat-toggle-btn');
  if (btn) btn.textContent = isCollapsed ? '✕ AI Answers' : '💬 AI Answers';
}

function v2Toast(msg, ms = 2800) {
  const el = document.getElementById('v2-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(v2Toast._t);
  v2Toast._t = setTimeout(() => el.classList.remove('show'), ms);
}

// Legacy aliases kept for backward-compat (investor/execution modals call these)
function v2ShowDetail()  { v2GoTo('traditional'); }
function v2HideDetail()  { v2GoTo('dashboard'); }

function v2StopPipeline() {
  stopRequested = true;
  const btn = document.getElementById('v2-copilot-stop');
  if (btn) { btn.textContent = 'Stopping…'; btn.disabled = true; }
}

function v2ShowApiKey() {
  document.getElementById('v2-apikey-modal').classList.add('open');
  v2RenderProviderGrid();
  const saved = localStorage.getItem('v2_apikey') || '';
  const el = document.getElementById('v2-api-key-input');
  if (el) el.value = saved;
  const mi = document.getElementById('v2-model-input');
  if (mi) mi.value = localStorage.getItem('v2_model') || '';
  // Populate Ollama model picker if Ollama is running
  v2DetectOllamaModels();
  // Populate OpenRouter free model picker
  v2DetectOpenRouterModels();
}

// ── OLLAMA PRESET ─────────────────────────────────────────────────────────

async function v2DetectOllamaModels() {
  const btn = document.getElementById('v2-ollama-btn');
  if (!btn) return;
  try {
    const r = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1500) });
    if (!r.ok) throw new Error();
    const data = await r.json();
    const models = (data.models || []).map(m => m.name);
    if (models.length) {
      const sel = document.getElementById('v2-ollama-model-sel');
      if (sel) {
        sel.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
        // Pre-select currently saved model if it matches
        const saved = localStorage.getItem('v2_model') || '';
        if (models.includes(saved)) sel.value = saved;
      }
      btn.disabled = false;
      btn.title = `Ollama running · ${models.length} model(s) available`;
      const status = document.getElementById('v2-ollama-status');
      if (status) status.innerHTML = `<span style="color:#22c55e">● running</span> · ${models.length} model(s)`;
    }
  } catch {
    const status = document.getElementById('v2-ollama-status');
    if (status) status.innerHTML = `<span style="color:#ef4444">● not detected</span> · <a href="https://ollama.com" target="_blank" style="color:inherit">install ollama.com</a>`;
  }
}

function v2ApplyOllamaPreset() {
  const sel = document.getElementById('v2-ollama-model-sel');
  const model = sel?.value || 'llama3';
  v2SelectProvider('openai_compat');
  const cu = document.getElementById('v2-custom-url-input');
  if (cu) cu.value = 'http://localhost:11434/v1/chat/completions';
  const mi = document.getElementById('v2-model-input');
  if (mi) mi.value = model;
  const ki = document.getElementById('v2-api-key-input');
  if (ki) ki.value = 'ollama';
  localStorage.setItem('v2_provider',   'openai_compat');
  localStorage.setItem('v2_custom_url', 'http://localhost:11434/v1/chat/completions');
  localStorage.setItem('v2_model',      model);
  localStorage.setItem('v2_apikey',     'ollama');
  v2SyncToV1Dom();
  v2Toast(`🦙 Ollama configured — using ${model}`);
}

// ── OPENROUTER PRESET ─────────────────────────────────────────────────────

// Curated best free models for JSON/business-analysis tasks (fallback list)
const _V2_OR_DEFAULTS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free',       name: 'Llama 3.3 70B' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free',    name: 'Hermes 3 405B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free',       name: 'Nemotron 120B' },
  { id: 'openai/gpt-oss-120b:free',                     name: 'GPT-OSS 120B' },
  { id: 'google/gemma-4-31b-it:free',                   name: 'Gemma 4 31B' },
  { id: 'qwen/qwen3-coder:free',                        name: 'Qwen3 Coder' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free',        name: 'Llama 3.2 3B (fast)' },
];

async function v2DetectOpenRouterModels() {
  const sel    = document.getElementById('v2-or-model-sel');
  const status = document.getElementById('v2-or-status');
  const btn    = document.getElementById('v2-or-btn');
  if (!sel) return;

  // Pre-fill with curated defaults immediately
  const savedKey = localStorage.getItem('v2_or_apikey') || '';
  const ki = document.getElementById('v2-or-key-input');
  if (ki) ki.value = savedKey;

  // Populate with curated defaults first
  const savedModel = localStorage.getItem('v2_or_model') || _V2_OR_DEFAULTS[0].id;
  sel.innerHTML = _V2_OR_DEFAULTS.map(m =>
    `<option value="${m.id}"${m.id === savedModel ? ' selected' : ''}>${m.name}</option>`
  ).join('');

  // Enable the button if a key is already saved
  if (savedKey && btn) btn.disabled = false;

  // Fetch live free models from OpenRouter public API
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error();
    const d = await r.json();
    const free = (d.data || [])
      .filter(m => m.pricing?.prompt === '0' && m.pricing?.completion === '0' && m.id.endsWith(':free'))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (free.length) {
      sel.innerHTML = free.map(m =>
        `<option value="${m.id}"${m.id === savedModel ? ' selected' : ''}>${m.name} (${m.id.split('/')[0]})</option>`
      ).join('');
      if (status) status.innerHTML = `<span style="color:#22c55e">● ${free.length} free models available</span>`;
    }
  } catch {
    if (status) status.innerHTML = `<span style="color:#94a3b8">● ${_V2_OR_DEFAULTS.length} curated free models</span>`;
  }
}

function v2OpenRouterKeyInput() {
  const ki  = document.getElementById('v2-or-key-input');
  const btn = document.getElementById('v2-or-btn');
  if (btn) btn.disabled = !(ki?.value.trim());
}

function v2ApplyOpenRouterPreset() {
  const ki  = document.getElementById('v2-or-key-input');
  const sel = document.getElementById('v2-or-model-sel');
  const key = ki?.value.trim() || '';
  const model = sel?.value || _V2_OR_DEFAULTS[0].id;
  if (!key) { v2Toast('⚠️ Enter your OpenRouter API key first'); return; }

  v2SelectProvider('openai_compat');
  const cu = document.getElementById('v2-custom-url-input');
  if (cu) cu.value = 'https://openrouter.ai/api/v1/chat/completions';
  const mi = document.getElementById('v2-model-input');
  if (mi) mi.value = model;
  const mainKey = document.getElementById('v2-api-key-input');
  if (mainKey) mainKey.value = key;

  localStorage.setItem('v2_provider',   'openai_compat');
  localStorage.setItem('v2_custom_url', 'https://openrouter.ai/api/v1/chat/completions');
  localStorage.setItem('v2_model',      model);
  localStorage.setItem('v2_apikey',     key);
  localStorage.setItem('v2_or_apikey',  key);
  localStorage.setItem('v2_or_model',   model);
  v2SyncToV1Dom();
  v2Toast(`🌐 OpenRouter configured — using ${model.split('/').pop()}`);
}

function v2CloseApiKey() {
  document.getElementById('v2-apikey-modal').classList.remove('open');
}

function v2SaveApiKey() {
  const k  = document.getElementById('v2-api-key-input').value.trim();
  const m  = document.getElementById('v2-model-input').value.trim();
  const cu = document.getElementById('v2-custom-url-input').value.trim();
  if (k)  localStorage.setItem('v2_apikey', k);
  if (m)  localStorage.setItem('v2_model', m);
  if (cu) localStorage.setItem('v2_custom_url', cu);
  v2SyncToV1Dom();
  v2CloseApiKey();
  v2Toast('✓ API key saved');
}

function v2SyncToV1Dom() {
  const k  = document.getElementById('v2-api-key-input')?.value.trim() || localStorage.getItem('v2_apikey') || '';
  const m  = document.getElementById('v2-model-input')?.value.trim() || localStorage.getItem('v2_model') || '';
  const cu = document.getElementById('v2-custom-url-input')?.value.trim() || localStorage.getItem('v2_custom_url') || '';
  const p  = V2.selectedProvider || localStorage.getItem('v2_provider') || 'anthropic';

  const apiKeyEl = document.getElementById('apiKey');
  const provEl   = document.getElementById('providerSelect');
  const modelEl  = document.getElementById('modelInput');
  const customEl = document.getElementById('customUrlInput');

  if (apiKeyEl) apiKeyEl.value = k;
  if (provEl)   provEl.value   = p;
  if (modelEl)  modelEl.value  = m;
  if (customEl) customEl.value = cu;
  if (typeof onProviderChange === 'function') onProviderChange();
}

function v2RenderProviderGrid() {
  const grid = document.getElementById('v2-provider-grid');
  if (!grid) return;
  const sel = V2.selectedProvider || localStorage.getItem('v2_provider') || 'anthropic';
  grid.innerHTML = Object.entries(V2_PROVIDERS).map(([key, p]) => `
    <div class="v2-provider-item${key===sel?' selected':''}" onclick="v2SelectProvider('${key}')">
      <div class="v2-provider-name">${p.ico} ${p.name}</div>
      <div class="v2-provider-model">${p.model}</div>
    </div>
  `).join('');
  const customRow = document.getElementById('v2-custom-url-row');
  if (customRow) customRow.style.display = sel === 'openai_compat' ? 'block' : 'none';
  const savedUrl = localStorage.getItem('v2_custom_url') || '';
  const cu = document.getElementById('v2-custom-url-input');
  if (cu) cu.value = savedUrl;
}

function v2SelectProvider(key) {
  V2.selectedProvider = key;
  localStorage.setItem('v2_provider', key);
  v2RenderProviderGrid();
}

function v2LoadPortfolio() {
  try { V2.portfolio = JSON.parse(localStorage.getItem('v2_portfolio') || '[]'); } catch { V2.portfolio = []; }
}

function v2SavePortfolio() {
  try { localStorage.setItem('v2_portfolio', JSON.stringify(V2.portfolio)); } catch {}
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  try {
    v2LoadPortfolio();
    V2.selectedProvider = localStorage.getItem('v2_provider') || 'anthropic';
    v2SyncToV1Dom();
    v2RenderLandingDemo();
    v2InitWizard();
    v2InitCopilotSidebar();
  } catch(e) {
    console.error('[v2 init error]', e);
    const overlay = document.getElementById('v2-overlay');
    if (overlay) overlay.insertAdjacentHTML('afterbegin',
      `<div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#ef4444;color:#fff;padding:14px 24px;font-size:13px;font-family:monospace">
        v2 init error: ${e.message} — check browser console (F12) for details
      </div>`);
  }
});
