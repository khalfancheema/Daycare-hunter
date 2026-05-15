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

  // For non-daycare/non-medical_practice industries, delegate to the
  // broader DEMO_DATA dataset from 36-demo-data.js. This keeps v1 demo
  // path working for restaurant, gas_station, coffee_shop, etc. — which
  // would otherwise return {} and render blank.
  if (industry !== 'daycare') {
    if (typeof DEMO_DATA !== 'undefined' && DEMO_DATA[agentNum]) {
      return DEMO_DATA[agentNum][industry] || DEMO_DATA[agentNum]['daycare'] || {};
    }
    return {};
  }
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
    3: { // Site Selection
      summary: 'Top 3 locations identified in Johns Creek / Suwanee corridor. Suwanee Town Center is #1 pick: 8,400 sqft end-cap retail, C-2 zoning, $14.50/sqft NNN, 28K daily traffic.',
      locations: [
        { rank:1, city:'Suwanee', submarket:'Suwanee Town Center / Peachtree Pkwy', overall_score:92,
          scores:{demand:94,competition:88,demographics:96,real_estate:82,regulatory:90},
          capacity_recommended:90, target_infant_tuition:2050, target_preschool_tuition:1650,
          risk:'Low', timeline_months:14, children_under5_nearby:3900, competitors_within_2mi:2,
          sqft_needed:8400, est_monthly_rent_range:'$11,000–$14,000',
          ideal_property_type:'End-cap retail or freestanding commercial',
          zoning_needed:'C-2',
          pros:['Fastest-growing ZIP in Gwinnett','Premium income $112K median','Only 2 competitors within 2 mi','28K daily traffic count'],
          cons:['Higher lease rates','Limited available space'],
          reasoning:'3,900 children under 5 (Census ACS 2022) vs 2 licensed competitors. Demand ratio 4.8:1.',
          reasoning_sources:['US Census ACS 2022','Georgia CAPS licensing database','Google Maps']
        },
        { rank:2, city:'Sugar Hill', submarket:'Sugar Hill Town Center / GA-20',overall_score:87,
          scores:{demand:88,competition:90,demographics:84,real_estate:86,regulatory:88},
          capacity_recommended:75, target_infant_tuition:1900, target_preschool_tuition:1500,
          risk:'Low-Medium', timeline_months:13, children_under5_nearby:2200, competitors_within_2mi:1,
          sqft_needed:7000, est_monthly_rent_range:'$8,000–$10,500',
          ideal_property_type:'Retail strip or flex space',
          zoning_needed:'C-1 or PUD',
          pros:['City actively recruiting family amenities','Lowest competition in corridor','New residential growth'],
          cons:['Smaller population base','Newer unproven market'],
          reasoning:'2,200 children under 5; only 1 competitor. Strong growth trajectory.',
          reasoning_sources:['Census ACS 2022','State CAPS database','City of Sugar Hill planning dept']
        },
        { rank:3, city:'Johns Creek', submarket:'McGinnis Ferry Rd / Medlock Bridge Rd',overall_score:84,
          scores:{demand:86,competition:80,demographics:94,real_estate:78,regulatory:85},
          capacity_recommended:80, target_infant_tuition:2100, target_preschool_tuition:1700,
          risk:'Medium', timeline_months:15, children_under5_nearby:2800, competitors_within_2mi:3,
          sqft_needed:7500, est_monthly_rent_range:'$13,000–$17,000',
          ideal_property_type:'Former preschool or medical office conversion',
          zoning_needed:'C-2 or mixed-use',
          pros:['Highest median income $125K','Strong school ratings','Premium brand positioning'],
          cons:['3 existing competitors','Higher lease costs','More competitive market'],
          reasoning:'Highest income demographics but most competitive. Premium positioning required.',
          reasoning_sources:['Census ACS 2022','NAEYC accreditation finder','LoopNet listings']
        },
      ],
    },
    4: { // Real Estate
      summary: '8,200 sqft former preschool on Medlock Bridge Rd available at $9.50/sqft NNN. LoopNet shows 3 qualified listings. SBA 7(a) pre-qualification at $350K received from Live Oak Bank.',
      by_city_summary: [
        { city:'Suwanee', listings_found:4, avg_rent_sqft:14.50, avg_sqft:8200, best_option:'End-cap at Suwanee Town Center — move-in ready' },
        { city:'Sugar Hill', listings_found:3, avg_rent_sqft:11.20, avg_sqft:7100, best_option:'Flex space on GA-20 — requires minor buildout' },
        { city:'Johns Creek', listings_found:2, avg_rent_sqft:16.80, avg_sqft:7600, best_option:'Former preschool on Medlock Bridge — ideal layout' },
      ],
      listings: [
        { address:'4200 Suwanee Town Center Pkwy, Suwanee GA 30024', sqft:8400, monthly_rent:10150, annual_rent_psf:14.50,
          property_type:'End-cap retail', zoning:'C-2', available:true, condition:'Move-in ready',
          childcare_compliant:true, outdoor_space_sqft:4200, parking_spaces:38,
          url:'https://www.loopnet.com/search/commercial-real-estate/suwanee-ga/for-lease/' },
        { address:'1150 Peachtree Industrial Blvd, Sugar Hill GA 30518', sqft:7200, monthly_rent:6720, annual_rent_psf:11.20,
          property_type:'Retail strip end-cap', zoning:'C-1', available:true, condition:'Light buildout needed',
          childcare_compliant:false, outdoor_space_sqft:3200, parking_spaces:28,
          url:'https://www.loopnet.com/search/commercial-real-estate/sugar-hill-ga/for-lease/' },
        { address:'10700 Medlock Bridge Rd, Johns Creek GA 30022', sqft:8200, monthly_rent:11567, annual_rent_psf:16.93,
          property_type:'Former preschool / daycare', zoning:'C-2', available:true, condition:'Previous childcare use',
          childcare_compliant:true, outdoor_space_sqft:5800, parking_spaces:42,
          url:'https://www.loopnet.com/search/commercial-real-estate/johns-creek-ga/for-lease/' },
      ],
    },
    5: { // Compliance
      total_timeline_months: 4, timeline_months: 4,
      summary: 'Georgia DECAL licensing: 4-month process. Fire marshal inspection, health dept inspection, background checks, and staff CPR/First Aid required. No major blockers identified.',
      requirements: [
        { category:'Business Formation', item:'Georgia LLC Formation', detail:'Register with GA Secretary of State', timeline_weeks:1, cost_usd:100, priority:'Critical', agency_name:'Georgia Secretary of State', apply_url:'https://ecorp.sos.ga.gov/', online_available:true },
        { category:'Tax', item:'Federal EIN', detail:'Apply online at IRS.gov — free, instant', timeline_weeks:0, cost_usd:0, priority:'Critical', agency_name:'Internal Revenue Service', apply_url:'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online', online_available:true },
        { category:'Licensing', item:'Georgia DECAL Operating License', detail:'Primary state childcare license via Bright from the Start', timeline_weeks:8, cost_usd:50, priority:'Critical', agency_name:'Georgia DECAL', apply_url:'https://childcare.georgia.gov/apply-license', online_available:true },
        { category:'Fire', item:'Fire Marshal Inspection', detail:'Pre-occupancy fire safety inspection', timeline_weeks:2, cost_usd:0, priority:'Critical', agency_name:'Gwinnett County Fire Marshal', apply_url:'https://www.gwinnettcounty.com', online_available:false },
        { category:'Building', item:'Certificate of Occupancy', detail:'Final building department sign-off', timeline_weeks:2, cost_usd:300, priority:'Critical', agency_name:'Gwinnett County Building Dept', apply_url:'https://www.gwinnettcounty.com', online_available:false },
      ],
      timeline_phases:[
        {phase:'Business Formation',weeks:2,tasks:'LLC, EIN, bank account'},
        {phase:'Site & Zoning',weeks:6,tasks:'Zoning confirmation, lease, zoning permit'},
        {phase:'Permits & Plans',weeks:10,tasks:'Architect drawings, building permit, DECAL pre-app'},
        {phase:'Build-Out',weeks:14,tasks:'Construction, equipment, fire safety systems'},
        {phase:'Licensing & Inspections',weeks:4,tasks:'Fire marshal, CO, DECAL license, staff checks'},
        {phase:'Soft Open',weeks:2,tasks:'Staff training, pre-enrollment, marketing launch'},
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
    9: { // Business Plan
      business_name: 'Bright Futures Early Learning Center',
      entity_type: 'LLC',
      owner_placeholder: '[Owner Name]',
      executive_summary: {
        concept: 'A premium, NAEYC-track early learning center in Suwanee, GA serving 90 children ages 6 weeks–5 years with flexible scheduling, experienced staff, and research-based Reggio-inspired curriculum.',
        opportunity: 'The Suwanee / Johns Creek corridor has a 4.8:1 demand-to-supply ratio with zero NAEYC-accredited competitors within 5 miles. Median household income of $112K supports premium tuition of $1,900–$2,100/month.',
        ask: 'Seeking $350K SBA 7(a) financing + $175K equity contribution. Total capital stack: $525K. Projected break-even Month 18 at 82% occupancy.',
      },
      company_overview: {
        mission: 'To provide exceptional early childhood education with the flexibility, transparency, and staff continuity that working families deserve.',
        location: '4200 Suwanee Town Center Pkwy, Suwanee GA 30024',
        services: [
          { name:'Infant Program (6 wks–12 mo)', capacity:12, monthly_rate:2100, annual_revenue:302400 },
          { name:'Toddler Program (12–24 mo)',   capacity:18, monthly_rate:1950, annual_revenue:421200 },
          { name:'Preschool 2 (2–3 yrs)',        capacity:20, monthly_rate:1750, annual_revenue:420000 },
          { name:'Preschool 3 (3–4 yrs)',        capacity:20, monthly_rate:1650, annual_revenue:396000 },
          { name:'Pre-K (4–5 yrs)',              capacity:20, monthly_rate:1600, annual_revenue:384000 },
        ],
      },
      market_analysis: {
        market_size: { tam:580000000, sam:42000000, som:7200000 },
        target_customer: 'Dual-income professional families ($90K–$150K HHI) with children 0–5 years, within 5 miles of Suwanee Town Center.',
        market_trends: ['Post-COVID childcare desert growth','Remote work increasing demand for flex scheduling','NAEYC accreditation as premium differentiator'],
      },
      operations_plan: {
        staff_count: 14,
        key_roles: ['Center Director (DECAL-certified)','Lead Teachers (4)','Assistant Teachers (6)','Office Manager','Cook/Nutrition Specialist'],
        hours: 'Monday–Friday 6:30am–7:00pm',
        curriculum: 'Reggio-inspired with structured literacy/math readiness milestones',
      },
      financial_summary: { year1_revenue: 1450000, year1_expenses: 1280000, year1_net: 170000, year3_revenue: 1923600, year3_net: 448000 },
      implementation_timeline: [
        { month:'1–2', milestone:'LLC formation, EIN, SBA pre-qual, site LOI' },
        { month:'3–4', milestone:'Lease signed, architect hired, DECAL pre-app submitted' },
        { month:'5–8', milestone:'Buildout, equipment procurement, staff hiring' },
        { month:'9–12', milestone:'DECAL license received, grand opening, enrollment ramp' },
      ],
    },
    10: { // Project Plan
      project_name: 'Bright Futures Early Learning Center — Launch',
      total_duration_months: 18,
      target_open_date: 'Month 13 from project start',
      phases: [
        { phase:'Phase 1: Foundation & Funding', months:'1–3', color:'#4a9eff',
          tasks:[
            {task:'Form Georgia LLC',month_start:1,duration:0.5,owner:'Owner',priority:'Critical',cost:150,detail:'File at ecorp.sos.ga.gov ($100 filing fee)'},
            {task:'Obtain Federal EIN',month_start:1,duration:0.25,owner:'Owner',priority:'Critical',cost:0,detail:'IRS.gov online — instant'},
            {task:'SBA 7(a) Pre-Qualification',month_start:1,duration:2,owner:'Owner + CPA',priority:'Critical',cost:0,detail:'Live Oak Bank — childcare specialist lender'},
            {task:'Engage Commercial RE Broker',month_start:1,duration:1,owner:'Owner',priority:'Critical',cost:0,detail:'Broker paid by landlord — target Suwanee / Sugar Hill'},
            {task:'DECAL Pre-Application Consult',month_start:2,duration:1,owner:'Owner + Consultant',priority:'Critical',cost:1500,detail:'Hire DECAL consultant before signing lease'},
            {task:'SBA Loan Package Submission',month_start:2,duration:2,owner:'Owner + CPA',priority:'Critical',cost:0,detail:'Form 1919, 413, financial projections, LOI'},
          ]
        },
        { phase:'Phase 2: Legal, Lease & Design', months:'3–6', color:'#3dd68c',
          tasks:[
            {task:'Execute Commercial Lease',month_start:3,duration:0.5,owner:'Owner + Attorney',priority:'Critical',cost:42000,detail:'5-yr + 2×5 options, TI allowance, 3-mo free rent'},
            {task:'Hire Licensed Architect',month_start:3,duration:1,owner:'Owner',priority:'Critical',cost:18000,detail:'DECAL-compliant drawings: 35sqft/child indoor, 75sqft outdoor'},
            {task:'Apply for Building Permit',month_start:4,duration:1,owner:'Architect + Owner',priority:'Critical',cost:3500,detail:'Gwinnett County building dept — allow 4–6 weeks'},
            {task:'DECAL Pre-Application Submission',month_start:5,duration:1,owner:'Owner',priority:'Critical',cost:50,detail:'Submit Form 282 — facility details, capacity, director info'},
            {task:'Order Playground Equipment',month_start:5,duration:2,owner:'Owner',priority:'High',cost:48000,detail:'8–12 week lead time; ASTM F1487 required'},
          ]
        },
        { phase:'Phase 3: Construction & Licensing', months:'6–10', color:'#f5a623',
          tasks:[
            {task:'Construction Begins',month_start:6,duration:4,owner:'General Contractor',priority:'Critical',cost:185000,detail:'Milestone: structural, HVAC, plumbing, electrical, finish work'},
            {task:'Staff Director Hire',month_start:7,duration:1,owner:'Owner',priority:'Critical',cost:55000,detail:'Must have DECAL director credentials — start 6 months pre-open'},
            {task:'Staff Hiring (Lead + Asst Teachers)',month_start:8,duration:2,owner:'Director',priority:'Critical',cost:0,detail:'10 classroom staff — background checks start immediately'},
            {task:'Fire Marshal Inspection',month_start:9,duration:0.5,owner:'Owner',priority:'Critical',cost:0,detail:'Schedule 4 weeks in advance — free inspection'},
            {task:'Certificate of Occupancy',month_start:10,duration:0.5,owner:'Owner',priority:'Critical',cost:300,detail:'Final CO from Gwinnett County Building Dept'},
          ]
        },
        { phase:'Phase 4: Pre-Opening & Launch', months:'10–13', color:'#a78bfa',
          tasks:[
            {task:'DECAL License Issued',month_start:10,duration:1,owner:'Owner + Director',priority:'Critical',cost:500,detail:'Submit final application with CO, insurance, staff credentials'},
            {task:'Pre-Enrollment Waitlist Campaign',month_start:8,duration:4,owner:'Owner',priority:'High',cost:2000,detail:'Johns Creek Parents Facebook (28K members), Nextdoor, Google Ads'},
            {task:'Staff Training Week',month_start:12,duration:0.5,owner:'Director',priority:'High',cost:3000,detail:'Curriculum, emergency procedures, parent communication protocols'},
            {task:'Soft Open (25 children)',month_start:13,duration:1,owner:'Director',priority:'High',cost:0,detail:'Limited capacity; refine operations before full ramp'},
            {task:'Grand Opening',month_start:13,duration:0.25,owner:'Owner + Director',priority:'Medium',cost:1500,detail:'Community event, media outreach, referral incentive launch'},
          ]
        },
      ],
      milestones: [
        { name:'LLC + EIN', month:1, status:'planned', icon:'🏛' },
        { name:'SBA Approval', month:3, status:'planned', icon:'💰' },
        { name:'Lease Signed', month:3, status:'planned', icon:'📝' },
        { name:'Building Permit', month:5, status:'planned', icon:'🏗' },
        { name:'DECAL Pre-App', month:5, status:'planned', icon:'📋' },
        { name:'Construction Complete', month:10, status:'planned', icon:'🏠' },
        { name:'DECAL License', month:11, status:'planned', icon:'✅' },
        { name:'Grand Opening', month:13, status:'planned', icon:'🎉' },
      ],
    },
    11: { // Market Map
      center: { lat:34.0512, lng:-84.0710, label:'ZIP 30097 — Suwanee, GA' },
      cities: [
        { name:'Suwanee',     county:'Gwinnett', lat:34.0512, lng:-84.0710, gap_score:9, demand_score:9, supply_score:3, unserved_children:580, median_income:112000, competitor_count:2, priority:'Critical Opportunity',      recommended_action:'Open Here #1', real_estate_url:'https://www.loopnet.com/search/commercial-real-estate/suwanee-ga/for-lease/' },
        { name:'Sugar Hill',  county:'Gwinnett', lat:34.1118, lng:-84.0541, gap_score:8, demand_score:8, supply_score:3, unserved_children:420, median_income:89000,  competitor_count:1, priority:'High Opportunity',           recommended_action:'Open Here #2', real_estate_url:'https://www.loopnet.com/search/commercial-real-estate/sugar-hill-ga/for-lease/' },
        { name:'Johns Creek', county:'Fulton',   lat:34.0289, lng:-84.1986, gap_score:7, demand_score:9, supply_score:5, unserved_children:390, median_income:125000, competitor_count:4, priority:'High Opportunity',           recommended_action:'Consider #3',  real_estate_url:'https://www.loopnet.com/search/commercial-real-estate/johns-creek-ga/for-lease/' },
        { name:'Buford',      county:'Gwinnett', lat:34.1193, lng:-83.9938, gap_score:7, demand_score:7, supply_score:4, unserved_children:310, median_income:81000,  competitor_count:1, priority:'High Opportunity',           recommended_action:'Open Here #4', real_estate_url:'https://www.loopnet.com/search/commercial-real-estate/buford-ga/for-lease/' },
        { name:'Winder',      county:'Barrow',   lat:33.9937, lng:-83.7196, gap_score:9, demand_score:8, supply_score:2, unserved_children:480, median_income:52000,  competitor_count:1, priority:'Critical — Underserved',     recommended_action:'First-Mover',  real_estate_url:'https://www.loopnet.com/search/commercial-real-estate/winder-ga/for-lease/' },
        { name:'Duluth',      county:'Gwinnett', lat:34.0020, lng:-84.1455, gap_score:4, demand_score:7, supply_score:7, unserved_children:160, median_income:76000,  competitor_count:8, priority:'Saturating',                 recommended_action:'Avoid',        real_estate_url:'https://www.loopnet.com/search/commercial-real-estate/duluth-ga/for-lease/' },
        { name:'Lawrenceville',county:'Gwinnett',lat:33.9526, lng:-83.9880, gap_score:2, demand_score:7, supply_score:9, unserved_children:80,  median_income:58000,  competitor_count:14,priority:'Saturated',                  recommended_action:'Do Not Enter', real_estate_url:'https://www.loopnet.com/search/commercial-real-estate/lawrenceville-ga/for-lease/' },
        { name:'Alpharetta',  county:'Fulton',   lat:34.0754, lng:-84.2941, gap_score:5, demand_score:8, supply_score:6, unserved_children:200, median_income:120000, competitor_count:7, priority:'Moderate',                   recommended_action:'Premium niche', real_estate_url:'https://www.loopnet.com/search/commercial-real-estate/alpharetta-ga/for-lease/' },
      ],
      real_estate_pins: [
        { label:'Suwanee Town Center', lat:34.0480, lng:-84.0690, rent:10150, sqft:8400, url:'https://www.loopnet.com/search/commercial-real-estate/suwanee-ga/for-lease/' },
        { label:'Sugar Hill — GA-20',  lat:34.1090, lng:-84.0520, rent:6720,  sqft:7200, url:'https://www.loopnet.com/search/commercial-real-estate/sugar-hill-ga/for-lease/' },
        { label:'Medlock Bridge Rd',   lat:34.0350, lng:-84.1800, rent:11567, sqft:8200, url:'https://www.loopnet.com/search/commercial-real-estate/johns-creek-ga/for-lease/' },
        { label:'Buford — Hamilton Mill',lat:34.1170,lng:-83.9910,rent:8400,  sqft:6900, url:'https://www.loopnet.com/search/commercial-real-estate/buford-ga/for-lease/' },
      ],
      directions: [
        { from:'ZIP 30097 (Suwanee)', to:'Sugar Hill Town Center',  drive_mins:12, miles:7.8,  google_url:'https://maps.google.com/?saddr=Suwanee+GA+30097&daddr=Sugar+Hill+GA+30518' },
        { from:'ZIP 30097 (Suwanee)', to:'Johns Creek',             drive_mins:18, miles:11.2, google_url:'https://maps.google.com/?saddr=Suwanee+GA+30097&daddr=Johns+Creek+GA+30022' },
        { from:'ZIP 30097 (Suwanee)', to:'Buford / Hamilton Mill',  drive_mins:16, miles:9.8,  google_url:'https://maps.google.com/?saddr=Suwanee+GA+30097&daddr=Buford+GA+30519' },
        { from:'ZIP 30097 (Suwanee)', to:'Winder, Barrow County',   drive_mins:35, miles:27.4, google_url:'https://maps.google.com/?saddr=Suwanee+GA+30097&daddr=Winder+GA+30680' },
        { from:'ZIP 30097 (Suwanee)', to:'Alpharetta',              drive_mins:22, miles:14.6, google_url:'https://maps.google.com/?saddr=Suwanee+GA+30097&daddr=Alpharetta+GA+30009' },
      ],
    },
    12: { // Grants
      summary: 'Three fundable grant opportunities totaling ~$45K in Year 1. DECAL Quality Care Grant is the highest-value with a rolling deadline.',
      total_potential_funding: 45000,
      grants: [
        { name: 'DECAL Quality Care Grant',    amount: 25000, deadline: 'Rolling',        url: 'https://decal.ga.gov', eligibility:'Licensed GA childcare center' },
        { name: 'Georgia CAPS Subsidy',        amount: 15000, deadline: 'Annual — Apr 1', url: 'https://caps.decal.ga.gov', eligibility:'CAPS-accepting licensed centers' },
        { name: 'Gwinnett County Small Biz',   amount:  5000, deadline: 'Quarterly',      url: 'https://gwinnettcounty.com', eligibility:'Gwinnett County business' },
      ],
      all_grants_table: [
        { name: 'DECAL Quality Care Grant',    amount: 25000, deadline: 'Rolling',        type:'State', probability:'High', eligibility:'Licensed GA childcare center' },
        { name: 'Georgia CAPS Subsidy',        amount: 15000, deadline: 'Annual — Apr 1', type:'State', probability:'High', eligibility:'CAPS-accepting licensed centers' },
        { name: 'Gwinnett County Small Biz',   amount:  5000, deadline: 'Quarterly',      type:'Local', probability:'Medium', eligibility:'Gwinnett County business' },
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
        { pain: 'Rigid pick-up/drop-off windows (no flexibility for working parents)', frequency_pct: 68, competitors_affected:['Primrose','KinderCare'], your_solution: 'Flexible 7am–7pm hours with 30-min grace windows', marketing_angle: 'Built for the real working parent' },
        { pain: 'Infant slots always waitlisted — 6–12 month waits at top centers', frequency_pct: 54, competitors_affected:['Goddard','Primrose'], your_solution: 'Dedicated 12-slot infant room with guaranteed enrollment process', marketing_angle: 'Reserve your spot before birth' },
        { pain: 'High staff turnover creates inconsistent care quality', frequency_pct: 61, competitors_affected:['KinderCare','Primrose'], your_solution: 'Above-market pay + retention bonuses; publish avg. staff tenure', marketing_angle: 'Teachers who know your child by name — for years, not months' },
        { pain: 'No NAEYC-accredited option within 5 miles', frequency_pct: 45, competitors_affected:['All'], your_solution: 'Commit to NAEYC accreditation by Year 2', marketing_angle: 'The only NAEYC-accredited center in Johns Creek' },
      ],
      differentiation_strategy: [
        { pillar: 'Flexibility-First Hours', description: '6:30am–7pm with flexible sick-day credits and make-up days', competitors_this_beats:['Primrose','KinderCare'], marketing_hook: 'Life doesn\'t follow a bell schedule. Neither do we.' },
        { pillar: 'Staff Retention & Continuity', description: 'Above-market salaries, profit-sharing, and <20% annual turnover target', competitors_this_beats:['KinderCare','Primrose'], marketing_hook: 'Meet your child\'s teacher. Then meet them again next year.' },
        { pillar: 'NAEYC Accreditation Track', description: 'Accreditation pathway from Month 1 — curriculum, ratios, environment', competitors_this_beats:['All'], marketing_hook: 'The gold standard in early childhood education — coming to Johns Creek' },
        { pillar: 'Infant Priority Program', description: 'Prenatal enrollment with reserved infant slots and transition support', competitors_this_beats:['Goddard','Primrose'], marketing_hook: 'Reserve your infant\'s spot before your due date' },
      ],
      messaging_guide: [
        { audience:'Primrose waitlisted parents', headline:'Done waiting? We have infant spots opening now.', body:'Your baby doesn\'t have to wait 8 months for quality care. We have dedicated infant spaces and guaranteed enrollment.', cta:'Join our priority list', channel:'Facebook — Johns Creek Parents group' },
        { audience:'KinderCare frustrated parents', headline:'Same teacher every week. Not a different one every month.', body:'Staff retention matters. Our teachers average 3+ years with us — your child builds real bonds.', cta:'Schedule a tour', channel:'Google Ads — childcare search terms' },
      ],
    },
    14: { // Code Review — dynamic (should be generated live, but provide fallback)
      summary: 'Pipeline ran in demo mode — 11 of 15 agents have full data. Code review based on demo run shows strong architecture with rich agent outputs.',
      overall_grade: 'A',
      issues: [
        { id:'CR-001', severity:'medium', category:'Data', title:'Demo agents 14/15 show demo data only', detail:'Code Review and QA agents show pre-seeded data in demo mode rather than real pipeline analysis.', location:'getDemoData(14), getDemoData(15)', fix:'Run live pipeline with API key for real code review.' },
      ],
      performance_metrics: [
        { metric:'Demo Pipeline Completeness', current:'11/15 agents with rich data', optimized:'15/15', score:73, notes:'Agents 3, 4, 9, 10, 11 now have full demo data' },
        { metric:'Agent Sub-call Coverage', current:'5 agents split: 1, 5, 6, 7, 9, 10, 13', optimized:'All large agents', score:88, notes:'Eliminates max_tokens on all heavy prompts' },
        { metric:'Fallback Coverage', current:'getFallback1–17 all defined', optimized:'Optimal', score:100, notes:'No agent can crash the pipeline' },
      ],
      cost_analysis: {
        model:'claude-sonnet-4-6', input_cost_per_mtok:3.00, output_cost_per_mtok:15.00,
        agents:[
          {agent:'Demographics (2 sub-calls)',  avg_input_tokens:1200, avg_output_tokens:2000, cost_per_run:0.034},
          {agent:'Compliance (2 sub-calls)',     avg_input_tokens:900,  avg_output_tokens:1500, cost_per_run:0.025},
          {agent:'Comp Intel (2 sub-calls)',     avg_input_tokens:950,  avg_output_tokens:1400, cost_per_run:0.024},
          {agent:'Gap Analysis',                avg_input_tokens:1200, avg_output_tokens:1500, cost_per_run:0.026},
          {agent:'Site Selection',              avg_input_tokens:1200, avg_output_tokens:1800, cost_per_run:0.030},
          {agent:'Real Estate',                 avg_input_tokens:800,  avg_output_tokens:1400, cost_per_run:0.024},
          {agent:'Financial (3 sub-calls)',     avg_input_tokens:1100, avg_output_tokens:2200, cost_per_run:0.036},
          {agent:'Executive Summary',           avg_input_tokens:1800, avg_output_tokens:1200, cost_per_run:0.023},
          {agent:'Business Plan (4 sub-calls)', avg_input_tokens:2000, avg_output_tokens:3200, cost_per_run:0.052},
          {agent:'Project Plan (3 sub-calls)',  avg_input_tokens:1800, avg_output_tokens:2800, cost_per_run:0.046},
          {agent:'Market Map',                  avg_input_tokens:900,  avg_output_tokens:1600, cost_per_run:0.027},
          {agent:'Grants',                      avg_input_tokens:900,  avg_output_tokens:1500, cost_per_run:0.025},
          {agent:'Comp Deep-Dive (3 sub-calls)',avg_input_tokens:1000, avg_output_tokens:2400, cost_per_run:0.039},
          {agent:'Code Review (dynamic)',       avg_input_tokens:800,  avg_output_tokens:1400, cost_per_run:0.024},
          {agent:'QA Testing (dynamic)',        avg_input_tokens:900,  avg_output_tokens:1600, cost_per_run:0.027},
        ],
        total_cost_per_run:0.462, optimized_cost_per_run:0.40,
        monthly_cost_10runs:4.62, monthly_cost_50runs:23.10,
        optimization_tips:['Sub-agent splits eliminate max_tokens truncation on 6 heavy agents','Dynamic agents 14/15 use real pipeline state — no fake hardcoded data','Fallback coverage means no run ever crashes — saves re-run costs'],
      },
      recommended_fixes_priority: [
        { priority:1, id:'CR-001', effort:'N/A in demo', impact:'Run live pipeline for real analysis' },
      ],
    },
    15: { // QA Testing — dynamic (show demo-mode state)
      summary: 'Demo mode QA: 15 agents seeded with rich demo data. All rendering functions verified. Field validation passes for all seeded agents.',
      overall_pass_rate: 94,
      test_suites: [
        { suite:'Pipeline Completion', tests:[
          {id:'T001', name:'Demo agents all seeded', status:'pass', detail:'All 15 agents have demo data in getDemoData()', expected:'Non-empty data for each agent'},
          {id:'T002', name:'Rich array fields present', status:'pass', detail:'Agents 3/4/9/10/11 now have locations, listings, phases, cities arrays', expected:'Arrays length > 0'},
          {id:'T003', name:'Render functions triggered', status:'pass', detail:'buildMap, renderBusinessPlan, renderQA all execute on demo data', expected:'No runtime errors'},
        ]},
        { suite:'Data Validation', tests:[
          {id:'T004', name:'Agent 7 scenarios array', status:'pass', detail:'3 scenarios (Conservative/Base/Optimistic) with all required fields', expected:'breakeven_months and monthly_net present'},
          {id:'T005', name:'Agent 8 verdict field', status:'pass', detail:'Verdict: "Go" with rationale and next_steps', expected:'Non-empty string verdict'},
          {id:'T006', name:'Agent 13 competitor profiles', status:'pass', detail:'3 competitor profiles with themes, complaints, differentiation', expected:'Array length >= 3'},
          {id:'T007', name:'Agent 11 map cities', status:'pass', detail:'8 cities with lat/lng, gap_score, real_estate_url', expected:'cities.length >= 4'},
        ]},
        { suite:'Architecture Checks', tests:[
          {id:'T008', name:'Sub-agent splits active', status:'pass', detail:'Agents 1,5,6,7,9,10,13 use multi-part sub-calls', expected:'No single >4K token prompts'},
          {id:'T009', name:'Fallback coverage 17/17', status:'pass', detail:'getFallback1() through getFallback17() all defined', expected:'typeof getFallbackN === function'},
          {id:'T010', name:'Dynamic agents 14/15', status:'pass', detail:'Code Review and QA now use real pipeline state — no hardcoded JSON', expected:'Prompts < 2K tokens'},
          {id:'T011', name:'Phase 9 failure handling', status:'pass', detail:'Promise.allSettled results captured; fallbacks applied on rejection', expected:'Failed agents use fallback not undefined'},
        ]},
      ],
      data_validation: {
        fields_checked: 45, fields_passed: 42, fields_warned: 2, fields_failed: 1,
        critical_issues: [],
        warnings: ['Agents 14/15 show static demo data — run live for real analysis', 'Medical practice demo has fewer agents seeded than daycare demo'],
        by_agent: [
          {agent:'Demographics',    fields_ok:9, fields_warn:0, fields_fail:0, score:100},
          {agent:'Gap Analysis',    fields_ok:4, fields_warn:1, fields_fail:0, score:80},
          {agent:'Site Selection',  fields_ok:5, fields_warn:0, fields_fail:0, score:100},
          {agent:'Real Estate',     fields_ok:4, fields_warn:0, fields_fail:0, score:100},
          {agent:'Compliance',      fields_ok:5, fields_warn:0, fields_fail:0, score:100},
          {agent:'Competitive Intel',fields_ok:3,fields_warn:0, fields_fail:0, score:100},
          {agent:'Financials',      fields_ok:5, fields_warn:0, fields_fail:0, score:100},
          {agent:'Executive Summary',fields_ok:5,fields_warn:0, fields_fail:0, score:100},
          {agent:'Business Plan',   fields_ok:6, fields_warn:0, fields_fail:0, score:100},
          {agent:'Project Plan',    fields_ok:4, fields_warn:0, fields_fail:0, score:100},
          {agent:'Market Map',      fields_ok:4, fields_warn:0, fields_fail:0, score:100},
          {agent:'Grants',          fields_ok:3, fields_warn:0, fields_fail:0, score:100},
          {agent:'Deep-Dive',       fields_ok:5, fields_warn:0, fields_fail:0, score:100},
          {agent:'Code Review',     fields_ok:3, fields_warn:1, fields_fail:0, score:75},
          {agent:'QA Testing',      fields_ok:3, fields_warn:0, fields_fail:1, score:75},
        ],
      },
      ux_audit: [
        {category:'Demo Mode', title:'Code Review and QA show static demo data in demo mode', severity:'low', detail:'Agents 14 and 15 seed pre-written content in demo mode since they cannot run real pipeline analysis.', recommendation:'Run live pipeline with API key to see real code review and QA results.'},
      ],
      health_score: {
        overall: 94,
        dimensions: [
          {label:'API Reliability',    score:95, color:'var(--green)', notes:'3-retry + backoff + stop_reason guard'},
          {label:'Data Completeness',  score:93, color:'var(--green)', notes:'All 15 agents have fallbacks and demo data'},
          {label:'Sub-agent Coverage', score:95, color:'var(--green)', notes:'6 heavy agents split — max_tokens eliminated'},
          {label:'Error Recovery',     score:98, color:'var(--green)', notes:'Phase 9 failures captured + fallbacks applied'},
          {label:'UX Quality',         score:92, color:'var(--green)', notes:'Charts, tables, maps, export all functional'},
          {label:'Cost Efficiency',    score:87, color:'var(--green)', notes:'~$0.46/run; sub-splits reduce by ~15%'},
          {label:'Demo Mode',          score:88, color:'var(--green)', notes:'All 15 agents seeded with rich realistic data'},
          {label:'Code Quality',       score:95, color:'var(--green)', notes:'Modular src/ + build.mjs; no dead code'},
        ],
      },
    },
    16: { // Build vs Buy
      summary: 'BUILD recommended. Greenfield build in Suwanee Town Center offers superior long-term value. Acquisition of existing center not recommended at current asking prices.',
      recommendation: 'Build',
      recommendation_rationale: 'Building a new center in Suwanee Town Center gives brand control, optimal layout, and DECAL compliance from day one. Available acquisitions are overpriced relative to their revenue.',
      financial_comparison: {
        build_total_cost: 526500, buy_total_cost: 680000,
        build_break_even_months: 18, buy_break_even_months: 24,
        build_year3_roi: 67, buy_year3_roi: 48,
        build_monthly_net_yr2: 12400, buy_monthly_net_yr2: 9800,
      },
      decision_factors: [
        { factor:'Brand & Curriculum Control',  build_score:10, buy_score:5,  weight:0.25, winner:'Build' },
        { factor:'Upfront Cost',                build_score:7,  buy_score:6,  weight:0.20, winner:'Build' },
        { factor:'Time to Open',                build_score:6,  buy_score:8,  weight:0.20, winner:'Buy' },
        { factor:'Location Quality',            build_score:9,  buy_score:6,  weight:0.20, winner:'Build' },
        { factor:'Regulatory Risk',             build_score:8,  buy_score:6,  weight:0.15, winner:'Build' },
      ],
      buy_listings: [
        { name:'Sunshine Academy (for sale)', address:'1840 Old Peachtree Rd, Duluth GA', asking_price:650000, annual_revenue:580000, enrollment_pct:78, capacity:60, reason_for_sale:'Owner retirement', url:'https://www.bizbuysell.com/georgia/child-care-businesses-for-sale/' },
        { name:'Little Stars Learning (for sale)', address:'3200 Buford Hwy, Norcross GA', asking_price:420000, annual_revenue:380000, enrollment_pct:65, capacity:45, reason_for_sale:'Relocation', url:'https://www.bizbuysell.com/georgia/child-care-businesses-for-sale/' },
      ],
      next_steps: [
        'Proceed with Suwanee Town Center site LOI — target 8,400sqft end-cap',
        'File SBA 7(a) loan application with Live Oak Bank',
        'Hire DECAL consultant to review site before lease commitment',
        'Post Director position — 6-month hiring lead time required',
      ],
    },
    17: { // Data Sources
      summary: 'All pipeline data sourced from 12 primary databases. Demographics: US Census ACS 2022. Competitive: Georgia CAPS database, Google Maps, Winnie.com. Pricing: DOL NDCP 2022. Grants: DECAL, Gwinnett County. All sources accessed for ZIP 30097 within 15-mile radius.',
      citation_quality_score: 88,
      data_sources: [
        { name:'US Census ACS 2022', type:'Federal', reliability:'High', fields_sourced:['population','median_income','households_with_children','labor_force'], url:'https://data.census.gov' },
        { name:'Georgia CAPS Licensing Database', type:'State', reliability:'High', fields_sourced:['licensed_centers','capacity','center_names'], url:'https://childcare.georgia.gov/find-licensed-program' },
        { name:'National Database of Childcare Prices (NDCP)', type:'Federal', reliability:'High', fields_sourced:['median_infant_rate','median_preschool_rate'], url:'https://www.dol.gov/agencies/wb/topics/childcare/ndcp' },
        { name:'Google Maps Business Search', type:'Commercial', reliability:'Medium', fields_sourced:['competitor_count','ratings','reviews'], url:'https://maps.google.com' },
        { name:'Winnie.com', type:'Commercial', reliability:'Medium', fields_sourced:['availability','waitlist_data','real_tuition'], url:'https://winnie.com' },
        { name:'NAEYC Accreditation Finder', type:'Non-profit', reliability:'High', fields_sourced:['accreditation_status'], url:'https://www.naeyc.org/accreditation/find' },
        { name:'Head Start Locator (eclkc.acf.hhs.gov)', type:'Federal', reliability:'High', fields_sourced:['head_start_slots'], url:'https://eclkc.acf.hhs.gov/center-locator' },
        { name:'Georgia DECAL Quality Rated', type:'State', reliability:'High', fields_sourced:['qris_star_ratings'], url:'https://qualityrated.decal.ga.gov' },
        { name:'LoopNet Commercial RE', type:'Commercial', reliability:'Medium', fields_sourced:['listings','rent_psf','sqft'], url:'https://www.loopnet.com' },
        { name:'SBA Loans Database', type:'Federal', reliability:'High', fields_sourced:['sba_7a_lenders','loan_terms'], url:'https://www.sba.gov' },
      ],
      sourced_claims: [
        { claim:'Johns Creek has 3,900 children under 5', source:'US Census ACS 2022 Table B01001', confidence:'High' },
        { claim:'Median household income $112K in target area', source:'US Census ACS 2022 Table B19013', confidence:'High' },
        { claim:'Demand-to-supply ratio 4.8:1', source:'Derived: Census ACS + Georgia CAPS database', confidence:'Medium' },
        { claim:'NDCP median infant rate $1,820/mo', source:'DOL NDCP 2022 — Gwinnett County', confidence:'High' },
      ],
      unable_to_source: [
        { claim:'Exact waitlist lengths at each center', limitation:'Not publicly available; estimated from review sentiment' },
      ],
    },
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

  // Recompute score from the seeded R data so dashboard ring, breakdown card,
  // and saved portfolio score all agree. The baseline in _V2_DEMO_RUN_B may
  // not match what v2CalcScore() returns after R is populated.
  if (typeof v2CalcScore === 'function') {
    try { demoRun.score = v2CalcScore(); } catch(e) {}
  }

  // Set V2.run so v2GoTo re-renders correctly and save/export/portfolio work
  V2.run = demoRun;

  // Flag demoMode globally so v2-16 free-API fetches short-circuit cleanly
  // (avoids CORS/network failures spamming the console for un-seeded endpoints).
  try { demoMode = true; } catch(e) { window.demoMode = true; }

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
