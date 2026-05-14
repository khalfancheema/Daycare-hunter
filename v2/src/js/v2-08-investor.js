// ── V2 INVESTOR PACKAGE ───────────────────────────────────────────────────
function v2ShowInvestor() {
  const modal = document.getElementById('v2-investor-modal');
  const content = document.getElementById('v2-investor-content');
  if (!modal || !content) return;

  const run = V2.run;
  const ind = run ? (V2_INDUSTRIES.find(i=>i.val===run.industry)||{emoji:'🏢',label:'Business'}) : {emoji:'🏢',label:'Business'};
  const score = run?.score || v2CalcScore();
  const verdict = v2ScoreVerdict(score);

  // Extract financial data from R
  let startupCost = '—', monthlyRev = '—', breakeven = '—', roi3yr = '—', totalGrants = '—';
  if (typeof R !== 'undefined') {
    if (R.a7) {
      startupCost = R.a7.total_startup_cost ? `$${Math.round(R.a7.total_startup_cost/1000)}K` : '—';
      const sc = _toArr(R.a7.scenarios);
      const base = sc.find(s=>(s.name||'').toLowerCase().includes('base'))||sc[1]||{};
      monthlyRev = base.monthly_revenue ? `$${Math.round(base.monthly_revenue/1000)}K/mo` : '—';
      breakeven  = base.breakeven_months ? `${base.breakeven_months} months` : '—';
      roi3yr     = base.roi_3yr != null ? `${base.roi_3yr > 0 ? '+' : ''}${base.roi_3yr}%` : '—';
    }
    if (R.a12?.total_grant_potential)
      totalGrants = `$${Math.round(R.a12.total_grant_potential/1000)}K available`;
    else if (R.a12?.summary)
      totalGrants = 'See grant report';
  }

  const zip   = run?.zip || document.getElementById('zip')?.value || '—';
  const budg  = run ? `$${parseInt(run.budget||0).toLocaleString()}` : '—';

  content.innerHTML = `
    <div class="v2-modal-header">
      <div class="v2-modal-title">📑 Investor Package — ${ind.emoji} ${ind.label}</div>
      <button class="v2-modal-close" onclick="v2CloseInvestor()">✕</button>
    </div>

    <div class="v2-investor-section">
      <h4>Executive Summary</h4>
      <div class="v2-prose">
        <strong>${ind.emoji} ${ind.label}</strong> opportunity in ZIP ${zip}.
        AI Viability Score: <strong style="color:${verdict.colorClass==='go'?'var(--v2-green)':verdict.colorClass==='caution'?'var(--v2-amber)':'var(--v2-red)'}">${score}/100 — ${verdict.title}</strong>.
        ${verdict.summary}
        ${R?.a8?.summary ? '<br><br>' + _truncate(R.a8.summary, 300) : ''}
      </div>
    </div>

    <div class="v2-investor-section">
      <h4>Investment Highlights</h4>
      <div class="v2-pitch-stat">
        <div class="v2-pitch-stat-item"><div class="v2-pitch-stat-val">${score}/100</div><div class="v2-pitch-stat-lbl">Viability Score</div></div>
        <div class="v2-pitch-stat-item"><div class="v2-pitch-stat-val">${startupCost}</div><div class="v2-pitch-stat-lbl">Startup Investment</div></div>
        <div class="v2-pitch-stat-item"><div class="v2-pitch-stat-val">${monthlyRev}</div><div class="v2-pitch-stat-lbl">Base-Case Revenue</div></div>
        <div class="v2-pitch-stat-item"><div class="v2-pitch-stat-val">${breakeven}</div><div class="v2-pitch-stat-lbl">Break-Even</div></div>
        <div class="v2-pitch-stat-item"><div class="v2-pitch-stat-val">${roi3yr}</div><div class="v2-pitch-stat-lbl">3-Year ROI</div></div>
        <div class="v2-pitch-stat-item"><div class="v2-pitch-stat-val">${totalGrants}</div><div class="v2-pitch-stat-lbl">Grant Funding</div></div>
      </div>
    </div>

    ${R?.a2 ? `
    <div class="v2-investor-section">
      <h4>Market Opportunity</h4>
      <div class="v2-prose">${_truncate(R.a2.summary||'', 400)}</div>
    </div>` : ''}

    ${R?.a9?.market_analysis ? `
    <div class="v2-investor-section">
      <h4>TAM / SAM / SOM</h4>
      <div class="v2-prose">${_truncate(typeof R.a9.market_analysis === 'string' ? R.a9.market_analysis : JSON.stringify(R.a9.market_analysis), 400)}</div>
    </div>` : ''}

    ${(v2GetRisks()).length ? `
    <div class="v2-investor-section">
      <h4>Key Risks & Mitigants</h4>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${v2GetRisks().slice(0,4).map(r=>`
          <div style="background:var(--v2-s3);border-radius:10px;padding:12px;display:flex;gap:10px;align-items:flex-start">
            <span class="v2-risk-badge ${r.severity}">${r.severity.toUpperCase()}</span>
            <div><div style="font-size:13px;font-weight:600;margin-bottom:3px">${r.title}</div><div style="font-size:12px;color:var(--v2-t2)">${r.desc||''}</div></div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <div class="v2-investor-section">
      <h4>Funding Roadmap</h4>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${_toArr(R?.a7?.funding||[]).slice(0,5).map(f=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--v2-s3);border-radius:8px">
            <div><div style="font-size:13px;font-weight:600">${f.source||'—'}</div><div style="font-size:11px;color:var(--v2-t2)">${f.terms||''} ${f.notes?'· '+f.notes:''}</div></div>
            <strong style="font-size:14px">$${((f.amount||0)/1000).toFixed(0)}K</strong>
          </div>`).join('') || '<div style="color:var(--v2-t3);font-size:13px">Run the full pipeline to see funding breakdown</div>'}
      </div>
    </div>

    <div class="v2-investor-actions">
      <button class="v2-btn ghost sm" onclick="v2CloseInvestor()">Close</button>
      <button class="v2-btn ghost sm" onclick="v2ShowDetail()">📊 Full Analysis</button>
      <button class="v2-btn primary sm" onclick="v2PrintInvestor()">🖨 Print / PDF</button>
    </div>
  `;

  modal.classList.add('open');
}

function v2CloseInvestor() {
  const m = document.getElementById('v2-investor-modal');
  if (m) m.classList.remove('open');
}

function v2PrintInvestor() {
  let content = document.getElementById('v2-investor-content')?.innerHTML || '';
  // Strip <script>/inline handlers — AI content may contain user-shaped HTML
  content = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  const w = window.open('', '_blank');
  if (!w) { if (typeof v2Toast === 'function') v2Toast('Pop-up blocked — allow pop-ups to print investor package.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Investor Package</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#fff;color:#1e293b;padding:40px;max-width:800px;margin:0 auto}
    h4{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6366f1;margin:24px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
    .v2-prose{font-size:14px;line-height:1.7;color:#475569}
    .v2-pitch-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .v2-pitch-stat-item{background:#f8fafc;border-radius:8px;padding:14px}
    .v2-pitch-stat-val{font-size:20px;font-weight:800;color:#1e293b}
    .v2-pitch-stat-lbl{font-size:11px;color:#94a3b8;margin-top:3px}
    .v2-modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
    .v2-modal-title{font-size:22px;font-weight:800;color:#1e293b}
    .v2-modal-close,.v2-investor-actions,.v2-risk-badge{display:none}
    @media print{button{display:none!important}}
  </style></head><body>${content}<script>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  w.document.close();
}
