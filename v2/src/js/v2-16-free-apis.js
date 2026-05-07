// ══════════════════════════════════════════════════════════════════════════════
// V2-16 FREE APIs — Zero-cost data enrichment layer
//
// APIs used (all free, no key required unless noted):
//   • Nominatim (OpenStreetMap)  — address geocoding → lat/lng/ZIP
//   • US Census Geocoder         — address validation + FIPS codes
//   • Zippopotam.us              — ZIP → city/state lookup (existing)
//   • US Census ACS              — demographics (no key)
//   • BLS Public Data API        — employment & wage data (no key)
//   • FRED (St. Louis Fed)       — economic indicators (no key)
//   • Overpass API (OSM)         — competitor/business finder (no key)
//   • HUD Fair Market Rents      — commercial rent benchmarks (no key)
//   • Open FDA                   — medical facility & drug data (no key)
//   • Open Notify                — ISS position (demo/fun data)
// ══════════════════════════════════════════════════════════════════════════════

const FREE_API_CACHE = {};
function _freeApiCache(key, val) {
  if (val !== undefined) FREE_API_CACHE[key] = val;
  return FREE_API_CACHE[key];
}

// ── RATE LIMIT GUARD (Nominatim requires 1 req/sec) ──────────────────────────
let _nominatimLastCall = 0;
async function _nominatimFetch(url) {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - _nominatimLastCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _nominatimLastCall = Date.now();
  return fetch(url, { headers: { 'User-Agent': 'BusinessHunterApp/2.0' } });
}

// ── ADDRESS GEOCODING ─────────────────────────────────────────────────────────
/**
 * Geocode a free-text address using Nominatim (OpenStreetMap).
 * Returns { lat, lng, zip, city, state, display_name, country_code }
 * Falls back to US Census Geocoder if Nominatim fails.
 */
async function v2GeocodeAddress(address) {
  if (!address || address.trim().length < 5) return null;
  const cacheKey = 'geo:' + address.toLowerCase().trim();
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;

  // 1. Try Nominatim first
  try {
    const enc = encodeURIComponent(address + ', USA');
    const url  = `https://nominatim.openstreetmap.org/search?q=${enc}&format=json&addressdetails=1&limit=5&countrycodes=us`;
    const res  = await _nominatimFetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const best = data[0];
        const addr = best.address || {};
        const zip  = addr.postcode?.replace(/[^0-9]/g, '').slice(0, 5) || '';
        const result = {
          lat:          parseFloat(best.lat),
          lng:          parseFloat(best.lon),
          zip,
          city:         addr.city || addr.town || addr.village || addr.county || '',
          state:        addr.state || '',
          state_abbr:   _stateNameToAbbr(addr.state || ''),
          display_name: best.display_name,
          country_code: addr.country_code?.toUpperCase() || 'US',
          source:       'nominatim',
          candidates:   data.slice(0, 5).map(d => ({
            display_name: d.display_name,
            zip: (d.address?.postcode||'').replace(/[^0-9]/g,'').slice(0,5),
            city: d.address?.city || d.address?.town || '',
            state: d.address?.state || '',
            lat: parseFloat(d.lat), lng: parseFloat(d.lon),
          })),
        };
        _freeApiCache(cacheKey, result);
        return result;
      }
    }
  } catch (e) { console.warn('[v2FreeAPI] Nominatim failed:', e.message); }

  // 2. Fallback: US Census Geocoder
  try {
    const enc = encodeURIComponent(address);
    const url  = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${enc}&benchmark=2020&format=json`;
    const res  = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const matches = data?.result?.addressMatches || [];
      if (matches.length > 0) {
        const m = matches[0];
        const result = {
          lat:          m.coordinates.y,
          lng:          m.coordinates.x,
          zip:          m.addressComponents?.zip || '',
          city:         m.addressComponents?.city || '',
          state:        m.addressComponents?.state || '',
          state_abbr:   m.addressComponents?.state || '',
          display_name: m.matchedAddress,
          country_code: 'US',
          source:       'census_geocoder',
        };
        _freeApiCache(cacheKey, result);
        return result;
      }
    }
  } catch (e) { console.warn('[v2FreeAPI] Census geocoder failed:', e.message); }

  return null;
}

// ── ADDRESS VALIDATION ────────────────────────────────────────────────────────
/**
 * Validate an address and return standardized components.
 * Uses Census Geocoder (authoritative US address DB).
 */
async function v2ValidateAddress(address) {
  const result = await v2GeocodeAddress(address);
  if (!result) return { valid: false, reason: 'Address not found' };
  if (result.country_code !== 'US') return { valid: false, reason: 'Address outside the US' };
  if (!result.zip) return { valid: true, warning: 'ZIP code could not be extracted', ...result };
  return { valid: true, ...result };
}

// ── DEBOUNCED GEO SEARCH (for wizard input) ───────────────────────────────────
let _v2GeoSearchTimer = null;
async function v2GeoSearchDebounced(text) {
  clearTimeout(_v2GeoSearchTimer);
  const spinner = document.getElementById('wiz-geo-spinner');
  const resultEl = document.getElementById('wiz-geo-result');
  const suggestEl = document.getElementById('wiz-geo-suggestions');

  if (!text || text.trim().length < 6) {
    if (resultEl) resultEl.textContent = '';
    if (suggestEl) suggestEl.innerHTML = '';
    return;
  }

  if (spinner) spinner.style.display = 'block';

  _v2GeoSearchTimer = setTimeout(async () => {
    try {
      const res = await v2GeocodeAddress(text);
      if (spinner) spinner.style.display = 'none';

      if (!res) {
        if (resultEl) { resultEl.textContent = '⚠️ Address not found — try adding city or state'; resultEl.style.color = 'var(--v2-amber)'; }
        if (suggestEl) suggestEl.innerHTML = '';
        return;
      }

      // Auto-select if perfect ZIP match
      if (res.zip) {
        V2.wizard.data.zip = res.zip;
        V2.wizard.data.zipLabel = `${res.city}, ${res.state_abbr || res.state} ${res.zip}`;
        if (resultEl) {
          resultEl.innerHTML = `✅ ${res.city}, ${res.state_abbr || res.state} · ZIP <strong>${res.zip}</strong> · Verified via ${res.source === 'nominatim' ? 'OpenStreetMap' : 'US Census'}`;
          resultEl.style.color = 'var(--v2-green)';
        }
      }

      // Show candidates if multiple results
      if (res.candidates && res.candidates.length > 1 && suggestEl) {
        suggestEl.innerHTML = res.candidates.slice(1, 4).map(c => `
          <div class="v2-geo-suggestion" onclick="v2GeoPickSuggestion(${JSON.stringify(c).replace(/"/g,'&quot;')})">
            📍 ${c.city}${c.state ? ', '+c.state : ''}${c.zip ? ' '+c.zip : ''} — <span style="color:var(--v2-t3);font-size:11px">${c.display_name.substring(0, 60)}</span>
          </div>`).join('');
      } else if (suggestEl) {
        suggestEl.innerHTML = '';
      }
    } catch (e) {
      if (spinner) spinner.style.display = 'none';
      if (resultEl) { resultEl.textContent = '⚠️ Geocoding error — enter ZIP directly'; resultEl.style.color = 'var(--v2-amber)'; }
    }
  }, 600);
}

function v2GeoPickSuggestion(candidate) {
  V2.wizard.data.zip      = candidate.zip || V2.wizard.data.zip;
  V2.wizard.data.address  = candidate.display_name;
  V2.wizard.data.zipLabel = `${candidate.city}, ${candidate.state} ${candidate.zip}`;

  const addrInput = document.getElementById('wiz-address');
  if (addrInput) addrInput.value = candidate.display_name;

  const resultEl  = document.getElementById('wiz-geo-result');
  if (resultEl) {
    resultEl.innerHTML = `✅ ${candidate.city}, ${candidate.state} · ZIP <strong>${candidate.zip}</strong>`;
    resultEl.style.color = 'var(--v2-green)';
  }

  const suggestEl = document.getElementById('wiz-geo-suggestions');
  if (suggestEl) suggestEl.innerHTML = '';
}

// ── US CENSUS ACS DATA ────────────────────────────────────────────────────────
/**
 * Fetch real demographic data from the US Census Bureau ACS 5-Year estimates.
 * No API key required.
 * Returns { median_income, population, population_under_18, households, etc. }
 */
async function v2FetchCensusACS(zip) {
  if (!zip || !/^\d{5}$/.test(zip)) return null;
  const cacheKey = 'acs:' + zip;
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;

  try {
    // ACS 5-Year — key metrics for ZIP code tabulation area (ZCTA)
    const fields = [
      'B19013_001E', // Median household income
      'B01003_001E', // Total population
      'B09001_001E', // Population under 18
      'B11001_001E', // Total households
      'B25001_001E', // Housing units
      'B25064_001E', // Median gross rent
      'B23025_002E', // Labor force
      'B15003_022E', // Bachelor's degree +
    ].join(',');

    const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${fields}&for=zip+code+tabulation+area:${zip}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const raw  = await res.json();
    if (!raw || raw.length < 2) return null;

    const headers = raw[0];
    const row     = raw[1];
    const val = (field) => {
      const idx = headers.indexOf(field);
      const v   = idx >= 0 ? parseInt(row[idx]) : null;
      return (v && v > 0) ? v : null;
    };

    const result = {
      zip,
      median_income:        val('B19013_001E'),
      total_population:     val('B01003_001E'),
      population_under_18:  val('B09001_001E'),
      total_households:     val('B11001_001E'),
      housing_units:        val('B25001_001E'),
      median_gross_rent:    val('B25064_001E'),
      labor_force:          val('B23025_002E'),
      bachelors_degree_plus:val('B15003_022E'),
      source: 'US Census Bureau ACS 5-Year Estimates (2022)',
      fetched_at: Date.now(),
    };

    _freeApiCache(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] Census ACS fetch failed:', e.message);
    return null;
  }
}

// ── OVERPASS API — OSM Business Finder ───────────────────────────────────────
/**
 * Find businesses of a given type near lat/lng using OpenStreetMap Overpass.
 * Returns array of { name, lat, lng, address, type }
 */
async function v2FindNearbyBusinesses(lat, lng, businessType, radiusMiles = 5) {
  const cacheKey = `overpass:${lat.toFixed(3)},${lng.toFixed(3)},${businessType},${radiusMiles}`;
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;

  const radiusM = Math.round(radiusMiles * 1609.34);
  const osmTags = _industryToOSMTags(businessType);

  // Build Overpass QL query
  const queries = osmTags.map(tag => `node[${tag}](around:${radiusM},${lat},${lng});`).join('');
  const query = `[out:json][timeout:15];(${queries});out body 25;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const elements = (data.elements || []).slice(0, 20);
    const result = elements.map(el => ({
      name:    el.tags?.name || el.tags?.brand || 'Unnamed',
      lat:     el.lat,
      lng:     el.lon,
      address: [el.tags?.['addr:housenumber'], el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(' '),
      type:    businessType,
      phone:   el.tags?.phone || el.tags?.['contact:phone'] || null,
      website: el.tags?.website || el.tags?.['contact:website'] || null,
      osm_id:  el.id,
    }));

    _freeApiCache(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] Overpass failed:', e.message);
    return [];
  }
}

function _industryToOSMTags(industry) {
  const map = {
    daycare:          ['"amenity"="childcare"', '"amenity"="kindergarten"'],
    gas_station:      ['"amenity"="fuel"'],
    laundromat:       ['"shop"="laundry"', '"shop"="laundromat"'],
    car_wash:         ['"amenity"="car_wash"'],
    restaurant:       ['"amenity"="restaurant"', '"amenity"="fast_food"'],
    gym:              ['"leisure"="fitness_centre"', '"leisure"="sports_centre"'],
    indoor_play:      ['"leisure"="playground"', '"amenity"="amusement_arcade"'],
    dry_cleaning:     ['"shop"="dry_cleaning"', '"shop"="clothes"'],
    senior_care:      ['"amenity"="nursing_home"', '"amenity"="retirement_home"'],
    tutoring:         ['"amenity"="school"', '"amenity"="tutoring"'],
    urgent_care:      ['"amenity"="clinic"', '"healthcare"="clinic"'],
    medical_practice: ['"amenity"="doctors"', '"healthcare"="doctor"', '"amenity"="clinic"'],
    coffee_shop:      ['"amenity"="cafe"'],
    barbershop:       ['"shop"="hairdresser"', '"shop"="barber"'],
    coworking:        ['"amenity"="coworking_space"', '"office"="coworking"'],
  };
  return map[industry] || ['"amenity"="office"'];
}

// ── HUD FAIR MARKET RENTS ─────────────────────────────────────────────────────
/**
 * Fetch HUD Fair Market Rents for a metro area.
 * Returns FMR data for 1BR–4BR units (commercial rent proxy).
 */
async function v2FetchHUDRents(zip) {
  // HUD FMR by ZIP (2024 data via HUD API — no key required)
  const cacheKey = 'hud:' + zip;
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://www.huduser.gov/hudapi/public/fmr/statedata/${zip.slice(0,2)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    _freeApiCache(cacheKey, data);
    return data;
  } catch (e) {
    console.warn('[v2FreeAPI] HUD rents failed:', e.message);
    return null;
  }
}

// ── BLS EMPLOYMENT DATA ───────────────────────────────────────────────────────
/**
 * Fetch BLS wage data for industry-relevant occupations.
 * Returns median wages and employment counts.
 * BLS Public API — no key for 2 series, 500 calls/day.
 */
async function v2FetchBLSWages(industryVal) {
  const seriesMap = {
    daycare:          ['CES6562440001'],  // Child day care services employment
    restaurant:       ['CES7072200001'],  // Full-service restaurants
    gym:              ['CES7139910001'],  // Fitness & recreational sports centers
    medical_practice: ['CES6562110001'],  // Offices of physicians
    urgent_care:      ['CES6562111001'],  // Offices of physicians (general)
    coffee_shop:      ['CES7072200001'],  // Limited-service restaurants (proxy)
  };

  const series = seriesMap[industryVal];
  if (!series) return null;

  const cacheKey = 'bls:' + industryVal;
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch('https://api.bls.gov/publicAPI/v1/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seriesid: series, startyear: '2023', endyear: '2024' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    _freeApiCache(cacheKey, data);
    return data;
  } catch (e) {
    console.warn('[v2FreeAPI] BLS failed:', e.message);
    return null;
  }
}

// ── FRED ECONOMIC DATA ────────────────────────────────────────────────────────
/**
 * Fetch key economic indicators from FRED (Federal Reserve Bank of St. Louis).
 * No key required for basic series.
 */
async function v2FetchFREDIndicators() {
  const cacheKey = 'fred:indicators';
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;

  try {
    // Prime rate (SBA loan proxy) + CPI + 30yr mortgage rate
    const series = [
      { id: 'PRIME',   label: 'Prime Rate (%)',    url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=PRIME' },
      { id: 'CPIAUCSL', label: 'CPI (inflation)', url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL' },
      { id: 'UNRATE',  label: 'Unemployment (%)', url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE' },
    ];

    const results = {};
    await Promise.allSettled(series.map(async s => {
      try {
        const res = await fetch(s.url);
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.trim().split('\n').filter(l => l && !l.startsWith('DATE'));
        if (lines.length > 0) {
          const [date, val] = lines[lines.length - 1].split(',');
          results[s.id] = { label: s.label, value: parseFloat(val), date, raw: lines.slice(-6) };
        }
      } catch {}
    }));

    _freeApiCache(cacheKey, results);
    return results;
  } catch (e) {
    console.warn('[v2FreeAPI] FRED failed:', e.message);
    return null;
  }
}

// ── OPEN FDA — Medical Facility Data ─────────────────────────────────────────
/**
 * Search FDA facility data for medical practices near a ZIP.
 * Useful for medical_practice industry competitor analysis.
 */
async function v2FetchOpenFDAFacilities(zip, facilityType = 'physician') {
  if (facilityType !== 'physician' && !['hospital','clinic'].includes(facilityType)) return [];
  const cacheKey = `openfda:${zip}:${facilityType}`;
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;

  // NPPES NPI Registry — physician/practice lookup (no key)
  try {
    const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&postal_code=${zip}&taxonomy_description=Family+Medicine&limit=20&skip=0`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.results || []).map(p => ({
      npi:        p.number,
      name:       p.basic?.organization_name || `${p.basic?.first_name || ''} ${p.basic?.last_name || ''}`.trim(),
      type:       p.basic?.entity_type_code === '2' ? 'Practice' : 'Physician',
      specialty:  p.taxonomies?.[0]?.desc || 'General Practice',
      address:    (p.addresses?.[0]?.address_1 || '') + ', ' + (p.addresses?.[0]?.city || '') + ' ' + (p.addresses?.[0]?.state || ''),
      phone:      p.addresses?.[0]?.telephone_number || null,
    })).filter(p => p.name);

    _freeApiCache(cacheKey, results);
    return results;
  } catch (e) {
    console.warn('[v2FreeAPI] OpenFDA/NPPES failed:', e.message);
    return [];
  }
}

// ── UI WIDGET — Free API Data Panel (injects into dashboard) ─────────────────
/**
 * Renders a "Live Data Sources" badge in the dashboard header area.
 * Shows which free APIs contributed to the current analysis.
 */
function v2RenderFreeAPIBadge(sources) {
  const existing = document.getElementById('v2-free-api-badge');
  if (existing) existing.remove();

  if (!sources || sources.length === 0) return;

  const badge = document.createElement('div');
  badge.id = 'v2-free-api-badge';
  badge.style.cssText = `
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 8px 14px; margin-bottom: 12px;
    background: rgba(99,102,241,0.07);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 10px; font-size: 11px; color: var(--v2-t3);
  `;
  badge.innerHTML = `
    <span style="font-weight:700;color:var(--v2-a1)">🌐 Live Data</span>
    ${sources.map(s => `<span class="v2-api-tag">${s}</span>`).join('')}
    <span style="margin-left:auto;cursor:pointer;color:var(--v2-t3)" onclick="this.parentElement.remove()" title="Dismiss">✕</span>
  `;

  const wrap = document.getElementById('v2-dash-wrap');
  if (wrap && wrap.firstChild) wrap.insertBefore(badge, wrap.firstChild);
}

// ── CENSUS ACS ENRICHMENT CARD ────────────────────────────────────────────────
/**
 * Fetch and render a census data card for the current ZIP.
 * Called optionally from dashboard after analysis completes.
 */
async function v2RenderCensusCard(zip) {
  if (!zip) return;
  // Deduplicate — remove any existing card first
  document.getElementById('v2-census-card')?.remove();

  const data = await v2FetchCensusACS(zip);
  if (!data) return;

  const fmt  = n => n ? n.toLocaleString() : 'N/A';
  const fmtD = n => n ? '$' + n.toLocaleString() : 'N/A';

  const card = document.createElement('div');
  card.id = 'v2-census-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">🏛️ US Census Bureau — ZIP ${zip} Demographics</div>
      <div style="font-size:10px;color:var(--v2-t3)">${data.source}</div>
    </div>
    <div class="v2-kpi-grid">
      <div class="v2-kpi"><div class="v2-kpi-ico">💰</div><div class="v2-kpi-val">${fmtD(data.median_income)}</div><div class="v2-kpi-lbl">Median Income</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">👥</div><div class="v2-kpi-val">${fmt(data.total_population)}</div><div class="v2-kpi-lbl">Population</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">🏠</div><div class="v2-kpi-val">${fmt(data.total_households)}</div><div class="v2-kpi-lbl">Households</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">🏘️</div><div class="v2-kpi-val">${fmtD(data.median_gross_rent)}</div><div class="v2-kpi-lbl">Median Rent</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">👶</div><div class="v2-kpi-val">${fmt(data.population_under_18)}</div><div class="v2-kpi-lbl">Pop. Under 18</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">💼</div><div class="v2-kpi-val">${fmt(data.labor_force)}</div><div class="v2-kpi-lbl">Labor Force</div></div>
    </div>
  `;

  const execPanel = document.getElementById('v2-panel-executive');
  if (execPanel) execPanel.appendChild(card);
}

// ── FRED ECONOMIC CARD ────────────────────────────────────────────────────────
async function v2RenderFREDCard() {
  // Deduplicate
  document.getElementById('v2-fred-card')?.remove();

  const data = await v2FetchFREDIndicators();
  if (!data) return;

  const card = document.createElement('div');
  card.id = 'v2-fred-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">📈 Federal Reserve (FRED) — Live Economic Indicators</div>
      <div style="font-size:10px;color:var(--v2-t3)">St. Louis Fed · updated ${data.PRIME?.date || 'recently'}</div>
    </div>
    <div class="v2-kpi-grid">
      ${data.PRIME   ? `<div class="v2-kpi"><div class="v2-kpi-ico">🏦</div><div class="v2-kpi-val">${data.PRIME.value}%</div><div class="v2-kpi-lbl">Prime Rate (SBA proxy)</div></div>` : ''}
      ${data.UNRATE  ? `<div class="v2-kpi"><div class="v2-kpi-ico">👷</div><div class="v2-kpi-val">${data.UNRATE.value}%</div><div class="v2-kpi-lbl">Unemployment Rate</div></div>` : ''}
      ${data.CPIAUCSL? `<div class="v2-kpi"><div class="v2-kpi-ico">📊</div><div class="v2-kpi-val">${data.CPIAUCSL.value?.toFixed(1)}</div><div class="v2-kpi-lbl">CPI Index</div></div>` : ''}
    </div>
  `;

  const finPanel = document.getElementById('v2-panel-financials');
  if (finPanel) finPanel.appendChild(card);
}

// ── NPPES COMPETITOR CARD (Medical Practice only) ─────────────────────────────
async function v2RenderNPPESCard(zip) {
  if (!zip) return;
  // Deduplicate
  document.getElementById('v2-nppes-card')?.remove();

  const practices = await v2FetchOpenFDAFacilities(zip, 'physician');
  if (!practices || practices.length === 0) return;

  const card = document.createElement('div');
  card.id = 'v2-nppes-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">🏥 NPPES NPI Registry — Medical Practices in ZIP ${zip}</div>
      <div style="font-size:10px;color:var(--v2-t3)">CMS Provider Registry</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${practices.slice(0, 8).map(p => `
        <div style="display:flex;justify-content:space-between;padding:10px 12px;background:var(--v2-s3);border-radius:8px;font-size:12px">
          <div>
            <div style="font-weight:600;color:var(--v2-t1)">${p.name}</div>
            <div style="color:var(--v2-t3)">${p.specialty} · ${p.address || 'Address N/A'}</div>
          </div>
          <div style="color:var(--v2-t3);font-size:11px;white-space:nowrap">${p.type} · NPI ${p.npi}</div>
        </div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--v2-t3);margin-top:8px">Showing ${Math.min(practices.length, 8)} of ${practices.length} providers found</div>
  `;

  const compPanel = document.getElementById('v2-panel-competition');
  if (compPanel) compPanel.appendChild(card);
}

// ── UTILITY ───────────────────────────────────────────────────────────────────
function _stateNameToAbbr(stateName) {
  const map = {
    'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
    'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
    'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
    'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD',
    'Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO',
    'Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ',
    'New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH',
    'Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
    'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
    'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
    'District of Columbia':'DC',
  };
  return map[stateName] || stateName?.slice(0,2).toUpperCase() || '';
}

// ── ZIP CENTROID LOOKUP ───────────────────────────────────────────────────────
/**
 * Get lat/lng centroid for a ZIP code (for Overpass queries).
 * Uses Nominatim to geocode "{zip}, USA".
 */
async function v2GetZIPCentroid(zip) {
  if (!zip || !/^\d{5}$/.test(zip)) return null;
  const cacheKey = 'centroid:' + zip;
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;

  try {
    const enc = encodeURIComponent(zip + ', USA');
    const res = await _nominatimFetch(`https://nominatim.openstreetmap.org/search?q=${enc}&format=json&limit=1&countrycodes=us`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    _freeApiCache(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] ZIP centroid failed:', e.message);
    return null;
  }
}

// ── OVERPASS COMPETITOR CARD ──────────────────────────────────────────────────
/**
 * Render a live competitor list from OpenStreetMap Overpass API.
 * Injects a card into the Competition tab panel.
 */
function v2RenderOverpassCard(businesses, industry, zip) {
  const existing = document.getElementById('v2-overpass-card');
  if (existing) existing.remove();

  const panel = document.getElementById('v2-panel-competition');
  if (!panel) return;

  const ind = (typeof V2_INDUSTRIES !== 'undefined' ? V2_INDUSTRIES : []).find(i => i.val === industry) || {};
  const card = document.createElement('div');
  card.id = 'v2-overpass-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';

  if (!businesses || businesses.length === 0) {
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="v2-label">🗺️ OpenStreetMap — Nearby ${ind.label || 'Businesses'}</div>
        <div style="font-size:10px;color:var(--v2-t3)">ZIP ${zip} · Overpass API</div>
      </div>
      <div style="font-size:12px;color:var(--v2-t3);padding:12px;background:var(--v2-s3);border-radius:8px">
        No businesses found in OpenStreetMap for this area — OSM coverage varies by region.
        This does not mean the area is competitor-free; supplement with Google Maps research.
      </div>`;
  } else {
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="v2-label">🗺️ OpenStreetMap — ${businesses.length} ${ind.label || 'Business'} Nearby</div>
        <div style="font-size:10px;color:var(--v2-t3)">ZIP ${zip} · Live from Overpass API</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${businesses.slice(0, 10).map(b => `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:9px 12px;background:var(--v2-s3);border-radius:8px;font-size:12px">
            <div>
              <div style="font-weight:600;color:var(--v2-t1)">${b.name !== 'Unnamed' ? b.name : '(unnamed)'}</div>
              ${b.address ? `<div style="color:var(--v2-t3);margin-top:1px">${b.address}</div>` : ''}
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;margin-left:10px">
              ${b.phone ? `<a href="tel:${b.phone}" style="font-size:10px;color:var(--v2-a1)">${b.phone}</a>` : ''}
              ${b.website ? `<a href="${b.website}" target="_blank" style="font-size:10px;color:var(--v2-a1)">🌐</a>` : ''}
            </div>
          </div>`).join('')}
      </div>
      <div style="font-size:10px;color:var(--v2-t3);margin-top:8px">
        Source: OpenStreetMap contributors · Data freshness varies · ${businesses.length > 10 ? `Showing 10 of ${businesses.length}` : `${businesses.length} total`}
      </div>`;
  }

  panel.appendChild(card);
}

// ── BLS WAGE BENCHMARK CARD ───────────────────────────────────────────────────
/**
 * Render a BLS employment/wage benchmark card in the Financials tab.
 */
function v2RenderBLSWageCard(blsData, industryVal) {
  const existing = document.getElementById('v2-bls-card');
  if (existing) existing.remove();

  const panel = document.getElementById('v2-panel-financials');
  if (!panel || !blsData) return;

  const series = blsData?.Results?.series?.[0];
  if (!series || !series.data || series.data.length === 0) return;

  // Get last 4 data points for a mini trend
  const recent = [...series.data]
    .sort((a, b) => b.year - a.year || b.period.localeCompare(a.period))
    .slice(0, 4);

  const latest = recent[0];
  const prev   = recent[recent.length - 1];
  const latestVal  = parseFloat(latest?.value);
  const prevVal    = parseFloat(prev?.value);
  const changePct  = prevVal ? (((latestVal - prevVal) / prevVal) * 100).toFixed(1) : null;
  const changeColor = changePct > 0 ? 'var(--v2-green)' : 'var(--v2-red)';

  const indLabel = (typeof V2_INDUSTRIES !== 'undefined' ? V2_INDUSTRIES : []).find(i => i.val === industryVal)?.label || industryVal;

  const card = document.createElement('div');
  card.id = 'v2-bls-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">📋 Bureau of Labor Statistics — ${indLabel} Employment</div>
      <div style="font-size:10px;color:var(--v2-t3)">BLS Public Data API · Series ${series.seriesID}</div>
    </div>
    <div class="v2-kpi-grid">
      <div class="v2-kpi">
        <div class="v2-kpi-ico">👷</div>
        <div class="v2-kpi-val">${latestVal ? Math.round(latestVal).toLocaleString() + 'K' : 'N/A'}</div>
        <div class="v2-kpi-lbl">US Employees (${latest.periodName} ${latest.year})</div>
      </div>
      ${changePct !== null ? `
      <div class="v2-kpi">
        <div class="v2-kpi-ico">${parseFloat(changePct) > 0 ? '📈' : '📉'}</div>
        <div class="v2-kpi-val" style="color:${changeColor}">${changePct > 0 ? '+' : ''}${changePct}%</div>
        <div class="v2-kpi-lbl">vs ${prev.periodName} ${prev.year}</div>
      </div>` : ''}
    </div>
    <div style="font-size:10px;color:var(--v2-t3);margin-top:8px">
      National employment count for this industry sector · Indicates market size and labor pool availability
    </div>`;

  panel.appendChild(card);
}

// ── WIZARD ZIP STATS PREVIEW ──────────────────────────────────────────────────
/**
 * Shows a mini Census ACS demographics preview directly in the wizard Location
 * step after a valid ZIP is entered — before the user runs the full analysis.
 */
async function v2ShowWizardZIPStats(zip) {
  const statsEl = document.getElementById('wiz-zip-stats');
  if (!statsEl) return;
  if (!zip || !/^\d{5}$/.test(zip)) { statsEl.innerHTML = ''; return; }

  statsEl.innerHTML = '<div style="font-size:11px;color:var(--v2-t3);padding:8px 0">⏳ Fetching live demographics…</div>';

  try {
    const data = await v2FetchCensusACS(zip);
    if (!data) { statsEl.innerHTML = ''; return; }

    const fmt  = n => n ? n.toLocaleString() : '—';
    const fmtD = n => n ? '$' + n.toLocaleString() : '—';
    const under18Pct = data.total_population && data.population_under_18
      ? ((data.population_under_18 / data.total_population) * 100).toFixed(1)
      : null;

    statsEl.innerHTML = `
      <div style="margin-top:10px;padding:12px 14px;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.18);border-radius:10px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--v2-a1);margin-bottom:10px">
          🏛️ Live Census Data — ZIP ${zip}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="font-size:12px"><span style="color:var(--v2-t3)">Population</span><br><strong style="color:var(--v2-t1)">${fmt(data.total_population)}</strong></div>
          <div style="font-size:12px"><span style="color:var(--v2-t3)">Median Income</span><br><strong style="color:var(--v2-t1)">${fmtD(data.median_income)}</strong></div>
          <div style="font-size:12px"><span style="color:var(--v2-t3)">Households</span><br><strong style="color:var(--v2-t1)">${fmt(data.total_households)}</strong></div>
          <div style="font-size:12px"><span style="color:var(--v2-t3)">Median Rent</span><br><strong style="color:var(--v2-t1)">${fmtD(data.median_gross_rent)}</strong></div>
          ${under18Pct ? `<div style="font-size:12px"><span style="color:var(--v2-t3)">Under-18</span><br><strong style="color:var(--v2-t1)">${under18Pct}% of pop.</strong></div>` : ''}
          ${data.labor_force ? `<div style="font-size:12px"><span style="color:var(--v2-t3)">Labor Force</span><br><strong style="color:var(--v2-t1)">${fmt(data.labor_force)}</strong></div>` : ''}
        </div>
        <div style="font-size:9px;color:var(--v2-t3);margin-top:8px">US Census ACS 5-Year Estimates · 2022</div>
      </div>`;
  } catch (e) {
    statsEl.innerHTML = '';
  }
}

// ── POST-ANALYSIS ENRICHMENT TRIGGER ─────────────────────────────────────────
/**
 * Called after analysis completes. Enriches dashboard with live free API data.
 * Non-blocking — runs after dashboard renders, won't delay analysis.
 */
async function v2EnrichDashboardWithFreeAPIs() {
  const run = V2.run;
  if (!run) return;

  const zip      = run.zip || V2.wizard?.data?.zip;
  const industry = run.industry || V2.wizard?.data?.industry;
  if (!zip) return;

  const activeSources = [];

  // Always: Census ACS demographics
  try {
    const census = await v2FetchCensusACS(zip);
    if (census) {
      await v2RenderCensusCard(zip);
      activeSources.push('US Census ACS');
    }
  } catch {}

  // Always: FRED economic indicators
  try {
    const fred = await v2FetchFREDIndicators();
    if (fred && Object.keys(fred).length > 0) {
      await v2RenderFREDCard();
      activeSources.push('FRED (Fed Reserve)');
    }
  } catch {}

  // Always: BLS wage data (if industry is mapped)
  try {
    const bls = await v2FetchBLSWages(industry);
    if (bls?.Results?.series?.length) {
      v2RenderBLSWageCard(bls, industry);
      activeSources.push('BLS Public Data');
    }
  } catch {}

  // Always: Overpass nearby competitor businesses
  try {
    // Use geocoded lat/lng if available, otherwise get ZIP centroid
    let lat = V2.wizard?.data?._lat || run._lat;
    let lng = V2.wizard?.data?._lng || run._lng;
    if (!lat || !lng) {
      const centroid = await v2GetZIPCentroid(zip);
      if (centroid) { lat = centroid.lat; lng = centroid.lng; }
    }
    if (lat && lng) {
      const radius = parseFloat(run.radius || V2.wizard?.data?.radius || '5');
      const businesses = await v2FindNearbyBusinesses(lat, lng, industry, radius);
      v2RenderOverpassCard(businesses, industry, zip);
      if (businesses.length > 0) activeSources.push('OpenStreetMap (OSM)');
    }
  } catch {}

  // Medical practice: NPPES competitor data
  if (industry === 'medical_practice') {
    try {
      const nppes = await v2FetchOpenFDAFacilities(zip, 'physician');
      if (nppes && nppes.length > 0) {
        await v2RenderNPPESCard(zip);
        activeSources.push('CMS NPPES Registry');
      }
    } catch {}
  }

  // Render badge showing active sources
  if (activeSources.length > 0) v2RenderFreeAPIBadge(activeSources);
}

// ── Hook into pipeline completion to auto-enrich ──────────────────────────────
// Guard: only one enrichment run at a time — prevents double cards when
// v2LaunchShowcase calls both v2GoTo('dashboard') + v2RenderDashboard(run)
let _v2EnrichPending = false;
(function _v2PatchDashboardForAPIs() {
  if (typeof v2RenderDashboard !== 'function') return;
  const _origRender = v2RenderDashboard;
  v2RenderDashboard = function(run) {
    _origRender(run);
    // Always enrich — demo uses pre-seeded cache (no real HTTP calls needed)
    if (!_v2EnrichPending) {
      _v2EnrichPending = true;
      setTimeout(() => {
        v2EnrichDashboardWithFreeAPIs().finally(() => { _v2EnrichPending = false; });
      }, 900);
    }
  };
})();
