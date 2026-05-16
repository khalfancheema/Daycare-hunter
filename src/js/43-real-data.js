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
  const stateFips  = geo?.state_fips || (stateAbbr ? _rdStateFips(stateAbbr) : null);
  const countyFips = geo?.county_fips || null;
  const [
    acsR, zbpR, blsR, fredR, hudR,
    climateR, cdcR, osmR, grantsR,
    samR, femaR, fbiR, nrelR, ecfrR, sbaR, eiaR,
    // Phase E: accuracy upgrades
    acsXR, hudFmrR, echoR, ruralR, cbpR, oesR, ndcpR,
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
    // Phase E
    _rdFetchACSExpanded(zipCode),
    _rdFetchHUDFMR(zipCode, stateAbbr),
    _rdFetchEPAEcho(zipCode),
    (stateFips && countyFips) ? _rdFetchUSDARural(stateFips, countyFips) : Promise.resolve(null),
    (stateFips && countyFips) ? _rdFetchCBPCounty(stateFips, countyFips, naics) : Promise.resolve(null),
    stateAbbr ? _rdFetchBLSOES(stateAbbr, industryKey) : Promise.resolve(null),
    (stateFips && countyFips) ? _rdFetchNDCP(stateFips, countyFips, industryKey) : Promise.resolve(null),
  ]);

  // Phase F batch — separate await chain to keep Promise.allSettled positional aligned
  const [
    faraR, fredLocalR, hudVacR, fbiCityR, ncesR, acsHvR,
  ] = await Promise.allSettled([
    lat && lng ? _rdFetchUSDAFARA(lat, lng) : Promise.resolve(null),
    (stateFips && countyFips) ? _rdFetchFREDLocal(stateFips, countyFips) : Promise.resolve(null),
    _rdFetchHUDVacancy(zipCode),
    city && stateAbbr ? _rdFetchFBICityCrime(city, stateAbbr) : Promise.resolve(null),
    lat && lng ? _rdFetchNCESSchools(lat, lng) : Promise.resolve(null),
    _rdFetchACSHomeValue(zipCode),
  ]);

  // Phase G batch
  const countyName = geo?.county || geo?.county_name || '';
  const [
    sviR, femaDeclR, hudIncR, bpsR, acsImR,
  ] = await Promise.allSettled([
    lat && lng ? _rdFetchCDCSVI(lat, lng) : Promise.resolve(null),
    (stateAbbr && countyName) ? _rdFetchOpenFEMA(stateAbbr, countyName) : Promise.resolve(null),
    stateAbbr ? _rdFetchHUDIncome(stateAbbr) : Promise.resolve(null),
    (stateFips && countyFips) ? _rdFetchBuildingPermits(stateFips, countyFips) : Promise.resolve(null),
    _rdFetchACSIndustryMix(zipCode),
  ]);

  // Phase H batch
  const [
    hpsaR, beaR, migR, quakeR, airR, pepR,
  ] = await Promise.allSettled([
    (stateFips && countyFips) ? _rdFetchHRSAHPSA(stateFips, countyFips) : Promise.resolve(null),
    (stateFips && countyFips) ? _rdFetchBEAIncome(stateFips, countyFips) : Promise.resolve(null),
    _rdFetchACSMigration(zipCode),
    lat && lng ? _rdFetchUSGSQuakes(lat, lng) : Promise.resolve(null),
    _rdFetchEPAAirNow(zipCode),
    (stateFips && countyFips) ? _rdFetchCensusPEP(stateFips, countyFips) : Promise.resolve(null),
  ]);

  // Phase I batch — LEHD LODES skipped (CSV.gz unfetchable from browser; placeholder for future JSON endpoint)
  const lodesR = { status: 'fulfilled', value: null };
  const [
    fccR, chrR, ozR, noaaR, placesXR,
  ] = await Promise.allSettled([
    lat && lng ? _rdFetchFCCBroadband(lat, lng) : Promise.resolve(null),
    (stateFips && countyFips) ? _rdFetchCountyHealthRankings(stateFips, countyFips) : Promise.resolve(null),
    lat && lng ? _rdFetchOpportunityZone(lat, lng) : Promise.resolve(null),
    (stateFips && countyFips) ? _rdFetchNOAAClimate(stateFips, countyFips) : Promise.resolve(null),
    (stateAbbr && countyName) ? _rdFetchCDCPlacesExpanded(stateAbbr, countyName) : Promise.resolve(null),
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
    // Phase E: accuracy upgrades
    acs_expanded:     v(acsXR),
    hud_fmr:          v(hudFmrR),
    epa_echo:         v(echoR),
    rural_urban:      v(ruralR),
    cbp_county:       v(cbpR),
    bls_oes:          v(oesR),
    ndcp_county:      v(ndcpR),
    // Phase F batch
    food_access:      v(faraR),
    local_unemp:      v(fredLocalR),
    hud_vacancy:      v(hudVacR),
    crime_city:       v(fbiCityR),
    schools:          v(ncesR),
    acs_home_value:   v(acsHvR),
    // Phase G batch
    cdc_svi:          v(sviR),
    fema_disasters:   v(femaDeclR),
    hud_income:       v(hudIncR),
    building_permits: v(bpsR),
    acs_industry_mix: v(acsImR),
    // Phase H batch
    hrsa_hpsa:        v(hpsaR),
    bea_income:       v(beaR),
    acs_migration:    v(migR),
    seismic:          v(quakeR),
    air_quality:      v(airR),
    census_pep:       v(pepR),
    // Phase I batch
    fcc_broadband:    v(fccR),
    lehd_lodes:       v(lodesR),
    county_health:    v(chrR),
    opportunity_zone: v(ozR),
    noaa_climate:     v(noaaR),
    cdc_places_x:     v(placesXR),
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

  // Warn about absent API keys that silently null out sources
  if (typeof window !== 'undefined') {
    const missing = [];
    // CRITICAL: Census now requires a key for ALL /data/* endpoints. Without
    // it ACS demographics, ZBP business density, CBP, PEP, BPS and 4 other
    // sources all return Missing Key HTML and null out silently.
    if (!window.CENSUS_API_KEY) missing.push('🚨 CENSUS_API_KEY (REQUIRED for ACS, ZBP, CBP, PEP, BPS, ACS Expanded, Home Value, Industry Mix, Migration — get free at api.census.gov/data/key_signup.html)');
    if (!window.HUD_TOKEN)      missing.push('HUD_TOKEN (HUD FMR/Income/Vacancy)');
    if (!window.BEA_API_KEY)    missing.push('BEA_API_KEY (BEA per-capita income)');
    if (!window.NOAA_TOKEN)     missing.push('NOAA_TOKEN (NOAA climate normals)');
    if (!window.AIRNOW_API_KEY) missing.push('AIRNOW_API_KEY (EPA AirNow AQI)');
    if (!window.BLS_API_KEY)    missing.push('BLS_API_KEY (BLS OES occupation wages)');
    if (!window.FRED_API_KEY)   missing.push('FRED_API_KEY (FRED LAUS county unemployment)');
    if (missing.length) {
      console.warn(`[RealData] ⚠ ${missing.length} API keys absent (sources will return null):\n  - ` + missing.join('\n  - ') + '\nSet via window.<KEY_NAME> = "..." before pipeline runs to enable.');
    }
  }
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

  // ── Phase E: Accuracy upgrade blocks ─────────────────────────────────────
  if (want('acs_expanded') && d.acs_expanded) {
    const x = d.acs_expanded;
    lines.push(`📊 ACS EXPANDED [${x.source}]`);
    if (x.female_lfp_pct != null)         lines.push(`  female_labor_force_participation: ${x.female_lfp_pct}% (S2301)`);
    if (x.poverty_pct != null)            lines.push(`  poverty_rate: ${x.poverty_pct}% (B17001)`);
    if (x.married_w_children_pct != null) lines.push(`  married_with_children_pct: ${x.married_w_children_pct}% (B11003)`);
    if (x.median_gross_rent != null)      lines.push(`  median_gross_rent: $${x.median_gross_rent}/mo (B25064)`);
    if (x.vacancy_pct != null)            lines.push(`  housing_vacancy_pct: ${x.vacancy_pct}% (B25002)`);
    if (x.long_commute_pct != null)       lines.push(`  long_commute_60min_pct: ${x.long_commute_pct}% (B08303)`);
  }

  if (want('hud_fmr') && d.hud_fmr) {
    const f = d.hud_fmr;
    lines.push(`🏠 HUD FAIR MARKET RENT [${f.source}]`);
    lines.push(`  area: ${f.area_name}`);
    if (f.fmr_studio) lines.push(`  fmr_studio: $${f.fmr_studio}/mo`);
    if (f.fmr_1br)    lines.push(`  fmr_1br: $${f.fmr_1br}/mo`);
    if (f.fmr_2br)    lines.push(`  fmr_2br: $${f.fmr_2br}/mo`);
    if (f.fmr_3br)    lines.push(`  fmr_3br: $${f.fmr_3br}/mo`);
    if (f.fmr_4br)    lines.push(`  fmr_4br: $${f.fmr_4br}/mo`);
  }

  if (want('epa_echo') && d.epa_echo) {
    const e = d.epa_echo;
    lines.push(`🏭 EPA ECHO ENVIRONMENTAL [${e.source}]`);
    lines.push(`  regulated_facilities_in_zip: ${e.total_regulated}`);
    lines.push(`  facilities_with_violations: ${e.with_violations}`);
    if (e.facility_names.length) lines.push(`  facility_examples: ${e.facility_names.slice(0, 3).join(', ')}`);
  }

  if (want('rural_urban') && d.rural_urban) {
    const r = d.rural_urban;
    lines.push(`🌾 USDA RURAL-URBAN [${r.source}]`);
    lines.push(`  county: ${r.county_name}`);
    lines.push(`  rucc_code: ${r.rucc_code} — ${r.classification}`);
    lines.push(`  description: ${r.description}`);
  }

  if (want('cbp_county') && d.cbp_county) {
    const c = d.cbp_county;
    lines.push(`🏢 COUNTY BUSINESS PATTERNS [${c.source}]`);
    lines.push(`  county_establishments (NAICS ${c.naics}): ${c.establishments}`);
    if (c.employees) lines.push(`  county_industry_employees: ${c.employees.toLocaleString()}`);
    if (c.annual_payroll) lines.push(`  county_annual_payroll: $${(c.annual_payroll * 1000).toLocaleString()}`);
  }

  if (want('bls_oes') && d.bls_oes && d.bls_oes.median_annual_wage) {
    const o = d.bls_oes;
    lines.push(`💵 BLS OCCUPATION WAGES [${o.source}]`);
    lines.push(`  occupation: ${o.occupation} (SOC ${o.soc_code})`);
    lines.push(`  median_annual_wage_state: $${o.median_annual_wage.toLocaleString()}`);
    lines.push(`  median_hourly_wage_state: $${o.median_hourly_wage}/hr`);
  }

  if (want('ndcp_county') && d.ndcp_county) {
    const n = d.ndcp_county;
    lines.push(`👶 DOL NDCP CHILDCARE PRICES [${n.source}]`);
    if (n.median_infant_center)     lines.push(`  median_infant_center_monthly: $${n.median_infant_center}`);
    if (n.median_toddler_center)    lines.push(`  median_toddler_center_monthly: $${n.median_toddler_center}`);
    if (n.median_preschool_center)  lines.push(`  median_preschool_center_monthly: $${n.median_preschool_center}`);
    if (n.median_school_age_center) lines.push(`  median_school_age_center_monthly: $${n.median_school_age_center}`);
    if (n.median_family_care)       lines.push(`  median_family_care_monthly: $${n.median_family_care}`);
  }

  // ── Phase F: more accuracy data ──────────────────────────────────────────
  if (want('food_access') && d.food_access) {
    const f = d.food_access;
    lines.push(`🥕 USDA FOOD ACCESS [${f.source}]`);
    lines.push(`  is_food_desert: ${f.is_food_desert}`);
    lines.push(`  urban_tract: ${f.urban_flag}`);
    if (f.low_access_pop_pct != null)    lines.push(`  low_access_pop_pct: ${f.low_access_pop_pct}%`);
    if (f.low_vehicle_access_pct != null) lines.push(`  low_vehicle_access_pct: ${f.low_vehicle_access_pct}%`);
    if (f.snap_households)               lines.push(`  snap_households_in_tract: ${f.snap_households.toLocaleString()}`);
  }

  if (want('local_unemp') && d.local_unemp) {
    const u = d.local_unemp;
    lines.push(`📉 LOCAL UNEMPLOYMENT [${u.source}]`);
    lines.push(`  county_unemployment_rate: ${u.unemployment_rate}% (${u.period})`);
  }

  if (want('hud_vacancy') && d.hud_vacancy) {
    const h = d.hud_vacancy;
    lines.push(`🏚 HUD USPS VACANCY [${h.source}]`);
    if (h.vacancy_pct_resid != null) lines.push(`  residential_vacancy_pct: ${h.vacancy_pct_resid}%`);
    if (h.vacancy_pct_biz != null)   lines.push(`  business_vacancy_pct: ${h.vacancy_pct_biz}%`);
  }

  if (want('crime_city') && d.crime_city && d.crime_city.violent_per_100k != null) {
    const cc = d.crime_city;
    lines.push(`🚔 CITY-LEVEL CRIME [${cc.source} ${cc.year||''}]`);
    lines.push(`  violent_crime_per_100k_city: ${cc.violent_per_100k} (${cc.city})`);
    lines.push(`  agency: ${cc.agency}, population: ${cc.population.toLocaleString()}`);
  }

  if (want('schools') && d.schools) {
    const s = d.schools;
    lines.push(`🎓 NCES PUBLIC SCHOOLS [${s.source}]`);
    lines.push(`  public_schools_within_5mi: ${s.total_public_schools_5mi}`);
    if (s.elementary_count) lines.push(`  elementary: ${s.elementary_count}, middle: ${s.middle_count}, high: ${s.high_count}`);
    if (s.total_enrollment) lines.push(`  total_enrollment_5mi: ${s.total_enrollment.toLocaleString()}`);
    if (s.example_names.length) lines.push(`  examples: ${s.example_names.slice(0, 3).join(', ')}`);
  }

  if (want('acs_home_value') && d.acs_home_value) {
    const hv = d.acs_home_value;
    lines.push(`🏡 ACS HOUSING VALUE [${hv.source}]`);
    if (hv.median_home_value)    lines.push(`  median_home_value: $${hv.median_home_value.toLocaleString()}`);
    if (hv.median_monthly_costs) lines.push(`  median_monthly_housing_costs: $${hv.median_monthly_costs}`);
  }

  // ── Phase G: more accuracy data ───────────────────────────────────────────
  if (want('cdc_svi') && d.cdc_svi && d.cdc_svi.svi_overall != null) {
    const s = d.cdc_svi;
    lines.push(`⚠ CDC SOCIAL VULNERABILITY [${s.source}]`);
    lines.push(`  svi_overall_percentile: ${s.svi_overall} (tier: ${s.vulnerability_tier})`);
    if (s.socioeconomic_status != null) lines.push(`  socioeconomic_pctile: ${s.socioeconomic_status}`);
    if (s.household_chars != null)      lines.push(`  household_composition_pctile: ${s.household_chars}`);
    if (s.housing_transport != null)    lines.push(`  housing_transport_pctile: ${s.housing_transport}`);
  }

  if (want('fema_disasters') && d.fema_disasters) {
    const f = d.fema_disasters;
    lines.push(`⛈ FEMA DISASTERS [${f.source}]`);
    lines.push(`  declared_disasters_10yr: ${f.disasters_10yr} (${f.county})`);
    if (f.most_recent_type) lines.push(`  most_recent: ${f.most_recent_type} (${f.most_recent_date?.slice(0,10) || 'unknown'})`);
    const topTypes = Object.entries(f.types || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (topTypes.length) lines.push(`  top_types: ${topTypes.map(([t, n]) => `${t} (${n})`).join(', ')}`);
  }

  if (want('hud_income') && d.hud_income) {
    const h = d.hud_income;
    lines.push(`💰 HUD INCOME LIMITS [${h.source}]`);
    if (h.median_family_income) lines.push(`  median_family_income: $${h.median_family_income.toLocaleString()}`);
    if (h.low_income_4_person)  lines.push(`  low_income_threshold_4p: $${h.low_income_4_person.toLocaleString()}`);
    if (h.very_low_income_4p)   lines.push(`  very_low_income_threshold_4p: $${h.very_low_income_4p.toLocaleString()}`);
  }

  if (want('building_permits') && d.building_permits) {
    const b = d.building_permits;
    lines.push(`🏗 CENSUS BUILDING PERMITS [${b.source}]`);
    if (b.permits_total) lines.push(`  total_permits_${b.year}: ${b.permits_total.toLocaleString()}`);
    if (b.units_total)   lines.push(`  total_housing_units_${b.year}: ${b.units_total.toLocaleString()}`);
  }

  if (want('acs_industry_mix') && d.acs_industry_mix) {
    const i = d.acs_industry_mix;
    lines.push(`🏭 ACS INDUSTRY MIX [${i.source}]`);
    if (i.total_workers) lines.push(`  total_workers_in_zip: ${i.total_workers.toLocaleString()}`);
    if (i.retail_pct != null)          lines.push(`  retail_pct: ${i.retail_pct}%`);
    if (i.prof_scientific_pct != null) lines.push(`  prof_scientific_pct: ${i.prof_scientific_pct}%`);
    if (i.edu_healthcare_pct != null)  lines.push(`  edu_healthcare_pct: ${i.edu_healthcare_pct}%`);
    if (i.arts_entertain_pct != null)  lines.push(`  arts_entertain_pct: ${i.arts_entertain_pct}%`);
    if (i.per_capita_income)           lines.push(`  per_capita_income: $${i.per_capita_income.toLocaleString()} (B19301)`);
  }

  // ── Phase H: more accuracy data ───────────────────────────────────────────
  if (want('hrsa_hpsa') && d.hrsa_hpsa) {
    const h = d.hrsa_hpsa;
    lines.push(`⚕ HRSA SHORTAGE AREA [${h.source}]`);
    lines.push(`  health_shortage_designations: ${h.designations_count}`);
    if (h.avg_hpsa_score) lines.push(`  avg_hpsa_score: ${h.avg_hpsa_score} (max ${h.score_max}, higher=worse)`);
    if (h.population_underserved) lines.push(`  underserved_population: ${h.population_underserved.toLocaleString()}`);
    if (h.ftes_needed)     lines.push(`  primary_care_ftes_needed: ${h.ftes_needed}`);
  }

  if (want('bea_income') && d.bea_income) {
    const b = d.bea_income;
    lines.push(`📈 BEA REGIONAL INCOME [${b.source}]`);
    if (b.per_capita_personal_income) lines.push(`  per_capita_personal_income_${b.year}: $${b.per_capita_personal_income.toLocaleString()}`);
    if (b.growth_5yr_pct != null)     lines.push(`  income_growth_5yr_pct: ${b.growth_5yr_pct}%`);
    if (b.county_name)                lines.push(`  area: ${b.county_name}`);
  }

  if (want('acs_migration') && d.acs_migration) {
    const m = d.acs_migration;
    lines.push(`🚚 ACS MIGRATION/MOBILITY [${m.source}]`);
    if (m.same_house_pct != null)           lines.push(`  same_house_1yr_pct: ${m.same_house_pct}%`);
    if (m.newcomers_1yr_pct != null)        lines.push(`  newcomers_within_1yr_pct: ${m.newcomers_1yr_pct}%`);
    if (m.from_outside_county_pct != null)  lines.push(`  from_outside_county_pct: ${m.from_outside_county_pct}%`);
    if (m.from_different_state_pct != null) lines.push(`  from_different_state_pct: ${m.from_different_state_pct}%`);
    if (m.international_movers_pct != null) lines.push(`  international_movers_pct: ${m.international_movers_pct}%`);
  }

  if (want('seismic') && d.seismic) {
    const s = d.seismic;
    lines.push(`🌋 USGS SEISMIC RISK [${s.source}]`);
    lines.push(`  earthquakes_50yr_within_100km: ${s.quakes_50yr_within_100km}`);
    if (s.max_magnitude != null) lines.push(`  max_historical_magnitude: M${s.max_magnitude}`);
    if (s.quakes_m5_plus != null) lines.push(`  significant_quakes_m5+: ${s.quakes_m5_plus}`);
    if (s.most_recent_major) lines.push(`  most_recent_major_quake: ${s.most_recent_major}`);
    lines.push(`  seismic_risk_tier: ${s.seismic_risk}`);
  }

  if (want('air_quality') && d.air_quality) {
    const a = d.air_quality;
    lines.push(`🌫 EPA AIR QUALITY [${a.source}]`);
    if (a.reporting_area)  lines.push(`  reporting_area: ${a.reporting_area}, ${a.state}`);
    if (a.aqi_ozone)       lines.push(`  aqi_ozone: ${a.aqi_ozone}`);
    if (a.aqi_pm25)        lines.push(`  aqi_pm25: ${a.aqi_pm25}`);
    if (a.aqi_pm10)        lines.push(`  aqi_pm10: ${a.aqi_pm10}`);
    if (a.worst_category)  lines.push(`  worst_category: ${a.worst_category}`);
  }

  if (want('census_pep') && d.census_pep) {
    const p = d.census_pep;
    lines.push(`📊 CENSUS POPULATION ESTIMATES [${p.source}]`);
    if (p.county_name)       lines.push(`  county: ${p.county_name}`);
    if (p.pop_2023)          lines.push(`  population_2023: ${p.pop_2023.toLocaleString()}`);
    if (p.pop_growth_1yr_pct != null) lines.push(`  population_growth_1yr_pct: ${p.pop_growth_1yr_pct}%`);
    if (p.pop_growth_3yr_pct != null) lines.push(`  population_growth_3yr_pct: ${p.pop_growth_3yr_pct}%`);
  }

  // ── Phase I: more accuracy data ───────────────────────────────────────────
  if (want('fcc_broadband') && d.fcc_broadband) {
    const f = d.fcc_broadband;
    lines.push(`📡 FCC AREA [${f.source}]`);
    if (f.block_pop_2020 != null) lines.push(`  block_pop_2020: ${f.block_pop_2020.toLocaleString()}`);
    if (f.county_name)            lines.push(`  county: ${f.county_name}`);
    if (f.block_fips)             lines.push(`  census_block_fips: ${f.block_fips}`);
  }

  if (want('county_health') && d.county_health) {
    const c = d.county_health;
    lines.push(`🏥 COUNTY HEALTH RANKINGS [${c.source}]`);
    if (c.health_outcomes_rank) lines.push(`  health_outcomes_rank: ${c.health_outcomes_rank} (lower=better)`);
    if (c.health_factors_rank)  lines.push(`  health_factors_rank: ${c.health_factors_rank}`);
    if (c.uninsured_pct != null) lines.push(`  uninsured_pct: ${c.uninsured_pct}%`);
    if (c.pcp_ratio)             lines.push(`  primary_care_physician_ratio: ${c.pcp_ratio}`);
    if (c.mental_health_provider_ratio) lines.push(`  mental_health_provider_ratio: ${c.mental_health_provider_ratio}`);
  }

  if (want('opportunity_zone') && d.opportunity_zone) {
    const o = d.opportunity_zone;
    lines.push(`🎯 OPPORTUNITY ZONE [${o.source}]`);
    lines.push(`  is_qualified_opportunity_zone: ${o.is_opportunity_zone}`);
    if (o.tract_geoid)   lines.push(`  census_tract: ${o.tract_geoid}`);
    if (o.tax_benefit)   lines.push(`  tax_benefit: ${o.tax_benefit}`);
  }

  if (want('noaa_climate') && d.noaa_climate) {
    const n = d.noaa_climate;
    lines.push(`🌡 NOAA CLIMATE NORMALS [${n.source}]`);
    if (n.annual_avg_temp_f != null) lines.push(`  annual_avg_temp: ${n.annual_avg_temp_f}°F`);
    if (n.annual_max_temp_f != null) lines.push(`  annual_max_temp: ${n.annual_max_temp_f}°F`);
    if (n.annual_min_temp_f != null) lines.push(`  annual_min_temp: ${n.annual_min_temp_f}°F`);
    if (n.annual_precip_in != null)  lines.push(`  annual_precip_in: ${n.annual_precip_in}"`);
    if (n.annual_snowfall_in != null) lines.push(`  annual_snowfall_in: ${n.annual_snowfall_in}"`);
    if (n.cooling_degree_days != null) lines.push(`  cooling_degree_days: ${n.cooling_degree_days}`);
    if (n.heating_degree_days != null) lines.push(`  heating_degree_days: ${n.heating_degree_days}`);
  }

  if (want('cdc_places_x') && d.cdc_places_x) {
    const p = d.cdc_places_x;
    lines.push(`🩹 CDC PLACES EXPANDED [${p.source}]`);
    if (p.mental_health_bad_pct != null) lines.push(`  mental_health_bad_pct: ${p.mental_health_bad_pct}%`);
    if (p.sleep_short_pct != null)       lines.push(`  short_sleep_pct: ${p.sleep_short_pct}%`);
    if (p.smoking_pct != null)           lines.push(`  smoking_pct: ${p.smoking_pct}%`);
    if (p.binge_drinking_pct != null)    lines.push(`  binge_drinking_pct: ${p.binge_drinking_pct}%`);
    if (p.coronary_heart_pct != null)    lines.push(`  coronary_heart_pct: ${p.coronary_heart_pct}%`);
    if (p.copd_pct != null)              lines.push(`  copd_pct: ${p.copd_pct}%`);
    if (p.stroke_pct != null)            lines.push(`  stroke_pct: ${p.stroke_pct}%`);
    if (p.asthma_pct != null)            lines.push(`  asthma_pct: ${p.asthma_pct}%`);
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
    const r = await v2GeocodeAddress(zip);
    // Augment with county_fips if missing (needed by CBP, USDA, NDCP fetchers)
    if (r && !r.county_fips && r.lat && r.lng) {
      try {
        const fcc = await fetch(`https://geo.fcc.gov/api/census/area?lat=${r.lat}&lon=${r.lng}&format=json`, { signal:_rdAbortTimeout(6000) });
        if (fcc.ok) {
          const fd = await fcc.json();
          const block = fd?.results?.[0];
          if (block) {
            r.county_fips = (block.county_fips || '').slice(-3);
            r.state_fips  = (block.state_fips  || '').padStart(2, '0');
          }
        }
      } catch {}
    }
    return r;
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
    const lat = parseFloat(d[0].lat);
    const lng = parseFloat(d[0].lon);
    // FCC lookup for county FIPS (free, no key)
    let countyFips = null, stateFips = null;
    try {
      const fcc = await fetch(`https://geo.fcc.gov/api/census/area?lat=${lat}&lon=${lng}&format=json`, { signal:_rdAbortTimeout(6000) });
      if (fcc.ok) {
        const fd = await fcc.json();
        const block = fd?.results?.[0];
        if (block) {
          countyFips = (block.county_fips || '').slice(-3);
          stateFips  = (block.state_fips  || '').padStart(2, '0');
        }
      }
    } catch {}
    const result = {
      lat, lng,
      city:        a.city||a.town||a.county||'',
      county:      a.county||'',
      state:       a.state||'',
      state_abbr:  _rdStateAbbr(a.state||''),
      county_fips: countyFips,
      state_fips:  stateFips,
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { return null; }
}

// Census API requires a key for EVERY data API request as of 2024.
// Free key at https://api.census.gov/data/key_signup.html. Without it, all
// /data/* endpoints return a "Missing Key" HTML page (still HTTP 200) which
// fails JSON.parse and yields null. This helper returns the &key= suffix
// when window.CENSUS_API_KEY is set, otherwise an empty string.
function _rdCensusKeySuffix() {
  const k = (typeof window !== 'undefined' && window.CENSUS_API_KEY) ? window.CENSUS_API_KEY : null;
  return k ? `&key=${k}` : '';
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
    const url = `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}${_rdCensusKeySuffix()}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('<title>Missing Key')) return null;
    let d; try { d = JSON.parse(text); } catch { return null; }
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
    const url = `https://api.census.gov/data/2021/zbp?get=EMP,ESTAB,PAYANN&for=zipcode:${zip}&NAICS2017=${naics}${_rdCensusKeySuffix()}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('<title>Missing Key')) return null;
    let d; try { d = JSON.parse(text); } catch { return null; }
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
// PHASE E — ACCURACY UPGRADE FETCHERS (added 2026-05-16)
// All free, no key required (or graceful no-key fallback)
// ══════════════════════════════════════════════════════════════════════════════

// ── BLS SOC codes for occupation-specific wages ──────────────────────────────
const _RD_OES_SOC = {
  daycare:          { code:'39-9011', label:'Childcare Workers' },
  gas_station:      { code:'41-2011', label:'Cashiers' },
  laundromat:       { code:'37-2012', label:'Maids/Housekeeping Cleaners' },
  car_wash:         { code:'53-7062', label:'Laborers/Material Movers' },
  restaurant:       { code:'35-3031', label:'Waiters/Waitresses' },
  gym:              { code:'39-9031', label:'Fitness Trainers' },
  indoor_play:      { code:'39-3091', label:'Amusement/Recreation Attendants' },
  dry_cleaning:     { code:'51-6011', label:'Laundry/Dry-Cleaning Workers' },
  senior_care:      { code:'31-1121', label:'Home Health Aides' },
  tutoring:         { code:'25-3000', label:'Other Teachers/Instructors' },
  urgent_care:      { code:'29-1141', label:'Registered Nurses' },
  coffee_shop:      { code:'35-3023', label:'Fast Food/Counter Workers' },
  barbershop:       { code:'39-5012', label:'Hairdressers/Cosmetologists' },
  coworking:        { code:'43-4171', label:'Receptionists/Information Clerks' },
  medical_practice: { code:'29-1141', label:'Registered Nurses' },
  optometry:        { code:'29-1041', label:'Optometrists' },
};

// ── ACS Expanded: pull additional tables in single endpoint call ──────────────
async function _rdFetchACSExpanded(zip) {
  const k = 'rdacs2:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // S2301_C04_001E = female LFP rate; B17001_002E = below poverty count; B17001_001E = total for poverty calc
    // B11003_001E = total households with children; B11003_002E = married couple w/ children
    // B25064_001E = median gross rent; B25002_003E = vacant housing units; B25002_001E = total housing units
    // B08303_001E = total commuters; B08303_013E = commuters 60+ min
    const vars = 'S2301_C04_001E,B17001_001E,B17001_002E,B11003_001E,B11003_002E,B25064_001E,B25002_001E,B25002_003E,B08303_001E,B08303_013E';
    // Subject tables (S) must use /subject endpoint
    const subjUrl = `https://api.census.gov/data/2022/acs/acs5/subject?get=S2301_C04_001E&for=zip%20code%20tabulation%20area:${zip}${_rdCensusKeySuffix()}`;
    const detUrl  = `https://api.census.gov/data/2022/acs/acs5?get=B17001_001E,B17001_002E,B11003_001E,B11003_002E,B25064_001E,B25002_001E,B25002_003E,B08303_001E,B08303_013E&for=zip%20code%20tabulation%20area:${zip}${_rdCensusKeySuffix()}`;
    const parseCensus = async r => {
      if (!r || !r.ok) return null;
      const t = await r.text();
      if (t.includes('<title>Missing Key')) return null;
      try { return JSON.parse(t); } catch { return null; }
    };
    const [sR, dR] = await Promise.allSettled([
      fetch(subjUrl, { signal:_rdAbortTimeout(10000) }).then(parseCensus),
      fetch(detUrl,  { signal:_rdAbortTimeout(10000) }).then(parseCensus),
    ]);
    const s = sR.status === 'fulfilled' ? sR.value : null;
    const d = dR.status === 'fulfilled' ? dR.value : null;
    if (!s && !d) return null;
    const sRow = s && s.length > 1 ? s[1] : null;
    const dRow = d && d.length > 1 ? d[1] : null;
    const femaleLFP    = sRow ? parseFloat(sRow[0]) : null;
    const povTotal     = dRow ? parseInt(dRow[0])   : null;
    const povBelow     = dRow ? parseInt(dRow[1])   : null;
    const hhAll        = dRow ? parseInt(dRow[2])   : null;
    const hhMarried    = dRow ? parseInt(dRow[3])   : null;
    const medGrossRent = dRow ? parseInt(dRow[4])   : null;
    const housingTotal = dRow ? parseInt(dRow[5])   : null;
    const housingVac   = dRow ? parseInt(dRow[6])   : null;
    const commuteTotal = dRow ? parseInt(dRow[7])   : null;
    const commute60Plus= dRow ? parseInt(dRow[8])   : null;
    const result = {
      female_lfp_pct:       femaleLFP > 0 ? Math.round(femaleLFP*10)/10 : null,
      poverty_pct:          (povBelow > 0 && povTotal > 0) ? Math.round(povBelow/povTotal*1000)/10 : null,
      married_w_children_pct: (hhMarried > 0 && hhAll > 0) ? Math.round(hhMarried/hhAll*1000)/10 : null,
      median_gross_rent:    medGrossRent > 0 ? medGrossRent : null,
      vacancy_pct:          (housingVac > 0 && housingTotal > 0) ? Math.round(housingVac/housingTotal*1000)/10 : null,
      long_commute_pct:     (commute60Plus > 0 && commuteTotal > 0) ? Math.round(commute60Plus/commuteTotal*1000)/10 : null,
      source: 'ACS 5-Year 2022 (S2301, B17001, B11003, B25064, B25002, B08303)',
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] ACS Expanded failed:', e.message); return null; }
}

// ── HUD Fair Market Rent ──────────────────────────────────────────────────────
// Free public token: register at huduser.gov/portal/dataset/fmr-api.html
// Without token: gracefully fail (returns null). With token in window.HUD_TOKEN: returns FMR.
async function _rdFetchHUDFMR(zip, stateAbbr) {
  const token = (typeof window !== 'undefined' && window.HUD_TOKEN) ? window.HUD_TOKEN : null;
  if (!token || !zip) return null;
  const k = 'rdhudfmr:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // First try ZIP-level Small Area FMR endpoint
    const url = `https://www.huduser.gov/hudapi/public/fmr/data/${zip}99999`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: _rdAbortTimeout(10000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const data = d.data || d;
    const result = {
      fmr_studio: data.basicdata?.['Efficiency'] || data.fmr_0 || null,
      fmr_1br:    data.basicdata?.['One-Bedroom'] || data.fmr_1 || null,
      fmr_2br:    data.basicdata?.['Two-Bedroom'] || data.fmr_2 || null,
      fmr_3br:    data.basicdata?.['Three-Bedroom'] || data.fmr_3 || null,
      fmr_4br:    data.basicdata?.['Four-Bedroom'] || data.fmr_4 || null,
      area_name:  data.metroname || data.area_name || stateAbbr,
      year:       data.year || '2026',
      source:     'HUD FMR FY2026',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] HUD FMR failed:', e.message); return null; }
}

// ── EPA ECHO — Hazardous facilities by ZIP ──────────────────────────────────
async function _rdFetchEPAEcho(zip) {
  if (!zip) return null;
  const k = 'rdecho:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const url = `https://echodata.epa.gov/echo/echo_rest_services.get_facilities?output=JSON&p_zip=${zip}&p_act=Y&qcolumns=1,4,12,19`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const facs = d?.Results?.Facilities || [];
    const violators = facs.filter(f => (f.CWAFormalActionCount > 0 || f.CAAFormalActionCount > 0 || f.RCRA3yrFormalActionCount > 0));
    const result = {
      total_regulated: facs.length,
      with_violations: violators.length,
      facility_names: facs.slice(0, 5).map(f => f.FacName || f.RegistryID).filter(Boolean),
      source: 'EPA ECHO',
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] EPA ECHO failed:', e.message); return null; }
}

// ── USDA Rural-Urban Continuum Code (2023) ──────────────────────────────────
// Returns 1-3 = metro, 4-9 = nonmetro/rural
async function _rdFetchUSDARural(stateFips, countyFips) {
  if (!stateFips || !countyFips) return null;
  const fips = `${stateFips}${countyFips}`;
  const k = 'rdusda:'+fips;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // USDA ERS hosts the Rural Atlas County Classifications (RUCC 2013 + metro/nonmetro flags).
    // The standalone 2023 RUCC MapServer is not exposed publicly; the 2013 service is the
    // current public REST endpoint (methodology unchanged for the metro/rural cutoff).
    const url = `https://gisportal.ers.usda.gov/server/rest/services/Rural_Atlas_Data/County_Classifications/MapServer/0/query?where=FIPSTXT%3D%27${fips}%27&outFields=FIPSTXT,County,State,RuralUrbanContinuumCode2013,Metro2013&returnGeometry=false&f=json`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const feat = d.features?.[0]?.attributes;
    if (!feat) return null;
    const code = parseInt(feat.RuralUrbanContinuumCode2013);
    const result = {
      rucc_code:      code,
      classification: code <= 3 ? 'metro' : 'rural/nonmetro',
      metro_flag:     feat.Metro2013 === 1 || feat.Metro2013 === '1',
      county_name:    feat.County,
      state:          feat.State,
      source:         'USDA ERS Rural-Urban Continuum 2013 (current public REST)',
      fips,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] USDA Rural failed:', e.message); return null; }
}

// ── Census CBP — County-level NAICS-specific establishment counts ────────────
async function _rdFetchCBPCounty(stateFips, countyFips, naics) {
  if (!stateFips || !countyFips || !naics) return null;
  const k = `rdcbp:${stateFips}${countyFips}:${naics}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // Census CBP requires window.CENSUS_API_KEY (free at api.census.gov/data/key_signup.html)
    const url = `https://api.census.gov/data/2022/cbp?get=ESTAB,EMP,PAYANN&for=county:${countyFips}&in=state:${stateFips}&NAICS2017=${naics}${_rdCensusKeySuffix()}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('<title>Missing Key')) return null;
    let d; try { d = JSON.parse(text); } catch { return null; }
    if (!d || d.length < 2) return null;
    const row = d[1];
    const result = {
      establishments: parseInt(row[0]) || 0,
      employees:      parseInt(row[1]) || 0,
      annual_payroll: parseInt(row[2]) || 0,
      naics,
      source: 'Census CBP 2022 (county-level)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] CBP County failed:', e.message); return null; }
}

// ── BLS OES — Occupation-specific median wages by state ─────────────────────
// Uses BLS public API v2 with key (already used by _rdFetchBLSWages) or no-key (25 series/day limit)
async function _rdFetchBLSOES(stateAbbr, industryKey) {
  if (!stateAbbr) return null;
  const soc = _RD_OES_SOC[industryKey];
  if (!soc) return null;
  const stateFips = _rdStateFips(stateAbbr);
  if (!stateFips) return null;
  const k = `rdoes:${stateAbbr}:${soc.code}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // OEUS series: OEUS + state(2) + areatype(M=state, etc) + areacode(00000) + industry + SOC(7) + datatype(04=annual median)
    const socClean = soc.code.replace('-', '');
    const seriesId = `OEUS${stateFips}00000000000${socClean}04`;
    const blsKey = (typeof window !== 'undefined' && window.BLS_API_KEY) ? window.BLS_API_KEY : null;
    const body = blsKey
      ? { seriesid:[seriesId], registrationkey:blsKey, latest:true }
      : { seriesid:[seriesId], latest:true };
    const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(body),
      signal: _rdAbortTimeout(10000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const series = d.Results?.series?.[0];
    const latest = series?.data?.[0];
    if (!latest || latest.value === '-') return null;
    const annualMedian = parseInt(latest.value);
    const result = {
      occupation:        soc.label,
      soc_code:          soc.code,
      median_annual_wage: annualMedian > 0 ? annualMedian : null,
      median_hourly_wage: annualMedian > 0 ? Math.round(annualMedian / 2080 * 100) / 100 : null,
      state:             stateAbbr,
      year:              latest.year,
      source:            'BLS OES (May 2024)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] BLS OES failed:', e.message); return null; }
}

// ── DOL NDCP — Childcare prices by county (for daycare only) ─────────────────
async function _rdFetchNDCP(stateFips, countyFips, industryKey) {
  if (industryKey !== 'daycare') return null;
  if (!stateFips || !countyFips) return null;
  const fips = `${stateFips}${countyFips}`;
  const k = 'rdndcp:'+fips;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // Data.gov NDCP endpoint (latest 2022 dataset)
    const url = `https://www.dol.gov/sites/dolgov/files/WB/NDCP/nationaldatabaseofchildcareprices.csv`;
    // CSV is large (~5MB); skip large fetch in browser unless cached server-side
    // Use the simpler DOL data.gov JSON endpoint if available
    const altUrl = `https://data.dol.gov/get/childcare-prices/limit/1/filter/county_fips_code:${fips}`;
    const res = await fetch(altUrl, { signal:_rdAbortTimeout(8000) });
    if (!res.ok) return null;
    const d = await res.json();
    const row = Array.isArray(d) ? d[0] : (d?.results?.[0] || d?.data?.[0]);
    if (!row) return null;
    const result = {
      county_fips:       fips,
      median_infant_center:    parseInt(row.mc_infant) || null,
      median_toddler_center:   parseInt(row.mc_toddler) || null,
      median_preschool_center: parseInt(row.mc_preschool) || null,
      median_school_age_center:parseInt(row.mc_schoolage) || null,
      median_family_care:      parseInt(row.mfc_infant) || null,
      study_year:        row.studyyear || '2022',
      source:            'DOL Womens Bureau NDCP 2022',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] NDCP failed:', e.message); return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE F — ACCURACY UPGRADE BATCH 2 (added 2026-05-16)
// More free sources, no new auth required
// ══════════════════════════════════════════════════════════════════════════════

// ── USDA FARA — Food Access Research Atlas (food desert flag) ────────────────
async function _rdFetchUSDAFARA(lat, lng) {
  if (!lat || !lng) return null;
  const k = `rdfara:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // USDA ERS FARA 2019. Folder is /FARA/FARA_2019 (NOT /FoodAccessResearchAtlas/...)
    // Layer 30 = "All tracts" with full attribute schema for point-in-polygon lookup.
    const url = `https://gisportal.ers.usda.gov/server/rest/services/FARA/FARA_2019/MapServer/30/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=CensusTract,LILATracts_1And10,LILATracts_halfAnd10,LowIncomeTracts,TractSNAP,TractLOWI&returnGeometry=false&f=json`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const a = d.features?.[0]?.attributes;
    if (!a) return null;
    const result = {
      tract_fips:        a.CensusTract || null,
      is_food_desert:    a.LILATracts_1And10 === 1 || a.LILATracts_halfAnd10 === 1,
      low_income_low_access: a.LILATracts_1And10 === 1,
      low_income_tract:  a.LowIncomeTracts === 1,
      snap_households:    a.TractSNAP,
      low_income_pop:     a.TractLOWI,
      source:             'USDA FARA 2019 (Census tracts)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] USDA FARA failed:', e.message); return null; }
}

// ── FRED LAUC — Local Area Unemployment by county ────────────────────────────
async function _rdFetchFREDLocal(stateFips, countyFips) {
  if (!stateFips || !countyFips) return null;
  const fips = `${stateFips}${countyFips}`;
  const k = 'rdfredl:'+fips;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  const fredKey = (typeof window !== 'undefined' && window.FRED_API_KEY) ? window.FRED_API_KEY : null;
  if (!fredKey) return null;
  try {
    // LAUCN{fips}0000000003 = unemployment rate, LAUCN{fips}0000000005 = civilian labor force
    const series = `LAUCN${fips}0000000003`;
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${fredKey}&file_type=json&sort_order=desc&limit=1`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const obs = d.observations?.[0];
    if (!obs || obs.value === '.') return null;
    const result = {
      unemployment_rate: parseFloat(obs.value),
      period:            obs.date,
      county_fips:       fips,
      source:            'FRED LAUS (county-level BLS)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] FRED local failed:', e.message); return null; }
}

// ── HUD USPS Vacancy Crosswalk ───────────────────────────────────────────────
async function _rdFetchHUDVacancy(zip) {
  if (!zip) return null;
  const token = (typeof window !== 'undefined' && window.HUD_TOKEN) ? window.HUD_TOKEN : null;
  if (!token) return null;
  const k = 'rdhudvac:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // USPS Vacancy data via HUD; type=1 = ZIP→county crosswalk with vacancy
    const url = `https://www.huduser.gov/hudapi/public/usps?type=1&query=${zip}&year=2024&quarter=4`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: _rdAbortTimeout(10000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const data = d.data?.results?.[0] || d.results?.[0];
    if (!data) return null;
    const result = {
      total_residential:   parseInt(data.res || data.tot_ratio) || null,
      total_business:      parseInt(data.bus || data.bus_ratio) || null,
      residential_vacant:  parseFloat(data.vac_3_res) || null,
      business_vacant:     parseFloat(data.vac_3_bus) || null,
      vacancy_pct_resid:   data.vac_3_res != null ? Math.round(parseFloat(data.vac_3_res) * 1000) / 10 : null,
      vacancy_pct_biz:     data.vac_3_bus != null ? Math.round(parseFloat(data.vac_3_bus) * 1000) / 10 : null,
      source:              'HUD USPS Crosswalk Q4 2024',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] HUD vacancy failed:', e.message); return null; }
}

// ── FBI city-level violent crime ─────────────────────────────────────────────
async function _rdFetchFBICityCrime(city, stateAbbr) {
  if (!city || !stateAbbr) return null;
  const k = `rdfbic:${stateAbbr}:${city}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // FBI CDE agency-level endpoint by state — find matching ORI
    const url = `https://cde.ucr.cjis.gov/LATEST/webapp/public/api/data/summary/agencies/${stateAbbr}?from=2022&to=2022`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const agencies = Array.isArray(d) ? d : (d.data || []);
    const cityNorm = city.toLowerCase().replace(/\s+(city|town|village)$/i, '').trim();
    const match = agencies.find(a => {
      const n = (a.agency_name || a.ori_name || '').toLowerCase();
      return n.includes(cityNorm) && /police|sheriff|dept/i.test(n);
    });
    if (!match) return null;
    const pop = match.population || 1;
    const vc  = match.violent_crime || match.actual_violent || 0;
    const result = {
      city:             city,
      state:            stateAbbr,
      violent_per_100k: vc ? Math.round(vc / pop * 100000) : null,
      year:             match.data_year || 2022,
      population:       pop,
      agency:           match.agency_name || match.ori_name,
      source:           'FBI CDE (city)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] FBI city crime failed:', e.message); return null; }
}

// ── NCES Schools by location (within radius) ─────────────────────────────────
async function _rdFetchNCESSchools(lat, lng) {
  if (!lat || !lng) return null;
  const k = `rdnces:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // NCES EDGE ArcGIS REST service — public schools layer; 5-mile buffer
    // Public Schools Composite layer ID may vary; use SDE schools layer
    const url = `https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/Public_School_Locations_Current/FeatureServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&distance=8047&units=esriSRUnit_Meter&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=NAME,SCH_NAME,LEVEL,ENROLLMENT&returnGeometry=false&f=json&resultRecordCount=15`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const feats = d.features || [];
    if (!feats.length) return null;
    const schools = feats.map(f => f.attributes || {});
    const elementary = schools.filter(s => /elem|primary/i.test(s.LEVEL || ''));
    const middle     = schools.filter(s => /mid/i.test(s.LEVEL || ''));
    const high       = schools.filter(s => /high|secondary/i.test(s.LEVEL || ''));
    const totalEnroll = schools.reduce((s, x) => s + (parseInt(x.ENROLLMENT) || 0), 0);
    const result = {
      total_public_schools_5mi: schools.length,
      elementary_count:    elementary.length,
      middle_count:        middle.length,
      high_count:          high.length,
      total_enrollment:    totalEnroll,
      example_names:       schools.slice(0, 5).map(s => s.SCH_NAME || s.NAME).filter(Boolean),
      source:              'NCES EDGE Public School Locations',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] NCES schools failed:', e.message); return null; }
}

// ── Census ACS Home Value (B25077) — supplements existing ACS Expanded ──────
async function _rdFetchACSHomeValue(zip) {
  const k = 'rdacshv:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // B25077_001E = median value of owner-occupied housing units
    // B25104_001E = monthly housing costs (median) — owner+renter combined
    const url = `https://api.census.gov/data/2022/acs/acs5?get=B25077_001E,B25104_001E,B25088_001E&for=zip%20code%20tabulation%20area:${zip}${_rdCensusKeySuffix()}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('<title>Missing Key')) return null;
    let d; try { d = JSON.parse(text); } catch { return null; }
    if (!d || d.length < 2) return null;
    const row = d[1];
    const result = {
      median_home_value:        parseInt(row[0]) || null,
      median_monthly_costs:     parseInt(row[1]) || null,
      median_mortgage_payment:  parseInt(row[2]) || null,
      source:                   'ACS 5-Year 2022 (B25077, B25104, B25088)',
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] ACS home value failed:', e.message); return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE G — ACCURACY UPGRADE BATCH 3 (added 2026-05-16)
// CDC SVI · OpenFEMA · HUD Income Limits · Building Permits · Industry/Occ ACS
// ══════════════════════════════════════════════════════════════════════════════

// ── CDC SVI — Social Vulnerability Index by census tract ─────────────────────
async function _rdFetchCDCSVI(lat, lng) {
  if (!lat || !lng) return null;
  const k = `rdsvi:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // CDC SVI 2022 ArcGIS feature service — point-in-tract query
    const url = `https://services3.arcgis.com/0H2dKpzCAR1efkVR/arcgis/rest/services/Overall_2022_Tracts/FeatureServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FIPS,RPL_THEMES,RPL_THEME1,RPL_THEME2,RPL_THEME3,RPL_THEME4&returnGeometry=false&f=json`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const a = d.features?.[0]?.attributes;
    if (!a) return null;
    const result = {
      tract_fips:           a.FIPS,
      svi_overall:          parseFloat(a.RPL_THEMES),
      socioeconomic_status: parseFloat(a.RPL_THEME1),
      household_chars:      parseFloat(a.RPL_THEME2),
      racial_ethnic:        parseFloat(a.RPL_THEME3),
      housing_transport:    parseFloat(a.RPL_THEME4),
      vulnerability_tier:   parseFloat(a.RPL_THEMES) >= 0.75 ? 'High' : parseFloat(a.RPL_THEMES) >= 0.5 ? 'Medium-High' : parseFloat(a.RPL_THEMES) >= 0.25 ? 'Medium-Low' : 'Low',
      source:               'CDC SVI 2022',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] CDC SVI failed:', e.message); return null; }
}

// ── OpenFEMA — Disaster declarations by county ───────────────────────────────
async function _rdFetchOpenFEMA(stateAbbr, countyName) {
  if (!stateAbbr || !countyName) return null;
  const k = `rdfema:${stateAbbr}:${countyName}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // OpenFEMA v2 DisasterDeclarationsSummaries — last 10 years
    const cutoff = `${new Date().getFullYear() - 10}-01-01T00:00:00.000Z`;
    const cnClean = countyName.replace(/\s+(County|Parish|Borough)$/i, '');
    const url = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=state eq '${stateAbbr}' and incidentBeginDate ge '${cutoff}' and designatedArea eq '${cnClean} (County)'&$select=disasterNumber,declarationDate,incidentType,declarationTitle&$top=20`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const events = d.DisasterDeclarationsSummaries || [];
    const byType = {};
    events.forEach(e => {
      const t = e.incidentType || 'Other';
      byType[t] = (byType[t] || 0) + 1;
    });
    const result = {
      county:              countyName,
      state:               stateAbbr,
      disasters_10yr:      events.length,
      types:               byType,
      most_recent_date:    events[0]?.declarationDate || null,
      most_recent_type:    events[0]?.incidentType || null,
      most_recent_title:   events[0]?.declarationTitle || null,
      source:              'OpenFEMA Disaster Declarations',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] OpenFEMA failed:', e.message); return null; }
}

// ── HUD Income Limits — Section 8 / LIHTC thresholds ─────────────────────────
async function _rdFetchHUDIncome(stateAbbr) {
  const token = (typeof window !== 'undefined' && window.HUD_TOKEN) ? window.HUD_TOKEN : null;
  if (!token || !stateAbbr) return null;
  const k = 'rdhudinc:'+stateAbbr;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const url = `https://www.huduser.gov/hudapi/public/il/data/${stateAbbr}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: _rdAbortTimeout(10000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const data = d.data || d;
    const result = {
      state:                stateAbbr,
      median_family_income: data.median_income || null,
      low_income_4_person:  data.low?.l50_4 || data.l50_4 || null,
      very_low_income_4p:   data.very_low?.l30_4 || data.l30_4 || null,
      extremely_low_4p:     data.extremely_low?.l30_4 || null,
      year:                 data.year || '2025',
      source:               'HUD Income Limits 2025',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] HUD Income failed:', e.message); return null; }
}

// ── Census Building Permits Survey — recent residential permits ──────────────
async function _rdFetchBuildingPermits(stateFips, countyFips) {
  if (!stateFips || !countyFips) return null;
  const k = `rdbps:${stateFips}${countyFips}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // Census BPS county-level annual; latest year typically year-1
    const yr = new Date().getFullYear() - 1;
    const url = `https://api.census.gov/data/timeseries/eits/bps?get=permits,units_total&for=county:${countyFips}&in=state:${stateFips}&time=${yr}${_rdCensusKeySuffix()}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('<title>Missing Key')) return null;
    let d; try { d = JSON.parse(text); } catch { return null; }
    if (!d || d.length < 2) return null;
    const row = d[1];
    const result = {
      permits_total:    parseInt(row[0]) || null,
      units_total:      parseInt(row[1]) || null,
      year:             yr,
      source:           `Census BPS ${yr}`,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] Building permits failed:', e.message); return null; }
}

// ── ACS Industry / Occupation mix (C24050, C24010) ──────────────────────────
async function _rdFetchACSIndustryMix(zip) {
  const k = 'rdacsim:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // C24050 Industry by occupation; pull total + top categories
    // C24050_001 total, _002 ag/mining/construction, _003 manufacturing, _004 wholesale,
    // _005 retail, _006 transport/util, _007 information, _008 finance, _009 prof/sci,
    // _010 educational/health, _011 arts/entertainment, _012 other svc, _013 public admin
    const vars = 'C24050_001E,C24050_005E,C24050_009E,C24050_010E,C24050_011E,B19301_001E';
    // B19301_001E = per capita income
    const url = `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}${_rdCensusKeySuffix()}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('<title>Missing Key')) return null;
    let d; try { d = JSON.parse(text); } catch { return null; }
    if (!d || d.length < 2) return null;
    const row = d[1];
    const total = parseInt(row[0]) || 0;
    const retail = parseInt(row[1]) || 0;
    const profsci = parseInt(row[2]) || 0;
    const eduhealth = parseInt(row[3]) || 0;
    const artsent = parseInt(row[4]) || 0;
    const perCapInc = parseInt(row[5]) || null;
    const pct = n => total > 0 ? Math.round(n / total * 1000) / 10 : null;
    const result = {
      total_workers:       total > 0 ? total : null,
      retail_pct:          pct(retail),
      prof_scientific_pct: pct(profsci),
      edu_healthcare_pct:  pct(eduhealth),
      arts_entertain_pct:  pct(artsent),
      per_capita_income:   perCapInc,
      source:              'ACS 5-Year 2022 (C24050, B19301)',
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] ACS industry mix failed:', e.message); return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE H — ACCURACY UPGRADE BATCH 4 (added 2026-05-16)
// HRSA HPSA · BEA · ACS Migration · USGS Earthquakes · EPA AirNow · Census PEP
// ══════════════════════════════════════════════════════════════════════════════

// ── HRSA HPSA — Health Professional Shortage Areas ───────────────────────────
async function _rdFetchHRSAHPSA(stateFips, countyFips) {
  if (!stateFips || !countyFips) return null;
  const fips = `${stateFips}${countyFips}`;
  const k = 'rdhpsa:'+fips;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // HRSA ArcGIS REST — HPSA Primary Care + Mental Health + Dental
    const url = `https://services.arcgis.com/qWZ7BaZXaP5isnfT/arcgis/rest/services/HPSA_PC_2024/FeatureServer/0/query?where=COUNTY_EQUIVALENT_FIPS_CODE='${fips}'&outFields=*&returnGeometry=false&f=json&resultRecordCount=10`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const feats = d.features || [];
    if (!feats.length) return null;
    const designations = feats.map(f => f.attributes || {});
    const totalScore = designations.reduce((s, a) => s + (a.HPSA_SCORE || 0), 0);
    const avgScore = designations.length ? Math.round(totalScore / designations.length) : null;
    const popUnderserved = designations.reduce((s, a) => s + (a.HPSA_DESIGNATION_POPULATION || 0), 0);
    const ftesNeeded = designations.reduce((s, a) => s + (a.HPSA_FTE || 0), 0);
    const result = {
      designations_count:    designations.length,
      avg_hpsa_score:        avgScore,
      score_max:             Math.max(...designations.map(d => d.HPSA_SCORE || 0)),
      population_underserved: popUnderserved,
      ftes_needed:           Math.round(ftesNeeded * 10) / 10,
      is_shortage_area:      true,
      source:                'HRSA HPSA Primary Care 2024',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] HRSA HPSA failed:', e.message); return null; }
}

// ── BEA Regional Per Capita Personal Income (county) ────────────────────────
async function _rdFetchBEAIncome(stateFips, countyFips) {
  if (!stateFips || !countyFips) return null;
  const fips = `${stateFips}${countyFips}`;
  const k = 'rdbea:'+fips;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  const beaKey = (typeof window !== 'undefined' && window.BEA_API_KEY) ? window.BEA_API_KEY : null;
  if (!beaKey) return null;
  try {
    // BEA CAINC1 - Per Capita Personal Income (county)
    const url = `https://apps.bea.gov/api/data?UserID=${beaKey}&method=GetData&datasetname=Regional&TableName=CAINC1&LineCode=3&GeoFIPS=${fips}&Year=LAST5&ResultFormat=JSON`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const rows = d.BEAAPI?.Results?.Data || [];
    if (!rows.length) return null;
    // Get most recent year
    rows.sort((a, b) => parseInt(b.TimePeriod) - parseInt(a.TimePeriod));
    const latest = rows[0];
    const oldest = rows[rows.length - 1];
    const latestVal = parseFloat((latest.DataValue || '').replace(/,/g, ''));
    const oldestVal = parseFloat((oldest.DataValue || '').replace(/,/g, ''));
    const growth5yr = oldestVal > 0 ? Math.round((latestVal / oldestVal - 1) * 1000) / 10 : null;
    const result = {
      per_capita_personal_income: latestVal || null,
      year:                       latest.TimePeriod,
      growth_5yr_pct:             growth5yr,
      county_name:                latest.GeoName,
      source:                     'BEA Regional CAINC1',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] BEA failed:', e.message); return null; }
}

// ── ACS Migration Flows (B07001) — mover stats ───────────────────────────────
async function _rdFetchACSMigration(zip) {
  const k = 'rdmig:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // B07001_001 = total pop 1yr+; _017 = same house 1yr ago; _033 = same county;
    // _049 = different county same state; _065 = different state; _081 = abroad
    const vars = 'B07001_001E,B07001_017E,B07001_033E,B07001_049E,B07001_065E,B07001_081E';
    const url = `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}${_rdCensusKeySuffix()}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('<title>Missing Key')) return null;
    let d; try { d = JSON.parse(text); } catch { return null; }
    if (!d || d.length < 2) return null;
    const row = d[1];
    const total = parseInt(row[0]) || 0;
    const sameH = parseInt(row[1]) || 0;
    const newcomers = total - sameH;
    const fromOutCounty = (parseInt(row[3]) || 0) + (parseInt(row[4]) || 0) + (parseInt(row[5]) || 0);
    const pct = n => total > 0 ? Math.round(n / total * 1000) / 10 : null;
    const result = {
      population_1yr_plus:      total > 0 ? total : null,
      same_house_pct:           pct(sameH),
      newcomers_1yr_pct:        pct(newcomers),
      from_outside_county_pct:  pct(fromOutCounty),
      from_different_state_pct: pct(parseInt(row[4]) || 0),
      international_movers_pct: pct(parseInt(row[5]) || 0),
      source:                   'ACS 5-Year 2022 (B07001)',
      zip,
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] ACS migration failed:', e.message); return null; }
}

// ── USGS Earthquakes — historical seismic activity ───────────────────────────
async function _rdFetchUSGSQuakes(lat, lng) {
  if (!lat || !lng) return null;
  const k = `rdusgs:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // USGS Earthquake catalog API — past 50 years, M3.0+, within 100km
    const startDate = `${new Date().getFullYear() - 50}-01-01`;
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startDate}&latitude=${lat}&longitude=${lng}&maxradiuskm=100&minmagnitude=3.0&limit=200`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const quakes = d.features || [];
    if (!quakes.length) {
      return { quakes_50yr_within_100km: 0, max_magnitude: null, seismic_risk: 'Low', source: 'USGS' };
    }
    const mags = quakes.map(q => q.properties?.mag || 0);
    const maxMag = Math.max(...mags);
    const lastMaj = quakes.find(q => (q.properties?.mag || 0) >= 5);
    const result = {
      quakes_50yr_within_100km: quakes.length,
      max_magnitude:           Math.round(maxMag * 10) / 10,
      quakes_m5_plus:          quakes.filter(q => (q.properties?.mag || 0) >= 5).length,
      most_recent_major:       lastMaj ? new Date(lastMaj.properties.time).toISOString().slice(0, 10) : null,
      seismic_risk:            maxMag >= 6 ? 'High' : maxMag >= 5 ? 'Moderate' : maxMag >= 4 ? 'Low-Moderate' : 'Low',
      source:                  'USGS Earthquake Catalog',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] USGS quakes failed:', e.message); return null; }
}

// ── EPA AirNow — current air quality index ───────────────────────────────────
async function _rdFetchEPAAirNow(zip) {
  if (!zip) return null;
  const k = 'rdairnow:'+zip;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  const airKey = (typeof window !== 'undefined' && window.AIRNOW_API_KEY) ? window.AIRNOW_API_KEY : null;
  // AirNow needs key but free; without key, try OpenAQ fallback
  if (!airKey) {
    try {
      // OpenAQ v2 location measurement endpoint (no key required)
      const url = `https://api.openaq.org/v2/latest?limit=10&country=US&radius=10000&order_by=lastUpdated&sort=desc`;
      const res = await fetch(url, { signal:_rdAbortTimeout(8000) });
      if (!res.ok) return null;
      // We don't have coords; bail. OpenAQ needs lat/lon for radius search.
      return null;
    } catch { return null; }
  }
  try {
    const url = `https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&zipCode=${zip}&distance=25&API_KEY=${airKey}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const ozone = data.find(d => d.ParameterName === 'O3');
    const pm25  = data.find(d => d.ParameterName === 'PM2.5');
    const pm10  = data.find(d => d.ParameterName === 'PM10');
    const result = {
      reporting_area: data[0].ReportingArea,
      state:          data[0].StateCode,
      observed_date:  data[0].DateObserved,
      aqi_ozone:      ozone?.AQI || null,
      aqi_pm25:       pm25?.AQI || null,
      aqi_pm10:       pm10?.AQI || null,
      worst_category: data.reduce((w, d) => (d.AQI > (w?.AQI || 0) ? d : w), null)?.Category?.Name || null,
      source:         'EPA AirNow',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] AirNow failed:', e.message); return null; }
}

// ── Census Population Estimates Program (PEP) — newer than ACS 5-year ───────
async function _rdFetchCensusPEP(stateFips, countyFips) {
  if (!stateFips || !countyFips) return null;
  const k = `rdpep:${stateFips}${countyFips}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // Population Estimates 2023 county-level
    const url = `https://api.census.gov/data/2023/pep/population?get=POP_2023,POP_2022,POP_2020,NAME&for=county:${countyFips}&in=state:${stateFips}${_rdCensusKeySuffix()}`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes('<title>Missing Key')) return null;
    let d; try { d = JSON.parse(text); } catch { return null; }
    if (!d || d.length < 2) return null;
    const row = d[1];
    const pop2023 = parseInt(row[0]) || null;
    const pop2022 = parseInt(row[1]) || null;
    const pop2020 = parseInt(row[2]) || null;
    const growth1yr = (pop2023 && pop2022 && pop2022 > 0) ? Math.round((pop2023 / pop2022 - 1) * 1000) / 10 : null;
    const growth3yr = (pop2023 && pop2020 && pop2020 > 0) ? Math.round((pop2023 / pop2020 - 1) * 1000) / 10 : null;
    const result = {
      county_name:     row[3],
      pop_2023:        pop2023,
      pop_growth_1yr_pct: growth1yr,
      pop_growth_3yr_pct: growth3yr,
      source:          'Census PEP 2023',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] Census PEP failed:', e.message); return null; }
}

// ══════════════════════════════════════════════════════════════════════════════
// PHASE I — ACCURACY UPGRADE BATCH 5 (added 2026-05-16)
// FCC Broadband · LEHD LODES · CHR · OZ · NOAA · CDC PLACES expanded
// ══════════════════════════════════════════════════════════════════════════════

// ── FCC Broadband Map — broadband availability by location ───────────────────
async function _rdFetchFCCBroadband(lat, lng) {
  if (!lat || !lng) return null;
  const k = `rdfcc:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // FCC Area API — geographic lookup for census block + 2020 block population (no key).
    // The previously-attempted broadbandmap.fcc.gov BDC summary endpoint is
    // not public and times out, so we report block geography only.
    const url = `https://geo.fcc.gov/api/census/area?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const block = d?.results?.[0];
    if (!block) return null;
    const result = {
      block_fips:        block.block_fips || null,
      county_fips:       block.county_fips || null,
      county_name:       block.county_name || null,
      state_fips:        block.state_fips || null,
      state_code:        block.state_code || null,
      block_pop_2020:    block.block_pop_2020 || null,
      source:            'FCC Area API (Census 2020 block geography)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] FCC Broadband failed:', e.message); return null; }
}

// ── Census LEHD LODES — workplace area characteristics ──────────────────────
async function _rdFetchLEHDLODES(stateFips, countyFips) {
  if (!stateFips || !countyFips) return null;
  const k = `rdlodes:${stateFips}${countyFips}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // LEHD WAC (Workplace Area Characteristics) county-level via LED API
    // C000 = total jobs; CE01 = $1250/mo and below; CE02 = $1251-$3333; CE03 = $3334+
    // CNS18 = Information; CNS19 = Finance; CNS20 = Real Estate
    const stateAbbr = Object.keys(_RD_FIPS).find(k => _RD_FIPS[k] === stateFips);
    if (!stateAbbr) return null;
    const url = `https://api.lehd.ces.census.gov/data/lodes/LODES8/${stateAbbr.toLowerCase()}/wac/${stateAbbr.toLowerCase()}_wac_S000_JT00_2021.csv.gz`;
    // Direct CSV (large); use alternative API endpoint
    const altUrl = `https://lehd.ces.census.gov/data/lodes/LODES8/${stateAbbr.toLowerCase()}/wac/${stateAbbr.toLowerCase()}_wac_S000_JT00_2021.csv.gz`;
    // CSV.gz too heavy for browser fetch; skip LODES if no JSON endpoint
    // Use OnTheMap analysis endpoint instead
    const onthemapUrl = `https://onthemap.ces.census.gov/v616/server/services/onthemapServiceArea/datasource?st=${stateFips}&ct=${countyFips}&year=2021`;
    // No working public JSON endpoint discovered; return null gracefully
    return null;
  } catch(e) { console.warn('[RealData] LEHD LODES failed:', e.message); return null; }
}

// ── County Health Rankings (RWJF) ───────────────────────────────────────────
async function _rdFetchCountyHealthRankings(stateFips, countyFips) {
  if (!stateFips || !countyFips) return null;
  const fips = `${stateFips}${countyFips}`;
  const k = 'rdchr:'+fips;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // CHR 2024 via University of Wisconsin Population Health Institute / RWJF hosted FeatureServer
    // Layer 2 = County-level; raw fields are v###_rawvalue:
    //   v001 = Premature death (YPLL rate)
    //   v003 = Uninsured 18-64 (proportion, 0-1)
    //   v004 = PCP per 100k (rate)
    //   v024 = Children in poverty (proportion, 0-1)
    //   v062 = Mental health providers per 100k (rate)
    //   v063 = Median household income (USD)
    const url = `https://services.arcgis.com/HRPe58bUyBqyyiCt/arcgis/rest/services/County_Health_Rankings_2024_Test_2/FeatureServer/2/query?where=fipscode%3D%27${fips}%27&outFields=fipscode,county,state,v001_rawvalue,v003_rawvalue,v004_rawvalue,v024_rawvalue,v062_rawvalue,v063_rawvalue&returnGeometry=false&f=json`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const a = d.features?.[0]?.attributes;
    if (!a) return null;
    // CHR raw values for percent measures are already in 0-100 scale (not 0-1 proportion).
    const uninsuredPct = a.v003_rawvalue != null ? Math.round(a.v003_rawvalue * 10) / 10 : null;
    const childPovPct  = a.v024_rawvalue != null ? Math.round(a.v024_rawvalue * 10) / 10 : null;
    const result = {
      county_fips:           fips,
      county_name:           a.county || null,
      state:                 a.state || null,
      premature_death_ypll:  a.v001_rawvalue != null ? Math.round(a.v001_rawvalue) : null,
      uninsured_pct:         uninsuredPct,
      pcp_ratio:             a.v004_rawvalue != null ? Math.round(a.v004_rawvalue) : null,
      mental_health_provider_ratio: a.v062_rawvalue != null ? Math.round(a.v062_rawvalue) : null,
      child_poverty_pct:     childPovPct,
      median_hh_income:      a.v063_rawvalue != null ? Math.round(a.v063_rawvalue) : null,
      source:                'County Health Rankings 2024 (UW-PHI / RWJF)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] CHR failed:', e.message); return null; }
}

// ── Treasury Qualified Opportunity Zones ─────────────────────────────────────
async function _rdFetchOpportunityZone(lat, lng) {
  if (!lat || !lng) return null;
  const k = `rdoz:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    // HUD hosted Treasury-designated QOZ tract FeatureServer (layer ID 13)
    // Layer only contains the ~8,764 designated tracts — a hit means the point is in a QOZ,
    // an empty features array means the point is NOT in a QOZ (a valid negative answer).
    const url = `https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Opportunity_Zones/FeatureServer/13/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=GEOID10,STATE,STATE_NAME,Rural&returnGeometry=false&f=json`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const d = await res.json();
    const a = d.features?.[0]?.attributes;
    const isOZ = !!a; // any feature returned = point intersects an OZ tract
    const result = {
      tract_geoid:         a?.GEOID10 || null,
      is_opportunity_zone: isOZ,
      state_name:          a?.STATE_NAME || null,
      rural:               a?.Rural != null ? !!a.Rural : null,
      tax_benefit:         isOZ ? 'Federal capital gains deferral + 10-year basis step-up + tax-free appreciation after 10yr' : null,
      source:              'HUD / Treasury Designated QOZ',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] Opportunity Zone failed:', e.message); return null; }
}

// ── NOAA Climate Normals 1991-2020 ──────────────────────────────────────────
async function _rdFetchNOAAClimate(stateFips, countyFips) {
  if (!stateFips || !countyFips) return null;
  const fips = `${stateFips}${countyFips}`;
  const k = 'rdnoaa:'+fips;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  const noaaKey = (typeof window !== 'undefined' && window.NOAA_TOKEN) ? window.NOAA_TOKEN : null;
  if (!noaaKey) return null;
  try {
    // NOAA NCEI normals API — county-level climate
    const url = `https://www.ncei.noaa.gov/cdo-web/api/v2/data?datasetid=NORMAL_ANN&locationid=FIPS:${fips}&startdate=2010-01-01&enddate=2010-12-31&limit=20`;
    const res = await fetch(url, {
      headers: { 'token': noaaKey },
      signal: _rdAbortTimeout(10000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const results = d.results || [];
    if (!results.length) return null;
    const findVal = id => {
      const r = results.find(x => x.datatype === id);
      return r ? r.value / 10 : null; // NOAA values are tenths
    };
    const result = {
      county_fips:           fips,
      annual_avg_temp_f:     findVal('ANN-TAVG-NORMAL'),
      annual_max_temp_f:     findVal('ANN-TMAX-NORMAL'),
      annual_min_temp_f:     findVal('ANN-TMIN-NORMAL'),
      annual_precip_in:      findVal('ANN-PRCP-NORMAL'),
      annual_snowfall_in:    findVal('ANN-SNOW-NORMAL'),
      cooling_degree_days:   findVal('ANN-CLDD-BASE65'),
      heating_degree_days:   findVal('ANN-HTDD-BASE65'),
      source:                'NOAA NCEI Normals 1991-2020',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] NOAA failed:', e.message); return null; }
}

// ── CDC PLACES expanded — additional health metrics ─────────────────────────
async function _rdFetchCDCPlacesExpanded(stateAbbr, countyName) {
  if (!stateAbbr || !countyName) return null;
  const k = `rdplaces:${stateAbbr}:${countyName}`;
  if (_rdCacheGet(k)) return _rdCacheGet(k);
  try {
    const cnClean = countyName.replace(/\s+(County|Parish|Borough)$/i, '');
    // CDC PLACES 2024 county data via Socrata SODA API (no key needed for limited queries)
    // NOTE: actual fields are lowercase: stateabbr + locationname (county name), NOT countyname.
    const url = `https://data.cdc.gov/resource/swc5-untb.json?stateabbr=${stateAbbr}&locationname=${encodeURIComponent(cnClean)}&$limit=50`;
    const res = await fetch(url, { signal:_rdAbortTimeout(10000) });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    const findMeasure = (m) => {
      const r = rows.find(x => x.measureid === m || x.short_question_text?.toLowerCase().includes(m.toLowerCase()));
      return r ? parseFloat(r.data_value) : null;
    };
    const result = {
      county:                cnClean,
      state:                 stateAbbr,
      mental_health_bad_pct: findMeasure('MHLTH'),
      sleep_short_pct:       findMeasure('SLEEP'),
      smoking_pct:           findMeasure('CSMOKING'),
      binge_drinking_pct:    findMeasure('BINGE'),
      coronary_heart_pct:    findMeasure('CHD'),
      copd_pct:              findMeasure('COPD'),
      stroke_pct:            findMeasure('STROKE'),
      cancer_pct:            findMeasure('CANCER'),
      asthma_pct:            findMeasure('CASTHMA'),
      source:                'CDC PLACES 2024 (expanded measures)',
    };
    return _rdCacheSet(k, result);
  } catch(e) { console.warn('[RealData] CDC PLACES expanded failed:', e.message); return null; }
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
    // Phase E additions
    { key:'acs_expanded',    label:'ACS+',       icon:'📊' },
    { key:'hud_fmr',         label:'HUD FMR',    icon:'🏠' },
    { key:'epa_echo',        label:'EPA ECHO',   icon:'🏭' },
    { key:'rural_urban',     label:'USDA RUCC',  icon:'🌾' },
    { key:'cbp_county',      label:'CBP',        icon:'🏢' },
    { key:'bls_oes',         label:'BLS OES',    icon:'💵' },
    { key:'ndcp_county',     label:'NDCP',       icon:'👶' },
    // Phase F additions
    { key:'food_access',     label:'FARA',       icon:'🥕' },
    { key:'local_unemp',     label:'LAUS',       icon:'📉' },
    { key:'hud_vacancy',     label:'USPS Vac',   icon:'🏚' },
    { key:'crime_city',      label:'FBI City',   icon:'🚔' },
    { key:'schools',         label:'NCES',       icon:'🎓' },
    { key:'acs_home_value',  label:'ACS HV',     icon:'🏡' },
    // Phase G additions
    { key:'cdc_svi',         label:'CDC SVI',    icon:'⚠' },
    { key:'fema_disasters',  label:'FEMA Decl',  icon:'⛈' },
    { key:'hud_income',      label:'HUD Inc',    icon:'💰' },
    { key:'building_permits',label:'BPS',        icon:'🏗' },
    { key:'acs_industry_mix',label:'ACS Ind',    icon:'🏭' },
    // Phase H additions
    { key:'hrsa_hpsa',       label:'HRSA',       icon:'⚕' },
    { key:'bea_income',      label:'BEA',        icon:'📈' },
    { key:'acs_migration',   label:'ACS Mig',    icon:'🚚' },
    { key:'seismic',         label:'USGS',       icon:'🌋' },
    { key:'air_quality',     label:'AirNow',     icon:'🌫' },
    { key:'census_pep',      label:'PEP',        icon:'📊' },
    // Phase I additions
    { key:'fcc_broadband',   label:'FCC BB',     icon:'📡' },
    { key:'county_health',   label:'CHR',        icon:'🏥' },
    { key:'opportunity_zone',label:'QOZ',        icon:'🎯' },
    { key:'noaa_climate',    label:'NOAA',       icon:'🌡' },
    { key:'cdc_places_x',    label:'PLACES+',    icon:'🩹' },
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
