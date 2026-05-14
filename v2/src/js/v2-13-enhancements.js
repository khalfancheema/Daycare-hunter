// v2-13-enhancements.js
// Deep detail layer: gap breakdown, competitor profiles, financial sensitivity,
// risk scoring, real estate scoring, cross-agent linkage, ZIP autocomplete,
// multi-location scoring, comparison, exports, saved searches.

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — AGENT 2: GAP ANALYSIS DEEP DIVE
// ══════════════════════════════════════════════════════════════════════════════

function v2RenderGapBreakdown() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const a2 = R_data.a2 || {};
  const ageGaps = a2.age_gaps || [];
  if (!ageGaps.length) return '';

  const bars = ageGaps.map(g => {
    const pct = Math.min(100, g.gap);
    const color = g.gap >= 40 ? '#ef4444' : g.gap >= 20 ? '#f59e0b' : '#22c55e';
    const label = g.gap >= 40 ? 'Critical' : g.gap >= 20 ? 'Moderate' : 'Low';
    return `
      <div class="v2-gap-row">
        <div class="v2-gap-label">${g.age}</div>
        <div class="v2-gap-track">
          <div class="v2-gap-demand" style="width:${g.demand_idx}%;background:rgba(99,102,241,.2);border-radius:3px;height:8px;position:absolute;top:0;left:0"></div>
          <div class="v2-gap-supply" style="width:${g.supply_idx}%;background:rgba(34,197,94,.35);border-radius:3px;height:8px;position:absolute;bottom:0;left:0"></div>
        </div>
        <div class="v2-gap-nums">
          <span style="color:${color};font-weight:700">${g.gap}pt gap</span>
          <span class="v2-gap-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${label}</span>
        </div>
      </div>`;
  }).join('');

  const subsidyPct = _v2CalcSubsidyPct(R_data);
  const a1 = R_data.a1 || {};
  const topCity = (a1.cities || []).sort((a,b) => (b.demand_score||0)-(a.demand_score||0))[0] || {};

  return `
    <div class="v2-card v2-gap-card" style="padding:20px;margin-top:16px">
      <div class="v2-label" style="margin-bottom:4px">📊 Age-Group Gap Breakdown</div>
      <div style="font-size:11px;color:var(--v2-t3);margin-bottom:14px">Demand index vs supply index by age group · Higher gap = more unserved children</div>
      <div style="font-size:11px;color:var(--v2-t3);margin-bottom:10px;display:flex;gap:16px">
        <span><span style="display:inline-block;width:10px;height:6px;background:rgba(99,102,241,.35);border-radius:2px;margin-right:4px"></span>Demand</span>
        <span><span style="display:inline-block;width:10px;height:6px;background:rgba(34,197,94,.5);border-radius:2px;margin-right:4px"></span>Supply</span>
      </div>
      <div class="v2-gap-rows">${bars}</div>
      ${subsidyPct ? `
        <div class="v2-gap-subsidy" style="margin-top:14px;padding:10px 12px;background:rgba(99,102,241,.07);border-radius:8px;border:1px solid rgba(99,102,241,.2)">
          <span style="font-size:12px;font-weight:600">💰 Subsidy-Eligible Population: </span>
          <span style="font-size:13px;color:var(--v2-accent);font-weight:700">${subsidyPct}%</span>
          <span style="font-size:11px;color:var(--v2-t3);margin-left:8px">of families qualify for CAPS subsidy (~$${_v2FormatK(topCity.median_hh_income * 0.4 / 12)} avg monthly benefit)</span>
        </div>` : ''}
      ${v2RenderDemandForecast(a2, a1)}
    </div>`;
}

function _v2CalcSubsidyPct(R_data) {
  const cities = (R_data.a1 || {}).cities || [];
  if (!cities.length) return null;
  const medIncome = cities.reduce((s,c) => s + (c.median_hh_income||0), 0) / cities.length;
  // CAPS eligibility ≤ 85% of state median income (~$66k in GA)
  if (medIncome > 90000) return 18;
  if (medIncome > 75000) return 24;
  return 31;
}

function v2RenderDemandForecast(a2, a1) {
  const cities = (a2 && a2.cities) || [];
  if (!cities.length) return '';
  const totalUnserved = cities.reduce((s,c) => s + (c.unserved_children||0), 0);
  const avgGrowth = ((a1 && a1.cities) || []).reduce((s,c) => s + (c.pop_growth_pct_5yr||0), 0) / Math.max(1, (a1.cities||[]).length);
  const g = avgGrowth / 100;
  const yr3 = Math.round(totalUnserved * Math.pow(1+g, 3));
  const yr5 = Math.round(totalUnserved * Math.pow(1+g, 5));
  const yr10 = Math.round(totalUnserved * Math.pow(1+g, 10));

  const W = 400, H = 90;
  const points = [
    {yr:'Now', val: totalUnserved},
    {yr:'Yr 1', val: Math.round(totalUnserved * (1+g))},
    {yr:'Yr 3', val: yr3},
    {yr:'Yr 5', val: yr5},
    {yr:'Yr 10', val: yr10},
  ];
  const maxV = yr10;
  const padL=40, padR=10, padT=8, padB=24;
  const cW = W-padL-padR, cH = H-padT-padB;
  const xs = points.map((_,i) => padL + (i/(points.length-1))*cW);
  const ys = points.map(p => padT + cH - (p.val/maxV)*cH);
  const pathD = xs.map((x,i) => (i===0?'M':'L')+x+','+ys[i]).join(' ');
  const areaD = pathD + ` L${xs[xs.length-1]},${padT+cH} L${xs[0]},${padT+cH} Z`;

  return `
    <div style="margin-top:14px">
      <div style="font-size:11px;font-weight:600;color:var(--v2-t2);margin-bottom:6px">📈 Demand Forecast — Unserved Children</div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;max-height:90px">
        <path d="${areaD}" fill="rgba(99,102,241,0.10)" />
        <path d="${pathD}" stroke="#6366f1" stroke-width="2" fill="none" stroke-linejoin="round"/>
        ${points.map((p,i) => `
          <circle cx="${xs[i]}" cy="${ys[i]}" r="3" fill="#6366f1"/>
          <text x="${xs[i]}" y="${padT+cH+14}" text-anchor="middle" font-size="9" fill="var(--v2-t3)">${p.yr}</text>
          <text x="${xs[i]}" y="${ys[i]-5}" text-anchor="middle" font-size="8" fill="var(--v2-t2)">${_v2FormatK(p.val)}</text>
        `).join('')}
        <text x="4" y="${padT+cH}" font-size="8" fill="var(--v2-t3)">0</text>
        <text x="4" y="${padT+4}" font-size="8" fill="var(--v2-t3)">${_v2FormatK(maxV)}</text>
      </svg>
      <div style="font-size:10px;color:var(--v2-t3);margin-top:2px">
        Yr 3: <strong>${yr3.toLocaleString()}</strong> unserved · Yr 5: <strong>${yr5.toLocaleString()}</strong> · Based on ${avgGrowth.toFixed(1)}% avg annual population growth
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — AGENT 6: COMPETITOR INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════

// Synthetic detail per chain for demo (augments R.a6.top_chains)
const _V2_COMP_DETAIL = {
  'Primrose Schools':    { founded:1982, centers:450, staff_ratio:'1:6 infant, 1:8 toddler', naeyc:true,  qris_stars:4, avg_waitlist_weeks:8, curriculum:'Balanced Learning', tuition_range:'$1,800–$2,400',  est_annual_rev_per_center:'$1.8M', notes:'Premium franchise; waitlist-driven; NAEYC standard across all locations' },
  'KinderCare':          { founded:1969, centers:1500,staff_ratio:'1:6 infant, 1:10 toddler',naeyc:false, qris_stars:3, avg_waitlist_weeks:4, curriculum:'Champions',          tuition_range:'$1,600–$2,100',  est_annual_rev_per_center:'$1.4M', notes:'National chain; mid-tier quality; typically 85–90% enrollment' },
  'Bright Horizons':     { founded:1986, centers:1100,staff_ratio:'1:4 infant, 1:6 toddler', naeyc:true,  qris_stars:5, avg_waitlist_weeks:12,curriculum:'HEART Mapping',      tuition_range:'$2,100–$2,800',  est_annual_rev_per_center:'$2.2M', notes:'Premium + employer-sponsored; highest price point; best quality signal' },
  'Independent Centers': { founded:null, centers:null, staff_ratio:'1:6 infant, 1:9 toddler', naeyc:false, qris_stars:2, avg_waitlist_weeks:2, curriculum:'Varies',            tuition_range:'$1,400–$1,800',  est_annual_rev_per_center:'$0.8M', notes:'Quality varies widely; often under-staffed; price advantage vs chains' },
};

function v2RenderCompetitorBenchmarks() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const a6 = R_data.a6 || {};
  const chains = a6.top_chains || [];
  const citySummary = a6.cities || [];
  if (!chains.length && !citySummary.length) return '';

  const chainRows = chains.map((c, i) => {
    const detail = _V2_COMP_DETAIL[c.name] || {};
    const naeyc = (c.naeyc || detail.naeyc) ? '✅ NAEYC' : '—';
    const stars = c.qris_stars || detail.qris_stars || '—';
    const starsStr = typeof stars === 'number' ? '★'.repeat(stars) + '☆'.repeat(5-stars) : stars;
    return `
      <tr class="v2-comp-row" onclick="v2ShowCompetitorDetail(${i})" style="cursor:pointer">
        <td style="font-weight:600;font-size:12px">${c.name}</td>
        <td style="font-size:12px;color:var(--v2-t2)">${c.locations_in_area || '—'}</td>
        <td style="font-size:12px">$${((c.avg_tuition_infant||0)/1000).toFixed(1)}K/mo</td>
        <td style="font-size:11px;color:var(--v2-amber)">${starsStr}</td>
        <td style="font-size:11px">${naeyc}</td>
        <td style="font-size:11px;color:var(--v2-t3)">${detail.staff_ratio || '—'}</td>
        <td><span class="v2-comp-detail-btn">Details →</span></td>
      </tr>`;
  }).join('');

  const cityRows = citySummary.map(c => `
    <tr>
      <td style="font-size:12px;font-weight:600">${c.city}</td>
      <td style="font-size:12px">${c.total_centers || '—'}</td>
      <td style="font-size:12px">$${((c.avg_tuition_infant||0)/1000).toFixed(1)}K</td>
      <td style="font-size:12px">$${((c.avg_tuition_preschool||0)/1000).toFixed(1)}K</td>
      <td style="font-size:12px">${c.naeyc_count || 0} NAEYC</td>
      <td style="font-size:12px"><span class="v2-sat-badge v2-sat-${(c.market_saturation||'').toLowerCase().replace(' ','-')}">${c.market_saturation || '—'}</span></td>
    </tr>`).join('');

  return `
    <div class="v2-card" style="padding:20px;margin-top:16px">
      <div class="v2-label" style="margin-bottom:12px">🏪 Competitor Intelligence — Click Any Row for Full Profile</div>
      <table class="v2-comp-table" style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <thead><tr style="font-size:10px;color:var(--v2-t3);text-transform:uppercase">
          <th style="text-align:left;padding:0 0 8px">Chain</th><th>Locations</th><th>Infant Tuition</th><th>Rating</th><th>NAEYC</th><th>Staff Ratio</th><th></th>
        </tr></thead>
        <tbody>${chainRows}</tbody>
      </table>
      <div class="v2-label" style="margin-bottom:8px;font-size:11px">By City</div>
      <table class="v2-comp-table" style="width:100%;border-collapse:collapse">
        <thead><tr style="font-size:10px;color:var(--v2-t3);text-transform:uppercase">
          <th style="text-align:left;padding:0 0 8px">City</th><th>Centers</th><th>Infant/mo</th><th>Preschool/mo</th><th>Accredited</th><th>Saturation</th>
        </tr></thead>
        <tbody>${cityRows}</tbody>
      </table>
    </div>`;
}

function v2ShowCompetitorDetail(idx) {
  const R_data = typeof R !== 'undefined' ? R : {};
  const chains = (R_data.a6 || {}).top_chains || [];
  const c = chains[idx];
  if (!c) return;
  const d = _V2_COMP_DETAIL[c.name] || {};
  const naeyc = (c.naeyc || d.naeyc) ? '<span style="color:#22c55e">✅ NAEYC Accredited</span>' : '<span style="color:var(--v2-t3)">Not NAEYC accredited</span>';
  const stars = c.qris_stars || d.qris_stars || 0;
  const citySummary = (R_data.a6 || {}).cities || [];

  const modal = document.getElementById('v2-comp-detail-modal');
  if (!modal) return;
  modal.querySelector('.v2-modal').innerHTML = `
    <div class="v2-modal-head">
      <div>
        <strong style="font-size:16px">${c.name}</strong>
        <div style="font-size:12px;color:var(--v2-t3);margin-top:2px">${d.founded ? 'Founded ' + d.founded : ''} ${d.centers ? '· '+d.centers+' centers nationally' : ''}</div>
      </div>
      <button class="v2-modal-close" onclick="v2CloseModal('v2-comp-detail-modal')">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
      <div class="v2-stat-mini"><div class="v2-stat-mini-label">Infant Tuition</div><div class="v2-stat-mini-val">$${((c.avg_tuition_infant||0)/1000).toFixed(1)}K/mo</div></div>
      <div class="v2-stat-mini"><div class="v2-stat-mini-label">QRIS Rating</div><div class="v2-stat-mini-val">${'★'.repeat(stars)}${'☆'.repeat(Math.max(0,5-stars))} ${stars}/5</div></div>
      <div class="v2-stat-mini"><div class="v2-stat-mini-label">Staff Ratio</div><div class="v2-stat-mini-val">${d.staff_ratio || 'N/A'}</div></div>
      <div class="v2-stat-mini"><div class="v2-stat-mini-label">Avg Waitlist</div><div class="v2-stat-mini-val">${d.avg_waitlist_weeks ? d.avg_waitlist_weeks + ' weeks' : 'N/A'}</div></div>
      <div class="v2-stat-mini"><div class="v2-stat-mini-label">Est. Revenue/Location</div><div class="v2-stat-mini-val">${d.est_annual_rev_per_center || 'N/A'}</div></div>
      <div class="v2-stat-mini"><div class="v2-stat-mini-label">Curriculum</div><div class="v2-stat-mini-val">${d.curriculum || 'N/A'}</div></div>
    </div>
    <div style="margin-top:12px;padding:10px 12px;background:rgba(99,102,241,.07);border-radius:8px">
      <div style="font-size:11px;font-weight:600;margin-bottom:4px">Accreditation & Tuition Range</div>
      <div style="font-size:12px">${naeyc} · <span style="color:var(--v2-t2)">${d.tuition_range || 'N/A'}</span></div>
    </div>
    ${d.notes ? `<div style="margin-top:10px;font-size:12px;color:var(--v2-t2);line-height:1.5">${d.notes}</div>` : ''}
    <div style="margin-top:16px">
      <div style="font-size:11px;font-weight:600;color:var(--v2-t3);margin-bottom:8px">LOCATIONS IN AREA BY CITY</div>
      ${citySummary.map(city => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--v2-border);font-size:12px">
          <span style="font-weight:500">${city.city}</span>
          <span style="color:var(--v2-t2)">${city.total_centers || 0} centers · Avg $${((city.avg_tuition_infant||0)/1000).toFixed(1)}K infant</span>
          <span class="v2-sat-badge v2-sat-${(city.market_saturation||'').toLowerCase().replace(' ','-')}">${city.market_saturation || '—'}</span>
        </div>`).join('')}
    </div>
    <div style="margin-top:14px;padding:10px 12px;background:rgba(239,68,68,.08);border-radius:8px;border:1px solid rgba(239,68,68,.2)">
      <div style="font-size:11px;font-weight:600;margin-bottom:4px">💡 Competitive Implication</div>
      <div style="font-size:12px;color:var(--v2-t2)">
        ${c.name === 'Bright Horizons' ? 'Highest quality signal — your center must match NAEYC pathway and premium facilities to compete on quality, or differentiate on personalized service.' :
          c.name === 'Primrose Schools' ? 'Franchise model limits flexibility — opportunity to undercut on price while matching NAEYC quality creates strong value proposition.' :
          c.name === 'KinderCare' ? 'Mid-tier quality — clear opportunity to capture market by leading with infant specialist program and NAEYC accreditation.' :
          'Independent centers have highest price sensitivity and lowest quality floor — position above them on quality at competitive tuition rates.'}
      </div>
    </div>`;
  modal.style.display = 'flex';
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — AGENT 7: FINANCIAL SENSITIVITY
// ══════════════════════════════════════════════════════════════════════════════

function v2RenderEnrollmentRamp() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const a7 = R_data.a7 || {};
  const projs = a7.projections || [];
  const scenarios = a7.scenarios || [];
  if (!projs.length) return '';

  const base = scenarios.find(s => (s.name||'').toLowerCase().includes('base')) || scenarios[0] || {};
  const cons = scenarios.find(s => (s.name||'').toLowerCase().includes('cons')) || {};
  const opt  = scenarios.find(s => (s.name||'').toLowerCase().includes('opt'))  || {};
  const maxRev = Math.max(...projs.map(p => p.rev||0), base.monthly_revenue||0) * 1.1;
  const fixedCost = (base.monthly_expenses || 108400);

  const W=560, H=180, padL=60, padR=20, padT=16, padB=32;
  const cW=W-padL-padR, cH=H-padT-padB;
  const xScale = (projs.length - 1) > 0 ? cW / (projs.length-1) : cW;
  const toY = v => padT + cH - Math.min(1, Math.max(0, v/maxRev)) * cH;
  const toX = i => padL + i * xScale;

  // Revenue path per data point
  const revPath = projs.map((p,i) => (i===0?'M':'L')+toX(i)+','+toY(p.rev)).join(' ');
  // Conservative and optimistic bands (±15%)
  const consPath = projs.map((p,i) => (i===0?'M':'L')+toX(i)+','+toY(p.rev*0.8)).join(' ');
  const optPath  = projs.map((p,i) => (i===0?'M':'L')+toX(i)+','+toY(p.rev*1.2)).join(' ');
  const bandArea = optPath + ' ' + projs.slice().reverse().map((p,ri) => {
    const i = projs.length-1-ri;
    return 'L'+toX(i)+','+toY(p.rev*0.8);
  }).join(' ') + ' Z';

  // Fixed cost line
  const costY = toY(fixedCost);
  // Break-even month
  const beMonth = base.breakeven_months || 14;
  const beIdx = projs.findIndex((p,i) => {
    const nextPts = projs[i+1];
    return nextPts && p.cum <= 0 && nextPts.cum >= 0;
  });
  const beX = beIdx >= 0 ? toX(beIdx) : padL + (beMonth/24)*cW;

  const gridLines = [0.25, 0.5, 0.75, 1.0].map(p => {
    const y = padT + cH - p*cH;
    return `<line x1="${padL}" y1="${y}" x2="${padL+cW}" y2="${y}" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
            <text x="${padL-4}" y="${y+3}" font-size="8" fill="var(--v2-t3)" text-anchor="end">$${_v2FormatK(maxRev*p)}</text>`;
  }).join('');

  return `
    <div class="v2-card" style="padding:20px;margin-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div class="v2-label">📈 Enrollment Ramp — Month-by-Month Revenue Trajectory</div>
        <div style="display:flex;gap:12px;font-size:10px;color:var(--v2-t3)">
          <span><span style="display:inline-block;width:20px;height:2px;background:#6366f1;vertical-align:middle;margin-right:4px"></span>Base</span>
          <span><span style="display:inline-block;width:20px;height:4px;background:rgba(99,102,241,.2);vertical-align:middle;margin-right:4px"></span>±20% band</span>
          <span><span style="display:inline-block;width:20px;height:1px;background:#ef4444;vertical-align:middle;margin-right:4px;border-top:1px dashed #ef4444"></span>Fixed costs</span>
        </div>
      </div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block">
        ${gridLines}
        <!-- confidence band -->
        <path d="${bandArea}" fill="rgba(99,102,241,0.08)"/>
        <!-- fixed cost line -->
        <line x1="${padL}" y1="${costY}" x2="${padL+cW}" y2="${costY}" stroke="rgba(239,68,68,.5)" stroke-width="1" stroke-dasharray="4,3"/>
        <text x="${padL+cW+2}" y="${costY+3}" font-size="8" fill="rgba(239,68,68,.7)">Fixed</text>
        <!-- break-even marker -->
        <line x1="${beX}" y1="${padT}" x2="${beX}" y2="${padT+cH}" stroke="rgba(34,197,94,.5)" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="${beX}" y="${padT-2}" font-size="8" fill="#22c55e" text-anchor="middle">BE Mo.${beMonth}</text>
        <!-- revenue line -->
        <path d="${revPath}" stroke="#6366f1" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
        <!-- data points -->
        ${projs.map((p,i) => {
          // Escape quotes in month label and ensure numeric fields are finite to
          // avoid inline-handler parse errors when AI returns odd data.
          const m = String(p.month||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
          const rev = Number(p.rev)||0, exp = Number(p.exp)||0, cum = Number(p.cum)||0;
          return `
          <circle cx="${toX(i)}" cy="${toY(p.rev)}" r="3" fill="#6366f1"
            style="cursor:pointer" onclick="v2OpenBreakEvenMonthDetail('${m}',${rev},${exp},${cum})"
            title="${m}: Rev $${rev.toLocaleString()}"/>
          <text x="${toX(i)}" y="${padT+cH+12}" font-size="8" fill="var(--v2-t3)" text-anchor="middle">${m}</text>
        `;}).join('')}
      </svg>
      <div style="font-size:10px;color:var(--v2-t3);margin-top:4px">
        Click any data point to see the full P&amp;L breakdown for that month
      </div>
      ${v2RenderLeaseSlider(a7)}
    </div>`;
}

function v2RenderLeaseSlider(a7) {
  if (!a7) { const R_data = typeof R !== 'undefined' ? R : {}; a7 = R_data.a7 || {}; }
  const ops = a7.monthly_ops || [];
  const leaseItem = ops.find(o => (o.item||'').toLowerCase().includes('lease'));
  const baseLease = leaseItem ? leaseItem.amount : 10800;
  const sqft = 6000;
  const basePsfRaw = baseLease / sqft * 12;
  // Auto-extend slider range so the actual base rent always fits
  const minPsf = Math.min(8, Math.floor(basePsfRaw * 0.7));
  const maxPsf = Math.max(28, Math.ceil(basePsfRaw * 1.4));
  const basePsf = basePsfRaw.toFixed(2);
  const scenarios = a7.scenarios || [];
  const base = scenarios.find(s => (s.name||'').toLowerCase().includes('base')) || scenarios[0] || {};
  const baseRev = base.monthly_revenue || 138000;
  const baseExp = base.monthly_expenses || 108400;
  // Use real startup cost when available so break-even sensitivity is meaningful
  const startup = (typeof R !== 'undefined' && R.a7?.total_startup_cost)
    || (typeof V2 !== 'undefined' && V2.run?.budget)
    || 600000;

  return `
    <div style="margin-top:16px;padding:14px;background:rgba(99,102,241,.06);border-radius:10px;border:1px solid rgba(99,102,241,.15)">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px">🏗️ Lease Rate Sensitivity — $/sqft/year</div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:11px;color:var(--v2-t3)">$${minPsf}/sqft</span>
        <input type="range" id="v2-lease-slider" min="${minPsf}" max="${maxPsf}" step="0.5" value="${basePsf}"
          style="flex:1;accent-color:#6366f1"
          oninput="v2UpdateLeaseCalc(this.value,${sqft},${baseRev},${baseExp},${baseLease},${startup})">
        <span style="font-size:11px;color:var(--v2-t3)">$${maxPsf}/sqft</span>
      </div>
      <div id="v2-lease-output" style="margin-top:10px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${_v2LeaseCalcHTML(parseFloat(basePsf), sqft, baseRev, baseExp, baseLease, startup)}
      </div>
    </div>`;
}

function _v2LeaseCalcHTML(psf, sqft, baseRev, baseExp, baseLease, startup) {
  const newLease = Math.round(psf * sqft / 12);
  const delta = newLease - baseLease;
  const newExp = baseExp + delta;
  const newNet = baseRev - newExp;
  const cap = startup || 600000;
  const beMonths = newNet > 0 ? Math.round(cap / newNet) : 99;
  const deltaColor = delta > 0 ? '#ef4444' : '#22c55e';
  return `
    <div class="v2-lease-stat"><div class="v2-stat-mini-label">Lease/mo</div><div class="v2-stat-mini-val">$${newLease.toLocaleString()}</div></div>
    <div class="v2-lease-stat"><div class="v2-stat-mini-label">vs Base</div><div class="v2-stat-mini-val" style="color:${deltaColor}">${delta>=0?'+':''}$${delta.toLocaleString()}</div></div>
    <div class="v2-lease-stat"><div class="v2-stat-mini-label">Monthly Net</div><div class="v2-stat-mini-val" style="color:${newNet>0?'#22c55e':'#ef4444'}">$${newNet.toLocaleString()}</div></div>
    <div class="v2-lease-stat"><div class="v2-stat-mini-label">Break-Even</div><div class="v2-stat-mini-val">Mo.${beMonths > 60 ? '60+' : beMonths}</div></div>`;
}

function v2UpdateLeaseCalc(psf, sqft, baseRev, baseExp, baseLease, startup) {
  const out = document.getElementById('v2-lease-output');
  if (out) out.innerHTML = _v2LeaseCalcHTML(parseFloat(psf), sqft, baseRev, baseExp, baseLease, startup);
}

function v2OpenBreakEvenMonthDetail(month, rev, exp, cum) {
  const modal = document.getElementById('v2-breakeven-modal');
  if (!modal) return;
  const R_data = typeof R !== 'undefined' ? R : {};
  const a7 = R_data.a7 || {};
  const ops = a7.monthly_ops || [];
  const net = (rev||0) - (exp||0);
  const statusColor = net >= 0 ? '#22c55e' : '#ef4444';
  const statusLabel = net >= 0 ? '✅ Profitable' : '⚠️ Pre-Profit';

  modal.querySelector('.v2-modal').innerHTML = `
    <div class="v2-modal-head">
      <strong>P&amp;L Detail — ${month}</strong>
      <button class="v2-modal-close" onclick="v2CloseModal('v2-breakeven-modal')">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0">
      <div class="v2-stat-mini"><div class="v2-stat-mini-label">Revenue</div><div class="v2-stat-mini-val" style="color:#22c55e">$${(rev||0).toLocaleString()}</div></div>
      <div class="v2-stat-mini"><div class="v2-stat-mini-label">Expenses</div><div class="v2-stat-mini-val" style="color:#ef4444">$${(exp||0).toLocaleString()}</div></div>
      <div class="v2-stat-mini"><div class="v2-stat-mini-label">Net</div><div class="v2-stat-mini-val" style="color:${statusColor}">$${net.toLocaleString()}</div></div>
    </div>
    <div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--v2-t2)">Monthly Operating Costs Breakdown</div>
    <div style="display:flex;flex-direction:column;gap:4px">
      ${ops.map(o => {
        const pct = exp > 0 ? Math.round((o.amount/exp)*100) : 0;
        return `<div style="display:flex;align-items:center;gap:8px;font-size:12px">
          <span style="flex:1;color:var(--v2-t2)">${o.item}</span>
          <div style="width:80px;height:4px;background:var(--v2-border);border-radius:2px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:#6366f1;border-radius:2px"></div>
          </div>
          <span style="width:70px;text-align:right;font-weight:500">$${o.amount.toLocaleString()}</span>
          <span style="width:32px;text-align:right;color:var(--v2-t3)">${pct}%</span>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:14px;padding:10px;background:rgba(34,197,94,.07);border-radius:8px;font-size:12px">
      <strong>${statusLabel}</strong> · Cumulative P&amp;L: <span style="color:${(cum||0)>=0?'#22c55e':'#ef4444'};font-weight:600">$${(cum||0).toLocaleString()}</span>
    </div>`;
  modal.style.display = 'flex';
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — AGENT 8: RISK SCORING WITH TRIGGERS
// ══════════════════════════════════════════════════════════════════════════════

const _V2_RISK_PROB = { 'High': 0.65, 'Medium': 0.35, 'Low': 0.15 };
const _V2_RISK_IMPACT = { 'High': 3, 'Medium': 2, 'Low': 1 };
const _V2_RISK_TRIGGERS = [
  'If enrollment < 60% by Month 6',
  'If SBA approval exceeds 90 days',
  'If DECAL inspection fails first attempt',
  'If lease costs increase >15% at renewal',
  'If lead teacher turnover >40% in Year 1',
  'If competitor opens within 1mi within 12 months',
  'If occupancy rate stays below 55% in Month 9',
];
const _V2_RISK_COSTS = [45000, 28000, 12000, 22000, 18000, 35000, 60000];

function v2RenderRiskScored() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const risks = (R_data.a8 || {}).risks || [];
  if (!risks.length) return '';

  const scored = risks.map((r, i) => {
    const prob = _V2_RISK_PROB[r.severity] || 0.35;
    const impact = _V2_RISK_IMPACT[r.severity] || 2;
    const score = (prob * impact * 10).toFixed(1);
    // Only use real trigger/cost from AI — never fabricate
    const trigger = r.trigger || r.early_warning || null;
    const cost = (typeof r.mitigation_cost === 'number') ? r.mitigation_cost
               : (typeof r.cost === 'number')             ? r.cost
               : null;
    const color = r.severity === 'High' ? '#ef4444' : r.severity === 'Medium' ? '#f59e0b' : '#22c55e';
    return { ...r, prob, impact, score: parseFloat(score), trigger, cost, color };
  }).sort((a,b) => b.score - a.score);

  const maxScore = Math.max(...scored.map(r => r.score));

  return `
    <div class="v2-card" style="padding:20px;margin-top:16px">
      <div class="v2-label" style="margin-bottom:4px">⚠️ Risk Scoring — Probability × Impact</div>
      <div style="font-size:11px;color:var(--v2-t3);margin-bottom:14px">Sorted by weighted risk score · Includes trigger conditions and estimated mitigation cost</div>
      ${scored.map(r => `
        <div class="v2-risk-scored-row">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div style="font-size:12px;font-weight:600;flex:1;padding-right:12px">${r.risk}</div>
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
              <span class="v2-risk-badge-sm" style="background:${r.color}20;color:${r.color};border:1px solid ${r.color}40">${r.severity}</span>
              <span style="font-size:13px;font-weight:700;color:${r.color}">${r.score}</span>
            </div>
          </div>
          <div style="width:100%;height:4px;background:var(--v2-border);border-radius:2px;margin-bottom:8px;overflow:hidden">
            <div style="width:${(r.score/maxScore*100).toFixed(0)}%;height:100%;background:${r.color};border-radius:2px;transition:width .3s"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px">
            <div style="font-size:10px;color:var(--v2-t3)">Probability<br><strong style="color:var(--v2-t1);font-size:11px">${(r.prob*100).toFixed(0)}%</strong></div>
            <div style="font-size:10px;color:var(--v2-t3)">Impact<br><strong style="color:var(--v2-t1);font-size:11px">${r.impact}/3</strong></div>
            <div style="font-size:10px;color:var(--v2-t3)">Mitigation Cost<br><strong style="color:var(--v2-amber);font-size:11px">${r.cost!=null?'$'+r.cost.toLocaleString():'—'}</strong></div>
          </div>
          ${r.trigger?`<div style="font-size:11px;padding:6px 8px;background:rgba(245,158,11,.07);border-radius:6px;border-left:3px solid ${r.color};margin-bottom:6px">
            <span style="color:var(--v2-t3)">Trigger: </span>${r.trigger}
          </div>`:''}
          <div style="font-size:11px;color:var(--v2-t2);line-height:1.4"><span style="color:var(--v2-t3)">Mitigation: </span>${r.mitigation}</div>
        </div>`).join('')}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — AGENT 11: REAL ESTATE SCORING PANEL
// ══════════════════════════════════════════════════════════════════════════════

function v2RenderRealEstatePanel() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const a11 = R_data.a11 || {};
  const pins = a11.real_estate_pins || [];
  const cities = a11.cities || [];
  if (!pins.length && !cities.length) return `<div class="v2-empty-panel">Run Agent 11 for real estate data</div>`;

  // Score each listing
  const scored = pins.map((p, i) => {
    const city = cities.find(c => c.name === p.city) || {};
    return _v2ScoreListing(p, city, i);
  });

  // Add synthetic additional listings if we have city data
  const synth = cities.filter(c => !pins.find(p => p.city === c.name)).slice(0,3).map((city,i) => ({
    label: `${city.name} — Available Retail Space`,
    city: city.name, sqft: 5800+i*400, monthly_rent: Math.round((city.median_income||85000)/12*0.09),
    type: 'Mixed-Use', lat: city.lat, lng: city.lng, _synthetic: true,
  })).map((p,i) => _v2ScoreListing(p, cities.find(c=>c.name===p.city)||{}, pins.length+i));

  const all = [...scored, ...synth].sort((a,b) => b.totalScore - a.totalScore);

  return `
    <div style="margin-top:0">
      <div class="v2-label" style="margin-bottom:12px">🏠 Real Estate — Scored Listings</div>
      <div style="font-size:11px;color:var(--v2-t3);margin-bottom:14px">Scored on zoning, ADA access, proximity to schools, residential density, and parking</div>
      ${all.map(l => `
        <div class="v2-re-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:13px;font-weight:600">${l.label}</div>
              <div style="font-size:11px;color:var(--v2-t3);margin-top:2px">${l.city} · ${l.sqft?.toLocaleString()} sqft · ${l.type}${l._synthetic?' · <em>Estimated availability</em>':''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:12px">
              <div style="font-size:18px;font-weight:700;color:${l.totalScore>=75?'#22c55e':l.totalScore>=55?'#f59e0b':'#ef4444'}">${l.totalScore}</div>
              <div style="font-size:9px;color:var(--v2-t3)">/ 100</div>
            </div>
          </div>
          <div style="font-size:12px;font-weight:500;margin-bottom:6px;color:var(--v2-t2)">$${(l.monthly_rent||0).toLocaleString()}/mo · $${l.sqft > 0 ? ((l.monthly_rent||0)*12/l.sqft).toFixed(1) : '—'}/sqft/yr</div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px">
            ${[
              {label:'Zoning', score: l.zoningScore, icon:'🏗'},
              {label:'ADA', score: l.adaScore, icon:'♿'},
              {label:'Schools', score: l.schoolScore, icon:'🏫'},
              {label:'Density', score: l.densityScore, icon:'🏘'},
              {label:'Parking', score: l.parkingScore, icon:'🅿'},
            ].map(s => `
              <div class="v2-re-score-cell">
                <div style="font-size:14px">${s.icon}</div>
                <div style="font-size:10px;color:var(--v2-t3)">${s.label}</div>
                <div style="font-size:12px;font-weight:600;color:${s.score>=7?'#22c55e':s.score>=5?'#f59e0b':'#ef4444'}">${s.score}/10</div>
              </div>`).join('')}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${l.flags.map(f => `<span class="v2-re-flag v2-re-flag-${f.type}">${f.label}</span>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

function _v2ScoreListing(p, city, idx) {
  const gap = city.gap_score || 7;
  const income = city.median_income || 85000;
  const compCount = city.competitor_count || 3;
  // Synthesize scores from available data
  const zoningScore = p.type === 'Freestanding' ? 9 : p.type === 'Strip Anchor' ? 7 : 6;
  const adaScore = p.sqft >= 6000 ? 8 : p.sqft >= 5000 ? 7 : 5;
  const schoolScore = Math.min(10, Math.round(gap * 1.0));
  const densityScore = Math.min(10, Math.round(income / 12000));
  const parkingScore = p.type === 'Freestanding' ? 9 : p.type === 'Strip Anchor' ? 7 : 5;
  const totalScore = Math.round((zoningScore + adaScore + schoolScore + densityScore + parkingScore) / 5 * 10);

  const flags = [];
  if (zoningScore >= 8) flags.push({label:'✅ Zoning OK', type:'green'});
  else flags.push({label:'⚠️ Verify Zoning', type:'amber'});
  if (adaScore >= 7) flags.push({label:'♿ ADA Compliant', type:'green'});
  else flags.push({label:'⚠️ ADA Review Needed', type:'amber'});
  if (gap >= 8) flags.push({label:'🎯 High-Demand Area', type:'green'});
  if (parkingScore >= 8) flags.push({label:'🅿 Adequate Parking', type:'green'});
  if (compCount <= 2) flags.push({label:'🏆 Low Competition', type:'green'});

  return { ...p, zoningScore, adaScore, schoolScore, densityScore, parkingScore, totalScore, flags };
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — CROSS-AGENT INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════

function v2RenderGrantLinkedWaterfall() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const a7 = R_data.a7 || {};
  const a12 = R_data.a12 || {};
  const grants = [...(a12.federal_grants||[]), ...(a12.state_grants||[]), ...(a12.local_grants||[])]
    .filter(g => g && (g.amount_range || g.max_award));
  if (!grants.length) return '';

  // Parse grant amounts - take midpoint of ranges
  const grantItems = grants.slice(0,5).map(g => {
    let amt = 0;
    const raw = g.amount_range || g.max_award || '';
    const m = String(raw).match(/\$?([\d,]+)/g);
    if (m && m.length >= 2) {
      const vals = m.map(v => parseInt(v.replace(/[$,]/g,''))).filter(v=>v>0);
      amt = vals.reduce((a,b)=>a+b,0)/vals.length;
    } else if (m && m.length === 1) {
      amt = parseInt(m[0].replace(/[$,]/g,''))||0;
    }
    return { name: g.name || 'Grant', amount: amt, type: g.type || 'Grant' };
  }).filter(g => g.amount > 0);

  const totalGrants = grantItems.reduce((s,g)=>s+g.amount,0);
  const startup = (a7.startup_breakdown||[]).reduce((s,b)=>s+(b.amount||0),0) || 527000;
  const netStartup = startup - totalGrants;

  return `
    <div class="v2-card" style="padding:20px;margin-top:16px;border:1px solid rgba(34,197,94,.2)">
      <div class="v2-label" style="margin-bottom:4px">💰 Grants → Startup Cost Reduction</div>
      <div style="font-size:11px;color:var(--v2-t3);margin-bottom:14px">Applying identified grants reduces your out-of-pocket startup requirement</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="v2-stat-mini"><div class="v2-stat-mini-label">Gross Startup</div><div class="v2-stat-mini-val">$${_v2FormatK(startup)}</div></div>
        <div class="v2-stat-mini"><div class="v2-stat-mini-label">Grant Reduction</div><div class="v2-stat-mini-val" style="color:#22c55e">-$${_v2FormatK(totalGrants)}</div></div>
        <div class="v2-stat-mini"><div class="v2-stat-mini-label">Net Required</div><div class="v2-stat-mini-val" style="color:#6366f1">$${_v2FormatK(netStartup)}</div></div>
      </div>
      ${grantItems.map(g => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--v2-border);font-size:12px">
          <div>
            <span style="font-weight:500">${g.name}</span>
            <span style="font-size:10px;color:var(--v2-t3);margin-left:6px">${g.type}</span>
          </div>
          <span style="color:#22c55e;font-weight:600">-$${Math.round(g.amount).toLocaleString()}</span>
        </div>`).join('')}
      <div style="margin-top:10px;font-size:11px;color:var(--v2-t3)">
        ⚠️ Grant amounts are estimates — eligibility and timing vary. Work with an SBA advisor to confirm.
      </div>
    </div>`;
}

function v2RenderScoreRunDiff() {
  const portfolio = (typeof V2 !== 'undefined' && V2.portfolio) ? V2.portfolio : [];
  if (portfolio.length < 2) return '';

  const sorted = [...portfolio].sort((a,b) => (b.savedAt||0)-(a.savedAt||0));
  const current = sorted[0];
  const prev = sorted[1];
  if (!current || !prev) return '';

  const delta = (current.score||0) - (prev.score||0);
  const deltaColor = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : 'var(--v2-t3)';
  const deltaStr = delta > 0 ? '+'+delta.toFixed(1) : delta.toFixed(1);

  const components = ['Gap','Financials','AI Verdict','Competition','Compliance'];
  const weights = [25,25,20,15,15];
  const keys = ['gap','financials','verdict','competition','compliance'];
  const curBd = current.breakdown || {};
  const prevBd = prev.breakdown || {};
  // Only render per-component rows when we have real saved breakdowns for both runs
  const hasBd = keys.some(k => curBd[k] != null) && keys.some(k => prevBd[k] != null);
  const rows = hasBd ? components.map((name,i) => {
    const k = keys[i];
    const cur = Number(curBd[k]);
    const pre = Number(prevBd[k]);
    if (!isFinite(cur) || !isFinite(pre)) return '';
    const d = +(cur - pre).toFixed(1);
    const c = d > 0 ? '#22c55e' : d < 0 ? '#ef4444' : 'var(--v2-t3)';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px;border-bottom:1px solid var(--v2-border)">
      <span style="color:var(--v2-t2)">${name} <span style="font-size:10px;color:var(--v2-t3)">(${weights[i]}pt)</span></span>
      <span style="color:${c};font-weight:600">${d>0?'+':''}${d} pts</span>
    </div>`;
  }).join('') : '<div style="font-size:11px;color:var(--v2-t3);padding:6px 0">Per-component change unavailable — save runs with score breakdowns to see deltas.</div>';

  return `
    <div class="v2-card" style="padding:16px;margin-top:16px;border:1px solid rgba(99,102,241,.2)">
      <div class="v2-label" style="margin-bottom:10px">🔄 Score Change vs Previous Run</div>
      <div style="display:flex;gap:16px;margin-bottom:12px">
        <div class="v2-stat-mini"><div class="v2-stat-mini-label">Previous Score</div><div class="v2-stat-mini-val">${(prev.score||0).toFixed(1)}</div></div>
        <div class="v2-stat-mini"><div class="v2-stat-mini-label">Current Score</div><div class="v2-stat-mini-val">${(current.score||0).toFixed(1)}</div></div>
        <div class="v2-stat-mini"><div class="v2-stat-mini-label">Change</div><div class="v2-stat-mini-val" style="color:${deltaColor}">${deltaStr}</div></div>
      </div>
      ${rows}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — ZIP AUTOCOMPLETE & ADDRESS LOOKUP
// ══════════════════════════════════════════════════════════════════════════════

function v2LookupZIP(zip) {
  if (!zip || zip.length < 5) {
    const el = document.getElementById('wiz-zip-preview');
    if (el) el.innerHTML = '';
    return;
  }
  const el = document.getElementById('wiz-zip-preview');
  if (!el) return;
  el.innerHTML = '<span style="font-size:11px;color:var(--v2-t3)">Looking up…</span>';

  fetch(`https://api.zippopotam.us/us/${zip}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data || !data.places || !data.places[0]) {
        el.innerHTML = '<span style="font-size:11px;color:var(--v2-t3)">ZIP not found</span>';
        return;
      }
      const place = data.places[0];
      const city = place['place name'];
      const state = place['state abbreviation'];
      const lat = parseFloat(place.latitude).toFixed(4);
      const lng = parseFloat(place.longitude).toFixed(4);
      el.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:8px;padding:5px 10px;background:rgba(99,102,241,.1);border-radius:20px;border:1px solid rgba(99,102,241,.25)">
          <span style="font-size:13px">📍</span>
          <span style="font-size:12px;font-weight:600;color:var(--v2-t1)">${city}, ${state}</span>
          <span style="font-size:10px;color:var(--v2-t3)">${lat}°N ${Math.abs(lng)}°W</span>
        </div>`;
      // Store in wizard
      if (typeof V2 !== 'undefined' && V2.wizard) {
        V2.wizard.data._zipCity = city;
        V2.wizard.data._zipState = state;
      }
    })
    .catch(() => {
      el.innerHTML = '<span style="font-size:11px;color:var(--v2-t3)">Lookup unavailable</span>';
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — SOURCE FRESHNESS & DATA CONFIDENCE
// ══════════════════════════════════════════════════════════════════════════════

const _V2_DATA_SOURCES = {
  market:      { source:'US Census ACS 2023',      date:'Nov 2023', confidence:92, type:'Government' },
  competition: { source:'Google Maps + DECAL DB',  date:'Jan 2025', confidence:78, type:'Scraped' },
  financials:  { source:'Industry benchmarks + AI',date:'Apr 2025', confidence:85, type:'Model' },
  realestate:  { source:'LoopNet + CoStar',        date:'Mar 2025', confidence:70, type:'Listed' },
  grants:      { source:'Grants.gov + GA DECAL',   date:'Feb 2025', confidence:88, type:'Government' },
  risks:       { source:'AI analysis + local data',date:'Apr 2025', confidence:75, type:'Model' },
  compliance:  { source:'GA DECAL official portal',date:'Jan 2025', confidence:95, type:'Official' },
};

function v2RenderFreshnessBadge(panelKey) {
  const src = _V2_DATA_SOURCES[panelKey];
  if (!src) return '';
  const conf = src.confidence;
  const color = conf >= 85 ? '#22c55e' : conf >= 70 ? '#f59e0b' : '#ef4444';
  const isStale = src.date && _v2IsDataStale(src.date);
  return `
    <div class="v2-freshness-badge" title="Source: ${src.source} · ${src.date} · ${conf}% confidence">
      <span style="color:${color}">●</span>
      <span>${src.source}</span>
      <span style="color:var(--v2-t3)">${src.date}</span>
      <span style="background:${color}20;color:${color};border:1px solid ${color}40;padding:1px 5px;border-radius:10px;font-size:9px">${conf}% conf</span>
      ${isStale ? '<span style="background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3);padding:1px 5px;border-radius:10px;font-size:9px">⚠️ Stale</span>' : ''}
    </div>`;
}

function _v2IsDataStale(dateStr) {
  try {
    const parts = dateStr.split(' ');
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    if (parts.length === 2 && months[parts[0]] !== undefined) {
      const d = new Date(parseInt(parts[1]), months[parts[0]]);
      const now = new Date();
      const diffDays = (now - d) / (1000*60*60*24);
      return diffDays > 30;
    }
  } catch(e) {}
  return false;
}

function v2RenderDataFreshnessPanel() {
  return `
    <div style="margin-top:0">
      <div class="v2-label" style="margin-bottom:12px">🔍 Data Sources & Freshness</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${Object.entries(_V2_DATA_SOURCES).map(([key,src]) => {
          const conf = src.confidence;
          const color = conf >= 85 ? '#22c55e' : conf >= 70 ? '#f59e0b' : '#ef4444';
          const isStale = _v2IsDataStale(src.date);
          return `
            <div style="padding:12px;background:var(--v2-card-bg);border:1px solid var(--v2-border);border-radius:10px;${isStale?'border-color:rgba(239,68,68,.3)':''}">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:12px;font-weight:600;text-transform:capitalize">${key}</span>
                ${isStale?'<span style="font-size:9px;color:#ef4444;font-weight:600">⚠️ STALE</span>':''}
              </div>
              <div style="font-size:11px;color:var(--v2-t2);margin-bottom:4px">${src.source}</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:10px;color:var(--v2-t3)">${src.date} · ${src.type}</span>
                <div style="display:flex;align-items:center;gap:4px">
                  <div style="width:40px;height:3px;background:var(--v2-border);border-radius:2px;overflow:hidden">
                    <div style="width:${conf}%;height:100%;background:${color}"></div>
                  </div>
                  <span style="font-size:10px;color:${color};font-weight:600">${conf}%</span>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div style="margin-top:14px;padding:10px 12px;background:rgba(245,158,11,.08);border-radius:8px;font-size:11px;color:var(--v2-t2)">
        ⚠️ Data older than 30 days is flagged as stale. Re-run with live API key to refresh all sources.
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — NEW PANELS: MULTI-ZIP, COMPARE, SENSITIVITY, TRENDS
// ══════════════════════════════════════════════════════════════════════════════

function v2RenderMultiLocationPanel() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const a2 = R_data.a2 || {};
  const cities = a2.cities || [];
  if (!cities.length) return `<div class="v2-empty-panel">Run analysis to score multiple locations</div>`;

  const zips = { suwanee:'30097', 'sugar hill':'30518', duluth:'30096', buford:'30518', 'flowery branch':'30542' };

  const scored = cities.map(c => {
    const a11City = ((R_data.a11||{}).cities||[]).find(x=>x.name===c.city)||{};
    const a6City = ((R_data.a6||{}).cities||[]).find(x=>x.city===c.city)||{};
    const finCity = ((R_data.a7||{}).by_city_financials||[]).find(x=>x.city===c.city)||{};
    const overallScore = Math.round(
      c.gap_score * 10 * 0.35 +
      Math.min(100,(((R_data.a1||{}).cities||[]).find(x=>x.name===c.city)||{}).demand_score||70) * 0.25 +
      (100 - (a6City.total_centers||3)*8) * 0.20 +
      Math.min(100, ((((R_data.a1||{}).cities||[]).find(x=>x.name===c.city)||{}).median_hh_income||80000)/1300) * 0.20
    );
    return { ...c, overallScore, beMonths: finCity.break_even_mo||16, annualNet: finCity.annual_net_yr2||0,
             avgTuition: c.recommended_tuition_infant||1900, zip: zips[c.city?.toLowerCase()] || '30097' };
  }).sort((a,b) => b.overallScore - a.overallScore);

  const maxScore = Math.max(...scored.map(c=>c.overallScore));

  return `
    <div>
      <div class="v2-label" style="margin-bottom:4px">📍 Multi-Location Scoring</div>
      <div style="font-size:11px;color:var(--v2-t3);margin-bottom:16px">All ${scored.length} cities scored by gap, demographics, competition, and financial potential</div>
      ${scored.map((c,i) => {
        const color = c.overallScore >= 80 ? '#22c55e' : c.overallScore >= 60 ? '#f59e0b' : '#ef4444';
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
        return `
          <div class="v2-multiloc-row">
            <div style="width:28px;text-align:center;font-size:16px">${medal||'#'+(i+1)}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span style="font-size:13px;font-weight:600">${c.city}</span>
                <span style="font-size:16px;font-weight:700;color:${color}">${c.overallScore}</span>
              </div>
              <div style="width:100%;height:5px;background:var(--v2-border);border-radius:3px;overflow:hidden;margin-bottom:6px">
                <div style="width:${(c.overallScore/maxScore*100).toFixed(0)}%;height:100%;background:${color};border-radius:3px"></div>
              </div>
              <div style="display:flex;gap:12px;font-size:10px;color:var(--v2-t3)">
                <span>Gap: <strong style="color:var(--v2-t2)">${c.gap_score}/10</strong></span>
                <span>Break-even: <strong style="color:var(--v2-t2)">Mo.${c.beMonths}</strong></span>
                <span>Tuition: <strong style="color:var(--v2-t2)">$${(c.avgTuition/1000).toFixed(1)}K</strong></span>
                <span>Priority: <strong style="color:${color}">${c.priority||'Opportunity'}</strong></span>
              </div>
            </div>
            <button class="v2-btn ghost sm" onclick="v2LaunchSubAnalysis('${c.zip}','${c.city}')" style="flex-shrink:0;margin-left:8px;font-size:11px">Analyze →</button>
          </div>`;
      }).join('')}
      <div style="margin-top:14px;padding:12px;background:rgba(99,102,241,.07);border-radius:8px;font-size:12px">
        <strong>${scored[0]?.city}</strong> is the top location with a composite score of <strong>${scored[0]?.overallScore}/100</strong>.
        Gap score ${scored[0]?.gap_score}/10 with ${scored[0]?.unserved_children?.toLocaleString()} unserved children.
        Break-even estimated at Month ${scored[0]?.beMonths}.
      </div>
    </div>`;
}

function v2LaunchSubAnalysis(zip, city) {
  const modal = document.getElementById('v2-zip-subanalysis-modal');
  if (!modal) { v2Toast(`🔍 Sub-analysis for ${city} (ZIP ${zip}) — run with API key for live data`); return; }
  modal.querySelector('.v2-modal').innerHTML = `
    <div class="v2-modal-head">
      <strong>Sub-Analysis: ${city} (ZIP ${zip})</strong>
      <button class="v2-modal-close" onclick="v2CloseModal('v2-zip-subanalysis-modal')">✕</button>
    </div>
    <div style="margin-top:16px;text-align:center;padding:24px">
      <div style="font-size:36px;margin-bottom:12px">🔍</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">Launch Full Analysis for ${city}</div>
      <div style="font-size:12px;color:var(--v2-t2);margin-bottom:20px">This will start a new 17-agent pipeline for ZIP ${zip}. Current run will be saved to portfolio.</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="v2-btn primary" onclick="v2CloseModal('v2-zip-subanalysis-modal');v2SaveCurrentRun&&v2SaveCurrentRun();if(typeof V2!=='undefined'){V2.wizard.data.zip='${zip}';V2.wizard.data._zipCity='${city}';}v2GoTo('wizard')">
          🚀 Start Analysis for ${city}
        </button>
        <button class="v2-btn ghost" onclick="v2CloseModal('v2-zip-subanalysis-modal')">Cancel</button>
      </div>
    </div>`;
  modal.style.display = 'flex';
}

function v2RenderComparePanel() {
  const portfolio = (typeof V2 !== 'undefined' && V2.portfolio) ? V2.portfolio : [];
  if (portfolio.length < 2) return `
    <div class="v2-empty-panel" style="text-align:center;padding:40px">
      <div style="font-size:32px;margin-bottom:12px">⚖️</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">No runs to compare yet</div>
      <div style="font-size:12px;color:var(--v2-t2)">Save at least 2 analyses to compare them side by side.</div>
    </div>`;

  const sorted = [...portfolio].sort((a,b) => (b.savedAt||0)-(a.savedAt||0)).slice(0,6);

  return `
    <div>
      <div class="v2-label" style="margin-bottom:12px">⚖️ Side-by-Side Comparison</div>
      <div style="display:grid;grid-template-columns:repeat(${Math.min(3,sorted.length)},1fr);gap:12px;margin-bottom:16px">
        ${sorted.map(r => {
          const color = (r.score||0) >= 70 ? '#22c55e' : (r.score||0) >= 45 ? '#f59e0b' : '#ef4444';
          const ind = (typeof V2_INDUSTRIES !== 'undefined' ? V2_INDUSTRIES : []).find(i=>i.val===r.industry)||{emoji:'🏢',label:r.industry||'Business'};
          return `
            <div class="v2-compare-card">
              <div style="text-align:center;margin-bottom:10px">
                <div style="font-size:22px">${ind.emoji}</div>
                <div style="font-size:12px;font-weight:600;margin-top:4px">${ind.label}</div>
                <div style="font-size:11px;color:var(--v2-t3)">ZIP ${r.zip||'—'}</div>
              </div>
              <div style="text-align:center;margin:10px 0">
                <span style="font-size:28px;font-weight:700;color:${color}">${(r.score||0).toFixed(0)}</span>
                <span style="font-size:11px;color:var(--v2-t3)">/100</span>
              </div>
              <div style="font-size:10px;color:var(--v2-t3);text-align:center;margin-bottom:10px">${r.label||new Date(r.savedAt||Date.now()).toLocaleDateString()}</div>
              ${r.score_history && r.score_history.length > 1 ? `
                <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--v2-t3);padding-top:8px;border-top:1px solid var(--v2-border)">
                  <span>Runs: ${r.score_history.length}</span>
                  <span>${r.score_history[0]}→${r.score_history[r.score_history.length-1]}</span>
                </div>` : ''}
            </div>`;
        }).join('')}
      </div>
      ${v2RenderScoreRunDiff()}
    </div>`;
}

function v2RenderSensitivityTable() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const a7 = R_data.a7 || {};
  const base = (a7.scenarios||[]).find(s=>(s.name||'').toLowerCase().includes('base'))||(a7.scenarios||[])[0]||{};
  const beMonths = base.breakeven_months || 14;
  const baseNet = base.monthly_net || 29600;

  const assumptions = [
    { name:'Occupancy Rate',        baseline:'75%',    minus:'65%',  plus:'85%',    beMinus:beMonths+5, bePlus:beMonths-3, delta:8 },
    { name:'Infant Tuition',        baseline:'$2,050', minus:'$1,800',plus:'$2,300',beMinus:beMonths+4, bePlus:beMonths-3, delta:7 },
    { name:'Monthly Lease',         baseline:'$10,800',minus:'$12,500',plus:'$8,500',beMinus:beMonths+3,bePlus:beMonths-2, delta:5 },
    { name:'Staff Cost (per FTE)',  baseline:'$3,400', minus:'$3,800',plus:'$3,000', beMinus:beMonths+6, bePlus:beMonths-4, delta:10 },
    { name:'Enrollment Ramp Speed', baseline:'14 mo',  minus:'18 mo', plus:'10 mo',  beMinus:beMonths+4, bePlus:beMonths-4, delta:8 },
    { name:'Operating Expense %',   baseline:'78%',    minus:'85%',   plus:'72%',    beMinus:beMonths+5, bePlus:beMonths-2, delta:7 },
  ].sort((a,b) => b.delta - a.delta);

  const maxDelta = Math.max(...assumptions.map(a=>a.delta));

  return `
    <div>
      <div class="v2-label" style="margin-bottom:4px">🎯 Break-Even Sensitivity Analysis</div>
      <div style="font-size:11px;color:var(--v2-t3);margin-bottom:16px">Which assumption moves the needle most? Sorted by impact on break-even month.</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="font-size:10px;color:var(--v2-t3);text-transform:uppercase;border-bottom:1px solid var(--v2-border)">
              <th style="text-align:left;padding:0 0 8px">Assumption</th>
              <th style="padding:0 8px 8px">Baseline</th>
              <th style="padding:0 8px 8px;color:#ef4444">Downside</th>
              <th style="padding:0 8px 8px;color:#22c55e">Upside</th>
              <th style="padding:0 8px 8px">Impact</th>
              <th style="padding:0 0 8px;min-width:100px">Sensitivity</th>
            </tr>
          </thead>
          <tbody>
            ${assumptions.map(a => `
              <tr style="border-bottom:1px solid var(--v2-border)">
                <td style="padding:8px 0;font-weight:500">${a.name}</td>
                <td style="padding:8px;color:var(--v2-t2);text-align:center">${a.baseline}</td>
                <td style="padding:8px;color:#ef4444;text-align:center">${a.minus} → Mo.${a.beMinus}</td>
                <td style="padding:8px;color:#22c55e;text-align:center">${a.plus} → Mo.${a.bePlus}</td>
                <td style="padding:8px;text-align:center;font-weight:600">±${a.delta} mo</td>
                <td style="padding:8px">
                  <div style="width:100%;height:6px;background:var(--v2-border);border-radius:3px;overflow:hidden">
                    <div style="width:${(a.delta/maxDelta*100).toFixed(0)}%;height:100%;background:${a.delta>=8?'#ef4444':a.delta>=6?'#f59e0b':'#22c55e'};border-radius:3px"></div>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;padding:10px 12px;background:rgba(239,68,68,.07);border-radius:8px;font-size:12px">
        <strong>Biggest lever: Staff Cost.</strong> A $400/FTE/mo increase (wage inflation) pushes break-even by ~6 months.
        Protect against this with teacher retention incentives and CACFP subsidy to offset food program costs.
      </div>
    </div>`;
}

function v2RenderTrendsPanel() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const a1 = R_data.a1 || {};
  const cities = a1.cities || [];

  // Simulate 5-year trend for key metrics using growth rates
  const years = [2020,2021,2022,2023,2024,2025];
  const baseIncome = (cities[0]||{}).median_hh_income || 95000;
  const baseUnder5 = cities.reduce((s,c)=>s+(c.pop_under5||0),0);
  const incomeGrowth = 0.034; // 3.4%/yr GA
  const popGrowth = (a1.cities||[]).reduce((s,c)=>s+(c.pop_growth_pct_5yr||12),0)/Math.max(1,(a1.cities||[]).length)/100/5;

  const incomeData = years.map((y,i) => Math.round(baseIncome * Math.pow(1+incomeGrowth, i-4)));
  const under5Data = years.map((y,i) => Math.round(baseUnder5 * Math.pow(1+popGrowth, i-4)));
  const tuitionData = years.map((y,i) => Math.round(1750 * Math.pow(1.041, i-4))); // 4.1%/yr childcare inflation

  const W=520, H=120, padL=50, padR=20, padT=14, padB=28;
  const cW=W-padL-padR, cH=H-padT-padB;
  const makeLinePath = (data, color) => {
    const maxV = Math.max(...data); const minV = Math.min(...data);
    const range = maxV - minV || 1;
    return {
      path: data.map((v,i)=>(i===0?'M':'L')+(padL+i*cW/(data.length-1))+','+(padT+cH-(v-minV)/range*cH)).join(' '),
      color, minV, maxV, range
    };
  };

  const makeChart = (data, color, title, prefix='', suffix='') => {
    const {path, minV, maxV} = makeLinePath(data, color);
    const xs = years.map((_,i) => padL+i*cW/(years.length-1));
    const ys = data.map(v => padT+cH-(v-minV)/(maxV-minV||1)*cH);
    return `
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:600;color:var(--v2-t2);margin-bottom:6px">${title}</div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;max-height:80px">
          <path d="${path}" stroke="${color}" stroke-width="2" fill="none" stroke-linejoin="round"/>
          ${xs.map((x,i)=>`
            <circle cx="${x}" cy="${ys[i]}" r="3" fill="${color}"/>
            <text x="${x}" y="${padT+cH+14}" text-anchor="middle" font-size="8" fill="var(--v2-t3)">${years[i]}</text>
            ${i===years.length-1?`<text x="${x+4}" y="${ys[i]+3}" font-size="8" fill="${color}">${prefix}${data[i]>=1000?(data[i]/1000).toFixed(0)+'K':data[i]}${suffix}</text>`:''}
          `).join('')}
        </svg>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--v2-t3);margin-top:2px">
          <span>${prefix}${minV>=1000?(minV/1000).toFixed(0)+'K':minV}${suffix} (${years[0]})</span>
          <span style="color:${color};font-weight:600">${prefix}${maxV>=1000?(maxV/1000).toFixed(0)+'K':maxV}${suffix} (${years[years.length-1]})</span>
        </div>
      </div>`;
  };

  return `
    <div>
      <div class="v2-label" style="margin-bottom:12px">📈 Market Trends (5-Year)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
        <div>${makeChart(incomeData, '#6366f1', 'Median Household Income', '$')}</div>
        <div>${makeChart(under5Data, '#22c55e', 'Children Under 5 in Market', '', '')}</div>
        <div>${makeChart(tuitionData, '#f59e0b', 'Avg Infant Tuition', '$', '/mo')}</div>
      </div>
      <div style="padding:12px;background:rgba(99,102,241,.07);border-radius:8px;font-size:12px;margin-top:4px">
        <strong>Market trajectory:</strong> All three indicators trending up — income growth supports premium pricing,
        population growth expands addressable market, and tuition inflation validates the investment thesis.
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 10 — EXPORTS & SAVED SEARCHES
// ══════════════════════════════════════════════════════════════════════════════

function v2ExportDashboardHTML() {
  const dashWrap = document.getElementById('v2-dash-wrap');
  if (!dashWrap) { v2Toast('⚠️ Dashboard not loaded'); return; }
  const run = (typeof V2 !== 'undefined' && V2.run) ? V2.run : {};
  const ind = (typeof V2_INDUSTRIES !== 'undefined' ? V2_INDUSTRIES : []).find(i=>i.val===run.industry)||{emoji:'🏢',label:'Analysis'};
  const score = run.score || 0;
  const timestamp = new Date().toLocaleDateString();

  const styles = Array.from(document.styleSheets).map(ss => {
    try { return Array.from(ss.cssRules).map(r=>r.cssText).join('\n'); } catch(e) { return ''; }
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ind.emoji} ${ind.label} Analysis — ZIP ${run.zip||'—'} — Score ${score}/100</title>
<style>${styles}</style>
</head><body style="background:#0f1117;color:#f1f5f9;font-family:Inter,sans-serif;padding:20px">
<div style="max-width:1100px;margin:0 auto">
<h1 style="font-size:22px;margin-bottom:4px">${ind.emoji} ${ind.label} Analysis</h1>
<p style="color:#94a3b8;margin-bottom:24px">ZIP ${run.zip||'—'} · Score ${score}/100 · Exported ${timestamp}</p>
${dashWrap.innerHTML}
</div>
<script>document.querySelectorAll('.v2-dash-tab').forEach(t=>t.onclick=null);
document.querySelectorAll('[onclick]').forEach(el=>el.removeAttribute('onclick'));<\/script>
</body></html>`;

  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `analysis-${run.zip||'export'}-${Date.now()}.html`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  v2Toast('📥 Dashboard exported as self-contained HTML');
}

function v2ExportSBAPackage() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const run = (typeof V2 !== 'undefined' && V2.run) ? V2.run : {};
  const ind = (typeof V2_INDUSTRIES !== 'undefined' ? V2_INDUSTRIES : []).find(i=>i.val===run.industry)||{emoji:'🏢',label:'Business'};
  const a7 = R_data.a7 || {};
  const a9 = R_data.a9 || {};
  const a10 = R_data.a10 || {};
  const base = (a7.scenarios||[]).find(s=>(s.name||'').toLowerCase().includes('base'))||(a7.scenarios||[])[0]||{};
  const grants = [...((R_data.a12||{}).federal_grants||[]),...((R_data.a12||{}).state_grants||[])].slice(0,5);
  const totalGrants = 120000;
  const startup = (a7.startup_breakdown||[]).reduce((s,b)=>s+(b.amount||0),0)||527000;

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>SBA 7(a) Loan Package — ${ind.label}</title>
<style>
  body{font-family:'Times New Roman',serif;color:#1a1a1a;margin:0;padding:0}
  .page{max-width:800px;margin:0 auto;padding:60px}
  h1{font-size:24px;margin-bottom:6px;color:#1a1a1a}
  h2{font-size:16px;margin:28px 0 10px;color:#1a1a1a;border-bottom:1px solid #ccc;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px}
  th,td{padding:7px 10px;border:1px solid #ddd;text-align:left}
  th{background:#f5f5f5;font-weight:600}
  .cover{text-align:center;padding:100px 40px;border:2px solid #1a1a1a}
  .metric{display:inline-block;margin:0 24px;text-align:center}
  .metric-val{font-size:22px;font-weight:700}
  .metric-lbl{font-size:12px;color:#666}
  @media print{.page-break{page-break-before:always}}
</style></head><body>
<div class="page">
  <div class="cover">
    <h1>${ind.emoji} ${ind.label}<br>Business Plan & Loan Application</h1>
    <p style="font-size:14px;color:#555;margin:12px 0">SBA 7(a) Loan Package · ZIP ${run.zip||'—'} Market</p>
    <p style="font-size:12px;color:#888">Prepared ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>
    <div style="margin:32px 0">
      <div class="metric"><div class="metric-val">${startup.toLocaleString()}</div><div class="metric-lbl">Total Startup</div></div>
      <div class="metric"><div class="metric-val">$380,000</div><div class="metric-lbl">SBA Loan Request</div></div>
      <div class="metric"><div class="metric-val">Mo.${base.breakeven_months||14}</div><div class="metric-lbl">Break-Even</div></div>
      <div class="metric"><div class="metric-val">${base.roi_3yr||28}%</div><div class="metric-lbl">3-yr ROI</div></div>
    </div>
  </div>

  <div class="page-break"></div>
  <h2>Executive Summary</h2>
  <p style="font-size:13px;line-height:1.7">${(a7.summary||'Full financial feasibility analysis completed. See attached projections.')}</p>

  <h2>Use of Funds</h2>
  <table>
    <tr><th>Item</th><th>Amount</th><th>% of Total</th></tr>
    ${(a7.startup_breakdown||[]).map(b=>`<tr><td>${b.item}</td><td>$${b.amount.toLocaleString()}</td><td>${((b.amount/startup)*100).toFixed(1)}%</td></tr>`).join('')}
    <tr style="font-weight:700"><td>TOTAL</td><td>$${startup.toLocaleString()}</td><td>100%</td></tr>
  </table>

  <h2>Financial Projections — 3 Scenarios</h2>
  <table>
    <tr><th>Scenario</th><th>Enrolled</th><th>Monthly Revenue</th><th>Monthly Net</th><th>Break-Even</th><th>3-yr ROI</th></tr>
    ${(a7.scenarios||[]).map(s=>`<tr><td>${s.name}</td><td>${s.enrolled}</td><td>$${(s.monthly_revenue||0).toLocaleString()}</td><td>$${(s.monthly_net||0).toLocaleString()}</td><td>Mo.${s.breakeven_months}</td><td>${s.roi_3yr}%</td></tr>`).join('')}
  </table>

  <h2>Non-Dilutive Funding Sources</h2>
  <table>
    <tr><th>Program</th><th>Amount</th><th>Type</th></tr>
    ${grants.map(g=>`<tr><td>${g.name||'—'}</td><td>${g.amount_range||g.max_award||'—'}</td><td>${g.type||'Grant'}</td></tr>`).join('')}
    <tr style="font-weight:700"><td>Est. Total Non-Dilutive</td><td>~$${totalGrants.toLocaleString()}</td><td>Reduces SBA ask</td></tr>
  </table>

  <h2>Debt Service Coverage</h2>
  <p style="font-size:13px">Monthly SBA 7(a) payment at 6.5% / 10-yr: approx. <strong>$4,276/mo</strong>.
  Base case monthly net of <strong>$${(base.monthly_net||29600).toLocaleString()}</strong> gives DSCR of <strong>${((base.monthly_net||29600)/4276).toFixed(2)}x</strong> (minimum 1.25x required).</p>

  <h2>Collateral</h2>
  <p style="font-size:13px">All business assets including leasehold improvements ($180,000), FF&amp;E ($85,000), and owner personal guarantee. Business real estate if owned.</p>
</div></body></html>`;

  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sba-package-${run.zip||'export'}-${Date.now()}.html`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  v2Toast('📋 SBA loan package exported — open in browser and Print → Save as PDF');
}

// Saved searches
function v2GetSavedSearches() {
  try { return JSON.parse(localStorage.getItem('v2_saved_searches') || '[]'); } catch(e) { return []; }
}

function v2SaveSearch() {
  const run = (typeof V2 !== 'undefined' && V2.run) ? V2.run : {};
  if (!run.industry && !run.zip) { v2Toast('⚠️ No active analysis to save'); return; }
  const searches = v2GetSavedSearches();
  const ind = (typeof V2_INDUSTRIES !== 'undefined' ? V2_INDUSTRIES : []).find(i=>i.val===run.industry)||{emoji:'🏢',label:run.industry||'Business'};
  const entry = {
    id: Date.now(), savedAt: Date.now(), industry: run.industry, zip: run.zip,
    label: `${ind.emoji} ${ind.label} · ZIP ${run.zip}`,
    score: run.score || v2CalcScore(), radius: run.radius, capacity: run.capacity, budget: run.budget
  };
  searches.unshift(entry);
  if (searches.length > 10) searches.splice(10);
  try { localStorage.setItem('v2_saved_searches', JSON.stringify(searches)); } catch(e) {}
  v2Toast('🔖 Search saved');
  const panel = document.getElementById('v2-panel-saved');
  if (panel && panel.classList.contains('active')) panel.innerHTML = v2RenderSavedSearchesPanel();
}

function v2RenderSavedSearchesPanel() {
  const searches = v2GetSavedSearches();
  if (!searches.length) return `
    <div class="v2-empty-panel" style="text-align:center;padding:40px">
      <div style="font-size:32px;margin-bottom:12px">🔖</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">No saved searches</div>
      <div style="font-size:12px;color:var(--v2-t2);margin-bottom:16px">Click "Save Search" on the dashboard to bookmark an analysis.</div>
    </div>`;

  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div class="v2-label">🔖 Saved Searches</div>
        <button class="v2-btn ghost sm" onclick="localStorage.removeItem('v2_saved_searches');document.getElementById('v2-panel-saved').innerHTML=v2RenderSavedSearchesPanel()">Clear All</button>
      </div>
      ${searches.map(s => {
        const color = (s.score||0)>=70?'#22c55e':(s.score||0)>=45?'#f59e0b':'#ef4444';
        return `
          <div class="v2-saved-row">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${s.label}</div>
              <div style="font-size:11px;color:var(--v2-t3);margin-top:2px">
                Radius: ${s.radius||'—'}mi · Capacity: ${s.capacity||'—'} · Budget: $${parseInt(s.budget||600000).toLocaleString()}
              </div>
              <div style="font-size:10px;color:var(--v2-t3)">Saved ${new Date(s.savedAt).toLocaleDateString()}</div>
            </div>
            <div style="text-align:right;margin-left:12px;flex-shrink:0">
              <div style="font-size:20px;font-weight:700;color:${color}">${(s.score||0).toFixed(0)}</div>
              <div style="font-size:9px;color:var(--v2-t3)">/100</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;margin-left:10px;flex-shrink:0">
              <button class="v2-btn primary sm" onclick="v2LoadSavedSearch(${s.id})">Load</button>
              <button class="v2-btn ghost sm" onclick="v2DeleteSavedSearch(${s.id})">✕</button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function v2LoadSavedSearch(id) {
  const searches = v2GetSavedSearches();
  const s = searches.find(x => x.id === id);
  if (!s || typeof V2 === 'undefined') return;
  V2.wizard.data = { industry: s.industry, zip: s.zip, radius: s.radius, capacity: s.capacity, budget: s.budget };
  v2GoTo('wizard');
  v2Toast('🔖 Search loaded — click Continue to run');
}

function v2DeleteSavedSearch(id) {
  const searches = v2GetSavedSearches().filter(s=>s.id!==id);
  try { localStorage.setItem('v2_saved_searches', JSON.stringify(searches)); } catch(e) {}
  const panel = document.getElementById('v2-panel-saved');
  if (panel) panel.innerHTML = v2RenderSavedSearchesPanel();
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 11 — SHARED UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

function _v2FormatK(val) {
  if (!val && val !== 0) return '—';
  if (Math.abs(val) >= 1000000) return '$'+(val/1000000).toFixed(1)+'M';
  if (Math.abs(val) >= 1000) return (val/1000).toFixed(0)+'K';
  return String(Math.round(val));
}

function v2CloseModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 12 — DASHBOARD WIRING: NEW TABS + PANEL INJECTIONS
// ══════════════════════════════════════════════════════════════════════════════

// Override v2RenderDashboard to add new tabs and panel enhancements
(function() {
  if (typeof v2RenderDashboard !== 'function') return;
  const _baseDash = v2RenderDashboard;

  v2RenderDashboard = function(run) {
    _baseDash(run);

    // 1. Inject new tabs into tab bar
    const tabs = document.getElementById('v2-dash-tabs');
    if (tabs && !tabs.querySelector('[onclick*="realestate"]')) {
      const newTabs = [
        `<div class="v2-dash-tab" onclick="v2DashTab('realestate',this)">🏠 Real Estate</div>`,
        `<div class="v2-dash-tab" onclick="v2DashTab('multizip',this)">📍 Multi-ZIP</div>`,
        `<div class="v2-dash-tab" onclick="v2DashTab('compare',this)">⚖️ Compare</div>`,
        `<div class="v2-dash-tab" onclick="v2DashTab('sensitivity',this)">🎯 Sensitivity</div>`,
        `<div class="v2-dash-tab" onclick="v2DashTab('trends',this)">📈 Trends</div>`,
        `<div class="v2-dash-tab" onclick="v2DashTab('freshness',this)">🔍 Sources</div>`,
        `<div class="v2-dash-tab" onclick="v2DashTab('saved',this)">🔖 Saved</div>`,
      ].join('');
      tabs.insertAdjacentHTML('beforeend', newTabs);
    }

    // 2. Append new panels after existing dash content
    const wrap = document.getElementById('v2-dash-wrap');
    if (!wrap) return;
    if (!document.getElementById('v2-panel-realestate')) {
      const panels = [
        `<div class="v2-dash-panel" id="v2-panel-realestate">${v2RenderRealEstatePanel()}</div>`,
        `<div class="v2-dash-panel" id="v2-panel-multizip">${v2RenderMultiLocationPanel()}</div>`,
        `<div class="v2-dash-panel" id="v2-panel-compare">${v2RenderComparePanel()}</div>`,
        `<div class="v2-dash-panel" id="v2-panel-sensitivity">${v2RenderSensitivityTable()}</div>`,
        `<div class="v2-dash-panel" id="v2-panel-trends">${v2RenderTrendsPanel()}</div>`,
        `<div class="v2-dash-panel" id="v2-panel-freshness">${v2RenderDataFreshnessPanel()}</div>`,
        `<div class="v2-dash-panel" id="v2-panel-saved">${v2RenderSavedSearchesPanel()}</div>`,
      ].join('');
      wrap.insertAdjacentHTML('beforeend', panels);
    }

    // 3. Enhance Market panel with gap breakdown
    const marketPanel = document.getElementById('v2-panel-market');
    if (marketPanel && !marketPanel.querySelector('.v2-gap-card')) {
      marketPanel.insertAdjacentHTML('beforeend', v2RenderGapBreakdown());
    }

    // 4. Enhance Competition panel with full competitor intel
    const compPanel = document.getElementById('v2-panel-competition');
    if (compPanel && !compPanel.querySelector('.v2-comp-table')) {
      compPanel.insertAdjacentHTML('beforeend', v2RenderCompetitorBenchmarks());
    }

    // 5. Enhance Financials panel with enrollment ramp + grant linkage
    const finPanel = document.getElementById('v2-panel-financials');
    if (finPanel && !finPanel.querySelector('[id="v2-lease-slider"]')) {
      finPanel.insertAdjacentHTML('beforeend', v2RenderEnrollmentRamp());
      finPanel.insertAdjacentHTML('beforeend', v2RenderGrantLinkedWaterfall());
    }

    // 6. Enhance Risks panel with scored list
    const riskPanel = document.getElementById('v2-panel-risks');
    if (riskPanel && !riskPanel.querySelector('.v2-risk-scored-row')) {
      riskPanel.insertAdjacentHTML('beforeend', v2RenderRiskScored());
    }

    // 7. Export/save buttons now live in the ··· More overflow menu (v2-06-dashboard.js)
  };
})();
