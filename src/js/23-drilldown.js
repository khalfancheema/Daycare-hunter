// ══════════════════════════════════════════════════════════
// AGENT DRILL-DOWN MODAL  (23-drilldown.js)
// ══════════════════════════════════════════════════════════

const AGENT_META = {
  1:  { name:'Demographics',             ico:'📊' },
  2:  { name:'Gap Analysis',             ico:'📈' },
  3:  { name:'Site Selection',           ico:'📍' },
  4:  { name:'Real Estate',              ico:'🏢' },
  5:  { name:'Compliance',               ico:'⚖️' },
  6:  { name:'Competitive Intelligence', ico:'🔍' },
  7:  { name:'Financial Feasibility',    ico:'💰' },
  8:  { name:'Executive Summary',        ico:'📋' },
  9:  { name:'Business Plan',            ico:'🏦' },
  10: { name:'Project Plan',             ico:'🗂️' },
  11: { name:'Market Map',               ico:'🗺️' },
  12: { name:'Grant & Funding',          ico:'💵' },
  13: { name:'Competitor Deep-Dive',     ico:'🎯' },
  14: { name:'Code Review',              ico:'🔬' },
  15: { name:'QA & Testing',             ico:'✅' },
  16: { name:'Build vs Buy',             ico:'🏗️' },
  17: { name:'Sources & Citations',      ico:'📚' },
};

function injectExpandButtons() {
  for (let n = 1; n <= 17; n++) {
    const head = document.querySelector('#card-' + n + ' .agent-head');
    if (!head || head.querySelector('.expand-btn')) continue;
    const btn = document.createElement('button');
    btn.className = 'expand-btn';
    btn.title = 'Expand · Save · Print';
    btn.textContent = '⤢';
    btn.onclick = (function(x){ return function(){ openAgentModal(x); }; })(n);
    const dot = head.querySelector('.agent-dot');
    dot ? head.insertBefore(btn, dot) : head.appendChild(btn);
  }
}

function openAgentModal(n) {
  const overlay = document.getElementById('agentModalOverlay');
  if (!overlay) return;
  const meta = AGENT_META[n] || { name:'Agent '+n, ico:'🤖' };
  const data = R['a'+n];
  document.getElementById('modalAgentIco').textContent  = meta.ico;
  document.getElementById('modalAgentName').textContent = meta.name;
  document.getElementById('modalAgentNum').textContent  = 'Agent ' + n;
  const srcOut = document.getElementById('out-' + n);
  const body   = document.getElementById('modalAgentBody');
  body.innerHTML = '';
  if (srcOut && srcOut.classList.contains('show')) {
    const clone = srcOut.cloneNode(true);
    clone.id = 'modal-out-clone';
    clone.style.cssText = 'display:block;margin-top:0;padding-top:0;border-top:none';
    clone.querySelectorAll('.tab').forEach(function(t) {
      t.setAttribute('onclick', (t.getAttribute('onclick')||'').replace(/\btab\s*\(/g, 'modalTab('));
    });
    clone.querySelectorAll('.raw-toggle').forEach(function(b) {
      b.setAttribute('onclick', (b.getAttribute('onclick')||'').replace(/\bshowRaw\s*\(/g, 'modalShowRaw('));
    });
    var rawEl = clone.querySelector('[id^="raw-"]');
    if (rawEl) rawEl.id = 'modal-raw-' + n;
    body.appendChild(clone);
  } else {
    body.innerHTML = '<div style="padding:48px;text-align:center;color:var(--muted);font-size:14px">No data yet — run this agent first.</div>';
  }
  document.getElementById('modalSaveBtn').style.display  = data ? '' : 'none';
  document.getElementById('modalPrintBtn').style.display = (srcOut && srcOut.classList.contains('show')) ? '' : 'none';

  // Inject reasoning card if agent data has reasoning fields
  if (data) {
    var reasoningHtml = _buildModalReasoningCard(data, n);
    if (reasoningHtml) {
      var reasoningDiv = document.createElement('div');
      reasoningDiv.innerHTML = reasoningHtml;
      body.insertBefore(reasoningDiv, body.firstChild);
    }
  }

  overlay.dataset.agentN = n;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function _buildModalReasoningCard(rawData, agentN) {
  var d;
  try { d = typeof rawData === 'string' ? JSON.parse(rawData) : rawData; } catch(e) { return ''; }
  if (!d || typeof d !== 'object') return '';

  // Look for top-level reasoning fields
  var reasoningFields = ['reasoning', 'why_chosen', 'selection_rationale', 'recommendation_reasoning',
    'rationale', 'decision_rationale', 'why', 'key_insights', 'go_no_go_reasoning',
    'summary_reasoning', 'recommendation_rationale'];
  var found = null;
  var foundKey = '';
  for (var i = 0; i < reasoningFields.length; i++) {
    if (d[reasoningFields[i]]) { found = d[reasoningFields[i]]; foundKey = reasoningFields[i]; break; }
  }
  // Also check nested recommendation object
  if (!found && d.recommendation && typeof d.recommendation === 'object') {
    for (var j = 0; j < reasoningFields.length; j++) {
      if (d.recommendation[reasoningFields[j]]) {
        found = d.recommendation[reasoningFields[j]]; foundKey = reasoningFields[j]; break;
      }
    }
  }
  if (!found) return '';

  var items = [];
  if (typeof found === 'string') {
    items = found.split(/\.\s+/).filter(function(s){ return s.trim().length > 20; }).slice(0, 6);
  } else if (Array.isArray(found)) {
    items = found.slice(0, 6).map(function(x){ return typeof x === 'string' ? x : JSON.stringify(x); });
  }
  if (!items.length) return '';

  var itemsHtml = items.map(function(item) {
    return '<div class="reasoning-item">' + item.trim().replace(/\.$/, '') + '.</div>';
  }).join('');

  // Check for sources
  var sources = d.reasoning_sources || d.data_sources || d.sources_used || null;
  var sourcesHtml = '';
  if (sources && Array.isArray(sources) && sources.length) {
    sourcesHtml = '<div class="reasoning-source">📚 Sources: ' + sources.slice(0,5).join(' · ') + '</div>';
  }

  return '<div class="reasoning-card" style="margin-bottom:16px">' +
    '<div class="reasoning-title">💡 Why This Recommendation</div>' +
    itemsHtml + sourcesHtml + '</div>';
}

function closeAgentModal() {
  var overlay = document.getElementById('agentModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function modalTab(agentId, key) {
  var clone = document.getElementById('modal-out-clone');
  if (!clone) return;
  clone.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
  clone.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
  var panel = clone.querySelector('#' + agentId + '-' + key);
  if (panel) panel.classList.add('active');
  clone.querySelectorAll('.tab').forEach(function(t){
    if ((t.getAttribute('onclick')||'').indexOf("'" + key + "'") !== -1) t.classList.add('active');
  });
}

function modalShowRaw(n) {
  var el = document.getElementById('modal-raw-' + n);
  if (!el) return;
  if (el.style.display === 'block') { el.style.display = 'none'; return; }
  var d = R['a'+n];
  if (!d) { el.innerHTML = '<pre style="color:var(--muted)">No data yet.</pre>'; el.style.display = 'block'; return; }
  var safe = JSON.stringify(d,null,2).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  el.innerHTML = '<pre style="font-size:11px;line-height:1.5">' + safe + '</pre>';
  el.style.display = 'block';
}

function saveAgentJSON() {
  var overlay = document.getElementById('agentModalOverlay');
  if (!overlay) return;
  var n = parseInt(overlay.dataset.agentN);
  var data = R['a'+n];
  if (!data) return;
  var meta = AGENT_META[n] || { name:'agent-'+n };
  var name = meta.name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  var blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'agent-' + n + '-' + name + '-' + Date.now() + '.json';
  a.click();
}

function printAgentData() {
  var overlay = document.getElementById('agentModalOverlay');
  if (!overlay) return;
  var n    = parseInt(overlay.dataset.agentN);
  var data = R['a'+n];
  var meta = AGENT_META[n] || { name:'Agent '+n, ico:'🤖' };
  var srcOut = document.getElementById('out-'+n);
  var w = window.open('','_blank');
  if (!w) { if (typeof showErr === 'function') showErr('Pop-up blocked — allow pop-ups for this site to print agent reports.'); return; }
  var content = '';
  if (srcOut) {
    var panels = srcOut.querySelectorAll('.panel');
    var tabs   = srcOut.querySelectorAll('.tab');
    panels.forEach(function(panel, i) {
      if (!(panel.innerText||'').trim()) return;
      var label = tabs[i] ? tabs[i].textContent.trim() : 'Section '+(i+1);
      content += '<section><h3>'+label+'</h3><div class="c">'+panel.innerHTML+'</div></section>';
    });
    srcOut.querySelectorAll('.prose').forEach(function(p) {
      if (!p.closest('.panel') && (p.innerText||'').trim())
        content += '<section><div class="c">'+p.innerHTML+'</div></section>';
    });
  }
  var jsonBlob = data ? '<section><h3>Raw JSON</h3><pre>'
    + JSON.stringify(data,null,2).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    + '</pre></section>' : '';
  var zipVal = (document.getElementById('zipInput')||{}).value||'';
  var indVal = (document.getElementById('industrySelect')||{}).value||'';
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+meta.ico+' '+meta.name+' — Business Hunter</title>'
    +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;color:#111;padding:32px;max-width:900px;margin:0 auto}'
    +'h1{font-size:22px;margin-bottom:4px}.meta{font-size:11px;color:#666;margin-bottom:24px}'
    +'h3{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #eee}'
    +'section{margin-bottom:24px;page-break-inside:avoid}.c{font-size:13px;line-height:1.65}'
    +'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}'
    +'th{background:#f5f5f5;text-align:left;padding:6px 10px;border:1px solid #ddd;font-weight:600}'
    +'td{padding:5px 10px;border:1px solid #ddd;vertical-align:top}'
    +'pre{font-size:11px;background:#f9f9f9;border:1px solid #eee;padding:12px;border-radius:4px;white-space:pre-wrap;overflow-wrap:break-word}'
    +'@media print{body{padding:16px}}</style></head><body>'
    +'<h1>'+meta.ico+' '+meta.name+'</h1>'
    +'<div class="meta">Agent '+n+' · Business Hunter'+(zipVal?' · ZIP '+zipVal:'')+(indVal?' · '+indVal:'')+' · '+new Date().toLocaleString()+'</div>'
    +content+jsonBlob+'</body></html>');
  w.document.close();
  w.focus();
  setTimeout(function(){ try { w.print(); } catch(e) {} }, 400);
}

document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeAgentModal(); });
document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectExpandButtons, 200); });
(function(){
  var _orig = window.showOut;
  if (typeof _orig === 'function') {
    window.showOut = function(n){ _orig(n); setTimeout(injectExpandButtons, 60); };
  }
})();
