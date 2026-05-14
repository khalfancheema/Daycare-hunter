// ══════════════════════════════════════════════════════════
// 33-streaming.js — Token-by-token streaming responses
//
// claudeStream(system, user, onChunk)
//   Low-level SSE stream reader for Anthropic.
//   Falls back to regular claude() for other providers.
//
// claudeStreamJSON(system, user, streamPanelId)
//   Drop-in replacement for claudeJSON that streams the raw
//   text into streamPanelId while building, then parses JSON.
//   Falls back to claudeJSON if streaming parse fails.
// ══════════════════════════════════════════════════════════

async function claudeStream(system, user, onChunk) {
  const k = key();
  if (!k) throw new Error('No API key.');

  // Only Anthropic natively supported for SSE streaming here
  if (provider() !== 'anthropic') {
    const text = await claude(system, user);
    if (onChunk) onChunk(text);
    return text;
  }

  const p = PROVIDERS.anthropic;
  const body = {
    model: model(),
    max_tokens: 8192,
    system,
    messages: [{ role: 'user', content: user }],
    stream: true
  };

  const sig = window._v2AbortCtrl?.signal;
  const fetchOpts = {
    method: 'POST',
    headers: p.headers(k),
    body: JSON.stringify(body)
  };
  if (sig && !sig.aborted) fetchOpts.signal = sig;
  const res = await fetch(p.url, fetchOpts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'HTTP ' + res.status);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = '';
  let fullText  = '';
  let lastFlush = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split('\n');
    sseBuffer = lines.pop(); // keep last incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const evt = JSON.parse(data);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          fullText += evt.delta.text;
          // Throttle DOM updates to ≤ 30fps
          const now = Date.now();
          if (onChunk && now - lastFlush >= 33) {
            lastFlush = now;
            onChunk(fullText);
          }
        } else if (evt.type === 'message_delta' && evt.delta?.stop_reason === 'max_tokens') {
          throw new Error('Response truncated at max_tokens');
        }
      } catch(e) { if (e.message && e.message.indexOf('truncated')>=0) throw e; }
    }
  }

  // Final chunk
  if (onChunk && fullText) onChunk(fullText);
  return fullText;
}

// ── HTML escaper (used in stream preview) ────────────────────
function _escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── claudeStreamJSON ─────────────────────────────────────────
async function claudeStreamJSON(system, user, streamPanelId) {
  // Demo mode: use normal path
  if (demoMode) {
    await new Promise(r => setTimeout(r, 300));
    if (typeof getDemoData === 'function') {
      const d = getDemoData(8);
      if (d) return d;
    }
    const marker = user.search(/Return ONLY[:\s]/i);
    const src    = marker >= 0 ? user.slice(marker) : user;
    return parseJSON(src) || {};
  }

  // Cache hit: skip streaming
  const cached = getCache(system, user);
  if (cached) { console.log('Cache hit (stream)'); return cached; }

  const strictSystem = system + `

CRITICAL — JSON FORMAT: Your ENTIRE response must be a single valid JSON object. Start with { and end with }. No text before or after. No markdown. No explanation. Just JSON.

CRITICAL — DATA INTEGRITY: Never fabricate specific data. Use null for unknown numbers, "N/A" for short strings, "Information not available" for longer strings.`;

  // Prime the display panel
  const proseEl = streamPanelId ? $(streamPanelId) : null;
  if (proseEl) {
    proseEl.innerHTML =
      `<div class="stream-live">` +
        `<div class="stream-header"><span class="stream-dot"></span>Streaming response…</div>` +
        `<div class="stream-text" id="${streamPanelId}-st"></div>` +
      `</div>`;
  }

  let rawText = '';
  const onChunk = (text) => {
    rawText = text;
    const stEl = $(streamPanelId + '-st');
    if (!stEl) return;
    // Show last 700 chars to keep DOM lean
    const display = text.length > 700 ? '…' + text.slice(-700) : text;
    stEl.innerHTML = _escHtml(display) + '<span class="stream-cur">▋</span>';
  };

  try {
    rawText = await claudeStream(strictSystem, user, onChunk);
  } catch(e) {
    if (proseEl) proseEl.innerHTML = '';
    throw e;
  }

  if (proseEl) proseEl.innerHTML = ''; // clear streaming preview

  const d = parseJSON(rawText);
  if (d) { setCache(system, user, d); return d; }

  // Streaming parse failed → fall back to regular retry path
  console.warn('Streaming JSON parse failed — retrying with claudeJSON');
  return await claudeJSON(system, user);
}
