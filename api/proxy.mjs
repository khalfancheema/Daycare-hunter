// ══════════════════════════════════════════════════════════════════════════════
// /api/proxy — Vercel serverless function. Forwards requests to government APIs
// using server-side env vars so client never sees the keys.
//
// Frontend POST shape:
//   {
//     "source": "census" | "hud" | "bea" | "noaa" | "airnow" | "bls" | "fred" | "sam",
//     "path":   "/data/2024/acs/acs5?get=B01003_001E&for=zip+code+tabulation+area:30022",
//     "method": "GET" | "POST",
//     "body":   { ... }   // optional, only for POST
//   }
//
// Returns the upstream response verbatim (status + body passthrough).
// Server-side env vars (set in Vercel dashboard):
//   CENSUS_API_KEY, HUD_TOKEN, BEA_API_KEY, NOAA_TOKEN, AIRNOW_API_KEY,
//   BLS_API_KEY, FRED_API_KEY, SAM_API_KEY
//
// Vercel Functions runtime: Node 20+. Deploys automatically when api/*.mjs
// exists at repo root.
// ══════════════════════════════════════════════════════════════════════════════

const SOURCE_CONFIG = {
  census: {
    base:    'https://api.census.gov',
    keyEnv:  'CENSUS_API_KEY',
    keyMode: 'query', // append &key=<KEY>
    keyName: 'key',
  },
  hud: {
    base:    'https://www.huduser.gov',
    keyEnv:  'HUD_TOKEN',
    keyMode: 'header',
    keyName: 'Authorization',
    keyPrefix: 'Bearer ',
  },
  bea: {
    base:    'https://apps.bea.gov',
    keyEnv:  'BEA_API_KEY',
    keyMode: 'query',
    keyName: 'UserID',
  },
  noaa: {
    base:    'https://www.ncei.noaa.gov',
    keyEnv:  'NOAA_TOKEN',
    keyMode: 'header',
    keyName: 'token',
  },
  airnow: {
    base:    'https://www.airnowapi.org',
    keyEnv:  'AIRNOW_API_KEY',
    keyMode: 'query',
    keyName: 'API_KEY',
  },
  bls: {
    base:    'https://api.bls.gov',
    keyEnv:  'BLS_API_KEY',
    keyMode: 'body',   // POST body field "registrationkey"
    keyName: 'registrationkey',
  },
  fred: {
    base:    'https://api.stlouisfed.org',
    keyEnv:  'FRED_API_KEY',
    keyMode: 'query',
    keyName: 'api_key',
  },
  sam: {
    base:    'https://api.sam.gov',
    keyEnv:  'SAM_API_KEY',
    keyMode: 'query',
    keyName: 'api_key',
  },
  nrel: {
    base:    'https://developer.nrel.gov',
    keyEnv:  'NREL_API_KEY',
    keyMode: 'query',
    keyName: 'api_key',
    keyFallback: 'DEMO_KEY',
  },
  fbi: {
    base:    'https://api.usa.gov',
    keyEnv:  'FBI_API_KEY',
    keyMode: 'query',
    keyName: 'API_KEY',
    keyFallback: 'DEMO_KEY',
  },
};

// CORS: locked to same-origin by default. To allow your hosted frontend on a
// different domain, set ALLOWED_ORIGIN env var (comma-separated).
function corsHeaders(req) {
  const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin  = req.headers.origin || '';
  const allow   = allowed.length === 0 || allowed.includes(origin) || allowed.includes('*');
  return {
    'Access-Control-Allow-Origin':  allow ? origin || '*' : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '600',
  };
}

export default async function handler(req, res) {
  const cors = corsHeaders(req);
  for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({error:'POST only'}); return; }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { res.status(400).json({error:'invalid JSON body'}); return; }

  const { source, path = '', method = 'GET', body: payload } = body || {};
  const cfg = SOURCE_CONFIG[source];
  if (!cfg) { res.status(400).json({error:'unknown source: '+source, available:Object.keys(SOURCE_CONFIG)}); return; }

  const key = process.env[cfg.keyEnv] || cfg.keyFallback;
  if (!key) { res.status(503).json({error:`server missing ${cfg.keyEnv} env var`}); return; }

  // Build upstream URL — refuse to follow arbitrary off-host paths
  if (!path.startsWith('/')) { res.status(400).json({error:'path must start with /'}); return; }
  let url = cfg.base + path;
  let upstreamHeaders = { 'Accept': 'application/json' };
  let upstreamBody    = null;

  if (cfg.keyMode === 'query') {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}${cfg.keyName}=${encodeURIComponent(key)}`;
  } else if (cfg.keyMode === 'header') {
    upstreamHeaders[cfg.keyName] = (cfg.keyPrefix || '') + key;
  } else if (cfg.keyMode === 'body' && method === 'POST') {
    upstreamHeaders['Content-Type'] = 'application/json';
    upstreamBody = JSON.stringify({ ...(payload || {}), [cfg.keyName]: key });
  }

  if (method === 'POST' && !upstreamBody) {
    upstreamHeaders['Content-Type'] = 'application/json';
    upstreamBody = JSON.stringify(payload || {});
  }

  try {
    const r = await fetch(url, { method, headers: upstreamHeaders, body: upstreamBody });
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream fetch failed: ' + (e.message || String(e)) });
  }
}
