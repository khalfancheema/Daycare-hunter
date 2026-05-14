// ══════════════════════════════════════════════════════════
// 30-session.js — Auto-save, Session Restore & Shareable URL
// Features:
//   • Auto-saves R + rendered HTML to localStorage after every agent
//   • Session restore banner on page load (24-hour TTL)
//   • Restore R + inputs + HTML without re-running agents
//   • URL params: ?zip=&industry=&radius=&capacity=&budget=
//   • Copy shareable link button
// ══════════════════════════════════════════════════════════

const SESSION_KEY = 'biz_session_v1';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ── Auto-save (wrap showOut) ─────────────────────────────────
(function patchShowOutForSession() {
  const _prev = window.showOut;
  window.showOut = function(n) {
    if (_prev) _prev(n);
    clearTimeout(window._sessionSaveTimer);
    window._sessionSaveTimer = setTimeout(_sessionAutoSave, 600);
  };
})();

function _sessionAutoSave() {
  try {
    const agentHtml = {};
    for (let n = 1; n <= 17; n++) {
      const el = $('out-' + n);
      if (el && el.innerHTML.trim()) agentHtml[n] = el.innerHTML;
    }
    const snap = {
      ts:       Date.now(),
      zip:      $('zip')            ? $('zip').value             : '',
      radius:   $('radius')         ? $('radius').value          : '',
      capacity: $('capacity')       ? $('capacity').value        : '',
      budget:   $('budget')         ? $('budget').value          : '',
      industry: $('industrySelect') ? $('industrySelect').value  : 'daycare',
      grades:   $('grades')         ? $('grades').value          : '',
      R:        R,
      html:     agentHtml,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(snap));
  } catch(e) { console.warn('Session auto-save failed:', e.message); }
}

// ── Session restore ──────────────────────────────────────────
function _sessionLoad() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Date.now() - d.ts > SESSION_TTL) { localStorage.removeItem(SESSION_KEY); return null; }
    return d;
  } catch(e) { return null; }
}

function sessionRestore() {
  const d = _sessionLoad();
  if (!d) return;

  // Restore inputs
  if ($('zip')            && d.zip)      $('zip').value            = d.zip;
  if ($('radius')         && d.radius)   $('radius').value         = d.radius;
  if ($('capacity')       && d.capacity) $('capacity').value       = d.capacity;
  if ($('budget')         && d.budget)   $('budget').value         = d.budget;
  if ($('industrySelect') && d.industry) {
    $('industrySelect').value = d.industry;
    if (typeof onIndustryChange === 'function') onIndustryChange();
  }
  if ($('grades') && d.grades) $('grades').value = d.grades;

  // Restore R object — clear stale keys first so a smaller saved session
  // doesn't leave keys from a previous larger run.
  if (d.R) {
    try {
      Object.keys(R).forEach(k => { delete R[k]; });
      Object.assign(R, d.R);
    } catch(e) {}
  }

  // Restore rendered HTML into agent output panels
  if (d.html) {
    Object.entries(d.html).forEach(([n, html]) => {
      const out  = $('out-'  + n);
      const card = $('card-' + n);
      const dot  = $('dot-'  + n);
      if (out) {
        out.innerHTML = html;
        // Use 'show' class to match what tab()/agent-out:show CSS expects.
        // (Older code used 'visible' which the rest of the UI doesn't react to.)
        out.classList.add('show');
      }
      if (card) card.classList.add('done');
      if (dot)  dot.className = 'agent-dot done';
    });
  }

  // Hide banner
  const banner = $('sessionRestoreBanner');
  if (banner) banner.style.display = 'none';

  // Friendly notice
  const count = d.html ? Object.keys(d.html).length : 0;
  showErr(`Session restored — ${count} agent${count!==1?'s':''} loaded. Charts need a ↺ Re-run to re-render.`, 'info');
  setTimeout(hideErr, 6000);
}

function sessionDiscard() {
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
  const banner = $('sessionRestoreBanner');
  if (banner) banner.style.display = 'none';
}

function sessionCheckOnLoad() {
  const d = _sessionLoad();
  if (!d) return;
  const ageMs  = Date.now() - d.ts;
  const ageMin = Math.round(ageMs / 60000);
  const ageStr = ageMin < 60 ? ageMin + ' min ago' : Math.round(ageMin / 60) + 'h ago';
  const count  = d.html ? Object.keys(d.html).length : 0;
  const banner = $('sessionRestoreBanner');
  if (!banner) return;
  banner.innerHTML = `
    <div class="session-inner">
      <span class="session-ico">💾</span>
      <div class="session-text">
        <strong>Previous session found</strong> &mdash;
        ZIP&nbsp;${d.zip||'?'} &middot; ${d.industry||'?'} &middot; ${count} agent${count!==1?'s':''} completed
        <span class="session-age">(saved ${ageStr})</span>
      </div>
      <button class="session-btn-restore" onclick="sessionRestore()">↩ Restore</button>
      <button class="session-btn-discard" onclick="sessionDiscard()">✕ Discard</button>
    </div>`;
  banner.style.display = 'block';
}

// ── Shareable URL ────────────────────────────────────────────
function urlParamsApply() {
  const p = new URLSearchParams(window.location.search);
  if (p.has('zip')      && $('zip'))            $('zip').value            = p.get('zip');
  if (p.has('radius')   && $('radius'))         $('radius').value         = p.get('radius');
  if (p.has('capacity') && $('capacity'))       $('capacity').value       = p.get('capacity');
  if (p.has('budget')   && $('budget'))         $('budget').value         = p.get('budget');
  if (p.has('industry') && $('industrySelect')) {
    $('industrySelect').value = p.get('industry');
    if (typeof onIndustryChange === 'function') onIndustryChange();
  }
}

function urlParamsUpdate() {
  try {
    const p = new URLSearchParams();
    const ind = $('industrySelect') ? $('industrySelect').value : '';
    const z   = $('zip')            ? $('zip').value.trim()     : '';
    const rad = $('radius')         ? $('radius').value         : '';
    const cap = $('capacity')       ? $('capacity').value       : '';
    const bud = $('budget')         ? $('budget').value         : '';
    if (ind) p.set('industry', ind);
    if (z)   p.set('zip',      z);
    if (rad) p.set('radius',   rad);
    if (cap) p.set('capacity', cap);
    if (bud) p.set('budget',   bud);
    history.replaceState(null, '', window.location.pathname + '?' + p.toString());
  } catch(e) {}
}

function copyShareableLink() {
  urlParamsUpdate();
  const url = window.location.href;
  const btn = $('copyLinkBtn');
  const done = () => {
    if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = '🔗 Copy Link', 2200); }
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(done).catch(() => { prompt('Copy this URL:', url); done(); });
  } else {
    prompt('Copy this URL:', url);
    done();
  }
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  urlParamsApply();
  sessionCheckOnLoad();
  // Keep URL in sync when inputs change
  ['zip','radius','capacity','budget','industrySelect'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', urlParamsUpdate);
  });
});
