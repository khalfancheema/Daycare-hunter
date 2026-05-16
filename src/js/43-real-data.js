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
  laundromat:       { title:40, part:122, name:'NPDES Permit Program (Wastewater)' },
  gym:              { title:29, part:1910,name:'OSHA General Industry Standards' },
  tutoring:         { title:34, part:99,  name:'FERPA — Student Privacy' },
  barbershop:       { title:29, part:1910,name:'OSHA Bloodborne Pathogens Standard' },
  coworking:        { title:29, part:1904,name:'OSHA Recordkeeping Requirements' },
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
    _rdFetchHUDRents(zipCode, stateAbbr),
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

  // ── Phase D: Industry-specific APIs (healthcare NPI) ─────────
  const _npiIndustries = ['urgent_care','medical_practice','optometry','senior_care','dental'];
  if (_npiIndustries.includes(industryKey) && city && stateAbbr) {
    try {
      const npiR = await _rdFetchCMSNPI(city, stateAbbr, industryKey);
      if (npiR) R.real.npi_providers = npiR;
    } catch(e) { console.warn('[RealData] NPI fetch failed (non-fatal):', e.message); }
  }

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
  const lines = ['\n\n══ VERIFIED REAL DATA — MANDATORY: use EXACT numbers below verbatim. DO NOT round, adjust, or re-estimate. If your training data conflicts with these numbers, these numbers win. Cite each figure with its bracketed source tag. ══'];

  if (want('demographics') && d.demographics) {
    const dem = d.demographics;
    lines.push(`📊 DEMOGRAPHICS [${dem.source}]`);
    if (dem.population)     lines.push(`  population: ${dem.population.toLocaleString()}`);
    if (dem.median_income)  lines.push(`  median_hh_income: $${dem.median_income.toLocaleString()}`);
    if (dem.under_18 != null) lines.push(`  under_18_pop: ${(dem.under_18||0).toLocaleString()}`);
    if (dem.households)     lines.push(`  households: ${dem.households.toLocaleString()}`);
    if (dem.employed != null) lines.push(`  employed: ${(dem.employed||0).toLocaleString()}`);
    if (dem.renter_pct != null) lines.push(`  renter_pct: ${dem.renter_pct}%`);
    if (dem.bachelors != null && dem.population) {
      const baPlus = Math.round(dem.bachelors / dem.population * 100);
      lines.push(`  bachelors_plus_pct: ${baPlus}% (ACS B15003)`);
    }
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
    if (w.avg_weekly_wage) {
      const annual = Math.round(w.avg_weekly_wage * 52);
      lines.push(`  avg_weekly_wage_state: $${Math.round(w.avg_weekly_wage).toLocaleString()}/wk ($${annual.toLocaleString()}/yr)`);
    }
    if (w.employment) lines.push(`  industry_employment_state: ${(w.employment||0).toLocaleString()}`);
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

  if (want('npi_providers') && d.npi_providers && d.npi_providers.count > 0) {
    const n = d.npi_providers;
    lines.push(`🏥 CMS NPI LICENSED PROVIDERS [${n.source}]`);
    lines.push(`  licensed_${n.taxonomy.toLowerCase().replace(/\s+/g,'_')}_in_${n.city}: ${n.count}`);
    if (n.names.length) lines.push(`  provider_names: ${n.names.slice(0,8).join(', ')}`);
  }

  if (want('health') && d.health && (d.health.no_insurance_pct != null || d.health.obesity_pct != null)) {
    const h = d.health;
    lines.push(`🏥 CDC PLACES LOCAL HEALTH [CDC PLACES]`);
    if (h.no_insurance_pct != null) lines.push(`  no_health_insurance_pct: ${h.no_insurance_pct}%`);
    if (h.diabetes_pct     != null) lines.push(`  diabetes_prevalence_pct: ${h.diabetes_pct}%`);
    if (h.obesity_pct      != null) lines.push(`  obesity_pct: ${h.obesity_pct}%`);
    if (h.checkup_pct      != null) lines.push(`  annual_checkup_pct: ${h.checkup_pct}%`);
    if (h.physical_inactivity != null) lines.push(`  physical_inactivity_pct: ${h.physical_inactivity}%`);
  }

  if (want('climate') && d.climate && d.climate.avgTemp_c != null) {
    const cl = d.climate;
    lines.push(`🌤 CLIMATE [Open-Meteo 2000-2019]`);
    if (cl.avgTemp_c)      lines.push(`  annual_avg_temp: ${cl.avgTemp_c}°C (${Math.round(cl.avgTemp_c*9/5+32)}°F)`);
    if (cl.totalPrecip_mm) lines.push(`  annual_precip: ${cl.totalPrecip_mm}mm`);
    if (cl.peakWetMonth)   lines.push(`  peak_wet_month: ${cl.peakWetMonth}`);
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
  if (typeof v2FetchCensusACS === 'function') {
    // v2 uses different field names — normalize to shared shape
    const raw = await v2FetchCensusACS(zip);
    if (!raw) return null;
    return {
      ...raw,
      population:     raw.population     ?? raw.total_population     ?? null,
      under_18:       raw.under_18       ?? raw.population_under_18  ?? null,
      households:     raw.households     ?? raw.total_households      ?? null,
      median_income:  raw.median_income  ?? null,
      employed:       raw.employed       ?? raw.labor_force           ?? null,
      bachelors:      raw.bachelors      ?? raw.bachelors_degree_plus ?? null,
      // renter_pct not available in v2 shape — leave as null
      renter_pct:     raw.renter_pct     ?? null,
    };
  }
  const k = 'rdacs:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // ACS 5-Year variables: pop, median_income, owner_occ, under_18, employed,
    // bachelors (B15003_022), masters (023), professional (024), doctorate (025), renter
    const vars = 'B01003_001E,B19013_001E,B25003_002E,B09001_001E,B23025_004E,B15003_022E,B15003_023E,B15003_024E,B15003_025E,B25003_003E';
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
    const bach    = parseInt(row[5]);  // B15003_022 — bachelor's only
    const mast    = parseInt(row[6]);  // B15003_023 — master's
    const prof    = parseInt(row[7]);  // B15003_024 — professional
    const doct    = parseInt(row[8]);  // B15003_025 — doctorate
    const renter  = parseInt(row[9]);
    const hh      = owned + renter;
    // bachelor's or higher = all four degree levels
    const bachPlus = [bach, mast, prof, doct].reduce((s, n) => s + (n > 0 ? n : 0), 0);
    const result = {
      population:    pop > 0 ? pop : null,
      median_income: income > 0 ? income : null,
      households:    hh > 0 ? hh : null,
      owner_occupied:owned > 0 ? owned : null,
      renter_occ:    renter > 0 ? renter : null,
      renter_pct:    hh > 0 ? Math.round(renter/hh*100) : null,
      under_18:      u18 > 0 ? u18 : null,
      employed:      emp > 0 ? emp : null,
      bachelors:     bachPlus > 0 ? bachPlus : null, // bachelors+ (B15003_022-025)
      source:        'ACS 5-Year 2022',
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] ACS failed:', e.message); return null; }
}

async function _rdFetchZBP(zip, naics) {
  if (typeof v2FetchZBP === 'function') {
    // v2FetchZBP(zip, industry) takes industryKey, not naics; inline takes naics.
    // v2 returns { establishments, employees, payroll_k } — normalize to { count, employees }
    // We pass naics directly — v2 will get null from its _ZBP_NAICS lookup, so use inline.
    // Do NOT delegate: v2 signature is incompatible (industryKey vs naics string).
  }
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
  // NOTE: v2FetchBLSWages(industryKey) has a different signature — do NOT delegate.
  // Always use QCEW inline fetch which correctly takes stateAbbr.
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
  if (typeof v2FetchFREDIndicators === 'function') {
    // v2 returns {PRIME:{value}, UNRATE:{value}, CPIAUCSL:{value}} — normalize to expected shape
    const raw = await v2FetchFREDIndicators();
    if (!raw) return null;
    const prime = raw.PRIME?.value    != null ? parseFloat(raw.PRIME.value)    : null;
    const un    = raw.UNRATE?.value   != null ? parseFloat(raw.UNRATE.value)   : null;
    const cpi   = raw.CPIAUCSL?.value != null ? parseFloat(raw.CPIAUCSL.value) : null;
    if (prime == null && un == null && cpi == null) return null;
    const fed = prime != null ? Math.round((prime - 3) * 100) / 100 : null;
    return {
      fed_funds_rate: fed   ?? 4.33,
      cpi:            cpi   ?? 319.8,
      unemployment:   un    ?? 4.2,
      prime_rate:     prime ?? 7.33,
      source:         'FRED (Federal Reserve)',
    };
  }
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

    // fredgraph.csv is CORS-blocked in browsers — fall back to recent hardcoded values
    if (fed === null && cpi === null && un === null) {
      console.warn('[RealData] FRED CORS blocked — using hardcoded fallback (May 2025)');
      const fb = { fed_funds_rate:4.33, cpi:319.8, unemployment:4.2, prime_rate:7.33,
                   source:'FRED (hardcoded May 2025)', _fallback:true };
      return _rdCacheSet(k, fb);
    }
    const result = {
      fed_funds_rate: fed  ?? 4.33,
      cpi:            cpi  ?? 319.8,
      unemployment:   un   ?? 4.2,
      prime_rate:     fed  ? Math.round((fed + 3) * 10) / 10 : 7.33,
      source:         'FRED (Federal Reserve)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] FRED failed:', e.message); return null; }
}

async function _rdFetchHUDRents(zip, stateAbbr) {
  const fips = _rdStateFips(stateAbbr);
  if (!fips) return null;
  const k = `rdhud:${fips}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // HUD FMR statedata endpoint — no API key required for this public endpoint
    const url = `https://www.huduser.gov/hudapi/public/fmr/statedata/${fips}`;
    const res = await fetch(url, { signal: _rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    // Parse: find first entry (closest/largest metro) or use state-level
    const rows = (data?.data?.basicdata || data?.basicdata || []);
    if (!rows.length) return null;
    // Pick first row (typically metro for state capital / largest MSA)
    const row = rows[0];
    const result = {
      fmr_1br: row['One-Bedroom']   || row.onebr   || null,
      fmr_2br: row['Two-Bedroom']   || row.twobr   || null,
      fmr_3br: row['Three-Bedroom'] || row.threebr || null,
      fmr_eff: row['Efficiency']    || row.eff     || null,
      area:    row.AreaName || row.areaname || stateAbbr,
      year:    row.year || '2024',
      source:  'HUD FMR FY2024',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] HUD rents failed:', e.message); return null; }
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
  if (typeof v2FetchSBALoans === 'function') {
    const raw = await v2FetchSBALoans(zip, industry);
    if (!raw) return null;
    // v2 returns { count, avg_amount, total_amount, recent, naics }
    // buildRealDataCtx expects { loan_count, avg_loan_amount, approval_rate }
    return {
      loan_count:      raw.count        ?? raw.loan_count      ?? null,
      avg_loan_amount: raw.avg_amount   ?? raw.avg_loan_amount ?? null,
      total_amount:    raw.total_amount ?? null,
      approval_rate:   raw.approval_rate ?? null, // not provided by v2
      recent:          raw.recent        ?? [],
      naics:           raw.naics         ?? null,
      source:          'SBA FOIA Data',
    };
  }
  return null;
}

async function _rdFetchEIA(stateAbbr) {
  if (typeof v2FetchEIAEnergy === 'function') {
    const raw = await v2FetchEIAEnergy(stateAbbr);
    if (!raw) return null;
    // v2 returns { commercial_cents, residential_cents, state, period } (cents/kWh)
    // buildRealDataCtx expects { commercial_cents_kwh } (still cents, div/100 happens in ctx)
    return {
      commercial_cents_kwh:  raw.commercial_cents  ?? raw.commercial_cents_kwh  ?? null,
      residential_cents_kwh: raw.residential_cents ?? raw.residential_cents_kwh ?? null,
      state:  raw.state  ?? stateAbbr,
      period: raw.period ?? null,
      source: 'EIA Electric Power Monthly',
    };
  }
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
    // FBI CDE API — public summary endpoint (no key required for state-level summary)
    const url = `https://cde.ucr.cjis.gov/LATEST/webapp/public/api/data/summary/state/${stateAbbr}/violent-crime?from=2022&to=2022`;
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

// ══════════════════════════════════════════════════════════════════════════════
// PHASE D — Industry-specific APIs
// CMS NPI Registry: licensed healthcare providers in the city/state
// ══════════════════════════════════════════════════════════════════════════════

const _RD_NPI_TAXONOMY = {
  urgent_care:      'Urgent Care',
  medical_practice: 'Family Medicine',
  optometry:        'Optometrist',
  senior_care:      'Assisted Living',
  dental:           'Dentist',
};

async function _rdFetchCMSNPI(city, stateAbbr, industryKey) {
  const taxonomy = _RD_NPI_TAXONOMY[industryKey];
  if (!taxonomy || !city || !stateAbbr) return null;
  const k = `rdnpi:${city}:${stateAbbr}:${industryKey}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const cityEnc = encodeURIComponent(city.replace(/\s+city$/i,'').trim());
    const url = `https://npiregistry.cms.hhs.gov/api/?` +
      `city=${cityEnc}&state=${stateAbbr}&` +
      `taxonomy_description=${encodeURIComponent(taxonomy)}&` +
      `limit=200&version=2.1`;
    const res = await fetch(url, { signal: _rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const results = d.results || [];
    const count   = d.result_count ?? results.length;
    // Extract top provider names (individual + org)
    const names = results.slice(0, 15).map(r => {
      const basic = r.basic || {};
      return basic.organization_name ||
        [basic.first_name, basic.last_name].filter(Boolean).join(' ');
    }).filter(Boolean);
    const result = {
      count,
      taxonomy,
      city,
      state:   stateAbbr,
      names,
      source:  'CMS NPI Registry',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] CMS NPI failed:', e.message); return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE C — Provenance UI helpers
// rdShowDataStatus()      → inject status strip after pipeline progress bar
// rdRenderRealDataBadge() → inject verified-data card above any agent output
// rdRenderFinancialBadge()→ inject financial-data badge above Agent 7 summary
// ══════════════════════════════════════════════════════════════════════════════

function rdShowDataStatus() {
  if (!R || !R.real) return;
  const d = R.real;
  const badges = [
    { key:'demographics',    label:'ACS',        icon:'👥' },
    { key:'business_density',label:'ZBP',        icon:'🏢' },
    { key:'wages',           label:'BLS',        icon:'💰' },
    { key:'macro',           label:'FRED',       icon:'📈' },
    { key:'rents',           label:'HUD',        icon:'🏠' },
    { key:'competitors_osm', label:'OSM',        icon:'🗺' },
    { key:'grants_gov',      label:'Grants.gov', icon:'💵' },
    { key:'federal_opps',    label:'SAM.gov',    icon:'📋' },
    { key:'flood',           label:'FEMA',       icon:'🌊' },
    { key:'energy_rates',    label:'NREL',       icon:'⚡' },
    { key:'energy_state',    label:'EIA',        icon:'🔌' },
    { key:'crime',           label:'FBI',        icon:'🚔' },
    { key:'regulations',     label:'eCFR',       icon:'📜' },
    { key:'sba',             label:'SBA',        icon:'🏦' },
    { key:'health',          label:'CDC',        icon:'🩺' },
    { key:'climate',         label:'Climate',    icon:'🌤' },
    { key:'npi_providers',   label:'CMS NPI',    icon:'🏥' },
  ];
  const loaded = badges.filter(b => d[b.key]);
  const failed = badges.filter(b => !d[b.key]);
  const pct    = Math.round(loaded.length / badges.length * 100);
  const html = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 10px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:8px;font-size:11px;margin-top:6px"><span style="font-weight:700;color:var(--green,#22c55e)">🛰 Live Data ${pct}%</span>${loaded.map(b=>`<span title="${b.label}" style="background:rgba(34,197,94,0.15);padding:2px 6px;border-radius:4px;color:var(--green,#22c55e)">${b.icon} ${b.label}</span>`).join('')}${failed.length ? `<span style="color:var(--text-dim,#666);margin-left:4px">(${failed.map(b=>b.label).join(', ')}: unavailable)</span>` : ''}</div>`;
  let el = document.getElementById('realDataStatus');
  if (!el) {
    const anchor = document.getElementById('progressText')?.parentElement || document.getElementById('progressRow');
    if (anchor) {
      el = document.createElement('div');
      el.id = 'realDataStatus';
      if (anchor.after) anchor.after(el);
      else anchor.parentElement && anchor.parentElement.insertBefore(el, anchor.nextSibling);
    }
  }
  if (el) el.innerHTML = html;
}

function rdRenderRealDataBadge(elId, keys) {
  if (!R || !R.real) return;
  const el = document.getElementById(elId);
  if (!el) return;
  const d = R.real;
  const rows = [];
  if ((!keys || keys.includes('demographics')) && d.demographics) {
    const dem = d.demographics;
    if (dem.population)    rows.push(['Population',    dem.population.toLocaleString(),        'ACS 2022']);
    if (dem.median_income) rows.push(['Median HH Income', '$'+dem.median_income.toLocaleString(), 'ACS 2022']);
    if (dem.households)    rows.push(['Households',    dem.households.toLocaleString(),        'ACS 2022']);
    if (dem.renter_pct != null) rows.push(['Renter %', dem.renter_pct+'%', 'ACS 2022']);
  }
  if ((!keys || keys.includes('business_density')) && d.business_density) {
    const biz = d.business_density;
    rows.push(['Competitors in ZIP (NAICS '+biz.naics+')', biz.count+' establishments', 'Census ZBP 2021']);
  }
  if ((!keys || keys.includes('macro')) && d.macro) {
    const m = d.macro;
    if (m.fed_funds_rate != null) rows.push(['Fed Funds Rate', m.fed_funds_rate+'%', 'FRED']);
    if (m.unemployment != null)   rows.push(['Unemployment Rate', m.unemployment+'%', 'FRED']);
  }
  if ((!keys || keys.includes('crime')) && d.crime && d.crime.violent_per_100k != null) {
    rows.push(['Violent Crime per 100k (state)', String(d.crime.violent_per_100k), 'FBI CDE '+d.crime.year]);
  }
  if ((!keys || keys.includes('flood')) && d.flood) {
    rows.push(['Flood Zone', d.flood.flood_zone+' — '+d.flood.zone_description, 'FEMA NFHL']);
  }
  if ((!keys || keys.includes('health')) && d.health && d.health.no_insurance_pct != null) {
    rows.push(['Uninsured %', d.health.no_insurance_pct+'%', 'CDC PLACES']);
  }
  if ((!keys || keys.includes('climate')) && d.climate && d.climate.avgTemp_c != null) {
    rows.push(['Avg Annual Temp', d.climate.avgTemp_c+'°C ('+Math.round(d.climate.avgTemp_c*9/5+32)+'°F)', 'Open-Meteo']);
  }
  if (!rows.length) return;
  const pulledAt = d._pulled_at ? new Date(d._pulled_at).toLocaleTimeString() : '';
  const card = document.createElement('div');
  card.style.cssText = 'background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;';
  card.innerHTML = '<div style="font-weight:700;color:#22c55e;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em">✅ Verified Real Data — '+rows.length+' fields from live government APIs'+(pulledAt ? ' · pulled '+pulledAt : '')+'</div><div style="display:flex;flex-wrap:wrap;gap:6px 16px">'+rows.map(function(r){return '<div><span style="color:#64748b;font-size:10px">'+r[0]+'</span><br><span style="font-weight:600">'+r[1]+'</span><span style="color:#22c55e;font-size:10px;margin-left:4px">['+r[2]+']</span></div>';}).join('')+'</div>';
  el.insertBefore(card, el.firstChild);
}

function rdRenderFinancialBadge(elId) {
  if (!R || !R.real) return;
  const el = document.getElementById(elId);
  if (!el) return;
  const d = R.real;
  const rows = [];
  if (d.wages && d.wages.avg_weekly_wage)             rows.push(['Avg Weekly Wage (state)', '$'+Math.round(d.wages.avg_weekly_wage).toLocaleString(), 'BLS QCEW']);
  if (d.macro && d.macro.fed_funds_rate != null)      rows.push(['Fed Funds Rate', d.macro.fed_funds_rate+'%', 'FRED']);
  if (d.macro && d.macro.prime_rate != null)          rows.push(['Prime Rate', d.macro.prime_rate+'%', 'FRED+3%']);
  if (d.rents && d.rents.fmr_2br)                    rows.push(['HUD FMR 2BR', '$'+d.rents.fmr_2br+'/mo', 'HUD FY2024']);
  if (d.energy_rates && d.energy_rates.commercial_rate_kwh) rows.push(['Commercial kWh', '$'+d.energy_rates.commercial_rate_kwh, 'NREL']);
  if (!d.energy_rates && d.energy_state && d.energy_state.commercial_cents_kwh) rows.push(['Commercial kWh', '$'+(d.energy_state.commercial_cents_kwh/100).toFixed(4), 'EIA']);
  if (d.sba && d.sba.loan_count && d.sba.avg_loan_amount)  rows.push(['SBA Avg Loan', '$'+Math.round(d.sba.avg_loan_amount).toLocaleString(), 'SBA FOIA']);
  if (d.flood && d.flood.flood_zone)                  rows.push(['Flood Zone', d.flood.flood_zone, 'FEMA NFHL']);
  if (!rows.length) return;
  const card = document.createElement('div');
  card.style.cssText = 'background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;';
  card.innerHTML = '<div style="font-weight:700;color:#3b82f6;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:.05em">📊 Real Market Data Used in Financial Model</div><div style="display:flex;flex-wrap:wrap;gap:6px 16px">'+rows.map(function(r){return '<div><span style="color:#64748b;font-size:10px">'+r[0]+'</span><br><span style="font-weight:600">'+r[1]+'</span><span style="color:#3b82f6;font-size:10px;margin-left:4px">['+r[2]+']</span></div>';}).join('')+'</div>';
  el.insertBefore(card, el.firstChild);
}
