async function runAgent11(a1,a2,a4) {
  setDot(11,'running');
  const ind=industry();

  if (demoMode && typeof getDemoData === 'function') {
    const _d = getDemoData(11);
    if (_d) { R.a11 = _d; try { buildMap(_d); buildMapLegend(_d); buildDirections(_d); } catch(e){} setDot(11,'done'); showOut(11); return JSON.stringify(_d); }
  }

  // Extract city names from upstream data to drive real geographic analysis
  const demoCities  = _toArr((typeof a1==='string'?JSON.parse(a1||'{}'):a1||{}).cities||[]).map(c=>c.city||c.name).filter(Boolean);
  const gapCities   = _toArr((typeof a2==='string'?JSON.parse(a2||'{}'):a2||{}).cities||[]).map(c=>c.city||c.name).filter(Boolean);
  const allCities   = [...new Set([...demoCities,...gapCities])].slice(0,12);
  const cityContext = allCities.length ? `Known cities to map: ${allCities.join(', ')}` : `Search for cities within ${radius()} miles of ZIP ${zip()}`;

  const sys=`You are a geographic data analyst. Provide REAL lat/lng coordinates and LoopNet/Crexi URLs for actual cities. Respond with JSON only.`;
  const usr=`Build geographic mapping data for ${ind.unit} site analysis near ZIP ${zip()}.

${cityContext}
DEMOGRAPHICS: ${ctx(a1,['summary','cities'],600)}
GAP ANALYSIS: ${ctx(a2,['summary','cities','overall_opportunity_score'],600)}
REAL ESTATE: ${ctx(a4,['summary','by_city_summary'],400)}

Return ONLY this JSON. All values are placeholders.

{
  "center": {"lat": null, "lng": null, "label": null},
  "cities": [
    {
      "name":               null,
      "county":             null,
      "lat":                null,
      "lng":                null,
      "gap_score":          null,    // 0-10
      "demand_score":       null,    // 0-10
      "supply_score":       null,    // 0-10
      "unserved_children":  null,
      "median_income":      null,    // USD/yr from ACS B19013
      "competitor_count":   null,
      "priority":           null,    // "Critical Opportunity" | "High Opportunity" | "Moderate" | "Saturated"
      "recommended_action": null,
      "real_estate_url":    null     // real filtered LoopNet/Crexi URL
    }
  ],
  "real_estate_pins": [
    {"label": null, "lat": null, "lng": null, "rent": null, "sqft": null, "url": null}
  ],
  "directions": [
    {"from": null, "to": null, "drive_mins": null, "miles": null, "google_url": null}
  ]
}
Use REAL coordinates for all cities. Cap at 8 cities, 4 real estate pins at top locations, 5 driving directions. LoopNet URLs must use actual city slugs (e.g. suwanee-ga not generic). Hard cap on counts prevents max_tokens truncation.`;
  try {
    const _rdCtx11 = (typeof buildRealDataCtx === 'function') ? buildRealDataCtx(['demographics','business_density','wages']) : '';
    const usrWithCtx = _rdCtx11 ? _rdCtx11 + '\n\n' + usr : usr;
    let d=await claudeJSON(sys, usrWithCtx, {webSearch:true});
    if(!d) { console.warn('Agent 11 fallback'); d=getFallback11(); }
    R.a11=d;
    buildMap(d);
    buildMapLegend(d);
    buildDirections(d);
    setDot(11,'done'); showOut(11);
    return JSON.stringify(d);
  } catch(e){setDot(11,'error');showOut(11);try{$('11-map-c').innerHTML=`<div class="prose" style="color:var(--red)">Error: ${e.message}</div>`;}catch(_){}throw e}
}

function gapCol(s){return s>=9?'#3dd68c':s>=7?'#f5a623':s>=5?'#4a9eff':s>=3?'#a78bfa':'#ff5f5f';}
function gapBadge(s){return s>=9?'b-green':s>=7?'b-amber':s>=5?'b-blue':s>=3?'b-purple':'b-red';}

function buildMap(d) {
  const container = $('11-map-c');
  if (!container) return;

  // Destroy existing Leaflet instance
  if (window._leafletMap) {
    try { window._leafletMap.remove(); } catch(_) {}
    window._leafletMap = null;
  }

  // Build wrapping HTML
  container.innerHTML = `
    <div id="leafletMapEl" style="width:100%;height:490px;border-radius:10px;overflow:hidden;border:1px solid var(--border)"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:11px;color:var(--muted)">
      <span style="font-weight:700;color:var(--muted);font-family:'Syne',sans-serif">Gap Score:</span>
      ${[['#3dd68c','9-10 Critical'],['#f5a623','7-8 High'],['#4a9eff','5-6 Moderate'],['#a78bfa','3-4 Low'],['#ff5f5f','1-2 Avoid']].map(([c,l])=>
        `<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:11px;height:11px;border-radius:50%;background:${c};display:inline-block"></span>${l}</span>`
      ).join('')}
      <span style="display:inline-flex;align-items:center;gap:5px"><span style="font-size:13px">🏢</span> RE Listing</span>
      <span style="display:inline-flex;align-items:center;gap:5px"><span style="font-size:13px">★</span> Home ZIP</span>
    </div>
    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
      <a href="https://maps.google.com/maps?q=${encodeURIComponent(industry().unit)}+near+${zip()}" target="_blank" class="link-btn primary-btn">↗ Google Maps</a>
      <a href="https://www.loopnet.com/search/commercial-real-estate/${zip()}/for-lease/" target="_blank" class="link-btn">↗ LoopNet Listings</a>
      <a href="https://www.crexi.com/lease/properties?address=${zip()}" target="_blank" class="link-btn">↗ Crexi Listings</a>
      <a href="https://www.bizbuysell.com/search/" target="_blank" class="link-btn">↗ BizBuySell</a>
    </div>`;

  // Guard: Leaflet must be loaded
  if (typeof L === 'undefined') {
    $('leafletMapEl').innerHTML = '<div style="padding:20px;color:var(--muted);font-size:13px">Map unavailable — Leaflet library not loaded. Check internet connection.</div>';
    return;
  }

  const center = [d.center?.lat || 34.0, d.center?.lng || -84.1];

  const map = L.map('leafletMapEl', {
    center,
    zoom: 10,
    zoomControl: true,
    attributionControl: true,
  });
  window._leafletMap = map;

  // CartoDB Dark Matter tiles — dark theme, no API key needed
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // ── Home ZIP star marker ──────────────────────────────────
  const homeHtml = `<div style="background:#4a9eff;width:28px;height:28px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#000;box-shadow:0 2px 8px rgba(0,0,0,.5)">★</div>`;
  const homeIcon = L.divIcon({ html: homeHtml, className: '', iconSize: [28,28], iconAnchor: [14,14], popupAnchor: [0,-16] });
  L.marker(center, { icon: homeIcon, zIndexOffset: 1000 })
    .addTo(map)
    .bindPopup(`<strong>${d.center?.label || 'ZIP ' + zip()}</strong><br>Your search center`);

  // ── Radius circle ─────────────────────────────────────────
  const radiusMiles = parseFloat(radius()) || 40;
  L.circle(center, {
    radius: radiusMiles * 1609.34,
    color: '#4a9eff',
    weight: 1.5,
    dashArray: '6 5',
    fillOpacity: 0.04,
    opacity: 0.35,
  }).addTo(map);

  // ── Real estate pins ──────────────────────────────────────
  (d.real_estate_pins || []).forEach(pin => {
    if (!pin.lat || !pin.lng) return;
    const reHtml = `<div style="background:#0f2a45;border:2px solid #4a9eff;border-radius:5px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.4)">🏢</div>`;
    const reIcon = L.divIcon({ html: reHtml, className: '', iconSize: [24,24], iconAnchor: [12,12], popupAnchor: [0,-14] });
    L.marker([pin.lat, pin.lng], { icon: reIcon })
      .addTo(map)
      .bindPopup(`<strong>${pin.label}</strong><br>$${(pin.rent||0).toLocaleString()}/mo · ${(pin.sqft||0).toLocaleString()} sqft<br><a href="${pin.url}" target="_blank" style="color:#4a9eff">View listing ↗</a>`);
  });

  // ── City circles ──────────────────────────────────────────
  (d.cities || []).forEach(city => {
    if (!city.lat || !city.lng) return;
    const col     = gapCol(city.gap_score || 0);
    const radius  = Math.max(10, Math.min(22, 8 + (city.gap_score || 0) * 1.3));
    const unserved = (city.unserved_children || 0).toLocaleString();
    const income   = '$' + Math.round((city.median_income || 0) / 1000) + 'k';

    const circle = L.circleMarker([city.lat, city.lng], {
      radius,
      fillColor: col,
      color:     col,
      weight:    2,
      opacity:   1,
      fillOpacity: 0.75,
    })
    .addTo(map)
    .bindPopup(`
      <div style="min-width:200px">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px">${city.name}</div>
        <div style="font-size:11px;color:#888;margin-bottom:8px">${city.county || ''} County</div>
        <table style="font-size:11px;width:100%;border-collapse:collapse">
          <tr><td style="color:#888;padding:2px 0">Gap Score</td><td style="font-weight:700;color:${col};text-align:right">${city.gap_score}/10</td></tr>
          <tr><td style="color:#888;padding:2px 0">Priority</td><td style="font-weight:600;text-align:right">${city.priority||'—'}</td></tr>
          <tr><td style="color:#888;padding:2px 0">Unserved</td><td style="text-align:right">${unserved}</td></tr>
          <tr><td style="color:#888;padding:2px 0">Median Income</td><td style="text-align:right">${income}</td></tr>
          <tr><td style="color:#888;padding:2px 0">Competitors</td><td style="text-align:right">${city.competitor_count || 0}</td></tr>
        </table>
        <div style="margin-top:8px;padding:5px 8px;background:#1a3a5c;border-radius:4px;font-size:11px;font-weight:700;color:#4a9eff">${city.recommended_action||''}</div>
        ${city.real_estate_url ? `<div style="margin-top:6px"><a href="${city.real_estate_url}" target="_blank" style="font-size:11px;color:#4a9eff">View real estate listings ↗</a></div>` : ''}
      </div>`);

    // Permanent label
    const label = L.tooltip({
      permanent:  true,
      direction:  'top',
      offset:     [0, -(radius + 4)],
      className:  'leaflet-city-lbl',
      interactive: false,
    })
    .setContent(`<span style="font-weight:700">${city.gap_score}</span> ${city.name.split(' ')[0]}`)
    .setLatLng([city.lat, city.lng]);
    map.addLayer(label);
  });

  // Fix tile rendering if map was in a hidden panel
  setTimeout(() => map.invalidateSize(), 100);
}

function buildMapLegend(d) {
  let html=`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Rank</th><th>City</th><th>County</th><th>Gap Score</th><th>Priority</th><th>Unserved</th><th>Median Income</th><th>Competitors</th><th>Recommendation</th><th>Listings</th></tr></thead><tbody>`;
  [...(d.cities||[])].sort((a,b)=>(b.gap_score||0)-(a.gap_score||0)).forEach((c,i)=>{
    html+=`<tr>
      <td><strong style="color:var(--blue)">#${i+1}</strong></td>
      <td><strong>${c.name}</strong></td>
      <td style="font-size:11px;color:var(--muted)">${c.county}</td>
      <td><span class="badge ${gapBadge(c.gap_score)}">${c.gap_score}/10</span></td>
      <td style="font-size:11px">${c.priority}</td>
      <td>${(c.unserved_children||0).toLocaleString()}</td>
      <td>$${((c.median_income||0)/1000).toFixed(0)}k</td>
      <td>${c.competitor_count||0}</td>
      <td style="font-size:11px;color:var(--green);font-weight:600">${c.recommended_action}</td>
      <td><a href="${c.real_estate_url}" target="_blank" class="link-btn primary-btn" style="font-size:10px;padding:3px 7px">↗</a></td>
    </tr>`;
  });
  html+=`</tbody></table></div>`;
  $('11-leg-c').innerHTML=html;
}

function buildDirections(d) {
  let html=`<div style="margin-bottom:10px;font-size:13px;color:var(--muted)">Drive times from ZIP ${zip()} to each key market:</div><div style="display:grid;gap:8px">`;
  (d.directions||[]).forEach(dir=>{
    html+=`<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)">
      <div style="font-size:22px;font-weight:700;font-family:'Syne',sans-serif;color:var(--blue);width:58px;text-align:center;flex-shrink:0">${dir.drive_mins}<span style="font-size:11px;font-weight:400">min</span></div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;font-family:'Syne',sans-serif">${dir.to}</div>
        <div style="font-size:11px;color:var(--muted)">${dir.from} · ${dir.miles} miles</div>
      </div>
      <a href="${dir.google_url}" target="_blank" class="link-btn primary-btn" style="font-size:11px;flex-shrink:0">↗ Google Maps</a>
    </div>`;
  });
  html+=`</div>`;
  $('11-dir-c').innerHTML=html;
}

// ══════════════════════════════════════════════════════════
// GRANT SEARCH AGENT (Agent 12)
// ══════════════════════════════════════════════════════════
