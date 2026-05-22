const CACHE_KEY_PREFIX = 'dh_cache_v2_';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const memCache = {};

// Cache schema version — bump to invalidate all cached entries after
// a breaking change to the prompt or response shape.
const CACHE_SCHEMA_VERSION = '2';

function _cacheCtx() {
  // Discriminator: provider + model + schema version. Without these,
  // switching Anthropic ↔ OpenAI or toggling models would return stale
  // cached output from the wrong configuration.
  const provider = (typeof window !== 'undefined' && window.activeProvider) || 'anthropic';
  const model    = (typeof window !== 'undefined' && window.activeModel)    || 'default';
  return provider + '|' + model + '|v' + CACHE_SCHEMA_VERSION;
}

function cacheKey(system, user, opts) {
  // Hash FULL system + user + provider/model + tool flags.
  // Includes opts.webSearch because response shape (citations vs none)
  // materially differs between web-search-enabled and disabled calls.
  const ctx  = _cacheCtx();
  const tool = (opts && opts.webSearch) ? '|websearch' : '';
  const raw  = ctx + tool + '||' + (system || '') + '||' + (user || '');
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(33, h) ^ raw.charCodeAt(i)) | 0;
  }
  return CACHE_KEY_PREFIX + Math.abs(h).toString(36);
}

function getCache(system, user, opts) {
  const k = cacheKey(system, user, opts);
  if(memCache[k]) return memCache[k];
  try {
    const raw = localStorage.getItem(k);
    if(!raw) return null;
    const {ts, data} = JSON.parse(raw);
    if(Date.now()-ts > CACHE_TTL_MS) { localStorage.removeItem(k); return null; }
    memCache[k] = data;
    return data;
  } catch(e) { return null; }
}

function setCache(system, user, data, opts) {
  const k = cacheKey(system, user, opts);
  memCache[k] = data;
  try { localStorage.setItem(k, JSON.stringify({ts:Date.now(), data})); } catch(e) {}
}

function clearAllCache() {
  Object.keys(memCache).forEach(k=>delete memCache[k]);
  Object.keys(localStorage).filter(k=>k.startsWith(CACHE_KEY_PREFIX)).forEach(k=>localStorage.removeItem(k));
}

