// ══════════════════════════════════════════════════════════
// 37-runs.js — Persistent Named Pipeline Runs
//
// Save named snapshots of complete pipeline results.
// Each run stores: name, date, inputs, R data, agent HTML.
// Last 10 runs kept in localStorage (biz_named_runs_v1).
// ══════════════════════════════════════════════════════════

const RUNS_STORE_KEY = 'biz_named_runs_v1';
const MAX_NAMED_RUNS = 10;

function _getRuns() {
  try { return JSON.parse(localStorage.getItem(RUNS_STORE_KEY) || '[]'); }
  catch(e) { return []; }
}

function _saveRuns(runs) {
  try { localStorage.setItem(RUNS_STORE_KEY, JSON.stringify(runs)); } catch(e) {}
}

function saveNamedRun(name) {
  if (!name || !name.trim()) return false;
  const runs = _getRuns();
  const agentCount = Object.keys(R).filter(k => k.startsWith('a')).length;
  // Capture rendered HTML for all completed agents
  const snapshots = {};
  for (let n = 1; n <= 17; n++) {
    const el = $('out-' + n);
    if (el && el.classList.contains('show')) {
      snapshots[n] = el.innerHTML;
    }
  }
  const run = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    date: new Date().toISOString(),
    zip: zip(),
    industry: $('industrySelect')?.value || 'daycare',
    radius: radius(),
    capacity: capacity(),
    budget: budget(),
    agentCount,
    verdict: R.a8?.verdict || null,
    verdictRationale: (R.a8?.verdict_rationale || '').slice(0, 120),
    oppScore: R.a2?.overall_opportunity_score || null,
    topCity: R.a3?.locations?.[0]?.city || R.a1?.cities?.[0]?.name || null,
    R: JSON.parse(JSON.stringify(R)),   // deep copy
    snapshots,
  };
  runs.unshift(run);
  if (runs.length > MAX_NAMED_RUNS) runs.length = MAX_NAMED_RUNS;
  _saveRuns(runs);
  return run.id;
}

function loadNamedRun(id) {
  const runs = _getRuns();
  const run = runs.find(r => r.id === id);
  if (!run) return false;
  // Restore inputs
  const zi = $('zip'); if(zi) zi.value = run.zip || '';
  const ind = $('industrySelect'); if(ind) { ind.value = run.industry || 'daycare'; if(typeof onIndustryChange==='function') onIndustryChange(); }
  const ra = $('radius'); if(ra) ra.value = run.radius || '40';
  const ca = $('capacity'); if(ca) ca.value = run.capacity || '75';
  const bu = $('budget'); if(bu) bu.value = run.budget || '600000';
  // Restore R
  Object.keys(run.R || {}).forEach(k => { R[k] = run.R[k]; });
  // Restore agent HTML
  Object.entries(run.snapshots || {}).forEach(([n, html]) => {
    const el = $('out-' + n);
    if (el) { el.innerHTML = html; el.className = 'agent-out show'; }
    setDot(n, 'done');
  });
  // Show verdict
  if (run.R?.a8) {
    try {
      const d = run.R.a8;
      const vl = (d.verdict || '').toLowerCase();
      const vc = vl === 'go' ? 'v-go' : vl.includes('caution') ? 'v-caution' : 'v-nogo';
      const vi = vl === 'go' ? '✓ GO' : vl.includes('caution') ? '⚡ CAUTIOUS GO' : '✗ NO GO';
      const vEl = $('verdictEl');
      if (vEl) vEl.innerHTML = `<div class="verdict ${vc}">${vi} — ${d.verdict_rationale}</div>`;
      const fb = $('finalBox'); if(fb) fb.className = 'final-box show';
    } catch(e) {}
  }
  return true;
}

function deleteNamedRun(id) {
  const runs = _getRuns().filter(r => r.id !== id);
  _saveRuns(runs);
  renderRunsPanel();
}

function clearAllNamedRuns() {
  if (!confirm('Clear all saved runs?')) return;
  try { localStorage.removeItem(RUNS_STORE_KEY); } catch(e) {}
  renderRunsPanel();
}

function promptSaveRun() {
  const def = `ZIP ${zip()} — ${new Date().toLocaleDateString('en-US', {month:'short', year:'numeric'})}`;
  const name = window.prompt('Name this run:', def);
  if (!name) return;
  const id = saveNamedRun(name);
  if (id) {
    const btn = $('saveRunBtn');
    if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => btn.textContent = '💾 Save Run', 2000); }
    renderRunsPanel();
  }
}

function toggleRunsPanel() {
  const panel = $('runsPanel');
  const btn   = $('runsPanelBtn');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.textContent = isOpen ? '📂 Runs' : '📂 Runs ▲';
  if (!isOpen) renderRunsPanel();
}

function renderRunsPanel() {
  const panel = $('runsPanel');
  if (!panel || panel.style.display === 'none') return;
  const runs = _getRuns();
  if (!runs.length) {
    panel.innerHTML = `<div class="runs-panel-inner"><div class="runs-empty">No saved runs yet — complete a pipeline then click <strong>💾 Save Run</strong> to save it.</div></div>`;
    return;
  }
  const rows = runs.map(r => {
    const vl = (r.verdict || '').toLowerCase();
    const vc = vl === 'go' ? 'h-vgo' : vl.includes('caution') ? 'h-vcaution' : vl === 'no go' ? 'h-vnogo' : 'h-vna';
    const vi = vl === 'go' ? '✓ GO' : vl.includes('caution') ? '⚡ CAUTIOUS' : vl === 'no go' ? '✗ NO GO' : '—';
    const ind = INDUSTRIES[r.industry] || { emoji:'🏢', label:r.industry };
    const when = (() => { try { const d = new Date(r.date); return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}); } catch(e){return r.date||'';} })();
    return `
    <div class="runs-item">
      <div class="runs-meta">
        <div class="runs-name">${r.name}</div>
        <div class="runs-detail">${ind.emoji} ${ind.label} · ZIP ${r.zip} · ${r.agentCount} agents</div>
        ${r.topCity ? `<div class="runs-detail">Top city: ${r.topCity}${r.oppScore ? ` · Opp score ${r.oppScore}` : ''}</div>` : ''}
        <div class="runs-when">${when}</div>
      </div>
      <div class="runs-verdict-badge ${vc}">${vi}</div>
      <div class="runs-actions">
        <button class="runs-btn" onclick="loadNamedRun('${r.id}');toggleRunsPanel()">↩ Load</button>
        <button class="runs-del-btn" onclick="deleteNamedRun('${r.id}')" title="Delete">✕</button>
      </div>
    </div>`;
  }).join('');
  panel.innerHTML = `
  <div class="runs-panel-inner">
    <div class="runs-header">
      <span>Saved Runs (${runs.length}/${MAX_NAMED_RUNS})</span>
      <button class="runs-clear-btn" onclick="clearAllNamedRuns()">Clear All</button>
    </div>
    <div class="runs-list">${rows}</div>
    <div class="runs-hint">Tip: Save before changing inputs to compare conservative vs aggressive budget scenarios side by side.</div>
  </div>`;
}
