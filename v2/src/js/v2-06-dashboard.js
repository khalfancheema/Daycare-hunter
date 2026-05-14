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

  // Build verdict signal chips from available data
  const a1 = R.a1 || {}, a6 = R.a6 || {}, a7 = R.a7 || {}, a2 = R.a2 || {};
  const signals = [];
  if (a1.median_income > 100000) signals.push({cls:'green', txt:`💰 $${Math.round(a1.median_income/1000)}K median income`});
  if (a2.gap_score >= 7) signals.push({cls:'green', txt:`📈 Gap score ${a2.gap_score}/10`});
  else if (a2.gap_score >= 4) signals.push({cls:'amber', txt:`📊 Gap score ${a2.gap_score}/10`});
  if (a1.dual_income_pct >= 65) signals.push({cls:'green', txt:`👔 ${a1.dual_income_pct}% dual income`});
  if (a6.total_licensed_estimated) signals.push({cls:'blue', txt:`🏫 ${a6.total_licensed_estimated} licensed competitors`});
  if (a7.break_even_month) {
    const beClass = a7.break_even_month <= 18 ? 'green' : a7.break_even_month <= 30 ? 'amber' : 'red';
    signals.push({cls: beClass, txt: `⏱ Break-even mo. ${a7.break_even_month}`});
  }
  if (a1.population_under_6) signals.push({cls:'blue', txt:`👶 ${(a1.population_under_6/1000).toFixed(1)}K children <6`});
  const sigHtml = signals.length ? `<div class="v2-verdict-signals">${signals.map(s=>`<span class="v2-vsig ${s.cls}">${s.txt}</span>`).join('')}</div>` : '';

  // Confidence bar
  const confidence = Math.min(95, 50 + score * 0.45);
  const confColor = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';

  const ring = `
    <svg width="130" height="130" viewBox="0 0 130 130" style="display:block">
      <circle class="v2-score-ring-bg" cx="65" cy="65" r="54"/>
      <circle class="v2-score-ring-fill" cx="65" cy="65" r="54"
        stroke="${ringColor}" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
        style="--ring-target:${offset.toFixed(1)};transform:rotate(-90deg);transform-origin:center"/>
    </svg>
    <div class="v2-score-num">
      <span class="big v2-score-counter" data-target="${score}" style="color:${ringColor}">0</span>
      <span class="small">/100</span>
    </div>`;

  wrap.innerHTML = `
    <div class="v2-dash-header">
      <div style="min-width:0;flex:1">
        <div class="v2-dash-title">${ind.emoji} ${ind.label} Analysis</div>
        <div class="v2-dash-meta" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px">
          <span>📍 ZIP ${run.zip}</span>
          <span style="color:var(--v2-border2)">·</span>
          <span>📐 ${run.radius} mi</span>
          <span style="color:var(--v2-border2)">·</span>
          <span>💵 $${parseInt(run.budget||0).toLocaleString()}</span>
          <span style="color:var(--v2-border2)">·</span>
          <span>🗓 ${new Date(run.ts||Date.now()).toLocaleDateString()}</span>
          <span class="v2-badge" style="background:var(--v2-s4);font-size:10px;padding:2px 8px">17 agents</span>
        </div>
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
      <div class="v2-verdict-icon" style="font-size:32px;flex-shrink:0">${verdict.icon}</div>
      <div class="v2-verdict-text">
        <h3 style="margin:0 0 4px;font-size:18px;font-weight:800">${verdict.title}${verdict.colorClass==='go'?' <span class="v2-go-sparkle">✨</span>':''}</h3>
        <p style="margin:0;color:var(--v2-t2);font-size:13px;line-height:1.5">${verdict.summary}</p>
        ${sigHtml}
        <div class="v2-verdict-confidence">
          <span>Confidence</span>
          <div class="v2-verdict-confidence-bar">
            <div class="v2-verdict-confidence-fill" style="width:${confidence}%;--bar-w:${confidence}%;background:${confColor}"></div>
          </div>
          <span style="color:var(--v2-t1);font-weight:800">${confidence.toFixed(0)}%</span>
        </div>
      </div>
      <div class="v2-verdict-cta" style="flex-shrink:0">
        <span class="v2-badge ${verdict.colorClass==='go'?'green':verdict.colorClass==='caution'?'amber':'red'}" style="font-size:14px;padding:8px 18px;font-weight:900">${verdict.label}</span>
      </div>
    </div>

    <div class="v2-metrics-row">
      <div class="v2-card glow v2-score-card">
        <div class="v2-score-ring-wrap">${ring}</div>
        <div class="v2-score-verdict" style="color:${ringColor};font-size:20px">${verdict.title}</div>
        <div class="v2-score-reason" style="font-size:11px;margin-top:4px">Gap · Financials · Verdict<br>Competition · Compliance</div>
        ${v2RenderScoreBreakdown()}
      </div>
      <div class="v2-card" style="padding:20px;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div class="v2-label">Key Metrics</div>
          <div style="font-size:11px;color:var(--v2-t3)">17 agents · live data</div>
        </div>
        <div class="v2-kpi-grid">
          ${kpis.map((k,i)=>{
            const trend = k.trend || '';
            const trendHtml = trend ? `<div class="v2-kpi-trend ${k.trendDir||'flat'}">${trend}</div>` : '';
            const ctx = k.context ? `<div class="v2-kpi-context">${k.context}</div>` : '';
            return `<div class="v2-kpi" style="animation-delay:${(i+1)*0.07}s">
              <div class="v2-kpi-ico">${k.ico}</div>
              <div class="v2-kpi-val">${k.val}</div>
              <div class="v2-kpi-lbl">${k.lbl}</div>
              ${trendHtml}${ctx}
            </div>`;
          }).join('')}
          ${!kpis.length?'<div style="color:var(--v2-t3);font-size:13px;padding:12px">Run pipeline to see metrics</div>':''}
        </div>
      </div>
    </div>

    ${v2RenderScoreBreakdown(score)}

    <div class="v2-dash-tabs-wrap">
      <div class="v2-dash-tabs" id="v2-dash-tabs">
        <div class="v2-dash-tab active" onclick="v2DashTab('executive',this)">📋 Executive</div>
        <div class="v2-dash-tab" onclick="v2DashTab('community',this)">👥 Community</div>
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
    <div class="v2-dash-panel" id="v2-panel-community">${v2RenderCommunityProfile()}</div>
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

  // ── Post-render animations ───────────────────────────────────────────────
  requestAnimationFrame(() => {
    // 1. Score counter count-up
    const counter = wrap.querySelector('.v2-score-counter');
    if (counter) {
      const target = parseInt(counter.dataset.target || 0);
      const dur = 900, start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
        counter.textContent = Math.round(target * ease);
        if (t < 1) requestAnimationFrame(tick);
        else counter.textContent = target;
      };
      requestAnimationFrame(tick);
    }
    // 2. Animate score breakdown bars
    setTimeout(() => {
      wrap.querySelectorAll('.v2-sb-bar-fill, .v2-stat-bar-fill').forEach(el => {
        const w = el.style.width;
        el.style.width = '0';
        requestAnimationFrame(() => {
          el.style.transition = 'width 0.8s cubic-bezier(.4,0,.2,1)';
          el.style.width = w;
        });
      });
    }, 450);
    // 3. Pre-init community charts (lazy — only if panel is visible later)
    setTimeout(() => v2InitCommunityCharts(), 600);
  });
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
  if (id === 'community') requestAnimationFrame(() => v2InitCommunityCharts());
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

// ── COMMUNITY PROFILE ─────────────────────────────────────────────────────
function v2RenderCommunityProfile() {
  const a1 = (typeof R !== 'undefined' && R.a1) ? R.a1 : {};
  const hasData = a1.age_pyramid || a1.multi_radius || a1.generation_breakdown ||
                  a1.consumer_expenditure || a1.lifestyle_segments || a1.population_projections;

  if (!hasData) return `
    <div class="v2-empty-panel">
      <div style="font-size:40px;margin-bottom:12px">👥</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px">No community data yet</div>
      <div class="v2-prose">Run Agent 1 (Demographics) to generate the full community profile with age pyramid, lifestyle segments, consumer expenditure, and more.</div>
    </div>`;

  // ── helpers ──────────────────────────────────────────────────────────────
  const fmtN = v => (v == null ? '—' : Number(v).toLocaleString());
  const fmtD = v => (v == null ? '—' : '$' + Number(v).toLocaleString());
  const fmtK = v => (v == null ? '—' : '$' + (Number(v)/1000).toFixed(0) + 'K');
  const pct  = v => (v == null ? '—' : v + '%');

  // ── Palette ───────────────────────────────────────────────────────────────
  const MALE_CLR   = 'rgba(74,158,255,0.85)';
  const FEMALE_CLR = 'rgba(239,68,157,0.75)';
  const SEG_COLORS = ['var(--v2-a1)','var(--v2-green)','var(--v2-amber)','#a78bfa','#06b6d4','#f97316'];

  // ── 1. Multi-radius comparison table ─────────────────────────────────────
  const radiiHtml = (a1.multi_radius && a1.multi_radius.length) ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">📏 Multi-Radius Market Summary</div>
      <div class="v2-table-wrap">
        <table class="v2-table">
          <thead><tr>
            <th>Ring</th><th>Population</th><th>Households</th><th>Median HHI</th>
            <th>HH w/ Children</th><th>Children &lt;5</th><th>Avg HH Size</th>
          </tr></thead>
          <tbody>
            ${a1.multi_radius.map(r => `<tr>
              <td><strong>${r.ring}</strong></td>
              <td>${fmtN(r.population)}</td>
              <td>${fmtN(r.households)}</td>
              <td style="color:var(--v2-green);font-weight:700">${fmtD(r.median_hh_income)}</td>
              <td>${r.pct_with_children != null ? r.pct_with_children + '%' : '—'}</td>
              <td>${fmtN(r.pop_under5)}</td>
              <td>${r.avg_hh_size || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : '';

  // ── 2. Age Pyramid + Generation Breakdown ─────────────────────────────────
  const agePyramidHtml = a1.age_pyramid ? `
    <div class="v2-card" style="padding:20px">
      <div class="v2-label" style="margin-bottom:12px">🔺 Population Age Pyramid</div>
      <div style="position:relative;height:320px">
        <canvas id="v2-cp-age-chart"></canvas>
      </div>
      <div style="display:flex;gap:16px;justify-content:center;margin-top:10px;font-size:11px">
        <span><span style="display:inline-block;width:12px;height:12px;background:${MALE_CLR};border-radius:2px;margin-right:4px"></span>Male</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:${FEMALE_CLR};border-radius:2px;margin-right:4px"></span>Female</span>
      </div>
    </div>` : '';

  const genHtml = (a1.generation_breakdown && a1.generation_breakdown.length) ? `
    <div class="v2-card" style="padding:20px">
      <div class="v2-label" style="margin-bottom:14px">🌊 Generation Breakdown</div>
      ${a1.generation_breakdown.map((g, i) => {
        const col = SEG_COLORS[i % SEG_COLORS.length];
        return `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:12px;font-weight:600;color:var(--v2-t1)">${g.gen}</span>
            <span style="font-size:11px;color:var(--v2-t3)">${g.population_pct}% pop · ${g.households_pct}% HH</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <div style="background:var(--v2-s1);border-radius:3px;height:6px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100,(g.population_pct/30)*100)}%;background:${col};transition:width .8s ease"></div>
            </div>
            <div style="background:var(--v2-s1);border-radius:3px;height:6px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100,(g.households_pct/35)*100)}%;background:${col};opacity:.65;transition:width .8s ease"></div>
            </div>
          </div>
        </div>`;
      }).join('')}
      <div style="display:flex;gap:16px;margin-top:6px;font-size:10px;color:var(--v2-t3)">
        <span>■ Population %</span><span style="opacity:.65">■ Household %</span>
      </div>
    </div>` : '';

  // ── 3. Education Attainment + Housing ─────────────────────────────────────
  const ed = a1.education_attainment || {};
  const eduLevels = [
    {label:'Graduate / Professional', pct: ed.graduate_pct,      color:'var(--v2-a1)'},
    {label:"Bachelor's Degree",       pct: ed.bachelors_pct,     color:'var(--v2-green)'},
    {label:'Some College / Assoc.',   pct: (ed.some_college_pct||0)+(ed.associates_pct||0), color:'var(--v2-amber)'},
    {label:'HS Diploma',              pct: ed.hs_grad_pct,       color:'rgba(245,158,11,.5)'},
    {label:'Less than HS',            pct: ed.less_than_hs_pct,  color:'var(--v2-red)'},
  ].filter(l => l.pct != null && l.pct > 0);

  const eduHtml = eduLevels.length ? `
    <div class="v2-card" style="padding:20px">
      <div class="v2-label" style="margin-bottom:14px">🎓 Education Attainment${ed.radius_miles ? ` (${ed.radius_miles} mi radius)` : ''}</div>
      ${eduLevels.map(l => `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:12px;color:var(--v2-t2)">${l.label}</span>
            <span style="font-size:12px;font-weight:700;color:var(--v2-t1)">${l.pct?.toFixed(1)}%</span>
          </div>
          <div style="background:var(--v2-s1);border-radius:4px;height:8px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100,l.pct||0)}%;background:${l.color};border-radius:4px;transition:width .8s ease"></div>
          </div>
        </div>`).join('')}
      <div style="margin-top:8px;font-size:11px;color:var(--v2-green);font-weight:600">
        ✓ ${((ed.bachelors_pct||0)+(ed.graduate_pct||0)).toFixed(1)}% hold a bachelor's degree or higher
      </div>
    </div>` : '';

  const hd = a1.housing_detail || {};
  const housingHtml = Object.keys(hd).length ? `
    <div class="v2-card" style="padding:20px">
      <div class="v2-label" style="margin-bottom:14px">🏠 Housing Profile</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        ${[
          {ico:'💰', lbl:'Median Home Value', val: fmtD(hd.median_home_value)},
          {ico:'📊', lbl:'Avg Home Value',    val: fmtD(hd.avg_home_value)},
          {ico:'🔑', lbl:'Owner Occupied',    val: pct(hd.owner_occupied_pct)},
          {ico:'🏢', lbl:'Renter Occupied',   val: pct(hd.renter_occupied_pct)},
          {ico:'💵', lbl:'Median Gross Rent', val: fmtD(hd.median_gross_rent)},
          {ico:'🏗', lbl:'Built 2010+',       val: pct(hd.built_2010_later_pct)},
        ].map(k => `
          <div style="background:var(--v2-s1);border-radius:8px;padding:10px">
            <div style="font-size:16px;margin-bottom:2px">${k.ico}</div>
            <div style="font-size:14px;font-weight:700;color:var(--v2-t1)">${k.val}</div>
            <div style="font-size:11px;color:var(--v2-t3)">${k.lbl}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;border-radius:6px;overflow:hidden;height:10px;gap:2px">
        <div style="flex:${hd.owner_occupied_pct||60};background:var(--v2-a1)"></div>
        <div style="flex:${hd.renter_occupied_pct||40};background:var(--v2-amber)"></div>
      </div>
      <div style="display:flex;gap:16px;margin-top:6px;font-size:10px;color:var(--v2-t3)">
        <span>■ Owner ${pct(hd.owner_occupied_pct)}</span>
        <span style="color:var(--v2-amber)">■ Renter ${pct(hd.renter_occupied_pct)}</span>
      </div>
    </div>` : '';

  // ── 4. Consumer Expenditure ────────────────────────────────────────────────
  const ce = a1.consumer_expenditure;
  const expHtml = (ce && ce.categories && ce.categories.length) ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">💳 Consumer Expenditure by Category${ce.radius_miles ? ` — ${ce.radius_miles} mi radius` : ''}</div>
      ${ce.total_expenditure_millions ? `<div style="font-size:13px;color:var(--v2-t2);margin-bottom:12px">Total market expenditure: <strong style="color:var(--v2-t1);font-size:16px">$${Number(ce.total_expenditure_millions).toLocaleString()}M</strong></div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
        <div>
          ${ce.categories.map((c, i) => `
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:12px;color:var(--v2-t2)">${c.category}</span>
                <span style="font-size:12px;font-weight:700;color:var(--v2-t1)">$${Number(c.amount_millions).toLocaleString()}M <span style="font-weight:400;color:var(--v2-t3)">${c.pct_of_total}%</span></span>
              </div>
              <div style="background:var(--v2-s1);border-radius:4px;height:7px;overflow:hidden">
                <div style="height:100%;width:${Math.min(100,c.pct_of_total/35*100)}%;background:${SEG_COLORS[i%SEG_COLORS.length]};border-radius:4px;transition:width .8s ease"></div>
              </div>
            </div>`).join('')}
        </div>
        <div style="position:relative;height:220px">
          <canvas id="v2-cp-exp-chart"></canvas>
        </div>
      </div>
    </div>` : '';

  // ── 5. Lifestyle Segments ─────────────────────────────────────────────────
  const segHtml = (a1.lifestyle_segments && a1.lifestyle_segments.length) ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">🌆 Lifestyle & Tapestry Segments</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        ${a1.lifestyle_segments.map((s, i) => `
          <div class="v2-card" style="padding:14px;border-top:3px solid ${SEG_COLORS[i%SEG_COLORS.length]}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
              <div style="font-size:13px;font-weight:700;color:var(--v2-t1);line-height:1.3">${s.segment}</div>
              <span class="v2-badge" style="background:${SEG_COLORS[i%SEG_COLORS.length]}22;color:${SEG_COLORS[i%SEG_COLORS.length]};flex-shrink:0;margin-left:6px">${s.pct}%</span>
            </div>
            <div style="font-size:11px;color:var(--v2-t3);line-height:1.4">${s.description || ''}</div>
          </div>`).join('')}
      </div>
    </div>` : '';

  // ── 6. Population Projections ─────────────────────────────────────────────
  const projHtml = (a1.population_projections && a1.population_projections.length >= 3) ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">📈 Population Growth Trend & Projections</div>
      <div style="position:relative;height:200px">
        <canvas id="v2-cp-proj-chart"></canvas>
      </div>
    </div>` : '';

  // ── 7. Occupation / Location Quotients ────────────────────────────────────
  const lqHtml = (a1.occupation_lq && a1.occupation_lq.length) ? `
    <div class="v2-exec-section">
      <div class="v2-exec-section-title">💼 Workforce by Occupation & Location Quotient vs US</div>
      <div class="v2-table-wrap">
        <table class="v2-table">
          <thead><tr>
            <th>Occupation</th><th>Area %</th><th>US Avg %</th>
            <th>Location Quotient</th><th>Relative to US</th>
          </tr></thead>
          <tbody>
            ${a1.occupation_lq.map(o => {
              const lq = o.lq || (o.area_pct / (o.us_pct || 1));
              const lqColor = lq >= 1.5 ? 'var(--v2-green)' : lq >= 0.75 ? 'var(--v2-amber)' : 'var(--v2-red)';
              const lqLabel = lq >= 2 ? '⬆ Very High' : lq >= 1.25 ? '↑ Above avg' : lq >= 0.75 ? '→ Average' : '↓ Below avg';
              return `<tr>
                <td><strong>${o.occupation}</strong></td>
                <td>${o.area_pct}%</td>
                <td style="color:var(--v2-t3)">${o.us_pct}%</td>
                <td><span style="font-weight:800;color:${lqColor}">${lq.toFixed(2)}x</span></td>
                <td style="font-size:12px;color:${lqColor}">${lqLabel}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--v2-t3)">LQ &gt; 1.0 = occupation is more concentrated here than US average. LQ &gt; 2.0 = major local specialty.</div>
    </div>` : '';

  // ── 8. Language Spoken + Daytime Population ────────────────────────────────
  const langHtml = (a1.language_spoken && a1.language_spoken.length) ? `
    <div class="v2-card" style="padding:20px">
      <div class="v2-label" style="margin-bottom:14px">🌍 Languages Spoken at Home</div>
      ${a1.language_spoken.map((l, i) => `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:12px;color:var(--v2-t2)">${l.language}</span>
            <span style="font-size:12px;font-weight:700;color:var(--v2-t1)">${l.pct}%</span>
          </div>
          <div style="background:var(--v2-s1);border-radius:4px;height:7px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100,l.pct)}%;background:${SEG_COLORS[i%SEG_COLORS.length]};border-radius:4px;transition:width .8s ease"></div>
          </div>
        </div>`).join('')}
    </div>` : '';

  const dp = a1.daytime_population || {};
  const dayHtml = Object.keys(dp).length ? `
    <div class="v2-card" style="padding:20px">
      <div class="v2-label" style="margin-bottom:14px">☀️ Daytime vs. Residential Population</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[
          {ico:'🏠', lbl:'Residential', val: fmtN(dp.residential_pop), color:'var(--v2-a1)'},
          {ico:'☀️', lbl:'Daytime',     val: fmtN(dp.daytime_pop),     color:'var(--v2-green)'},
          {ico:'💼', lbl:'Workers In',  val: fmtN(dp.workers_present), color:'var(--v2-amber)'},
          {ico:'🏡', lbl:'Work @ Home', val: fmtN(dp.workers_at_home), color:'rgba(167,139,250,.9)'},
        ].map(k => `
          <div style="text-align:center;padding:12px;background:var(--v2-s1);border-radius:8px;border-top:2px solid ${k.color}">
            <div style="font-size:20px;margin-bottom:2px">${k.ico}</div>
            <div style="font-size:18px;font-weight:800;color:${k.color}">${k.val}</div>
            <div style="font-size:11px;color:var(--v2-t3)">${k.lbl}</div>
          </div>`).join('')}
      </div>
      ${dp.daytime_to_residential_ratio ? `<div style="margin-top:12px;padding:8px 12px;background:var(--v2-s1);border-radius:6px;font-size:12px">
        Daytime/Residential ratio: <strong style="color:${dp.daytime_to_residential_ratio >= 1 ? 'var(--v2-green)' : 'var(--v2-amber)'}">
        ${dp.daytime_to_residential_ratio}x</strong>
        ${dp.daytime_to_residential_ratio >= 1 ? ' — positive commuter flow into area' : ' — more residents than daytime workers'}
      </div>` : ''}
    </div>` : '';

  return `
    ${radiiHtml}
    <div class="v2-exec-section">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        ${agePyramidHtml}
        ${genHtml}
      </div>
    </div>
    <div class="v2-exec-section">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        ${eduHtml}
        ${housingHtml}
      </div>
    </div>
    ${expHtml}
    ${segHtml}
    ${projHtml}
    ${lqHtml}
    <div class="v2-exec-section">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        ${langHtml}
        ${dayHtml}
      </div>
    </div>
  `;
}

function v2InitCommunityCharts() {
  const a1 = (typeof R !== 'undefined' && R.a1) ? R.a1 : {};
  if (!a1) return;

  // ── Age Pyramid ────────────────────────────────────────────────────────────
  const ageCtx = document.getElementById('v2-cp-age-chart');
  if (ageCtx && a1.age_pyramid) {
    killChart('v2-cp-age-chart');
    const brackets = a1.age_pyramid.map(b => b.bracket);
    const males    = a1.age_pyramid.map(b => -(b.male || 0));   // negative → left side
    const females  = a1.age_pyramid.map(b =>  (b.female || 0)); // positive → right side
    const maxVal   = Math.max(...a1.age_pyramid.flatMap(b => [b.male||0, b.female||0]));
    charts['v2-cp-age-chart'] = new Chart(ageCtx, {
      type: 'bar',
      data: {
        labels: brackets,
        datasets: [
          {label:'Male',   data: males,   backgroundColor:'rgba(74,158,255,0.85)', borderWidth:0, borderRadius:2},
          {label:'Female', data: females, backgroundColor:'rgba(239,68,157,0.75)', borderWidth:0, borderRadius:2},
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + Math.abs(ctx.raw).toLocaleString() } }
        },
        scales: {
          x: {
            stacked: false,
            ticks: { color:'#8a8d96', callback: v => Math.abs(v).toLocaleString() },
            grid:  { color:'#2a2d35' },
            min: -maxVal * 1.1,
            max:  maxVal * 1.1,
          },
          y: { ticks: { color:'#8a8d96', font:{size:9} }, grid: { color:'#2a2d35' } }
        }
      }
    });
  }

  // ── Consumer Expenditure Doughnut ──────────────────────────────────────────
  const expCtx = document.getElementById('v2-cp-exp-chart');
  if (expCtx && a1.consumer_expenditure && a1.consumer_expenditure.categories) {
    killChart('v2-cp-exp-chart');
    const cats   = a1.consumer_expenditure.categories;
    const COLORS = ['rgba(74,158,255,0.85)','rgba(61,214,140,0.85)','rgba(245,158,11,0.85)',
                    'rgba(167,139,250,0.85)','rgba(6,182,212,0.85)','rgba(249,115,22,0.85)',
                    'rgba(239,68,68,0.85)', 'rgba(234,179,8,0.85)', 'rgba(20,184,166,0.85)'];
    charts['v2-cp-exp-chart'] = new Chart(expCtx, {
      type: 'doughnut',
      data: {
        labels: cats.map(c => c.category),
        datasets: [{
          data: cats.map(c => c.amount_millions),
          backgroundColor: COLORS,
          borderWidth: 1,
          borderColor: '#1a1d24',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' $' + ctx.raw + 'M (' + cats[ctx.dataIndex]?.pct_of_total + '%)' } }
        }
      }
    });
  }

  // ── Population Projections Line ────────────────────────────────────────────
  const projCtx = document.getElementById('v2-cp-proj-chart');
  if (projCtx && a1.population_projections) {
    killChart('v2-cp-proj-chart');
    const actual    = a1.population_projections.filter(p => p.year <= 2024);
    const projected = a1.population_projections.filter(p => p.year >  2024);
    charts['v2-cp-proj-chart'] = new Chart(projCtx, {
      type: 'line',
      data: {
        labels: a1.population_projections.map(p => p.year),
        datasets: [
          {
            label: 'Actual',
            data: a1.population_projections.map(p => p.year <= 2024 ? p.population : null),
            borderColor: 'rgba(74,158,255,1)',
            backgroundColor: 'rgba(74,158,255,0.15)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(74,158,255,1)',
            borderWidth: 2,
          },
          {
            label: 'Projected',
            data: a1.population_projections.map((p, i, arr) => {
              if (p.year >= 2024) return p.population;
              if (p.year === arr.filter(x => x.year <= 2024).slice(-1)[0]?.year) return p.population;
              return null;
            }),
            borderColor: 'rgba(61,214,140,1)',
            backgroundColor: 'rgba(61,214,140,0.08)',
            fill: true,
            borderDash: [5,4],
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: 'rgba(61,214,140,1)',
            borderWidth: 2,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color:'#8a8d96', font:{size:11} } },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.raw?.toLocaleString() + ' people' } }
        },
        scales: {
          x: { ticks: { color:'#8a8d96' }, grid: { color:'#2a2d35' } },
          y: { ticks: { color:'#8a8d96', callback: v => (v/1000).toFixed(0)+'K' }, grid: { color:'#2a2d35' } }
        }
      }
    });
  }
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
