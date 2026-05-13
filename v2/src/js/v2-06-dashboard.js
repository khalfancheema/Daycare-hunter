// ── V2 DASHBOARD ──────────────────────────────────────────────────────────

// Shown when user navigates to Dashboard before running any analysis
function v2ShowDashboardEmpty() {
  const wrap = document.getElementById('v2-dash-wrap');
  const nav  = document.getElementById('v2-agent-sidenav');
  if (wrap) wrap.innerHTML = `
    <div class="v2-dash-empty">
      <div class="v2-dash-empty-ico">📊</div>
      <h2 class="v2-dash-empty-title">No Analysis Yet</h2>
      <p class="v2-dash-empty-sub">Run an analysis to see your business viability score, financials, market gap, competition intel, and more — all in one dashboard.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="v2-btn primary" onclick="v2GoTo('wizard')">🚀 Start New Analysis</button>
        <button class="v2-btn ghost" onclick="v2StartDemo()">⚡ Try Demo Mode</button>
      </div>
    </div>`;
  if (nav) nav.innerHTML = '';
}

function v2RenderDashboard(run) {
  const wrap = document.getElementById('v2-dash-wrap');
  if (!wrap) return;
  // Render agent sidenav alongside dashboard
  v2RenderAgentSidenav();

  const score   = run.score || v2CalcScore();
  const verdict = v2ScoreVerdict(score);
  const kpis    = v2GetKPIs();
  const ind     = V2_INDUSTRIES.find(i=>i.val===run.industry)||{emoji:'🏢',label:'Business'};
  const circ    = 2 * Math.PI * 54;
  const offset  = circ * (1 - score / 100);
  const ringColor = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';

  const ring = `
    <svg width="130" height="130" viewBox="0 0 130 130" style="display:block">
      <circle class="v2-score-ring-bg" cx="65" cy="65" r="54"/>
      <circle class="v2-score-ring-fill" cx="65" cy="65" r="54"
        stroke="${ringColor}" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
        style="transform:rotate(-90deg);transform-origin:center"/>
    </svg>
    <div class="v2-score-num">
      <span class="big" style="color:${ringColor}">${score}</span>
      <span class="small">/100</span>
    </div>`;

  wrap.innerHTML = `
    <div class="v2-dash-header">
      <div>
        <div class="v2-dash-title">${ind.emoji} ${ind.label} Analysis</div>
        <div class="v2-dash-meta">ZIP ${run.zip} · ${run.radius} mi radius · $${parseInt(run.budget||0).toLocaleString()} budget · ${new Date(run.ts||Date.now()).toLocaleDateString()}</div>
      </div>
      <div class="v2-dash-actions">
        <button class="v2-btn ghost sm" onclick="v2ExportAll()" title="Export full pipeline as JSON">⬇ Export</button>
        <button class="v2-btn ghost sm" onclick="v2ShareReport()" title="Copy shareable link">🔗 Share</button>
        <button class="v2-btn primary sm" onclick="v2SaveCurrentRun()">💾 Save Run</button>
        <div class="v2-more-wrap">
          <button class="v2-btn ghost sm" onclick="v2ToggleMoreMenu(this)" title="More actions">··· More</button>
          <div class="v2-more-menu">
            <button class="v2-more-item" onclick="v2ShowExecution();v2CloseMoreMenus()">🗓 Execution Plan</button>
            <button class="v2-more-item" onclick="v2ShowInvestor();v2CloseMoreMenus()">📑 Investor Pack</button>
            <button class="v2-more-item" onclick="v2PrintDashboard();v2CloseMoreMenus()">🖨 Print</button>
            ${typeof v2GeneratePDFReport === 'function' ? `<button class="v2-more-item" onclick="v2GeneratePDFReport();v2CloseMoreMenus()">📄 PDF Report</button>` : ''}
            ${typeof v2ExportSlides === 'function' ? `<button class="v2-more-item" onclick="v2ExportSlides();v2CloseMoreMenus()">📊 Slides</button>` : ''}
            ${typeof v2ShowREditor === 'function' ? `<button class="v2-more-item" onclick="v2ShowREditor();v2CloseMoreMenus()">🔧 Edit Data</button>` : ''}
            ${typeof v2ShowZIPCompare === 'function' ? `<button class="v2-more-item" onclick="v2ShowZIPCompare();v2CloseMoreMenus()">📍 ZIP Compare</button>` : ''}
            <button class="v2-more-item" onclick="v2GoTo('traditional');v2CloseMoreMenus()">🔬 Advanced View</button>
            <div class="v2-more-divider"></div>
            <button class="v2-more-item" onclick="v2ExportDashboardHTML?.();v2CloseMoreMenus()">📥 Export HTML</button>
            <button class="v2-more-item" onclick="v2ExportSBAPackage?.();v2CloseMoreMenus()">📋 SBA Package</button>
            <button class="v2-more-item" onclick="v2SaveSearch?.();v2CloseMoreMenus()">🔖 Save Search</button>
          </div>
        </div>
      </div>
    </div>

    <div class="v2-verdict-banner ${verdict.colorClass}">
      <div class="v2-verdict-icon">${verdict.icon}</div>
      <div class="v2-verdict-text">
        <h3>${verdict.title}</h3>
        <p>${verdict.summary}</p>
      </div>
      <div class="v2-verdict-cta">
        <span class="v2-badge ${verdict.colorClass==='go'?'green':verdict.colorClass==='caution'?'amber':'red'}" style="font-size:13px;padding:6px 14px">${verdict.label}</span>
      </div>
    </div>

    <div class="v2-metrics-row">
      <div class="v2-card glow v2-score-card">
        <div class="v2-score-ring-wrap">${ring}</div>
        <div class="v2-score-verdict" style="color:${ringColor}">${verdict.title}</div>
        <div class="v2-score-reason">Gap · Financials · Verdict · Competition · Compliance</div>
        ${v2RenderScoreBreakdown()}
      </div>
      <div class="v2-card" style="padding:20px">
        <div class="v2-label" style="margin-bottom:14px">Key Metrics</div>
        <div class="v2-kpi-grid">
          ${kpis.map(k=>`
            <div class="v2-kpi">
              <div class="v2-kpi-ico">${k.ico}</div>
              <div class="v2-kpi-val">${k.val}</div>
              <div class="v2-kpi-lbl">${k.lbl}</div>
            </div>`).join('')}
          ${!kpis.length?'<div style="color:var(--v2-t3);font-size:13px;padding:12px">Run the pipeline to see metrics</div>':''}
        </div>
      </div>
    </div>

    ${v2RenderScoreBreakdown(score)}

    <div class="v2-dash-tabs-wrap">
      <div class="v2-dash-tabs" id="v2-dash-tabs">
        <div class="v2-dash-tab active" onclick="v2DashTab('executive',this)">📋 Executive</div>
        <div class="v2-dash-tab" onclick="v2DashTab('financials',this)">💰 Financials</div>
        <div class="v2-dash-tab" onclick="v2DashTab('market',this)">🗺️ Market</div>
        <div class="v2-dash-tab" onclick="v2DashTab('competition',this)">🔍 Competition</div>
        <div class="v2-dash-tab" onclick="v2DashTab('risks',this)">⚠️ Risks</div>
        <div class="v2-dash-tab" onclick="v2DashTab('plan',this)">✅ Action Plan</div>
        <div class="v2-dash-tab" onclick="v2DashTab('grants',this)">💵 Grants</div>
        <div class="v2-dash-tab" onclick="v2DashTab('agents',this)">🤖 All Agents</div>
        <div class="v2-dash-tab" onclick="v2DashTab('dag',this)">🕸 Agent Flow</div>
        <div class="v2-dash-tab" onclick="v2DashTab('heatmap',this)">🗺 Heat Map</div>
        <div class="v2-dash-tab" onclick="v2DashTab('whatif',this)">🎲 What-If</div>
        <div class="v2-dash-tab" onclick="v2DashTab('benchmark',this)">📊 Benchmark</div>
        <div class="v2-dash-tab" onclick="v2DashTab('correlation',this)">🔗 Score Drivers</div>
        <div class="v2-dash-tab" onclick="v2DashTab('audit',this)">🔬 Audit Trail</div>
      </div>
    </div>

    <div class="v2-dash-panel active" id="v2-panel-executive">${v2RenderExecutive()}</div>
    <div class="v2-dash-panel" id="v2-panel-financials">
      ${v2RenderFinancials()}
      <div class="v2-card" style="padding:20px;margin-top:16px">
        <div class="v2-label" style="margin-bottom:12px">💧 Startup Cost Waterfall</div>
        ${typeof v2RenderWaterfallChart === 'function' ? v2RenderWaterfallChart() : ''}
        <div style="margin-top:12px;text-align:center">
          <button class="v2-btn ghost sm" onclick="v2ShowFinancialDeepDive()">💰 Open 36-Month P&L Deep-Dive →</button>
        </div>
      </div>
    </div>
    <div class="v2-dash-panel" id="v2-panel-market">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="v2-btn ghost sm" onclick="v2ShowCityDrilldown()">🏙 City-by-City Table →</button>
      </div>
      ${v2RenderMarket()}
    </div>
    <div class="v2-dash-panel" id="v2-panel-competition">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="v2-btn ghost sm" onclick="v2ShowCompetitorProfiles()">🎯 Competitor Profile Cards →</button>
      </div>
      ${v2RenderCompetition()}
    </div>
    <div class="v2-dash-panel" id="v2-panel-risks">
      ${v2RenderRisks()}
      <div class="v2-card" style="padding:20px;margin-top:16px">
        <div class="v2-label" style="margin-bottom:12px">⚠️ Risk Matrix — click a cell for details</div>
        ${typeof v2RenderRiskMatrix === 'function' ? v2RenderRiskMatrix() : ''}
      </div>
    </div>
    <div class="v2-dash-panel" id="v2-panel-plan">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="v2-btn ghost sm" onclick="v2ShowComplianceTimeline()">📋 Compliance Timeline →</button>
      </div>
      ${v2RenderActionPlan()}
    </div>
    <div class="v2-dash-panel" id="v2-panel-grants">
      ${v2RenderGrants()}
      <div class="v2-card" style="padding:20px;margin-top:16px">
        <div class="v2-label" style="margin-bottom:12px">🎯 Grant Fit Rankings — sorted by match score</div>
        ${typeof v2RenderGrantsWithFit === 'function' ? v2RenderGrantsWithFit() : ''}
      </div>
    </div>
    <div class="v2-dash-panel" id="v2-panel-agents">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="v2-btn ghost sm" onclick="v2ShowDataExplorer()">🔍 Raw Data Explorer →</button>
      </div>
      ${v2RenderAgents()}
    </div>
    <div class="v2-dash-panel" id="v2-panel-dag">${typeof v2RenderDAGPanel === 'function' ? v2RenderDAGPanel() : ''}</div>
    <div class="v2-dash-panel" id="v2-panel-heatmap">${typeof v2RenderMarketHeatMap === 'function' ? v2RenderMarketHeatMap() : ''}</div>
    <div class="v2-dash-panel" id="v2-panel-whatif">${typeof v2RenderWhatIfInline === 'function' ? v2RenderWhatIfInline() : ''}</div>
    <div class="v2-dash-panel" id="v2-panel-benchmark">${typeof v2RenderBenchmarking === 'function' ? v2RenderBenchmarking() : ''}</div>
    <div class="v2-dash-panel" id="v2-panel-correlation">${typeof v2RenderAgentCorrelation === 'function' ? v2RenderAgentCorrelation() : ''}</div>
    <div class="v2-dash-panel" id="v2-panel-audit">${typeof v2RenderAuditTrail === 'function' ? v2RenderAuditTrail() : ''}</div>

    <div class="v2-tools-strip">
      <div class="v2-tools-label">🔧 Advanced Tools</div>
      <div class="v2-tools-btns">
        <button class="v2-tool-btn" onclick="v2GoTo('traditional');setTimeout(()=>{ const btn=document.getElementById('compareBtn'); if(btn) btn.click(); },500)" title="Compare two ZIP codes side-by-side">
          📊 ZIP Compare
        </button>
        <button class="v2-tool-btn" onclick="v2GoTo('traditional');setTimeout(()=>{ const btn=document.getElementById('scenarioBtn')||document.querySelector('[onclick*=scenario]'); if(btn) btn.click(); },500)" title="Adjust enrollment, pricing, and cost assumptions">
          🎲 Scenario Builder
        </button>
        <button class="v2-tool-btn" onclick="v2GoTo('traditional');setTimeout(()=>{ const btn=document.getElementById('dagBtn')||document.querySelector('[onclick*=dag]'); if(btn) btn.click(); },500)" title="Agent dependency graph">
          🕸 Agent DAG
        </button>
        <button class="v2-tool-btn" onclick="typeof fullPipelineExport==='function'?fullPipelineExport():v2GoTo('traditional')" title="Export all 17 agents as one PDF">
          📄 Full PDF Export
        </button>
        <button class="v2-tool-btn" onclick="typeof printReport==='function'?printReport():v2GoTo('traditional')" title="Print-ready summary report">
          🖨 Print Report
        </button>
        <button class="v2-tool-btn" onclick="typeof exportResults==='function'?exportResults():v2GoTo('traditional')" title="Download raw pipeline JSON">
          ⬇ Raw JSON
        </button>
      </div>
    </div>
  `;
}

// ── SCORE BREAKDOWN ───────────────────────────────────────────────────────
function v2RenderScoreBreakdown(score) {
  const components = v2GetScoreBreakdown();
  const totalEarned = components.reduce((s, c) => s + c.earned, 0);
  const totalMax    = components.reduce((s, c) => s + c.max,    0);
  const dataComponents = components.filter(c => !c.missing);
  const missingCount   = components.filter(c =>  c.missing).length;

  // Bar color based on pct
  const barColor = pct =>
    pct >= 0.8 ? 'var(--v2-green)' :
    pct >= 0.5 ? 'var(--v2-amber)' : 'var(--v2-red)';

  const compRows = components.map(c => {
    if (c.missing) return `
      <div class="v2-bkd-row missing">
        <div class="v2-bkd-ico">${c.ico}</div>
        <div class="v2-bkd-col">
          <div class="v2-bkd-label">${c.label}</div>
          <div class="v2-bkd-agent">${c.agent}</div>
        </div>
        <div class="v2-bkd-pts missing">—&nbsp;/&nbsp;${c.max}<span class="v2-bkd-unit">pts</span></div>
      </div>`;

    const fillPct = Math.round(c.pct * 100);
    const color   = barColor(c.pct);

    const subRows = c.subPts ? c.subPts.map(sp => `
      <div class="v2-bkd-subrow">
        <span class="v2-bkd-sub-label">${sp.label}</span>
        <span class="v2-bkd-sub-pts" style="color:${barColor(sp.pts/sp.maxPts)}">${sp.pts}/${sp.maxPts}</span>
      </div>`).join('') : '';

    return `
      <div class="v2-bkd-row">
        <div class="v2-bkd-ico">${c.ico}</div>
        <div class="v2-bkd-col">
          <div class="v2-bkd-top">
            <div>
              <div class="v2-bkd-label">${c.label}</div>
              <div class="v2-bkd-agent">${c.agent}</div>
            </div>
            <div class="v2-bkd-pts" style="color:${color}">
              ${c.earned}<span style="color:var(--v2-t3);font-weight:400">&nbsp;/&nbsp;${c.max}</span><span class="v2-bkd-unit">pts</span>
            </div>
          </div>
          <div class="v2-bkd-bar-track">
            <div class="v2-bkd-bar-fill" style="width:${fillPct}%;background:${color}"></div>
          </div>
          <div class="v2-bkd-detail">${c.detail}</div>
          ${subRows ? `<div class="v2-bkd-subreasons">${subRows}</div>` : ''}
          ${c.tip ? `<div class="v2-bkd-tip">💡 ${c.tip}</div>` : ''}
        </div>
      </div>`;
  }).join('<div class="v2-bkd-divider"></div>');

  const weightNote = missingCount > 0
    ? `<div class="v2-bkd-weight-note">⚠️ ${missingCount} component${missingCount>1?'s':''} not yet analyzed — score normalized to ${totalMax - components.filter(c=>c.missing).reduce((s,c)=>s+c.max,0)} available points</div>`
    : '';

  return `
    <div class="v2-card v2-bkd-card" id="v2-score-breakdown">
      <div class="v2-bkd-header" onclick="v2ToggleBreakdown()" role="button" aria-expanded="false" id="v2-bkd-header">
        <div class="v2-bkd-header-left">
          <span class="v2-bkd-header-ico">🔬</span>
          <div>
            <div class="v2-bkd-header-title">How this score was calculated</div>
            <div class="v2-bkd-header-sub">${dataComponents.length} of 5 components · ${totalEarned} points earned</div>
          </div>
        </div>
        <div class="v2-bkd-header-right">
          <div class="v2-bkd-pill" style="background:${score>=70?'rgba(34,197,94,.12)':score>=45?'rgba(245,158,11,.12)':'rgba(239,68,68,.12)'};color:${score>=70?'var(--v2-green)':score>=45?'var(--v2-amber)':'var(--v2-red)'}">
            ${score}/100
          </div>
          <span class="v2-bkd-chevron" id="v2-bkd-chevron">▼</span>
        </div>
      </div>
      <div class="v2-bkd-body" id="v2-bkd-body">
        ${weightNote}
        <div class="v2-bkd-rows">${compRows}</div>
        <div class="v2-bkd-footer">
          <div class="v2-bkd-footer-note">Score formula: Gap (25) + Financials (25) + AI Verdict (20) + Competition (15) + Compliance (15) = 100 pts max</div>
          ${missingCount === 0 ? `<button class="v2-btn ghost sm" onclick="v2DashTab('financials',document.querySelector('[onclick*=financials]'));event.stopPropagation()">Improve Score →</button>` : ''}
        </div>
      </div>
    </div>`;
}

function v2ToggleBreakdown() {
  const body    = document.getElementById('v2-bkd-body');
  const chevron = document.getElementById('v2-bkd-chevron');
  const header  = document.getElementById('v2-bkd-header');
  if (!body) return;
  const open = body.classList.toggle('open');
  if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
  if (header)  header.setAttribute('aria-expanded', open);
}

// ── AGENT SIDENAV ─────────────────────────────────────────────────────────
function v2RenderAgentSidenav() {
  const nav = document.getElementById('v2-agent-sidenav');
  if (!nav) return;

  const doneCount = V2_AGENTS.filter(a => {
    const row = document.getElementById(`v2-ar-${a.id}`);
    return row?.classList.contains('done');
  }).length;

  nav.innerHTML = `
    <div class="v2-aside-header">
      <div class="v2-aside-title">🤖 Agent Outputs</div>
      <div class="v2-aside-subtitle">${doneCount} / ${V2_AGENTS.length} complete</div>
    </div>
    ${V2_AGENTS.map(a => {
      const row     = document.getElementById(`v2-ar-${a.id}`);
      const isDone  = row?.classList.contains('done');
      const isError = row?.classList.contains('error');
      const isRun   = row?.classList.contains('running');
      const st      = isDone ? 'done' : isError ? 'error' : isRun ? 'running' : '';
      return `
        <div class="v2-aside-item ${st}" id="v2-aside-item-${a.id}"
             onclick="v2JumpToAgent(${a.id})" title="${a.name}">
          <div class="v2-aside-dot ${st}"></div>
          <span class="v2-aside-ico">${a.ico}</span>
          <span class="v2-aside-name">${a.name}</span>
          <span class="v2-aside-id">${a.id}</span>
        </div>`;
    }).join('')}
  `;
}

function v2JumpToAgent(id) {
  // Switch to the All Agents tab
  const tabEl = document.querySelector('#v2-dash-tabs .v2-dash-tab:last-child');
  v2DashTab('agents', tabEl);

  // Highlight the sidenav item
  document.querySelectorAll('.v2-aside-item').forEach(el => el.classList.remove('active-item'));
  const sideItem = document.getElementById(`v2-aside-item-${id}`);
  if (sideItem) sideItem.classList.add('active-item');

  // Scroll to the agent card
  setTimeout(() => {
    const el = document.getElementById(`v2-agent-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Brief highlight pulse
      el.style.outline = '2px solid var(--v2-a1)';
      el.style.outlineOffset = '3px';
      setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 1500);
    }
  }, 80);
}

function v2ExportAll() {
  if (typeof exportResults === 'function') exportResults();
  else v2Toast('No data to export. Run the pipeline first.');
}

// ── SCORE BREAKDOWN EXPLAINER ─────────────────────────────────────────────
function v2RenderScoreBreakdown() {
  const parts = v2CalcScoreBreakdown();
  if (!parts.length) return '';

  const totalWeight = parts.reduce((s, p) => s + p.max, 0);
  const totalEarned = parts.reduce((s, p) => s + p.earned, 0);
  const normalized  = Math.round((totalEarned / totalWeight) * 100);

  const barColor = tier =>
    tier === 'strong'   ? 'var(--v2-green)' :
    tier === 'moderate' ? 'var(--v2-amber)' : 'var(--v2-red)';

  const rows = parts.map(p => {
    const fillW = Math.round(p.pct * 100);
    const color = barColor(p.tier);
    const subHtml = (p.sub || []).map(s => `
      <div class="v2-sb-sub">
        <span class="v2-sb-sub-label">${s.label}</span>
        <span class="v2-sb-sub-bar">
          <span class="v2-sb-sub-fill" style="width:${Math.round(s.pts/s.max*100)}%;background:${color}"></span>
        </span>
        <span class="v2-sb-sub-pts">${s.pts}/${s.max}</span>
        <span class="v2-sb-sub-note">${s.note}</span>
      </div>`).join('');

    return `
      <div class="v2-sb-row">
        <div class="v2-sb-header">
          <span class="v2-sb-ico">${p.ico}</span>
          <div class="v2-sb-meta">
            <div class="v2-sb-label">${p.label}</div>
            <div class="v2-sb-agent">${p.agent}</div>
          </div>
          <div class="v2-sb-right">
            <span class="v2-sb-pts" style="color:${color}">${p.earned}<span class="v2-sb-max">/${p.max}</span></span>
          </div>
        </div>
        <div class="v2-sb-bar-track">
          <div class="v2-sb-bar-fill" style="width:${fillW}%;background:${color}"></div>
        </div>
        ${subHtml ? `<div class="v2-sb-subs">${subHtml}</div>` : ''}
        <div class="v2-sb-tip ${p.tier}">
          ${p.tier === 'strong' ? '✓' : p.tier === 'moderate' ? '→' : '⚠'} ${p.tip}
        </div>
        <div class="v2-sb-detail">${p.detail}</div>
      </div>`;
  }).join('');

  const missingAgents = 5 - parts.length;
  const missingNote = missingAgents > 0
    ? `<div class="v2-sb-missing">${missingAgents} component${missingAgents>1?'s':''} not yet run — score will update as agents complete.</div>`
    : '';

  return `
    <div class="v2-score-breakdown" id="v2-score-breakdown">
      <button class="v2-sb-toggle" onclick="v2ToggleBreakdown(this)" aria-expanded="false">
        <span class="v2-sb-toggle-label">📐 How is this score calculated?</span>
        <span class="v2-sb-toggle-arrow">▾</span>
      </button>
      <div class="v2-sb-body" hidden>
        <div class="v2-sb-intro">
          Score is a weighted composite of 5 factors from ${parts.length} AI agents.
          Each factor is normalized so the final score reflects relative performance — not raw data.
        </div>
        <div class="v2-sb-rows">${rows}</div>
        ${missingNote}
        <div class="v2-sb-formula">
          <span class="v2-sb-formula-label">Weighted total</span>
          <span class="v2-sb-formula-eq">${totalEarned.toFixed(1)} / ${totalWeight} pts → <strong>${normalized}/100</strong></span>
        </div>
      </div>
    </div>`;
}

function v2ToggleBreakdown(btn) {
  const body = btn.closest('.v2-score-breakdown').querySelector('.v2-sb-body');
  const arrow = btn.querySelector('.v2-sb-toggle-arrow');
  const isHidden = body.hasAttribute('hidden');
  if (isHidden) {
    body.removeAttribute('hidden');
    arrow.textContent = '▴';
    btn.setAttribute('aria-expanded', 'true');
  } else {
    body.setAttribute('hidden', '');
    arrow.textContent = '▾';
    btn.setAttribute('aria-expanded', 'false');
  }
}

// ── TAB SWITCHING ─────────────────────────────────────────────────────────
function v2DashTab(id, el) {
  document.querySelectorAll('#v2-dash-tabs .v2-dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.v2-dash-panel').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  const panel = document.getElementById(`v2-panel-${id}`);
  if (panel) panel.classList.add('active');
}

// ── EXECUTIVE SUMMARY ─────────────────────────────────────────────────────
function v2RenderExecutive() {
  const a = v2GetAssessment();
  const insights = v2GetInsights();

  if (!a) return `
    <div class="v2-empty-panel">
      <div style="font-size:40px;margin-bottom:12px">📋</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px">No executive summary yet</div>
      <div class="v2-prose">Run the full pipeline to generate the AI executive analysis.</div>
    </div>`;

  const sf = a.successFactors;

  return `
    ${a.rationale ? `
    <div class="v2-exec-verdict-box">
      <div class="v2-exec-verdict-label">AI Verdict Rationale</div>
      <div class="v2-exec-verdict-text">${a.rationale}</div>
    </div>` : ''}

    ${a.assessment ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">📊 Overall Assessment</div>
      <div class="v2-prose">${a.assessment}</div>
    </div>` : ''}

    ${sf.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">✅ Success Factors</div>
      <div class="v2-sf-grid">
        ${sf.map((f,i)=>`
          <div class="v2-sf-item">
            <div class="v2-sf-num">${i+1}</div>
            <div class="v2-sf-text">${typeof f==='string'?f:(f.factor||f.title||f.name||String(f))}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${insights.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">💡 Market Intelligence Highlights</div>
      <div class="v2-insights">
        ${insights.map(i=>`
          <div class="v2-insight">
            <div class="v2-insight-ico">${i.ico}</div>
            <div>
              <div class="v2-insight-title">${i.title}</div>
              <div class="v2-insight-body">${i.body}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}
  `;
}

// ── FINANCIALS ────────────────────────────────────────────────────────────
function v2RenderFinancials() {
  const f = v2GetFinancialsDetail();

  if (!f) return `<div class="v2-empty-panel"><div style="font-size:40px;margin-bottom:12px">💰</div><div style="font-size:16px;font-weight:700;margin-bottom:8px">No financial data yet</div><div class="v2-prose">Run Agent 7 to generate financial models.</div></div>`;

  const fmtUSD = v => v ? `$${Number(v).toLocaleString()}` : '—';

  return `
    <div class="v2-fin-summary">
      <div class="v2-fin-stat">
        <div class="v2-fin-stat-val">${fmtUSD(f.startup)}</div>
        <div class="v2-fin-stat-lbl">Total Startup Cost</div>
      </div>
      <div class="v2-fin-stat">
        <div class="v2-fin-stat-val">${fmtUSD(f.monthly_expenses)}</div>
        <div class="v2-fin-stat-lbl">Monthly Fixed Costs</div>
      </div>
      <div class="v2-fin-stat">
        <div class="v2-fin-stat-val">${f.scenarios.length || 3}</div>
        <div class="v2-fin-stat-lbl">Scenarios Modeled</div>
      </div>
    </div>

    ${f.scenarios.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">📊 3-Scenario Financial Model</div>
      <div class="v2-table-wrap">
        <table class="v2-table">
          <thead><tr>
            <th>Scenario</th><th>Occupancy</th><th>Monthly Revenue</th>
            <th>Monthly Net</th><th>Break-Even</th><th>3yr ROI</th>
          </tr></thead>
          <tbody>
            ${f.scenarios.map(s => {
              const net = s.monthly_net || 0;
              const color = net > 0 ? 'var(--v2-green)' : 'var(--v2-red)';
              return `<tr>
                <td><strong>${s.name||'Scenario'}</strong></td>
                <td>${s.occupancy_rate||s.occupancy||'—'}${typeof (s.occupancy_rate||s.occupancy)==='number'?'%':''}</td>
                <td>${fmtUSD(s.monthly_revenue)}</td>
                <td style="color:${color};font-weight:700">${fmtUSD(s.monthly_net)}</td>
                <td>${s.breakeven_months ? s.breakeven_months+' mo' : '—'}</td>
                <td>${s.roi_3yr!=null ? (s.roi_3yr>0?'+':'')+s.roi_3yr+'%' : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    ${f.startup_breakdown.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">💸 Startup Cost Breakdown</div>
      <div class="v2-cost-grid">
        ${f.startup_breakdown.map(item=>`
          <div class="v2-cost-item">
            <div class="v2-cost-name">${typeof item==='string'?item:(item.item||item.category||item.name||'')}</div>
            <div class="v2-cost-val">${typeof item==='object'?fmtUSD(item.cost||item.amount||item.value||0):'—'}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${f.funding.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">🏦 Recommended Funding Sources</div>
      <div class="v2-insights">
        ${f.funding.map(s=>`
          <div class="v2-insight">
            <div class="v2-insight-ico">🏦</div>
            <div>
              <div class="v2-insight-title">${typeof s==='string'?s:(s.source||s.name||s.type||'')}</div>
              <div class="v2-insight-body">${typeof s==='object'?(s.amount?'Amount: '+fmtUSD(s.amount)+' · ':'')+( s.notes||s.description||s.terms||''):''}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${f.assumptions.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">📌 Key Assumptions</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${f.assumptions.map(a=>`
          <div class="v2-assumption">
            <span class="v2-assumption-dot">→</span>
            <span>${typeof a==='string'?a:(a.assumption||a.text||a.note||'')}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}
  `;
}

// ── MARKET ────────────────────────────────────────────────────────────────
function v2RenderMarket() {
  const { gap, sites, realEstate } = v2GetMarketData();

  if (!gap && !sites.length) return `<div class="v2-empty-panel"><div style="font-size:40px;margin-bottom:12px">🗺️</div><div style="font-size:16px;font-weight:700;margin-bottom:8px">No market data yet</div><div class="v2-prose">Run Agents 2, 3, and 4 for gap analysis, site scoring, and real estate.</div></div>`;

  return `
    ${gap ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">📊 Demand Gap Analysis by City</div>
      ${gap.summary ? `<div class="v2-prose" style="margin-bottom:16px">${gap.summary}</div>` : ''}
      <div class="v2-table-wrap">
        <table class="v2-table">
          <thead><tr>
            <th>City</th><th>Population</th><th>Existing Supply</th>
            <th>Estimated Demand</th><th>Gap Score</th><th>Verdict</th>
          </tr></thead>
          <tbody>
            ${gap.cities.map(c => {
              const gs = c.gap_score || 0;
              const vColor = gs >= 7 ? 'var(--v2-green)' : gs >= 4 ? 'var(--v2-amber)' : 'var(--v2-red)';
              const vLabel = gs >= 7 ? '🟢 High Opportunity' : gs >= 4 ? '🟡 Moderate' : '🔴 Saturated';
              return `<tr>
                <td><strong>${c.city||c.name||'—'}</strong></td>
                <td>${c.population ? Number(c.population).toLocaleString() : '—'}</td>
                <td>${c.existing_supply || c.competitor_count || '—'}</td>
                <td>${c.estimated_demand || c.demand_units || '—'}</td>
                <td><span style="font-weight:800;color:${vColor}">${gs}/10</span></td>
                <td><span style="font-size:12px;color:${vColor}">${vLabel}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    ${sites.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">📍 Top Site Rankings</div>
      <div class="v2-site-grid">
        ${sites.map((s,i)=>`
          <div class="v2-site-card">
            <div class="v2-site-rank">#${i+1}</div>
            <div class="v2-site-info">
              <div class="v2-site-name">${s.address||s.location||s.site||s.name||'Site '+(i+1)}</div>
              <div class="v2-site-city">${s.city||s.area||''}</div>
              <div class="v2-site-meta">
                ${s.rent_monthly||s.monthly_rent ? '💰 $'+Number(s.rent_monthly||s.monthly_rent).toLocaleString()+'/mo · ' : ''}
                ${s.sq_ft||s.sqft ? '📐 '+(s.sq_ft||s.sqft).toLocaleString()+' sq ft · ' : ''}
                ${s.score || s.site_score ? '⭐ Score: '+(s.score||s.site_score)+'/10' : ''}
              </div>
              ${s.pros||s.advantages ? `<div class="v2-prose" style="font-size:12px;margin-top:6px">${_truncate(s.pros||s.advantages||'',120)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${realEstate.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">🏢 Live Real Estate Listings</div>
      <div class="v2-table-wrap">
        <table class="v2-table">
          <thead><tr><th>Address</th><th>City</th><th>Sq Ft</th><th>Monthly Rent</th><th>Notes</th></tr></thead>
          <tbody>
            ${realEstate.map(p=>`<tr>
              <td>${p.address||p.location||'—'}</td>
              <td>${p.city||'—'}</td>
              <td>${p.sq_ft ? Number(p.sq_ft).toLocaleString() : '—'}</td>
              <td>${p.monthly_rent||p.rent ? '$'+Number(p.monthly_rent||p.rent).toLocaleString() : '—'}</td>
              <td><span class="v2-prose" style="font-size:12px">${_truncate(p.notes||p.description||'',80)}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
  `;
}

// ── COMPETITION ───────────────────────────────────────────────────────────
function v2RenderCompetition() {
  const { comp6, comp13 } = v2GetCompetitorData();

  if (!comp6 && !comp13) return `<div class="v2-empty-panel"><div style="font-size:40px;margin-bottom:12px">🔍</div><div style="font-size:16px;font-weight:700;margin-bottom:8px">No competitive data yet</div><div class="v2-prose">Run Agents 6 and 13 for competitive intelligence.</div></div>`;

  return `
    ${comp6 ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">🗺️ Competitive Landscape by City</div>
      ${comp6.summary ? `<div class="v2-prose" style="margin-bottom:16px">${comp6.summary}</div>` : ''}
      ${comp6.cities.length ? `
      <div class="v2-table-wrap">
        <table class="v2-table">
          <thead><tr><th>City</th><th>Competitors</th><th>Avg Rating</th><th>Density</th></tr></thead>
          <tbody>
            ${comp6.cities.map(c=>`<tr>
              <td><strong>${c.city||c.name||'—'}</strong></td>
              <td>${c.competitor_count||c.total_competitors||'—'}</td>
              <td>${c.avg_rating ? '⭐ '+c.avg_rating : '—'}</td>
              <td>${c.density||c.market_density||'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>` : ''}

    ${comp13 ? `
    ${comp13.pain_points.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">😤 Competitor Pain Points (Your Opportunity)</div>
      <div class="v2-sf-grid">
        ${comp13.pain_points.map((p,i)=>`
          <div class="v2-sf-item" style="border-color:rgba(239,68,68,.2)">
            <div class="v2-sf-num" style="background:rgba(239,68,68,.15);color:var(--v2-red)">${i+1}</div>
            <div class="v2-sf-text">${typeof p==='string'?p:(p.pain||p.issue||p.problem||String(p))}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${comp13.differentiators.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">⭐ Your Competitive Differentiators</div>
      <div class="v2-sf-grid">
        ${comp13.differentiators.map((d,i)=>`
          <div class="v2-sf-item" style="border-color:rgba(34,197,94,.2)">
            <div class="v2-sf-num" style="background:rgba(34,197,94,.15);color:var(--v2-green)">${i+1}</div>
            <div class="v2-sf-text">${typeof d==='string'?d:(d.advantage||d.differentiator||String(d))}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}` : ''}
  `;
}

// ── RISKS ─────────────────────────────────────────────────────────────────
function v2RenderRisks() {
  const risks = v2GetRisks();
  if (!risks.length) return `<div class="v2-empty-panel"><div style="font-size:40px;margin-bottom:12px">⚠️</div><div style="font-size:16px;font-weight:700;margin-bottom:8px">No risk analysis yet</div><div class="v2-prose">Run Agent 8 (Executive Summary) to generate risk matrix.</div></div>`;

  return `
    <div class="v2-risk-grid">
      ${risks.map(r=>`
        <div class="v2-risk-item">
          <div class="v2-risk-header">
            <span class="v2-risk-badge ${(r.severity||'medium').toLowerCase()}">${(r.severity||'MEDIUM').toUpperCase()}</span>
            <span class="v2-risk-title">${r.title}</span>
          </div>
          ${r.desc?`<div class="v2-risk-desc"><strong>Mitigation:</strong> ${r.desc}</div>`:''}
        </div>`).join('')}
    </div>`;
}

// ── ACTION PLAN ───────────────────────────────────────────────────────────
function v2RenderActionPlan() {
  const { steps, phases } = v2GetActionPlan();
  const defaultSteps = [
    { title:'Secure Funding',        desc:'Apply for SBA 7(a) loan and present your investor deck. See Investor Pack above.' },
    { title:'Lock In Your Location', desc:'Contact the top-ranked sites from Agent 3. Use the Market tab to compare.' },
    { title:'File for Permits',      desc:'Begin the licensing process immediately — permits are your critical path.' },
    { title:'Build Your Team',       desc:'Start recruiting key hires. Your project plan has the full hiring roadmap.' },
    { title:'Pre-Launch Marketing',  desc:'Build your waitlist 3–4 months before opening. Use competitor pain points.' },
    { title:'Track Progress',        desc:'Save this analysis and re-run in 60 days to check market conditions.' },
  ];
  const displaySteps = steps.length ? steps : defaultSteps;

  return `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">${steps.length?'🤖 AI-Generated Next Steps':'✅ Recommended Next Steps'}</div>
      <div class="v2-insights">
        ${displaySteps.map((s,i)=>`
          <div class="v2-insight">
            <div class="v2-sf-num" style="flex-shrink:0;align-self:flex-start">${i+1}</div>
            <div>
              ${typeof s==='string'
                ? `<div class="v2-insight-body">${s}</div>`
                : `<div class="v2-insight-title">${s.title||s.step||s.action||''}</div>
                   <div class="v2-insight-body">${s.desc||s.description||s.detail||''}</div>`}
            </div>
          </div>`).join('')}
      </div>
    </div>

    ${phases.length ? `
    <div class="v2-exec-section" style="margin-top:24px">
      <div class="v2-exec-section-title">🗓 52-Week Execution Timeline</div>
      <div class="v2-timeline">
        ${phases.map((ph,i)=>`
          <div class="v2-timeline-item">
            <div class="v2-timeline-left">
              <div class="v2-timeline-dot ${i===0?'current':''}"></div>
              ${i<phases.length-1?'<div class="v2-timeline-line"></div>':''}
            </div>
            <div class="v2-timeline-content">
              <div class="v2-timeline-phase">${ph.phase||ph.period||'Phase '+(i+1)}</div>
              <div class="v2-timeline-title">${ph.name||ph.title||ph.milestone||'Milestone'}</div>
              ${_toArr(ph.tasks||ph.items||ph.deliverables||[]).length?
                `<div class="v2-timeline-items">${_toArr(ph.tasks||ph.items||ph.deliverables||[]).slice(0,4).map(t=>
                  `<div class="v2-timeline-task">${typeof t==='string'?t:(t.task||t.name||t.item||'')}</div>`
                ).join('')}</div>`:''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : `
    <div class="v2-exec-section" style="margin-top:24px">
      <div class="v2-exec-section-title">🗓 Standard 52-Week Launch Timeline</div>
      <div class="v2-timeline">
        ${[
          {phase:'Weeks 1–4',   name:'Planning & Finance',     tasks:['Finalize business plan','Apply for SBA 7(a) loan','Engage attorney & accountant','Form LLC / corporate entity']},
          {phase:'Weeks 5–12',  name:'Location & Permits',     tasks:['Sign lease on top-ranked site','Submit permit applications','Begin build-out design','Hire contractor']},
          {phase:'Weeks 13–24', name:'Build-Out & Setup',      tasks:['Complete construction & renovation','Install equipment & technology','Recruit core team','Set up POS, software, insurance']},
          {phase:'Weeks 25–36', name:'Pre-Launch & Marketing', tasks:['Staff training program','Build waitlist & social presence','Grand opening event planning','Soft launch']},
          {phase:'Weeks 37–52', name:'Launch & Optimize',      tasks:['Grand opening','Weekly KPI reviews','Customer acquisition campaigns','Scale toward break-even']},
        ].map((ph,i)=>`
          <div class="v2-timeline-item">
            <div class="v2-timeline-left">
              <div class="v2-timeline-dot ${i===0?'current':''}"></div>
              ${i<4?'<div class="v2-timeline-line"></div>':''}
            </div>
            <div class="v2-timeline-content">
              <div class="v2-timeline-phase">${ph.phase}</div>
              <div class="v2-timeline-title">${ph.name}</div>
              <div class="v2-timeline-items">${ph.tasks.map(t=>`<div class="v2-timeline-task">${t}</div>`).join('')}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`}
  `;
}

// ── GRANTS ────────────────────────────────────────────────────────────────
function v2RenderGrants() {
  const grants = v2GetGrantsDetail();
  const sum = typeof R !== 'undefined' && R.a12?.summary;

  if (!grants.length && !sum) return `<div class="v2-empty-panel"><div style="font-size:40px;margin-bottom:12px">💵</div><div style="font-size:16px;font-weight:700;margin-bottom:8px">No grants data yet</div><div class="v2-prose">Run Agent 12 to search federal, state, and local grant programs.</div></div>`;

  return `
    ${sum ? `<div class="v2-exec-section"><div class="v2-exec-section-title">💵 Grant Overview</div><div class="v2-prose">${sum}</div></div>` : ''}
    ${grants.length ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">📋 Available Grant Programs</div>
      <div class="v2-table-wrap">
        <table class="v2-table">
          <thead><tr><th>Program</th><th>Type</th><th>Estimated Award</th><th>Deadline</th><th>Probability</th><th>Action Required</th></tr></thead>
          <tbody>
            ${grants.map(g=>`<tr>
              <td><strong>${g.name}</strong></td>
              <td><span class="v2-badge blue">${g.type}</span></td>
              <td>${g.amount||'—'}</td>
              <td>${g.deadline||'Rolling'}</td>
              <td>${g.probability ? `<span class="v2-badge ${g.probability.toLowerCase().includes('high')?'green':g.probability.toLowerCase().includes('low')?'red':'amber'}">${g.probability}</span>` : '—'}</td>
              <td><span class="v2-prose" style="font-size:12px">${_truncate(g.eligibility,100)}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
  `;
}

// ── ALL AGENTS ────────────────────────────────────────────────────────────
function v2RenderAgents() {
  return `
    <div class="v2-agents-grid">
      ${V2_AGENTS.map(a => {
        const row     = document.getElementById(`v2-ar-${a.id}`);
        const isDone  = row?.classList.contains('done');
        const isError = row?.classList.contains('error');
        const isRun   = row?.classList.contains('running');
        const st      = isDone ? 'done' : isError ? 'error' : isRun ? 'running' : 'idle';
        const stColor = st==='done' ? 'var(--v2-green)' : st==='error' ? 'var(--v2-red)' : st==='running' ? 'var(--v2-a1)' : 'var(--v2-t3)';
        const stLabel = st==='done' ? '✓ Complete' : st==='error' ? '✗ Error' : st==='running' ? '⟳ Running' : '— Idle';
        const summary = v2GetAgentSummary(a.id);
        const timerEl = document.getElementById(`v2-at-${a.id}`);
        const elapsed = timerEl?.textContent || '';
        const conf = isDone && typeof v2GetAgentConfidence === 'function' ? v2GetAgentConfidence(a.id) : null;
        return `
          <div class="v2-agent-card ${st}" id="v2-agent-section-${a.id}"
               onclick="v2OpenAgentDetail(${a.id})" title="Click to view ${a.name} output">
            <div class="v2-agent-card-head">
              <span class="v2-agent-card-ico">${a.ico}</span>
              <div style="flex:1">
                <div class="v2-agent-card-name">${a.name}</div>
                <div class="v2-agent-card-num">Agent ${a.id}${conf ? ` · <span class="v2-conf-badge ${conf.badge}">${conf.label} ${conf.pct}%</span>` : ''}</div>
              </div>
              <div class="v2-agent-card-status" style="color:${stColor}">
                <span style="display:block;font-size:11px;font-weight:700">${stLabel}</span>
                ${elapsed?`<span style="display:block;font-size:10px;color:var(--v2-t3)">${elapsed}</span>`:''}
              </div>
            </div>
            ${summary?`<div class="v2-agent-card-summary">${summary}</div>`:''}
            ${isDone?`<div class="v2-agent-card-cta" style="display:flex;justify-content:space-between;align-items:center">
              <span>View Output →</span>
              ${typeof v2RefreshAgentData === 'function' ? `<button class="v2-agent-rerun-btn" style="color:var(--v2-a1);border-color:rgba(99,102,241,.3)" onclick="event.stopPropagation();v2RefreshAgentData(${a.id})">🔄 Refresh</button>` : ''}
            </div>`:''}
            ${isError?`<button class="v2-agent-rerun-btn" onclick="event.stopPropagation();v2ReRunAgentFromDash(${a.id})">↺ Re-run</button>`:''}
          </div>`;
      }).join('')}
    </div>
    <div style="margin-top:16px;text-align:center">
      <button class="v2-btn ghost sm" onclick="v2GoTo('traditional')">🔬 Open Traditional View — See All Raw Agent Outputs</button>
    </div>`;
}

// ── AGENT DETAIL ──────────────────────────────────────────────────────────
function v2OpenAgentDetail(id) {
  if (typeof openAgentModal === 'function') {
    openAgentModal(id);
  } else {
    v2GoTo('traditional');
  }
}

// ── SAVE RUN ──────────────────────────────────────────────────────────────
function v2SaveCurrentRun() {
  if (!V2.run) { v2Toast('No analysis to save yet'); return; }
  const ind = V2_INDUSTRIES.find(i=>i.val===V2.run.industry)||{emoji:'🏢',label:'Business'};
  const score = V2.run.score || v2CalcScore();
  const verdict = v2ScoreVerdict(score);
  const entry = {
    id: V2.run.id || Date.now(),
    ts: V2.run.ts || new Date().toISOString(),
    industry: V2.run.industry,
    zip: V2.run.zip,
    budget: V2.run.budget,
    capacity: V2.run.capacity,
    score, verdict: verdict.colorClass, label: verdict.label,
    indLabel: ind.label, indEmoji: ind.emoji,
  };
  const idx = V2.portfolio.findIndex(p => p.id === entry.id);
  if (idx >= 0) V2.portfolio[idx] = entry; else V2.portfolio.unshift(entry);
  if (V2.portfolio.length > 20) V2.portfolio = V2.portfolio.slice(0, 20);
  v2SavePortfolio();
  v2Toast('✓ Saved to portfolio');
}
