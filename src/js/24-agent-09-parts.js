// ══════════════════════════════════════════════════════════
// BUSINESS PLAN SUB-CALLS  (24-agent-09-parts.js)
// Splits the single large Agent 9 call into 4 focused calls
// to prevent Response truncated at max_tokens errors.
// Each call returns ~1,500–2,000 tokens; they are merged into
// one R.a9 object before rendering.
// ══════════════════════════════════════════════════════════

async function runAgent9Parts(a1,a2,a3,a4,a5,a6,a7,a8) {
  const ind = industry();
  const base = `${ind.unit} · ${ind.capacity_label}: ${capacity()} · Budget $${parseInt(budget()).toLocaleString()} · ZIP ${zip()}`;
  const ctx3 = ctx(a3,['summary','locations']);
  const ctx7 = ctx(a7,['summary','scenarios','startup_breakdown','monthly_ops','by_city_financials']);
  const ctx8 = ctx(a8,['verdict','verdict_rationale','assessment','success_factors','risks','next_steps']);
  // Verified real data for financial grounding
  const _rdCtx9 = typeof buildRealDataCtx === 'function'
    ? buildRealDataCtx(['demographics','wages','macro','rents','acs_expanded','hud_fmr','bls_oes','cbp_county'])
    : '';

  if(demoMode&&typeof getDemoData==='function'){const _d=getDemoData(9);if(_d){R.a9=_d;try{renderBusinessPlan(_d);}catch(e){}setDot(9,'done');showOut(9);return _d;}}
  // ── Part 1 of 4: Executive Summary + Company Overview ───
  setDot(9,'running'); $('9-ov-c').innerHTML = subProgress(1,4,'Executive Summary & Company Overview');
  const sys1 = `You are a senior business plan writer. Return JSON only. No extra text.`;
  const usr1 = `${_rdCtx9 ? _rdCtx9 + '\n\n' : ''}Write Part 1 of a business plan for a ${base}.
SITE: ${ctx3}
FINANCIALS: ${ctx7}
VERDICT: ${ctx8}

Return ONLY this JSON. All values are placeholders — populate from upstream
context. Do not echo example strings like "Georgia LLC" if the user's state
is different; do not echo example numbers.

{
  "business_name":     null,
  "entity_type":       null,    // "LLC" | "S-Corp" | "C-Corp"
  "owner_placeholder": "[Owner Name]",
  "executive_summary": {
    "concept":     null,    // 3 paragraphs
    "opportunity": null,    // 2 paragraphs citing specific numbers from upstream
    "ask":         null     // capital requested + use of funds + ROI for lender
  },
  "company_overview": {
    "mission":            null,
    "vision":             null,
    "values":             [],
    "legal_structure":    null,    // include user's actual state
    "location_rationale": null,
    "services": [
      {"name": null, "capacity": null, "ratio": null, "monthly_price": null, "annual_revenue": null, "description": null}
    ]
  }
}`;

  // ── Part 2 of 4: Market Analysis ────────────────────────
  const p1 = await claudeJSON(sys1, usr1, {webSearch:true});
  $('9-mkt-c').innerHTML = subProgress(2,4,'Market Analysis & Competitive Positioning');
  const sys2 = `You are a market research analyst. Return JSON only.`;
  const usr2 = `Write Part 2 — market analysis — for a ${base}.
DEMOGRAPHICS: ${ctx(a1,['summary','cities','overall_opportunity_score'],1000)}
GAP ANALYSIS: ${ctx(a2,['summary','cities','overall_opportunity_score'])}
COMPETITORS: ${ctx(a6,['summary','cities','top_chains'])}
SITE: ${ctx3}

Return ONLY this JSON. All values are placeholders.

{
  "market_analysis": {
    "target_market": null,    // 2 paragraphs citing real demographics
    "market_size": {
      "total_addressable": null,    // string with data source
      "serviceable":       null,
      "target_share":      null
    },
    "competitor_comparison": [
      {"name": null, "locations": null, "monthly_primary_rate": null, "rating": null, "waitlist": null, "our_advantage": null}
    ],
    "differentiators": [],    // 5-6 specific
    "trends":          []     // 4 trends with data
  }
}`;

  // ── Part 3 of 4: Operations Plan + Financial Plan ───────
  const p2 = await claudeJSON(sys2, usr2, {webSearch:true});
  $('9-fin-c').innerHTML = subProgress(3,4,'Operations Plan & Financial Model');
  const sys3 = `You are a ${ind.unit} operations and finance expert. Return JSON only.`;
  const usr3 = `Write Part 3 — operations and financial plan — for a ${base}.
SITE SELECTION: ${ctx3}
REAL ESTATE: ${ctx(a4,['summary','by_city_summary'])}
COMPLIANCE: ${ctx(a5,['summary','requirements','timeline_phases'])}
FINANCIALS: ${ctx7}

Return ONLY this JSON. All values are placeholders — every number must be
derived from the FINANCIALS / SITE / COMPLIANCE upstream context, not from
this schema.

{
  "operations_plan": {
    "facility": {
      "total_sqft":             null,
      "indoor_sqft_per_unit":   null,
      "outdoor_sqft_per_unit":  null,
      "rooms": [
        {"name": null, "sqft": null, "capacity": null, "ratio": null}
      ]
    },
    "hours":         null,
    "staffing_plan": [
      {"role": null, "count": null, "salary": null, "requirement": null}
    ],
    "curriculum": null,
    "technology": []
  },
  "financial_plan": {
    "startup_capital_needed": null,
    "one_time_costs": [
      {"item": null, "amount": null, "category": null, "notes": null}
    ],
    "fixed_monthly_costs": [
      {"item": null, "amount": null, "notes": null}
    ],
    "variable_monthly_costs": [
      {"item": null, "amount": null, "per_unit": null, "notes": null}
    ],
    "funding_sources": [
      {"source": null, "amount": null, "pct": null, "terms": null, "lender_contacts": []}
    ],
    "year1_projections": {"revenue": null, "gross_profit": null, "operating_expenses": null, "ebitda": null, "net_income": null},
    "year2_projections": {"revenue": null, "gross_profit": null, "operating_expenses": null, "ebitda": null, "net_income": null},
    "year3_projections": {"revenue": null, "gross_profit": null, "operating_expenses": null, "ebitda": null, "net_income": null},
    "breakeven_analysis":     null,
    "debt_service_coverage":  null,    // must reference SBA minimum 1.25x if loan involved
    "collateral":             null
  }
}`;

  // ── Part 4 of 4: SBA Checklist + Investor Slides ────────
  // webSearch: find real SBA lender contacts and current commercial rent comps
  const p3 = await claudeJSON(sys3, usr3, {webSearch:true});
  $('9-sba-c').innerHTML = subProgress(4,4,'SBA Package & Investor Deck');
  const sys4 = `You are an SBA loan consultant and startup pitch coach. Return JSON only.`;
  const usr4 = `Write Part 4 — SBA checklist and investor pitch deck — for a ${base}.
VERDICT: ${ctx8}
FINANCIALS: ${ctx7}

Return ONLY this JSON. The slide titles are required structure; content
fields must be populated from upstream context, not from this schema.

{
  "sba_checklist": [
    {"item": null, "status": null, "notes": null, "link": null}
  ],
  "investor_slides": [
    {"slide": 1, "title": "The Problem",            "content": null},
    {"slide": 2, "title": "The Solution",           "content": null},
    {"slide": 3, "title": "Market Opportunity",     "content": null},
    {"slide": 4, "title": "Business Model",         "content": null},
    {"slide": 5, "title": "Financial Projections",  "content": null},
    {"slide": 6, "title": "Competitive Advantage",  "content": null},
    {"slide": 7, "title": "Use of Funds",           "content": null},
    {"slide": 8, "title": "The Team",               "content": null},
    {"slide": 9, "title": "The Ask",                "content": null}
  ]
}`;

  const p4 = await claudeJSON(sys4, usr4, {webSearch:true});

  // Merge all 4 parts into one object
  const merged = Object.assign(
    {},
    p1 || {},
    p2 || {},
    p3 || {},
    p4 || {}
  );
  return merged;
}

function subProgress(current, total, label) {
  const pct = Math.round((current - 1) / total * 100);
  return `<div style="padding:16px;display:flex;flex-direction:column;gap:8px">
    <div style="font-size:11px;font-weight:700;font-family:'Syne',sans-serif;color:var(--blue);text-transform:uppercase;letter-spacing:0.08em">
      Sub-agent ${current} / ${total}
    </div>
    <div style="font-size:13px;color:var(--text)">${label}</div>
    <div style="height:4px;background:var(--surface3);border-radius:2px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:var(--blue);border-radius:2px;transition:width 0.4s"></div>
    </div>
    <div style="font-size:11px;color:var(--muted)">Building in focused sections to ensure full depth…</div>
  </div>`;
}
