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

// AbortSignal.timeout polyfill — Safari < 16 doesn't ship it.
// All v2-16 fetches use this so the bundle works on older Safari.
function _abortTimeoutSig(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
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
        V2.wizard.data.zip    = res.zip;
        V2.wizard.data.city   = res.city  || V2.wizard.data.city  || '';
        V2.wizard.data.state  = res.state_abbr || res.state || V2.wizard.data.state || '';
        V2.wizard.data.zipLabel = `${res.city}, ${res.state_abbr || res.state} ${res.zip}`;
        // Populate split address fields
        const cityEl  = document.getElementById('wiz-city');
        const stateEl = document.getElementById('wiz-state');
        if (cityEl  && !cityEl.value)  cityEl.value  = V2.wizard.data.city;
        if (stateEl && !stateEl.value) stateEl.value = V2.wizard.data.state;
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
  V2.wizard.data.city     = candidate.city  || V2.wizard.data.city  || '';
  V2.wizard.data.state    = candidate.state_abbr || candidate.state || V2.wizard.data.state || '';
  V2.wizard.data.zipLabel = `${candidate.city}, ${candidate.state} ${candidate.zip}`;

  // Populate split address fields
  const cityEl  = document.getElementById('wiz-city');
  const stateEl = document.getElementById('wiz-state');
  if (cityEl)  cityEl.value  = V2.wizard.data.city;
  if (stateEl) stateEl.value = V2.wizard.data.state;

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
    optometry:        ['"healthcare"="optometrist"', '"amenity"="optometrist"', '"healthcare:speciality"="ophthalmology"'],
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
    optometry:        ['CES6562140001'],  // Offices of optometrists
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

  // Demo mode (showcase) — short-circuit. Pre-seeded cache will return
  // the cards that should appear; we don't want CORS/network failures
  // for unseeded endpoints spamming the console.
  const isDemo = !!run._demoMode
    || (typeof demoMode !== 'undefined' && demoMode);

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

  // Medical/optometry: NPPES competitor data
  if (industry === 'medical_practice' || industry === 'optometry' || industry === 'urgent_care') {
    try {
      const nppes = await v2FetchOpenFDAFacilities(zip, 'physician');
      if (nppes && nppes.length > 0) {
        await v2RenderNPPESCard(zip);
        activeSources.push('CMS NPPES Registry');
      }
    } catch {}
  }

  // ── NEW APIs ──────────────────────────────────────────────────────────────

  // 1. Census ZIP Business Patterns — real establishment counts
  try {
    const zbp = await v2FetchZBP(zip, industry);
    if (zbp) {
      v2RenderZBPCard(zbp, industry);
      activeSources.push('Census Business Patterns');
    }
  } catch {}

  // 2. Open-Meteo climate — for revenue-seasonal industries
  if (_CLIMATE_RELEVANT.has(industry)) {
    try {
      let lat = V2.wizard?.data?._lat || run._lat;
      let lng = V2.wizard?.data?._lng || run._lng;
      if (!lat || !lng) {
        const c = await v2GetZIPCentroid(zip);
        if (c) { lat = c.lat; lng = c.lng; }
      }
      if (lat && lng) {
        const climate = await v2FetchClimate(lat, lng);
        if (climate) {
          v2RenderClimateCard(climate, industry);
          activeSources.push('Open-Meteo Climate');
        }
      }
    } catch {}
  }

  // 3. CDC PLACES — health/insurance data for healthcare industries
  if (_CDC_RELEVANT.has(industry)) {
    try {
      const city     = V2.wizard?.data?.city  || run.city  || '';
      const stateAbbr = V2.wizard?.data?.state || run.state || '';
      if (city && stateAbbr) {
        const cdc = await v2FetchCDCPlaces(city, stateAbbr);
        if (cdc) {
          v2RenderCDCCard(cdc);
          activeSources.push('CDC PLACES');
        }
      }
    } catch {}
  }

  // 4. SBA loan data — lender appetite validation
  try {
    const sba = await v2FetchSBALoans(zip, industry);
    if (sba) {
      v2RenderSBACard(sba, industry, zip);
      activeSources.push('SBA Loan Data');
    }
  } catch {}

  // 5. EPA Envirofacts — environmental risk for relevant industries
  if (_EPA_RELEVANT.has(industry)) {
    try {
      const epa = await v2FetchEPAEnvironmental(zip);
      if (epa) {
        v2RenderEPACard(epa, zip);
        activeSources.push('EPA Envirofacts');
      }
    } catch {}
  }

  // 6. USAspending — federal grants placed in target ZIP
  try {
    const spend = await v2FetchUSAspending(zip);
    if (spend) {
      v2RenderUSAspendingCard(spend, zip);
      activeSources.push('USAspending.gov');
    }
  } catch {}

  // 7. SEC EDGAR — public chain competitor filings
  try {
    const chains = await v2FetchSECChains(industry);
    if (chains) {
      v2RenderSECCard(chains, industry);
      activeSources.push('SEC EDGAR');
    }
  } catch {}

  // 8. World Bank — US macro indicators (runs once per session, cached)
  try {
    const macro = await v2FetchWorldBankMacro();
    if (macro) {
      v2RenderWorldBankCard(macro);
      activeSources.push('World Bank');
    }
  } catch {}

  // 9. EIA Energy — commercial electricity rate for this state
  if (_EIA_RELEVANT.has(industry)) {
    try {
      const stateAbbr = V2.wizard?.data?.state || run.state || '';
      if (stateAbbr) {
        const eia = await v2FetchEIAEnergy(stateAbbr);
        if (eia) {
          v2RenderEIACard(eia, industry);
          activeSources.push('EIA (Energy)');
        }
      }
    } catch {}
  }

  // 10. Overpass POI density — foot traffic anchors near site
  try {
    let lat = V2.wizard?.data?._lat || run._lat;
    let lng = V2.wizard?.data?._lng || run._lng;
    if (!lat || !lng) {
      const centroid = await v2GetZIPCentroid(zip);
      if (centroid) { lat = centroid.lat; lng = centroid.lng; }
    }
    if (lat && lng) {
      const radius = Math.min(parseFloat(run.radius || V2.wizard?.data?.radius || '3'), 3);
      const pois = await v2FetchNearbyPOIs(lat, lng, radius);
      if (pois) {
        v2RenderPOIDensityCard(pois, industry, zip);
        activeSources.push('OSM POI Density');
      }
    }
  } catch {}

  // Render badge showing active sources
  if (activeSources.length > 0) v2RenderFreeAPIBadge(activeSources);
}

// ══════════════════════════════════════════════════════════════════════════════
// NEW ENRICHMENT APIS (no key required)
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. CENSUS ZIP BUSINESS PATTERNS ──────────────────────────────────────────
// NAICS codes by industry — used to query establishment counts in a ZIP
const _ZBP_NAICS = {
  daycare:          '624410',
  gas_station:      '447110',
  laundromat:       '812310',
  car_wash:         '811192',
  restaurant:       '722511',
  gym:              '713940',
  indoor_play:      '713990',
  dry_cleaning:     '812320',
  senior_care:      '623110',
  tutoring:         '611691',
  urgent_care:      '621111',
  medical_practice: '621111',
  coffee_shop:      '722515',
  barbershop:       '812111',
  coworking:        '531120',
  optometry:        '621320',
};

async function v2FetchZBP(zip, industry) {
  const naics = _ZBP_NAICS[industry];
  if (!naics || !zip) return null;
  const cacheKey = `zbp:${zip}:${naics}`;
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;
  // Skip live fetch in demo mode — keeps console clean and avoids CORS
  // failures on hosted preview / local dev where Census endpoints may be blocked
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  try {
    const url = `https://api.census.gov/data/2021/zbp?get=ESTAB,EMP,PAYANN&for=zipcode:${zip}&NAICS2017=${naics}`;
    const r = await fetch(url, { signal: _abortTimeoutSig(6000) });
    if (!r.ok) throw new Error('ZBP HTTP ' + r.status);
    const rows = await r.json();
    // rows[0] = headers, rows[1] = data
    if (!rows || rows.length < 2) return null;
    const [headers, values] = rows;
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    const result = {
      establishments: parseInt(obj.ESTAB) || 0,
      employees:      parseInt(obj.EMP)   || 0,
      payroll_k:      parseInt(obj.PAYANN)|| 0,
      naics,
      zip,
    };
    _freeApiCache(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] ZBP failed:', e.message);
    return null;
  }
}

// ── 2. IPINFO.IO — AUTO-DETECT USER LOCATION ──────────────────────────────────
async function v2DetectUserLocation() {
  const cacheKey = 'ipinfo:location';
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;
  try {
    const r = await fetch('https://ipinfo.io/json', { signal: _abortTimeoutSig(3000) });
    if (!r.ok) throw new Error();
    const d = await r.json();
    const [lat, lng] = (d.loc || '').split(',').map(Number);
    const result = {
      city:    d.city    || '',
      region:  d.region  || '',
      zip:     d.postal  || '',
      country: d.country || '',
      lat, lng,
    };
    _freeApiCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// ── 3. OPEN-METEO — CLIMATE / SEASONALITY DATA ────────────────────────────────
async function v2FetchClimate(lat, lng) {
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  if (!lat || !lng) return null;
  const key = `climate:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = _freeApiCache(key);
  if (cached) return cached;
  try {
    const url = `https://climate-api.open-meteo.com/v1/climate?latitude=${lat}&longitude=${lng}`
      + `&start_date=2000-01-01&end_date=2019-12-31`
      + `&monthly=temperature_2m_mean,precipitation_sum`
      + `&models=MRI_AGCM3_2_S`;
    const r = await fetch(url, { signal: _abortTimeoutSig(8000) });
    if (!r.ok) throw new Error('climate HTTP ' + r.status);
    const d = await r.json();
    // monthly arrays — 12 values averaged across the time range
    const temps  = d.monthly?.temperature_2m_mean || [];
    const precip = d.monthly?.precipitation_sum   || [];
    // Compute season summary
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const months = monthNames.map((name, i) => ({
      name,
      temp_c:  temps[i]  ?? null,
      temp_f:  temps[i]  != null ? Math.round(temps[i] * 9/5 + 32) : null,
      precip:  precip[i] ?? null,
    }));
    const avgTemp   = temps.length  ? (temps.reduce((a,b)=>a+b,0) / temps.length).toFixed(1)  : null;
    const totalPrec = precip.length ? precip.reduce((a,b)=>a+b,0).toFixed(0)                  : null;
    const peakWet   = precip.length ? monthNames[precip.indexOf(Math.max(...precip))]          : null;
    const result = { months, avgTemp_c: avgTemp, totalPrecip_mm: totalPrec, peakWetMonth: peakWet };
    _freeApiCache(key, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] Open-Meteo failed:', e.message);
    return null;
  }
}

// Industries where climate materially affects revenue / operations
const _CLIMATE_RELEVANT = new Set([
  'car_wash','gas_station','restaurant','coffee_shop','gym','laundromat',
]);

// ── 4. CDC PLACES — LOCAL HEALTH / INSURANCE DATA ────────────────────────────
async function v2FetchCDCPlaces(city, stateAbbr) {
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  if (!city || !stateAbbr) return null;
  const key = `cdc:${stateAbbr}:${city.toLowerCase()}`;
  const cached = _freeApiCache(key);
  if (cached) return cached;
  try {
    const enc = encodeURIComponent(city);
    const url = `https://chronicdata.cdc.gov/resource/cwsq-ngmh.json`
      + `?StateAbbr=${stateAbbr}&PlaceName=${enc}&$limit=200`;
    const r = await fetch(url, { signal: _abortTimeoutSig(7000) });
    if (!r.ok) throw new Error('CDC HTTP ' + r.status);
    const rows = await r.json();
    if (!rows || rows.length === 0) return null;
    // Extract key measures — insurance, diabetes, obesity, physical inactivity
    const pick = (measure) => {
      const row = rows.find(r => r.measureid === measure && r.datavaluetypeid === 'CrdPrv');
      return row ? parseFloat(row.data_value) : null;
    };
    const result = {
      no_insurance_pct:      pick('ACCESS2'),   // % adults without health insurance
      diabetes_pct:          pick('DIABETES'),
      obesity_pct:           pick('OBESITY'),
      physical_inactivity:   pick('LPA'),
      checkup_pct:           pick('CHECKUP'),   // % had routine checkup past year
      city, stateAbbr,
    };
    _freeApiCache(key, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] CDC PLACES failed:', e.message);
    return null;
  }
}

const _CDC_RELEVANT = new Set([
  'medical_practice','urgent_care','optometry','gym','senior_care',
]);

// ── 5. SBA LOAN DATA ─────────────────────────────────────────────────────────
// Uses SBA FOIA 7(a) public dataset (2010-present). Queries by ZIP prefix.
const _SBA_NAICS = _ZBP_NAICS; // same codes work

async function v2FetchSBALoans(zip, industry) {
  if (!zip || !industry) return null;
  const naics = _SBA_NAICS[industry];
  if (!naics) return null;
  const key = `sba:${zip}:${naics}`;
  const cached = _freeApiCache(key);
  if (cached) return cached;
  // Skip live fetch in demo mode
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  try {
    // SBA CKAN API — 7(a) loans FOIA dataset
    const url = `https://data.sba.gov/api/3/action/datastore_search_sql?sql=`
      + encodeURIComponent(
          `SELECT "BorrZip","GrossApproval","JobsSupported","ApprovalDate","BorrName" `
          + `FROM "9e5c3673-30c1-4f9c-a3ef-5abf12f4f6e8" `
          + `WHERE "BorrZip" LIKE '${zip.slice(0,3)}%' AND "NAICSCode" LIKE '${naics.slice(0,4)}%' `
          + `ORDER BY "ApprovalDate" DESC LIMIT 20`
        );
    const r = await fetch(url, { signal: _abortTimeoutSig(8000) });
    if (!r.ok) throw new Error('SBA HTTP ' + r.status);
    const d = await r.json();
    const records = d?.result?.records || [];
    if (!records.length) return null;
    const totalAmount = records.reduce((s, row) => s + (parseFloat(row.GrossApproval)||0), 0);
    const avgAmount   = totalAmount / records.length;
    const result = {
      count:        records.length,
      total_amount: totalAmount,
      avg_amount:   avgAmount,
      recent:       records.slice(0, 5),
      naics,
    };
    _freeApiCache(key, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] SBA loans failed:', e.message);
    return null;
  }
}

// ── 6. EPA ENVIROFACTS — ENVIRONMENTAL RISK ───────────────────────────────────
const _EPA_RELEVANT = new Set(['gas_station','dry_cleaning','laundromat','car_wash','medical_practice','urgent_care','optometry']);

async function v2FetchEPAEnvironmental(zip) {
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  if (!zip) return null;
  const key = `epa:${zip}`;
  const cached = _freeApiCache(key);
  if (cached) return cached;
  try {
    // TRI (Toxic Release Inventory) facilities by ZIP
    const url = `https://data.epa.gov/efservice/tri_facility/zip_code/${zip}/json`;
    const r = await fetch(url, { signal: _abortTimeoutSig(6000) });
    if (!r.ok) throw new Error('EPA HTTP ' + r.status);
    const facilities = await r.json();
    if (!Array.isArray(facilities)) return null;
    const result = {
      tri_count:    facilities.length,
      facilities:   facilities.slice(0, 8).map(f => ({
        name:     f.FACILITY_NAME || f.FRS_FACILITY_ID,
        address:  [f.STREET_ADDRESS, f.CITY_NAME, f.STATE_ABBR].filter(Boolean).join(', '),
        industry: f.INDUSTRY_SECTOR_CODE,
      })),
    };
    _freeApiCache(key, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] EPA Envirofacts failed:', e.message);
    return null;
  }
}

// ── RENDER: ZBP Market Saturation Card ───────────────────────────────────────
function v2RenderZBPCard(zbp, industry) {
  const existing = document.getElementById('v2-zbp-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-competition');
  if (!panel || !zbp) return;

  const indLabel = (typeof V2_INDUSTRIES !== 'undefined' ? V2_INDUSTRIES : [])
    .find(i => i.val === industry)?.label || industry;
  const avgSalary = zbp.employees && zbp.payroll_k
    ? '$' + Math.round((zbp.payroll_k * 1000) / zbp.employees).toLocaleString()
    : '—';
  const satColor = zbp.establishments <= 3 ? 'var(--v2-green)' : zbp.establishments <= 8 ? 'var(--v2-amber)' : 'var(--v2-red)';
  const satLabel = zbp.establishments <= 3 ? 'Low saturation' : zbp.establishments <= 8 ? 'Moderate saturation' : 'High saturation';

  const card = document.createElement('div');
  card.id = 'v2-zbp-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">🏛️ Census Business Patterns — ${indLabel} in ZIP ${zbp.zip}</div>
      <div style="font-size:10px;color:var(--v2-t3)">US Census ZBP 2021 · NAICS ${zbp.naics}</div>
    </div>
    <div class="v2-kpi-grid">
      <div class="v2-kpi">
        <div class="v2-kpi-ico">🏢</div>
        <div class="v2-kpi-val" style="color:${satColor}">${zbp.establishments}</div>
        <div class="v2-kpi-lbl">Registered Establishments</div>
      </div>
      <div class="v2-kpi">
        <div class="v2-kpi-ico">👷</div>
        <div class="v2-kpi-val">${zbp.employees > 0 ? zbp.employees.toLocaleString() : '< 5'}</div>
        <div class="v2-kpi-lbl">Employees in ZIP</div>
      </div>
      <div class="v2-kpi">
        <div class="v2-kpi-ico">💵</div>
        <div class="v2-kpi-val">${avgSalary}</div>
        <div class="v2-kpi-lbl">Avg Annual Wage</div>
      </div>
    </div>
    <div style="margin-top:10px;padding:8px 12px;background:var(--v2-s3);border-radius:8px;font-size:12px;display:flex;align-items:center;gap:8px">
      <span style="color:${satColor};font-size:16px">●</span>
      <span><strong>${satLabel}</strong> — ${zbp.establishments} ${indLabel.toLowerCase()} establishments registered in this ZIP per IRS/Census data</span>
    </div>
    <div style="font-size:10px;color:var(--v2-t3);margin-top:8px">
      Source: US Census Bureau ZIP Code Business Patterns · 2021 Annual Survey · Government-verified establishment counts
    </div>`;
  panel.insertBefore(card, panel.firstChild);
}

// ── RENDER: Climate Seasonality Card ─────────────────────────────────────────
function v2RenderClimateCard(climate, industry) {
  const existing = document.getElementById('v2-climate-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-financials');
  if (!panel || !climate) return;

  const { months, avgTemp_c, totalPrecip_mm, peakWetMonth } = climate;
  const avgTempF = avgTemp_c != null ? Math.round(+avgTemp_c * 9/5 + 32) : '—';

  // Revenue impact message by industry
  const impactMap = {
    car_wash:    `Car washes lose ~30–40% revenue in peak rain months. Peak wet month (${peakWetMonth}) may reduce throughput.`,
    gas_station: `Fuel volume drops ~15% in extreme cold months. Plan for seasonal C-store revenue offsets.`,
    restaurant:  `Outdoor dining viable during mild months. Peak precipitation (${peakWetMonth}) affects patio covers.`,
    coffee_shop: `Hot beverage demand spikes in cold months — plan inventory and staffing accordingly.`,
    gym:         `Gym sign-ups peak in January and drop mid-summer. Budget for 20–30% revenue seasonality.`,
    laundromat:  `Wet months drive 10–15% higher laundromat traffic. Plan utility costs accordingly.`,
  };
  const impact = impactMap[industry] || 'Factor seasonal patterns into monthly revenue projections.';

  // Simple bar chart using CSS widths
  const maxPrec = Math.max(...months.map(m => m.precip || 0), 1);
  const bars = months.map(m => {
    const w = m.precip != null ? Math.round((m.precip / maxPrec) * 100) : 0;
    const tempStr = m.temp_f != null ? `${m.temp_f}°F` : '—';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:9px;color:var(--v2-t3)">
      <div style="width:100%;height:${Math.max(w*0.5,2)}px;background:rgba(99,102,241,0.5);border-radius:2px 2px 0 0;min-height:2px"></div>
      <div>${m.name}</div><div style="color:var(--v2-t2)">${tempStr}</div>
    </div>`;
  }).join('');

  const card = document.createElement('div');
  card.id = 'v2-climate-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">🌤️ Climate &amp; Seasonality — 20-Year Average</div>
      <div style="font-size:10px;color:var(--v2-t3)">Open-Meteo · Historical Climate API</div>
    </div>
    <div class="v2-kpi-grid" style="margin-bottom:14px">
      <div class="v2-kpi"><div class="v2-kpi-ico">🌡️</div><div class="v2-kpi-val">${avgTempF}°F</div><div class="v2-kpi-lbl">Mean Annual Temp</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">🌧️</div><div class="v2-kpi-val">${totalPrecip_mm ? Math.round(+totalPrecip_mm/25.4)+'"' : '—'}</div><div class="v2-kpi-lbl">Annual Rainfall</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">☔</div><div class="v2-kpi-val">${peakWetMonth || '—'}</div><div class="v2-kpi-lbl">Wettest Month</div></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:2px;height:60px;margin-bottom:4px">${bars}</div>
    <div style="font-size:11px;color:var(--v2-t2);margin-top:10px;padding:8px 12px;background:var(--v2-s3);border-radius:8px">
      💡 <strong>Revenue Impact:</strong> ${impact}
    </div>`;
  panel.appendChild(card);
}

// ── RENDER: CDC PLACES Health Data Card ──────────────────────────────────────
function v2RenderCDCCard(cdc) {
  const existing = document.getElementById('v2-cdc-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-market');
  if (!panel || !cdc) return;

  const fmt = v => v != null ? v.toFixed(1) + '%' : '—';
  const insuredPct = cdc.no_insurance_pct != null ? (100 - cdc.no_insurance_pct).toFixed(1) + '%' : '—';
  const insColor = cdc.no_insurance_pct != null
    ? (cdc.no_insurance_pct < 10 ? 'var(--v2-green)' : cdc.no_insurance_pct < 20 ? 'var(--v2-amber)' : 'var(--v2-red)')
    : 'var(--v2-t2)';

  const card = document.createElement('div');
  card.id = 'v2-cdc-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">🏥 CDC PLACES — Local Health Indicators · ${cdc.city}, ${cdc.stateAbbr}</div>
      <div style="font-size:10px;color:var(--v2-t3)">CDC PLACES 2023 · Socrata API</div>
    </div>
    <div class="v2-kpi-grid">
      <div class="v2-kpi">
        <div class="v2-kpi-ico">🛡️</div>
        <div class="v2-kpi-val" style="color:${insColor}">${insuredPct}</div>
        <div class="v2-kpi-lbl">Population Insured</div>
      </div>
      ${cdc.diabetes_pct != null ? `<div class="v2-kpi"><div class="v2-kpi-ico">🩸</div><div class="v2-kpi-val">${fmt(cdc.diabetes_pct)}</div><div class="v2-kpi-lbl">Diabetes Prevalence</div></div>` : ''}
      ${cdc.obesity_pct != null ? `<div class="v2-kpi"><div class="v2-kpi-ico">⚖️</div><div class="v2-kpi-val">${fmt(cdc.obesity_pct)}</div><div class="v2-kpi-lbl">Obesity Rate</div></div>` : ''}
      ${cdc.checkup_pct != null ? `<div class="v2-kpi"><div class="v2-kpi-ico">📋</div><div class="v2-kpi-val">${fmt(cdc.checkup_pct)}</div><div class="v2-kpi-lbl">Annual Checkup Rate</div></div>` : ''}
    </div>
    <div style="font-size:10px;color:var(--v2-t3);margin-top:8px">
      Source: CDC PLACES Local Health Data · city-level chronic disease and prevention indicators
    </div>`;
  panel.appendChild(card);
}

// ── RENDER: SBA Loan Activity Card ────────────────────────────────────────────
function v2RenderSBACard(sba, industry, zip) {
  const existing = document.getElementById('v2-sba-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-financials');
  if (!panel || !sba) return;

  const fmtM = n => n >= 1000000 ? '$' + (n/1000000).toFixed(1) + 'M' : '$' + Math.round(n/1000) + 'K';
  const indLabel = (typeof V2_INDUSTRIES !== 'undefined' ? V2_INDUSTRIES : [])
    .find(i => i.val === industry)?.label || industry;

  const recentRows = (sba.recent || []).map(r => `
    <div style="display:flex;justify-content:space-between;padding:7px 10px;background:var(--v2-s3);border-radius:7px;font-size:11px">
      <span style="color:var(--v2-t1);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.BorrName || '—'}</span>
      <span style="color:var(--v2-green);font-weight:600;margin-left:10px;flex-shrink:0">${fmtM(parseFloat(r.GrossApproval)||0)}</span>
    </div>`).join('');

  const card = document.createElement('div');
  card.id = 'v2-sba-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">💼 SBA 7(a) Loan Activity — ${indLabel} near ZIP ${zip}</div>
      <div style="font-size:10px;color:var(--v2-t3)">SBA FOIA Public Data · NAICS ${sba.naics}</div>
    </div>
    <div class="v2-kpi-grid" style="margin-bottom:14px">
      <div class="v2-kpi"><div class="v2-kpi-ico">✅</div><div class="v2-kpi-val">${sba.count}</div><div class="v2-kpi-lbl">Recent Loans Found</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">💰</div><div class="v2-kpi-val">${fmtM(sba.avg_amount)}</div><div class="v2-kpi-lbl">Avg Loan Amount</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">📊</div><div class="v2-kpi-val">${fmtM(sba.total_amount)}</div><div class="v2-kpi-lbl">Total Capital Deployed</div></div>
    </div>
    ${recentRows ? `<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">${recentRows}</div>` : ''}
    <div style="font-size:10px;color:var(--v2-t3)">
      Lender appetite indicator — banks in this area have funded ${sba.count} ${indLabel.toLowerCase()} businesses. Strong signal for SBA loan eligibility.
    </div>`;
  panel.appendChild(card);
}

// ── RENDER: EPA Environmental Risk Card ───────────────────────────────────────
function v2RenderEPACard(epa, zip) {
  const existing = document.getElementById('v2-epa-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-risks');
  if (!panel || !epa) return;

  const riskColor = epa.tri_count === 0 ? 'var(--v2-green)' : epa.tri_count <= 3 ? 'var(--v2-amber)' : 'var(--v2-red)';
  const riskLabel = epa.tri_count === 0 ? 'No TRI sites detected — low environmental risk'
    : epa.tri_count <= 3 ? `${epa.tri_count} TRI site(s) — moderate risk, investigate before leasing`
    : `${epa.tri_count} TRI sites — elevated risk, obtain Phase I ESA before committing`;

  const facilityRows = (epa.facilities || []).map(f => `
    <div style="padding:7px 10px;background:var(--v2-s3);border-radius:7px;font-size:11px">
      <div style="font-weight:600;color:var(--v2-t1)">${f.name}</div>
      <div style="color:var(--v2-t3);margin-top:1px">${f.address}</div>
    </div>`).join('');

  const card = document.createElement('div');
  card.id = 'v2-epa-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">⚠️ EPA Envirofacts — Environmental Risk · ZIP ${zip}</div>
      <div style="font-size:10px;color:var(--v2-t3)">EPA TRI Database · No key required</div>
    </div>
    <div style="padding:10px 14px;background:var(--v2-s3);border-radius:8px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
      <span style="color:${riskColor};font-size:20px">●</span>
      <span style="font-size:13px;color:var(--v2-t1)">${riskLabel}</span>
    </div>
    ${facilityRows ? `<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">${facilityRows}</div>` : ''}
    <div style="font-size:10px;color:var(--v2-t3)">
      TRI = EPA Toxic Release Inventory · Covers industrial facilities that release toxic chemicals · Relevant for gas stations (UST leaks), dry cleaners (PERC), and medical waste generators.
    </div>`;
  panel.appendChild(card);
}

// ══════════════════════════════════════════════════════════════════════════════
// BATCH 2 — USAspending · SEC EDGAR · World Bank
// ══════════════════════════════════════════════════════════════════════════════

// ── USASPENDING — Federal Grants by ZIP ───────────────────────────────────────
async function v2FetchUSAspending(zip) {
  if (!zip) return null;
  const key = `usaspend:${zip}`;
  const cached = _freeApiCache(key);
  if (cached) return cached;
  // Skip live fetch in demo mode
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  try {
    const r = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: _abortTimeoutSig(10000),
      body: JSON.stringify({
        filters: {
          award_type_codes: ['02', '03', '04', '05'],   // grants & cooperative agreements
          place_of_performance_zip5: zip,
        },
        fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Award Type', 'Description', 'Start Date'],
        limit: 10,
        page: 1,
        sort: 'Award Amount',
        order: 'desc',
      }),
    });
    if (!r.ok) throw new Error('USAspending HTTP ' + r.status);
    const d = await r.json();
    const results = d.results || [];
    if (!results.length) return null;
    const totalAmount = results.reduce((s, a) => s + (parseFloat(a['Award Amount']) || 0), 0);
    const byAgency = {};
    results.forEach(a => {
      const ag = a['Awarding Agency'] || 'Unknown';
      byAgency[ag] = (byAgency[ag] || 0) + (parseFloat(a['Award Amount']) || 0);
    });
    const topAgencies = Object.entries(byAgency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, amt]) => ({ name, amt }));
    const result = { count: results.length, total: totalAmount, topAgencies, recent: results.slice(0, 6), zip };
    _freeApiCache(key, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] USAspending failed:', e.message);
    return null;
  }
}

function v2RenderUSAspendingCard(data, zip) {
  const existing = document.getElementById('v2-usaspend-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-grants');
  if (!panel || !data) return;

  const fmtM = n => n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + 'B'
                  : n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M'
                  : '$' + Math.round(n / 1000) + 'K';

  const agencyRows = data.topAgencies.map(a => `
    <div style="display:flex;justify-content:space-between;padding:6px 10px;background:var(--v2-s3);border-radius:7px;font-size:11px">
      <span style="color:var(--v2-t2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.name}</span>
      <span style="color:var(--v2-green);font-weight:600;margin-left:8px;flex-shrink:0">${fmtM(a.amt)}</span>
    </div>`).join('');

  const recentRows = data.recent.map(a => `
    <div style="padding:8px 10px;background:var(--v2-s3);border-radius:8px;font-size:11px;margin-bottom:4px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="color:var(--v2-t1);font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a['Recipient Name'] || '—'}</span>
        <span style="color:var(--v2-green);font-weight:700;margin-left:8px;flex-shrink:0">${fmtM(parseFloat(a['Award Amount']) || 0)}</span>
      </div>
      <div style="color:var(--v2-t3);margin-top:2px">${a['Awarding Agency'] || ''} · ${a['Award Type'] || ''} · ${(a['Start Date'] || '').slice(0, 7)}</div>
      ${a['Description'] ? `<div style="color:var(--v2-t3);margin-top:2px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a['Description'].slice(0,100)}</div>` : ''}
    </div>`).join('');

  const card = document.createElement('div');
  card.id = 'v2-usaspend-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">🏛️ USAspending.gov — Federal Grants · ZIP ${zip}</div>
      <div style="font-size:10px;color:var(--v2-t3)">US Treasury open data · No key</div>
    </div>
    <div class="v2-kpi-grid" style="margin-bottom:14px">
      <div class="v2-kpi"><div class="v2-kpi-ico">📋</div><div class="v2-kpi-val">${data.count}+</div><div class="v2-kpi-lbl">Recent Awards Found</div></div>
      <div class="v2-kpi"><div class="v2-kpi-ico">💰</div><div class="v2-kpi-val">${fmtM(data.total)}</div><div class="v2-kpi-lbl">Total Federal Dollars</div></div>
    </div>
    ${data.topAgencies.length ? `
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--v2-t3);margin-bottom:6px">Top Funding Agencies</div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:14px">${agencyRows}</div>` : ''}
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--v2-t3);margin-bottom:6px">Recent Awards</div>
    ${recentRows}
    <div style="font-size:10px;color:var(--v2-t3);margin-top:8px">
      Grants &amp; cooperative agreements placed in ZIP ${zip} · Source: USAspending.gov FOIA data · Awards shown are in your target area, not industry-filtered
    </div>`;
  panel.insertBefore(card, panel.firstChild);
}

// ── SEC EDGAR — Public Chain Competitor Filings ───────────────────────────────
// CIKs are zero-padded 10-digit strings as EDGAR expects
const _SEC_CHAINS = {
  daycare:          [{ name: 'Bright Horizons Family Solutions', cik: '0001097362' }],
  gas_station:      [{ name: 'Murphy USA Inc',                   cik: '0001573516' },
                     { name: 'Sunoco LP',                         cik: '0001373670' }],
  car_wash:         [{ name: 'Mister Car Wash Inc',              cik: '0001801170' }],
  restaurant:       [{ name: "McDonald's Corporation",           cik: '0000063908' },
                     { name: 'Darden Restaurants Inc',           cik: '0000940944' },
                     { name: 'Yum! Brands Inc',                  cik: '0001041514' }],
  gym:              [{ name: 'Planet Fitness Inc',               cik: '0001616862' },
                     { name: 'Life Time Group Holdings',         cik: '0001822844' }],
  indoor_play:      [{ name: 'Bowlero Corp',                     cik: '0001805928' }],
  senior_care:      [{ name: 'Brookdale Senior Living Inc',      cik: '0001332349' }],
  tutoring:         [{ name: 'Stride Inc',                       cik: '0001157408' }],
  coffee_shop:      [{ name: 'Starbucks Corporation',            cik: '0000829224' },
                     { name: 'Dutch Bros Inc',                    cik: '0001819989' }],
  coworking:        [{ name: 'WeWork Inc',                       cik: '0001813756' }],
  optometry:        [{ name: 'National Vision Holdings Inc',     cik: '0001699709' }],
  medical_practice: [{ name: 'Privia Health Group Inc',          cik: '0001737901' }],
  urgent_care:      [{ name: 'Acadia Healthcare Co Inc',         cik: '0001520597' }],
};

async function v2FetchSECChains(industry) {
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  const chains = _SEC_CHAINS[industry];
  if (!chains || !chains.length) return null;
  const key = `sec:${industry}`;
  const cached = _freeApiCache(key);
  if (cached) return cached;

  const results = await Promise.allSettled(chains.map(async chain => {
    const url = `https://data.sec.gov/submissions/CIK${chain.cik}.json`;
    const r = await fetch(url, {
      signal: _abortTimeoutSig(8000),
      headers: { 'User-Agent': 'BusinessHunterApp/2.0 contact@businesshunter.app' },
    });
    if (!r.ok) throw new Error('SEC HTTP ' + r.status);
    const d = await r.json();
    // Get most recent 10-K filing date
    const forms   = d.filings?.recent?.form      || [];
    const dates   = d.filings?.recent?.filingDate || [];
    const idx10K  = forms.findIndex(f => f === '10-K');
    const last10K = idx10K >= 0 ? dates[idx10K] : null;
    return {
      name:       d.name,
      cik:        chain.cik,
      sic:        d.sic,
      sicDesc:    d.sicDescription,
      employees:  d.employees || null,
      stateInc:   d.stateOfIncorporation,
      last10K,
      website:    d.website || null,
    };
  }));

  const data = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(Boolean);

  if (!data.length) return null;
  _freeApiCache(key, data);
  return data;
}

function v2RenderSECCard(chains, industry) {
  const existing = document.getElementById('v2-sec-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-competition');
  if (!panel || !chains || !chains.length) return;

  const indLabel = (typeof V2_INDUSTRIES !== 'undefined' ? V2_INDUSTRIES : [])
    .find(i => i.val === industry)?.label || industry;

  const rows = chains.map(c => {
    const empStr = c.employees ? c.employees.toLocaleString() + ' employees' : 'employees N/A';
    const filedStr = c.last10K ? 'Last 10-K: ' + c.last10K : '';
    return `
      <div style="padding:12px 14px;background:var(--v2-s3);border-radius:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px">
          <div>
            <div style="font-weight:600;color:var(--v2-t1);font-size:13px">${c.name}</div>
            <div style="font-size:11px;color:var(--v2-t3);margin-top:2px">${c.sicDesc || ''} · SIC ${c.sic || '—'}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:12px;color:var(--v2-a1);font-weight:600">${empStr}</div>
            <div style="font-size:10px;color:var(--v2-t3)">${filedStr}</div>
          </div>
        </div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${c.cik}&type=10-K&dateb=&owner=include&count=5"
             target="_blank" rel="noopener"
             style="font-size:10px;color:var(--v2-a1);text-decoration:none;padding:3px 8px;border:1px solid var(--v2-a1);border-radius:4px">
            📄 SEC Filings
          </a>
          ${c.website ? `<a href="${c.website}" target="_blank" rel="noopener" style="font-size:10px;color:var(--v2-t3);text-decoration:none;padding:3px 8px;border:1px solid var(--v2-s5,#334155);border-radius:4px">🌐 Website</a>` : ''}
        </div>
      </div>`;
  }).join('');

  const card = document.createElement('div');
  card.id = 'v2-sec-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">📈 SEC EDGAR — Public Chain Competitors · ${indLabel}</div>
      <div style="font-size:10px;color:var(--v2-t3)">SEC EDGAR · 10-K filings · No key</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px">${rows}</div>
    <div style="font-size:10px;color:var(--v2-t3)">
      Data from SEC EDGAR public submissions · Employee counts and SIC codes from most recent annual filing · Click "SEC Filings" to read 10-K reports
    </div>`;
  panel.appendChild(card);
}

// ── WORLD BANK — US Macro Indicators ─────────────────────────────────────────
const _WB_INDICATORS = [
  { code: 'NY.GDP.MKTP.KD.ZG', label: 'GDP Growth',       unit: '%',  ico: '📊', good: v => v > 2 },
  { code: 'FP.CPI.TOTL.ZG',    label: 'CPI Inflation',    unit: '%',  ico: '💸', good: v => v < 3.5 },
  { code: 'SL.UEM.TOTL.ZS',    label: 'Unemployment',     unit: '%',  ico: '👷', good: v => v < 5 },
  { code: 'SL.EMP.SELF.ZS',    label: 'Self-Employment',  unit: '%',  ico: '🏪', good: () => true },
  { code: 'FR.INR.LEND',       label: 'Lending Rate',     unit: '%',  ico: '🏦', good: v => v < 8 },
];

async function v2FetchWorldBankMacro() {
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  const key = 'worldbank:us:macro';
  const cached = _freeApiCache(key);
  if (cached) return cached;
  try {
    const results = await Promise.allSettled(_WB_INDICATORS.map(async ind => {
      const url = `https://api.worldbank.org/v2/country/US/indicator/${ind.code}?format=json&mrv=3&per_page=3`;
      const r = await fetch(url, { signal: _abortTimeoutSig(8000) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const pts = (d[1] || []).filter(p => p.value != null);
      if (!pts.length) return null;
      return {
        ...ind,
        value:   parseFloat(pts[0].value.toFixed(2)),
        year:    pts[0].date,
        prev:    pts[1] ? parseFloat(pts[1].value.toFixed(2)) : null,
        prevYear: pts[1]?.date || null,
      };
    }));
    const data = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
    if (!data.length) return null;
    _freeApiCache(key, data);
    return data;
  } catch (e) {
    console.warn('[v2FreeAPI] World Bank failed:', e.message);
    return null;
  }
}

function v2RenderWorldBankCard(indicators) {
  const existing = document.getElementById('v2-worldbank-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-executive');
  if (!panel || !indicators || !indicators.length) return;

  const bullish = indicators.filter(i => i.good(i.value)).length;
  const total   = indicators.length;
  const sentiment = bullish >= 4 ? { label: 'Favorable', color: 'var(--v2-green)' }
                  : bullish >= 2 ? { label: 'Mixed',     color: 'var(--v2-amber)' }
                  :                { label: 'Cautious',   color: 'var(--v2-red)'   };

  const kpis = indicators.map(ind => {
    const delta    = ind.prev != null ? (ind.value - ind.prev).toFixed(2) : null;
    const positive = delta > 0;
    const isGood   = ind.good(ind.value);
    const valColor = isGood ? 'var(--v2-green)' : 'var(--v2-amber)';
    return `
      <div class="v2-kpi">
        <div class="v2-kpi-ico">${ind.ico}</div>
        <div class="v2-kpi-val" style="color:${valColor}">${ind.value}${ind.unit}</div>
        <div class="v2-kpi-lbl">${ind.label} (${ind.year})</div>
        ${delta != null ? `<div style="font-size:10px;color:${positive ? 'var(--v2-green)' : 'var(--v2-red)'}">${positive ? '▲' : '▼'} ${Math.abs(delta)}${ind.unit} vs ${ind.prevYear}</div>` : ''}
      </div>`;
  }).join('');

  const card = document.createElement('div');
  card.id = 'v2-worldbank-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">🌐 World Bank — US Macro Environment</div>
      <div style="font-size:10px;color:var(--v2-t3)">World Bank Open Data · No key</div>
    </div>
    <div style="padding:8px 14px;border-radius:8px;margin-bottom:14px;display:inline-flex;align-items:center;gap:8px;background:var(--v2-s3)">
      <span style="color:${sentiment.color};font-size:16px">●</span>
      <span style="font-size:13px;font-weight:600;color:${sentiment.color}">${sentiment.label} macro environment</span>
      <span style="font-size:11px;color:var(--v2-t3)">${bullish}/${total} indicators positive</span>
    </div>
    <div class="v2-kpi-grid">${kpis}</div>
    <div style="font-size:10px;color:var(--v2-t3);margin-top:10px">
      Source: World Bank Open Data · US national indicators · Influences cost of capital, labor availability, and consumer spending capacity
    </div>`;
  panel.insertBefore(card, panel.firstChild);
}

// ── 9. EIA ENERGY — Commercial Electricity Prices by State ───────────────────
/**
 * Fetches commercial electricity price (cents/kWh) for a US state from EIA.
 * Uses EIA's published DEMO_KEY — no signup required for basic queries.
 * Returns { price_cents_kwh, state, period, residential, commercial }
 */
async function v2FetchEIAEnergy(stateAbbr) {
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  if (!stateAbbr || stateAbbr.length !== 2) return null;
  const cacheKey = `eia:${stateAbbr.toUpperCase()}`;
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;
  try {
    const st = stateAbbr.toUpperCase();
    // Fetch commercial + residential in parallel
    const [comRes, resRes] = await Promise.all([
      fetch(`https://api.eia.gov/v2/electricity/retail-sales/data?api_key=DEMO_KEY&facets[stateid][]=${st}&facets[sectorid][]=COM&frequency=annual&data[]=price&sort[0][column]=period&sort[0][direction]=desc&length=1`, { signal: _abortTimeoutSig(6000) }),
      fetch(`https://api.eia.gov/v2/electricity/retail-sales/data?api_key=DEMO_KEY&facets[stateid][]=${st}&facets[sectorid][]=RES&frequency=annual&data[]=price&sort[0][column]=period&sort[0][direction]=desc&length=1`, { signal: _abortTimeoutSig(6000) }),
    ]);
    if (!comRes.ok) return null;
    const comData = await comRes.json();
    const resData = resRes.ok ? await resRes.json() : null;

    const comRow = comData?.response?.data?.[0];
    const resRow = resData?.response?.data?.[0];
    if (!comRow) return null;

    const result = {
      state:              st,
      period:             comRow.period,
      commercial_cents:   parseFloat(comRow.price) || null,
      residential_cents:  resRow ? parseFloat(resRow.price) || null : null,
    };
    _freeApiCache(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] EIA energy fetch failed:', e.message);
    return null;
  }
}

// Industries where energy cost is a material operating expense
const _EIA_RELEVANT = new Set([
  'laundromat','car_wash','gym','restaurant','coffee_shop','gas_station',
  'indoor_play','dry_cleaning','coworking','urgent_care','medical_practice','optometry',
]);

function v2RenderEIACard(data, industry) {
  const existing = document.getElementById('v2-eia-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-financials');
  if (!panel || !data) return;

  const com = data.commercial_cents;
  const res = data.residential_cents;
  const comLabel = com != null ? `${com.toFixed(1)}¢/kWh` : '—';
  const resLabel = res != null ? `${res.toFixed(1)}¢/kWh` : '—';

  // Benchmark: US avg commercial ~11¢/kWh. Color-code by cost level.
  const US_AVG_COM = 11.0;
  const comColor = com == null ? 'var(--v2-t2)'
    : com < US_AVG_COM * 0.9  ? 'var(--v2-green)'
    : com > US_AVG_COM * 1.15 ? 'var(--v2-red)'
    : 'var(--v2-amber)';
  const comVsAvg = com != null
    ? (com < US_AVG_COM ? `${((1 - com/US_AVG_COM)*100).toFixed(0)}% below US avg` : `${((com/US_AVG_COM - 1)*100).toFixed(0)}% above US avg`)
    : '';

  // Energy cost impact by industry
  const impactMap = {
    laundromat:  `Laundromats spend 20–30% of revenue on electricity. At ${comLabel}, budget ~$2,800–4,200/mo per 40-machine setup.`,
    car_wash:    `Tunnel car washes use 2–4 kWh per vehicle. At ${comLabel}, electricity runs ~$0.22–0.44/car.`,
    gym:         `Gyms average 15–25 kWh/sq ft/year. At ${comLabel}, a 10,000 sq ft gym costs ~$1,800–3,700/mo in electricity.`,
    restaurant:  `Restaurants spend 3–5% of revenue on electricity. At ${comLabel}, a full-service unit spends ~$1,500–3,500/mo.`,
    coffee_shop: `A café's espresso machines + HVAC run ~2,000–4,000 kWh/mo. At ${comLabel}, that's ~$240–480/mo.`,
    indoor_play: `FECs with arcades + HVAC average 8,000–15,000 kWh/mo. At ${comLabel}, ~$960–1,800/mo.`,
    dry_cleaning:`Industrial steam presses use 3–5 kWh each. At ${comLabel}, energy is ~10–15% of operating cost.`,
    coworking:   `Co-working spaces average 12–18 kWh/sq ft/yr. At ${comLabel}, a 5,000 sq ft space costs ~$600–1,100/mo.`,
    urgent_care: `Medical facilities spend $2–3/sq ft/yr on electricity. A 3,000 sq ft clinic: ~$500–750/mo.`,
    medical_practice: `A typical practice uses 25–35 kWh/sq ft/yr. At ${comLabel}, a 2,500 sq ft office: ~$580–900/mo.`,
    optometry:   `Optometry offices average 20–30 kWh/sq ft/yr. Small 1,500 sq ft practice: ~$300–500/mo.`,
    gas_station: `C-stores + fuel pumps use 10,000–20,000 kWh/mo. At ${comLabel}, electricity costs ~$1,200–2,400/mo.`,
  };
  const impact = impactMap[industry] || `At ${comLabel}, factor electricity into your monthly operating budget.`;

  const card = document.createElement('div');
  card.id = 'v2-eia-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">⚡ EIA Electricity Prices — ${data.state} (${data.period})</div>
      <div style="font-size:10px;color:var(--v2-t3)">US Energy Information Administration · DEMO_KEY · No signup</div>
    </div>
    <div class="v2-kpi-grid">
      <div class="v2-kpi">
        <div class="v2-kpi-ico">🏢</div>
        <div class="v2-kpi-val" style="color:${comColor}">${comLabel}</div>
        <div class="v2-kpi-lbl">Commercial Rate</div>
        ${comVsAvg ? `<div style="font-size:10px;color:${comColor};margin-top:2px">${comVsAvg}</div>` : ''}
      </div>
      <div class="v2-kpi">
        <div class="v2-kpi-ico">🏠</div>
        <div class="v2-kpi-val">${resLabel}</div>
        <div class="v2-kpi-lbl">Residential Rate</div>
      </div>
      <div class="v2-kpi">
        <div class="v2-kpi-ico">📊</div>
        <div class="v2-kpi-val">${US_AVG_COM.toFixed(1)}¢/kWh</div>
        <div class="v2-kpi-lbl">US Avg Commercial</div>
      </div>
    </div>
    <div style="margin-top:12px;padding:10px 14px;background:var(--v2-s3);border-radius:8px;font-size:12px;line-height:1.5;color:var(--v2-t2)">
      💡 <strong>Industry Impact:</strong> ${impact}
    </div>
    <div style="font-size:10px;color:var(--v2-t3);margin-top:8px">
      Source: US Energy Information Administration (EIA) Retail Electricity Sales · Annual survey data by state and sector
    </div>`;
  panel.appendChild(card);
}

// ── 10. OVERPASS — Foot Traffic Anchor POI Density ───────────────────────────
/**
 * Queries OpenStreetMap Overpass API for foot traffic generators near lat/lng.
 * These are business anchors that drive walk-by traffic: grocery, pharmacy, etc.
 * Returns { anchors: [{ type, name, count }], total }
 */
async function v2FetchNearbyPOIs(lat, lng, radiusMiles = 3) {
  if (typeof demoMode !== 'undefined' && demoMode) return null;
  if (!lat || !lng) return null;
  const radiusM = Math.min(Math.round(radiusMiles * 1609.34), 5000); // cap at 5km
  const cacheKey = `poi:${lat.toFixed(3)},${lng.toFixed(3)},${radiusM}`;
  const cached = _freeApiCache(cacheKey);
  if (cached) return cached;

  // Foot traffic anchor types
  const queries = [
    { type: 'Grocery / Supermarket', tag: '["shop"~"supermarket|grocery"]' },
    { type: 'Pharmacy / Drug Store',  tag: '["amenity"~"pharmacy"]' },
    { type: 'School / College',       tag: '["amenity"~"school|college|university"]' },
    { type: 'Bank / ATM',             tag: '["amenity"~"bank|atm"]' },
    { type: 'Fast Food',              tag: '["amenity"="fast_food"]' },
    { type: 'Shopping Mall / Strip',  tag: '["shop"~"mall|department_store"]' },
    { type: 'Gas Station',            tag: '["amenity"="fuel"]' },
    { type: 'Medical / Hospital',     tag: '["amenity"~"hospital|clinic|doctors"]' },
  ];

  const overpassQL = `[out:json][timeout:20];(${
    queries.map(q => `node${q.tag}(around:${radiusM},${lat},${lng});`).join('')
  });out count;`;

  // Also do a per-type count via union trick
  const perTypeQL = `[out:json][timeout:25];${
    queries.map((q, i) => `(node${q.tag}(around:${radiusM},${lat},${lng});)->.t${i};`).join('')
  }${queries.map((q, i) => `.t${i} out count;`).join('')}`;

  try {
    const url = 'https://overpass-api.de/api/interpreter';
    // Individual counts per type
    const countPromises = queries.map(async (q) => {
      const ql = `[out:json][timeout:15];(node${q.tag}(around:${radiusM},${lat},${lng});way${q.tag}(around:${radiusM},${lat},${lng}););out count;`;
      try {
        const r = await fetch(url, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(ql),
          signal: _abortTimeoutSig(12000),
        });
        if (!r.ok) return { ...q, count: 0 };
        const d = await r.json();
        return { ...q, count: d.elements?.[0]?.tags?.total ? parseInt(d.elements[0].tags.total) : 0 };
      } catch { return { ...q, count: 0 }; }
    });

    const anchors = await Promise.all(countPromises);
    const total = anchors.reduce((s, a) => s + a.count, 0);
    const result = { anchors, total, radiusM, lat, lng };
    _freeApiCache(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('[v2FreeAPI] Overpass POI failed:', e.message);
    return null;
  }
}

function v2RenderPOIDensityCard(data, industry, zip) {
  const existing = document.getElementById('v2-poi-density-card');
  if (existing) existing.remove();
  const panel = document.getElementById('v2-panel-competition');
  if (!panel || !data) return;

  const radiusMi = (data.radiusM / 1609.34).toFixed(1);
  const total = data.total;
  const trafficColor = total >= 20 ? 'var(--v2-green)' : total >= 8 ? 'var(--v2-amber)' : 'var(--v2-red)';
  const trafficLabel = total >= 20 ? 'High foot traffic area' : total >= 8 ? 'Moderate foot traffic' : 'Low foot traffic area';

  // Only show anchors with count > 0, sorted desc
  const visible = data.anchors.filter(a => a.count > 0).sort((a, b) => b.count - a.count);

  const rows = visible.length > 0
    ? visible.map(a => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--v2-border)">
          <span style="font-size:12px;color:var(--v2-t2)">${a.type}</span>
          <span style="font-size:13px;font-weight:700;color:var(--v2-t1)">${a.count}</span>
        </div>`).join('')
    : '<div style="font-size:12px;color:var(--v2-t3);padding:8px 0">No major anchors found within radius — may indicate low foot traffic or data gap.</div>';

  const card = document.createElement('div');
  card.id = 'v2-poi-density-card';
  card.className = 'v2-card';
  card.style.cssText = 'padding:20px;margin-top:16px';
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="v2-label">🗺️ Foot Traffic Anchors within ${radiusMi} mi</div>
      <div style="font-size:10px;color:var(--v2-t3)">OpenStreetMap Overpass API · No key</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px 14px;background:var(--v2-s3);border-radius:8px">
      <span style="color:${trafficColor};font-size:20px">●</span>
      <div>
        <div style="font-size:14px;font-weight:700;color:${trafficColor}">${trafficLabel}</div>
        <div style="font-size:12px;color:var(--v2-t3)">${total} foot traffic anchors within ${radiusMi} miles</div>
      </div>
    </div>
    <div style="margin-bottom:8px">${rows}</div>
    <div style="font-size:11px;color:var(--v2-t2);background:var(--v2-s3);padding:8px 12px;border-radius:8px;margin-top:8px">
      💡 High anchor density = more walk-by traffic. Proximity to groceries, pharmacies, and schools drives organic foot traffic for service businesses.
    </div>
    <div style="font-size:10px;color:var(--v2-t3);margin-top:8px">
      Source: OpenStreetMap contributors via Overpass API · Open data, updated continuously · POI counts within ${radiusMi}-mile radius
    </div>`;
  panel.appendChild(card);
}

// ── Wire new APIs into enrichment ─────────────────────────────────────────────
// Appended to v2EnrichDashboardWithFreeAPIs via separate call below

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
