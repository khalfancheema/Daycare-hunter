// ══════════════════════════════════════════════════════════════════════════════
// V2-15 DEMO SHOWCASE — Seeds portfolio state and localStorage for demo mode
// ══════════════════════════════════════════════════════════════════════════════

// ── Seed two portfolio runs for "What Changed" diff ───────────────────────────
const _V2_DEMO_RUN_A = {
  id: 'demo-run-001',
  zip: '30097',
  city: 'Johns Creek',
  state: 'GA',
  industry: 'daycare',
  radius: '15',
  capacity: '75',
  budget: '526500',
  score: 74.2,
  label: 'Initial Analysis — Mar 2025',
  savedAt: new Date('2025-03-01').getTime(),
  timestamp: new Date('2025-03-01').getTime(),
  gap_score: 18.2,
  financial_score: 17.8,
  ai_score: 14.4,
  competition_score: 12.8,
  compliance_score: 11.0,
  verdict: 'Cautious Go',
  notes: 'First run — conservative enrollment assumptions',
};

const _V2_DEMO_RUN_B = {
  id: 'demo-run-002',
  zip: '30097',
  city: 'Johns Creek',
  state: 'GA',
  industry: 'daycare',
  radius: '15',
  capacity: '90',
  budget: '600000',
  score: 82.7,
  label: 'Updated Analysis — Apr 2025',
  savedAt: new Date('2025-04-15').getTime(),
  timestamp: new Date('2025-04-15').getTime(),
  gap_score: 21.4,
  financial_score: 20.1,
  ai_score: 16.2,
  competition_score: 13.5,
  compliance_score: 11.5,
  verdict: 'Go',
  notes: 'Updated with 90-slot capacity and confirmed grant funding',
};

(function _v2SeedDemoPortfolio() {
  // Only seed if portfolio is empty (don't overwrite real user data)
  if (!V2.portfolio || V2.portfolio.length === 0) {
    V2.portfolio = [_V2_DEMO_RUN_A, _V2_DEMO_RUN_B];
  }
})();

// ── Seed localStorage saved searches ─────────────────────────────────────────
(function _v2SeedDemoSavedSearches() {
  try {
    const existing = JSON.parse(localStorage.getItem('v2_saved_searches') || '[]');
    if (existing.length === 0) {
      const demo = [
        {
          id: 'saved-demo-001',
          savedAt: new Date('2025-03-01').getTime(),
          label: 'Suwanee Childcare — Primary',
          industry: 'daycare',
          zip: '30097',
          radius: '15',
          capacity: '75',
          budget: '526500',
          score: 82.7,
        },
        {
          id: 'saved-demo-002',
          savedAt: new Date('2025-02-14').getTime(),
          label: 'Sugar Hill — Backup Site',
          industry: 'daycare',
          zip: '30518',
          radius: '10',
          capacity: '80',
          budget: '480000',
          score: 78.3,
        },
        {
          id: 'saved-demo-003',
          savedAt: new Date('2025-01-20').getTime(),
          label: 'Duluth — Feasibility Check',
          industry: 'daycare',
          zip: '30096',
          radius: '10',
          capacity: '65',
          budget: '420000',
          score: 71.5,
        },
      ];
      localStorage.setItem('v2_saved_searches', JSON.stringify(demo));
    }
  } catch(e) {}
})();

// ── Showcase banner injected into dashboard header ────────────────────────────
function v2InjectShowcaseBanner() {
  const wrap = document.getElementById('v2-dash-wrap');
  if (!wrap || document.getElementById('v2-showcase-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'v2-showcase-banner';
  banner.style.cssText = `
    background: linear-gradient(135deg, rgba(99,102,241,.15), rgba(139,92,246,.12));
    border: 1px solid rgba(99,102,241,.3);
    border-radius: 12px;
    padding: 14px 20px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  `;
  banner.innerHTML = `
    <div style="font-size:20px">🎬</div>
    <div style="flex:1;min-width:200px">
      <div style="font-size:13px;font-weight:700;color:var(--v2-t1)">Demo Mode — Childcare Center · Suwanee, GA (ZIP 30097)</div>
      <div style="font-size:11px;color:var(--v2-t3);margin-top:2px">
        All 17 agents ran · Score <strong style="color:#22c55e">82.7/100</strong> · Verdict: <strong style="color:#22c55e">GO</strong> ·
        All tabs, charts, exports, and drill-downs are fully functional
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="v2-btn primary sm" onclick="v2TourDashboard()">▶ Feature Tour</button>
      <button class="v2-btn ghost sm" onclick="document.getElementById('v2-showcase-banner').style.display='none'">✕ Dismiss</button>
    </div>
  `;
  wrap.insertBefore(banner, wrap.firstChild);
}

// ── Feature tour — cycles through all tabs showing key features ───────────────
const _V2_TOUR_STEPS = [
  { tab: 'market',      label: 'Market Gap',        msg: '📊 Age-group gaps by infant/toddler/pre-K with 5-year demand forecast and subsidy-eligible population %' },
  { tab: 'competition', label: 'Competitor Intel',   msg: '🏪 Click any competitor row for full profile — tuition, staff ratios, NAEYC status, capacity utilization' },
  { tab: 'financials',  label: 'Financials',         msg: '💰 Full 18-month enrollment ramp · Click any month for P&L detail · Lease sensitivity slider · Wage inflation scenario' },
  { tab: 'risks',       label: 'Risk Scoring',       msg: '⚠️ Probability × Impact scores with trigger conditions and mitigation cost per risk' },
  { tab: 'realestate',  label: 'Real Estate',        msg: '🏠 5 scored listings — zoning, ADA, school proximity, density, parking all rated out of 10' },
  { tab: 'multizip',    label: 'Multi-ZIP',          msg: '📍 5 cities ranked by composite score — click any to launch sub-analysis' },
  { tab: 'compare',     label: 'Compare',            msg: '⚖️ Side-by-side run comparison · "What Changed" diff between your March and April analyses' },
  { tab: 'sensitivity', label: 'Sensitivity',        msg: '🎯 Which single assumption most changes your break-even month — enrollment rate, tuition, lease, wages' },
  { tab: 'trends',      label: 'Trends',             msg: '📈 5-year market trends for demand, income growth, and competitor entry rate' },
  { tab: 'freshness',   label: 'Sources',            msg: '🔍 Source attribution with confidence %, stale warnings, and live link checker for all 13 data sources' },
  { tab: 'saved',       label: 'Saved Searches',     msg: '🔖 3 bookmarked analyses — ZIP + industry + score history' },
];

let _v2ShowcaseTourIdx = 0;
let _v2ShowcaseTourTimer = null;

function v2TourDashboard() {
  _v2ShowcaseTourIdx = 0;
  _v2RunTourStep();
}

function _v2RunTourStep() {
  if (_v2ShowcaseTourIdx >= _V2_TOUR_STEPS.length) {
    _v2ShowTourToast('✅ Tour complete! Every tab and feature is live — explore freely.', 4000);
    return;
  }
  const step = _V2_TOUR_STEPS[_v2ShowcaseTourIdx];

  // Switch to the tab
  const tabEl = document.querySelector(`[onclick*="v2DashTab('${step.tab}'"]`);
  if (tabEl && typeof v2DashTab === 'function') v2DashTab(step.tab, tabEl);

  // Show toast
  _v2ShowTourToast(`<strong>${step.label}:</strong> ${step.msg}`, 3200);

  _v2ShowcaseTourIdx++;
  if (_v2ShowcaseTourTimer) clearTimeout(_v2ShowcaseTourTimer);
  _v2ShowcaseTourTimer = setTimeout(_v2RunTourStep, 3400);
}

function _v2ShowTourToast(msg, duration) {
  let toast = document.getElementById('v2-tour-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'v2-tour-toast';
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(15,15,30,.96); border: 1px solid rgba(99,102,241,.4);
      border-radius: 12px; padding: 12px 20px; max-width: 500px; width: calc(100% - 40px);
      font-size: 13px; color: var(--v2-t1); z-index: 9999; text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,.6);
      transition: opacity .3s;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <div>${msg}</div>
    <div style="margin-top:6px;font-size:10px;color:var(--v2-t3)">
      Step ${_v2ShowcaseTourIdx}/${_V2_TOUR_STEPS.length} ·
      <span style="cursor:pointer;color:var(--v2-a1)" onclick="clearTimeout(_v2ShowcaseTourTimer);this.closest('#v2-tour-toast').style.opacity=0">Skip tour</span>
    </div>
  `;
  toast.style.opacity = '1';
  setTimeout(() => { if (toast) toast.style.opacity = '0'; }, duration - 400);
}

// ── Mark all 17 agent rows as "done" in DOM (populates All Agents tab) ───────
function _v2DemoMarkAgentsDone() {
  let sentinel = document.getElementById('v2-demo-agent-sentinels');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.id = 'v2-demo-agent-sentinels';
    sentinel.style.display = 'none';
    document.body.appendChild(sentinel);
  }
  for (let i = 1; i <= 17; i++) {
    let row = document.getElementById('v2-ar-' + i);
    if (!row) {
      row = document.createElement('div');
      row.id = 'v2-ar-' + i;
      sentinel.appendChild(row);
    }
    row.classList.add('done');
    let timer = document.getElementById('v2-at-' + i);
    if (!timer) {
      timer = document.createElement('span');
      timer.id = 'v2-at-' + i;
      sentinel.appendChild(timer);
    }
    if (!timer.textContent) timer.textContent = '~2.1s';
  }
}

// ── Demo agent data — provides structured output for each of the 17 agents ──────
function getDemoData(agentNum, industry) {
  if (industry !== 'daycare') return {};
  const _demo = {
    1: { // Demographics
      summary: 'Johns Creek metro has 47,200 children under age 6 within a 15-mile radius. Median household income is $127,400 — 62% above national average. 74% of households with children have dual incomes, creating strong childcare demand.',
      population_under_6: 47200, median_income: 127400, households_with_children: 19800,
      dual_income_pct: 74, subsidy_eligible_pct: 18,
    },
    2: { // Gap Analysis
      cities: [
        { city: 'Johns Creek',  state: 'GA', gap_score: 8.5, unmet_demand: 328, supply_deficit: 'High',   subsidy_pct: 18 },
        { city: 'Suwanee',      state: 'GA', gap_score: 7.8, unmet_demand: 247, supply_deficit: 'High',   subsidy_pct: 22 },
        { city: 'Sugar Hill',   state: 'GA', gap_score: 7.2, unmet_demand: 184, supply_deficit: 'Medium', subsidy_pct: 26 },
        { city: 'Buford',       state: 'GA', gap_score: 6.5, unmet_demand: 142, supply_deficit: 'Medium', subsidy_pct: 31 },
        { city: 'Duluth',       state: 'GA', gap_score: 5.9, unmet_demand:  88, supply_deficit: 'Low',    subsidy_pct: 28 },
      ],
      summary: 'Infant and toddler slots (0–2 yrs) are severely underserved. The 15-mile radius shows 328 unmet slots in Johns Creek alone.',
    },
    3: { summary: 'Real estate analysis: 3 commercial properties zoned correctly within 5 miles. Top pick: 8,200 sqft former preschool on Medlock Bridge Rd — move-in ready with kitchen and outdoor play area.' },
    4: { summary: 'SBA 7(a) loan pre-qualified at $350K. Total capital stack: $175K equity + $350K debt + $45K grants. 8 potential angel investors identified in the childcare / edtech sector.' },
    5: { // Compliance
      total_timeline_months: 4, timeline_months: 4,
      summary: 'Georgia DECAL licensing: 4-month process. Fire marshal inspection, health dept inspection, background checks, and staff CPR/First Aid required. No major blockers identified.',
      requirements: [
        { step: 'DECAL Application', duration_weeks: 2 },
        { step: 'Fire Marshal Inspection', duration_weeks: 3 },
        { step: 'Health Department Inspection', duration_weeks: 2 },
        { step: 'Staff Background Checks', duration_weeks: 1 },
        { step: 'Final License Issued', duration_weeks: 2 },
      ],
    },
    6: { // Competitive Intel
      cities: [
        { city: 'Johns Creek', competitor_count: 3, total_competitors: 3, avg_tuition: 1680, naeyc_accredited: 0 },
        { city: 'Suwanee',     competitor_count: 2, total_competitors: 2, avg_tuition: 1520, naeyc_accredited: 1 },
        { city: 'Duluth',      competitor_count: 4, total_competitors: 4, avg_tuition: 1340, naeyc_accredited: 0 },
      ],
      summary: '3 direct competitors in Johns Creek; none NAEYC-accredited. Clear opportunity for premium positioning at $1,750–$1,900/mo.',
    },
    7: { // Financials
      total_startup_cost: 526500,
      scenarios: [
        { name: 'Conservative', monthly_net:  8200, monthly_revenue: 62000, breakeven_months: 28, roi_3yr:  42, enrollment_pct: 65 },
        { name: 'Base Case',    monthly_net: 12400, monthly_revenue: 78000, breakeven_months: 18, roi_3yr:  67, enrollment_pct: 82 },
        { name: 'Optimistic',   monthly_net: 19800, monthly_revenue: 96000, breakeven_months: 12, roi_3yr: 112, enrollment_pct: 96 },
      ],
      startup_breakdown: [
        { item: 'Lease Deposit (6 mo)',      amount: 54000 },
        { item: 'Renovation & Buildout',     amount: 185000 },
        { item: 'Equipment & Furniture',     amount: 82000 },
        { item: 'Licensing & Permits',       amount:  8500 },
        { item: 'Working Capital (6 mo)',    amount: 197000 },
      ],
    },
    8: { // Executive Summary
      verdict: 'Go',
      verdict_rationale: 'Strong demand gap with income demographics supporting premium pricing. 18-month break-even at conservative enrollment assumptions.',
      assessment: 'The Johns Creek / Suwanee market shows significant unmet childcare demand (gap score 8.5/10). Demographics are exceptional: $127K median income, 74% dual-income households. Competitor landscape is thin with no NAEYC-accredited centers within 5 miles.',
      success_factors: [
        'Premium demographics support $1,800+/mo tuition',
        'No NAEYC-accredited centers within 5 miles — clear differentiation path',
        'County and state grants reduce startup exposure by ~$45K',
        'Existing commercial properties reduce buildout cost vs. greenfield',
      ],
      risks: [
        { risk: 'Enrollment Ramp Risk', mitigation: 'Launch waitlist 6 months before open — target 40 pre-enrolled families', severity: 'medium' },
        { risk: 'Staff Shortage', mitigation: 'Partner with North Georgia College ECE program for pipeline', severity: 'medium' },
        { risk: 'License Delay', mitigation: 'File DECAL application immediately — 4-month buffer built in', severity: 'low' },
      ],
      next_steps: [
        'Secure 3 LOIs from shortlisted commercial landlords',
        'File DECAL license application',
        'Launch waitlist landing page with 6-month incentive discount',
        'Schedule SBA 7(a) lender meetings',
        'Apply for DECAL quality grant ($25K) and Georgia CAPS subsidy',
      ],
    },
    9:  { summary: 'Demographics confirm strong target pool. 1,200+ dual-income families within 3 miles of target ZIP.' },
    10: { summary: 'Social media analysis: Parents in Johns Creek active on Facebook groups — "Johns Creek Parents" (12K members) is primary discovery channel for childcare.' },
    11: { summary: 'Real estate confirmed: 8,200 sqft at $9/sqft/yr asking ($74K/yr). Zoning R-4 allows childcare facilities with CUP. Recommend offering $8.25/sqft + 3-year NNN.' },
    12: { // Grants
      summary: 'Three fundable grant opportunities totaling ~$45K in Year 1. DECAL Quality Care Grant is the highest-value with a rolling deadline.',
      grants: [
        { name: 'DECAL Quality Care Grant',    amount: 25000, deadline: 'Rolling',        url: 'https://decal.ga.gov' },
        { name: 'Georgia CAPS Subsidy',        amount: 15000, deadline: 'Annual — Apr 1', url: 'https://caps.decal.ga.gov' },
        { name: 'Gwinnett County Small Biz',   amount:  5000, deadline: 'Quarterly',      url: 'https://gwinnettcounty.com' },
      ],
    },
    13: { summary: '5-year demand forecast: childcare demand in the 30097 ZIP code projected to grow 12% by 2029 driven by planned residential developments (2,400 units) in the Medlock Bridge corridor.' },
    14: { summary: 'Sensitivity analysis: break-even month most sensitive to enrollment rate (±4 months per 10% enrollment change). Tuition has second-largest impact (±2.5 months per $100 tuition change).' },
    15: { summary: 'Multi-ZIP comparison: Johns Creek (30097) ranks #1 of 5 ZIPs tested. Suwanee (30024) is strong runner-up with lower competition but 8% lower household income.' },
    16: { summary: 'Staffing model: 75-slot center requires 12 FTE staff. Lead Teacher avg $42K/yr in Gwinnett County. Total annual payroll: $392K at base staffing levels.' },
    17: { summary: 'Business plan drafted: Full SBA 7(a) package including executive summary, market analysis, competitive landscape, financial projections, and management team bio template.' },
  };
  return _demo[agentNum] || {};
}

// ── Full showcase launch: load demo run + inject banner + show score ───────────
function v2LaunchShowcase() {
  // Build a full demo run object that mirrors what v2RenderDashboard expects
  const demoRun = {
    ..._V2_DEMO_RUN_B,
    ts: Date.now(),
    _demoMode: true,
  };

  // ── CRITICAL: assign directly to the bundle-scope `R` variable ────────────
  // `R` is declared `let R = {}` in 01-config.js (same concatenated <script>).
  // Setting window.R does NOT update that local variable — all dashboard render
  // functions (v2CalcScore, v2GetKPIs, v2RenderMarket, etc.) read from `R`.
  if (typeof getDemoData === 'function') {
    R = {
      a1:  getDemoData(1,  'daycare') || {},
      a2:  getDemoData(2,  'daycare') || {},
      a3:  getDemoData(3,  'daycare') || {},
      a4:  getDemoData(4,  'daycare') || {},
      a5:  getDemoData(5,  'daycare') || {},
      a6:  getDemoData(6,  'daycare') || {},
      a7:  getDemoData(7,  'daycare') || {},
      a8:  getDemoData(8,  'daycare') || {},
      a9:  getDemoData(9,  'daycare') || {},
      a10: getDemoData(10, 'daycare') || {},
      a11: getDemoData(11, 'daycare') || {},
      a12: getDemoData(12, 'daycare') || {},
      a13: getDemoData(13, 'daycare') || {},
      a14: getDemoData(14, 'daycare') || {},
      a15: getDemoData(15, 'daycare') || {},
      a16: getDemoData(16, 'daycare') || {},
      a17: getDemoData(17, 'daycare') || {},
    };
  }

  // Set V2.run so v2GoTo re-renders correctly and save/export/portfolio work
  V2.run = demoRun;

  // Mark all 17 agent rows as done before rendering
  _v2DemoMarkAgentsDone();

  // Go to dashboard (v2GoTo will re-render via V2.run if screen is already dashboard)
  if (typeof v2GoTo === 'function') v2GoTo('dashboard');

  // Force a fresh render in case v2GoTo skipped it (already on dashboard screen)
  if (typeof v2RenderDashboard === 'function') v2RenderDashboard(demoRun);

  // Inject the showcase banner after a tick
  setTimeout(v2InjectShowcaseBanner, 100);
}

// ── Wire the "Try Demo" button on landing to use the showcase ─────────────────
(function _v2PatchLandingDemo() {
  // Override the existing v2StartDemo if present
  const _origDemo = (typeof v2StartDemo === 'function') ? v2StartDemo : null;
  window.v2StartDemo = function() {
    v2LaunchShowcase();
  };
})();

// ── Auto-seed on every dashboard render ──────────────────────────────────────
(function() {
  if (typeof v2RenderDashboard !== 'function') return;
  const _base15 = v2RenderDashboard;
  v2RenderDashboard = function(run) {
    _base15(run);
    // After a tick, inject banner if demo run
    if (run && run._demoMode) {
      setTimeout(v2InjectShowcaseBanner, 150);
    }
  };
})();
