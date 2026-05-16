// ══════════════════════════════════════════════════════════
// BUILD VS BUY AGENT  (27-agent-buildvsbuy.js)
// Agent 16 — 3 sub-calls: Property Listings → Build/Buy
// Analysis → Recommendation. Merged into R.a16 and rendered
// in card out-16 with 5 tabs.
// ══════════════════════════════════════════════════════════

async function runAgent16(a3, a4, a7, a8) {
  // Demo mode early return
  if (demoMode && typeof getDemoData === 'function') {
    const _d = getDemoData(16);
    if (_d) { R.a16 = _d; try { renderAgent16(_d); } catch(e) {} setDot(16,'done'); showOut(16); return JSON.stringify(_d); }
  }
  setDot(16, 'running');
  showOut(16);
  try {
  const ind = industry();
  const base = `${ind.unit} · ${ind.capacity_label}: ${capacity()} · Budget $${parseInt(budget()).toLocaleString()} · ZIP ${zip()}`;
  const ctx3 = ctx(a3, ['summary', 'locations']);
  const ctx7 = ctx(a7, ['summary', 'total_startup_cost', 'scenarios', 'selected_site']);
  const ctx8 = ctx(a8, ['verdict', 'verdict_rationale', 'assessment']);

  const outEl = $('out-16');
  if (outEl) {
    outEl.innerHTML = `<div style="padding:16px">${subProgress(1, 3, 'Sub-agent 1/3: Property Listings…')}</div>`;
  }

  // ── Sub-call A: Property Listings ───────────────────────
  const sysA = `You are a commercial real estate broker and business acquisition specialist for ${ind.unit} businesses. Return JSON only.`;
  const usrA = `Find real businesses or properties available to BUY — existing ${ind.unit} businesses for sale — matching this criteria: ${base}.
SITE CONTEXT: ${ctx3}

Return ONLY:
{
  "buy_listings": [
    {
      "title": "Business name or property description",
      "city": "string",
      "asking_price": 0,
      "annual_revenue": 0,
      "annual_net": 0,
      "sqft": 0,
      "listed_since": "Month Year",
      "match_score": 8,
      "match_reasons": ["Why this is a strong match"],
      "gaps": ["What would need to change or require investment"],
      "search_url": "https://bizbuysell.com/search?q=... or https://www.loopnet.com/search/... relevant to industry and ZIP",
      "broker": "Broker name and phone if known"
    }
  ],
  "buy_summary": "2-sentence summary of the acquisition landscape for this business type and market"
}`;

  // (No _setDemoKey here — demo path already returned above. Live path uses
  // real claudeJSON calls for all three sub-agents.)
  const listingsData = await claudeJSON(sysA, usrA, {webSearch:true});

  // ── Sub-call B: Build Analysis ──────────────────────────
  if (outEl) {
    outEl.innerHTML = `<div style="padding:16px">${subProgress(2, 3, 'Sub-agent 2/3: Build vs Buy Analysis…')}</div>`;
  }

  const _rdCtx16 = (typeof buildRealDataCtx === 'function')
    ? buildRealDataCtx(['rents','wages','macro','hud_fmr','bls_oes','rural_urban','opportunity_zone','bea_income'])
    : '';

  const sysB = `You are a business strategy consultant specializing in ${ind.unit} startups and acquisitions. Return JSON only.`;
  const usrB = `${_rdCtx16 ? _rdCtx16 + '\n\n' : ''}Analyze the build-from-scratch vs acquisition paths for a ${base}.
FINANCIALS: ${ctx7}
LISTINGS LANDSCAPE: ${JSON.stringify((listingsData || {}).buy_summary || '')}

Return ONLY:
{
  "build_analysis": {
    "timeline_months": 18,
    "total_investment": 0,
    "year1_revenue": 0,
    "year3_net": 0,
    "pros": ["Pro 1 with specific detail", "Pro 2", "Pro 3", "Pro 4"],
    "cons": ["Con 1 with specific detail", "Con 2", "Con 3"],
    "key_risks": ["Risk 1 with mitigation", "Risk 2", "Risk 3"]
  },
  "buy_analysis": {
    "typical_asking_price": 0,
    "acquisition_costs": 0,
    "renovation_estimate": 0,
    "total_investment": 0,
    "time_to_revenue_months": 3,
    "year1_revenue": 0,
    "year3_net": 0,
    "pros": ["Pro 1 with specific detail", "Pro 2", "Pro 3", "Pro 4"],
    "cons": ["Con 1 with specific detail", "Con 2", "Con 3"],
    "key_risks": ["Risk 1 with mitigation", "Risk 2", "Risk 3"]
  }
}`;

  const analysisData = await claudeJSON(sysB, usrB, {webSearch:true});

  // ── Sub-call C: Recommendation ──────────────────────────
  if (outEl) {
    outEl.innerHTML = `<div style="padding:16px">${subProgress(3, 3, 'Sub-agent 3/3: Recommendation…')}</div>`;
  }

  const sysC = `You are a senior business strategy advisor. Return JSON only.`;
  const usrC = `Produce a final recommendation for build vs buy for a ${base}.
BUILD ANALYSIS: ${JSON.stringify((analysisData || {}).build_analysis || {})}
BUY ANALYSIS:   ${JSON.stringify((analysisData || {}).buy_analysis  || {})}
MARKET CONTEXT: ${ctx8}

Return ONLY:
{
  "recommendation": "Build|Buy|Lease-to-Own",
  "recommendation_rationale": "3-4 sentence detailed reasoning with specific numbers comparing both paths",
  "financial_comparison": {
    "build_total_investment": 0,
    "buy_total_investment": 0,
    "build_break_even_months": 0,
    "buy_break_even_months": 0,
    "build_year3_net": 0,
    "buy_year3_net": 0,
    "winner": "Build|Buy",
    "winner_margin_pct": 15
  },
  "decision_factors": [
    {"factor": "Time to market",       "build": "18 months",        "buy": "3-6 months",          "winner": "Buy",   "weight": "High"},
    {"factor": "Total investment",      "build": "$X",               "buy": "$Y",                  "winner": "Build", "weight": "High"},
    {"factor": "Brand/location control","build": "Full control",     "buy": "Inherit existing",    "winner": "Build", "weight": "Medium"},
    {"factor": "Revenue ramp",          "build": "Slow (12-18 mo)",  "buy": "Immediate",           "winner": "Buy",   "weight": "High"},
    {"factor": "Customization",         "build": "Full",             "buy": "Limited by layout",   "winner": "Build", "weight": "Medium"}
  ],
  "next_steps": [
    "Step 1 with specific action",
    "Step 2",
    "Step 3"
  ]
}`;

  const recData = await claudeJSON(sysC, usrC);

  // ── Merge & store ───────────────────────────────────────
  const merged = Object.assign(
    {},
    listingsData  || {},
    analysisData  || {},
    recData       || {}
  );
  R.a16 = merged;

  renderAgent16(merged);
  setDot(16, 'done');
  return JSON.stringify(merged);
  } catch(e) {
    console.error('Agent 16 failed:', e.message);
    setDot(16, 'error');
    const outEl16 = $('out-16');
    if (outEl16) outEl16.innerHTML = `<div class="prose" style="color:var(--red);padding:16px">Build vs Buy analysis unavailable: ${e.message}</div>`;
    throw e;
  }
}

function renderAgent16(d) {
  if (!d) return;
  const out = $('out-16');
  if (!out) return;

  const rec       = d.recommendation       || 'Build';
  const rationale = d.recommendation_rationale || '';
  const fc        = d.financial_comparison  || {};
  const factors   = d.decision_factors     || [];
  const steps     = d.next_steps           || [];
  const listings  = d.buy_listings         || [];
  const buildA    = d.build_analysis       || {};
  const buyA      = d.buy_analysis         || {};

  const recColor  = rec === 'Buy' ? 'var(--blue)' : rec === 'Lease-to-Own' ? 'var(--amber)' : 'var(--green)';
  const recBadge  = rec === 'Buy' ? 'b-blue'      : rec === 'Lease-to-Own' ? 'b-amber'      : 'b-green';
  const weightBadge = w => w === 'High' ? 'b-red' : w === 'Medium' ? 'b-amber' : 'b-blue';
  const winnerBadge = (w, side) => w === side ? 'b-green' : 'b-red';

  // ── Tab shell ───────────────────────────────────────────
  // IMPORTANT: panels must NOT have display:flex/block in their inline style —
  // the global tab() function toggles visibility via .panel / .panel.active CSS
  // rules (display:none / display:block). Any inline display: overrides that.
  out.innerHTML = `
    <div class="tabs">
      <button class="tab active"  onclick="tab('16','sum')">Summary</button>
      <button class="tab"         onclick="tab('16','listings')">Listings (Buy)</button>
      <button class="tab"         onclick="tab('16','bvb')">Build vs Buy</button>
      <button class="tab"         onclick="tab('16','matrix')">Decision Matrix</button>
      <button class="tab"         onclick="tab('16','steps')">Next Steps</button>
    </div>

    <div id="16-sum" class="panel active">
      <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:11px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Recommendation</span>
          <span class="badge ${recBadge}" style="font-size:13px;padding:4px 12px">${rec}</span>
        </div>
        <div style="font-size:13px;line-height:1.7;color:var(--muted)">${rationale}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${_stat16('Build Investment', '$' + (fc.build_total_investment || 0).toLocaleString(), 'var(--text)')}
          ${_stat16('Buy Investment',   '$' + (fc.buy_total_investment   || 0).toLocaleString(), 'var(--text)')}
          ${_stat16('Winner Advantage', (fc.winner_margin_pct || 0) + '% better', recColor)}
          ${_stat16('Build Break-Even', (fc.build_break_even_months || '—') + ' mo', 'var(--text)')}
          ${_stat16('Buy Break-Even',   (fc.buy_break_even_months   || '—') + ' mo', 'var(--text)')}
          ${_stat16('Winner',           fc.winner || rec, recColor)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${_finCard16('Build — Yr 3 Net', fc.build_year3_net || buildA.year3_net || 0, 'var(--green)')}
          ${_finCard16('Buy — Yr 3 Net',   fc.buy_year3_net   || buyA.year3_net   || 0, 'var(--blue)')}
        </div>
      </div>
    </div>

    <div id="16-listings" class="panel">
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        ${listings.length
          ? listings.map(l => _listingCard16(l)).join('')
          : `<div class="prose" style="color:var(--muted)">No specific listings found. Use the search URLs below to browse active listings.<br><br>
             <a href="https://www.bizbuysell.com/childcare-businesses-for-sale/" target="_blank" class="link-btn">BizBuySell</a>
             &nbsp;<a href="https://www.loopnet.com/" target="_blank" class="link-btn">LoopNet</a></div>`}
        ${(d.buy_summary || '') ? `<div style="padding:10px 14px;background:var(--surface2);border-radius:8px;border:1px solid var(--border);font-size:12px;color:var(--muted)">${d.buy_summary}</div>` : ''}
      </div>
    </div>

    <div id="16-bvb" class="panel">
      <div style="padding:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${_bvbCard16('Build from Scratch', buildA, 'var(--green)', 'b-green')}
          ${_bvbCard16('Buy / Acquire',      buyA,   'var(--blue)',  'b-blue')}
        </div>
      </div>
    </div>

    <div id="16-matrix" class="panel">
      <div style="padding:16px">
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Factor</th><th>Build</th><th>Buy</th><th>Winner</th><th>Weight</th></tr></thead>
          <tbody>
            ${factors.map(f => `<tr>
              <td><strong>${f.factor || ''}</strong></td>
              <td style="font-size:12px">${f.build || ''}</td>
              <td style="font-size:12px">${f.buy   || ''}</td>
              <td><span class="badge b-green">${f.winner || ''}</span></td>
              <td><span class="badge ${weightBadge(f.weight)}">${f.weight || ''}</span></td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    </div>

    <div id="16-steps" class="panel">
      <div style="padding:16px">
        <ol style="display:flex;flex-direction:column;gap:10px;padding-left:0;list-style:none;margin:0">
          ${steps.map((s, i) => `<li style="display:flex;gap:12px;align-items:flex-start">
            <span style="background:var(--blue);color:#fff;border-radius:50%;width:24px;height:24px;min-width:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Syne',sans-serif">${i + 1}</span>
            <span style="font-size:13px;line-height:1.7;color:var(--text)">${s}</span>
          </li>`).join('')}
        </ol>
      </div>
    </div>`;

  // activate first tab
  tab('16', 'sum');
}

function _stat16(label, value, color) {
  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px">
    <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">${label}</div>
    <div style="font-size:16px;font-weight:700;font-family:'Syne',sans-serif;color:${color}">${value}</div>
  </div>`;
}

function _finCard16(label, amount, color) {
  const pos = amount >= 0;
  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:12px;color:var(--muted)">${label}</div>
    <div style="font-size:18px;font-weight:700;font-family:'Syne',sans-serif;color:${color}">${pos ? '+' : ''}$${amount.toLocaleString()}</div>
  </div>`;
}

function _listingCard16(l) {
  const score = Math.min(10, Math.max(0, l.match_score || 0));
  const scorePct = (score / 10 * 100).toFixed(0);
  const scoreColor = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--amber)' : 'var(--red)';
  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
      <div>
        <div style="font-size:14px;font-weight:700;font-family:'Syne',sans-serif">${l.title || ''}</div>
        <div style="font-size:11px;color:var(--muted)">${l.city || ''}${l.listed_since ? ' · Listed ' + l.listed_since : ''}${l.sqft ? ' · ' + l.sqft.toLocaleString() + ' sqft' : ''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:700;font-family:'Syne',sans-serif;color:var(--amber)">$${(l.asking_price || 0).toLocaleString()}</div>
        ${l.annual_revenue ? `<div style="font-size:10px;color:var(--muted)">Rev: $${l.annual_revenue.toLocaleString()}/yr</div>` : ''}
        ${l.annual_net     ? `<div style="font-size:10px;color:var(--green)">Net: $${l.annual_net.toLocaleString()}/yr</div>` : ''}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <div style="font-size:10px;color:var(--muted)">Match</div>
      <div style="flex:1;height:5px;background:var(--surface3);border-radius:3px;overflow:hidden">
        <div style="width:${scorePct}%;height:100%;background:${scoreColor};border-radius:3px"></div>
      </div>
      <div style="font-size:12px;font-weight:700;color:${scoreColor}">${score}/10</div>
    </div>
    ${(l.match_reasons || []).length ? `<div style="display:flex;flex-direction:column;gap:3px">
      ${l.match_reasons.map(r => `<div style="font-size:11px;color:var(--green)">+ ${r}</div>`).join('')}
    </div>` : ''}
    ${(l.gaps || []).length ? `<div style="display:flex;flex-direction:column;gap:3px">
      ${l.gaps.map(g => `<div style="font-size:11px;color:var(--amber)">△ ${g}</div>`).join('')}
    </div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      ${l.search_url ? `<a href="${l.search_url}" target="_blank" class="link-btn" style="font-size:11px">↗ View Listing</a>` : ''}
      ${l.broker     ? `<span style="font-size:11px;color:var(--muted)">Broker: ${l.broker}</span>` : ''}
    </div>
  </div>`;
}

function _bvbCard16(title, analysis, color, badge) {
  const invest  = analysis.total_investment     || 0;
  const yr3     = analysis.year3_net            || 0;
  const timeline = analysis.timeline_months     || analysis.time_to_revenue_months || 0;
  const pros    = analysis.pros    || [];
  const cons    = analysis.cons    || [];
  const risks   = analysis.key_risks || [];
  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:center;gap:8px">
      <span class="badge ${badge}">${title}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div style="font-size:11px"><span style="color:var(--muted)">Total Investment</span><br><strong style="color:${color}">$${invest.toLocaleString()}</strong></div>
      <div style="font-size:11px"><span style="color:var(--muted)">Yr 3 Net</span><br><strong style="color:${yr3 >= 0 ? 'var(--green)' : 'var(--red)'}">$${yr3.toLocaleString()}</strong></div>
      <div style="font-size:11px"><span style="color:var(--muted)">Timeline</span><br><strong>${timeline} months</strong></div>
      <div style="font-size:11px"><span style="color:var(--muted)">Yr 1 Revenue</span><br><strong>$${(analysis.year1_revenue || 0).toLocaleString()}</strong></div>
    </div>
    ${pros.length ? `<div>
      <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--green);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Pros</div>
      ${pros.map(p => `<div style="font-size:11px;color:var(--text);line-height:1.6">+ ${p}</div>`).join('')}
    </div>` : ''}
    ${cons.length ? `<div>
      <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--red);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Cons</div>
      ${cons.map(c => `<div style="font-size:11px;color:var(--muted);line-height:1.6">− ${c}</div>`).join('')}
    </div>` : ''}
    ${risks.length ? `<div>
      <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--amber);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Key Risks</div>
      ${risks.map(r => `<div style="font-size:11px;color:var(--muted);line-height:1.6">⚠ ${r}</div>`).join('')}
    </div>` : ''}
  </div>`;
}
