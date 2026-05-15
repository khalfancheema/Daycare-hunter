// ══════════════════════════════════════════════════════════════════════════════
// 43-real-data.js  — Real Data Prefetch Layer (Phase A + Phase B)
//
// Runs BEFORE the AI pipeline starts. Pulls authoritative public data from
// free government APIs and injects exact figures into each agent's prompt so
// Claude anchors to real numbers instead of hallucinating plausible ones.
//
// Functions exposed:
//   prefetchRealData(zip, industry, capacity, budget)  → stores R.real
//   buildRealDataCtx(keys)                              → compact text block
//
// Works in BOTH bundles:
//   v2  — delegates to v2-16 functions when available (avoids duplication)
//   v1  — uses self-contained inline fetches
// ══════════════════════════════════════════════════════════════════════════════

const _RD_CACHE = {};

function _rdCacheGet(k) { return _RD_CACHE[k]; }
function _rdCacheSet(k, v) { _RD_CACHE[k] = v; return v; }

function _rdAbortTimeout(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

// ── Industry → NAICS mapping ──────────────────────────────────────────────────
const _RD_NAICS = {
  daycare:          '624410',
  gas_station:      '447110',
  laundromat:       '812310',
  car_wash:         '811192',
  restaurant:       '722511',
  gym:              '713940',
  indoor_play:      '713990',
  dry_cleaning:     '812320',
  senior_care:      '623110',
  tutoring:         '611710',
  urgent_care:      '621491',
  coffee_shop:      '722515',
  barbershop:       '812111',
  coworking:        '531120',
  medical_practice: '621111',
  optometry:        '621320',
};

// ── Industry → OSM tags for Overpass competitor lookup ───────────────────────
const _RD_OSM = {
  daycare:          [['amenity','kindergarten'],['amenity','childcare']],
  gas_station:      [['amenity','fuel']],
  laundromat:       [['shop','laundry']],
  car_wash:         [['amenity','car_wash']],
  restaurant:       [['amenity','restaurant'],['amenity','fast_food']],
  gym:              [['leisure','fitness_centre'],['leisure','gym']],
  indoor_play:      [['leisure','trampoline_park'],['leisure','soft_play']],
  dry_cleaning:     [['shop','dry_cleaning']],
  senior_care:      [['amenity','nursing_home'],['social_facility','nursing_home']],
  tutoring:         [['amenity','school'],['office','educational_institution']],
  urgent_care:      [['amenity','urgent_care'],['amenity','clinic']],
  coffee_shop:      [['amenity','cafe']],
  barbershop:       [['shop','hairdresser'],['shop','barber']],
  coworking:        [['office','coworking']],
  medical_practice: [['amenity','doctors'],['amenity','clinic']],
  optometry:        [['healthcare','optometrist'],['shop','optician']],
};

// ── Industry → eCFR title/part for key federal regulation ───────────────────
const _RD_ECFR = {
  daycare:          { title:45, part:98,  name:'Child Care Development Fund' },
  gas_station:      { title:40, part:280, name:'Underground Storage Tanks' },
  car_wash:         { title:40, part:122, name:'NPDES Stormwater Permits' },
  restaurant:       { title:21, part:110, name:'Food Manufacturing Current GMP' },
  indoor_play:      { title:16, part:1203,name:'CPSC Safety Standard Playground Equip' },
  dry_cleaning:     { title:40, part:63,  name:'PERC Air Emissions (Subpart M)' },
  senior_care:      { title:42, part:483, name:'Long-Term Care Requirements (CMS)' },
  urgent_care:      { title:42, part:482, name:'Hospital Conditions of Participation' },
  coffee_shop:      { title:21, part:110, name:'Food Manufacturing GMP' },
  medical_practice: { title:45, part:164, name:'HIPAA Security Rule' },
  optometry:        { title:16, part:315, name:'Ophthalmic Practice Rules (FTC)' },
};

// ── State full name → abbreviation ──────────────────────────────────────────
const _RD_STATE_MAP = {
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
};
function _rdStateAbbr(name) { return _RD_STATE_MAP[name] || name.slice(0,2).toUpperCase(); }

function _rdFloodZoneDesc(zone) {
  const m = {
    'A':'High risk — 1% annual flood chance','AE':'High risk — base elevation determined',
    'AH':'High risk — shallow flooding','AO':'High risk — sheet flow',
    'V':'Coastal high hazard','VE':'Coastal high hazard (with elevation)',
    'X':'Minimal risk — outside 500-yr floodplain','B':'Moderate risk','C':'Minimal risk',
  };
  return m[zone] || 'Zone '+zone;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ══════════════════════════════════════════════════════════════════════════════
async function prefetchRealData(zipCode, industryKey, capacityVal, budgetVal) {
  if (!zipCode || !/^\d{5}$/.test(zipCode)) return null;
  if (typeof demoMode !== 'undefined' && demoMode) return null; // skip in demo

  const naics   = _RD_NAICS[industryKey] || '621110';
  const osmTags = _RD_OSM[industryKey]   || [];
  const ecfr    = _RD_ECFR[industryKey]  || null;

  // Step 1: geocode ZIP to lat/lng + city/state
  let geo = null;
  try { geo = await _rdGeocodeZip(zipCode); } catch(e) {}
  const lat       = geo?.lat;
  const lng       = geo?.lng;
  const stateAbbr = geo?.state_abbr || geo?.state || '';
  const city      = geo?.city || '';

  // Step 2: fire all sources in parallel, never block pipeline on failure
  const [
    acsR, zbpR, blsR, fredR, hudR,
    climateR, cdcR, osmR, grantsR,
    samR, femaR, fbiR, nrelR, ecfrR, sbaR, eiaR,
  ] = await Promise.allSettled([
    _rdFetchACS(zipCode),
    _rdFetchZBP(zipCode, naics),
    _rdFetchBLSWages(stateAbbr),
    _rdFetchFRED(),
    _rdFetchHUDRents(zipCode),
    lat && lng ? _rdFetchClimate(lat, lng)                            : Promise.resolve(null),
    city && stateAbbr ? _rdFetchCDC(city, stateAbbr)                 : Promise.resolve(null),
    lat && lng && osmTags.length ? _rdFetchOSMCompetitors(lat, lng, osmTags) : Promise.resolve(null),
    _rdFetchGrantsGov(),
    stateAbbr ? _rdFetchSAMGov(naics, stateAbbr)                     : Promise.resolve(null),
    lat && lng ? _rdFetchFEMAFlood(lat, lng)                         : Promise.resolve(null),
    stateAbbr ? _rdFetchFBICrime(stateAbbr)                          : Promise.resolve(null),
    zipCode ? _rdFetchNREL(zipCode)                                   : Promise.resolve(null),
    ecfr ? _rdFetchECFR(ecfr)                                        : Promise.resolve(null),
    _rdFetchSBA(zipCode, industryKey),
    stateAbbr ? _rdFetchEIA(stateAbbr)                               : Promise.resolve(null),
  ]);

  const v = r => r.status === 'fulfilled' ? r.value : null;

  R.real = {
    _pulled_at:       new Date().toISOString(),
    _zip:             zipCode,
    _industry:        industryKey,
    _naics:           naics,
    geo,
    demographics:     v(acsR),
    business_density: v(zbpR),
    wages:            v(blsR),
    macro:            v(fredR),
    rents:            v(hudR),
    climate:          v(climateR),
    health:           v(cdcR),
    competitors_osm:  v(osmR),
    grants_gov:       v(grantsR),
    federal_opps:     v(samR),
    flood:            v(femaR),
    crime:            v(fbiR),
    energy_rates:     v(nrelR),
    regulations:      v(ecfrR),
    sba:              v(sbaR),
    energy_state:     v(eiaR),
  };

  const loaded = Object.entries(R.real)
    .filter(([k, v2]) => v2 && !k.startsWith('_'))
    .map(([k]) => k);
  console.log(`[RealData] ✓ ${loaded.length} sources loaded for ZIP ${zipCode}:`, loaded.join(', '));
  return R.real;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROMPT CONTEXT BUILDER — compact text block for agent prompts
// keys: array of R.real keys to include, or null for all
// ══════════════════════════════════════════════════════════════════════════════
function buildRealDataCtx(keys) {
  if (!R || !R.real) return '';
  const d = R.real;
  const want = k => !keys || keys.includes(k);
  const lines = ['\n\n══ VERIFIED REAL DATA — use EXACT numbers below, never re-estimate ══'];

  if (want('demographics') && d.demographics) {
    const dem = d.demographics;
    lines.push(`📊 DEMOGRAPHICS [${dem.source}]`);
    if (dem.population)     lines.push(`  population: ${dem.population.toLocaleString()}`);
    if (dem.median_income)  lines.push(`  median_hh_income: $${dem.median_income.toLocaleString()}`);
    if (dem.under_18 != null) lines.push(`  under_18_pop: ${(dem.under_18||0).toLocaleString()}`);
    if (dem.households)     lines.push(`  households: ${dem.households.toLocaleString()}`);
    if (dem.employed != null) lines.push(`  employed: ${(dem.employed||0).toLocaleString()}`);
    if (dem.renter_pct != null) lines.push(`  renter_pct: ${dem.renter_pct}%`);
  }

  if (want('business_density') && d.business_density) {
    const biz = d.business_density;
    lines.push(`🏢 BUSINESS DENSITY [${biz.source}]`);
    lines.push(`  direct_competitors_in_zip (NAICS ${biz.naics}): ${biz.count}`);
    if (biz.employees) lines.push(`  industry_employees_in_zip: ${biz.employees.toLocaleString()}`);
  }

  if (want('wages') && d.wages) {
    const w = d.wages;
    lines.push(`💰 WAGES [${w.source}]`);
    if (w.avg_weekly_wage) lines.push(`  avg_weekly_wage_state: $${Math.round(w.avg_weekly_wage).toLocaleString()}`);
    if (w.employment)     lines.push(`  industry_employment_state: ${(w.employment||0).toLocaleString()}`);
  }

  if (want('macro') && d.macro) {
    const m = d.macro;
    lines.push(`📈 MACRO [${m.source}]`);
    if (m.fed_funds_rate != null) lines.push(`  fed_funds_rate: ${m.fed_funds_rate}%`);
    if (m.unemployment != null)   lines.push(`  unemployment_rate: ${m.unemployment}%`);
    if (m.cpi != null)            lines.push(`  cpi_latest: ${m.cpi}`);
    if (m.prime_rate != null)     lines.push(`  prime_rate: ${m.prime_rate}%`);
  }

  if (want('rents') && d.rents) {
    const r = d.rents;
    lines.push(`🏠 HUD FAIR MARKET RENTS [HUD FY2024]`);
    if (r.fmr_2br) lines.push(`  fmr_2br: $${r.fmr_2br}/mo`);
    if (r.fmr_3br) lines.push(`  fmr_3br: $${r.fmr_3br}/mo`);
  }

  if (want('competitors_osm') && d.competitors_osm && d.competitors_osm.count > 0) {
    const c = d.competitors_osm;
    lines.push(`🗺 REAL COMPETITORS NEARBY [${c.source}]`);
    lines.push(`  count_within_${c.radius_km}km: ${c.count}`);
    (c.businesses||[]).slice(0,10).forEach(b => {
      lines.push(`  • "${b.name}"${b.address ? ' — '+b.address : ''}${b.phone ? ' · '+b.phone : ''}`);
    });
  }

  if (want('grants_gov') && d.grants_gov && d.grants_gov.count > 0) {
    const g = d.grants_gov;
    lines.push(`💵 ACTIVE FEDERAL GRANTS [${g.source}]`);
    lines.push(`  total_active_opportunities: ${g.count}`);
    (g.opportunities||[]).slice(0,5).forEach(o => {
      const amt = o.amount_max ? ` — up to $${parseInt(o.amount_max).toLocaleString()}` : '';
      lines.push(`  • ${o.title} — ${o.agency}${amt} — Deadline: ${o.deadline||'TBD'} — ${o.url}`);
    });
  }

  if (want('federal_opps') && d.federal_opps && d.federal_opps.count > 0) {
    const s = d.federal_opps;
    lines.push(`📋 SAM.GOV FEDERAL CONTRACTS [SAM.gov]`);
    lines.push(`  active_contracts_in_state: ${s.count}`);
    (s.opportunities||[]).slice(0,3).forEach(o => {
      lines.push(`  • ${o.title} — ${o.agency}${o.value ? ' ($'+parseInt(o.value).toLocaleString()+')' : ''}`);
    });
  }

  if (want('sba') && d.sba && d.sba.loan_count > 0) {
    const s = d.sba;
    lines.push(`🏦 SBA LOAN HISTORY [SBA FOIA Data]`);
    lines.push(`  sba_loans_in_area: ${s.loan_count}`);
    if (s.avg_loan_amount) lines.push(`  avg_loan_amount: $${Math.round(s.avg_loan_amount).toLocaleString()}`);
    if (s.approval_rate)   lines.push(`  area_approval_rate: ${s.approval_rate}%`);
  }

  if (want('flood') && d.flood) {
    const f = d.flood;
    lines.push(`🌊 FEMA FLOOD [${f.source}]`);
    lines.push(`  flood_zone: ${f.flood_zone} — ${f.zone_description}`);
    lines.push(`  flood_insurance_mandatory: ${f.insurance_required}`);
  }

  if (want('crime') && d.crime && d.crime.violent_per_100k != null) {
    const cr = d.crime;
    lines.push(`🚔 CRIME [${cr.source} ${cr.year||''}]`);
    lines.push(`  violent_crime_per_100k_state: ${cr.violent_per_100k}`);
    if (cr.property_per_100k) lines.push(`  property_crime_per_100k_state: ${cr.property_per_100k}`);
  }

  if (want('energy_rates') && d.energy_rates && d.energy_rates.commercial_rate_kwh) {
    const e = d.energy_rates;
    lines.push(`⚡ ENERGY RATES [${e.source}]`);
    lines.push(`  commercial_kwh_rate: $${e.commercial_rate_kwh}`);
    if (e.utility_name) lines.push(`  local_utility: ${e.utility_name}`);
  }

  if (want('energy_state') && d.energy_state && !d.energy_rates) {
    const e = d.energy_state;
    if (e.commercial_cents_kwh) {
      lines.push(`⚡ ENERGY RATES [${e.source}]`);
      lines.push(`  commercial_kwh_rate: $${(e.commercial_cents_kwh/100).toFixed(4)}`);
    }
  }

  if (want('regulations') && d.regulations) {
    const reg = d.regulations;
    lines.push(`📜 FEDERAL REGULATIONS [${reg.source}]`);
    lines.push(`  cfr: Title ${reg.title}, Part ${reg.part} — ${reg.name}`);
    if (reg.last_amended) lines.push(`  last_amended: ${reg.last_amended}`);
    lines.push(`  url: ${reg.url}`);
  }

  lines.push('══ END REAL DATA — cite each figure with its bracketed source tag ══\n');
  return lines.length > 3 ? lines.join('\n') : '';
}

// ══════════════════════════════════════════════════════════════════════════════
// FETCH WRAPPERS
// Delegate to v2-16 functions when in v2 bundle; inline fallback for v1.
// ══════════════════════════════════════════════════════════════════════════════

async function _rdGeocodeZip(zip) {
  if (typeof v2GeocodeAddress === 'function') {
    return v2GeocodeAddress(zip);
  }
  const k = 'rdgeo:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&addressdetails=1&limit=1`,
      { headers:{'User-Agent':'BusinessHunterApp/2.0'}, signal:_rdAbortTimeout(8000) }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d?.length) return null;
    const a = d[0].address||{};
    const result = {
      lat:        parseFloat(d[0].lat),
      lng:        parseFloat(d[0].lon),
      city:       a.city||a.town||a.county||'',
      state:      a.state||'',
      state_abbr: _rdStateAbbr(a.state||''),
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { return null; }
}

async function _rdFetchACS(zip) {
  if (typeof v2FetchCensusACS === 'function') return v2FetchCensusACS(zip);
  const k = 'rdacs:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // ACS 5-Year variables: pop, median_income, owner_occ, under_18, employed, bachelors, renter
    const vars = 'B01003_001E,B19013_001E,B25003_002E,B09001_001E,B23025_004E,B15003_022E,B25003_003E';
    const url = `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.length < 2) return null;
    const row = d[1];
    const pop     = parseInt(row[0]);
    const income  = parseInt(row[1]);
    const owned   = parseInt(row[2]);
    const u18     = parseInt(row[3]);
    const emp     = parseInt(row[4]);
    const bach    = parseInt(row[5]);
    const renter  = parseInt(row[6]);
    const hh      = owned + renter;
    const result = {
      population:    pop > 0 ? pop : null,
      median_income: income > 0 ? income : null,
      households:    hh > 0 ? hh : null,
      owner_occupied:owned > 0 ? owned : null,
      renter_occ:    renter > 0 ? renter : null,
      renter_pct:    hh > 0 ? Math.round(renter/hh*100) : null,
      under_18:      u18 > 0 ? u18 : null,
      employed:      emp > 0 ? emp : null,
      bachelors:     bach > 0 ? bach : null,
      source:        'ACS 5-Year 2022',
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] ACS failed:', e.message); return null; }
}

async function _rdFetchZBP(zip, naics) {
  if (typeof v2FetchZBP === 'function') return v2FetchZBP(zip, naics);
  const k = `rdzbp:${zip}:${naics}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const url = `https://api.census.gov/data/2021/zbp?get=EMP,ESTAB,PAYANN&for=zipcode:${zip}&NAICS2017=${naics}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.length < 2) return { count:0, employees:0, naics, source:'Census ZBP 2021', zip };
    const row = d[1];
    const result = {
      count:          parseInt(row[1])||0,
      employees:      parseInt(row[0])||0,
      annual_payroll: parseInt(row[2])||0,
      naics, source:'Census ZBP 2021', zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] ZBP failed:', e.message); return null; }
}

async function _rdFetchBLSWages(stateAbbr) {
  if (typeof v2FetchBLSWages === 'function') return v2FetchBLSWages(stateAbbr);
  if (!stateAbbr) return null;
  const k = 'rdbls:'+stateAbbr;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // BLS QCEW state-level total private employment + wages (series: ENU{fips}50000000)
    // Use total private for simplicity — gives avg weekly wage by state
    const stateFips = _rdStateFips(stateAbbr);
    if (!stateFips) return null;
    const seriesId = `ENU${stateFips}50000000`;
    const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${seriesId}?startyear=2023&endyear=2023`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const latest = d?.Results?.series?.[0]?.data?.find(r => r.period === 'Q04') || d?.Results?.series?.[0]?.data?.[0];
    if (!latest) return null;
    const result = {
      avg_weekly_wage: parseFloat(latest.value) || null,
      employment:      null, // QCEW wage series doesn't include emp count
      period:          `${latest.year} ${latest.period}`,
      state:           stateAbbr,
      source:          'BLS QCEW',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] BLS wages failed:', e.message); return null; }
}

async function _rdFetchFRED() {
  if (typeof v2FetchFREDIndicators === 'function') return v2FetchFREDIndicators();
  const k = 'rdfed';
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // FRED offers direct CSV download with no auth for public series
    const [ffRes, cpiRes, unempRes] = await Promise.allSettled([
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=FEDFUNDS', { signal:_rdAbortTimeout(8000) }).then(r=>r.text()),
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL', { signal:_rdAbortTimeout(8000) }).then(r=>r.text()),
      fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=UNRATE',   { signal:_rdAbortTimeout(8000) }).then(r=>r.text()),
    ]);
    const lastVal = csv => {
      if (csv.status !== 'fulfilled') return null;
      const lines = (csv.value||'').trim().split('\n').filter(l => l && !l.startsWith('DATE'));
      const last = lines[lines.length-1];
      return last ? parseFloat(last.split(',')[1]) : null;
    };
    const fed = lastVal(ffRes);
    const cpi = lastVal(cpiRes);
    const un  = lastVal(unempRes);
    const result = {
      fed_funds_rate: fed,
      cpi:            cpi,
      unemployment:   un,
      prime_rate:     fed ? Math.round((fed + 3) * 10) / 10 : null,
      source:         'FRED (Federal Reserve)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] FRED failed:', e.message); return null; }
}

async function _rdFetchHUDRents(zip) {
  if (typeof v2FetchHUDRents === 'function') return v2FetchHUDRents(zip);
  return null; // HUD auth requires state → county FIPS; delegate to v2-16
}

async function _rdFetchClimate(lat, lng) {
  if (typeof v2FetchClimate === 'function') return v2FetchClimate(lat, lng);
  return null;
}

async function _rdFetchCDC(city, stateAbbr) {
  if (typeof v2FetchCDCPlaces === 'function') return v2FetchCDCPlaces(city, stateAbbr);
  return null;
}

async function _rdFetchSBA(zip, industry) {
  if (typeof v2FetchSBALoans === 'function') return v2FetchSBALoans(zip, industry);
  return null;
}

async function _rdFetchEIA(stateAbbr) {
  if (typeof v2FetchEIAEnergy === 'function') return v2FetchEIAEnergy(stateAbbr);
  return null;
}

// ── Phase B: NEW APIs ─────────────────────────────────────────────────────────

async function _rdFetchOSMCompetitors(lat, lng, tags) {
  const k = `rdosm:${lat.toFixed(3)},${lng.toFixed(3)}:${tags.map(t=>t.join('=')).join('|')}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const radius = 8000; // 8km ≈ 5 miles
    const tagQueries = tags.map(([kk,vv]) =>
      `node["${kk}"="${vv}"](around:${radius},${lat},${lng});` +
      `way["${kk}"="${vv}"](around:${radius},${lat},${lng});`
    ).join('');
    const query = `[out:json][timeout:25];(${tagQueries});out center 40;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method:  'POST',
      body:    query,
      headers: {'Content-Type':'text/plain'},
      signal:  _rdAbortTimeout(25000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const businesses = (d.elements||[])
      .map(el => ({
        name:    el.tags?.name || el.tags?.['brand:en'] || null,
        lat:     el.lat || el.center?.lat,
        lng:     el.lon || el.center?.lon,
        address: [
          el.tags?.['addr:housenumber'],
          el.tags?.['addr:street'],
          el.tags?.['addr:city'],
          el.tags?.['addr:state'],
        ].filter(Boolean).join(' '),
        phone:   el.tags?.phone || el.tags?.['contact:phone'] || null,
        website: el.tags?.website || el.tags?.['contact:website'] || null,
        osm_id:  el.id,
      }))
      .filter(b => b.name) // only named businesses
      .slice(0, 30);

    const result = {
      count:      businesses.length,
      businesses,
      radius_km:  radius / 1000,
      source:     'OpenStreetMap Overpass API',
      lat, lng,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] OSM Overpass failed:', e.message); return null; }
}

async function _rdFetchGrantsGov() {
  const k = 'rdgrants';
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const res = await fetch('https://api.grants.gov/v1/api/search2', {
      method:  'POST',
      headers: { 'Content-Type':'application/json' },
      body:    JSON.stringify({
        rows:         10,
        oppStatuses:  'forecasted|posted',
        sortBy:       'openDate|desc',
        eligibilities:'small_businesses',
      }),
      signal: _rdAbortTimeout(12000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const opportunities = (d.data?.oppHits||[]).slice(0,8).map(o => ({
      title:      o.oppTitle,
      agency:     o.agencyName,
      amount_max: o.awardCeiling,
      amount_min: o.awardFloor,
      deadline:   o.closeDate,
      posted:     o.openDate,
      url:        `https://www.grants.gov/search-results-detail/${o.id}`,
      status:     o.oppStatus,
    }));
    const result = { count:d.data?.hitCount||opportunities.length, opportunities, source:'Grants.gov' };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] Grants.gov failed:', e.message); return null; }
}

async function _rdFetchSAMGov(naics, stateAbbr) {
  const k = `rdsam:${naics}:${stateAbbr}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // SAM.gov public search — no API key for basic search
    const today = new Date();
    const fromDate = `${(today.getMonth()+1).toString().padStart(2,'0')}/01/${today.getFullYear()-1}`;
    const url = `https://api.sam.gov/opportunities/v2/search?limit=5&postedFrom=${fromDate}&naics=${naics}&ptype=o&active=Yes`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const opportunities = (d.opportunitiesData||[]).slice(0,5).map(o => ({
      title:    o.title,
      agency:   o.departmentName || o.subtierName,
      value:    o.award?.amount,
      deadline: o.responseDeadLine,
      type:     o.type,
      url:      `https://sam.gov/opp/${o.noticeId}/view`,
    }));
    const result = { count:d.totalRecords||opportunities.length, opportunities, source:'SAM.gov' };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] SAM.gov failed:', e.message); return null; }
}

async function _rdFetchFEMAFlood(lat, lng) {
  const k = `rdfema:${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const ext = `${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}`;
    const url = `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY&returnGeometry=false&f=json`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const zone = d.features?.[0]?.attributes?.FLD_ZONE || 'X';
    const result = {
      flood_zone:          zone,
      zone_description:    _rdFloodZoneDesc(zone),
      high_risk:           ['A','AE','AH','AO','V','VE'].includes(zone),
      insurance_required:  ['A','AE','AH','AO','V','VE'].includes(zone),
      source:              'FEMA NFHL',
      lat, lng,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] FEMA flood failed:', e.message); return null; }
}

async function _rdFetchFBICrime(stateAbbr) {
  const k = 'rdfbi:'+stateAbbr;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // FBI CDE API — state-level estimates (no key needed for v1)
    const url = `https://cde.ucr.cjis.gov/LATEST/webapp/public/api/data/summary/state/${stateAbbr}/violent-crime?from=2022&to=2022&API_KEY=iiHnOKfno2Mgkt5AynpvPpUQTEyxE77jo1RU8PIv`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    // Response shape: {data:[{data_year,violent_crime,...}]}
    const latest = Array.isArray(d) ? d[d.length-1] : d?.data?.[0];
    if (!latest) return null;
    const pop = latest.population || 1;
    const vc  = latest.violent_crime || latest.actual_violent || 0;
    const pc  = latest.property_crime || latest.actual_property || 0;
    const result = {
      violent_per_100k:  vc ? Math.round(vc / pop * 100000) : null,
      property_per_100k: pc ? Math.round(pc / pop * 100000) : null,
      year:              latest.data_year || 2022,
      state:             stateAbbr,
      source:            'FBI CDE',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] FBI crime failed:', e.message); return null; }
}

async function _rdFetchNREL(zip) {
  const k = 'rdnrel:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // NREL Utility Rates API — DEMO_KEY works for low volume (~10 req/day)
    const url = `https://developer.nrel.gov/api/utility_rates/v3.json?api_key=DEMO_KEY&address=${zip}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const o = d?.outputs || {};
    if (!o.commercial) return null;
    const result = {
      commercial_rate_kwh:  o.commercial,
      residential_rate_kwh: o.residential,
      industrial_rate_kwh:  o.industrial,
      utility_name:         o.utility_name,
      state:                o.state,
      source:               'NREL Utility Rates API',
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] NREL failed:', e.message); return null; }
}

async function _rdFetchECFR(ecfrConfig) {
  if (!ecfrConfig) return null;
  const { title, part, name } = ecfrConfig;
  const k = `rdecfr:${title}:${part}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const url = `https://www.ecfr.gov/api/versioner/v1/versions/title-${title}?part=${part}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const versions = Array.isArray(d) ? d : (d.content_versions || []);
    const latest = versions[versions.length-1] || {};
    const result = {
      title, part, name,
      effective_date: latest.effective_date || latest.date,
      last_amended:   latest.date || latest.effective_date,
      url:            `https://www.ecfr.gov/current/title-${title}/part-${part}`,
      source:         'eCFR (Code of Federal Regulations)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] eCFR failed:', e.message); return null; }
}

// ── State abbreviation → FIPS code (for BLS QCEW) ────────────────────────────
const _RD_FIPS = {
  'AL':'01','AK':'02','AZ':'04','AR':'05','CA':'06','CO':'08','CT':'09','DE':'10',
  'FL':'12','GA':'13','HI':'15','ID':'16','IL':'17','IN':'18','IA':'19','KS':'20',
  'KY':'21','LA':'22','ME':'23','MD':'24','MA':'25','MI':'26','MN':'27','MS':'28',
  'MO':'29','MT':'30','NE':'31','NV':'32','NH':'33','NJ':'34','NM':'35','NY':'36',
  'NC':'37','ND':'38','OH':'39','OK':'40','OR':'41','PA':'42','RI':'44','SC':'45',
  'SD':'46','TN':'47','TX':'48','UT':'49','VT':'50','VA':'51','WA':'53','WV':'54',
  'WI':'55','WY':'56','DC':'11',
};
function _rdStateFips(abbr) { return _RD_FIPS[abbr] || null; }
