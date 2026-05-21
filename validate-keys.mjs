#!/usr/bin/env node
/**
 * validate-keys.mjs — hit each key-gated API with the user's key
 *
 * USAGE:
 *   node validate-keys.mjs
 *
 * Reads keys from (priority):
 *   1. process.env.<KEY>            ← Vercel-style env vars
 *   2. src/js/local-keys.js         ← parsed for window.<KEY> = '...'
 *
 * Prints PASS / FAIL per key. NEVER prints the key value itself.
 * Exit code = number of failed checks.
 */
import { readFileSync, existsSync } from 'fs';

// ── 1. Load keys ─────────────────────────────────────────────────────────────
const KEYS = {};
const KEY_NAMES = [
  'CENSUS_API_KEY','HUD_TOKEN','BEA_API_KEY','NOAA_TOKEN',
  'AIRNOW_API_KEY','BLS_API_KEY','FRED_API_KEY','SAM_API_KEY',
];

// env vars first
for (const n of KEY_NAMES) if (process.env[n]) KEYS[n] = process.env[n];

// local-keys.js parsed second
const LOCAL = 'src/js/local-keys.js';
if (existsSync(LOCAL)) {
  const src = readFileSync(LOCAL, 'utf8');
  for (const n of KEY_NAMES) {
    if (KEYS[n]) continue; // env wins
    const m = src.match(new RegExp(`window\\.${n}\\s*=\\s*['\`"]([^'\`"]+)['\`"]`));
    if (m && m[1] && m[1].trim()) KEYS[n] = m[1].trim();
  }
}

// ── 2. Helpers ───────────────────────────────────────────────────────────────
const mask = k => k ? k.slice(0, 4) + '…' + k.slice(-4) + ` (${k.length} chars)` : '— not set —';
const TIMEOUT = 12000;

async function probe(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, headers: res.headers };
  } catch (e) {
    return { ok: false, status: 0, text: String(e.message || e) };
  } finally { clearTimeout(t); }
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── 3. Tests ─────────────────────────────────────────────────────────────────
test('Census', async () => {
  const k = KEYS.CENSUS_API_KEY;
  if (!k) return { skip: 'no key' };
  const r = await probe(`https://api.census.gov/data/2022/acs/acs5?get=B01003_001E&for=zip+code+tabulation+area:30022&key=${k}`);
  if (!r.ok) return { fail: `HTTP ${r.status}` };
  if (r.text.includes('<title>Missing Key')) return { fail: 'Missing Key page (key not accepted)' };
  if (r.text.includes('error')) return { fail: 'response contains "error": ' + r.text.slice(0, 80) };
  try {
    const d = JSON.parse(r.text);
    const pop = d?.[1]?.[0];
    return { pass: `pop ZIP 30022 = ${parseInt(pop).toLocaleString()}` };
  } catch { return { fail: 'non-JSON response' }; }
});

test('HUD', async () => {
  const k = KEYS.HUD_TOKEN;
  if (!k) return { skip: 'no token' };
  const r = await probe('https://www.huduser.gov/hudapi/public/fmr/statedata/GA', {
    headers: { 'Authorization': `Bearer ${k}` },
  });
  if (r.status === 401) return { fail: 'HTTP 401 Unauthenticated (bad token)' };
  if (!r.ok) return { fail: `HTTP ${r.status}` };
  try {
    const d = JSON.parse(r.text);
    const counties = d.data?.counties || [];
    if (!counties.length) return { fail: 'auth OK but no counties returned' };
    const sample = counties.find(c => /gwinnett|fulton|cobb/i.test(c.county_name||'')) || counties[0];
    return { pass: `${counties.length} GA counties — ${sample.county_name} 2BR FMR = $${sample['Two-Bedroom']}` };
  } catch { return { fail: 'non-JSON: ' + r.text.slice(0, 80) }; }
});

test('BEA', async () => {
  const k = KEYS.BEA_API_KEY;
  if (!k) return { skip: 'no key' };
  const r = await probe(`https://apps.bea.gov/api/data?UserID=${k}&method=GetData&datasetname=Regional&TableName=CAINC1&LineCode=3&GeoFIPS=13135&Year=2022&ResultFormat=JSON`);
  if (!r.ok) return { fail: `HTTP ${r.status}` };
  try {
    const d = JSON.parse(r.text);
    if (d.BEAAPI?.Results?.Error) return { fail: 'BEA error: ' + JSON.stringify(d.BEAAPI.Results.Error).slice(0, 120) };
    const rows = d.BEAAPI?.Results?.Data || [];
    if (!rows.length) return { fail: 'no data rows returned' };
    return { pass: `Gwinnett 2022 per-capita income = $${parseInt(rows[0].DataValue||0).toLocaleString()}` };
  } catch { return { fail: 'non-JSON' }; }
});

test('NOAA', async () => {
  const k = KEYS.NOAA_TOKEN;
  if (!k) return { skip: 'no token' };
  const r = await probe('https://www.ncei.noaa.gov/cdo-web/api/v2/data?datasetid=NORMAL_ANN&locationid=FIPS:13135&startdate=2010-01-01&enddate=2010-12-31&limit=5', {
    headers: { 'token': k },
  });
  if (r.status === 400) return { fail: 'HTTP 400 (likely bad/missing token)' };
  if (r.status === 403) return { fail: 'HTTP 403 Forbidden (token rate-limited or invalid)' };
  if (!r.ok) return { fail: `HTTP ${r.status}` };
  try {
    const d = JSON.parse(r.text);
    if (!d.results) return { fail: 'no results array (response: ' + r.text.slice(0, 80) + ')' };
    return { pass: `${d.results.length} climate data points for Gwinnett` };
  } catch { return { fail: 'non-JSON' }; }
});

test('AirNow', async () => {
  const k = KEYS.AIRNOW_API_KEY;
  if (!k) return { skip: 'no key' };
  const r = await probe(`https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&zipCode=30022&distance=25&API_KEY=${k}`);
  if (r.status === 401) return { fail: 'HTTP 401 Not authenticated' };
  if (!r.ok) return { fail: `HTTP ${r.status}` };
  try {
    const d = JSON.parse(r.text);
    if (d.WebServiceError) return { fail: 'AirNow error: ' + JSON.stringify(d.WebServiceError) };
    if (!Array.isArray(d)) return { fail: 'unexpected response shape' };
    return { pass: `${d.length} AQI observations for ZIP 30022 (key may take ~1 hr to activate)` };
  } catch { return { fail: 'non-JSON' }; }
});

test('BLS', async () => {
  const k = KEYS.BLS_API_KEY;
  if (!k) return { skip: 'no key' };
  const r = await probe('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seriesid: ['OEUS1300000000000000000000004'], // GA all occupations annual median wage
      registrationkey: k,
      latest: true,
    }),
  });
  if (!r.ok) return { fail: `HTTP ${r.status}` };
  try {
    const d = JSON.parse(r.text);
    if (d.status !== 'REQUEST_SUCCEEDED') return { fail: 'BLS status: ' + d.status + ' — ' + (d.message||[]).join('; ') };
    return { pass: 'authenticated; v2 series fetch succeeded' };
  } catch { return { fail: 'non-JSON' }; }
});

test('FRED', async () => {
  const k = KEYS.FRED_API_KEY;
  if (!k) return { skip: 'no key' };
  const r = await probe(`https://api.stlouisfed.org/fred/series/observations?series_id=GAUR&api_key=${k}&file_type=json&sort_order=desc&limit=1`);
  if (r.status === 400) return { fail: 'HTTP 400 (key format wrong — must be 32 char lowercase hex)' };
  if (r.status === 403) return { fail: 'HTTP 403 (invalid key)' };
  if (!r.ok) return { fail: `HTTP ${r.status}` };
  try {
    const d = JSON.parse(r.text);
    const obs = d.observations?.[0];
    if (!obs) return { fail: 'no observations returned' };
    return { pass: `GA unemployment ${obs.date} = ${obs.value}%` };
  } catch { return { fail: 'non-JSON' }; }
});

test('SAM.gov', async () => {
  const k = KEYS.SAM_API_KEY;
  if (!k) return { skip: 'no key' };
  const today = new Date();
  const fromDate = `${(today.getMonth()+1).toString().padStart(2,'0')}/01/${today.getFullYear()-1}`;
  const r = await probe(`https://api.sam.gov/opportunities/v2/search?limit=2&postedFrom=${fromDate}&naics=621110&ptype=o&active=Yes&api_key=${k}`);
  if (r.status === 404) return { fail: 'HTTP 404 (likely bad key — SAM returns 404 for invalid auth)' };
  if (r.status === 401 || r.status === 403) return { fail: `HTTP ${r.status} (key invalid or not approved yet — SAM keys can take 24-48hr)` };
  if (!r.ok) return { fail: `HTTP ${r.status}` };
  try {
    const d = JSON.parse(r.text);
    return { pass: `${d.totalRecords || 0} opportunities returned for NAICS 621110` };
  } catch { return { fail: 'non-JSON' }; }
});

// ── 4. Run ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════');
console.log(' API KEY VALIDATION  —  business-hunter');
console.log('══════════════════════════════════════════════════════════════\n');

console.log('Loaded keys (masked):');
for (const n of KEY_NAMES) {
  console.log(`  ${n.padEnd(18)} ${mask(KEYS[n])}`);
}
console.log('');

let failed = 0, passed = 0, skipped = 0;
for (const t of tests) {
  process.stdout.write(`Testing ${t.name.padEnd(10)} ... `);
  const r = await t.fn();
  if (r.skip) { console.log(`⊝ SKIP  (${r.skip})`); skipped++; }
  else if (r.pass) { console.log(`✓ PASS  ${r.pass}`); passed++; }
  else { console.log(`✗ FAIL  ${r.fail}`); failed++; }
}

console.log('\n──────────────────────────────────────────────────────────────');
console.log(` ${passed} pass  ·  ${failed} fail  ·  ${skipped} skip  (of ${tests.length})`);
console.log('──────────────────────────────────────────────────────────────\n');

if (failed) console.log('Failures above need attention. Common fixes:');
if (failed) console.log('  - HUD 401     → token expired or wrong field');
if (failed) console.log('  - NOAA 400    → token not yet activated (wait ~5 min)');
if (failed) console.log('  - AirNow 401  → key not yet activated (can take 1 hr)');
if (failed) console.log('  - SAM 404     → key not yet approved (24-48 hr review)');
if (failed) console.log('  - BEA error   → check UserID is exact string from email\n');

process.exit(failed);
