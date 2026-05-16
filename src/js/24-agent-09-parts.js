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

  if(demoMode&&typeof getDemoData==='function'){const _d=getDemoData(9);if(_d){R.a9=_d;try{renderBusinessPlan(_d);}catch(e){}setDot(9,'done');showOut(9);return _d;}}
  // ── Part 1 of 4: Executive Summary + Company Overview ───
  setDot(9,'running'); $('9-ov-c').innerHTML = subProgress(1,4,'Executive Summary & Company Overview');
  const sys1 = `You are a senior business plan writer. Return JSON only. No extra text.`;
  const usr1 = `Write Part 1 of a business plan for a ${base}.
SITE: ${ctx3}
FINANCIALS: ${ctx7}
VERDICT: ${ctx8}

Return ONLY:
{
  "business_name": "string",
  "entity_type": "LLC",
  "owner_placeholder": "[Owner Name]",
  "executive_summary": {
    "concept": "3-paragraph concept: mission, services, target market, differentiation",
    "opportunity": "2-paragraph market opportunity citing specific numbers from demographics and gap analysis",
    "ask": "Total capital requested, use of funds breakdown, expected ROI for lender"
  },
  "company_overview": {
    "mission": "Full mission statement",
    "vision": "Full vision statement",
    "values": ["Value 1 with one-sentence explanation","Value 2","Value 3","Value 4"],
    "legal_structure": "Georgia LLC detail",
    "location_rationale": "Detailed paragraph why the chosen city/submarket was selected, citing data from site selection",
    "services": [
      {"name":"Service name","capacity":12,"ratio":"1:4","monthly_price":2050,"annual_revenue":246000,"description":"Full description of what is included"}
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

Return ONLY:
{
  "market_analysis": {
    "target_market": "Detailed 2-paragraph description of primary customer demographics, income, needs",
    "market_size": {
      "total_addressable": "String — total population / households in radius with data source",
      "serviceable": "String — customers in target income bracket and demographic segment",
      "target_share": "String — target market share % and what that equals in customers/revenue"
    },
    "competitor_comparison": [
      {"name":"Competitor","locations":3,"monthly_primary_rate":2100,"rating":4.1,"waitlist":true,"our_advantage":"Why we win against this competitor"}
    ],
    "differentiators": [
      "Specific differentiator 1 with detail",
      "Specific differentiator 2",
      "Specific differentiator 3",
      "Specific differentiator 4",
      "Specific differentiator 5",
      "Specific differentiator 6"
    ],
    "trends": [
      "Market trend 1 supporting investment with data",
      "Market trend 2",
      "Market trend 3",
      "Market trend 4"
    ]
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

Return ONLY:
{
  "operations_plan": {
    "facility": {
      "total_sqft": 8000,
      "indoor_sqft_per_unit": 37,
      "outdoor_sqft_per_unit": 80,
      "rooms": [
        {"name":"Room name","sqft":480,"capacity":6,"ratio":"1:4"}
      ]
    },
    "hours": "Operating hours string",
    "staffing_plan": [
      {"role":"Role title","count":1,"salary":78000,"requirement":"Required credentials/experience"}
    ],
    "curriculum": "Curriculum/service approach description",
    "technology": ["Technology platform 1","Platform 2","Platform 3"]
  },
  "financial_plan": {
    "startup_capital_needed": 542000,
    "one_time_costs": [
      {"item":"Cost item","amount":42000,"category":"Real Estate","notes":"What drives this cost"}
    ],
    "fixed_monthly_costs": [
      {"item":"Cost item","amount":13000,"notes":"Fixed regardless of volume"}
    ],
    "variable_monthly_costs": [
      {"item":"Cost item","amount":3400,"per_unit":"per child/customer","notes":"Scales with revenue"}
    ],
    "funding_sources": [
      {"source":"SBA 7(a) Loan","amount":400000,"pct":73.8,"terms":"10 year, prime + 2.75%","lender_contacts":["Contact 1","Contact 2"]}
    ],
    "year1_projections": {"revenue":580000,"gross_profit":580000,"operating_expenses":480000,"ebitda":100000,"net_income":68000},
    "year2_projections": {"revenue":820000,"gross_profit":820000,"operating_expenses":510000,"ebitda":310000,"net_income":248000},
    "year3_projections": {"revenue":980000,"gross_profit":980000,"operating_expenses":545000,"ebitda":435000,"net_income":360000},
    "breakeven_analysis": "Break-even at X customers/units at average price of $Y. Expected to reach break-even in Month Z.",
    "debt_service_coverage": "DSCR at full operation: X.Xx (above SBA minimum of 1.25x)",
    "collateral": "Collateral offered to lender"
  }
}`;

  // ── Part 4 of 4: SBA Checklist + Investor Slides ────────
  const p3 = await claudeJSON(sys3, usr3);
  $('9-sba-c').innerHTML = subProgress(4,4,'SBA Package & Investor Deck');
  const sys4 = `You are an SBA loan consultant and startup pitch coach. Return JSON only.`;
  const usr4 = `Write Part 4 — SBA checklist and investor pitch deck — for a ${base}.
VERDICT: ${ctx8}
FINANCIALS: ${ctx7}

Return ONLY:
{
  "sba_checklist": [
    {"item":"Document name","status":"Required","notes":"What to include / where to get it","link":"https://..."}
  ],
  "investor_slides": [
    {"slide":1,"title":"The Problem","content":"3-4 sentence compelling problem statement with specific data points"},
    {"slide":2,"title":"The Solution","content":"3-4 sentence solution description"},
    {"slide":3,"title":"Market Opportunity","content":"TAM/SAM/SOM with specific numbers"},
    {"slide":4,"title":"Business Model","content":"Revenue streams and unit economics"},
    {"slide":5,"title":"Financial Projections","content":"3-year summary with key milestones"},
    {"slide":6,"title":"Competitive Advantage","content":"5 specific moats vs named competitors"},
    {"slide":7,"title":"Use of Funds","content":"Itemized $X breakdown with percentages"},
    {"slide":8,"title":"The Team","content":"Owner/operator background and advisory team"},
    {"slide":9,"title":"The Ask","content":"Specific loan amount, terms, lender return analysis"}
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
