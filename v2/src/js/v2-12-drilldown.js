// ── V2 DRILLDOWN & ANALYTICS (v2-12-drilldown.js) ─────────────────────────

// ══════════════════════════════════════════════════════════════════════════
// 1. NESTED DATA EXPLORER
// ══════════════════════════════════════════════════════════════════════════

function v2ShowDataExplorer() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const modal   = document.getElementById('v2-explorer-modal');
  const content = document.getElementById('v2-explorer-content');
  if (!modal || !content) return;
  content.innerHTML = `
    <div class="v2-modal-header">
      <div class="v2-modal-title">🔍 Raw Data Explorer</div>
      <button class="v2-modal-close" onclick="document.getElementById('v2-explorer-modal').style.display='none'">✕</button>
    </div>
    <div style="padding:16px">
      <div style="font-size:12px;color:var(--v2-t2);margin-bottom:12px">
        Click any node to expand/collapse. All 17 agent outputs are shown here.
      </div>
      <div class="v2-tree" id="v2-tree-root">
        ${v2RenderTreeNode('R', R_data, 0, 'root')}
      </div>
    </div>`;
  modal.style.display = 'flex';
}

function v2RenderTreeNode(key, val, depth, path) {
  const isArr  = Array.isArray(val);
  const isObj  = !isArr && typeof val === 'object' && val !== null;
  const isLeaf = !isArr && !isObj;
  const indent = depth * 16;

  if (isLeaf) {
    const t   = typeof val;
    const cls = t === 'number' ? 'num' : t === 'boolean' ? 'bool' : val === null ? 'null' : 'str';
    const dv  = t === 'string'
      ? `"${val.length > 80 ? val.slice(0, 80) + '…' : val}"`
      : String(val);
    return `<div class="v2-tree-leaf" style="padding-left:${indent}px">
      <span class="v2-tree-key">${key}:</span>
      <span class="v2-tree-val ${cls}">${dv}</span>
    </div>`;
  }

  const entries = Object.entries(val || {});
  const count   = entries.length;
  const preview = isArr ? `[${count} items]` : `{${count} keys}`;
  const nodeId  = ('tn_' + path).replace(/[^a-z0-9_]/gi, '_');
  const open    = depth <= 1;

  return `
    <div class="v2-tree-node" style="padding-left:${indent}px">
      <div class="v2-tree-toggle" onclick="v2TreeToggle('${nodeId}')">
        <span class="v2-tree-arrow" id="arr_${nodeId}">${open ? '▼' : '▶'}</span>
        <span class="v2-tree-key">${key}</span>
        <span class="v2-tree-preview">${preview}</span>
      </div>
      <div class="v2-tree-children" id="${nodeId}" style="display:${open ? 'block' : 'none'}">
        ${entries.map(([k, v]) => v2RenderTreeNode(k, v, depth + 1, path + '_' + k)).join('')}
      </div>
    </div>`;
}

function v2TreeToggle(id) {
  const el  = document.getElementById(id);
  const arr = document.getElementById('arr_' + id);
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (arr) arr.textContent = open ? '▶' : '▼';
}

// ══════════════════════════════════════════════════════════════════════════
// 2. PER-CITY DRILL-DOWN
// ══════════════════════════════════════════════════════════════════════════

function v2ShowCityDrilldown() {
  const R_data  = typeof R !== 'undefined' ? R : {};
  const cities  = R_data.a2?.cities || [];
  const modal   = document.getElementById('v2-city-modal');
  const content = document.getElementById('v2-city-content');
  if (!modal || !content) return;

  const sorted = [...cities].sort((a, b) => (b.gap_score || 0) - (a.gap_score || 0));

  content.innerHTML = `
    <div class="v2-modal-header">
      <div class="v2-modal-title">🗺️ City-by-City Analysis</div>
      <button class="v2-modal-close" onclick="document.getElementById('v2-city-modal').style.display='none'">✕</button>
    </div>
    <div style="padding:16px">
      ${!sorted.length
        ? `<div class="v2-empty-panel">Run Agent 2 (Gap Analysis) to see city data</div>`
        : `<div class="v2-table-wrap">
            <table class="v2-table v2-city-table">
              <thead><tr>
                <th>#</th><th>City</th><th>Gap Score</th><th>Population</th>
                <th>Median Income</th><th>Competitors</th><th>Demand Index</th>
                <th>Expansion</th><th></th>
              </tr></thead>
              <tbody>
                ${sorted.map((c, i) => {
                  const sc   = c.gap_score || 0;
                  const col  = sc >= 7 ? 'var(--v2-green)' : sc >= 4 ? 'var(--v2-amber)' : 'var(--v2-red)';
                  const orig = cities.indexOf(c);
                  return `<tr class="v2-city-row" onclick="v2OpenCityDetail(${orig})">
                    <td><strong style="color:${i === 0 ? 'var(--v2-amber)' : 'var(--v2-t2)'}">${i === 0 ? '🏆' : i + 1}</strong></td>
                    <td><strong>${c.city || c.name || '—'}</strong><br>
                        <span style="font-size:11px;color:var(--v2-t2)">${c.state || ''} ${c.zip || ''}</span></td>
                    <td><span style="font-weight:700;color:${col}">${sc.toFixed(1)}/10</span></td>
                    <td>${c.population ? (c.population / 1000).toFixed(0) + 'K' : '—'}</td>
                    <td>${c.median_income ? '$' + (c.median_income / 1000).toFixed(0) + 'K' : '—'}</td>
                    <td>${c.existing_competitors ?? c.competitors ?? '—'}</td>
                    <td>${c.demand_index ? c.demand_index + '/10' : '—'}</td>
                    <td><span class="v2-badge ${(c.expansion_potential || '').toLowerCase().includes('high') ? 'green' : (c.expansion_potential || '').toLowerCase().includes('low') ? 'red' : 'amber'}">${c.expansion_potential || '—'}</span></td>
                    <td><button class="v2-btn ghost sm">Details →</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
           </div>`
      }
    </div>`;
  modal.style.display = 'flex';
}

function v2OpenCityDetail(idx) {
  const R_data = typeof R !== 'undefined' ? R : {};
  const cities = R_data.a2?.cities || [];
  const c = cities[idx];
  if (!c) return;
  const sc  = c.gap_score || 0;
  const col = sc >= 7 ? 'var(--v2-green)' : sc >= 4 ? 'var(--v2-amber)' : 'var(--v2-red)';
  const ov  = document.createElement('div');
  ov.className = 'v2-modal-bg';
  ov.style.zIndex = '9100';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `
    <div class="v2-modal" style="max-width:600px">
      <div class="v2-modal-header">
        <div class="v2-modal-title">📍 ${c.city || c.name}</div>
        <button class="v2-modal-close" onclick="this.closest('.v2-modal-bg').remove()">✕</button>
      </div>
      <div style="padding:16px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
          <div class="v2-kpi"><div class="v2-kpi-ico">📊</div><div class="v2-kpi-val" style="color:${col}">${sc.toFixed(1)}</div><div class="v2-kpi-lbl">Gap Score</div></div>
          <div class="v2-kpi"><div class="v2-kpi-ico">👥</div><div class="v2-kpi-val">${c.population ? (c.population / 1000).toFixed(0) + 'K' : '—'}</div><div class="v2-kpi-lbl">Population</div></div>
          <div class="v2-kpi"><div class="v2-kpi-ico">💰</div><div class="v2-kpi-val">${c.median_income ? '$' + (c.median_income / 1000).toFixed(0) + 'K' : '—'}</div><div class="v2-kpi-lbl">Median Income</div></div>
        </div>
        ${c.rationale ? `<div class="v2-exec-section"><div class="v2-exec-section-title">🔍 AI Rationale</div><div class="v2-prose">${c.rationale}</div></div>` : ''}
        ${c.breakdown ? `<div class="v2-exec-section"><div class="v2-exec-section-title">📋 Score Breakdown</div>
          ${Object.entries(c.breakdown).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--v2-border);font-size:13px"><span style="color:var(--v2-t2);text-transform:capitalize">${k.replace(/_/g, ' ')}</span><strong>${typeof v === 'number' ? v.toFixed(1) : v}</strong></div>`).join('')}
        </div>` : ''}
        ${c.risks?.length ? `<div class="v2-exec-section"><div class="v2-exec-section-title">⚠️ Local Risks</div><ul class="v2-prose">${c.risks.map(r => `<li>${r}</li>`).join('')}</ul></div>` : ''}
        ${c.strengths?.length ? `<div class="v2-exec-section"><div class="v2-exec-section-title">✅ Strengths</div><ul class="v2-prose">${c.strengths.map(s => `<li>${s}</li>`).join('')}</ul></div>` : ''}
      </div>
    </div>`;
  document.body.appendChild(ov);
}

// ══════════════════════════════════════════════════════════════════════════
// 3. COMPETITOR PROFILE CARDS
// ══════════════════════════════════════════════════════════════════════════

function v2ShowCompetitorProfiles() {
  const R_data  = typeof R !== 'undefined' ? R : {};
  const comps   = R_data.a6?.competitors || R_data.a6?.top_competitors || [];
  const deep    = R_data.a13 || {};
  const modal   = document.getElementById('v2-comp-modal');
  const content = document.getElementById('v2-comp-content');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="v2-modal-header">
      <div class="v2-modal-title">🎯 Competitor Intelligence</div>
      <button class="v2-modal-close" onclick="document.getElementById('v2-comp-modal').style.display='none'">✕</button>
    </div>
    <div style="padding:16px">
      ${R_data.a6?.summary ? `<div class="v2-prose" style="margin-bottom:16px">${R_data.a6.summary}</div>` : ''}
      ${!comps.length
        ? `<div class="v2-empty-panel">Run Agent 6 (Competition) to see competitor profiles</div>`
        : `<div class="v2-comp-cards-grid">
            ${comps.map((c, i) => {
              const rating   = c.rating || c.google_rating || 0;
              const filled   = Math.round(rating);
              const stars    = rating ? '★'.repeat(filled) + '☆'.repeat(5 - filled) : '';
              const rCol     = rating >= 4 ? 'var(--v2-amber)' : 'var(--v2-t1)';
              const weakness = c.weakness || c.main_weakness || (deep.weaknesses?.[i]) || '';
              const whyWin   = i === 0 ? (c.why_you_win || R_data.a8?.competitive_advantage || '') : '';
              return `<div class="v2-comp-card">
                <div class="v2-comp-card-head">
                  <div>
                    <div class="v2-comp-name">${c.name || c.business_name || 'Competitor ' + (i + 1)}</div>
                    <div class="v2-comp-sub">${[c.address || c.location, c.distance_miles ? c.distance_miles + ' mi' : ''].filter(Boolean).join(' · ')}</div>
                  </div>
                  ${rating ? `<div style="text-align:right"><div style="color:${rCol};font-size:13px">${stars}</div><div style="font-size:11px;color:var(--v2-t2)">${rating}/5 (${c.review_count || '?'} reviews)</div></div>` : ''}
                </div>
                <div class="v2-comp-metrics">
                  ${c.estimated_revenue ? `<div class="v2-comp-metric"><span>Est. Revenue</span><strong>$${(c.estimated_revenue / 1000).toFixed(0)}K/yr</strong></div>` : ''}
                  ${c.capacity || c.enrollment ? `<div class="v2-comp-metric"><span>Capacity</span><strong>${c.capacity || c.enrollment}</strong></div>` : ''}
                  ${c.years_open || c.established ? `<div class="v2-comp-metric"><span>Est.</span><strong>${c.years_open || c.established}</strong></div>` : ''}
                  ${c.market_share ? `<div class="v2-comp-metric"><span>Market Share</span><strong>${c.market_share}%</strong></div>` : ''}
                </div>
                ${weakness ? `<div class="v2-comp-weakness"><span class="v2-comp-weakness-lbl">⚠️ Weakness:</span> ${weakness}</div>` : ''}
                ${whyWin ? `<div class="v2-comp-win"><span class="v2-comp-win-lbl">🏆 Why you win:</span> ${whyWin}</div>` : ''}
                ${c.reviews_summary ? `<div class="v2-comp-review">${c.reviews_summary}</div>` : ''}
              </div>`;
            }).join('')}
           </div>`
      }
    </div>`;
  modal.style.display = 'flex';
}

// ══════════════════════════════════════════════════════════════════════════
// 4. FINANCIAL SCENARIO DEEP-DIVE
// ══════════════════════════════════════════════════════════════════════════

let _v2FinScenarioIdx  = 1;
let _v2FinSensitivity  = 0;

function v2ShowFinancialDeepDive() {
  const modal   = document.getElementById('v2-fin-modal');
  const content = document.getElementById('v2-fin-content');
  if (!modal || !content) return;
  v2RenderFinModal(content);
  modal.style.display = 'flex';
}

function v2RenderFinModal(content) {
  const R_data    = typeof R !== 'undefined' ? R : {};
  const scenarios = R_data.a7?.scenarios || [];
  const sc        = scenarios[_v2FinScenarioIdx] || scenarios[0] || {};
  const factor    = 1 + (_v2FinSensitivity / 100);

  content.innerHTML = `
    <div class="v2-modal-header">
      <div class="v2-modal-title">💰 Financial Deep-Dive</div>
      <button class="v2-modal-close" onclick="document.getElementById('v2-fin-modal').style.display='none'">✕</button>
    </div>
    <div style="padding:16px">
      ${!scenarios.length
        ? `<div class="v2-empty-panel">Run Agent 7 (Financials) to see scenario data</div>`
        : `<div class="v2-fin-controls">
            <div class="v2-fin-tabs">
              ${scenarios.map((s, i) =>
                `<button class="v2-fin-tab${i === _v2FinScenarioIdx ? ' active' : ''}"
                  onclick="_v2FinScenarioIdx=${i};v2RenderFinModal(document.getElementById('v2-fin-content'))">
                  ${s.name || 'Scenario ' + (i + 1)}
                </button>`).join('')}
            </div>
            <div class="v2-fin-slider-wrap">
              <label style="font-size:12px;color:var(--v2-t2)">Enrollment / Capacity Sensitivity</label>
              <div style="display:flex;align-items:center;gap:10px">
                <input type="range" min="-20" max="20" step="5" value="${_v2FinSensitivity}" style="flex:1"
                  oninput="_v2FinSensitivity=parseInt(this.value);document.getElementById('v2-fin-sens-val').textContent=(this.value>0?'+':'')+this.value+'%';v2RenderFinModal(document.getElementById('v2-fin-content'))">
                <span id="v2-fin-sens-val" style="font-size:13px;font-weight:700;color:var(--v2-a1);min-width:40px">${_v2FinSensitivity > 0 ? '+' : ''}${_v2FinSensitivity}%</span>
              </div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0">
            ${[
              ['📅', 'Break-even', sc.breakeven_months ? 'Month ' + sc.breakeven_months : '—'],
              ['💵', 'Monthly Revenue', '$' + (((sc.monthly_revenue || 0) * factor) / 1000).toFixed(0) + 'K'],
              ['📈', 'Monthly Net', '$' + (((sc.monthly_net || 0) * factor) / 1000).toFixed(0) + 'K'],
              ['🏆', '3-yr ROI', (sc.roi_3yr || 0) + '%'],
            ].map(([ico, lbl, val]) =>
              `<div class="v2-kpi"><div class="v2-kpi-ico">${ico}</div><div class="v2-kpi-val">${val}</div><div class="v2-kpi-lbl">${lbl}</div></div>`
            ).join('')}
          </div>
          <div class="v2-fin-table-wrap">
            <div style="font-size:12px;font-weight:700;color:var(--v2-t2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">36-Month P&L Projection</div>
            <table class="v2-fin-table">
              <thead><tr><th>Month</th><th>Revenue</th><th>COGS</th><th>Gross Profit</th><th>OpEx</th><th>Net Income</th><th>Cumulative</th></tr></thead>
              <tbody>${v2BuildPLRows(sc, factor)}</tbody>
            </table>
          </div>`
      }
    </div>`;
}

function v2BuildPLRows(sc, factor) {
  const months    = sc.monthly_data || sc.projections || [];
  const baseRev   = sc.monthly_revenue || 0;
  const baseNet   = sc.monthly_net || 0;
  const baseOpEx  = sc.monthly_opex || sc.monthly_expenses || (baseRev * 0.45);
  const baseCOGS  = sc.monthly_cogs || (baseRev * 0.35);
  const breakeven = sc.breakeven_months || 99;
  let cumulative  = -(sc.total_startup_cost || sc.startup_cost || 0);
  let rows = '';

  for (let m = 1; m <= 36; m++) {
    const md    = months[m - 1] || {};
    const ramp  = Math.min(1, 0.3 + (m - 1) * 0.12);
    const rev   = (md.revenue || baseRev  * ramp) * factor;
    const cogs  = (md.cogs    || baseCOGS * ramp) * factor;
    const opex  = (md.opex    || baseOpEx)         * factor;
    const gross = rev - cogs;
    const net   = gross - opex;
    cumulative += net;

    const isBreak  = m === breakeven;
    const netCol   = net        >= 0 ? 'var(--v2-green)' : 'var(--v2-red)';
    const cumCol   = cumulative >= 0 ? 'var(--v2-green)' : 'var(--v2-red)';
    const rowStyle = isBreak ? 'background:rgba(34,197,94,.08)' : '';

    rows += `<tr style="${rowStyle}">
      <td><strong${isBreak ? ' style="color:var(--v2-green)"' : ''}>M${m}${isBreak ? ' ✓' : ''}</strong></td>
      <td>$${(rev  / 1000).toFixed(1)}K</td>
      <td>$${(cogs / 1000).toFixed(1)}K</td>
      <td>$${(gross / 1000).toFixed(1)}K</td>
      <td>$${(opex / 1000).toFixed(1)}K</td>
      <td style="color:${netCol};font-weight:600">$${(net        / 1000).toFixed(1)}K</td>
      <td style="color:${cumCol};font-weight:600">$${(cumulative / 1000).toFixed(0)}K</td>
    </tr>`;
  }
  return rows;
}

// ══════════════════════════════════════════════════════════════════════════
// 5. COMPLIANCE TIMELINE DRILL-DOWN
// ══════════════════════════════════════════════════════════════════════════

function v2ShowComplianceTimeline() {
  const R_data  = typeof R !== 'undefined' ? R : {};
  const comp    = R_data.a5 || {};
  const permits = comp.permits || comp.requirements || comp.checklist || [];
  const modal   = document.getElementById('v2-compliance-modal');
  const content = document.getElementById('v2-compliance-content');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="v2-modal-header">
      <div class="v2-modal-title">📋 Compliance & Permit Timeline</div>
      <button class="v2-modal-close" onclick="document.getElementById('v2-compliance-modal').style.display='none'">✕</button>
    </div>
    <div style="padding:16px">
      ${comp.summary ? `<div class="v2-prose" style="margin-bottom:16px">${comp.summary}</div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div class="v2-kpi"><div class="v2-kpi-ico">📅</div><div class="v2-kpi-val">${comp.total_timeline_months || '?'}</div><div class="v2-kpi-lbl">Total Months</div></div>
        <div class="v2-kpi"><div class="v2-kpi-ico">📝</div><div class="v2-kpi-val">${permits.length || '?'}</div><div class="v2-kpi-lbl">Permits / Steps</div></div>
        <div class="v2-kpi"><div class="v2-kpi-ico">⚠️</div><div class="v2-kpi-val">${permits.filter(p => p.critical || p.is_critical || p.on_critical_path).length}</div><div class="v2-kpi-lbl">Critical Path</div></div>
      </div>
      ${!permits.length
        ? `<div class="v2-empty-panel">Run Agent 5 (Compliance) to see permit timeline</div>`
        : `<div class="v2-timeline-deps">
            ${permits.map((p, i) => {
              const isCrit = p.critical || p.is_critical || p.on_critical_path;
              const deps   = p.depends_on || p.dependencies || [];
              return `<div class="v2-dep-item${isCrit ? ' critical' : ''}">
                <div class="v2-dep-num">${i + 1}</div>
                <div class="v2-dep-body">
                  <div class="v2-dep-name">${p.name || p.permit || p.requirement}</div>
                  <div class="v2-dep-meta">
                    ${p.duration_weeks ? `⏱ ${p.duration_weeks} weeks` : p.timeline ? `⏱ ${p.timeline}` : ''}
                    ${p.cost ? ` · 💰 $${parseInt(p.cost).toLocaleString()}` : ''}
                    ${p.authority || p.issuing_authority ? ` · 🏛 ${p.authority || p.issuing_authority}` : ''}
                    ${isCrit ? ` · <span style="color:var(--v2-red);font-weight:700">⚠ Critical Path</span>` : ''}
                  </div>
                  ${deps.length ? `<div class="v2-dep-reqs">Requires: ${deps.map(d => `<span class="v2-dep-tag">${d}</span>`).join(' ')}</div>` : ''}
                  ${p.notes || p.description ? `<div class="v2-dep-note">${p.notes || p.description}</div>` : ''}
                </div>
              </div>`;
            }).join('')}
           </div>`
      }
    </div>`;
  modal.style.display = 'flex';
}

// ══════════════════════════════════════════════════════════════════════════
// 6. SCORE HISTORY SPARKLINE
// ══════════════════════════════════════════════════════════════════════════

function v2SparklineSVG(scores) {
  if (!scores || scores.length < 2) return '';
  const W = 80, H = 28, pad = 2;
  const min = Math.min(...scores), max = Math.max(...scores);
  const range = max - min || 1;
  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (W - pad * 2);
    const y = H - pad - ((s - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last  = scores[scores.length - 1];
  const color = last >= 70 ? '#22c55e' : last >= 45 ? '#f59e0b' : '#ef4444';
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
  </svg>`;
}

// ══════════════════════════════════════════════════════════════════════════
// 7. BENCHMARKING PANEL
// ══════════════════════════════════════════════════════════════════════════

function v2RenderBenchmarking() {
  const portfolio = V2?.portfolio || [];
  const run       = V2?.run;
  if (!portfolio.length || !run) {
    return `<div class="v2-empty-panel"><div style="font-size:32px;margin-bottom:8px">📊</div>Save analyses to your portfolio to see benchmarks</div>`;
  }

  const scores  = portfolio.map(r => r.score);
  const avg     = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  const rank    = scores.filter(s => s < run.score).length;
  const pct     = Math.round((rank / scores.length) * 100);
  const scoreCol = run.score >= 70 ? 'var(--v2-green)' : run.score >= 45 ? 'var(--v2-amber)' : 'var(--v2-red)';
  const label    = pct >= 70 ? '🏆 Top performer' : pct >= 40 ? '📊 Above average' : '⚠️ Below average';
  const comps    = v2GetScoreBreakdown();

  return `
    <div class="v2-bench-wrap">
      <div class="v2-bench-hero">
        <div>
          <div class="v2-bench-rank">${label}</div>
          <div class="v2-bench-sub">Your score <strong style="color:${scoreCol}">${run.score}</strong> is better than <strong>${pct}%</strong> of your ${portfolio.length} saved analyses</div>
        </div>
        <div class="v2-bench-bar-wrap">
          <div class="v2-bench-bar">
            <div class="v2-bench-bar-fill" style="width:${pct}%;background:${scoreCol}"></div>
            <div class="v2-bench-bar-marker" style="left:${pct}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--v2-t2);margin-top:4px">
            <span>0</span><span>Portfolio avg: ${avg}</span><span>100</span>
          </div>
        </div>
      </div>
      <div class="v2-bench-table">
        <div style="font-size:12px;font-weight:700;color:var(--v2-t2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Score Component vs Portfolio Average</div>
        ${comps.map(c => {
          const diff     = 0;
          const pctComp  = Math.round(c.pct * 100);
          const barColor = pctComp >= 70 ? 'var(--v2-green)' : pctComp >= 45 ? 'var(--v2-amber)' : 'var(--v2-red)';
          return `<div class="v2-bench-row">
            <div class="v2-bench-row-label">${c.ico} ${c.label}</div>
            <div class="v2-bench-row-bar">
              <div class="v2-bench-mini-bar" style="position:relative;height:8px;background:var(--v2-s4);border-radius:4px;overflow:hidden">
                <div style="width:${pctComp}%;background:${barColor};height:100%;position:absolute"></div>
              </div>
            </div>
            <div class="v2-bench-row-score">${c.earned}/${c.max}</div>
            <div class="v2-bench-row-diff" style="color:${pctComp >= 50 ? 'var(--v2-green)' : 'var(--v2-red)'}">${pctComp}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// 8. KPI TREND ARROWS
// ══════════════════════════════════════════════════════════════════════════

const V2_INDUSTRY_MEDIANS = {
  daycare:      { breakeven_months:22, monthly_revenue:85000,  roi_3yr:45, gap_score:6.2 },
  restaurant:   { breakeven_months:18, monthly_revenue:120000, roi_3yr:38, gap_score:5.8 },
  gym:          { breakeven_months:20, monthly_revenue:95000,  roi_3yr:42, gap_score:6.0 },
  laundromat:   { breakeven_months:14, monthly_revenue:45000,  roi_3yr:55, gap_score:6.5 },
  car_wash:     { breakeven_months:16, monthly_revenue:75000,  roi_3yr:50, gap_score:6.3 },
  coffee_shop:  { breakeven_months:15, monthly_revenue:55000,  roi_3yr:40, gap_score:5.9 },
  gas_station:  { breakeven_months:24, monthly_revenue:200000, roi_3yr:35, gap_score:5.5 },
  indoor_play:  { breakeven_months:18, monthly_revenue:70000,  roi_3yr:44, gap_score:6.1 },
  default:      { breakeven_months:20, monthly_revenue:80000,  roi_3yr:42, gap_score:6.0 },
};

function v2GetKPITrendArrow(key, value, industry) {
  const medians = V2_INDUSTRY_MEDIANS[industry] || V2_INDUSTRY_MEDIANS.default;
  const median  = medians[key];
  if (!median || !value) return '';
  const lowerIsBetter = key === 'breakeven_months';
  const better = lowerIsBetter ? value < median : value > median;
  const pct    = Math.abs(((value - median) / median) * 100).toFixed(0);
  const color  = better ? 'var(--v2-green)' : 'var(--v2-amber)';
  return `<span class="v2-kpi-trend" style="color:${color}" title="Industry median: ${median}">${better ? '▼' : '▲'} ${pct}% vs median</span>`;
}

function v2GetKPIs() {
  const R_data   = typeof R !== 'undefined' ? R : {};
  const run      = V2?.run || {};
  const industry = run.industry || 'default';
  const scenarios= R_data.a7?.scenarios || [];
  const base     = scenarios.find(s => (s.name || '').toLowerCase().includes('base')) || scenarios[1] || {};
  const cities   = R_data.a2?.cities || [];
  const top      = cities.length ? [...cities].sort((a, b) => (b.gap_score || 0) - (a.gap_score || 0))[0] : null;
  const kpis     = [];

  if (top?.gap_score != null)
    kpis.push({ ico:'🗺️', val:`${top.gap_score.toFixed(1)}/10`, lbl:'Gap Score',        key:'gap_score',         raw: top.gap_score });
  if (base.monthly_revenue)
    kpis.push({ ico:'💵', val:`$${(base.monthly_revenue/1000).toFixed(0)}K/mo`, lbl:'Monthly Revenue', key:'monthly_revenue', raw: base.monthly_revenue });
  if (base.breakeven_months)
    kpis.push({ ico:'📅', val:`Month ${base.breakeven_months}`, lbl:'Break-even',         key:'breakeven_months',  raw: base.breakeven_months });
  if (base.roi_3yr)
    kpis.push({ ico:'📈', val:`${base.roi_3yr}%`,               lbl:'3-yr ROI',            key:'roi_3yr',           raw: base.roi_3yr });
  if (R_data.a6?.competitor_count != null)
    kpis.push({ ico:'🏪', val: R_data.a6.competitor_count,      lbl:'Competitors',         key: null });
  if (R_data.a5?.total_timeline_months)
    kpis.push({ ico:'⏱',  val:`${R_data.a5.total_timeline_months} mo`, lbl:'Permit Timeline', key: null });

  return kpis.map(k => {
    const arrow = k.key ? v2GetKPITrendArrow(k.key, k.raw, industry) : '';
    const dir   = arrow === '↑' ? 'up' : arrow === '↓' ? 'down' : 'flat';
    return { ...k, trend: arrow, trendDir: dir };
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 9. MARKET HEAT MAP (SVG, no external API)
// ══════════════════════════════════════════════════════════════════════════

function v2RenderMarketHeatMap() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const cities = R_data.a2?.cities || [];
  const comps  = R_data.a6?.competitors || R_data.a6?.top_competitors || [];

  if (!cities.length && !comps.length) {
    return `<div class="v2-empty-panel">Run Gap Analysis (A2) and Competition (A6) agents to see the heat map</div>`;
  }

  const W = 600, H = 360, CX = 300, CY = 180, maxR = 155;
  const run      = V2?.run || {};
  const radiusMi = parseInt(run.radius || 40);

  const cityPins = cities.slice(0, 12).map((c, i) => {
    const angle = (i / Math.max(cities.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const dist  = 0.25 + (1 - Math.min((c.gap_score || 5) / 10, 1)) * 0.75;
    const r     = dist * maxR;
    return {
      x:     CX + Math.cos(angle) * r,
      y:     CY + Math.sin(angle) * r,
      fill:  (c.gap_score || 5) >= 7 ? '#22c55e' : (c.gap_score || 5) >= 4 ? '#f59e0b' : '#ef4444',
      name:  c.city || c.name || '',
      score: c.gap_score || 5,
      pr:    8 + ((c.gap_score || 5) / 10) * 12,
    };
  });

  // Use a simple deterministic scatter for competitors based on index
  const compPins = comps.slice(0, 10).map((c, i) => {
    const angle = (i / Math.max(comps.length, 1)) * 2 * Math.PI + 0.5;
    const r     = 35 + ((i * 37) % (maxR - 35));
    return { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r, name: c.name || '' };
  });

  return `
    <div class="v2-heatmap-wrap">
      <div class="v2-heatmap-legend">
        <span class="v2-heatmap-leg"><span style="background:#22c55e;width:10px;height:10px;border-radius:50%;display:inline-block"></span> High Gap (7+)</span>
        <span class="v2-heatmap-leg"><span style="background:#f59e0b;width:10px;height:10px;border-radius:50%;display:inline-block"></span> Medium (4–7)</span>
        <span class="v2-heatmap-leg"><span style="background:#ef4444;width:10px;height:10px;border-radius:50%;display:inline-block"></span> Low Gap (&lt;4)</span>
        <span class="v2-heatmap-leg"><span style="background:transparent;border:2px solid rgba(239,68,68,.7);width:8px;height:8px;border-radius:50%;display:inline-block"></span> Competitor</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;display:block;margin:0 auto">
        <circle cx="${CX}" cy="${CY}" r="${maxR * .25}" fill="none" stroke="rgba(99,102,241,.12)" stroke-width="1" stroke-dasharray="4,4"/>
        <circle cx="${CX}" cy="${CY}" r="${maxR * .5}"  fill="none" stroke="rgba(99,102,241,.12)" stroke-width="1" stroke-dasharray="4,4"/>
        <circle cx="${CX}" cy="${CY}" r="${maxR * .75}" fill="none" stroke="rgba(99,102,241,.12)" stroke-width="1" stroke-dasharray="4,4"/>
        <circle cx="${CX}" cy="${CY}" r="${maxR}"        fill="rgba(99,102,241,.03)" stroke="rgba(99,102,241,.3)" stroke-width="1.5"/>
        <text x="${CX + maxR + 4}" y="${CY + 4}" font-size="10" fill="rgba(99,102,241,.6)">${radiusMi} mi</text>
        ${compPins.map(p => `
          <circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="7" fill="rgba(239,68,68,.12)" stroke="rgba(239,68,68,.7)" stroke-width="1.5"/>
          <text x="${p.x.toFixed(0)}" y="${(p.y + 3.5).toFixed(0)}" font-size="8" text-anchor="middle" fill="var(--v2-red)">✕</text>
        `).join('')}
        ${cityPins.map(p => `
          <circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${p.pr.toFixed(0)}" fill="${p.fill}" fill-opacity="0.22" stroke="${p.fill}" stroke-width="2"/>
          <text x="${p.x.toFixed(0)}" y="${(p.y + 4).toFixed(0)}" font-size="9" text-anchor="middle" fill="${p.fill}" font-weight="700">${p.score.toFixed(0)}</text>
          <text x="${p.x.toFixed(0)}" y="${(p.y + p.pr + 12).toFixed(0)}" font-size="8" text-anchor="middle" fill="var(--v2-t2)">${p.name.split(',')[0].slice(0, 12)}</text>
        `).join('')}
        <circle cx="${CX}" cy="${CY}" r="9" fill="var(--v2-a1)"/>
        <text x="${CX}" y="${CY - 14}" font-size="10" text-anchor="middle" fill="var(--v2-a1)" font-weight="700">📍 You</text>
      </svg>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// 10. WATERFALL CHART FOR STARTUP COSTS
// ══════════════════════════════════════════════════════════════════════════

function v2RenderWaterfallChart() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const a7     = R_data.a7 || {};

  // Support both array [{item,amount}] and object {label:value} formats
  let items = [];
  const raw = a7.startup_breakdown || a7.startup_costs || a7.startup_cost_breakdown || a7.cost_breakdown;
  if (Array.isArray(raw)) {
    items = raw.filter(e => e && typeof e.amount === 'number' && e.amount > 0)
               .map(e => [e.item || e.label || e.name || 'Item', e.amount]);
  } else if (raw && typeof raw === 'object') {
    items = Object.entries(raw).filter(([, v]) => typeof v === 'number' && v > 0);
  }
  if (!items.length) return `<div style="color:var(--v2-t3);font-size:13px;padding:12px;text-align:center">Run Agent 7 for startup cost breakdown</div>`;

  const W = 560, H = 220, padL = 120, padR = 20, padT = 20, padB = 44;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const itemW  = Math.max(18, Math.floor(chartW / (items.length + 1)) - 4);
  let running  = 0;
  const bars   = items.map(([label, val]) => {
    const base = running;
    running += val;
    return { label, val, base, top: running };
  });
  bars.push({ label: 'TOTAL', val: running, base: 0, top: running, isTotal: true });

  const maxVal = running;
  const colors = ['#6366f1','#8b5cf6','#a78bfa','#60a5fa','#34d399','#fb923c','#f87171','#c4b5fd','#818cf8'];
  const toY    = v => padT + chartH - (v / maxVal) * chartH;
  const toH    = v => Math.max(2, (v / maxVal) * chartH);

  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block">
      ${[0.25, 0.5, 0.75, 1.0].map(p => {
        const y = toY(maxVal * p);
        return `<line x1="${padL}" y1="${y.toFixed(0)}" x2="${W - padR}" y2="${y.toFixed(0)}" stroke="var(--v2-border)" stroke-width="1"/>
                <text x="${padL - 4}" y="${(y + 4).toFixed(0)}" font-size="9" text-anchor="end" fill="var(--v2-t3)">$${(maxVal * p / 1000).toFixed(0)}K</text>`;
      }).join('')}
      ${bars.map((b, i) => {
        const x     = padL + i * (itemW + 4);
        const y     = toY(b.top);
        const h     = toH(b.val);
        const color = b.isTotal ? '#22c55e' : colors[i % colors.length];
        return `
          ${!b.isTotal && i > 0 ? `<line x1="${(padL + (i-1)*(itemW+4) + itemW).toFixed(0)}" y1="${toY(bars[i-1].top).toFixed(0)}" x2="${x}" y2="${toY(b.base).toFixed(0)}" stroke="var(--v2-border)" stroke-dasharray="3,2" stroke-width="1"/>` : ''}
          <rect x="${x}" y="${y.toFixed(0)}" width="${itemW}" height="${h.toFixed(0)}" fill="${color}" fill-opacity="${b.isTotal ? 1 : 0.75}" rx="3"/>
          <text x="${(x + itemW/2).toFixed(0)}" y="${Math.max(y - 3, padT + 9).toFixed(0)}" font-size="9" text-anchor="middle" fill="var(--v2-t1)" font-weight="600">$${(b.val/1000).toFixed(0)}K</text>
          <text x="${(x + itemW/2).toFixed(0)}" y="${(H - padB + 14).toFixed(0)}" font-size="8" text-anchor="middle" fill="var(--v2-t2)"
            transform="rotate(-32,${(x + itemW/2).toFixed(0)},${(H - padB + 14).toFixed(0)})">${b.label.replace(/_/g,' ').slice(0, 14)}</text>`;
      }).join('')}
    </svg>`;
}

// ══════════════════════════════════════════════════════════════════════════
// 11. WHAT-IF ENGINE
// ══════════════════════════════════════════════════════════════════════════

let _v2WhatIfVar = 'budget';

const V2_WHATIF_VARS = [
  { id:'budget',   label:'Budget ($)',       min:150000, max:1500000, step:100000, fmt: v => '$' + (v/1000) + 'K' },
  { id:'capacity', label:'Capacity (units)', min:20,     max:200,     step:10,     fmt: v => v + ' units' },
  { id:'radius',   label:'Radius (miles)',   min:10,     max:60,      step:5,      fmt: v => v + ' mi' },
];

function v2CalcScoreForRun(fakeRun) {
  const base       = v2CalcScore();
  const budget     = parseInt(fakeRun.budget   || 600000);
  const capacity   = parseInt(fakeRun.capacity || 75);
  const budFactor  = Math.min(1.2, Math.max(0.7,  budget   / 600000));
  const capFactor  = Math.min(1.1, Math.max(0.85, capacity / 75));
  return Math.min(100, Math.max(0, Math.round(base * (budFactor * 0.6 + capFactor * 0.4))));
}

function v2BuildWhatIfChart() {
  const varDef = V2_WHATIF_VARS.find(v => v.id === _v2WhatIfVar) || V2_WHATIF_VARS[0];
  const steps  = [];
  for (let v = varDef.min; v <= varDef.max; v += varDef.step) steps.push(v);
  const scores = steps.map(v => v2CalcScoreForRun({ ...(V2?.run || {}), [varDef.id]: v }));

  const W = 560, H = 180, padL = 38, padR = 20, padT = 16, padB = 36;
  const cW = W - padL - padR, cH = H - padT - padB;
  const minS = Math.min(...scores), maxS = Math.max(...scores), range = maxS - minS || 1;
  const pts  = scores.map((s, i) => {
    const x = padL + (i / (steps.length - 1)) * cW;
    const y = padT + cH - ((s - minS) / range) * cH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const curVal   = parseFloat((V2?.run || {})[varDef.id] || varDef.min);
  const curIdx   = Math.max(0, steps.findIndex(v => v >= curVal));
  const curScore = scores[curIdx] || scores[0];
  const curX     = padL + (curIdx / (steps.length - 1)) * cW;
  const curY     = padT + cH - ((curScore - minS) / range) * cH;

  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;background:var(--v2-s3);border-radius:10px">
      ${[0, 25, 50, 75, 100].map(p => {
        const sv = minS + (p / 100) * range;
        const y  = padT + cH - (p / 100) * cH;
        return `<line x1="${padL}" y1="${y.toFixed(0)}" x2="${W - padR}" y2="${y.toFixed(0)}" stroke="var(--v2-border)" stroke-width="1"/>
                <text x="${padL - 3}" y="${(y + 4).toFixed(0)}" font-size="9" text-anchor="end" fill="var(--v2-t3)">${sv.toFixed(0)}</text>`;
      }).join('')}
      <polyline points="${pts}" fill="none" stroke="var(--v2-a1)" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="${curX.toFixed(1)}" y1="${padT}" x2="${curX.toFixed(1)}" y2="${(padT + cH).toFixed(0)}" stroke="var(--v2-a1)" stroke-width="1" stroke-dasharray="3,3"/>
      <circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="5" fill="var(--v2-a1)" stroke="var(--v2-s3)" stroke-width="2"/>
      <text x="${curX.toFixed(1)}" y="${(padT - 3).toFixed(0)}" font-size="9" text-anchor="middle" fill="var(--v2-a1)">▼ ${varDef.fmt(curVal)}</text>
      ${steps.filter((_, i) => i % Math.ceil(steps.length / 7) === 0).map(v => {
        const x = padL + (steps.indexOf(v) / (steps.length - 1)) * cW;
        return `<text x="${x.toFixed(0)}" y="${(H - 4).toFixed(0)}" font-size="8" text-anchor="middle" fill="var(--v2-t3)">${varDef.fmt(v)}</text>`;
      }).join('')}
    </svg>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px">
      <div class="v2-kpi"><div class="v2-kpi-ico">📉</div><div class="v2-kpi-val">${minS}</div><div class="v2-kpi-lbl">Min Score</div></div>
      <div class="v2-kpi" style="border:1px solid var(--v2-a1)"><div class="v2-kpi-ico">📍</div><div class="v2-kpi-val" style="color:var(--v2-a1)">${curScore}</div><div class="v2-kpi-lbl">Current</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">📈</div><div class="v2-kpi-val">${maxS}</div><div class="v2-kpi-lbl">Max Score</div></div>
    </div>`;
}

function v2RenderWhatIfInline() {
  return `
    <div style="padding:4px 0">
      <div style="font-size:13px;color:var(--v2-t2);margin-bottom:12px">
        Select a variable to see how your viability score changes across the full range. No API call needed — recalculated instantly.
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        ${V2_WHATIF_VARS.map(v =>
          `<button class="v2-fin-tab${v.id === _v2WhatIfVar ? ' active' : ''}"
            onclick="_v2WhatIfVar='${v.id}';document.getElementById('v2-panel-whatif').innerHTML=v2RenderWhatIfInline()">
            ${v.label}
          </button>`).join('')}
      </div>
      ${v2BuildWhatIfChart()}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// 12. RISK MATRIX
// ══════════════════════════════════════════════════════════════════════════

function _v2NormRisk(val, map) {
  if (!val) return 2;
  const v = (val + '').toLowerCase();
  for (const [k, s] of Object.entries(map)) { if (v.includes(k)) return s; }
  return 2;
}

const _LK_MAP = { high:3, medium:2, med:2, moderate:2, likely:3, possible:2, unlikely:1, low:1 };
const _IM_MAP = { critical:3, catastrophic:3, severe:3, high:3, major:3, medium:2, moderate:2, significant:2, low:1, minor:1, negligible:1 };

function v2RenderRiskMatrix() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const risks  = R_data.a8?.risks || R_data.a8?.risk_factors || [];
  if (!risks.length) return `<div class="v2-empty-panel">Run Agent 8 (Executive Summary) to see risk data</div>`;

  const placed = risks.map(r => ({
    lk:   r.likelihood || r.probability
            ? _v2NormRisk(r.likelihood || r.probability, _LK_MAP)
            : 2, // default to Medium when likelihood not provided
    im:   _v2NormRisk(r.severity || r.impact, _IM_MAP),
    name: typeof r === 'string' ? r : (r.risk || r.title || r.name || 'Risk'),
    mit:  r.mitigation || r.response || '',
  }));

  const cells = {};
  for (let lk = 1; lk <= 3; lk++) for (let im = 1; im <= 3; im++) {
    cells[`${lk}_${im}`] = placed.filter(r => r.lk === lk && r.im === im);
  }

  const cellBg = (lk, im) => {
    const v = lk * im;
    return v >= 6 ? 'rgba(239,68,68,.2)' : v >= 4 ? 'rgba(245,158,11,.14)' : 'rgba(34,197,94,.1)';
  };
  const cellBorder = (lk, im) => {
    const v = lk * im;
    return v >= 6 ? 'rgba(239,68,68,.4)' : v >= 4 ? 'rgba(245,158,11,.3)' : 'rgba(34,197,94,.25)';
  };
  const L = { 1:'Low', 2:'Medium', 3:'High' };

  return `
    <div class="v2-risk-matrix-wrap">
      <div style="font-size:11px;color:var(--v2-t3);margin-bottom:6px">Likelihood → / Impact ↑ · Click a cell for details</div>
      <div class="v2-risk-matrix">
        <div class="v2-rm-corner"></div>
        ${[1,2,3].map(lk => `<div class="v2-rm-col-header">${L[lk]}</div>`).join('')}
        ${[3,2,1].map(im => `
          <div class="v2-rm-row-header">${L[im]}</div>
          ${[1,2,3].map(lk => {
            const key  = `${lk}_${im}`;
            const list = cells[key] || [];
            return `<div class="v2-rm-cell" style="background:${cellBg(lk,im)};border-color:${cellBorder(lk,im)}"
                         onclick="v2ShowRiskCellDetail('${key}')">
              ${list.length
                ? `<div class="v2-rm-count">${list.length}</div>
                   ${list.slice(0,2).map(r => `<div class="v2-rm-item">${r.name.slice(0,24)}</div>`).join('')}
                   ${list.length > 2 ? `<div class="v2-rm-more">+${list.length - 2} more</div>` : ''}`
                : `<div class="v2-rm-empty">—</div>`}
            </div>`;
          }).join('')}
        `).join('')}
      </div>
    </div>`;
}

function v2ShowRiskCellDetail(key) {
  const R_data  = typeof R !== 'undefined' ? R : {};
  const risks   = R_data.a8?.risks || R_data.a8?.risk_factors || [];
  const [lk, im] = key.split('_').map(Number);
  const matched = risks.filter(r =>
    _v2NormRisk(r.likelihood || r.probability, _LK_MAP) === lk &&
    _v2NormRisk(r.severity   || r.impact,      _IM_MAP) === im
  );
  if (!matched.length) return;

  const ov = document.createElement('div');
  ov.className   = 'v2-modal-bg';
  ov.style.zIndex = '9100';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `
    <div class="v2-modal" style="max-width:480px">
      <div class="v2-modal-header">
        <div class="v2-modal-title">⚠️ Risk Details</div>
        <button class="v2-modal-close" onclick="this.closest('.v2-modal-bg').remove()">✕</button>
      </div>
      <div style="padding:16px">
        ${matched.map(r => {
          const name = typeof r === 'string' ? r : (r.risk || r.title || r.name || '');
          const mit  = r.mitigation || r.response || '';
          return `<div class="v2-risk-detail-card">
            <div class="v2-risk-detail-name">⚠️ ${name}</div>
            ${mit ? `<div class="v2-risk-detail-mit">🛡 <strong>Mitigation:</strong> ${mit}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  document.body.appendChild(ov);
}

// ══════════════════════════════════════════════════════════════════════════
// 13. GRANT MATCH SCORE
// ══════════════════════════════════════════════════════════════════════════

function v2GetGrantsWithFit() {
  const R_data   = typeof R !== 'undefined' ? R : {};
  const grants   = R_data.a12?.grants || R_data.a12?.programs || [];
  const run      = V2?.run || {};
  const industry = run.industry || '';
  const budget   = parseInt(run.budget || 600000);
  const zip      = run.zip || '';

  return grants.map(g => {
    const txt    = JSON.stringify(g).toLowerCase();
    let fit      = 50;
    if (txt.includes(industry) || txt.includes('all industries') || txt.includes('small business')) fit += 20;
    const award  = g.max_award || g.amount_max || parseInt(String(g.amount || '0').replace(/[^0-9]/g, '')) || 0;
    if (award > 0 && award <= budget * 2) fit += 15;
    if (txt.includes(zip.slice(0, 3)) || txt.includes('federal') || txt.includes('national') || txt.includes('all states')) fit += 15;
    return { ...g, fitPct: Math.min(99, fit) };
  }).sort((a, b) => b.fitPct - a.fitPct);
}

function v2RenderGrantsWithFit() {
  const grants = v2GetGrantsWithFit();
  if (!grants.length) return `<div class="v2-empty-panel">Run Agent 12 (Grant Search) to see grant data</div>`;
  return `
    ${grants.map(g => `
      <div class="v2-grant-fit-row">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;margin-bottom:2px">${g.name || g.program || 'Grant'}</div>
          <div style="font-size:11px;color:var(--v2-t2)">${[g.type, g.amount ? '💰 ' + g.amount : '', g.deadline ? '📅 ' + g.deadline : ''].filter(Boolean).join(' · ')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <div class="v2-grant-fit-bar"><div class="v2-grant-fit-fill" style="width:${g.fitPct}%;background:${g.fitPct >= 70 ? 'var(--v2-green)' : g.fitPct >= 50 ? 'var(--v2-amber)' : 'var(--v2-red)'}"></div></div>
          <span class="v2-grant-fit-pct" style="color:${g.fitPct >= 70 ? 'var(--v2-green)' : g.fitPct >= 50 ? 'var(--v2-amber)' : 'var(--v2-red)'}">${g.fitPct}% fit</span>
        </div>
      </div>`).join('')}`;
}

// ══════════════════════════════════════════════════════════════════════════
// 14. AGENT CORRELATION VIEW
// ══════════════════════════════════════════════════════════════════════════

function v2RenderAgentCorrelation() {
  const comps = v2GetScoreBreakdown();
  const MAP = [
    { agents:[2],    label:'Gap Analysis',  compKey:'Gap',         ico:'🗺️' },
    { agents:[7],    label:'Financials',    compKey:'Financials',  ico:'💰' },
    { agents:[8],    label:'AI Verdict',    compKey:'AI Verdict',  ico:'🤖' },
    { agents:[6,13], label:'Competition',   compKey:'Competition', ico:'🎯' },
    { agents:[5],    label:'Compliance',    compKey:'Compliance',  ico:'📋' },
  ];

  return `
    <div class="v2-corr-wrap">
      <div style="font-size:12px;color:var(--v2-t2);margin-bottom:14px">
        Which agents drive your score. <span style="color:var(--v2-red);font-weight:600">Score Killer</span> = component below 50% — fix this first.
      </div>
      ${MAP.map(m => {
        const comp = comps.find(c => c.label.toLowerCase().includes(m.compKey.split(' ')[0].toLowerCase()));
        if (!comp) return '';
        const pct      = Math.round(comp.pct * 100);
        const color    = pct >= 70 ? 'var(--v2-green)' : pct >= 45 ? 'var(--v2-amber)' : 'var(--v2-red)';
        const isKiller = pct < 50;
        return `<div class="v2-corr-row${isKiller ? ' killer' : ''}">
          <div class="v2-corr-agents">${m.agents.map(n => `<span class="v2-corr-agent-badge">A${n}</span>`).join('')}</div>
          <div class="v2-corr-body">
            <div class="v2-corr-name">${m.ico} ${m.label}${isKiller ? ' <span class="v2-corr-killer">Score Killer</span>' : ''}</div>
            <div class="v2-corr-bar-track">
              <div class="v2-corr-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
            <div class="v2-corr-stats">
              <span style="color:${color};font-weight:700">${comp.earned}/${comp.max} pts</span>
              <span style="color:var(--v2-t3);font-size:11px;margin-left:8px">${comp.detail}</span>
            </div>
          </div>
          <div class="v2-corr-pct" style="color:${color}">${pct}%</div>
        </div>`;
      }).join('')}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// 15. DECISION AUDIT TRAIL
// ══════════════════════════════════════════════════════════════════════════

function v2GetComponentFormula(c, R_data) {
  const l = c.label.toLowerCase();
  if (l.includes('gap')) {
    const gap = R_data.a2?.gap_score || R_data.a2?.overall_gap_score || '?';
    const pop = R_data.a1?.population_density_score || '?';
    return `gap_score(${gap}) × 0.6 + density_factor(${pop}) × 0.4 = ${c.earned} / ${c.max}`;
  }
  if (l.includes('financ')) {
    const roi = R_data.a7?.scenarios?.[1]?.roi_3yr || '?';
    const be  = R_data.a7?.scenarios?.[1]?.breakeven_months || '?';
    return `roi_factor(${roi}%) × 0.5 + breakeven_factor(M${be}) × 0.5 = ${c.earned} / ${c.max}`;
  }
  if (l.includes('verdict') || l.includes('ai')) {
    const verdict = R_data.a8?.verdict || R_data.a8?.recommendation || '?';
    return `ai_verdict("${verdict}") → normalized score = ${c.earned} / ${c.max}`;
  }
  if (l.includes('compet')) {
    const cc = R_data.a6?.competitor_count || '?';
    const ss = R_data.a6?.saturation_score || '?';
    return `saturation_score(${ss}) + competitor_density(n=${cc}) = ${c.earned} / ${c.max}`;
  }
  if (l.includes('compli')) {
    const t   = R_data.a5?.total_timeline_months || '?';
    const cpx = R_data.a5?.complexity || '?';
    return `timeline_factor(${t} mo) + complexity("${cpx}") = ${c.earned} / ${c.max}`;
  }
  return null;
}

function v2RenderAuditTrail() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const comps  = v2GetScoreBreakdown();
  return `
    <div class="v2-audit-wrap">
      <div style="font-size:12px;color:var(--v2-t2);margin-bottom:14px">
        Exact formula used for each score component with live R values plugged in.
      </div>
      ${comps.map(c => {
        const pct   = Math.round(c.pct * 100);
        const color = pct >= 70 ? 'var(--v2-green)' : pct >= 45 ? 'var(--v2-amber)' : 'var(--v2-red)';
        const fml   = v2GetComponentFormula(c, R_data);
        return `<div class="v2-audit-block">
          <div class="v2-audit-header">
            <span class="v2-audit-ico">${c.ico}</span>
            <span class="v2-audit-label">${c.label}</span>
            <code class="v2-audit-score" style="color:${color}">${c.earned} / ${c.max} pts (${pct}%)</code>
          </div>
          ${fml ? `<div class="v2-audit-formula"><code>${fml}</code></div>` : ''}
          ${c.subPts?.length ? `<div class="v2-audit-subs">
            ${c.subPts.map(sp => `<div class="v2-audit-sub">
              <span class="v2-audit-sub-label">${sp.label}</span>
              <span class="v2-audit-sub-val">${sp.pts} / ${sp.maxPts}</span>
            </div>`).join('')}
          </div>` : ''}
          <div class="v2-audit-reasoning">${c.detail}</div>
        </div>`;
      }).join('')}
    </div>`;
}

// (Dashboard integration is handled directly in v2-06-dashboard.js)

// ══════════════════════════════════════════════════════════════════════════
// PORTFOLIO CARD OVERRIDE — sparkline + full feature set
// ══════════════════════════════════════════════════════════════════════════

function v2RenderPortfolioCard(r) {
  const verdict   = v2ScoreVerdict(r.score);
  const ringColor = r.score >= 70 ? 'var(--v2-green)' : r.score >= 45 ? 'var(--v2-amber)' : 'var(--v2-red)';
  const hasR      = !!(r.R && Object.keys(r.R).length);
  const sparkline = v2SparklineSVG(r.score_history || (r.score ? [r.score] : []));
  const history   = r.score_history || [];

  return `
    <div class="v2-port-card" id="v2-port-card-${r.id}">
      <div class="v2-port-card-head">
        <div>
          <div class="v2-port-ico">${r.indEmoji || '🏢'}</div>
          <div class="v2-port-name">${r.indLabel || 'Business'}</div>
          <div class="v2-port-loc">📍 ZIP ${r.zip} · $${parseInt(r.budget || 0).toLocaleString()}</div>
        </div>
        <div style="text-align:right">
          <div class="v2-port-score" style="color:${ringColor}">${r.score}</div>
          <div class="v2-port-score-lbl">/ 100</div>
          <span class="v2-port-badge ${r.verdict || 'caution'}" style="margin-top:6px;display:inline-block">${r.label || '—'}</span>
        </div>
      </div>
      ${sparkline ? `<div style="margin-bottom:4px" title="Score history: ${history.join(' → ')}">${sparkline}</div>` : ''}
      <div style="font-size:12px;color:var(--v2-t3);margin-bottom:10px">
        ${new Date(r.ts || Date.now()).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
        ${hasR ? ' · <span style="color:var(--v2-green);font-size:11px">● Full data</span>' : ''}
        ${history.length > 1 ? ` · <span style="color:var(--v2-t3);font-size:11px">${history.length} runs</span>` : ''}
      </div>
      ${r.tag ? `<div style="margin-bottom:8px"><span class="v2-port-tag-chip" style="background:${(typeof V2_PORT_TAGS !== 'undefined' ? V2_PORT_TAGS : []).find(t => t.id === r.tag)?.color || 'rgba(99,102,241,.15)'};color:${(typeof V2_PORT_TAGS !== 'undefined' ? V2_PORT_TAGS : []).find(t => t.id === r.tag)?.text || 'var(--v2-a1)'}">${(typeof V2_PORT_TAGS !== 'undefined' ? V2_PORT_TAGS : []).find(t => t.id === r.tag)?.label || r.tag}</span></div>` : ''}
      ${r.note ? `<div class="v2-port-note">${r.note}</div>` : ''}
      <div class="v2-port-actions">
        <button class="v2-btn ghost sm" style="flex:1;justify-content:center" onclick="v2PortRestore('${r.id}')">↩ Restore</button>
        <button class="v2-btn ghost sm" onclick="v2PortCompareSelect('${r.id}')" title="Compare with another analysis">↔</button>
        ${typeof v2PortCycleTag === 'function' ? `<button class="v2-btn ghost sm" onclick="event.stopPropagation();v2PortCycleTag('${r.id}')" title="Tag">🏷</button>` : ''}
        ${typeof v2PortStartNote === 'function' ? `<button class="v2-btn ghost sm" onclick="event.stopPropagation();v2PortStartNote('${r.id}')" title="Note">📝</button>` : ''}
        <button class="v2-btn danger sm" onclick="v2PortDelete('${r.id}')">🗑</button>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// SAVE CURRENT RUN OVERRIDE — accumulates score_history
// ══════════════════════════════════════════════════════════════════════════

function v2SaveCurrentRun() {
  const run = V2?.run;
  if (!run) { v2Toast('No analysis to save'); return; }

  const ind      = V2_INDUSTRIES.find(i => i.val === run.industry) || { emoji:'🏢', label:'Business' };
  // Recompute score from current R so saved score matches the dashboard ring.
  // (Showcase seeds run.score from a baseline, but v2CalcScore reflects the
  // actual R data — they can drift if R was modified after seeding.)
  const currentScore = (typeof v2CalcScore === 'function') ? v2CalcScore() : (run.score || 0);
  const verdict  = v2ScoreVerdict(currentScore);
  const existing = V2.portfolio.find(r => r.industry === run.industry && r.zip === run.zip);
  const history  = existing ? [...(existing.score_history || [existing.score]), currentScore] : [currentScore];

  // Capture per-component breakdown so run-diff panel can compute real
  // deltas between this run and the previous one for the same ZIP/industry.
  let breakdown = {};
  try {
    if (typeof v2CalcScoreBreakdown === 'function') {
      v2CalcScoreBreakdown().forEach(c => { if (c.id) breakdown[c.id] = c.earned; });
    }
  } catch(e) {}

  const entry = {
    ...run,
    score:        currentScore,
    id:           run.id || Date.now(),
    verdict:      verdict.verdict || 'caution',
    label:        verdict.label   || '—',
    indEmoji:     ind.emoji,
    indLabel:     ind.label,
    score_history: history,
    breakdown,
    R:            typeof R !== 'undefined' ? JSON.parse(JSON.stringify(R)) : (run.R || {}),
  };

  if (existing) {
    V2.portfolio = V2.portfolio.map(r =>
      (r.industry === run.industry && r.zip === run.zip) ? { ...r, ...entry, id: r.id } : r
    );
    v2Toast(`Updated: ${ind.emoji} ${ind.label} (${history.length} runs)`);
  } else {
    V2.portfolio.unshift(entry);
    v2Toast(`Saved: ${ind.emoji} ${ind.label}`);
  }
  v2SavePortfolio();
}
