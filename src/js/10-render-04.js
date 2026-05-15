async function runAgent2(a1,a5,a6) {
  setDot(2,'running');
  const ind=industry();
  // Inject verified ZBP business count + ACS demographics before gap analysis
  const _rdCtx2 = typeof buildRealDataCtx === 'function'
    ? buildRealDataCtx(['business_density','demographics','macro'])
    : '';

  const sys=`You are a senior market gap analyst specializing in small business feasibility studies. You cross-reference federal, state, and local data sources to quantify supply-demand imbalances. You always cite your sources with specific table numbers, database names, and retrieval methods. Respond JSON only.`;
  const usr=(_rdCtx2 ? _rdCtx2 + '\nCensus data above is VERIFIED — use the exact business count and population figures as your supply/demand baseline.\n\n' : '') +
  `Conduct a comprehensive market gap analysis for a ${ind.unit} (capacity: ${capacity()}, budget: $${parseInt(budget()).toLocaleString()}) within ${radius()} miles of ZIP ${zip()}.

AUTHORITATIVE DATA SOURCES — search, reference, and cite as many of the following as possible:

SUPPLY-SIDE (licensed provider data):
1. State child care licensing database — search your state's licensing portal for licensed ${ind.units}
   - Georgia: childcare.georgia.gov/find-licensed-program (CAPS database)
   - National lookup: childcareeta.acf.hhs.gov or state-specific portals
2. Child Care Aware of America — state fact sheets & supply estimates (childcareaware.org)
3. CCDF (Child Care Development Fund) state data — HHS Office of Child Care annual reports
4. National Database of Childcare Prices (NDCP) — DOL Women's Bureau, county-level pricing & supply
5. Head Start / Early Head Start locator — eclkc.acf.hhs.gov/center-locator
6. NAEYC accreditation database — naeyc.org/accreditation/find (quality-accredited centers only)
7. Google Maps business search — "${ind.unit} near [city, state]" for total count + ratings
8. Winnie.com — childcare-specific directory with real-time availability
9. Care.com provider directory — additional unlicensed/in-home providers
10. Child Care Resource and Referral (CCR&R) agencies — local referral network data
11. IRS Form 990 data — ProPublica Nonprofit Explorer for non-profit center capacity/revenue

DEMAND-SIDE (population & economic data):
12. US Census ACS 2023 1-yr & 2022 5-yr estimates — Tables B01001, S0901, B23025, B19013
13. Census Bureau Population Estimates Program (PEP) 2020–2023 — growth trajectory
14. State vital statistics — county birth rates 2019–2022 (lagging demand signal)
15. NCES school enrollment — K-12 enrollment as pipeline demand proxy
16. BLS Women's Labor Force Participation rates by county (QCEW + LAUS)
17. Child Trends — childcare access and affordability research
18. Urban Institute — child care affordability gap maps (urban.org)
19. National Women's Law Center — childcare shortage data by county
20. Annie E. Casey Foundation KIDS COUNT Data Center — child well-being & care access by state

PRICING DATA:
21. NDCP (National Database of Childcare Prices) — median market rates by county for all care types
22. Child Care Aware of America — annual "Price of Care" state report
23. State subsidy rate schedules (CCDF) — sets market floor pricing

DEMOGRAPHICS: ${ctx(a1,['summary','cities','metro_overview','labor_market_summary'],1000)}
REGULATORY: ${ctx(a5,['summary','requirements','timeline_phases'])}
COMPETITORS: ${ctx(a6,['summary','cities','total_licensed_estimated','data_sources'])}

SEARCH STRATEGY:
- Search "child care desert [county name]" (Child Care Aware defines deserts as <1 slot per 3 children)
- Search "NDCP childcare prices [county name] [state]"
- Search "licensed childcare [city] [state]" on state licensing portal
- Search "Head Start [county name]" on eclkc.acf.hhs.gov
- Search "KIDS COUNT [state] child care" on datacenter.kidscount.org
- Check if county is a "child care desert" per Child Care Aware criteria

Return ONLY:
{
  "summary": "5-sentence gap analysis citing specific data sources and numbers",
  "overall_opportunity_score": 81,
  "data_sources_used": ["US Census ACS 2022 (Tables B01001, S0901)", "State CAPS licensing database", "NDCP DOL county childcare prices", "Child Care Aware of America state report", "Head Start locator", "Google Maps search", "KIDS COUNT Data Center"],
  "is_childcare_desert": true,
  "childcare_desert_ratio": "1 slot per 4.8 children (Child Care Aware threshold: >3 children per slot)",
  "ndcp_median_infant_rate": 1820,
  "ndcp_median_toddler_rate": 1540,
  "ndcp_median_preschool_rate": 1280,
  "ndcp_source": "National Database of Childcare Prices, DOL Women's Bureau 2022",
  "cities": [
    {
      "city": "City name", "rank": 1,
      "demand_score": 0, "supply_score": 0, "gap_score": 0,
      "unserved_children": 0, "licensed_centers_count": 0, "total_licensed_capacity_est": 0,
      "children_under5_census": 0, "demand_to_supply_ratio": 0.0,
      "income_tier": "Premium|Mid-Market|Affordable",
      "recommended_tuition_infant": 0, "recommended_tuition_preschool": 0,
      "ndcp_county_median_infant": 0, "pricing_premium_vs_market_pct": 0,
      "head_start_slots": 0, "subsidized_slots_est": 0,
      "is_desert": true,
      "priority": "Critical Opportunity|High Opportunity|Moderate|Saturated",
      "rationale": "1-sentence reason",
      "why_gap": "2-3 sentences citing data sources with specific numbers",
      "data_points": [
        {"label": "Metric name", "value": "Formatted value", "source": "Source name"}
      ],
      "sources": ["Source 1", "Source 2"]
    }
  ],
  "age_gaps": [
    {"age": "${ind.tiers[0]||'Tier 1'}", "demand_idx": 0, "supply_idx": 0, "gap": 0, "source": "Source name"},
    {"age": "${ind.tiers[1]||'Tier 2'}", "demand_idx": 0, "supply_idx": 0, "gap": 0, "source": "Source name"}
  ]
}

Use recommended_tuition_infant as the primary price point and recommended_tuition_preschool as the secondary price point for a ${ind.unit}. Revenue model: ${ind.revenue_unit}.
For pricing, cross-reference NDCP county median rates to validate recommendations (premium operators typically price 10-20% above market median).`;
  try {
    _setDemoKey(2);
    let d=await claudeJSON(sys,usr,{webSearch:true});
    if(!d) { console.warn('Agent 2 fallback'); d=getFallback2(); }
    R.a2=d;

    // Summary + meta badges
    let summaryText = d.summary || '';
    if (d.is_childcare_desert) summaryText += '\n\n🚨 CHILD CARE DESERT: ' + (d.childcare_desert_ratio || 'Supply critically below demand threshold (Child Care Aware: >3 children per slot)');
    if (d.ndcp_median_infant_rate) summaryText += `\n\n💰 NDCP Market Rates (${d.ndcp_source||'DOL NDCP'}): Infant $${(d.ndcp_median_infant_rate||0).toLocaleString()}/mo · Toddler $${(d.ndcp_median_toddler_rate||0).toLocaleString()}/mo · Preschool $${(d.ndcp_median_preschool_rate||0).toLocaleString()}/mo`;
    if (d.data_sources_used && d.data_sources_used.length) summaryText += '\n\n📚 Sources: ' + d.data_sources_used.join(' · ');
    $('2-s-t').textContent=summaryText;

    // Heatmap — cells are clickable for drill-down detail
    renderHmap('2-h-c',d.cities,[
      {key:'demand_score',label:'Demand Score',fmt:v=>v+'/10'},
      {key:'supply_score',label:'Supply Score',fmt:v=>v+'/10'},
      {key:'gap_score',label:'Gap Score',fmt:v=>v+'/10'},
      {key:'demand_to_supply_ratio',label:'D:S Ratio',fmt:v=>(v||0).toFixed(1)+'x'},
      {key:'unserved_children',label:'Unserved Kids',fmt:v=>v.toLocaleString()}
    ],'openGapCellDetail');

    // Rankings — now with desert badge and NDCP pricing
    let ranks=`<div class="city-compare">`;
    (d.cities||[]).forEach((c,i)=>{
      const pct=c.gap_score/10*100;
      const col=c.gap_score>=8?'var(--green)':c.gap_score>=6?'var(--amber)':'var(--red)';
      const desertBadge = c.is_desert ? `<span class="badge b-red" style="font-size:10px;margin-left:6px">🏜 Desert</span>` : '';
      const ndcpNote = c.ndcp_county_median_infant ? `<span style="font-size:10px;color:var(--faint);margin-left:4px">NDCP median: $${(c.ndcp_county_median_infant||0).toLocaleString()}/mo</span>` : '';
      ranks+=`<div class="city-row">
        <div class="city-rank">${c.rank}</div>
        <div class="city-name">${c.city}${desertBadge}${ndcpNote}</div>
        <div class="city-bar-wrap">
          <div style="font-size:10px;color:var(--muted);margin-bottom:3px">${c.priority} · ${c.income_tier} · ${c.licensed_centers_count||'?'} licensed centers · D:S ${(c.demand_to_supply_ratio||'?')}:1</div>
          <div class="city-bar-track"><div class="city-bar-fill" style="width:${pct}%;background:${col}"></div></div>
        </div>
        <div class="city-score" style="color:${col}">${c.gap_score}/10</div>
      </div>`;
    });
    ranks+=`</div>`;
    $('2-r-c').innerHTML=ranks;
    // Chart
    killChart('ch-2');
    const ctx2=$('ch-2').getContext('2d');
    const ageGaps2=d.age_gaps||[];
    charts['ch-2']=new Chart(ctx2,{type:'bar',data:{
      labels:ageGaps2.map(a=>a.age),
      datasets:[
        {label:'Demand Index',data:ageGaps2.map(a=>a.demand_idx),backgroundColor:'rgba(74,158,255,0.7)',borderWidth:0,borderRadius:3},
        {label:'Supply Index',data:ageGaps2.map(a=>a.supply_idx),backgroundColor:'rgba(245,166,35,0.7)',borderWidth:0,borderRadius:3},
        {label:'Gap',data:ageGaps2.map(a=>Math.max(0,a.gap)),backgroundColor:'rgba(61,214,140,0.85)',borderWidth:0,borderRadius:3}
      ]
    },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8a8d96',font:{size:11}}}},scales:{x:{ticks:{color:'#8a8d96'},grid:{color:'#2a2d35'}},y:{ticks:{color:'#8a8d96'},grid:{color:'#2a2d35'},max:100}}}});
    setDot(2,'done'); showOut(2);
    return JSON.stringify(d);
  } catch(e){setDot(2,'error');showOut(2);$('2-s-t').textContent='Error: '+e.message;throw e}
}

// ── Gap Analysis: drill-down on heatmap cell click ──────────
function openGapCellDetail(cityName, dimKey, dimLabel, val) {
  // Find city data from R.a2
  let cityData = null;
  try {
    const d = typeof R.a2 === 'string' ? JSON.parse(R.a2) : R.a2;
    if (d && d.cities) cityData = d.cities.find(c => (c.city||c.name||'') === cityName);
  } catch(e) {}

  // Build display value
  const fmts = {
    demand_score: v => v + '/10',
    supply_score: v => v + '/10',
    gap_score: v => v + '/10',
    unserved_children: v => Number(v).toLocaleString() + ' kids'
  };
  const dispVal = fmts[dimKey] ? fmts[dimKey](val) : val;
  const scoreColor = dimKey === 'gap_score'
    ? (val >= 8 ? 'var(--green)' : val >= 6 ? 'var(--amber)' : 'var(--red)')
    : 'var(--blue)';

  // Build data points HTML
  let dataPointsHtml = '';
  if (cityData && cityData.data_points && cityData.data_points.length) {
    dataPointsHtml = `<div class="gap-data-grid">` +
      cityData.data_points.map(dp =>
        `<div class="gdp-item">
          <div class="gdp-label">${dp.label}</div>
          <div class="gdp-val">${dp.value}</div>
          <div style="font-size:10px;color:var(--faint);margin-top:2px">${dp.source||''}</div>
        </div>`
      ).join('') + `</div>`;
  }

  const why = cityData ? (cityData.why_gap || cityData.rationale || 'No detailed reasoning available for this metric.') : 'Run the pipeline to see detailed reasoning.';
  const sources = cityData && cityData.sources ? cityData.sources.join(' · ') : 'US Census ACS 2022 · State licensing database · Google Maps';
  const priority = cityData ? (cityData.priority || '') : '';

  // Inject overlay if not present
  if (!document.getElementById('gapDetailOverlay')) {
    const ov = document.createElement('div');
    ov.id = 'gapDetailOverlay';
    ov.className = 'gap-detail-overlay';
    ov.onclick = function(e){ if(e.target===ov) closeGapDetail(); };
    document.body.appendChild(ov);
  }

  const ov = document.getElementById('gapDetailOverlay');
  ov.innerHTML = `
    <div class="gap-detail-panel">
      <button class="gap-detail-close" onclick="closeGapDetail()">✕</button>
      <div class="gap-detail-city">${cityName}</div>
      <div class="gap-detail-metric">${dimLabel}${priority ? ' · ' + priority : ''}</div>
      <div class="gap-detail-value" style="color:${scoreColor}">${dispVal}</div>
      ${dataPointsHtml}
      <div class="gap-detail-why">${why}</div>
      <div class="gap-detail-sources">📚 Sources: ${sources}</div>
    </div>`;
  ov.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeGapDetail() {
  const ov = document.getElementById('gapDetailOverlay');
  if (ov) { ov.classList.remove('open'); document.body.style.overflow = ''; }
}

// ══════════════════════════════════════════════════════════
// AGENT 3 — Site Recommendations
// ══════════════════════════════════════════════════════════
