// ══════════════════════════════════════════════════════════
// 40-local-guide.js — Ollama/Local Model Setup Guide
//                   + Data Freshness Badge Helpers
//
// Guide appears when "OpenAI-Compatible / Local" provider
// is selected in the provider dropdown.
//
// Data freshness: _freshBadge(year, confidence) renders
// inline HTML badge for use in agent output tables.
// ══════════════════════════════════════════════════════════

// ── Ollama Setup Guide ────────────────────────────────────
function _showLocalGuide() {
  const panel = $('localGuidePanel');
  if (!panel) return;
  const prov = provider ? provider() : ($('providerSelect')?.value || '');
  const show = prov === 'openai_compat';
  panel.style.display = show ? 'block' : 'none';
  if (show) {
    _detectOllamaModelsClassic();
    _detectOpenRouterModelsClassic();
  }
}

// Patch onProviderChange to also show/hide the guide
(function patchProviderChange() {
  document.addEventListener('DOMContentLoaded', () => {
    const _orig = window.onProviderChange;
    window.onProviderChange = function() {
      if (_orig) _orig.call(this);
      _showLocalGuide();
    };
  });
})();

// ── Classic View: Ollama ──────────────────────────────────

async function _detectOllamaModelsClassic() {
  const btn    = document.getElementById('cl-ollama-btn');
  const status = document.getElementById('cl-ollama-status');
  const sel    = document.getElementById('cl-ollama-model-sel');
  try {
    const r = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1500) });
    if (!r.ok) throw new Error();
    const data = await r.json();
    const models = (data.models || []).map(m => m.name);
    if (models.length) {
      if (sel) {
        sel.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
        const saved = localStorage.getItem('v2_model') || '';
        if (models.includes(saved)) sel.value = saved;
      }
      if (btn) { btn.disabled = false; btn.title = `Ollama running · ${models.length} model(s)`; }
      if (status) status.innerHTML = `<span style="color:#22c55e">● running</span> · ${models.length} model(s)`;
    } else {
      throw new Error('no models');
    }
  } catch {
    if (status) status.innerHTML = `<span style="color:#ef4444">● not detected</span> · <a href="https://ollama.com" target="_blank" style="color:inherit">install ollama.com</a>`;
  }
}

function _applyOllamaPresetClassic() {
  const sel = document.getElementById('cl-ollama-model-sel');
  const model = sel?.value || 'llama3';
  const url = 'http://localhost:11434/v1/chat/completions';

  const provEl   = document.getElementById('providerSelect');
  const urlEl    = document.getElementById('customUrlInput');
  const modelEl  = document.getElementById('modelInput');
  const keyEl    = document.getElementById('apiKey');

  if (provEl)  provEl.value  = 'openai_compat';
  if (urlEl)   urlEl.value   = url;
  if (modelEl) modelEl.value = model;
  if (keyEl)   keyEl.value   = 'ollama';

  localStorage.setItem('v2_provider',   'openai_compat');
  localStorage.setItem('v2_custom_url', url);
  localStorage.setItem('v2_model',      model);
  localStorage.setItem('v2_apikey',     'ollama');

  if (typeof onProviderChange === 'function') onProviderChange();

  // Visual feedback
  const btn = document.getElementById('cl-ollama-btn');
  if (btn) { const orig = btn.textContent; btn.textContent = '✓ Applied!'; setTimeout(() => btn.textContent = orig, 1800); }
}

// ── Classic View: OpenRouter ──────────────────────────────

const _CL_OR_DEFAULTS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free',    name: 'Llama 3.3 70B' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free', name: 'Hermes 3 405B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free',    name: 'Nemotron 120B' },
  { id: 'openai/gpt-oss-120b:free',                  name: 'GPT-OSS 120B' },
  { id: 'google/gemma-4-31b-it:free',                name: 'Gemma 4 31B' },
  { id: 'qwen/qwen3-coder:free',                     name: 'Qwen3 Coder' },
  { id: 'meta-llama/llama-3.2-3b-instruct:free',     name: 'Llama 3.2 3B (fast)' },
];

async function _detectOpenRouterModelsClassic() {
  const sel    = document.getElementById('cl-or-model-sel');
  const status = document.getElementById('cl-or-status');
  const btn    = document.getElementById('cl-or-btn');
  const ki     = document.getElementById('cl-or-key-input');
  if (!sel) return;

  const savedKey   = localStorage.getItem('v2_or_apikey') || '';
  const savedModel = localStorage.getItem('v2_or_model') || _CL_OR_DEFAULTS[0].id;
  if (ki) ki.value = savedKey;

  sel.innerHTML = _CL_OR_DEFAULTS.map(m =>
    `<option value="${m.id}"${m.id === savedModel ? ' selected' : ''}>${m.name}</option>`
  ).join('');
  if (savedKey && btn) btn.disabled = false;

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
    if (status) status.innerHTML = `<span style="color:#94a3b8">● ${_CL_OR_DEFAULTS.length} curated free models</span>`;
  }
}

function _orKeyInputClassic() {
  const ki  = document.getElementById('cl-or-key-input');
  const btn = document.getElementById('cl-or-btn');
  if (btn) btn.disabled = !(ki?.value.trim());
}

function _applyOpenRouterPresetClassic() {
  const ki    = document.getElementById('cl-or-key-input');
  const sel   = document.getElementById('cl-or-model-sel');
  const key   = ki?.value.trim() || '';
  const model = sel?.value || _CL_OR_DEFAULTS[0].id;
  if (!key) { alert('⚠️ Enter your OpenRouter API key first'); return; }

  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const provEl   = document.getElementById('providerSelect');
  const urlEl    = document.getElementById('customUrlInput');
  const modelEl  = document.getElementById('modelInput');
  const keyEl    = document.getElementById('apiKey');

  if (provEl)  provEl.value  = 'openai_compat';
  if (urlEl)   urlEl.value   = url;
  if (modelEl) modelEl.value = model;
  if (keyEl)   keyEl.value   = key;

  localStorage.setItem('v2_provider',   'openai_compat');
  localStorage.setItem('v2_custom_url', url);
  localStorage.setItem('v2_model',      model);
  localStorage.setItem('v2_apikey',     key);
  localStorage.setItem('v2_or_apikey',  key);
  localStorage.setItem('v2_or_model',   model);

  if (typeof onProviderChange === 'function') onProviderChange();

  // Visual feedback
  const btn = document.getElementById('cl-or-btn');
  if (btn) { const orig = btn.textContent; btn.textContent = '✓ Applied!'; setTimeout(() => btn.textContent = orig, 1800); }
}

// ── Data Freshness Badge ──────────────────────────────────
/**
 * Returns an HTML badge string for inline use in tables.
 * @param {string|number} year  - Source year, e.g. "2023" or "2022 est."
 * @param {'verified'|'estimated'|'live'} confidence
 * @returns {string} HTML badge string
 */
function _freshBadge(year, confidence) {
  if (!year) return '';
  const cfg = {
    verified:  { icon:'✓', cls:'badge-fresh-verified',  title:'Verified government/authoritative source' },
    estimated: { icon:'~', cls:'badge-fresh-estimated', title:'Estimated or modeled value' },
    live:      { icon:'⚡', cls:'badge-fresh-live',     title:'Live search result' },
  }[confidence] || { icon:'?', cls:'badge-fresh-estimated', title:'Source unknown' };
  return `<span class="fresh-badge ${cfg.cls}" title="${cfg.title}">${cfg.icon} ${year}</span>`;
}

/**
 * Parse a data_note string like "ACS 2023" → { year:"2023", confidence:"verified" }
 * Attaches the badge after any table cell that has a data-note attribute.
 */
function _autoFreshBadges(containerId) {
  const el = $(containerId);
  if (!el) return;
  el.querySelectorAll('[data-note]').forEach(cell => {
    const note = cell.dataset.note || '';
    const yearMatch = note.match(/\b(20\d\d)\b/);
    const year = yearMatch ? yearMatch[1] : null;
    const confidence = /est\.|estimated|model/i.test(note) ? 'estimated'
      : /live|search|real.?time/i.test(note) ? 'live' : 'verified';
    if (year) cell.innerHTML += ' ' + _freshBadge(year, confidence);
  });
}
