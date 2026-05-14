// ══════════════════════════════════════════════════════════
// 29-export.js  — Per-agent export (PDF · Word · Excel · Slides)
//                + Industry Comparison engine
// ══════════════════════════════════════════════════════════

// ── Agent info map (separate from AGENT_META to avoid collision)
const AGENT_INFO = {
  1:{name:'Demographics',ico:'📊'},
  2:{name:'Gap Analysis',ico:'📈'},
  3:{name:'Site Selection',ico:'📍'},
  4:{name:'Real Estate',ico:'🏢'},
  5:{name:'Compliance',ico:'⚖️'},
  6:{name:'Competitive Intelligence',ico:'🔍'},
  7:{name:'Financial Feasibility',ico:'💰'},
  8:{name:'Executive Summary',ico:'📋'},
  9:{name:'Business Plan',ico:'🏦'},
  10:{name:'Project Plan',ico:'🗂️'},
  11:{name:'Market Map',ico:'🗺️'},
  12:{name:'Grant & Funding',ico:'💵'},
  13:{name:'Competitor Deep-Dive',ico:'🎯'},
  14:{name:'Code Review',ico:'🔬'},
  15:{name:'QA & Testing',ico:'✅'},
  16:{name:'Build vs Buy',ico:'🏗️'},
  17:{name:'Sources & Citations',ico:'📚'}
};

// ── Toggle export dropdown ──────────────────────────────────
function toggleExportMenu(n) {
  var menus = document.querySelectorAll('.export-menu.open');
  menus.forEach(function(m){ if(m.id !== 'export-menu-'+n) m.classList.remove('open'); });
  var menu = document.getElementById('export-menu-'+n);
  if (menu) menu.classList.toggle('open');
}
document.addEventListener('click', function(e){
  if (!e.target.closest('.export-dropdown'))
    document.querySelectorAll('.export-menu.open').forEach(function(m){ m.classList.remove('open'); });
});

// ── Inject export buttons into every agent card ─────────────
function injectExportButtons() {
  for (var n = 1; n <= 17; n++) {
    var head = document.querySelector('#card-' + n + ' .agent-head');
    if (!head || head.querySelector('.export-dropdown')) continue;
    var dd = document.createElement('div');
    dd.className = 'export-dropdown';
    dd.id = 'exp-' + n;
    (function(agentN){
      dd.innerHTML =
        '<button class="export-btn" onclick="event.stopPropagation();toggleExportMenu(' + agentN + ')" title="Export this agent\'s data">⬇ Export</button>' +
        '<div class="export-menu" id="export-menu-' + agentN + '">' +
          '<button onclick="exportAgentPDF(' + agentN + ')">📄 Save PDF</button>' +
          '<button onclick="exportAgentWord(' + agentN + ')">📝 Word Doc</button>' +
          '<button onclick="exportAgentExcel(' + agentN + ')">📊 Excel / CSV</button>' +
          '<button onclick="exportAgentSlides(' + agentN + ')">📽 Slides</button>' +
        '</div>';
    })(n);
    var dot = head.querySelector('.agent-dot');
    if (dot) head.insertBefore(dd, dot); else head.appendChild(dd);
  }
}

// ── Light-mode print CSS shared by PDF and Word ─────────────
function _lightCSS() {
  return [
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:"Segoe UI",Arial,sans-serif;background:#fff;color:#111;padding:28px;max-width:920px;margin:0 auto;font-size:13px}',
    'h1{font-size:22px;font-weight:700;margin-bottom:4px;color:#1a2a4a}',
    'h2{font-size:16px;font-weight:700;margin:18px 0 8px;color:#1a2a4a;border-bottom:1px solid #ddd;padding-bottom:5px}',
    'h3{font-size:13px;font-weight:700;margin:12px 0 5px;color:#333}',
    '.subtitle{font-size:12px;color:#666;margin-bottom:22px;padding-bottom:12px;border-bottom:2px solid #e8eaf0}',
    'table{width:100%;border-collapse:collapse;font-size:12px;margin:10px 0}',
    'th{background:#f0f4fa;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;border:1px solid #d0d8e8;color:#2a3a6a;font-weight:700}',
    'td{padding:6px 10px;border:1px solid #e0e8f0;vertical-align:top}',
    'tr:nth-child(even) td{background:#f8faff}',
    '.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid #ccc}',
    '.b-green{background:#d4f7e7;color:#0a6644;border-color:#3dd68c}',
    '.b-amber{background:#fff3cd;color:#856404;border-color:#f5a623}',
    '.b-red{background:#ffe5e5;color:#b30000;border-color:#ff5f5f}',
    '.b-blue{background:#e8f2ff;color:#1a56db;border-color:#4a9eff}',
    'pre{background:#f8f8f8;padding:10px;border-radius:4px;font-size:11px;overflow-x:auto;white-space:pre-wrap;border:1px solid #e0e0e0}',
    '.prose{font-size:13px;line-height:1.8;white-space:pre-wrap;color:#333}',
    '.agent-out{display:block!important}',
    '.panel{display:block!important;margin-bottom:16px}',
    '.tabs,.rerun-btn,.expand-btn,.export-dropdown,.raw-data-wrap,.raw-toggle{display:none!important}',
    '@media print{body{padding:12px}.page-break{page-break-after:always}}'
  ].join('\n');
}

// ── PDF (print dialog) ──────────────────────────────────────
function exportAgentPDF(n) {
  var info = AGENT_INFO[n] || {name:'Agent '+n, ico:'🤖'};
  var out  = document.getElementById('out-'+n);
  if (!out) { alert('No data yet for Agent '+n+' — run the pipeline first.'); return; }
  var ind = industry();
  var w = window.open('', '_blank');
  if (!w) { if (typeof showErr === 'function') showErr('Pop-up blocked — allow pop-ups to export as PDF.'); return; }
  var cloned = out.cloneNode(true);
  // Show all panels in print view
  cloned.querySelectorAll('.panel').forEach(function(p){ p.style.display='block'; });
  cloned.querySelectorAll('.tabs,.raw-toggle,.raw-data-wrap,.rerun-btn,.expand-btn,.export-dropdown').forEach(function(el){ el.style.display='none'; });
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+info.ico+' '+info.name+'</title><style>'+_lightCSS()+'</style></head><body>'+
    '<h1>'+info.ico+' '+info.name+'</h1>'+
    '<div class="subtitle">'+(ind&&ind.label||'')+' Analysis · ZIP '+zip()+' · '+new Date().toLocaleDateString()+'</div>'+
    cloned.innerHTML+
    '</body></html>');
  w.document.close();
  setTimeout(function(){ try { w.focus(); w.print(); } catch(e) {} }, 600);
}

// ── Word (.doc download) ────────────────────────────────────
function exportAgentWord(n) {
  var info = AGENT_INFO[n] || {name:'Agent '+n, ico:'🤖'};
  var out  = document.getElementById('out-'+n);
  if (!out) { alert('No data yet for Agent '+n+' — run the pipeline first.'); return; }
  var ind = industry();
  var cloned = out.cloneNode(true);
  cloned.querySelectorAll('.panel').forEach(function(p){ p.style.display='block'; });
  cloned.querySelectorAll('.tabs,.raw-toggle,.raw-data-wrap,.rerun-btn,.expand-btn,.export-dropdown').forEach(function(el){ el.style.display='none'; });
  var wordCss = _lightCSS() + '\nbody{font-family:Calibri,Arial,sans-serif}h1,h2,h3{font-family:Calibri,Arial,sans-serif}';
  var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="UTF-8"><title>'+info.name+'</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->' +
    '<style>'+wordCss+'</style></head>' +
    '<body><h1>'+info.ico+' '+info.name+'</h1>' +
    '<div class="subtitle">'+ind.label+' Analysis · ZIP '+zip()+' · '+new Date().toLocaleDateString()+'</div>' +
    cloned.innerHTML+'</body></html>';
  var blob = new Blob(['﻿'+html], {type:'application/msword'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = info.name.toLowerCase().replace(/\s+/g,'-') + '-' + zip() + '.doc';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
}

// ── Excel / CSV ─────────────────────────────────────────────
function exportAgentExcel(n) {
  var info = AGENT_INFO[n] || {name:'Agent '+n, ico:'🤖'};
  var out  = document.getElementById('out-'+n);
  if (!out) { alert('No data yet for Agent '+n+' — run the pipeline first.'); return; }

  // Extract all tables from the rendered output
  var tables = out.querySelectorAll('table');
  var csvParts = [];

  tables.forEach(function(tbl, ti) {
    if (ti > 0) csvParts.push(['']); // blank separator
    var headerRow = tbl.querySelector('thead tr');
    if (headerRow) {
      csvParts.push(Array.from(headerRow.querySelectorAll('th')).map(function(th){ return '"'+th.innerText.replace(/\n/g,' ').trim().replace(/"/g,'""')+'"'; }));
    }
    tbl.querySelectorAll('tbody tr').forEach(function(tr){
      csvParts.push(Array.from(tr.querySelectorAll('td')).map(function(td){ return '"'+td.innerText.replace(/\n/g,' ').trim().replace(/"/g,'""')+'"'; }));
    });
  });

  // Fallback: flatten agent JSON if no tables
  if (!csvParts.length) {
    var rawData = R && R['a'+n] ? R['a'+n] : null;
    if (rawData) {
      var d; try { d = typeof rawData === 'string' ? JSON.parse(rawData) : rawData; } catch(e){}
      if (d) csvParts = _flattenToCSV(d, info.name);
    }
  }

  if (!csvParts.length) { alert('No tabular data found for this agent.'); return; }

  var csv = csvParts.map(function(row){ return row.join(','); }).join('\n');
  var blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8;'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = info.name.toLowerCase().replace(/\s+/g,'-') + '-' + zip() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
}

function _flattenToCSV(obj, agentName) {
  var rows = [['"Agent"','"Key"','"Sub-Key"','"Value"']];
  function walk(o, prefix) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) {
      o.forEach(function(item, i){
        if (item && typeof item === 'object') {
          Object.entries(item).forEach(function(e){
            if (typeof e[1] !== 'object') rows.push(['"'+agentName+'"','"'+prefix+'"','"'+e[0]+'"','"'+String(e[1]).replace(/"/g,'""')+'"']);
          });
        } else {
          rows.push(['"'+agentName+'"','"'+prefix+'"','"'+i+'"','"'+String(item).replace(/"/g,'""')+'"']);
        }
      });
    } else {
      Object.entries(o).forEach(function(e){
        var full = prefix ? prefix+'.'+e[0] : e[0];
        if (e[1] && typeof e[1] === 'object') walk(e[1], full);
        else rows.push(['"'+agentName+'"','"'+(prefix||'root')+'"','"'+e[0]+'"','"'+String(e[1]||'').replace(/"/g,'""')+'"']);
      });
    }
  }
  walk(obj, '');
  return rows.length > 1 ? rows : [];
}

// ── Slides (HTML presentation) ───────────────────────────────
function exportAgentSlides(n) {
  var info = AGENT_INFO[n] || {name:'Agent '+n, ico:'🤖'};
  var ind  = industry();
  var rawData = R && R['a'+n] ? R['a'+n] : null;
  var d = null;
  if (rawData) { try { d = typeof rawData === 'string' ? JSON.parse(rawData) : rawData; } catch(e){} }

  var slides = _buildSlides(n, d, info, ind);

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+info.ico+' '+info.name+' — Presentation</title><style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:"Segoe UI",Arial,sans-serif;background:#0a0b0e;color:#eee;padding:20px}' +
    '.deck{display:flex;flex-direction:column;gap:20px;max-width:960px;margin:0 auto}' +
    '.slide{background:linear-gradient(135deg,#1a1d24 0%,#13151a 100%);border:1px solid #2a2d35;border-radius:12px;padding:42px 50px;min-height:520px;display:flex;flex-direction:column;position:relative;page-break-after:always}' +
    '.slide-num{position:absolute;top:14px;right:18px;font-size:10px;color:#4a5068;font-weight:700}' +
    '.slide-tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#4a9eff;margin-bottom:14px}' +
    '.slide h1{font-size:32px;font-weight:700;line-height:1.2;margin-bottom:10px}' +
    '.slide h2{font-size:22px;font-weight:700;color:#4a9eff;margin-bottom:14px}' +
    '.slide p,.slide li{font-size:15px;line-height:1.75;color:#a0b0c0;margin-bottom:8px}' +
    '.slide ul{padding-left:22px}' +
    '.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px}' +
    '.stat-card{background:rgba(74,158,255,0.08);border:1px solid rgba(74,158,255,0.25);border-radius:8px;padding:16px;text-align:center}' +
    '.stat-val{font-size:26px;font-weight:700;color:#4a9eff}' +
    '.stat-lbl{font-size:10px;color:#6a7a90;text-transform:uppercase;letter-spacing:0.07em;margin-top:4px}' +
    'table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}' +
    'th{background:rgba(74,158,255,0.12);padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#4a9eff;border-bottom:1px solid rgba(74,158,255,0.2)}' +
    'td{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.04);color:#b0c0d0}' +
    '.nav{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(10,11,14,0.9);backdrop-filter:blur(8px);border:1px solid #2a2d35;border-radius:40px;padding:8px 18px;display:flex;gap:10px;align-items:center;z-index:999}' +
    '.nav button{background:transparent;border:1px solid #2a2d35;color:#8a9ab0;border-radius:20px;padding:5px 14px;cursor:pointer;font-size:12px;transition:all 0.15s}' +
    '.nav button:hover{border-color:#4a9eff;color:#4a9eff}' +
    '@media print{.nav{display:none}.slide{page-break-after:always;border-radius:0;border:none;min-height:100vh}}' +
    '</style></head><body><div class="deck">'+slides+'</div>' +
    '<div class="nav"><button onclick="window.print()">🖨 Print / PDF</button><span style="color:#4a6080;font-size:11px">'+info.ico+' '+info.name+' · '+ind.label+' · ZIP '+zip()+'</span></div>' +
    '</body></html>';

  var blob = new Blob([html], {type:'text/html'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = info.name.toLowerCase().replace(/\s+/g,'-') + '-slides-' + zip() + '.html';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
}

function _buildSlides(n, d, info, ind) {
  var sNum = 0;
  function slide(tag, content) {
    sNum++;
    return '<div class="slide"><div class="slide-num">'+sNum+'</div><div class="slide-tag">'+tag+'</div>'+content+'</div>';
  }

  var out = '';
  // Title slide
  out += slide('Business Intelligence Report',
    '<h1>'+info.ico+' '+info.name+'</h1>'+
    '<p style="font-size:16px;color:#4a9eff;margin-bottom:20px">'+ind.label+' Analysis</p>'+
    '<div class="stat-grid">'+
    '<div class="stat-card"><div class="stat-val">'+zip()+'</div><div class="stat-lbl">ZIP Code</div></div>'+
    '<div class="stat-card"><div class="stat-val">'+radius()+' mi</div><div class="stat-lbl">Radius</div></div>'+
    '<div class="stat-card"><div class="stat-val">'+new Date().toLocaleDateString()+'</div><div class="stat-lbl">Generated</div></div>'+
    '</div>');

  if (!d) {
    out += slide('No Data', '<h2>No Data Available</h2><p>Run the pipeline first to generate agent data.</p>');
    return out;
  }

  // Summary slide (find first long string field)
  var summaryKeys = ['summary','executive_summary','overview','analysis_summary','narrative','qa_summary'];
  for (var si = 0; si < summaryKeys.length; si++) {
    if (d[summaryKeys[si]] && typeof d[summaryKeys[si]] === 'string' && d[summaryKeys[si]].length > 30) {
      out += slide('Summary', '<h2>Key Findings</h2><p>'+d[summaryKeys[si]].substring(0,700)+'</p>');
      break;
    }
  }

  // Data table slides for array fields
  var skip = new Set(['data_sources','sources','pros','cons','reasoning_sources']);
  Object.entries(d).forEach(function(entry){
    var k = entry[0], v = entry[1];
    if (!Array.isArray(v) || !v.length || typeof v[0] !== 'object' || skip.has(k)) return;
    var label = k.replace(/_/g,' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
    var cols = Object.keys(v[0]).filter(function(c){ return !['pros','cons','sources','centers','why_gap'].includes(c); }).slice(0,6);
    var rows = v.slice(0,10);
    var thead = '<tr>'+cols.map(function(c){ return '<th>'+c.replace(/_/g,' ')+'</th>'; }).join('')+'</tr>';
    var tbody = rows.map(function(row){ return '<tr>'+cols.map(function(c){ return '<td>'+(row[c]!=null?String(row[c]).substring(0,60):'—')+'</td>'; }).join('')+'</tr>'; }).join('');
    out += slide(label, '<h2>'+label+'</h2><table><thead>'+thead+'</thead><tbody>'+tbody+'</tbody></table>');
  });

  // Recommendation/conclusion slide
  var recKeys = ['recommendation','verdict','go_no_go','decision','top_recommendation'];
  for (var ri = 0; ri < recKeys.length; ri++) {
    if (d[recKeys[ri]]) {
      var rec = d[recKeys[ri]];
      var recStr = typeof rec === 'object' ? JSON.stringify(rec, null, 2) : String(rec);
      out += slide('Recommendation', '<h2>Recommendation</h2><pre style="font-size:12px;line-height:1.6;color:#8ab4d4;background:rgba(74,158,255,0.04);padding:16px;border-radius:8px;border:1px solid rgba(74,158,255,0.15)">'+recStr.substring(0,800)+'</pre>');
      break;
    }
  }
  return out;
}

// ══════════════════════════════════════════════════════════
// INDUSTRY COMPARISON
// ══════════════════════════════════════════════════════════

// Compare two industries based on available R data
function runIndustryComparison() {
  var ind1Key = document.getElementById('industrySelect') ? document.getElementById('industrySelect').value : 'daycare';
  var ind2El  = document.getElementById('compareIndustrySelect');
  var ind2Key = ind2El ? ind2El.value : '';

  if (!ind2Key || ind2Key === ind1Key) {
    alert('Please select a different industry to compare.');
    return;
  }

  if (typeof INDUSTRIES === 'undefined') { alert('Industry config not loaded.'); return; }
  var ind1 = INDUSTRIES[ind1Key];
  var ind2 = INDUSTRIES[ind2Key];
  if (!ind1 || !ind2) { alert('Industry not found in config.'); return; }
  var panel = document.getElementById('comparePanel');
  if (!panel) return;

  // Extract key metrics from existing R data
  var gap1 = _getCompareMetrics(ind1, 'a2');
  var gap2 = null; // Second industry hasn't been run yet

  var col1 = _buildCompareCol(ind1, gap1, '#4a9eff');
  var col2 = _buildCompareCol(ind2, gap2, '#f5a623');

  panel.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
      '<h3 style="font-size:14px;font-weight:700;font-family:\'Syne\',sans-serif">Industry Comparison</h3>' +
      '<button onclick="document.getElementById(\'comparePanel\').classList.remove(\'show\')" style="font-size:11px;padding:4px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer">✕ Close</button>' +
    '</div>' +
    '<div class="compare-grid">' + col1 + col2 + '</div>' +
    '<div style="font-size:11px;color:var(--faint);margin-top:12px">* Second industry analysis is based on industry config defaults. Run both industries separately for full pipeline comparison.</div>';

  panel.classList.add('show');
}

function _getCompareMetrics(ind, dataKey) {
  var raw = R && R[dataKey];
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch(e){ return null; }
}

function _buildCompareCol(ind, data, accentColor) {
  var financials = ind.financials || {};
  var rows = [
    {label:'Industry', val: ind.emoji + ' ' + ind.label},
    {label:'Avg Budget', val: '$' + (ind.budget_default||0).toLocaleString()},
    {label:'Revenue Unit', val: ind.revenue_unit || '—'},
    {label:'Primary Price Point', val: ind.price_label_primary || '—'},
    {label:'Default Capacity', val: (ind.capacity_default||0).toLocaleString() + ' ' + (ind.capacity_label||'')},
    {label:'Key Competitors', val: (ind.competitors||'').split(',').slice(0,3).join(', ')},
    {label:'Regulatory Complexity', val: (ind.regulatory||'').length > 60 ? 'High' : 'Medium'},
  ];

  // Add gap data if available
  if (data && data.overall_opportunity_score) {
    rows.push({label:'Opportunity Score', val: data.overall_opportunity_score + '/100', highlight: true});
  }
  if (data && data.cities && data.cities.length) {
    var topCity = data.cities[0];
    rows.push({label:'Top Market', val: topCity.city + ' (gap: ' + topCity.gap_score + '/10)'});
  }

  var rowsHtml = rows.map(function(r){
    return '<div class="compare-row">' +
      '<span class="compare-row-label">' + r.label + '</span>' +
      '<span class="compare-row-val' + (r.highlight ? ' compare-winner' : '') + '">' + r.val + '</span>' +
    '</div>';
  }).join('');

  return '<div class="compare-col">' +
    '<div class="compare-col-title" style="color:'+accentColor+'">' + ind.emoji + ' ' + ind.label + '</div>' +
    rowsHtml +
    '</div>';
}

// ── Hook: inject buttons after DOM ready + after each agent completes
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(injectExportButtons, 250);
});

(function(){
  var _origShowOut = window.showOut;
  if (typeof _origShowOut === 'function') {
    window.showOut = function(n) {
      _origShowOut(n);
      setTimeout(injectExportButtons, 80);
    };
  }
})();
