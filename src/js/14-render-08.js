async function runAgent8(a1,a2,a3,a4,a5,a6,a7) {
  setDot(8,'running');
  const ind=industry();
  const sys=`You are an executive consultant. Respond JSON only.`;

  // Inject verified real data so executive summary cites accurate numbers
  const _rdCtx8 = (typeof buildRealDataCtx === 'function')
    ? buildRealDataCtx(['demographics','wages','macro','rents','competitors_osm','npi_providers','flood','sba','acs_expanded','hud_fmr','rural_urban','cbp_county','bls_oes','ndcp_county','epa_echo','food_access','local_unemp','hud_vacancy','crime_city','schools','acs_home_value','cdc_svi','fema_disasters','hud_income','building_permits','acs_industry_mix','hrsa_hpsa','bea_income','acs_migration','seismic','air_quality','census_pep','fcc_broadband','county_health','opportunity_zone','noaa_climate','cdc_places_x'])
    : '';

  const usr=`${_rdCtx8 ? _rdCtx8 + '\n\n' : ''}Write a final executive report for opening a ${ind.unit} (${ind.capacity_label}: ${capacity()}, $${parseInt(budget()).toLocaleString()} budget) near ZIP ${zip()}.

KEY FINDINGS:
- Demographics: ${ctx(a1,['summary','cities'],1000)}
- Gap Analysis: ${ctx(a2,['summary','overall_opportunity_score','cities'])}
- Top Location: ${ctx(a3,['summary','locations'])}
- Real Estate: ${ctx(a4,['summary','by_city_summary'])}
- Regulatory: ${ctx(a5,['summary','requirements'])}
- Competitors: ${ctx(a6,['summary','cities','top_chains'])}
- Financials: ${ctx(a7,['summary','scenarios','by_city_financials'])}

Return ONLY:
{
  "verdict": "Go",
  "verdict_rationale": "One compelling sentence justifying the Go/Cautious Go/No Go decision with specific data",
  "assessment": "5-6 sentence executive assessment narrative citing specific cities, numbers, and findings",
  "success_factors": [
    "Open in Suwanee: highest gap score (9/10), only 2 competitors within 2 miles, median income $112k",
    "Target infants and toddlers: biggest supply gap (53-point deficit), highest margin age group",
    "Price at $1,900-$2,050/month for infants — below Primrose ($2,100) but above independents",
    "Hire director 6+ months early — DECAL requires director on license application",
    "Launch pre-enrollment waitlist in Suwanee/Sugar Hill Facebook parent groups before opening"
  ],
  "risks": [
    {"risk":"Infant staffing ratios require 1:6 teacher ratio, limiting revenue per room","mitigation":"Hire experienced infant teachers early; consider premium infant-only room at $2,200/mo","severity":"High"},
    {"risk":"SBA loan approval timeline can delay opening 60-90 days","mitigation":"Begin SBA pre-qualification immediately; maintain 6-month working capital reserve","severity":"High"},
    {"risk":"Suwanee/Sugar Hill lease market tightening — suitable spaces limited","mitigation":"Engage broker immediately; identify backup Sugar Hill site; consider build-to-suit","severity":"Medium"}
  ],
  "next_steps": [
    "This week: Engage a Gwinnett County commercial RE broker specializing in childcare to tour Suwanee Town Center and Peachtree Pkwy listings",
    "Week 2: File Georgia LLC with Secretary of State ($100) and obtain EIN from IRS.gov",
    "Week 3-4: Begin SBA 7(a) pre-qualification with Regions Bank or Truist (both active childcare lenders)",
    "Month 2: Hire a Georgia DECAL consultant to pre-review your intended facility layout before signing lease",
    "Month 2-3: Sign lease, commission architect for DECAL-compliant drawings (35 sqft/child indoor, 75 outdoor)",
    "Month 3: Post pre-enrollment interest form in Suwanee Parents Facebook group (28k members), NextDoor",
    "Month 4: Post Director job listing — plan to hire 6 months before opening; they will own DECAL relationship",
    "Month 5: Submit DECAL application package with background checks for all owners and staff"
  ]
}`;
  try {
    // Show panel early so streaming text is visible immediately
    showOut(8);
    // Stream response into summary prose panel while building
    let d = await claudeStreamJSON(sys, usr, '8-s-t', {webSearch:true});
    if(!d) { console.warn('Agent 8 fallback'); d=getFallback8(); }
    R.a8=d;
    if (typeof rdRenderRealDataBadge === 'function') rdRenderRealDataBadge('8-s-t', ['demographics','wages','macro','rents','competitors_osm']);
    $('8-s-t').textContent=(d.verdict||'')+(d.verdict_rationale?' — '+d.verdict_rationale:'');
    // Final report
    const vl=(d.verdict||'').toLowerCase();
    const vc=vl==='go'?'v-go':vl.includes('caution')?'v-caution':'v-nogo';
    const vi=vl==='go'?'✓ GO':vl.includes('caution')?'⚡ CAUTIOUS GO':'✗ NO GO';
    $('verdictEl').innerHTML=`<div class="verdict ${vc}">${vi} — ${d.verdict_rationale}</div>`;
    $('f-assess').textContent=d.assessment;
    $('f-success').textContent=(d.success_factors||[]).map((f,i)=>`${i+1}. ${f}`).join('\n\n');
    $('f-risks').textContent=(d.risks||[]).map(r=>`[${r.severity}] ${r.risk}\n→ ${r.mitigation}`).join('\n\n');
    $('f-steps').innerHTML=(d.next_steps||[]).map((s,i)=>`<div class="step"><div class="step-num">${i+1}</div><div>${s}</div></div>`).join('');
    $('finalBox').className='final-box show';
    if(typeof populateLocationDropdown==='function') populateLocationDropdown();
    if(typeof loadSavedProfile==='function') loadSavedProfile();
    setDot(8,'done'); showOut(8);
    return JSON.stringify(d);
  } catch(e){setDot(8,'error');showOut(8);$('8-s-t').textContent='Error: '+e.message;throw e}
}

// ══════════════════════════════════════════════════════════
// BUSINESS PLAN AGENT (Agent 9)
// ══════════════════════════════════════════════════════════
