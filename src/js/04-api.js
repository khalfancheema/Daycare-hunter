function setDot(n,state){
  const dot=$('dot-'+n);
  const timerEl=$('timer-'+n);
  if(dot){dot.className='agent-dot '+state;}
  const card=$('card-'+n);
  if(card){card.className='agent-card '+state;}
  const rerunBtn=$('rerun-'+n);
  if(rerunBtn){rerunBtn.style.display=(state==='done'||state==='error')?'inline-flex':'none';}
  if(state==='running'){
    dotTimers[n]=Date.now();
    if(dotIntervals[n]) clearInterval(dotIntervals[n]);
    dotIntervals[n]=setInterval(()=>{
      if(timerEl){const s=((Date.now()-dotTimers[n])/1000).toFixed(0);timerEl.textContent=s+'s';}
    },1000);
  } else {
    if(dotIntervals[n]){clearInterval(dotIntervals[n]);delete dotIntervals[n];}
    if(timerEl&&dotTimers[n]){
      const elapsed=((Date.now()-dotTimers[n])/1000).toFixed(1);
      timerEl.textContent=(state==='done'?'✓ ':'✗ ')+elapsed+'s';
    }
  }
}
function showOut(id){const el=$('out-'+id);if(el)el.className='agent-out show'}
function setProgress(p,t){const f=$('progressFill');if(f)f.style.width=p+'%';const x=$('progressText');if(x)x.textContent=t}
function showErr(m){const e=$('errorBanner');if(!e)return;e.textContent=m;e.className='error-banner show'}
function hideErr(){const e=$('errorBanner');if(e)e.className='error-banner'}

function tab(aid, tid) {
  const out=$('out-'+aid);
  out.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  out.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const btn=out.querySelector(`[onclick="tab('${aid}','${tid}')"]`);
  const pnl=$(aid+'-'+tid);
  if(btn) btn.classList.add('active');
  if(pnl) pnl.classList.add('active');
}

function parseJSON(text) {
  if (!text) return null;
  // 1. Try ```json fenced block
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch {} }
  // 2. Try any ``` fenced block
  const anyFenced = text.match(/```\s*([\s\S]*?)```/);
  if (anyFenced) { try { return JSON.parse(anyFenced[1].trim()); } catch {} }
  // 3. Try raw text directly
  try { return JSON.parse(text.trim()); } catch {}
  // 4. Extract largest { } block (handles prose before/after JSON from web search)
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(text.slice(braceStart, braceEnd + 1)); } catch {}
  }
  // 5. Strip common Claude preamble phrases then retry
  const stripped = text.replace(/^[\s\S]*?(Here is|Here's|Based on|The following)[^\{]{0,120}/i,'').trim();
  const s2 = stripped.indexOf('{'), s3 = stripped.lastIndexOf('}');
  if (s2 !== -1 && s3 > s2) { try { return JSON.parse(stripped.slice(s2, s3+1)); } catch {} }
  return null;
}

function killChart(id){if(charts[id]){try{charts[id].destroy()}catch(e){}delete charts[id]}}

let _demoCJKey = null;
function _setDemoKey(k) { _demoCJKey = k; }

// Retry an agent call up to 2 times if JSON parse fails
// opts.webSearch = true enables Anthropic web_search tool for this call
async function claudeJSON(system, user, opts={}) {
  if (demoMode) {
    await new Promise(r => setTimeout(r, 400));
    // NEW: Try dedicated demo data first (deterministic, richly-shaped)
    if (typeof getDemoData === 'function' && typeof _demoCJKey !== 'undefined' && _demoCJKey !== null) {
      const d = getDemoData(_demoCJKey);
      if (d) { _demoCJKey = null; return d; }
    }
    // Fallback: parse template from prompt (legacy)
    const marker = user.search(/Return ONLY[:\s]/i);
    const src    = marker >= 0 ? user.slice(marker) : user;
    const d = parseJSON(src);
    if (d) return d;
    return {};
  }
  if(!demoMode) {
    const cached = getCache(system, user, opts);
    if(cached) { console.log('Cache hit'); return cached; }
  }
  const strictSystem = system + `

CRITICAL — JSON FORMAT: Your ENTIRE response must be a single valid JSON object. Start with { and end with }. No text before or after. No markdown. No explanation. Just JSON.

CRITICAL — DATA INTEGRITY (strictly enforced):
- NEVER fabricate, invent, or estimate specific data that you cannot verify from a real source.
- This includes: business names, addresses, phone numbers, email addresses, URLs, prices, statistics, ratings, counts, percentages, permit costs, agency names, or any numeric value.
- If a specific piece of information is not available or cannot be verified, use EXACTLY:
    • null          — for any numeric field (costs, ratings, counts, percentages, scores)
    • "N/A"         — for short string fields (phone, email, form names, URLs you cannot verify)
    • "Information not available" — for longer descriptive string fields
- Do NOT substitute a plausible-sounding made-up value. Do NOT use 0 when the real value is unknown. Do NOT generate fake phone numbers, fake URLs, fake business names, fake addresses, or fake statistics.
- If you found real data from a search, state the source. If you could not find it, return null/"N/A".
- It is far better to return null than to return fabricated data.

CRITICAL — CROSS-AGENT CONSISTENCY:
- When upstream agent context is provided (e.g. demographics, gap analysis, site selection), USE those numbers exactly. Do not re-estimate or contradict them.
- Example: if upstream says median household income is $112,400, your downstream pricing and revenue projections must be consistent with that income level — do not silently assume a different income tier.
- If you reference an upstream value, state which agent it came from (e.g. "per Agent 1 demographics: median income $112,400").

CRITICAL — NUMERIC PRECISION:
- Round all currency to whole dollars (no cents). $1,234.56 → 1235.
- Round percentages to one decimal place max.
- Round large counts (population, sqft) to nearest 100.
- Integer fields like counts and units must be integers, not floats.
- Do NOT pad numbers with .00 or fake precision.`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    // Bail immediately if pipeline was stopped
    if (window._v2AbortCtrl?.signal?.aborted || window.stopRequested) throw new Error('Pipeline stopped');
    if (attempt > 1) {
      // Abort-aware retry delay — resolves immediately if stop is clicked
      await new Promise(resolve => {
        const t = setTimeout(resolve, attempt * 1500);
        const sig = window._v2AbortCtrl?.signal;
        if (sig) sig.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
      });
    }
    if (window._v2AbortCtrl?.signal?.aborted || window.stopRequested) throw new Error('Pipeline stopped');
    try {
      const raw = await claude(strictSystem, user + (attempt > 1 ? '\n\nRemember: respond with ONLY the JSON object, nothing else.' : ''), opts);
      const d = parseJSON(raw);
      if (d) { setCache(system, user, d, opts); return d; }
      console.warn(`Attempt ${attempt} parse fail. Raw:`, (raw||'').substring(0, 200));
    } catch(e) {
      if (attempt === 3) throw e;
      console.warn(`Attempt ${attempt} API error:`, e.message);
    }
  }
  return null;
}

// opts.webSearch = true → enable Anthropic web_search tool (Anthropic provider only)
async function claude(system, user, opts={}) {
  const k=key();
  if(!k) throw new Error('No API key.');
  const p = PROVIDERS[provider()]||PROVIDERS.anthropic;
  const url = p.url_custom ? customUrl() : (typeof p.url==='function' ? p.url(k) : p.url);
  const headers = p.headers(k);
  const body = p.buildBody(system, user, model(), opts);
  // Use v2 abort controller if present (allows stop button to cancel mid-flight)
  const signal = window._v2AbortCtrl?.signal;
  const fetchOpts = { method:'POST', headers, body:JSON.stringify(body) };
  if (signal && !signal.aborted) fetchOpts.signal = signal;
  const res=await fetch(url, fetchOpts);
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||'HTTP '+res.status)}
  const d=await res.json();
  if(d.error) throw new Error(d.error.message);
  const stop = p.extractStop(d);
  if(stop==='max_tokens'||stop==='MAX_TOKENS'||stop==='length') throw new Error('Response truncated at max_tokens');
  return p.extractText(d);
}

function onProviderChange() {
  const p = provider();
  const customRow = $('customUrlRow');
  if(customRow) customRow.style.display = p==='openai_compat'?'block':'none';
  const pObj = PROVIDERS[p]||PROVIDERS.anthropic;
  const mi = $('modelInput');
  if(mi) mi.placeholder = pObj.model_default;
  const guidance = $('apiKeyGuidance');
  if(guidance) guidance.style.display = p==='anthropic' ? 'block' : 'none';
}

// ── CONTEXT EXTRACTOR ──────────────────────────────────────
function ctx(jsonStr, fields, maxLen) {
  try {
    const d = typeof jsonStr==='string' ? JSON.parse(jsonStr) : jsonStr;
    if(!d) return (jsonStr||'').substring(0, maxLen||600);
    const out = {};
    fields.forEach(f => { if(d[f]!==undefined) out[f]=d[f]; });
    const s = JSON.stringify(out);
    return maxLen ? s.substring(0, maxLen) : s;
  } catch(e) { return (jsonStr||'').substring(0, maxLen||600); }
}

// ── FALLBACK DATA ───────────────────────────────────────────
