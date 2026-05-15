const CACHE_KEY_PREFIX = 'dh_cache_v2_';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const memCache = {};

function cacheKey(system, user) {
  // Hash the FULL system + user. Truncating to 80+120 chars caused
  // re-runs after changing ZIP/capacity/industry to collide with the
  // previous cache entry (discriminating values usually appear deep
  // inside the prompt, not in the boilerplate prefix).
  const raw = (system || '') + '' + (user || '');
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(33, h) ^ raw.charCodeAt(i)) | 0;
  }
  return CACHE_KEY_PREFIX + Math.abs(h).toString(36);
}

function getCache(system, user) {
  const k = cacheKey(system, user);
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

function setCache(system, user, data) {
  const k = cacheKey(system, user);
  memCache[k] = data;
  try { localStorage.setItem(k, JSON.stringify({ts:Date.now(), data})); } catch(e) {}
}

function clearAllCache() {
  Object.keys(memCache).forEach(k=>delete memCache[k]);
  Object.keys(localStorage).filter(k=>k.startsWith(CACHE_KEY_PREFIX)).forEach(k=>localStorage.removeItem(k));
}

