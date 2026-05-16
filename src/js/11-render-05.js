async function runAgent3(a1,a2,a5) {
  setDot(3,'running');
  const ind=industry();
  const _rdCtx3 = (typeof buildRealDataCtx === 'function')
    ? buildRealDataCtx(['demographics','business_density','competitors_osm','rents','crime','acs_expanded','rural_urban','hud_fmr','food_access','schools','crime_city','hud_vacancy','acs_home_value','cdc_svi','fema_disasters','building_permits','seismic','air_quality','hrsa_hpsa','acs_migration','census_pep','bea_income','fcc_broadband','opportunity_zone','county_health'])
    : '';
  const sys=`You are a ${ind.unit} site selection consultant with deep knowledge of demographics, zoning, and real estate. You cite specific data sources. Respond JSON only.`;
  const usr=(_rdCtx3 ? _rdCtx3 + '\n\n' : '') +
  `Recommend the top 5 specific locations for a ${ind.unit} (${ind.capacity_label}: ${capacity()}, budget $${parseInt(budget()).toLocaleString()}) within ${radius()} miles of ZIP ${zip()}.

DEMOGRAPHICS: ${ctx(a1,['summary','cities'],1000)}
GAP ANALYSIS: ${ctx(a2,['summary','cities','overall_opportunity_score'])}
REGULATORY: ${ctx(a5,['summary','requirements','timeline_phases'])}

Return ONLY:
{
  "summary": "5-sentence site selection strategy",
  "locations": [
    {
      "rank": 1, "city": "City name", "submarket": "Submarket / corridor description",
      "overall_score": 0,
      "scores": {"demand": 0, "competition": 0, "demographics": 0, "real_estate": 0, "regulatory": 0, "walkability": 0, "transit": 0, "schools": 0},
      "capacity_recommended": 0, "target_infant_tuition": 0, "target_preschool_tuition": 0,
      "risk": "Low|Low-Medium|Medium|High", "timeline_months": 0,
      "children_under5_nearby": 0, "competitors_within_2mi": 0,
      "sqft_needed": 0, "est_monthly_rent_range": "$X,000-$X,000",
      "ideal_property_type": "Property type description",
      "zoning_needed": "Zone type",
      "pros": ["Pro 1", "Pro 2", "Pro 3"],
      "cons": ["Con 1", "Con 2"],
      "reasoning": "2-3 sentence analysis citing specific Census/licensing data and traffic counts",
      "walk_score": 0, "walk_score_label": "Car-Dependent|Bikeable|Very Walkable",
      "transit_score": 0, "transit_description": "Transit options description",
      "nearest_school_name": "School name", "nearest_school_rating": 0, "nearest_school_distance_mi": 0.0,
      "school_avg_rating_2mi": 0.0, "schools_within_2mi": 0,
      "reasoning_sources": ["Source 1", "Source 2"]
    }
  ]
}`;
  try {
    _setDemoKey(3);
    let d=await claudeJSON(sys, usr, {webSearch:true});
    if(!d) { console.warn('Agent 3 fallback'); d=getFallback3(); }
    R.a3=d;
    $('3-s-t').textContent=d.summary||'';
    // Option cards
    const ind3=industry();
    const colors=['var(--green)','var(--blue)','var(--amber)','var(--purple)','var(--teal)','var(--pink)'];
    let cards=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">`;
    (d.locations||[]).forEach((loc,i)=>{
      const pRate=(loc.target_infant_tuition||loc.target_primary_rate||0).toLocaleString();
      const sRate=(loc.target_preschool_tuition||loc.target_secondary_rate||0).toLocaleString();
      const col=colors[i]||'var(--muted)';
      const rid=`loc-r-${i}`;
      const prosHtml=(loc.pros||[]).map(p=>`<div style="font-size:10px;color:var(--green);margin-bottom:2px;display:flex;gap:4px"><span>+</span><span>${p}</span></div>`).join('');
      const consHtml=(loc.cons||[]).map(p=>`<div style="font-size:10px;color:var(--red);margin-bottom:2px;display:flex;gap:4px"><span>−</span><span>${p}</span></div>`).join('');
      const sourcesHtml=loc.reasoning_sources?`<div class="reasoning-source">📚 ${loc.reasoning_sources.join(' · ')}</div>`:'';
      const reasoningHtml=loc.reasoning?`
        <div class="loc-reasoning-body" id="${rid}">
          <div class="reasoning-card" style="margin:0">
            <div class="reasoning-title">💡 Why #${loc.rank}?</div>
            ${loc.reasoning.split(/\.\s+/).filter(s=>s.trim()).map(s=>`<div class="reasoning-item">${s.trim().replace(/\.$/,'')}.</div>`).join('')}
            ${sourcesHtml}
          </div>
        </div>
        <button class="loc-reasoning-toggle" onclick="(function(btn,id){const el=document.getElementById(id);el.classList.toggle('open');btn.textContent=el.classList.contains('open')?'▲ Hide Reasoning':'💡 Why #${loc.rank}? (show reasoning)';})(this,'${rid}')">💡 Why #${loc.rank}? (show reasoning)</button>
      `:''
      cards+=`<div class="loc-card">
        <div style="font-size:10px;font-weight:700;color:${col};font-family:'Syne',sans-serif;margin-bottom:4px">#${loc.rank} · ${loc.risk} Risk · ${loc.timeline_months} mo</div>
        <div style="font-size:15px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:1px">${loc.city}</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${loc.submarket}</div>
        <div style="font-size:30px;font-weight:700;font-family:'Syne',sans-serif;color:${col};margin-bottom:10px">${loc.overall_score}<span style="font-size:13px;color:var(--faint)">/100</span></div>
        <div style="display:grid;gap:4px;font-size:11px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Capacity</span><strong>${loc.capacity_recommended}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">${ind3.price_label_primary}</span><strong>$${pRate}/mo</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">${ind3.price_label_secondary}</span><strong>$${sRate}/mo</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Est. rent</span><strong>${loc.est_monthly_rent_range}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Kids &lt;5 nearby</span><strong>${(loc.children_under5_nearby||0).toLocaleString()}</strong></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Competitors 2mi</span><strong>${loc.competitors_within_2mi}</strong></div>
        </div>
        <div style="margin-bottom:8px">${prosHtml}${consHtml}</div>
        ${(loc.walk_score!=null||loc.transit_score!=null||loc.nearest_school_rating!=null)?`
        <div class="location-ext-scores">
          ${loc.walk_score!=null?`<div class="loc-score-badge loc-score-walk"><div class="loc-score-badge-val">${loc.walk_score}</div><div class="loc-score-badge-lbl">Walk${loc.walk_score_label?'<br><span style="font-size:8px">'+loc.walk_score_label+'</span>':''}</div></div>`:''}
          ${loc.transit_score!=null?`<div class="loc-score-badge loc-score-transit"><div class="loc-score-badge-val">${loc.transit_score}</div><div class="loc-score-badge-lbl">Transit</div></div>`:''}
          ${loc.nearest_school_rating!=null?`<div class="loc-score-badge loc-score-school" title="${loc.nearest_school_name||''} (${loc.nearest_school_distance_mi||'?'}mi)"><div class="loc-score-badge-val">${loc.nearest_school_rating}/10</div><div class="loc-score-badge-lbl">School</div></div>`:''}
        </div>`:''}
        ${reasoningHtml}
      </div>`;
    });
    cards+=`</div>`;
    $('3-r-c').innerHTML=cards;
    // Chart — radar on desktop, horizontal bar on mobile
    killChart('ch-3');
    const ctx=$('ch-3').getContext('2d');
    const dims=['demand','competition','demographics','real_estate','regulatory'];
    const isMobile = window.innerWidth < 500;
    if (isMobile) {
      // Horizontal bar: one dataset per location showing overall_score, stacked by dim
      const colors=['#4a9eff','#3dd68c','#f5a623','#a78bfa','#2dd4bf'];
      charts['ch-3']=new Chart(ctx,{type:'bar',data:{
        labels:['Demand','Competition','Demographics','Real Estate','Regulatory'],
        datasets:(d.locations||[]).slice(0,3).map((loc,i)=>({
          label:loc.city,
          data:dims.map(k=>loc.scores[k]||0),
          backgroundColor:colors[i]+'cc',
          borderWidth:0,borderRadius:3
        }))
      },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8a8d96',font:{size:10}}}},scales:{x:{ticks:{color:'#8a8d96'},grid:{color:'#2a2d35'},min:0,max:100},y:{ticks:{color:'#8a8d96',font:{size:9}},grid:{color:'#2a2d35'}}}}});
    } else {
      charts['ch-3']=new Chart(ctx,{type:'radar',data:{
        labels:['Demand','Competition','Demographics','Real Estate','Regulatory'],
        datasets:(d.locations||[]).map((loc,i)=>({
          label:loc.city,
          data:dims.map(k=>(loc.scores||{})[k]||0),
          borderColor:['#4a9eff','#3dd68c','#f5a623','#a78bfa','#2dd4bf'][i],
          backgroundColor:['rgba(74,158,255,0.08)','rgba(61,214,140,0.08)','rgba(245,166,35,0.08)','rgba(167,139,250,0.08)','rgba(45,212,191,0.08)'][i],
          borderWidth:2,pointRadius:3
        }))
      },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8a8d96',font:{size:11}}}},scales:{r:{ticks:{color:'#8a8d96',backdropColor:'transparent'},grid:{color:'#2a2d35'},pointLabels:{color:'#8a8d96',font:{size:10}},min:60,max:100}}}});
    }
    // Comparison table
    let tbl=`<table class="tbl"><thead><tr><th>Rank</th><th>City / Submarket</th><th>Score</th><th>Sq Ft</th><th>Rent Range</th><th>${ind3.price_label_primary}</th><th>${ind3.price_label_secondary}</th><th>Competitors 2mi</th><th>Zoning</th><th>Risk</th><th>Timeline</th></tr></thead><tbody>`;
    (d.locations||[]).forEach(loc=>{
      const rb=(loc.risk||'').startsWith('Low')?'b-green':loc.risk==='Medium'?'b-amber':'b-red';
      const pRate=(loc.target_infant_tuition||loc.target_primary_rate||0).toLocaleString();
      const sRate=(loc.target_preschool_tuition||loc.target_secondary_rate||0).toLocaleString();
      tbl+=`<tr><td><strong>#${loc.rank}</strong></td><td><strong>${loc.city}</strong><br><span style="font-size:10px;color:var(--faint)">${loc.submarket}</span></td><td><span class="badge b-green">${loc.overall_score}</span></td><td>${(loc.sqft_needed||0).toLocaleString()}</td><td>${loc.est_monthly_rent_range}</td><td>$${pRate}</td><td>$${sRate}</td><td>${loc.competitors_within_2mi}</td><td>${loc.zoning_needed}</td><td><span class="badge ${rb}">${loc.risk}</span></td><td>${loc.timeline_months} mo</td></tr>`;
    });
    tbl+=`</tbody></table>`;
    $('3-t-c').innerHTML=tbl;
    setDot(3,'done'); showOut(3);
    return JSON.stringify(d);
  } catch(e){setDot(3,'error');showOut(3);$('3-s-t').textContent='Error: '+e.message;throw e}
}

// ══════════════════════════════════════════════════════════
// AGENT 4 — Real Estate (Live Search w/ Links)
// ══════════════════════════════════════════════════════════
