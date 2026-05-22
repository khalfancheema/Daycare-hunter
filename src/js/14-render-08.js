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

Return ONLY this JSON shape. Every value must derive from the KEY FINDINGS above — do NOT use any example
text, city name, dollar figure, or company name from this schema (these are field hints only, replace each
with values grounded in the user's specific ZIP / industry / KEY FINDINGS data).

{
  "verdict": null,            // "Go" | "Cautious Go" | "No Go"
  "verdict_rationale": null,  // 1 sentence citing 2-3 specific numbers from KEY FINDINGS
  "assessment":        null,  // 5-6 sentence narrative citing specific cities + numbers from KEY FINDINGS
  "success_factors":   [],    // 5 strings; each cites a specific city/number/source from KEY FINDINGS
  "risks": [                  // 3+ entries
    {"risk": null, "mitigation": null, "severity": null}  // severity: "High" | "Medium" | "Low"
  ],
  "next_steps": []            // 6-8 strings; each starts with "Week N:" or "Month N:" timeline marker
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
