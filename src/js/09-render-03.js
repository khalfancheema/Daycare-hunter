async function runAgent6() {
  setDot(6,'running');
  const ind=industry();
  const sys=`You are a senior competitive intelligence analyst specializing in ${ind.unit} market research. You cross-reference commercial directories, state licensing systems, consumer review platforms, accreditation databases, and non-profit financial disclosures to build a complete competitor landscape. Always cite your specific sources and search queries. Respond with ONLY a valid JSON object — no prose before or after.`;
  const usr=`Conduct a comprehensive competitive intelligence sweep for ALL existing ${ind.units} within ${radius()} miles of ZIP ${zip()}.
Key national/regional competitors to look for: ${ind.competitors}.

AUTHORITATIVE DATA SOURCES — search ALL of the following and cite each one used:

COMMERCIAL DIRECTORIES & REVIEW PLATFORMS:
1. Google Maps / Google Business Profile — search "${ind.unit} near ${zip()}" and per-city searches. Note name, address, rating, review count, hours, website.
2. Yelp Business Search — search "${ind.units} [city, state]" for ratings, reviews, price tier, photos
3. Winnie.com — childcare-specific aggregator with real availability, tuition, and waitlist data
4. Care.com provider directory — includes both licensed centers and home daycares
5. Daycare.com / ChildcareCenter.us — location + rating directories
6. Facebook Business Pages — community-recommended centers, local parents groups
7. Nextdoor business listings — hyper-local competitor discovery

STATE LICENSING & REGULATORY DATABASES:
8. State child care licensing portal (primary source for OFFICIAL licensed capacity):
   - Georgia: childcare.georgia.gov/find-licensed-program (CAPS — search by county/city)
   - Texas: hhs.texas.gov/childcare-licensing-search
   - California: ccld.dss.ca.gov
   - Florida: childcarefacilities.net
   - All states: childcareeta.acf.hhs.gov/cclc (federal CCDF gateway)
9. State QRIS (Quality Rating and Improvement System) database — quality star ratings:
   - Georgia QRIS: qualityrated.decal.ga.gov
   - Search "[state] QRIS childcare quality ratings database"
10. Head Start / Early Head Start locator — eclkc.acf.hhs.gov/center-locator (subsidized competition)
11. State Pre-K program locator — publicly funded competition for 3–4 year olds

ACCREDITATION & QUALITY DATABASES:
12. NAEYC accreditation finder — naeyc.org/accreditation/find (gold standard for center quality)
13. NAC (National Accreditation Commission) database — naccreditation.org
14. National School-Age Care Alliance (NSACA/COA) accreditation
15. State QRIS quality level lookup (star ratings 1–5)

NON-PROFIT / FINANCIAL TRANSPARENCY:
16. ProPublica Nonprofit Explorer — search non-profit center names for Form 990 data (revenue, capacity, executive pay)
17. Charity Navigator / GuideStar — for non-profit competitors' financials and mission

EMPLOYER-SPONSORED & INSTITUTIONAL COMPETITION:
18. Hospital / large employer backup care programs (Bright Horizons, KinderCare employer partnerships)
19. University campus childcare centers (often subsidized — direct competition for staff families)
20. Military family childcare (MFCC) / CDCs on bases (if near military installation)

PRICING INTELLIGENCE:
21. NDCP (National Database of Childcare Prices) — DOL Women's Bureau — county median rates
22. Child Care Aware "Price of Care" annual state report — average rates by age group and care type
23. State CCDF subsidy rate schedules — market floor pricing

SEARCH QUERIES TO EXECUTE:
- Google Maps: "${ind.unit} near ${zip()}"
- Yelp: "${ind.units} in [each city within ${radius()} miles]"
- State licensing portal: search by county name for all licensed ${ind.units}
- Winnie.com: search by ZIP code
- NAEYC: search by ZIP or city
- Head Start locator: search by county/ZIP
- Google: "${ind.unit} [city name] reviews 2024"
- Google: "${ind.unit} [city name] waitlist"
- Google: "${ind.unit} tuition [city name] [state]"

For each city, find the ACTUAL names and addresses of ALL competitor types — include ALL of the following, not just premium chains:
- Premium chains (Primrose, KinderCare, Bright Horizons, Goddard)
- Independent licensed centers (private, non-franchise)
- Home-based / family daycares (licensed, typically 6–12 children)
- Faith-based / church-run childcare programs
- Non-profit childcare centers
- Head Start / Early Head Start programs (federally subsidized)
- Subsidized / CCAP-accepting centers (lower income brackets)
- Employer-sponsored or campus-based centers
- Childcare co-ops (parent-run or community-run)
- After-school and school-age care programs (SACC)

Include gap_score_explanation (cite specific numbers and sources).
Note accreditation status, QRIS rating, provider_type (Premium/Budget/Subsidized/Home-based/Faith-based/Non-profit), and whether center accepts CCAP/CAPS subsidies.

Return ONLY this JSON:
{
  "summary": "5-sentence competitive landscape citing specific numbers, sources, and market structure",
  "total_licensed_estimated": 40,
  "total_accredited_naeyc": 4,
  "total_head_start_slots": 280,
  "ndcp_county_median_infant": 1820,
  "ndcp_county_median_preschool": 1280,
  "ndcp_source": "DOL NDCP 2022 — [County Name] County",
  "data_sources": ["Google Maps search '${ind.unit} near ${zip()}'", "State CAPS licensing database (childcare.georgia.gov)", "Winnie.com ZIP search", "NAEYC accreditation finder", "Head Start locator (eclkc.acf.hhs.gov)", "NDCP DOL Women's Bureau 2022", "Yelp business search", "ProPublica Nonprofit Explorer"],
  "cities": [
    {
      "city": "City A",
      "center_count": 8,
      "licensed_capacity_total": 640,
      "chain_count": 3, "independent_count": 4, "nonprofit_count": 1,
      "naeyc_accredited_count": 2,
      "qris_avg_stars": 3.4,
      "head_start_slots_city": 60,
      "avg_monthly_infant": 1950,
      "avg_monthly_preschool": 1580,
      "avg_rating": 4.1,
      "avg_review_count": 87,
      "capacity_utilization_pct": 88,
      "waitlist_common": false,
      "avg_waitlist_weeks": 4,
      "gap_score": 7,
      "gap_score_explanation": "Gap score 7/10: 8 licensed centers (CAPS database) with ~640 total capacity serving est. 3,400 children under 5 (Census ACS 2022). Utilization 88% per Winnie.com availability data. 3 of 8 centers report 4+ week waitlists. Market underserved but not critical. NDCP median infant rate $1,820/mo.",
      "centers": [
        {
          "name": "Bright Horizons Suwanee", "address": "123 Main St, City A, GA",
          "rating": 4.3, "review_count": 124, "type": "Chain", "nonprofit": false,
          "capacity_est": 120, "monthly_rate_est": 1950,
          "accreditation": "NAEYC", "qris_stars": 4,
          "waitlist_weeks": 6, "currently_enrolling": false,
          "google_maps_url": "https://maps.google.com/?q=Bright+Horizons+Suwanee+GA",
          "yelp_url": "https://www.yelp.com/search?find_desc=daycare&find_loc=Suwanee+GA",
          "winnie_url": "https://winnie.com/place/bright-horizons-suwanee",
          "notes": "120 capacity, NAEYC accredited, 4-star QRIS, 6-week waitlist for infants"
        },
        {
          "name": "KinderCare City A", "address": "456 Oak Ave, City A, GA",
          "rating": 4.0, "review_count": 89, "type": "Chain", "nonprofit": false,
          "capacity_est": 90, "monthly_rate_est": 1780,
          "accreditation": "None", "qris_stars": 3,
          "waitlist_weeks": 0, "currently_enrolling": true,
          "google_maps_url": "https://maps.google.com/?q=KinderCare+City+A+GA",
          "yelp_url": "", "winnie_url": "",
          "notes": "90 capacity, currently enrolling, 3-star QRIS"
        },
        {
          "name": "Mary's Home Daycare", "address": "789 Elm St, City A, GA",
          "rating": 4.7, "review_count": 28, "type": "Home-based", "provider_type": "Home-based/Budget", "nonprofit": false,
          "capacity_est": 8, "monthly_rate_est": 950,
          "accreditation": "None", "qris_stars": 2,
          "accepts_subsidy": true, "waitlist_weeks": 0, "currently_enrolling": true,
          "google_maps_url": "", "yelp_url": "", "winnie_url": "",
          "notes": "Licensed home daycare, 8 capacity, CAPS-accepting, flexible hours, $950/mo"
        },
        {
          "name": "Grace Church Early Learning", "address": "101 Oak Rd, City A, GA",
          "rating": 4.5, "review_count": 45, "type": "Faith-based", "provider_type": "Faith-based/Budget", "nonprofit": true,
          "capacity_est": 40, "monthly_rate_est": 850,
          "accreditation": "None", "qris_stars": 3,
          "accepts_subsidy": true, "waitlist_weeks": 2, "currently_enrolling": true,
          "google_maps_url": "", "yelp_url": "", "winnie_url": "",
          "notes": "Church-run, 40 capacity, CAPS-accepting, $850/mo — direct competition for budget-conscious families"
        }
      ]
    }
  ],
  "top_chains": [
    {
      "name": "Competitor A (Premium)", "locations_in_area": 4,
      "monthly_tuition_range": "$1,600–$2,100", "rating": 4.1,
      "type": "Chain", "provider_type": "Premium", "nonprofit": false, "market_share_pct": 22,
      "accepts_subsidy": false, "naeyc_accredited": true, "employer_partnerships": true,
      "strengths": "Brand recognition, employer subsidies, NAEYC accreditation",
      "weaknesses": "Premium pricing, rigid curriculum, long waitlists"
    },
    {
      "name": "Local Home Daycare Network", "locations_in_area": 12,
      "monthly_tuition_range": "$800–$1,200", "rating": 4.3,
      "type": "Home-based", "provider_type": "Home-based/Budget", "nonprofit": false, "market_share_pct": 15,
      "accepts_subsidy": true, "naeyc_accredited": false, "employer_partnerships": false,
      "strengths": "Low cost, flexible hours, personalized care, subsidy-friendly",
      "weaknesses": "Small capacity (6–12), limited structured curriculum, licensing varies"
    },
    {
      "name": "First Baptist Childcare Center", "locations_in_area": 2,
      "monthly_tuition_range": "$700–$1,000", "rating": 4.5,
      "type": "Faith-based", "provider_type": "Faith-based/Budget", "nonprofit": true, "market_share_pct": 8,
      "accepts_subsidy": true, "naeyc_accredited": false, "employer_partnerships": false,
      "strengths": "Community trust, low cost, faith-based values, CAPS-accepting",
      "weaknesses": "Limited capacity, may have religious enrollment preference"
    },
    {
      "name": "Head Start Program — [County]", "locations_in_area": 3,
      "monthly_tuition_range": "$0 (income-qualified)", "rating": 4.0,
      "type": "Government/Non-profit", "provider_type": "Subsidized", "nonprofit": true, "market_share_pct": 10,
      "accepts_subsidy": true, "naeyc_accredited": false, "employer_partnerships": false,
      "strengths": "Free for qualifying families, comprehensive services (health, nutrition, family support)",
      "weaknesses": "Income-limited, part-day only in many sites, waitlist for slots"
    }
  ],
  "home_daycares_estimated": 20,
  "faith_based_count": 4,
  "subsidized_seats_total": 180,
  "competitive_intensity_score": 6,
  "market_structure_note": "Fragmented market — 4 chains (35% share) + 8 independents + 12 home daycares + 2 faith-based + 1 Head Start program"
}

Replace ALL example values with real search data for ZIP ${zip()}.
Use avg_monthly_infant and avg_monthly_preschool as the primary and secondary revenue price points.
Revenue model: ${ind.revenue_unit}.
Be specific about which source each data point came from.`;
  try {
    _setDemoKey(6);
    let d=await claudeJSON(sys,usr);
    // Fallback: if claudeJSON returns null after 3 retries, use baseline data
    if(!d) {
      const ind=industry();
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
    return JSON.stringify(d);
  } catch(e){setDot(6,'error');showOut(6);$('6-s-t').textContent='Error: '+e.message;throw e}
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
