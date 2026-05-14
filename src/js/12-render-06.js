async function runAgent4(a3,a5) {
  setDot(4,'running');
  const ind=industry();
  const sys=`You are a commercial real estate analyst. Search LoopNet, BizBuySell, CoStar, Crexi, Zillow Commercial, and PropertyShark for real available listings. Always construct the most specific search URL possible with filters (city, sqft range, property type). Respond JSON only.`;
  const usr=`Search for commercial real estate listings suitable for a ${ind.unit} (capacity: ${capacity()}, sqft needed: ${ind.real_estate}) near ZIP ${zip()}.

CRITICAL: For each listing, try to find the ACTUAL listing URL (e.g. https://www.loopnet.com/listing/123-main-st/12345678/). If you find a specific listing, use that URL. If not, construct the most filtered search URL possible.

Search these sources:
1. loopnet.com — search "commercial space lease ${zip()} ${ind.unit}" → try to find specific listing pages. Construct filtered URL: https://www.loopnet.com/search/commercial-real-estate/ZIP/for-lease/?ListingType=1&MinSize=MIN&MaxSize=MAX
2. bizbuysell.com — search ${ind.unit} businesses for sale near ${zip()} with city filter
3. crexi.com — https://www.crexi.com/lease/properties?address=CITY+STATE with sqft and type filters
4. zillow.com/commercial — commercial listings near ${zip()}
5. propertyshark.com — commercial properties near ${zip()}
6. costar.com — if accessible
7. Local economic development authority and county GIS/property records
8. Search: "commercial space for lease ${zip()} site:loopnet.com" and "FOR LEASE commercial ${zip()}"

Regulatory requirements: ${ctx(a5,['summary','requirements'])}
Top recommended locations: ${ctx(a3,['summary','locations'])}

Property requirements: ${ind.real_estate}

Return ONLY:
{
  "summary": "3-4 sentence overview of the commercial real estate market for a ${ind.unit} in this area",
  "search_urls": {
    "loopnet_primary": "https://www.loopnet.com/search/commercial-real-estate/ZIP-CITY/for-lease/?ListingType=1&MinSize=5000&MaxSize=15000",
    "loopnet_secondary": "https://www.loopnet.com/search/commercial-real-estate/nearby-city/for-lease/",
    "bizbuysell": "https://www.bizbuysell.com/STATE/INDUSTRY-businesses-for-sale/",
    "crexi_primary": "https://www.crexi.com/lease/properties?address=PRIMARY+CITY+STATE&minSqft=5000&maxSqft=15000",
    "crexi_secondary": "https://www.crexi.com/lease/properties?address=SECONDARY+CITY+STATE",
    "zillow_commercial": "https://www.zillow.com/commercial/",
    "costar": "https://www.costar.com/",
    "county_gis": "https://www.COUNTY.gov/planning",
    "economic_dev": "https://www.CITY.gov/economic-development"
  },
  "listings": [
    {
      "id": 1, "address": "Full street address, City, ST ZIP", "city": "City name",
      "property_type": "Freestanding Retail|Office Conversion|Strip Mall End-Cap|Flex/Retail|Build-to-Suit",
      "sqft": 0, "monthly_rent": 0, "price_per_sqft": 0.00,
      "zoning": "C-1|C-2|O-I|PUD", "outdoor_space_available": true, "outdoor_sqft_est": 0,
      "suitable_for_daycare": true, "buildout_cost_est": 0,
      "source": "LoopNet|BizBuySell|Crexi|CoStar",
      "listing_url": "https://www.loopnet.com/search/commercial-real-estate/city-st/for-lease/",
      "broker_name": "Broker name", "broker_phone": "XXX-XXX-XXXX", "broker_email": "email or empty string",
      "availability": "Available Now|Immediate|Q1 2026|Negotiable",
      "score": 0, "notes": "Key notes about the property"
    }
  ],
  "by_city_summary": [
    {"city": "City name", "avg_rent_sqft": 0.00, "available_listings_est": 0, "best_zoning": "C-1", "market_note": "Brief market note"}
  ]
}`;
  try {
    _setDemoKey(4);
    let d=await claudeJSON(sys,usr);
    if(!d) { console.warn('Agent 4 fallback'); d=getFallback4(); }
    R.a4=d;
    $('4-s-t').textContent=d.summary+'\n\nSearch links: LoopNet · BizBuySell · Crexi · CoStar';
    // Listing cards with links
    const srcColors={'LoopNet':'src-loopnet','BizBuySell':'src-bizbuysell','CoStar':'src-costar','Crexi':'src-crexi'};
    let cards=`<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">`;
    if(d.search_urls){
      Object.entries(d.search_urls).forEach(([k,url])=>{
        if(url&&url.startsWith('http')) cards+=`<a href="${url}" target="_blank" class="link-btn primary-btn">↗ ${k.charAt(0).toUpperCase()+k.slice(1).replace('_',' ')}</a>`;
      });
    }
    cards+=`</div><div class="link-cards">`;
    (d.listings||[]).forEach(l=>{
      const sc=srcColors[l.source]||'src-other';
      cards+=`<div class="link-card">
        <div class="link-card-top">
          <div class="link-card-name">${_nv(l.address)}</div>
          <span class="link-card-source ${sc}">${_nv(l.source)}</span>
        </div>
        <div class="link-card-attrs">
          <div class="lc-attr"><span class="lc-k">City: </span><span class="lc-v">${_nv(l.city)}</span></div>
          <div class="lc-attr"><span class="lc-k">Type: </span><span class="lc-v">${_nv(l.property_type)}</span></div>
          <div class="lc-attr"><span class="lc-k">Sq Ft: </span><span class="lc-v">${_nvNum(l.sqft, v=>v.toLocaleString())}</span></div>
          <div class="lc-attr"><span class="lc-k">Rent/mo: </span><span class="lc-v">${_nvNum(l.monthly_rent, v=>'$'+v.toLocaleString())}</span></div>
          <div class="lc-attr"><span class="lc-k">Zoning: </span><span class="lc-v">${_nv(l.zoning)}</span></div>
          <div class="lc-attr"><span class="lc-k">Outdoor: </span><span class="lc-v">${l.outdoor_space_available!=null?(l.outdoor_space_available?_nvNum(l.outdoor_sqft_est,v=>v.toLocaleString()+' sqft','Unknown sqft'):'No'):'N/A'}</span></div>
          <div class="lc-attr"><span class="lc-k">Build-out: </span><span class="lc-v">${_nvNum(l.buildout_cost_est, v=>'$'+v.toLocaleString())}</span></div>
          <div class="lc-attr"><span class="lc-k">Available: </span><span class="lc-v">${_nv(l.availability)}</span></div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;padding:6px 8px;background:var(--surface3);border-radius:6px">${_nv(l.notes,'','No notes available')}</div>
        ${l.broker_name?`<div style="font-size:11px;color:var(--faint);margin-bottom:8px">Broker: ${l.broker_name}${l.broker_phone?' · '+l.broker_phone:''}</div>`:''}
        <div class="link-card-actions">
          ${l.listing_url&&l.listing_url!=='N/A'?`<a href="${l.listing_url}" target="_blank" class="link-btn primary-btn">↗ View Listing</a>`:`<span style="font-size:11px;color:var(--faint)">No listing URL</span>`}
          ${l.score!=null?`<span class="badge b-green" style="margin-left:auto;font-size:12px">${l.score}/100</span>`:''}
        </div>
      </div>`;
    });
    cards+=`</div>`;
    $('4-l-c').innerHTML=cards;
    // By city table
    let tbl=`<table class="tbl"><thead><tr><th>City</th><th>Avg $/sqft</th><th>Est. Listings</th><th>Best Zoning</th><th>Market Note</th><th>Search</th></tr></thead><tbody>`;
    (d.by_city_summary||[]).forEach(c=>{
      const citySlug=encodeURIComponent((c.city||'').toLowerCase().replace(/[^a-z0-9]/g,'-'));
      const loopUrl=`https://www.loopnet.com/search/commercial-real-estate/${citySlug}/for-lease/?ListingType=1`;
      const crexiUrl=`https://www.crexi.com/lease/properties?address=${encodeURIComponent(c.city||'')}`;
      tbl+=`<tr>
        <td><strong>${c.city}</strong></td>
        <td>${_nv(c.avg_rent_sqft, v=>'$'+v+'/sqft')}</td>
        <td>${_nv(c.available_listings_est, v=>'~'+v)}</td>
        <td>${c.best_zoning?`<span class="badge b-blue">${c.best_zoning}</span>`:'<span style="color:var(--faint);font-size:11px">N/A</span>'}</td>
        <td style="font-size:11px;color:var(--muted)">${_nv(c.market_note,'','—')}</td>
        <td>
          <a href="${loopUrl}" target="_blank" class="link-btn" style="font-size:10px;padding:3px 7px">↗ LoopNet</a>
          <a href="${crexiUrl}" target="_blank" class="link-btn" style="font-size:10px;padding:3px 7px;margin-left:3px">↗ Crexi</a>
        </td>
      </tr>`;
    });
    tbl+=`</tbody></table>`;
    $('4-t-c').innerHTML=tbl;
    // Cost chart
    killChart('ch-4');
    const ctx=$('ch-4').getContext('2d');
    const listings4=d.listings||[];
    charts['ch-4']=new Chart(ctx,{type:'bar',data:{
      labels:listings4.map(l=>l.city),
      datasets:[
        {label:'Annual Rent',data:listings4.map(l=>(l.monthly_rent||0)*12),backgroundColor:'rgba(74,158,255,0.7)',borderWidth:0,borderRadius:4},
        {label:'Build-Out Est.',data:listings4.map(l=>l.buildout_cost_est||0),backgroundColor:'rgba(245,166,35,0.7)',borderWidth:0,borderRadius:4}
      ]
    },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8a8d96',font:{size:11}}}},scales:{x:{ticks:{color:'#8a8d96',font:{size:9}},grid:{color:'#2a2d35'}},y:{ticks:{color:'#8a8d96',callback:v=>'$'+(v/1000).toFixed(0)+'k'},grid:{color:'#2a2d35'}}}}});
    setDot(4,'done'); showOut(4);
    return JSON.stringify(d);
  } catch(e){setDot(4,'error');showOut(4);$('4-s-t').textContent='Error: '+e.message;throw e}
}

// ══════════════════════════════════════════════════════════
// AGENT 7 — Financial Feasibility
// ══════════════════════════════════════════════════════════
