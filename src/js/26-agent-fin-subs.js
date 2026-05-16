// ══════════════════════════════════════════════════════════
// FINANCIAL FEASIBILITY SUB-AGENTS  (26-agent-fin-subs.js)
// Replaces the single large Agent 7 call with 3 focused sub-
// calls: Revenue Model → Cost Model → Consolidation.
// Each call returns focused JSON; merged into R.a7 before
// calling renderAgent7(d).
// ══════════════════════════════════════════════════════════

async function runAgent7(a3, a4, a5, a1, a2) {
  setDot(7, 'running');
  if(demoMode&&typeof getDemoData==='function'){const _d=getDemoData(7);if(_d){R.a7=_d;try{renderAgent7(_d);}catch(e){}setDot(7,'done');showOut(7);return JSON.stringify(_d);}}
  const ind = industry();
  const base = `${ind.unit} · ${ind.capacity_label}: ${capacity()} · Budget $${parseInt(budget()).toLocaleString()} · ZIP ${zip()}`;
  const ctx3 = ctx(a3, ['summary', 'locations']);
  const ctx4 = ctx(a4, ['summary', 'listings', 'by_city_summary']);
  const ctx5 = ctx(a5, ['summary', 'requirements', 'timeline_phases']);
  // Pass demographics + gap analysis so pricing/revenue projections match
  // local income and demand levels (cross-agent consistency).
  const ctx1 = a1 ? ctx(a1, ['summary', 'cities'], 600) : '';
  const ctx2 = a2 ? ctx(a2, ['summary', 'cities', 'overall_opportunity_score'], 500) : '';

  // ── Real economic data injection ──────────────────────────
  const _rdCtx7 = typeof buildRealDataCtx === 'function'
    ? buildRealDataCtx(['demographics','wages','macro','rents','energy_rates','energy_state','flood','climate'])
    : '';

  // ── Sub-call A: Revenue Model ───────────────────────────
  $('7-s-t').textContent = '';
  $('7-sc-c').innerHTML = subProgress(1, 3, 'Sub-agent 1/3: Revenue Model…');

  const sysA = `You are a financial analyst specializing in ${ind.unit} revenue modeling. Return JSON only.`;
  const usrA = (_rdCtx7 ? _rdCtx7 + '\n' : '') +
  `Build a detailed revenue model for a ${base}.
DEMOGRAPHICS (use median income for pricing realism): ${ctx1}
GAP ANALYSIS (use demand strength for capacity): ${ctx2}
SITE RECOMMENDATIONS: ${ctx3}
REAL ESTATE: ${ctx4}

Return ONLY:
{
  "selected_site": {
    "city": "string",
    "address": "string",
    "monthly_rent": 0,
    "sqft": 0,
    "rationale": "2-sentence why this site was chosen for financial modeling"
  },
  "revenue_streams": [
    {
      "name": "Stream name",
      "unit_price": 0,
      "units_per_month": 0,
      "monthly_revenue": 0,
      "annual_revenue": 0,
      "occupancy_rate_pct": 0,
      "notes": "What drives this revenue"
    }
  ],
  "capacity_scenarios": [
    {"name": "Conservative", "label": "60% Capacity", "units": 0, "monthly_revenue": 0},
    {"name": "Base Case",    "label": "78% Capacity", "units": 0, "monthly_revenue": 0},
    {"name": "Optimistic",  "label": "93% Capacity", "units": 0, "monthly_revenue": 0}
  ],
  "revenue_assumptions": [
    "Assumption 1 with data source",
    "Assumption 2",
    "Assumption 3"
  ]
}`;

  const revModel = await claudeJSON(sysA, usrA, {webSearch:true}) || {};

  // ── Sub-call B: Cost Model ──────────────────────────────
  $('7-sc-c').innerHTML = subProgress(2, 3, 'Sub-agent 2/3: Cost Model…');

  const sysB = `You are a financial analyst specializing in ${ind.unit} cost structures. Return JSON only.`;
  const usrB = (_rdCtx7 ? _rdCtx7 + '\n' : '') +
  `Build a detailed cost model for a ${base}.
SELECTED SITE: ${JSON.stringify(revModel.selected_site || {})}
REGULATORY: ${ctx5}

Return ONLY:
{
  "one_time_startup_costs": [
    {
      "item": "Cost name",
      "amount": 0,
      "category": "Real Estate|Construction|Equipment|Legal|Marketing|Working Capital",
      "notes": "What drives this number",
      "is_negotiable": true
    }
  ],
  "fixed_monthly_costs": [
    {
      "item": "Cost name",
      "amount": 0,
      "annual": 0,
      "notes": "Fixed regardless of volume — must cover at 0% occupancy"
    }
  ],
  "variable_monthly_costs": [
    {
      "item": "Cost name",
      "amount_at_base_case": 0,
      "scales_with": "occupancy|revenue|staffing",
      "notes": "How this cost scales"
    }
  ],
  "total_startup": 0,
  "total_fixed_monthly": 0,
  "total_variable_at_base": 0
}`;

  const costModel = await claudeJSON(sysB, usrB, {webSearch:true}) || {};

  // ── Main Consolidating Call ─────────────────────────────
  $('7-sc-c').innerHTML = subProgress(3, 3, 'Consolidating…');

  const sysMain = `You are a ${ind.unit} financial analyst. Respond JSON only with realistic numbers.`;
  const usrMain = `Consolidate these revenue and cost models into a full financial feasibility analysis for a ${base}.

REVENUE MODEL: ${JSON.stringify(revModel)}
COST MODEL: ${JSON.stringify(costModel)}

Return ONLY:
{
  "summary": "4-5 sentence financial assessment using specific numbers from revenue and cost models",
  "selected_site_summary": "City, address, monthly rent, rationale",
  "total_startup_cost": 0,
  "scenarios": [
    {
      "name": "Conservative", "label": "60% Capacity", "enrolled": 0,
      "monthly_revenue": 0, "monthly_expenses": 0, "monthly_net": 0,
      "annual_net": 0, "breakeven_months": 0, "roi_3yr": 0, "color": "var(--red)"
    },
    {
      "name": "Base Case",    "label": "78% Capacity", "enrolled": 0,
      "monthly_revenue": 0, "monthly_expenses": 0, "monthly_net": 0,
      "annual_net": 0, "breakeven_months": 0, "roi_3yr": 0, "color": "var(--amber)"
    },
    {
      "name": "Optimistic",   "label": "93% Capacity", "enrolled": 0,
      "monthly_revenue": 0, "monthly_expenses": 0, "monthly_net": 0,
      "annual_net": 0, "breakeven_months": 0, "roi_3yr": 0, "color": "var(--green)"
    }
  ],
  "projections": [
    {"month": "M1",  "rev": 0, "exp": 0, "cum": 0},
    {"month": "M3",  "rev": 0, "exp": 0, "cum": 0},
    {"month": "M6",  "rev": 0, "exp": 0, "cum": 0},
    {"month": "M9",  "rev": 0, "exp": 0, "cum": 0},
    {"month": "M12", "rev": 0, "exp": 0, "cum": 0},
    {"month": "M15", "rev": 0, "exp": 0, "cum": 0},
    {"month": "M18", "rev": 0, "exp": 0, "cum": 0},
    {"month": "M21", "rev": 0, "exp": 0, "cum": 0},
    {"month": "M24", "rev": 0, "exp": 0, "cum": 0},
    {"month": "M30", "rev": 0, "exp": 0, "cum": 0}
  ],
  "by_city_financials": [
    {
      "city": "string", "monthly_rent": 0, "avg_primary_rate": 0,
      "break_even_enrolled": 0, "yr1_net": 0, "yr3_net": 0, "site_rank": 1
    }
  ],
  "funding": [
    {
      "source": "SBA 7(a) Loan", "amount": 0, "terms": "string",
      "monthly_payment": 0, "notes": "string"
    }
  ],
  "startup_breakdown": [{"item": "string", "amount": 0, "category": "string"}],
  "monthly_ops":       [{"item": "string", "amount": 0}],
  "one_time_startup_costs":  [],
  "fixed_monthly_costs":     [],
  "variable_monthly_costs":  []
}`;

  try {
    let main = await claudeJSON(sysMain, usrMain);
    if (!main) { console.warn('Agent 7 consolidation fallback'); main = getFallback7(); }

    // Merge sub-model arrays into result so renderAgent7 can use them.
    // Only overwrite when sub-model returned non-empty data, otherwise keep
    // whatever the consolidation call (or fallback) already populated.
    const nonEmpty = a => Array.isArray(a) && a.length > 0;
    if (costModel && nonEmpty(costModel.one_time_startup_costs))  main.one_time_startup_costs  = costModel.one_time_startup_costs;
    else if (!Array.isArray(main.one_time_startup_costs))         main.one_time_startup_costs  = [];
    if (costModel && nonEmpty(costModel.fixed_monthly_costs))     main.fixed_monthly_costs     = costModel.fixed_monthly_costs;
    else if (!Array.isArray(main.fixed_monthly_costs))            main.fixed_monthly_costs     = [];
    if (costModel && nonEmpty(costModel.variable_monthly_costs))  main.variable_monthly_costs  = costModel.variable_monthly_costs;
    else if (!Array.isArray(main.variable_monthly_costs))         main.variable_monthly_costs  = [];
    if (revModel) {
      main.selected_site       = revModel.selected_site       || main.selected_site || null;
      if (nonEmpty(revModel.revenue_streams))     main.revenue_streams     = revModel.revenue_streams;
      else if (!Array.isArray(main.revenue_streams))             main.revenue_streams     = [];
      if (nonEmpty(revModel.revenue_assumptions)) main.revenue_assumptions = revModel.revenue_assumptions;
      else if (!Array.isArray(main.revenue_assumptions))         main.revenue_assumptions = [];
    }

    R.a7 = main;
    renderAgent7(main);
    setDot(7, 'done');
    showOut(7);
    return JSON.stringify(main);
  } catch (e) {
    setDot(7, 'error');
    showOut(7);
    $('7-sc-c').innerHTML = `<div class="prose" style="color:var(--red)">Error: ${e.message}</div>`;
    throw e;
  }
}

function renderAgent7(d) {
  if (!d) return;
  const ind7 = industry();

  // ── Summary text ───────────────────────────────────────
  $('7-s-t').textContent = d.summary || '';
  // Inject real economic data provenance badge
  if (typeof rdRenderFinancialBadge === 'function') rdRenderFinancialBadge('7-s-t');

  // ── Selected Site callout ──────────────────────────────
  const site = d.selected_site || {};
  const siteHtml = (site.city || d.selected_site_summary)
    ? `<div style="background:var(--surface2);border:1px solid var(--blue);border-radius:10px;padding:14px 16px;margin-bottom:16px;display:flex;flex-direction:column;gap:6px">
        <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--blue);text-transform:uppercase;letter-spacing:0.08em">Selected Site</div>
        <div style="font-size:15px;font-weight:700;font-family:'Syne',sans-serif">${site.city || ''}${site.address ? ' · ' + site.address : ''}</div>
        ${site.monthly_rent ? `<div style="font-size:12px;color:var(--muted)">Rent: <strong style="color:var(--text)">$${(site.monthly_rent || 0).toLocaleString()}/mo</strong>${site.sqft ? ' · ' + (site.sqft || 0).toLocaleString() + ' sqft' : ''}</div>` : ''}
        ${site.rationale ? `<div style="font-size:12px;color:var(--muted);line-height:1.6">${site.rationale}</div>` : (d.selected_site_summary ? `<div style="font-size:12px;color:var(--muted)">${d.selected_site_summary}</div>` : '')}
      </div>`
    : '';

  // ── Startup costs table ────────────────────────────────
  const catBadge = {'Real Estate':'b-blue','Construction':'b-amber','Equipment':'b-green','Legal':'b-purple','Marketing':'b-blue','Working Capital':'b-amber','Insurance':'b-red','Technology':'b-blue','Operations':'b-green'};
  const startupItems = (d.one_time_startup_costs && d.one_time_startup_costs.length)
    ? d.one_time_startup_costs
    : (d.startup_breakdown || []).map(i => ({item: i.item, amount: i.amount, category: i.category, notes: '', is_negotiable: false}));
  const startupTotal = startupItems.reduce((s, i) => s + (i.amount || 0), 0);

  let startupHtml = '';
  if (startupItems.length) {
    startupHtml = `<div style="margin-bottom:12px;padding:10px 14px;background:var(--surface2);border-radius:8px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:13px;font-weight:700;font-family:'Syne',sans-serif">Total Startup Investment</div>
      <div style="font-size:22px;font-weight:700;font-family:'Syne',sans-serif;color:var(--amber)">$${(d.total_startup_cost || startupTotal).toLocaleString()}</div>
    </div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Amount</th><th>Category</th><th>Notes</th></tr></thead><tbody>`;
    startupItems.forEach(item => {
      const bc = catBadge[item.category] || 'b-blue';
      startupHtml += `<tr>
        <td><strong>${item.item || ''}</strong>${item.is_negotiable ? ' <span class="badge b-green" style="font-size:9px">negotiable</span>' : ''}</td>
        <td style="color:var(--amber);font-weight:700">$${(item.amount || 0).toLocaleString()}</td>
        <td><span class="badge ${bc}">${item.category || ''}</span></td>
        <td style="font-size:11px;color:var(--muted)">${item.notes || ''}</td>
      </tr>`;
    });
    startupHtml += `</tbody></table></div>`;
  }

  // ── Fixed vs Variable costs side-by-side ──────────────
  const fixedItems    = d.fixed_monthly_costs    || [];
  const variableItems = d.variable_monthly_costs || [];
  const fixedTotal    = fixedItems.reduce((s, i) => s + (i.amount || 0), 0);
  const varTotal      = variableItems.reduce((s, i) => s + (i.amount_at_base_case || 0), 0);
  const scaleBadge    = {'occupancy':'b-blue','revenue':'b-green','staffing':'b-amber'};

  let costsHtml = '';
  if (fixedItems.length || variableItems.length) {
    costsHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">`;

    // Fixed
    costsHtml += `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Fixed Monthly — $${fixedTotal.toLocaleString()}/mo</div>
      <div style="display:grid;gap:6px">`;
    fixedItems.forEach(item => {
      costsHtml += `<div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:12px;gap:8px">
        <div>
          <div>${item.item || ''}</div>
          ${item.notes ? `<div style="font-size:10px;color:var(--muted)">${item.notes}</div>` : ''}
        </div>
        <strong style="color:var(--text);white-space:nowrap">$${(item.amount || 0).toLocaleString()}</strong>
      </div>`;
    });
    costsHtml += `</div></div>`;

    // Variable
    costsHtml += `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px">Variable Monthly @ Base — $${varTotal.toLocaleString()}/mo</div>
      <div style="display:grid;gap:6px">`;
    variableItems.forEach(item => {
      const sb = scaleBadge[item.scales_with] || 'b-blue';
      costsHtml += `<div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:12px;gap:8px">
        <div>
          <div>${item.item || ''} <span class="badge ${sb}" style="font-size:9px">${item.scales_with || ''}</span></div>
          ${item.notes ? `<div style="font-size:10px;color:var(--muted)">${item.notes}</div>` : ''}
        </div>
        <strong style="color:var(--text);white-space:nowrap">$${(item.amount_at_base_case || 0).toLocaleString()}</strong>
      </div>`;
    });
    costsHtml += `</div></div></div>`;
  }

  // Inject site callout + startup costs + cost breakdown into scenario container
  // (We prepend to the scenarios section by using the summary area for site info)
  $('7-sc-c').innerHTML = '';

  // Build a combined pre-scenarios block in the summary area
  const preBlock = document.createElement('div');
  preBlock.innerHTML = siteHtml + startupHtml + costsHtml;
  $('7-sc-c').appendChild(preBlock);

  // ── Scenarios grid ─────────────────────────────────────
  let sc = `<div class="scenario-grid">`;
  (d.scenarios || []).forEach(s => {
    sc += `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">${s.name || ''}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${s.label || ''} · ${s.enrolled || 0} enrolled</div>
      <div style="font-size:24px;font-weight:700;font-family:'Syne',sans-serif;color:${s.color || 'var(--text)'};margin-bottom:10px">$${(s.monthly_net >= 0 ? '+' : '')}${(s.monthly_net || 0).toLocaleString()}<span style="font-size:12px">/mo</span></div>
      <div style="display:grid;gap:4px;font-size:11px">
        <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Monthly revenue</span><strong>$${(s.monthly_revenue || 0).toLocaleString()}</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Monthly expenses</span><strong>$${(s.monthly_expenses || 0).toLocaleString()}</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Break-even</span><strong>${s.breakeven_months || '—'} months</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">3yr ROI</span><strong style="color:${s.color || 'var(--text)'}">${(s.roi_3yr || 0) > 0 ? '+' : ''}${s.roi_3yr || 0}%</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Annual net</span><strong style="color:${s.color || 'var(--text)'}">$${(s.annual_net >= 0 ? '+' : '')}${(s.annual_net || 0).toLocaleString()}</strong></div>
      </div>
    </div>`;
  });
  sc += `</div>`;
  $('7-sc-c').innerHTML += sc;

  // ── P&L Chart ──────────────────────────────────────────
  killChart('ch-7');
  const ctxEl = $('ch-7');
  if (ctxEl) {
    const proj7 = d.projections || [];
    charts['ch-7'] = new Chart(ctxEl.getContext('2d'), {
      type: 'line',
      data: {
        labels: proj7.map(p => p.month),
        datasets: [
          {label: 'Revenue',      data: proj7.map(p => p.rev), borderColor: '#3dd68c', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 2},
          {label: 'Expenses',     data: proj7.map(p => p.exp), borderColor: '#ff5f5f', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 2},
          {label: 'Cumulative P&L', data: proj7.map(p => p.cum), borderColor: '#4a9eff', tension: 0.4, fill: true, backgroundColor: 'rgba(74,158,255,0.08)', pointRadius: 3, borderWidth: 2, yAxisID: 'y2'}
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {legend: {labels: {color: '#8a8d96', font: {size: 11}}}},
        scales: {
          x:  {ticks: {color: '#8a8d96', font: {size: 9}}, grid: {color: '#2a2d35'}},
          y:  {ticks: {color: '#8a8d96', callback: v => '$' + (v / 1000).toFixed(0) + 'k'}, grid: {color: '#2a2d35'}, position: 'left'},
          y2: {ticks: {color: '#4a9eff', callback: v => '$' + (v / 1000).toFixed(0) + 'k'}, grid: {display: false}, position: 'right'}
        }
      }
    });
  }

  // ── By-city comparison table ───────────────────────────
  let tbl = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th>City</th><th>Monthly Rent</th><th>Avg ${ind7.price_label_primary || 'Primary Rate'}</th>
    <th>Break-Even Enrolled</th><th>Yr 1 Net</th><th>Yr 3 Net</th><th>Site Rank</th>
  </tr></thead><tbody>`;
  (d.by_city_financials || []).forEach(c => {
    const n1b = (c.yr1_net || 0) >= 0 ? 'b-green' : 'b-red';
    const n3b = (c.yr3_net || 0) >= 0 ? 'b-green' : 'b-red';
    tbl += `<tr>
      <td><strong>${c.city || ''}</strong></td>
      <td>$${(c.monthly_rent || 0).toLocaleString()}</td>
      <td>$${(c.avg_primary_rate || c.avg_infant_tuition || 0).toLocaleString()}</td>
      <td>${c.break_even_enrolled || '—'}</td>
      <td><span class="badge ${n1b}">$${(c.yr1_net || 0).toLocaleString()}</span></td>
      <td><span class="badge ${n3b}">$${(c.yr3_net || 0).toLocaleString()}</span></td>
      <td>${c.site_rank ? '#' + c.site_rank : '—'}</td>
    </tr>`;
  });
  tbl += `</tbody></table></div>`;
  $('7-t-c').innerHTML = tbl;
}
