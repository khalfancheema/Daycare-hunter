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
  { tab: 'executive',   label: 'Live Census Data',   msg: '🏛️ Real US Census ACS demographics injected automatically — median income, population, rent, labor force for ZIP 30097' },
  { tab: 'market',      label: 'Market Gap',         msg: '📊 Age-group gaps by infant/toddler/pre-K with 5-year demand forecast and subsidy-eligible population %' },
  { tab: 'competition', label: 'Competitor Intel',   msg: '🗺️ Live OpenStreetMap competitors auto-loaded for the search radius — real business names, phones, and addresses' },
  { tab: 'financials',  label: 'Financials + FRED',  msg: '💰 Full 18-month enrollment ramp + live Federal Reserve data (Prime Rate, CPI, Unemployment) from FRED API' },
  { tab: 'risks',       label: 'Risk Scoring',       msg: '⚠️ Probability × Impact scores with trigger conditions and mitigation cost per risk' },
  { tab: 'plan',        label: 'Action Plan',        msg: '✅ Step-by-step launch checklist auto-generated from compliance timeline and market findings' },
  { tab: 'compare',     label: 'Compare',            msg: '⚖️ Side-by-side run comparison · "What Changed" diff between your March and April analyses' },
  { tab: 'whatif',      label: 'What-If',            msg: '🎲 Adjust enrollment rate, tuition, lease, and wages in real-time and see break-even shift instantly' },
  { tab: 'grants',      label: 'Grants',             msg: '💵 Matched grants ranked by fit score — DECAL Quality Care, Georgia CAPS, Gwinnett County Small Biz' },
  { tab: 'benchmark',   label: 'Benchmarking',       msg: '📊 Your metrics vs industry benchmarks — where you rank on revenue per slot, margin, and ROI' },
  { tab: 'agents',      label: 'All Agents',         msg: '🤖 All 17 AI agents shown — status, timing, and output for every step of the pipeline' },
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
  // Medical Practice demo data
  if (industry === 'medical_practice') {
    const _medDemo = {
      1: { summary: 'Forsyth County has 89,400 adults over 18 within a 10-mile radius. Median household income is $112,700. 67% hold private insurance (commercial); 14% Medicare; 6% Medicaid — favorable payer mix for a private practice.',
           population_under_6: 0, median_income: 112700, households_with_children: 28400, dual_income_pct: 71, subsidy_eligible_pct: 6 },
      2: { cities: [
             { city: 'Cumming', state: 'GA', gap_score: 7.8, unmet_demand: 8400, supply_deficit: 'High', subsidy_pct: 6 },
             { city: 'Alpharetta', state: 'GA', gap_score: 6.5, unmet_demand: 4200, supply_deficit: 'Medium', subsidy_pct: 9 },
           ],
           summary: 'Primary care physician-to-patient ratio is 1:2,400 vs the recommended 1:1,500. Significant unmet demand for family medicine within 10 miles.' },
      7: { total_startup_cost: 480000,
           scenarios: [
             { name: 'Conservative', monthly_net: 9800,  monthly_revenue: 52000, breakeven_months: 22, roi_3yr: 48,  enrollment_pct: 60 },
             { name: 'Base Case',    monthly_net: 16400, monthly_revenue: 72000, breakeven_months: 14, roi_3yr: 89,  enrollment_pct: 80 },
             { name: 'Optimistic',   monthly_net: 24000, monthly_revenue: 96000, breakeven_months: 10, roi_3yr: 142, enrollment_pct: 100 },
           ],
           startup_breakdown: [
             { item: 'Lease Deposit (6 mo)',     amount: 42000 },
             { item: 'Medical Build-out',        amount: 180000 },
             { item: 'Equipment & Instruments', amount: 95000 },
             { item: 'EHR System (3yr)',         amount: 24000 },
             { item: 'Working Capital (6 mo)',  amount: 139000 },
           ] },
      8: { verdict: 'Go', verdict_rationale: 'Excellent payer mix with low Medicaid exposure. Physician-to-patient ratio confirms real unmet demand.',
           assessment: 'Forsyth County represents a high-income, underserved primary care market. The 1:2,400 physician ratio and aging suburban population create durable demand. Commercial insurance dominance (67%) supports premium fee-for-service revenue.',
           success_factors: ['Premium payer mix (67% commercial) supports strong revenue per visit', 'HRSA HPSA designation potential — qualifies for loan repayment', 'DPC/hybrid model opportunity to differentiate from hospital-employed groups'],
           risks: [
             { risk: 'Credentialing Timeline', mitigation: 'Start insurance credentialing 6 months before open — 90-day avg per insurer', severity: 'high' },
             { risk: 'Referral Network', mitigation: 'Join local IPA and attend hospital medical staff meetings from day 1', severity: 'medium' },
           ],
           next_steps: ['File NPI and DEA registration immediately', 'Apply to participate in Anthem, BCBS, Aetna, Cigna panels', 'Sign lease and file for GA Medical Board facility license', 'Hire medical biller (credentialing specialist preferred)'] },
    };
    return _medDemo[agentNum] || { summary: `Medical practice agent ${agentNum} — demo data` };
  }

  if (industry !== 'daycare') return {};
  const _demo = {
    1: { // Demographics
      summary: 'Johns Creek metro has 47,200 children under age 6 within a 15-mile radius. Median household income is $127,400 — 62% above national average. 74% of households with children have dual incomes, creating strong childcare demand.',
      population_under_6: 47200, median_income: 127400, households_with_children: 19800,
      dual_income_pct: 74, subsidy_eligible_pct: 18,
      age_pyramid: [
        {bracket:'0-4',   male:2820, female:2710},
        {bracket:'5-9',   male:3140, female:3050},
        {bracket:'10-14', male:3280, female:3190},
        {bracket:'15-19', male:2940, female:2830},
        {bracket:'20-24', male:2610, female:2540},
        {bracket:'25-29', male:3820, female:3760},
        {bracket:'30-34', male:5240, female:5110},
        {bracket:'35-39', male:5680, female:5540},
        {bracket:'40-44', male:5120, female:5010},
        {bracket:'45-49', male:4640, female:4580},
        {bracket:'50-54', male:3980, female:4120},
        {bracket:'55-59', male:3240, female:3480},
        {bracket:'60-64', male:2560, female:2900},
        {bracket:'65-69', male:1820, female:2260},
        {bracket:'70-74', male:1240, female:1740},
        {bracket:'75+',   male: 820, female:1380}
      ],
      generation_breakdown: [
        {gen:'Gen Alpha (0-12)',   population_pct:17.2, households_pct:20.8},
        {gen:'Gen Z (13-28)',      population_pct:13.4, households_pct:10.6},
        {gen:'Millennial (29-44)', population_pct:26.8, households_pct:34.2},
        {gen:'Gen X (45-60)',      population_pct:23.6, households_pct:26.4},
        {gen:'Boomer (61-79)',     population_pct:15.8, households_pct: 7.2},
        {gen:'Silent (80+)',       population_pct: 3.2, households_pct: 0.8}
      ],
      multi_radius: [
        {ring:'1 mi', population: 9840,  households:  3420, median_hh_income:154000, pct_with_children:42, pop_under5: 1180, avg_hh_size:2.88},
        {ring:'3 mi', population:52600,  households: 18200, median_hh_income:138900, pct_with_children:40, pop_under5: 6240, avg_hh_size:2.89},
        {ring:'5 mi', population:134200, households: 46800, median_hh_income:127400, pct_with_children:41, pop_under5:15800, avg_hh_size:2.87}
      ],
      consumer_expenditure: {
        radius_miles: 5,
        total_expenditure_millions: 8110,
        categories: [
          {category:'Housing',               amount_millions:2840, pct_of_total:35.0},
          {category:'Transportation',        amount_millions:1140, pct_of_total:14.1},
          {category:'Food at Home',          amount_millions: 810, pct_of_total:10.0},
          {category:'Healthcare',            amount_millions: 620, pct_of_total: 7.6},
          {category:'Education & Childcare', amount_millions: 490, pct_of_total: 6.0},
          {category:'Food Away from Home',   amount_millions: 480, pct_of_total: 5.9},
          {category:'Entertainment',         amount_millions: 340, pct_of_total: 4.2},
          {category:'Personal Care',         amount_millions: 180, pct_of_total: 2.2},
          {category:'Other',                 amount_millions:1210, pct_of_total:14.9}
        ]
      },
      lifestyle_segments: [
        {segment:'Savvy Suburbanites',         pct:18.4, description:'Established upper-middle-class families, homeowners, education-focused'},
        {segment:'Professional Pride',         pct:14.2, description:'Younger professionals, dual-income, high education, tech-forward'},
        {segment:'Bright Young Professionals', pct:11.8, description:'Recent college grads building careers, renter households'},
        {segment:'In Style',                   pct: 9.6, description:'Upper-middle urban lifestyle, brand conscious, high disposable income'},
        {segment:'Family Foundations',         pct: 7.3, description:'Young families prioritizing schools, safety, and suburban amenities'}
      ],
      population_projections: [
        {year:2020, population:41200},
        {year:2021, population:43800},
        {year:2022, population:46100},
        {year:2023, population:47800},
        {year:2024, population:49200},
        {year:2025, population:51000},
        {year:2030, population:58400}
      ],
      occupation_lq: [
        {occupation:'Computer & Math',          area_pct:12.4, us_pct: 3.1, lq:4.00},
        {occupation:'Business & Financial',     area_pct: 8.6, us_pct: 5.3, lq:1.62},
        {occupation:'Management',               area_pct: 7.2, us_pct: 5.8, lq:1.24},
        {occupation:'Healthcare Practitioners', area_pct: 6.8, us_pct: 6.3, lq:1.08},
        {occupation:'Education & Training',     area_pct: 5.4, us_pct: 6.1, lq:0.89},
        {occupation:'Sales & Related',          area_pct: 9.2, us_pct:10.1, lq:0.91},
        {occupation:'Service Occupations',      area_pct:11.8, us_pct:17.4, lq:0.68}
      ],
      education_attainment: {radius_miles:3, less_than_hs_pct:2.4, hs_grad_pct:8.6, some_college_pct:14.2, associates_pct:5.8, bachelors_pct:38.4, graduate_pct:30.6},
      housing_detail: {median_home_value:548000, avg_home_value:624000, owner_occupied_pct:72.4, renter_occupied_pct:27.6, median_gross_rent:1840, built_2010_later_pct:28.2, built_2000_2009_pct:34.6},
      language_spoken: [
        {language:'English only',  pct:58.4},
        {language:'Asian/Pacific', pct:22.8},
        {language:'Spanish',       pct:12.6},
        {language:'Indo-European', pct: 4.2},
        {language:'Other',         pct: 2.0}
      ],
      daytime_population: {residential_pop:49200, daytime_pop:54800, daytime_to_residential_ratio:1.11, workers_present:28400, workers_at_home:14600}
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
    13: {
      summary: 'Competitor deep-dive: 3 chain centers dominate — Primrose (premium), Goddard (franchise), KinderCare (corporate). All have recurring complaints about inflexibility and high staff turnover.',
      competitor_profiles: [
        { name: 'Primrose School at Johns Creek', type: 'Corporate Franchise', avg_rating: 4.2, review_count_est: 340, monthly_primary_rate: 1820,
          locations_nearby: 2, top_positive_themes: ['Clean facility','Structured curriculum','Safe environment'],
          top_complaint_themes: ['Rigid drop-off/pick-up times','No sick-day flexibility','High staff turnover'],
          sample_complaints: ['They turned my child away twice for a mild sniffle','Director changed 3 times in 2 years'],
          differentiation_opportunity: 'Flexible scheduling and staff continuity programs' },
        { name: 'Goddard School', type: 'Corporate Franchise', avg_rating: 4.4, review_count_est: 218, monthly_primary_rate: 1750,
          locations_nearby: 1, top_positive_themes: ['Play-based learning','Good communication','Safe'],
          top_complaint_themes: ['Waitlist always full','Limited infant slots','Expensive'],
          sample_complaints: ['Been on the waitlist 8 months', 'Infant room is too small'],
          differentiation_opportunity: 'Guaranteed infant enrollment with waitlist priority' },
        { name: 'KinderCare Learning Center', type: 'Corporate Chain', avg_rating: 3.8, review_count_est: 175, monthly_primary_rate: 1480,
          locations_nearby: 1, top_positive_themes: ['Affordable','Extended hours','Meals included'],
          top_complaint_themes: ['Understaffed','High turnover','Mediocre curriculum'],
          sample_complaints: ['3 different teachers in 6 months', 'Feels like a warehouse, not a school'],
          differentiation_opportunity: 'Low-ratio classrooms and NAEYC accreditation' },
        { name: "Mary's Family Daycare", type: 'Home-based', avg_rating: 4.8, review_count_est: 18, monthly_primary_rate: 950,
          monthly_secondary_rate: 850, strengths: ['Personalized care (6 children max)', 'Flexible hours 6am-7pm', 'Accepts CAPS subsidy', 'High parent trust'], weaknesses: ['No structured curriculum', 'Single provider = closure risk', 'Limited capacity'],
          differentiator: 'Lowest cost option in market — direct competition for budget-conscious families and subsidy recipients.',
          accepts_subsidy: true, capacity_est: 6
        },
        { name: 'Grace Community Church Childcare', type: 'Faith-based Non-profit', avg_rating: 4.5, review_count_est: 62, monthly_primary_rate: 875,
          monthly_secondary_rate: 775, strengths: ['Community trust & long-standing reputation', 'CAPS-accepting', 'Sliding scale pricing', 'Strong volunteer support'], weaknesses: ['Limited hours (7am-6pm)', 'Older facility', 'No NAEYC accreditation'],
          differentiator: 'Faith-based mission draws strong community loyalty; pricing 50% below premium centers creates distinct market segment.',
          accepts_subsidy: true, capacity_est: 48
        },
        { name: 'Gwinnett Head Start Program', type: 'Government/Non-profit', avg_rating: 4.1, review_count_est: 95, monthly_primary_rate: 0,
          monthly_secondary_rate: 0, strengths: ['Free for income-qualified families', 'Comprehensive wraparound services', 'Federal quality standards'], weaknesses: ['Income-restricted eligibility', 'Part-day program only (typically 3.5hrs)', 'Competitive for slots'],
          differentiator: 'Serves lowest-income bracket — not direct revenue competition, but captures 8-12% of potential market through income qualification.',
          accepts_subsidy: true, capacity_est: 120
        },
      ],
      pain_point_analysis: [
        { pain: 'Rigid pick-up/drop-off windows (no flexibility for working parents)', frequency_pct: 68, your_solution: 'Flexible 7am–7pm hours with 30-min grace windows', marketing_angle: 'Built for the real working parent' },
        { pain: 'Infant slots always waitlisted — 6–12 month waits at top centers', frequency_pct: 54, your_solution: 'Dedicated 12-slot infant room with guaranteed enrollment process', marketing_angle: 'Reserve your spot before birth' },
        { pain: 'High staff turnover creates inconsistent care quality', frequency_pct: 61, your_solution: 'Above-market pay + retention bonuses; publish avg. staff tenure', marketing_angle: 'Teachers who know your child by name — for years, not months' },
        { pain: 'No NAEYC-accredited option within 5 miles', frequency_pct: 45, your_solution: 'Commit to NAEYC accreditation by Year 2', marketing_angle: 'The only NAEYC-accredited center in Johns Creek' },
      ],
      differentiation_strategy: [
        { pillar: 'Flexibility-First Hours', description: '6:30am–7pm with flexible sick-day credits and make-up days', marketing_hook: 'Life doesn\'t follow a bell schedule. Neither do we.' },
        { pillar: 'Staff Retention & Continuity', description: 'Above-market salaries, profit-sharing, and <20% annual turnover target', marketing_hook: 'Meet your child\'s teacher. Then meet them again next year.' },
        { pillar: 'NAEYC Accreditation Track', description: 'Accreditation pathway from Month 1 — curriculum, ratios, environment', marketing_hook: 'The gold standard in early childhood education — coming to Johns Creek' },
        { pillar: 'Infant Priority Program', description: 'Prenatal enrollment with reserved infant slots and transition support', marketing_hook: 'Reserve your infant\'s spot before your due date' },
      ],
    },
    14: { summary: 'Sensitivity analysis: break-even month most sensitive to enrollment rate (±4 months per 10% enrollment change). Tuition has second-largest impact (±2.5 months per $100 tuition change).' },
    15: { summary: 'Multi-ZIP comparison: Johns Creek (30097) ranks #1 of 5 ZIPs tested. Suwanee (30024) is strong runner-up with lower competition but 8% lower household income.' },
    16: { summary: 'Staffing model: 75-slot center requires 12 FTE staff. Lead Teacher avg $42K/yr in Gwinnett County. Total annual payroll: $392K at base staffing levels.' },
    17: { summary: 'Business plan drafted: Full SBA 7(a) package including executive summary, market analysis, competitive landscape, financial projections, and management team bio template.' },
  };
  return _demo[agentNum] || {};
}

// ── Full showcase launch: load demo run + inject banner + show score ───────────
function v2LaunchShowcase() {
  // Pre-seed API cache so demo shows live data cards instantly (no real HTTP calls)
  _v2SeedDemoAPICache();

  // Build a full demo run object that mirrors what v2RenderDashboard expects
  const demoRun = {
    ..._V2_DEMO_RUN_B,
    ts: Date.now(),
    _demoMode: true,
    _lat: 34.0290,
    _lng: -84.1130,
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

// ── Pre-seed FREE_API_CACHE with realistic demo data (ZIP 30097 — Johns Creek, GA)
// This lets demo mode show all API cards instantly without making real HTTP calls.
function _v2SeedDemoAPICache() {
  if (typeof FREE_API_CACHE === 'undefined') return;

  // Census ACS for ZIP 30097 (Johns Creek, GA — 2022 ACS 5-year estimates)
  FREE_API_CACHE['acs:30097'] = {
    zip: '30097',
    median_income:        127400,
    total_population:      48320,
    population_under_18:   12840,
    total_households:      16200,
    housing_units:         16890,
    median_gross_rent:      1780,
    labor_force:           24100,
    bachelors_degree_plus:  9860,
    source: 'US Census Bureau ACS 5-Year Estimates (2022)',
    fetched_at: Date.now(),
  };

  // ZIP centroid for 30097 (Nominatim result)
  FREE_API_CACHE['centroid:30097'] = { lat: 34.0290, lng: -84.1130 };

  // FRED economic indicators (realistic 2025 values)
  FREE_API_CACHE['fred:indicators'] = {
    PRIME:    { label: 'Prime Rate (%)',     value: 8.50,  date: '2025-01-01' },
    UNRATE:   { label: 'Unemployment (%)',   value: 4.10,  date: '2025-01-01' },
    CPIAUCSL: { label: 'CPI (inflation)',    value: 313.7, date: '2025-01-01' },
  };

  // BLS — Child day care services (daycare industry) employment series
  FREE_API_CACHE['bls:daycare'] = {
    status: 'REQUEST_SUCCEEDED',
    Results: {
      series: [{
        seriesID: 'CES6562440001',
        data: [
          { year: '2024', period: 'M12', periodName: 'December', value: '942.6' },
          { year: '2024', period: 'M06', periodName: 'June',     value: '921.3' },
          { year: '2023', period: 'M12', periodName: 'December', value: '905.8' },
          { year: '2023', period: 'M06', periodName: 'June',     value: '889.4' },
        ],
      }],
    },
  };

  // Overpass — daycare competitors near Johns Creek (realistic OSM records)
  FREE_API_CACHE['overpass:34.029,-84.113,daycare,15'] = [
    { name: 'Primrose School at Johns Creek',  lat: 34.031, lng: -84.118, address: '8700 Medlock Bridge Rd, Johns Creek', phone: '(770) 497-3388', website: 'https://primroseschools.com', type: 'daycare' },
    { name: 'Goddard School — Suwanee',        lat: 34.055, lng: -84.079, address: '3580 Peachtree Pkwy, Suwanee',        phone: '(678) 482-2120', website: 'https://goddardschool.com',   type: 'daycare' },
    { name: 'KinderCare Learning Center',      lat: 34.021, lng: -84.108, address: '9810 Jones Bridge Rd, Alpharetta',    phone: '(770) 751-0222', website: 'https://kindercare.com',      type: 'daycare' },
    { name: 'The Sunshine House',              lat: 34.042, lng: -84.097, address: '4370 McGinnis Ferry Rd, Suwanee',     phone: '(678) 341-7200', website: null,                          type: 'daycare' },
  ];
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
