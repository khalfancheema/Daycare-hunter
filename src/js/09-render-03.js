async function runAgent6() {
  setDot(6,'running');
  const ind=industry();

  if (demoMode && typeof getDemoData === 'function') {
    const _d = getDemoData(6);
    if (_d) { R.a6 = _d; }
  }

  // ── Real competitor data from OSM + ZBP ──────────────────────────────────
  const _rdCtx6 = typeof buildRealDataCtx === 'function'
    ? buildRealDataCtx(['competitors_osm','business_density','demographics','npi_providers','health'])
    : '';

  // ── Part A: City-level aggregates + top_chains (no nested centers arrays) ──
  const sysA=`You are a senior competitive intelligence analyst specializing in ${ind.unit} market research. You cross-reference commercial directories, state licensing, review platforms, and NDCP data. Respond JSON only.`;
  const usrA=(_rdCtx6 ? _rdCtx6 + '\n\nReal competitors above are VERIFIED from OpenStreetMap — use their actual names and addresses in your analysis.\n\n' : '') +
  `Conduct a competitive intelligence sweep for ${ind.units} within ${radius()} miles of ZIP ${zip()}.
Key competitors: ${ind.competitors}

Search: Google Maps "${ind.unit} near ${zip()}", Yelp, state licensing portal, Winnie.com, NAEYC accreditation finder, Head Start locator (eclkc.acf.hhs.gov), NDCP (DOL Women's Bureau county rates).

Return ONLY this JSON (no individual center details — aggregate data only):
{
  "summary": "5-sentence competitive landscape with specific numbers and sources",
  "total_licensed_estimated": 40,
  "total_accredited_naeyc": 4,
  "total_head_start_slots": 280,
  "ndcp_county_median_infant": 1820,
  "ndcp_county_median_preschool": 1280,
  "ndcp_source": "DOL NDCP 2022 — [County] County",
  "data_sources": ["Source 1", "Source 2"],
  "home_daycares_estimated": 20,
  "faith_based_count": 4,
  "subsidized_seats_total": 180,
  "competitive_intensity_score": 6,
  "market_structure_note": "Brief market structure description",
  "cities": [
    {
      "city": "City name",
      "center_count": 8, "licensed_capacity_total": 640,
      "chain_count": 3, "independent_count": 4, "nonprofit_count": 1,
      "naeyc_accredited_count": 2, "qris_avg_stars": 3.4, "head_start_slots_city": 60,
      "avg_monthly_infant": 1950, "avg_monthly_preschool": 1580,
      "avg_rating": 4.1, "avg_review_count": 87,
      "capacity_utilization_pct": 88, "waitlist_common": false, "avg_waitlist_weeks": 4,
      "gap_score": 7,
      "gap_score_explanation": "1-2 sentence explanation citing sources"
    }
  ],
  "top_chains": [
    {
      "name": "Chain name", "locations_in_area": 4,
      "monthly_tuition_range": "$1,600–$2,100", "rating": 4.1,
      "type": "Chain|Independent|Non-profit|Home-based|Faith-based|Subsidized",
      "provider_type": "Premium|Budget|Subsidized|Home-based|Faith-based",
      "nonprofit": false, "market_share_pct": 22,
      "accepts_subsidy": false, "naeyc_accredited": true,
      "strengths": "Key strengths", "weaknesses": "Key weaknesses"
    }
  ]
}
Use REAL data for ZIP ${zip()}. Revenue model: ${ind.revenue_unit}.`;

  try {
    // webSearch=true: Anthropic provider uses live search to find real businesses
    let d = !demoMode ? await claudeJSON(sysA, usrA, {webSearch:true}) : (R.a6 || null);
    // Fallback: if claudeJSON returns null after 3 retries, use baseline data
    if(!d) {
      console.warn('Agent 6: using baseline fallback data');
      d={
        summary:`Competitive intelligence for ${radius()}-mile radius of ZIP ${zip()}. Baseline data used — run with a valid API key for live market research on ${ind.units} in this area.`,
        total_licensed_estimated:20,
        cities:[
          {city:"Area A",center_count:8,avg_monthly_infant:1800,avg_monthly_preschool:1400,avg_rating:4.1,capacity_utilization_pct:88,waitlist_common:true,gap_score:8},
          {city:"Area B",center_count:5,avg_monthly_infant:1600,avg_monthly_preschool:1200,avg_rating:4.0,capacity_utilization_pct:85,waitlist_common:false,gap_score:7},
          {city:"Area C",center_count:12,avg_monthly_infant:1500,avg_monthly_preschool:1100,avg_rating:3.8,capacity_utilization_pct:82,waitlist_common:false,gap_score:4}
        ],
        top_chains:ind.competitors.split(',').slice(0,4).map((name,i)=>({
          name:name.trim(),locations_in_area:Math.max(1,4-i),monthly_tuition_range:'varies',rating:4.0-i*0.1,type:i===0?'Franchise':'Independent'
        }))
      };
    }
    R.a6=d;

    // Summary + market meta
    let summaryText = d.summary || '';
    if (d.ndcp_county_median_infant) summaryText += `\n\n💰 NDCP Market Rates (${d.ndcp_source||'DOL NDCP'}): Infant $${(d.ndcp_county_median_infant||0).toLocaleString()}/mo · Preschool $${(d.ndcp_county_median_preschool||0).toLocaleString()}/mo`;
    if (d.total_accredited_naeyc) summaryText += ` · NAEYC accredited: ${d.total_accredited_naeyc}`;
    if (d.total_head_start_slots) summaryText += ` · Head Start slots: ${d.total_head_start_slots}`;
    if (d.market_structure_note) summaryText += `\n\n🏢 Market structure: ${d.market_structure_note}`;
    if (d.competitive_intensity_score != null) summaryText += ` · Competitive intensity: ${d.competitive_intensity_score}/10`;
    if (d.data_sources && d.data_sources.length) summaryText += '\n\n📚 Sources: ' + d.data_sources.join(' · ');
    $('6-s-t').textContent=summaryText;

    killChart('ch-6');
    const ctx=$('ch-6').getContext('2d');
    const cities6=d.cities||[];
    const _comp6data = d; // capture for click handler
    charts['ch-6']=new Chart(ctx,{type:'bar',data:{
      labels:cities6.map(c=>c.city),
      datasets:[
        {label:'Centers',data:cities6.map(c=>c.center_count),backgroundColor:'rgba(255,95,95,0.7)',borderWidth:0,borderRadius:3,yAxisID:'y'},
        {label:'NAEYC Accredited',data:cities6.map(c=>c.naeyc_accredited_count||0),backgroundColor:'rgba(74,158,255,0.7)',borderWidth:0,borderRadius:3,yAxisID:'y'},
        {label:'Gap Score /10',data:cities6.map(c=>c.gap_score),backgroundColor:'rgba(61,214,140,0.7)',borderWidth:0,borderRadius:3,yAxisID:'y2'}
      ]
    },options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{labels:{color:'#8a8d96',font:{size:11}}},
        tooltip:{callbacks:{footer:(items)=>{const c=cities6[items[0].dataIndex];return c?'↗ Click bar for center details':''}}}
      },
      onClick:(evt,elements)=>{
        if(elements&&elements.length>0){
          const idx=elements[0].index;
          window._comp6cities=cities6;
          window._comp6full=_comp6data;
          openCompCityDetail(idx);
        }
      },
      scales:{x:{ticks:{color:'#8a8d96',font:{size:9}},grid:{color:'#2a2d35'}},y:{ticks:{color:'#ff5f5f'},grid:{color:'#2a2d35'},position:'left',title:{display:true,text:'# Centers (click bar)',color:'#ff5f5f'}},y2:{ticks:{color:'#3dd68c'},grid:{display:false},position:'right',min:0,max:10,title:{display:true,text:'Gap Score',color:'#3dd68c'}}}
    }});
    const ind6=industry();
    let tbl=`<table class="tbl"><thead><tr><th>City</th><th>Centers</th><th>Capacity</th><th>NAEYC</th><th>QRIS ★</th><th>${ind6.price_label_primary}</th><th>${ind6.price_label_secondary}</th><th>Avg Rating</th><th>Utilization</th><th>Waitlist</th><th>Gap Score</th></tr></thead><tbody>`;
    cities6.forEach(c=>{
      const gs=c.gap_score;
      const gb=gs>=8?'b-green':gs>=6?'b-amber':'b-red';
      const pRate=_nvNum(c.avg_monthly_infant||c.avg_primary_rate, v=>'$'+v.toLocaleString());
      const sRate=_nvNum(c.avg_monthly_preschool||c.avg_secondary_rate, v=>'$'+v.toLocaleString());
      tbl+=`<tr>
        <td><strong>${c.city}</strong></td>
        <td>${_nv(c.center_count)}</td>
        <td>${_nvNum(c.licensed_capacity_total, v=>v.toLocaleString())}</td>
        <td>${_nv(c.naeyc_accredited_count, v=>v+' <span style="font-size:10px;color:var(--faint)">accred.</span>')}</td>
        <td>${_nv(c.qris_avg_stars, v=>v+'★')}</td>
        <td>${pRate}</td><td>${sRate}</td>
        <td>${_nv(c.avg_rating, v=>v+'★')} <span style="font-size:10px;color:var(--faint)">(${_nv(c.avg_review_count)} reviews)</span></td>
        <td>${_nv(c.capacity_utilization_pct, v=>v+'%')}</td>
        <td>${c.waitlist_common!=null?`<span class="badge ${c.waitlist_common?'b-amber':'b-blue'}">${c.waitlist_common?'Yes ('+(c.avg_waitlist_weeks||'?')+'wk)':'No'}</span>`:'<span style="color:var(--faint);font-size:11px">N/A</span>'}</td>
        <td>${gs!=null?`<span class="badge ${gb}">${gs}/10</span>`:'<span style="color:var(--faint);font-size:11px">N/A</span>'}</td>
      </tr>`;
    });
    tbl+=`</tbody></table>`;
    $('6-t-c').innerHTML=tbl;
    setDot(6,'done'); showOut(6);

    // Part B: Enrich cities with individual center details (non-blocking, lazy)
    if (!demoMode && d.cities && d.cities.length) {
      _runAgent6PartB(d).catch(e => console.warn('Agent 6 Part B err:', e.message));
    }

    return JSON.stringify(d);
  } catch(e){setDot(6,'error');showOut(6);$('6-s-t').textContent='Error: '+e.message;throw e}
}

async function _runAgent6PartB(data) {
  const ind6 = industry();
  const cityNames = (data.cities||[]).map(c=>c.city).join(', ');
  const sys6b = `You are a competitive intelligence analyst. Respond JSON only.`;
  const usr6b = `For each city below near ZIP ${zip()}, list the specific named ${ind6.units} (4-6 per city) you find via Google Maps, Yelp, state licensing portal, and Winnie.com.

Cities: ${cityNames}

Return ONLY this JSON:
{
  "cities": [
    {
      "city": "City name",
      "centers": [
        {
          "name": "Center name", "address": "Full address",
          "rating": 4.3, "review_count": 124,
          "type": "Chain|Independent|Home-based|Faith-based|Non-profit",
          "nonprofit": false, "capacity_est": 120, "monthly_rate_est": 1950,
          "accreditation": "NAEYC|None", "qris_stars": 4,
          "accepts_subsidy": false, "waitlist_weeks": 6, "currently_enrolling": false,
          "google_maps_url": "https://maps.google.com/?q=...",
          "yelp_url": "https://www.yelp.com/...",
          "winnie_url": "https://winnie.com/...",
          "notes": "Brief note"
        }
      ]
    }
  ]
}`;
  try {
    const partB = await claudeJSON(sys6b, usr6b, {webSearch:true});
    if (partB && Array.isArray(partB.cities)) {
      partB.cities.forEach(bc => {
        const cityObj = (data.cities||[]).find(c => c.city === bc.city ||
          c.city.toLowerCase().includes(bc.city.toLowerCase().split(' ')[0]));
        if (cityObj && Array.isArray(bc.centers)) {
          cityObj.centers = bc.centers;
        }
      });
      window._comp6cities = data.cities;
      window._comp6full = data;
    }
  } catch(e) { console.warn('Agent 6 Part B failed:', e.message); }
}

// ── Competitive Intel: drill-down on chart bar click ────────
function openCompCityDetail(idx) {
  const cities = window._comp6cities || [];
  const full   = window._comp6full   || {};
  const c = cities[idx];
  if (!c) return;
  const ind6 = industry();

  const gapColor = c.gap_score >= 8 ? 'var(--green)' : c.gap_score >= 6 ? 'var(--amber)' : 'var(--red)';

  const centersHtml = (c.centers || []).map(center => {
    const accrBadge = center.accreditation && center.accreditation !== 'None'
      ? `<span class="badge b-blue" style="font-size:10px;margin-left:4px">${center.accreditation}</span>` : '';
    const qrisBadge = center.qris_stars
      ? `<span class="badge b-amber" style="font-size:10px;margin-left:4px">${center.qris_stars}★ QRIS</span>` : '';
    const enrollBadge = center.currently_enrolling != null
      ? `<span class="badge ${center.currently_enrolling?'b-green':'b-red'}" style="font-size:10px;margin-left:4px">${center.currently_enrolling?'Enrolling':'Full'}</span>` : '';
    const waitBadge = center.waitlist_weeks
      ? `<span class="badge b-amber" style="font-size:10px;margin-left:4px">Wait: ${center.waitlist_weeks}wk</span>` : '';
    const typeTag = center.nonprofit ? '🏛 Non-profit' : (center.type||'');
    const links = [
      center.google_maps_url ? `<a href="${center.google_maps_url}" target="_blank" class="link-btn" style="font-size:11px">↗ Maps</a>` : '',
      center.yelp_url ? `<a href="${center.yelp_url}" target="_blank" class="link-btn" style="font-size:11px">↗ Yelp</a>` : '',
      center.winnie_url ? `<a href="${center.winnie_url}" target="_blank" class="link-btn" style="font-size:11px">↗ Winnie</a>` : ''
    ].filter(Boolean).join(' ');
    return `<div class="comp-center-card">
      <div class="comp-center-top">
        <div class="comp-center-name">${center.name || 'Unknown'}${accrBadge}${qrisBadge}${enrollBadge}${waitBadge}</div>
        <div class="comp-center-rating">${center.rating ? center.rating + '★' : '—'} <span style="font-size:10px;color:var(--faint)">(${center.review_count||'?'} reviews)</span></div>
      </div>
      <div class="comp-center-detail">
        📍 ${center.address || '—'}<br>
        💰 Est. ${ind6.price_label_primary}: $${(center.monthly_rate_est||0).toLocaleString()}/mo
        · Capacity: ~${center.capacity_est||'?'}
        · ${typeTag}<br>
        ${center.notes ? '📝 ' + center.notes : ''}
      </div>
      ${links ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${links}</div>` : ''}
    </div>`;
  }).join('');

  const noCentersMsg = c.centers && c.centers.length ? '' :
    `<div style="font-size:12px;color:var(--muted);padding:12px 0">Individual center data not available. Search Google Maps for "${ind6.unit} in ${c.city}" for a live list.</div>`;

  if (!document.getElementById('compCityOverlay')) {
    const ov = document.createElement('div');
    ov.id = 'compCityOverlay';
    ov.className = 'comp-city-overlay';
    ov.onclick = function(e){ if(e.target===ov) closeCompCityDetail(); };
    document.body.appendChild(ov);
  }
  const ov = document.getElementById('compCityOverlay');
  ov.innerHTML = `
    <div class="comp-city-panel">
      <button class="comp-city-close" onclick="closeCompCityDetail()">✕</button>
      <div style="font-size:22px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:4px">${c.city}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px">${c.center_count} ${ind6.units} · Avg Rating ${c.avg_rating}★ · Utilization ${c.capacity_utilization_pct}% · NAEYC: ${c.naeyc_accredited_count||0} · QRIS avg: ${c.qris_avg_stars||'—'}★</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
        <div class="gdp-item"><div class="gdp-label">Gap Score</div><div class="gdp-val" style="color:${gapColor}">${c.gap_score}/10</div></div>
        <div class="gdp-item"><div class="gdp-label">${ind6.price_label_primary}</div><div class="gdp-val">$${(c.avg_monthly_infant||0).toLocaleString()}</div></div>
        <div class="gdp-item"><div class="gdp-label">Total Capacity</div><div class="gdp-val">${(c.licensed_capacity_total||0).toLocaleString()}</div></div>
        <div class="gdp-item"><div class="gdp-label">Waitlist</div><div class="gdp-val">${c.waitlist_common ? '🔴 Yes ('+(c.avg_waitlist_weeks||'?')+'wk)' : '🟢 No'}</div></div>
        <div class="gdp-item"><div class="gdp-label">Chain / Indep / NP</div><div class="gdp-val" style="font-size:13px">${c.chain_count||0} / ${c.independent_count||0} / ${c.nonprofit_count||0}</div></div>
        <div class="gdp-item"><div class="gdp-label">Head Start Slots</div><div class="gdp-val">${c.head_start_slots_city||0}</div></div>
      </div>
      ${c.gap_score_explanation ? `<div class="comp-gap-box">💡 ${c.gap_score_explanation}</div>` : ''}
      <div style="font-size:12px;font-weight:700;font-family:'Syne',sans-serif;margin:12px 0 8px">
        Known ${ind6.units} in this area (${(c.centers||[]).length} found):
      </div>
      ${centersHtml}${noCentersMsg}
      ${full.data_sources ? `<div style="font-size:10px;color:var(--faint);margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">📚 Sources: ${full.data_sources.join(' · ')}</div>` : ''}
    </div>`;
  ov.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCompCityDetail() {
  const ov = document.getElementById('compCityOverlay');
  if (ov) { ov.classList.remove('open'); document.body.style.overflow = ''; }
}

// ══════════════════════════════════════════════════════════
// AGENT 2 — Gap Analysis
// ══════════════════════════════════════════════════════════
