// ── V2 ADVANCED FEATURES (v2.2) ───────────────────────────────────────────
// F1:  Conversational chat memory (multi-turn history)
// F2:  Proactive AI follow-ups after pipeline complete
// F3:  Streaming agent output (SSE streaming for Anthropic / OpenAI)
// F4:  Live data refresh per-agent
// F5:  Inline R data editor
// F6:  Wizard draft auto-save / restore
// F7:  Portfolio tags & notes
// F8:  Multi-ZIP side-by-side modal
// F9:  Formatted PDF export (new window, print-ready)
// F10: Slide deck export (12-slide HTML pitch deck)
// F11: Agent confidence scores
// F12: ZIP autocomplete (city/state lookup)

// ── F1 + F3: CONVERSATIONAL CHAT MEMORY + STREAMING ──────────────────────
let _v2ChatHistory = [];

function v2ClearChatHistory() { _v2ChatHistory = []; }

// Override v2SendChatQuestion to record history
function v2SendChatQuestion() {
  const inp = document.getElementById('v2-chat-input');
  if (!inp) return;
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  v2ChatMsg('user', q);
  _v2ChatHistory.push({ role: 'user', content: q });
  v2AnswerQuestion(q);
}

// Override _v2AiAnswer with streaming + memory version
async function _v2AiAnswer(question, R_data) {
  const apiKey  = localStorage.getItem('v2_apikey') || '';
  const provider = V2.selectedProvider || 'anthropic';
  if (!apiKey) { v2AnswerQuestionOffline(question, R_data); return; }

  // Insert streaming placeholder bubble
  const msgs   = document.getElementById('v2-chat-msgs');
  const bubble = document.createElement('div');
  bubble.className = 'v2-msg ai';
  bubble.innerHTML = `<div class="v2-msg-avatar">🤖</div><div class="v2-msg-bubble v2-streaming">⏳ Thinking…</div>`;
  if (msgs) { msgs.appendChild(bubble); msgs.scrollTop = msgs.scrollHeight; }
  const bubbleText = bubble.querySelector('.v2-msg-bubble');

  const snapshot = _v2BuildDataSnapshot(R_data);
  const sys = `You are AI Answers for Business Hunter, an AI startup analysis tool.
Answer in 2-5 sentences. Use conversation history for follow-ups.
Cite specific numbers. Use HTML: <strong> for emphasis, <br> for line breaks.
If data is missing, say so briefly and suggest what to run.`;

  // Build messages array with history (last 10 turns)
  const historySlice = _v2ChatHistory.slice(-10);

  try {
    if (provider === 'anthropic') {
      await _v2StreamAnthropic(apiKey, sys, historySlice, bubbleText);
    } else if (provider === 'openai' || provider === 'openai_compat') {
      await _v2StreamOpenAI(apiKey, sys, historySlice, bubbleText);
    } else {
      // Gemini — non-streaming fallback with history context
      await _v2GeminiFallback(apiKey, sys, historySlice, bubbleText);
    }
    // Record AI response in history
    _v2ChatHistory.push({ role: 'assistant', content: bubbleText?.innerHTML || '' });
    bubbleText?.classList.remove('v2-streaming');
  } catch(e) {
    if (bubbleText) { bubbleText.innerHTML = `⚠️ ${e.message || 'Connection error. Check your API key.'}`; }
    bubbleText?.classList.remove('v2-streaming');
  }
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function _v2BuildDataSnapshot(R_data) {
  return JSON.stringify({
    verdict:            R_data.a8?.verdict,
    rationale:          R_data.a8?.verdict_rationale,
    score:              v2CalcScore(),
    top_city:           (R_data.a2?.cities||[]).sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0],
    financials_base:    R_data.a7?.scenarios?.[1] || {},
    risks:              (R_data.a8?.risks||[]).slice(0,5),
    next_steps:         (R_data.a8?.next_steps||[]).slice(0,5),
    competition:        R_data.a6?.summary,
    compliance:         R_data.a5?.summary,
    grants:             R_data.a12?.summary,
    startup_cost:       R_data.a7?.total_startup_cost,
    demographics:       R_data.a1?.summary,
    industry:           V2.wizard?.data?.industry,
    zip:                V2.wizard?.data?.zip,
    budget:             V2.wizard?.data?.budget,
  }, null, 2).slice(0, 3500);
}

async function _v2StreamAnthropic(apiKey, sys, messages, bubbleEl) {
  const model = localStorage.getItem('v2_model') || 'claude-sonnet-4-6';
  const res   = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: 600, system: sys, messages, stream: true }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: check your key`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  if (bubbleEl) bubbleEl.innerHTML = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const p = JSON.parse(raw);
        if (p.type === 'content_block_delta' && p.delta?.text) {
          full += p.delta.text;
          if (bubbleEl) {
            bubbleEl.innerHTML = full;
            bubbleEl.closest('.v2-chat-msgs')?.scrollTo(0, 9999);
          }
        }
      } catch {}
    }
  }
}

async function _v2StreamOpenAI(apiKey, sys, messages, bubbleEl) {
  const customUrl = localStorage.getItem('v2_custom_url') || 'https://api.openai.com/v1/chat/completions';
  const model     = localStorage.getItem('v2_model') || 'gpt-4o';
  const allMsgs   = [{ role: 'system', content: sys }, ...messages];
  const res       = await fetch(customUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 600, messages: allMsgs, stream: true }),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: check your key`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  if (bubbleEl) bubbleEl.innerHTML = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const p = JSON.parse(raw);
        const text = p.choices?.[0]?.delta?.content;
        if (text) {
          full += text;
          if (bubbleEl) bubbleEl.innerHTML = full;
        }
      } catch {}
    }
  }
}

async function _v2GeminiFallback(apiKey, sys, messages, bubbleEl) {
  const model   = localStorage.getItem('v2_model') || 'gemini-1.5-pro';
  const history = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: history,
        generationConfig: { maxOutputTokens: 600 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const d = await res.json();
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
  if (bubbleEl) bubbleEl.innerHTML = text;
}

// Offline fallback (no API key) — keyword-based, unchanged from v2-04-copilot.js
function v2AnswerQuestionOffline(q, R_data) {
  const lower = q.toLowerCase();
  let answer  = '';
  if (lower.includes('best city') || lower.includes('top city')) {
    const top = (R_data.a2?.cities||[]).sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0];
    answer = top ? `<strong>${top.city}</strong> scores highest with gap ${top.gap_score}/10. ${top.rationale||''}` : 'Run the pipeline to identify top cities.';
  } else if (lower.includes('financ') || lower.includes('revenue')) {
    const base = (R_data.a7?.scenarios||[]).find(s=>(s.name||'').toLowerCase().includes('base'))||R_data.a7?.scenarios?.[1]||{};
    answer = base.monthly_revenue
      ? `Base: $${(base.monthly_revenue/1000).toFixed(0)}K/mo revenue · $${(base.monthly_net/1000).toFixed(0)}K net · break-even month ${base.breakeven_months}`
      : 'Run Agent 7 for financial projections.';
  } else if (lower.includes('risk')) {
    const risks = (R_data.a8?.risks||[]).slice(0,3);
    answer = risks.length ? `<strong>Top risks:</strong><br>${risks.map(r=>`• ${typeof r==='string'?r:(r.risk||r.title||r)}`).join('<br>')}` : 'Run the pipeline to see risk analysis.';
  } else if (lower.includes('score') || lower.includes('viability')) {
    const score = v2CalcScore(); const v = v2ScoreVerdict(score);
    answer = `<strong>Viability Score: ${score}/100</strong> — ${v.title}<br>${v.summary}`;
  } else if (lower.includes('grant') || lower.includes('funding')) {
    const grants = (R_data.a12?.grants||[]).slice(0,3);
    answer = grants.length ? `<strong>Funding options:</strong><br>${grants.map(g=>`• ${g.name||g.program}: ${g.amount||'see report'}`).join('<br>')}` : R_data.a12?.summary || 'Run Agent 12 for grant opportunities.';
  } else {
    answer = `I can answer questions about your analysis. Try:<br>• "What's the best city?"<br>• "Explain the financials"<br>• "What are the biggest risks?"<br>• "What funding is available?"`;
  }
  setTimeout(() => v2ChatMsg('ai', answer), 300);
}

// ── F2: PROACTIVE AI FOLLOW-UPS ───────────────────────────────────────────
function v2ShowProactiveFollowUps() {
  const R_data = typeof R !== 'undefined' ? R : {};
  const d      = V2.wizard?.data || {};
  const questions = [];

  // Context-aware questions based on actual analysis data
  const topCity = (R_data.a2?.cities||[]).sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0];
  if (topCity) questions.push(`Why does ${topCity.city} score highest? What's driving the gap?`);

  const base = (R_data.a7?.scenarios||[]).find(s=>(s.name||'').toLowerCase().includes('base'))||R_data.a7?.scenarios?.[1]||{};
  if (base.breakeven_months) questions.push(`Break-even is month ${base.breakeven_months} — what's the most sensitive assumption?`);

  const verdict = R_data.a8?.verdict || '';
  if (verdict) questions.push(`You got a ${verdict} verdict. What would flip it to a stronger GO?`);

  const topRisk = R_data.a8?.risks?.[0];
  if (topRisk) {
    const riskText = typeof topRisk === 'string' ? topRisk : (topRisk.risk || topRisk.title || '');
    if (riskText) questions.push(`How do I mitigate the top risk: "${riskText.slice(0,60)}…"?`);
  }

  const radius = d.radius || '40';
  if (parseInt(radius) > 25) questions.push(`You searched a ${radius}-mile radius. Should we narrow to the top ZIP for a sharper site search?`);

  const finalQs = questions.slice(0, 3);
  if (!finalQs.length) return;

  setTimeout(() => {
    v2ChatMsg('ai', `💡 <strong>Suggested follow-ups:</strong><br>
      <div class="v2-chat-suggestions">
        ${finalQs.map(q => `<button class="v2-chat-suggestion" onclick="v2ChatFromSuggestion(this)">${q}</button>`).join('')}
      </div>`);
  }, 2500);
}

function v2ChatFromSuggestion(btn) {
  const q   = btn?.textContent || btn;
  const inp = document.getElementById('v2-chat-input');
  if (inp) inp.value = typeof q === 'string' ? q : q;
  // Disable the suggestions row so it's clear we're processing
  btn?.closest?.('.v2-chat-suggestions')?.querySelectorAll('button').forEach(b => b.disabled = true);
  v2SendChatQuestion();
}

// ── F6: WIZARD DRAFT AUTO-SAVE ────────────────────────────────────────────
const V2_DRAFT_KEY = 'v2_wizard_draft';

function v2SaveWizardDraft() {
  const data = V2.wizard?.data;
  if (!data || !data.industry) return;
  localStorage.setItem(V2_DRAFT_KEY, JSON.stringify(data));
}

function v2ClearWizardDraft() {
  localStorage.removeItem(V2_DRAFT_KEY);
}

function v2CheckWizardDraft() {
  try {
    const raw = localStorage.getItem(V2_DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data.industry) return;
    const ind = V2_INDUSTRIES.find(i => i.val === data.industry);
    const banner = document.getElementById('v2-draft-banner');
    if (!banner) return;
    banner.innerHTML = `
      <span>${ind?.emoji || '🏢'} <strong>Resume analysis?</strong> You were setting up a ${ind?.label || data.industry} in ZIP ${data.zip || '—'}.</span>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button class="v2-btn primary sm" onclick="v2RestoreWizardDraft()">Resume →</button>
        <button class="v2-btn ghost sm" onclick="v2DismissWizardDraft()">Dismiss</button>
      </div>`;
    banner.style.display = 'flex';
  } catch {}
}

function v2RestoreWizardDraft() {
  try {
    const data = JSON.parse(localStorage.getItem(V2_DRAFT_KEY) || '{}');
    V2.wizard.data = data;
    V2.wizard.step = 0;
    const banner = document.getElementById('v2-draft-banner');
    if (banner) banner.style.display = 'none';
    v2GoTo('wizard');
    v2WizRenderStepsBar();
    v2WizRenderStep();
    v2Toast('↩ Draft restored');
  } catch {}
}

function v2DismissWizardDraft() {
  v2ClearWizardDraft();
  const banner = document.getElementById('v2-draft-banner');
  if (banner) banner.style.display = 'none';
}

// ── F7: PORTFOLIO TAGS & NOTES ────────────────────────────────────────────
const V2_PORT_TAGS = [
  { id: 'serious',      label: '⭐ Serious',      color: 'rgba(34,197,94,.15)',  text: 'var(--v2-green)' },
  { id: 'backup',       label: '📌 Backup',       color: 'rgba(59,130,246,.15)', text: 'var(--v2-blue)'  },
  { id: 'investigating',label: '🔍 Investigating', color: 'rgba(245,158,11,.15)', text: 'var(--v2-amber)' },
  { id: 'vetoed',       label: '🚫 Vetoed',        color: 'rgba(239,68,68,.15)',  text: 'var(--v2-red)'   },
  { id: 'funded',       label: '💰 Funded',        color: 'rgba(139,92,246,.15)', text: 'var(--v2-a2)'    },
];

function v2PortCycleTag(id) {
  const entry = V2.portfolio.find(r => String(r.id) === String(id));
  if (!entry) return;
  const tagIds  = V2_PORT_TAGS.map(t => t.id);
  const cur     = tagIds.indexOf(entry.tag || '');
  entry.tag     = cur >= tagIds.length - 1 ? '' : tagIds[cur + 1];
  v2SavePortfolio();
  v2RenderPortfolio();
}

function v2PortStartNote(id) {
  const entry = V2.portfolio.find(r => String(r.id) === String(id));
  if (!entry) return;
  const noteEl = document.getElementById(`v2-port-note-${id}`);
  if (!noteEl) return;
  noteEl.innerHTML = `
    <input class="v2-port-note-input" id="v2-port-note-inp-${id}"
      value="${(entry.note||'').replace(/"/g,'&quot;')}"
      placeholder="Add a note…" maxlength="120"
      onkeydown="if(event.key==='Enter')v2PortSaveNote('${id}');if(event.key==='Escape')v2RenderPortfolio()" />
    <button class="v2-btn ghost sm" style="font-size:11px" onclick="v2PortSaveNote('${id}')">Save</button>`;
  document.getElementById(`v2-port-note-inp-${id}`)?.focus();
}

function v2PortSaveNote(id) {
  const entry = V2.portfolio.find(r => String(r.id) === String(id));
  if (!entry) return;
  entry.note = document.getElementById(`v2-port-note-inp-${id}`)?.value.trim() || '';
  v2SavePortfolio();
  v2RenderPortfolio();
}

// ── F8: MULTI-ZIP SIDE-BY-SIDE ────────────────────────────────────────────
function v2ShowZIPCompare() {
  const modal = document.getElementById('v2-zipcompare-modal');
  if (!modal) return;
  const curZip = V2.wizard?.data?.zip || V2.run?.zip || '';
  const ind    = V2_INDUSTRIES.find(i => i.val === (V2.wizard?.data?.industry || V2.run?.industry)) || { emoji:'🏢', label:'Business' };

  document.getElementById('v2-zipcompare-content').innerHTML = `
    <div class="v2-modal-header">
      <div class="v2-modal-title">📊 Multi-ZIP Comparison</div>
      <button class="v2-modal-close" onclick="v2CloseZIPCompare()">✕</button>
    </div>
    <div style="font-size:13px;color:var(--v2-t2);margin-bottom:20px">
      Compare ${ind.emoji} ${ind.label} metrics across two ZIP codes.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="v2-field" style="margin:0">
        <label>ZIP A (current)</label>
        <input class="v2-input" id="v2-zcmp-a" value="${curZip}" placeholder="ZIP code" maxlength="5" />
      </div>
      <div class="v2-field" style="margin:0">
        <label>ZIP B</label>
        <input class="v2-input" id="v2-zcmp-b" placeholder="e.g. 30024" maxlength="5" oninput="v2ZIPComparePreview(this.value,'b')" />
        <div id="v2-zcmp-b-city" style="font-size:11px;color:var(--v2-t3);margin-top:4px"></div>
      </div>
    </div>
    <div id="v2-zcmp-result"></div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
      <button class="v2-btn ghost" onclick="v2CloseZIPCompare()">Cancel</button>
      <button class="v2-btn primary" onclick="v2RunZIPCompare()">Compare ZIPs →</button>
    </div>`;
  modal.classList.add('open');
}

function v2CloseZIPCompare() {
  document.getElementById('v2-zipcompare-modal')?.classList.remove('open');
}

async function v2ZIPComparePreview(zip, slot) {
  if (zip.length !== 5) return;
  const el = document.getElementById(`v2-zcmp-${slot}-city`);
  if (!el) return;
  el.textContent = '⏳ Looking up…';
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) { el.textContent = 'ZIP not found'; return; }
    const d = await res.json();
    el.textContent = `📍 ${d.places[0]['place name']}, ${d.places[0]['state abbreviation']}`;
  } catch { el.textContent = ''; }
}

function v2RunZIPCompare() {
  const zipA = document.getElementById('v2-zcmp-a')?.value.trim();
  const zipB = document.getElementById('v2-zcmp-b')?.value.trim();
  if (!zipA || !zipB || !/^\d{5}$/.test(zipA) || !/^\d{5}$/.test(zipB)) {
    v2Toast('Enter valid 5-digit ZIP codes for both'); return;
  }

  const R_data = typeof R !== 'undefined' ? R : {};
  const cities = R_data.a2?.cities || [];

  const matchA = cities.find(c => (c.zip||'') === zipA || (c.city||'').toLowerCase().includes(zipA));
  const matchB = cities.find(c => (c.zip||'') === zipB);

  // Also check portfolio for a run with ZIP B
  const portB = V2.portfolio.find(r => r.zip === zipB);

  const resultEl = document.getElementById('v2-zcmp-result');
  if (!resultEl) return;

  const kpis = [
    { label: 'Gap Score',    a: matchA?.gap_score != null ? `${matchA.gap_score}/10` : '—', b: matchB?.gap_score != null ? `${matchB.gap_score}/10` : portB ? `${portB.score}/100 overall` : '—' },
    { label: 'Population',   a: matchA?.population ? Number(matchA.population).toLocaleString() : '—', b: matchB?.population ? Number(matchB.population).toLocaleString() : '—' },
    { label: 'Competitors',  a: matchA?.existing_supply ?? matchA?.competitor_count ?? '—', b: matchB?.existing_supply ?? matchB?.competitor_count ?? '—' },
    { label: 'Est. Demand',  a: matchA?.estimated_demand ?? '—', b: matchB?.estimated_demand ?? '—' },
  ];

  resultEl.innerHTML = `
    <div class="v2-cmp-table-wrap">
      <table class="v2-table">
        <thead><tr><th>Metric</th><th>ZIP ${zipA}</th><th>ZIP ${zipB}</th></tr></thead>
        <tbody>
          ${kpis.map(k => `<tr><td class="v2-cmp-label">${k.label}</td><td class="v2-cmp-val">${k.a}</td><td class="v2-cmp-val">${k.b}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${!matchA && !matchB ? `<div style="font-size:12px;color:var(--v2-t3);margin-top:10px">
      ⚠️ No gap analysis data found for these ZIPs. Run the full pipeline to populate city-level data.
    </div>` : ''}
    ${portB ? `<div style="font-size:12px;color:var(--v2-t2);margin-top:10px">
      📁 Found a portfolio entry for ZIP ${zipB}: ${portB.indEmoji} ${portB.indLabel} — Score ${portB.score}/100
    </div>` : `<div style="font-size:12px;color:var(--v2-t3);margin-top:10px">
      💡 No saved analysis for ZIP ${zipB}. Run a new analysis there for full comparison.
      <button class="v2-btn ghost sm" style="margin-left:8px" onclick="v2CloseZIPCompare();v2GoTo('wizard')">Run ZIP ${zipB} →</button>
    </div>`}`;
}

// ── PDF/SLIDE COMMUNITY CHART HELPERS ─────────────────────────────────────
function _pdfAgePyramid(pyramid, W=480, H=300) {
  if (!pyramid?.length) return '';
  const maxVal = Math.max(...pyramid.flatMap(b => [b.male||0, b.female||0])) || 1;
  const barH   = Math.floor(H / pyramid.length) - 1;
  const cx     = W / 2;
  const halfW  = cx - 28;
  const bars   = pyramid.map((b, i) => {
    const y  = i * (barH + 1);
    const mW = ((b.male||0) / maxVal) * halfW;
    const fW = ((b.female||0) / maxVal) * halfW;
    return `<rect x="${(cx - 26 - mW).toFixed(1)}" y="${y}" width="${mW.toFixed(1)}" height="${barH}" fill="#4a9eff" fill-opacity=".85" rx="1.5"/>
            <rect x="${(cx + 26).toFixed(1)}" y="${y}" width="${fW.toFixed(1)}" height="${barH}" fill="#ef449d" fill-opacity=".75" rx="1.5"/>
            <text x="${cx}" y="${y + barH * .72}" text-anchor="middle" font-size="8" fill="#64748b">${b.bracket}</text>`;
  }).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;max-width:100%">
    <text x="${cx - halfW/2}" y="${H - 2}" text-anchor="middle" font-size="10" fill="#4a9eff">◀ Male</text>
    <text x="${cx + halfW/2}" y="${H - 2}" text-anchor="middle" font-size="10" fill="#ef449d">Female ▶</text>
    ${bars}
  </svg>`;
}

function _pdfPopLine(projs, W=640, H=110) {
  if (!projs?.length) return '';
  const minP = Math.min(...projs.map(p=>p.population));
  const maxP = Math.max(...projs.map(p=>p.population));
  const range = (maxP - minP) || 1;
  const PAD = {l:40, r:10, t:10, b:24};
  const pts = projs.map((p, i) => ({
    x: PAD.l + (i / (projs.length-1)) * (W - PAD.l - PAD.r),
    y: PAD.t + (1 - (p.population - minP)/range) * (H - PAD.t - PAD.b),
    ...p
  }));
  const actual = pts.filter(p => p.year <= 2024);
  const proj   = pts.filter(p => p.year >= 2024);
  const pa = actual.map((p,i) => `${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const pp = proj  .map((p,i) => `${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const yLabels = [minP, (minP+maxP)/2, maxP].map((v, i) => {
    const y = PAD.t + (1 - (v - minP)/range) * (H - PAD.t - PAD.b);
    return `<text x="${PAD.l - 4}" y="${y.toFixed(1)}" text-anchor="end" font-size="8" fill="#94a3b8">${(v/1000).toFixed(0)}K</text>`;
  }).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;max-width:100%">
    ${yLabels}
    <path d="${pa}" fill="none" stroke="#4a9eff" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="${pp}" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="6,4" stroke-linejoin="round"/>
    ${pts.map(p=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${p.year>2024?'#22c55e':'#4a9eff'}"/>
      <text x="${p.x.toFixed(1)}" y="${H-2}" text-anchor="middle" font-size="8" fill="#64748b">${p.year}</text>`).join('')}
    <line x1="37" y1="${H-PAD.b}" x2="${W-PAD.r}" y2="${H-PAD.b}" stroke="#e2e8f0" stroke-width="1"/>
    <text x="${W-PAD.r-50}" y="${H-PAD.b-4}" font-size="8" fill="#4a9eff">— Actual</text>
    <text x="${W-PAD.r-50}" y="${H-PAD.b+10}" font-size="8" fill="#22c55e">-- Projected</text>
  </svg>`;
}

// ── F9: FORMATTED PDF EXPORT ──────────────────────────────────────────────
function v2GeneratePDFReport() {
  const R_data   = typeof R !== 'undefined' ? R : {};
  const run      = V2.run || {};
  const ind      = V2_INDUSTRIES.find(i => i.val === (run.industry || V2.wizard?.data?.industry)) || { emoji:'🏢', label:'Business' };
  const score    = run.score || v2CalcScore();
  const verdict  = v2ScoreVerdict(score);
  const date     = new Date(run.ts || Date.now()).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const ringColor = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';
  const circ     = 2 * Math.PI * 54;
  const offset   = (circ * (1 - score / 100)).toFixed(1);

  const base = (R_data.a7?.scenarios||[]).find(s=>(s.name||'').toLowerCase().includes('base'))||R_data.a7?.scenarios?.[1]||{};
  const topCity = (R_data.a2?.cities||[]).sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0];
  const risks   = (R_data.a8?.risks||[]).slice(0,5);
  const steps   = (R_data.a8?.next_steps||[]).slice(0,6);
  const a1      = R_data.a1 || {};
  const PCOLS   = ['#6366f1','#22c55e','#f59e0b','#a78bfa','#06b6d4','#f97316','#ef4444','#eab308','#14b8a6'];

  const fmt = v => v ? `$${Number(v).toLocaleString()}` : '—';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${ind.emoji} ${ind.label} — Business Viability Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #fff; color: #0f172a; font-size: 14px; line-height: 1.6; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }
  h1 { font-size: 28px; font-weight: 900; letter-spacing: -.03em; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 700; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
  h3 { font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 6px; }
  .cover { display: flex; align-items: center; gap: 40px; padding: 40px 0 32px; border-bottom: 2px solid #e2e8f0; margin-bottom: 32px; }
  .score-ring { flex-shrink: 0; }
  .meta { color: #475569; font-size: 13px; }
  .meta strong { color: #0f172a; }
  .verdict { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; margin-top: 10px; background: ${score>=70?'#dcfce7':score>=45?'#fef3c7':'#fee2e2'}; color: ${ringColor}; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
  th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; background: #f8fafc; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  .green { color: #16a34a; font-weight: 700; }
  .red   { color: #dc2626; font-weight: 700; }
  .amber { color: #d97706; font-weight: 700; }
  .kpi-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin: 16px 0; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; }
  .kpi-val { font-size: 22px; font-weight: 800; letter-spacing: -.02em; }
  .kpi-lbl { font-size: 11px; color: #64748b; margin-top: 3px; }
  ul { padding-left: 18px; margin-top: 8px; }
  li { margin-bottom: 5px; color: #334155; }
  .risk { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .risk-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; flex-shrink: 0; text-transform: uppercase; }
  .risk-badge.high { background: #fee2e2; color: #dc2626; }
  .risk-badge.medium { background: #fef3c7; color: #d97706; }
  .risk-badge.low { background: #dcfce7; color: #16a34a; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  .section-break { page-break-before: always; margin-top: 40px; }
  .cprow { display: grid; gap: 20px; margin: 16px 0; }
  .cprow-2 { grid-template-columns: 1fr 1fr; }
  .cprow-3 { grid-template-columns: 1fr 1fr 1fr; }
  .cp-card { background: #f8fafc; border-radius: 8px; padding: 14px; }
  .bar-wrap { background: #e2e8f0; border-radius: 3px; height: 7px; overflow: hidden; margin-top: 3px; }
  .bar-fill  { height: 100%; border-radius: 3px; }
  .seg-card  { border-top: 3px solid; padding: 10px; border-radius: 4px; background: #f8fafc; }
  .seg-pct   { font-size: 20px; font-weight: 900; margin: 4px 0; }
  .lq-high { color: #16a34a; } .lq-mid { color: #d97706; } .lq-low { color: #dc2626; }
  @media print { @page { margin: 0.5in; } button { display: none !important; } }
  .print-btn { position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
<div class="page">
  <div class="cover">
    <div class="score-ring">
      <svg width="110" height="110" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r="54" fill="none" stroke="#e2e8f0" stroke-width="10"/>
        <circle cx="65" cy="65" r="54" fill="none" stroke="${ringColor}" stroke-width="10"
          stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset}"
          stroke-linecap="round"
          style="transform:rotate(-90deg);transform-origin:center"/>
        <text x="65" y="60" text-anchor="middle" font-size="26" font-weight="900" fill="${ringColor}">${score}</text>
        <text x="65" y="76" text-anchor="middle" font-size="11" fill="#94a3b8">/100</text>
      </svg>
    </div>
    <div>
      <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">Business Viability Report</div>
      <h1>${ind.emoji} ${ind.label}</h1>
      <div class="meta">ZIP <strong>${run.zip || V2.wizard?.data?.zip || '—'}</strong> · Radius <strong>${run.radius || V2.wizard?.data?.radius || '—'} mi</strong> · Budget <strong>${fmt(run.budget || V2.wizard?.data?.budget)}</strong></div>
      <div class="meta">Generated <strong>${date}</strong></div>
      <div class="verdict">${score >= 70 ? '✅ GO' : score >= 45 ? '⚠️ CAUTION' : '🚫 NO-GO'} — ${verdict.title}</div>
    </div>
  </div>

  ${R_data.a8?.verdict_rationale ? `
  <h2>Executive Summary</h2>
  <p style="color:#334155">${R_data.a8.verdict_rationale}</p>` : ''}

  <div class="kpi-row">
    <div class="kpi"><div class="kpi-val" style="color:${ringColor}">${score}</div><div class="kpi-lbl">Viability Score</div></div>
    <div class="kpi"><div class="kpi-val">${fmt(base.monthly_revenue||0).replace('$','$').replace(/(\d)K/,'$1K') || '—'}</div><div class="kpi-lbl">Base Revenue/mo</div></div>
    <div class="kpi"><div class="kpi-val">${base.breakeven_months ? base.breakeven_months + ' mo' : '—'}</div><div class="kpi-lbl">Break-Even</div></div>
    <div class="kpi"><div class="kpi-val">${topCity?.city?.split(',')[0] || '—'}</div><div class="kpi-lbl">Top Market</div></div>
  </div>

  ${R_data.a7?.scenarios?.length ? `
  <h2>Financial Projections</h2>
  <table>
    <thead><tr><th>Scenario</th><th>Monthly Revenue</th><th>Monthly Net</th><th>Break-Even</th><th>3yr ROI</th></tr></thead>
    <tbody>
      ${R_data.a7.scenarios.map(s => {
        const net = s.monthly_net || 0;
        return `<tr>
          <td><strong>${s.name||'Scenario'}</strong></td>
          <td>${fmt(s.monthly_revenue)}</td>
          <td class="${net>0?'green':'red'}">${fmt(s.monthly_net)}</td>
          <td>${s.breakeven_months ? s.breakeven_months+' months' : '—'}</td>
          <td>${s.roi_3yr != null ? (s.roi_3yr>0?'+':'') + s.roi_3yr + '%' : '—'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>` : ''}

  ${risks.length ? `
  <h2>Risk Matrix</h2>
  ${risks.map(r => {
    const sev = (typeof r === 'object' ? r.severity : 'Medium') || 'Medium';
    const title = typeof r === 'string' ? r : (r.risk || r.title || '');
    const mit   = typeof r === 'object' ? (r.mitigation || r.desc || '') : '';
    return `<div class="risk">
      <span class="risk-badge ${sev.toLowerCase()}">${sev}</span>
      <div><strong>${title}</strong>${mit ? `<br><span style="color:#64748b;font-size:12px">${mit}</span>` : ''}</div>
    </div>`;
  }).join('')}` : ''}

  ${steps.length ? `
  <h2>Recommended Next Steps</h2>
  <ol>
    ${steps.map(s => `<li>${typeof s === 'string' ? s : (s.step || s.title || s.action || '')}</li>`).join('')}
  </ol>` : ''}

  <!-- ═══════════════ COMMUNITY PROFILE ═══════════════ -->
  ${(a1.multi_radius?.length || a1.age_pyramid?.length || a1.generation_breakdown?.length) ? `
  <div class="section-break">
    <h2>👥 Community Profile — ${run.zip || V2.wizard?.data?.zip || ''}</h2>

    ${a1.multi_radius?.length ? `
    <h3>📏 Multi-Radius Market Summary</h3>
    <table>
      <thead><tr><th>Ring</th><th>Population</th><th>Households</th><th>Median HHI</th><th>HH w/ Children</th><th>Children &lt;5</th><th>Avg HH Size</th></tr></thead>
      <tbody>${a1.multi_radius.map(r=>`<tr>
        <td><strong>${r.ring}</strong></td>
        <td>${Number(r.population||0).toLocaleString()}</td>
        <td>${Number(r.households||0).toLocaleString()}</td>
        <td class="green">$${Number(r.median_hh_income||0).toLocaleString()}</td>
        <td>${r.pct_with_children!=null?r.pct_with_children+'%':'—'}</td>
        <td>${Number(r.pop_under5||0).toLocaleString()}</td>
        <td>${r.avg_hh_size||'—'}</td>
      </tr>`).join('')}</tbody>
    </table>` : ''}

    <div class="cprow cprow-2">
      ${a1.age_pyramid?.length ? `
      <div>
        <h3>🔺 Population Age Pyramid</h3>
        <div style="display:flex;gap:14px;font-size:10px;margin-bottom:6px">
          <span><span style="display:inline-block;width:10px;height:10px;background:#4a9eff;border-radius:2px;vertical-align:middle;margin-right:3px"></span>Male</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:#ef449d;border-radius:2px;vertical-align:middle;margin-right:3px"></span>Female</span>
        </div>
        ${_pdfAgePyramid(a1.age_pyramid, 350, 280)}
      </div>` : ''}
      ${a1.generation_breakdown?.length ? `
      <div>
        <h3>🌊 Generation Breakdown</h3>
        <div style="margin-top:8px">
        ${a1.generation_breakdown.map((g,i)=>`
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
              <span style="font-weight:600">${g.gen}</span>
              <span style="color:#64748b">${g.population_pct}% pop · ${g.households_pct}% HH</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">
              <div class="bar-wrap"><div class="bar-fill" style="width:${Math.min(100,(g.population_pct/30)*100).toFixed(1)}%;background:${PCOLS[i%PCOLS.length]}"></div></div>
              <div class="bar-wrap"><div class="bar-fill" style="width:${Math.min(100,(g.households_pct/35)*100).toFixed(1)}%;background:${PCOLS[i%PCOLS.length]};opacity:.6"></div></div>
            </div>
          </div>`).join('')}
          <div style="font-size:10px;color:#94a3b8;margin-top:4px">■ Population % &nbsp;&nbsp; ■ Household %</div>
        </div>
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- Consumer Expenditure + Lifestyle Segments -->
  ${(a1.consumer_expenditure?.categories?.length || a1.lifestyle_segments?.length) ? `
  <div style="margin-top:32px">
    ${a1.consumer_expenditure?.categories?.length ? `
    <h2>💳 Consumer Expenditure by Category</h2>
    ${a1.consumer_expenditure.total_expenditure_millions ? `<div style="font-size:13px;margin-bottom:12px">Total market expenditure (${a1.consumer_expenditure.radius_miles||5}-mi radius): <strong style="font-size:17px">$${Number(a1.consumer_expenditure.total_expenditure_millions).toLocaleString()}M</strong></div>` : ''}
    <div class="cprow cprow-2">
      <div>
        ${a1.consumer_expenditure.categories.map((c,i)=>`
        <div style="margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
            <span>${c.category}</span>
            <span style="font-weight:700">$${Number(c.amount_millions).toLocaleString()}M <span style="font-weight:400;color:#64748b">${c.pct_of_total}%</span></span>
          </div>
          <div class="bar-wrap" style="height:9px"><div class="bar-fill" style="width:${Math.min(100,c.pct_of_total/35*100).toFixed(1)}%;background:${PCOLS[i%PCOLS.length]}"></div></div>
        </div>`).join('')}
      </div>
      <div>
        <!-- SVG donut approximation via stacked bars -->
        <div style="background:#f8fafc;border-radius:8px;padding:14px">
          <div style="font-size:12px;font-weight:700;margin-bottom:10px;color:#334155">Expenditure Mix</div>
          ${a1.consumer_expenditure.categories.slice(0,6).map((c,i)=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="width:12px;height:12px;background:${PCOLS[i%PCOLS.length]};border-radius:2px;flex-shrink:0"></div>
            <div style="flex:1;font-size:11px;color:#475569">${c.category}</div>
            <div style="font-size:11px;font-weight:700">${c.pct_of_total}%</div>
          </div>`).join('')}
        </div>
      </div>
    </div>` : ''}

    ${a1.lifestyle_segments?.length ? `
    <h2 style="margin-top:28px">🌆 Lifestyle &amp; Tapestry Segments</h2>
    <div style="display:grid;grid-template-columns:repeat(${Math.min(a1.lifestyle_segments.length,3)},1fr);gap:12px;margin-top:12px">
      ${a1.lifestyle_segments.map((s,i)=>`
      <div class="seg-card" style="border-top-color:${PCOLS[i%PCOLS.length]}">
        <div style="font-size:12px;font-weight:700;color:#0f172a">${s.segment}</div>
        <div class="seg-pct" style="color:${PCOLS[i%PCOLS.length]}">${s.pct}%</div>
        <div style="font-size:11px;color:#64748b;line-height:1.4">${s.description||''}</div>
      </div>`).join('')}
    </div>` : ''}
  </div>` : ''}

  <!-- Education + Occupation LQ + Population Projections -->
  ${(a1.education_attainment || a1.occupation_lq?.length || a1.population_projections?.length >= 3) ? `
  <div style="margin-top:32px">
    <h2>📊 Workforce, Education &amp; Growth</h2>
    <div class="cprow cprow-2">
      ${a1.education_attainment ? (() => {
        const ed = a1.education_attainment;
        const lvs = [
          {l:'Graduate / Professional', p:ed.graduate_pct,    c:PCOLS[0]},
          {l:"Bachelor's Degree",       p:ed.bachelors_pct,   c:PCOLS[1]},
          {l:'Some College / Assoc.',   p:(ed.some_college_pct||0)+(ed.associates_pct||0), c:PCOLS[2]},
          {l:'HS Diploma',              p:ed.hs_grad_pct,     c:'#cbd5e1'},
          {l:'Less than HS',            p:ed.less_than_hs_pct,c:'#ef4444'},
        ].filter(x=>x.p>0);
        return `<div>
          <h3>🎓 Education Attainment${ed.radius_miles?' ('+ed.radius_miles+' mi)':''}</h3>
          ${lvs.map(lv=>`<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
              <span>${lv.l}</span><strong>${lv.p?.toFixed(1)}%</strong>
            </div>
            <div class="bar-wrap" style="height:9px"><div class="bar-fill" style="width:${Math.min(100,lv.p||0).toFixed(1)}%;background:${lv.c}"></div></div>
          </div>`).join('')}
          <div style="margin-top:8px;font-size:11px;color:#16a34a;font-weight:600">✓ ${((ed.bachelors_pct||0)+(ed.graduate_pct||0)).toFixed(1)}% hold bachelor's or higher</div>
        </div>`;
      })() : ''}

      ${a1.occupation_lq?.length ? `
      <div>
        <h3>💼 Workforce by Occupation — Location Quotient vs US</h3>
        <table style="margin-top:8px">
          <thead><tr><th>Occupation</th><th>Area %</th><th>US %</th><th>LQ</th><th>vs US</th></tr></thead>
          <tbody>${a1.occupation_lq.map(o=>{
            const lq = o.lq||(o.area_pct/(o.us_pct||1));
            const cls = lq>=1.5?'lq-high':lq>=0.75?'lq-mid':'lq-low';
            const lbl = lq>=2?'⬆ Very High':lq>=1.25?'↑ Above avg':lq>=0.75?'→ Average':'↓ Below avg';
            return `<tr><td>${o.occupation}</td><td>${o.area_pct}%</td><td style="color:#94a3b8">${o.us_pct}%</td><td class="${cls}" style="font-weight:800">${lq.toFixed(2)}x</td><td style="font-size:11px" class="${cls}">${lbl}</td></tr>`;
          }).join('')}</tbody>
        </table>
        <div style="margin-top:6px;font-size:10px;color:#94a3b8">LQ &gt; 1.0 = more concentrated here than US avg. LQ &gt; 2.0 = major local specialty.</div>
      </div>` : ''}
    </div>

    ${a1.population_projections?.length >= 3 ? `
    <h3 style="margin-top:20px">📈 Population Growth Trend &amp; Projections (2020–2030)</h3>
    <div style="margin:10px 0">
      ${_pdfPopLine(a1.population_projections, 680, 120)}
    </div>` : ''}
  </div>` : ''}

  <!-- Housing + Language + Daytime -->
  ${(a1.housing_detail || a1.language_spoken?.length || a1.daytime_population) ? `
  <div style="margin-top:28px">
    <h2>🏠 Housing, Language &amp; Daytime Population</h2>
    <div class="cprow cprow-3">
      ${a1.housing_detail ? `
      <div class="cp-card">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#334155">🏠 Housing Profile</div>
        ${[
          {l:'Median Home Value', v:'$'+Number(a1.housing_detail.median_home_value||0).toLocaleString()},
          {l:'Avg Home Value',    v:'$'+Number(a1.housing_detail.avg_home_value||0).toLocaleString()},
          {l:'Owner Occupied',   v:(a1.housing_detail.owner_occupied_pct||'—')+'%'},
          {l:'Renter Occupied',  v:(a1.housing_detail.renter_occupied_pct||'—')+'%'},
          {l:'Median Gross Rent',v:'$'+Number(a1.housing_detail.median_gross_rent||0).toLocaleString()},
          {l:'Built 2010+',      v:(a1.housing_detail.built_2010_later_pct||'—')+'%'},
        ].map(k=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #e2e8f0"><span style="color:#64748b">${k.l}</span><strong>${k.v}</strong></div>`).join('')}
        <div style="display:flex;border-radius:4px;overflow:hidden;height:8px;margin-top:8px;gap:2px">
          <div style="flex:${a1.housing_detail.owner_occupied_pct||60};background:#6366f1"></div>
          <div style="flex:${a1.housing_detail.renter_occupied_pct||40};background:#f59e0b"></div>
        </div>
        <div style="display:flex;gap:12px;font-size:9px;color:#64748b;margin-top:3px">
          <span>■ Owner</span><span style="color:#f59e0b">■ Renter</span>
        </div>
      </div>` : ''}

      ${a1.language_spoken?.length ? `
      <div class="cp-card">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#334155">🌍 Languages Spoken at Home</div>
        ${a1.language_spoken.map((l,i)=>`
        <div style="margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
            <span>${l.language}</span><strong>${l.pct}%</strong>
          </div>
          <div class="bar-wrap" style="height:7px"><div class="bar-fill" style="width:${Math.min(100,l.pct).toFixed(1)}%;background:${PCOLS[i%PCOLS.length]}"></div></div>
        </div>`).join('')}
      </div>` : ''}

      ${a1.daytime_population ? `
      <div class="cp-card" style="text-align:center">
        <div style="font-size:12px;font-weight:700;margin-bottom:12px;color:#334155">☀️ Daytime vs. Residential</div>
        ${[
          {ico:'🏠', l:'Residential', v:Number(a1.daytime_population.residential_pop||0).toLocaleString(), c:'#6366f1'},
          {ico:'☀️', l:'Daytime',     v:Number(a1.daytime_population.daytime_pop||0).toLocaleString(),     c:'#22c55e'},
          {ico:'💼', l:'D/R Ratio',   v:(a1.daytime_population.daytime_to_residential_ratio||'—')+'x',    c:'#f59e0b'},
        ].map(k=>`<div style="margin-bottom:12px">
          <div style="font-size:20px;font-weight:900;color:${k.c}">${k.v}</div>
          <div style="font-size:10px;color:#64748b">${k.ico} ${k.l}</div>
        </div>`).join('')}
      </div>` : ''}
    </div>
  </div>` : ''}

  <footer>
    <span>Generated by Business Hunter · AI-Powered Business Analysis</span>
    <span>${date}</span>
  </footer>
</div>
<button class="print-btn" onclick="window.print()">🖨 Save as PDF</button>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else v2Toast('Pop-ups blocked — allow pop-ups for PDF export');
}

// ── F10: SLIDE DECK EXPORT ────────────────────────────────────────────────
function v2ExportSlides() {
  const R_data  = typeof R !== 'undefined' ? R : {};
  const run     = V2.run || {};
  const ind     = V2_INDUSTRIES.find(i => i.val === (run.industry || V2.wizard?.data?.industry)) || { emoji:'🏢', label:'Business' };
  const score   = run.score || v2CalcScore();
  const verdict = v2ScoreVerdict(score);
  const date    = new Date(run.ts || Date.now()).toLocaleDateString('en-US', { month:'short', year:'numeric' });
  const ringColor = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';
  const fmt = v => v ? `$${Number(v).toLocaleString()}` : '—';

  const base    = (R_data.a7?.scenarios||[]).find(s=>(s.name||'').toLowerCase().includes('base'))||R_data.a7?.scenarios?.[1]||{};
  const topCity = (R_data.a2?.cities||[]).sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0];
  const risks   = (R_data.a8?.risks||[]).slice(0,4);
  const steps   = (R_data.a8?.next_steps||[]).slice(0,5);
  const grants  = (R_data.a12?.grants||[]).slice(0,3);
  const a1      = R_data.a1 || {};
  const SCOLS   = ['#6366f1','#22c55e','#f59e0b','#a78bfa','#06b6d4','#f97316','#ef4444','#eab308','#14b8a6'];

  const slides = [
    // Slide 1: Cover
    `<div class="slide cover-slide">
      <div class="slide-num">1 / 12</div>
      <div class="cover-score" style="color:${ringColor}">${score}</div>
      <div class="cover-score-lbl">/ 100 Viability</div>
      <h1>${ind.emoji}<br>${ind.label}</h1>
      <div class="cover-meta">ZIP ${run.zip||V2.wizard?.data?.zip||'—'} · Budget ${fmt(run.budget||V2.wizard?.data?.budget)} · ${date}</div>
      <div class="verdict-chip" style="background:${score>=70?'rgba(34,197,94,.2)':score>=45?'rgba(245,158,11,.2)':'rgba(239,68,68,.2)'};color:${ringColor}">
        ${score>=70?'✅ GO':score>=45?'⚠️ CAUTION':'🚫 NO-GO'} — ${verdict.title}
      </div>
      <div class="slide-brand">Business Hunter · AI Analysis</div>
    </div>`,

    // Slide 2: Executive Summary
    `<div class="slide">
      <div class="slide-num">2 / 12</div>
      <h2>Executive Summary</h2>
      <div class="slide-body">
        ${R_data.a8?.verdict_rationale || R_data.a8?.assessment || '<p style="color:#64748b">Run Agent 8 for executive summary.</p>'}
      </div>
    </div>`,

    // Slide 3: Market Opportunity
    `<div class="slide">
      <div class="slide-num">3 / 12</div>
      <h2>📊 Market Opportunity</h2>
      <div class="slide-body">
        ${topCity ? `<div class="highlight-box">
          <div class="highlight-num">${topCity.gap_score || '—'}/10</div>
          <div class="highlight-lbl">Gap Score — ${topCity.city || 'Top Market'}</div>
        </div>` : ''}
        ${R_data.a2?.summary || '<p>Run Agent 2 for gap analysis.</p>'}
      </div>
    </div>`,

    // Slide 4: Demographics — Multi-Radius + Generation
    `<div class="slide">
      <h2>👥 Community Demographics</h2>
      ${a1.multi_radius?.length ? `
      <div class="slide-body" style="overflow:hidden">
        <div style="display:grid;grid-template-columns:repeat(${a1.multi_radius.length},1fr);gap:10px;margin-bottom:14px">
          ${a1.multi_radius.map(r=>`
          <div class="fin-kpi" style="border-top:3px solid ${r.ring==='1 mi'?'#6366f1':r.ring==='3 mi'?'#22c55e':'#f59e0b'}">
            <div style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:6px">${r.ring} RADIUS</div>
            <div style="font-size:13px;font-weight:900;color:${r.ring==='1 mi'?'#6366f1':r.ring==='3 mi'?'#22c55e':'#f59e0b'}">$${(Number(r.median_hh_income||0)/1000).toFixed(0)}K</div>
            <div style="font-size:9px;color:#64748b">Median HHI</div>
            <div style="font-size:12px;font-weight:700;margin-top:4px">${Number(r.population||0).toLocaleString()}</div>
            <div style="font-size:9px;color:#64748b">Population</div>
            <div style="font-size:12px;font-weight:700;margin-top:4px">${Number(r.pop_under5||0).toLocaleString()}</div>
            <div style="font-size:9px;color:#64748b">Children &lt;5</div>
            <div style="font-size:12px;font-weight:700;margin-top:4px">${r.pct_with_children||'—'}%</div>
            <div style="font-size:9px;color:#64748b">HH w/ Children</div>
          </div>`).join('')}
        </div>
        ${a1.generation_breakdown?.length ? `
        <div style="margin-top:8px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Generation Breakdown</div>
          <div style="display:flex;gap:0;height:24px;border-radius:6px;overflow:hidden">
            ${a1.generation_breakdown.map((g,i)=>`<div style="flex:${g.population_pct};background:${SCOLS[i%SCOLS.length]};display:flex;align-items:center;justify-content:center" title="${g.gen}: ${g.population_pct}%">
              ${g.population_pct>8?`<span style="font-size:8px;font-weight:700;color:rgba(255,255,255,.9)">${g.population_pct}%</span>`:''}
            </div>`).join('')}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
            ${a1.generation_breakdown.map((g,i)=>`<span style="font-size:9px;color:#94a3b8"><span style="display:inline-block;width:8px;height:8px;background:${SCOLS[i%SCOLS.length]};border-radius:1px;vertical-align:middle;margin-right:2px"></span>${g.gen.split(' (')[0]}</span>`).join('')}
          </div>
        </div>` : `<p>${a1.summary||'Run Agent 1 for demographics.'}</p>`}
      </div>` : `<div class="slide-body">${a1.summary||'<p>Run Agent 1 for demographic analysis.</p>'}</div>`}
    </div>`,

    // Slide 5: Age Pyramid
    `<div class="slide">
      <h2>🔺 Population Age Pyramid</h2>
      <div class="slide-body" style="display:flex;align-items:center;gap:24px">
        ${a1.age_pyramid?.length ? `
        <div style="flex:1">
          ${_pdfAgePyramid(a1.age_pyramid, 360, 310)}
        </div>
        <div style="flex:0 0 200px;display:flex;flex-direction:column;gap:10px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Key Cohorts</div>
          ${a1.age_pyramid.filter(b=>['30-34','35-39','0-4','5-9'].includes(b.bracket)).map(b=>`
          <div style="background:rgba(255,255,255,.05);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:#64748b;margin-bottom:2px">Age ${b.bracket}</div>
            <div style="font-size:12px;font-weight:700;color:#6366f1">${Number((b.male||0)+(b.female||0)).toLocaleString()}</div>
            <div style="font-size:9px;color:#64748b">Total · ${Number(b.male||0).toLocaleString()} M / ${Number(b.female||0).toLocaleString()} F</div>
          </div>`).join('')}
          <div style="display:flex;gap:10px;margin-top:4px;font-size:10px">
            <span style="color:#4a9eff">◀ Male</span>
            <span style="color:#ef449d">Female ▶</span>
          </div>
        </div>` : '<p style="color:#64748b">Age pyramid data from Agent 1.</p>'}
      </div>
    </div>`,

    // Slide 6: Consumer Expenditure
    `<div class="slide">
      <h2>💳 Consumer Expenditure — $${a1.consumer_expenditure?.total_expenditure_millions ? Number(a1.consumer_expenditure.total_expenditure_millions).toLocaleString()+'M' : '—'} Market</h2>
      <div class="slide-body">
        ${a1.consumer_expenditure?.categories?.length ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:4px">
          <div>
            ${a1.consumer_expenditure.categories.map((c,i)=>`
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                <span style="color:#e2e8f0">${c.category}</span>
                <span style="font-weight:700;color:#f1f5f9">$${Number(c.amount_millions).toLocaleString()}M <span style="font-weight:400;color:#64748b">${c.pct_of_total}%</span></span>
              </div>
              <div style="background:rgba(255,255,255,.08);border-radius:3px;height:8px;overflow:hidden">
                <div style="height:100%;width:${Math.min(100,c.pct_of_total/35*100).toFixed(1)}%;background:${SCOLS[i%SCOLS.length]};border-radius:3px"></div>
              </div>
            </div>`).join('')}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;padding-top:4px">
            ${a1.consumer_expenditure.categories.map((c,i)=>`
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:14px;height:14px;background:${SCOLS[i%SCOLS.length]};border-radius:3px;flex-shrink:0"></div>
              <div style="font-size:11px;color:#94a3b8;flex:1">${c.category}</div>
              <div style="font-size:11px;font-weight:700;color:#f1f5f9">${c.pct_of_total}%</div>
            </div>`).join('')}
          </div>
        </div>` : '<p>Consumer expenditure data from Agent 1.</p>'}
      </div>
    </div>`,

    // Slide 7: Lifestyle Segments + Workforce LQ
    `<div class="slide">
      <h2>🌆 Lifestyle Segments &amp; Workforce</h2>
      <div class="slide-body" style="display:flex;flex-direction:column;gap:14px">
        ${a1.lifestyle_segments?.length ? `
        <div>
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Tapestry Lifestyle Segments</div>
          <div style="display:grid;grid-template-columns:repeat(${Math.min(a1.lifestyle_segments.length,5)},1fr);gap:8px">
            ${a1.lifestyle_segments.map((s,i)=>`
            <div style="border-top:3px solid ${SCOLS[i%SCOLS.length]};padding:8px;border-radius:4px;background:rgba(255,255,255,.05)">
              <div style="font-size:11px;font-weight:700;color:#f1f5f9;margin-bottom:3px;line-height:1.3">${s.segment}</div>
              <div style="font-size:18px;font-weight:900;color:${SCOLS[i%SCOLS.length]};margin:2px 0">${s.pct}%</div>
              <div style="font-size:9px;color:#64748b;line-height:1.3">${s.description||''}</div>
            </div>`).join('')}
          </div>
        </div>` : ''}
        ${a1.occupation_lq?.length ? `
        <div>
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Location Quotient vs. US Avg</div>
          <div style="display:grid;grid-template-columns:repeat(${Math.min(a1.occupation_lq.length,4)},1fr);gap:8px">
            ${a1.occupation_lq.slice(0,4).map(o=>{
              const lq = o.lq||(o.area_pct/(o.us_pct||1));
              const c  = lq>=1.5?'#22c55e':lq>=0.75?'#f59e0b':'#ef4444';
              return `<div style="background:rgba(255,255,255,.05);border-radius:8px;padding:10px;text-align:center">
                <div style="font-size:20px;font-weight:900;color:${c}">${lq.toFixed(2)}x</div>
                <div style="font-size:9px;color:#94a3b8;margin-top:3px;line-height:1.3">${o.occupation}</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}
        ${a1.education_attainment ? `
        <div>
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Education Attainment</div>
          <div style="font-size:13px;color:#22c55e;font-weight:700">✓ ${((a1.education_attainment.bachelors_pct||0)+(a1.education_attainment.graduate_pct||0)).toFixed(1)}% hold bachelor's degree or higher${a1.education_attainment.radius_miles?' ('+a1.education_attainment.radius_miles+' mi radius)':''}</div>
        </div>` : ''}
      </div>
    </div>`,

    // Slide 8: Population Growth (was formerly not a standalone slide)
    `<div class="slide">
      <h2>📈 Population Growth &amp; Projections</h2>
      <div class="slide-body" style="display:flex;flex-direction:column;gap:16px">
        ${a1.population_projections?.length >= 3 ? `
        <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:14px">
          ${_pdfPopLine(a1.population_projections, 680, 130)}
        </div>
        <div style="display:grid;grid-template-columns:repeat(${Math.min(a1.population_projections.length,5)},1fr);gap:8px">
          ${a1.population_projections.map(p=>`
          <div style="text-align:center;background:rgba(255,255,255,.04);border-radius:8px;padding:10px">
            <div style="font-size:14px;font-weight:900;color:${p.year>2024?'#22c55e':'#4a9eff'}">${(p.population/1000).toFixed(0)}K</div>
            <div style="font-size:9px;color:#64748b">${p.year}${p.year>2024?' (proj)':''}</div>
          </div>`).join('')}
        </div>` : '<p>Run Agent 1 for population projections.</p>'}
        ${a1.daytime_population ? `
        <div style="display:flex;gap:12px">
          ${[
            {ico:'🏠', l:'Residential',  v:Number(a1.daytime_population.residential_pop||0).toLocaleString(), c:'#6366f1'},
            {ico:'☀️', l:'Daytime Pop',  v:Number(a1.daytime_population.daytime_pop||0).toLocaleString(),     c:'#22c55e'},
            {ico:'↔️', l:'D/R Ratio',    v:(a1.daytime_population.daytime_to_residential_ratio||'—')+'x',    c:'#f59e0b'},
          ].map(k=>`<div style="flex:1;background:rgba(255,255,255,.05);border-radius:8px;padding:12px;text-align:center;border-top:2px solid ${k.c}">
            <div style="font-size:18px;font-weight:900;color:${k.c}">${k.v}</div>
            <div style="font-size:10px;color:#64748b">${k.ico} ${k.l}</div>
          </div>`).join('')}
        </div>` : ''}
      </div>
    </div>`,

    // Slide 9: Financial Projections (was slide 5)
    `<div class="slide">
      <div class="slide-num">5 / 12</div>
      <h2>💰 Financial Projections</h2>
      <div class="fin-kpis">
        ${[
          { label:'Base Revenue/mo', val: fmt(base.monthly_revenue) },
          { label:'Base Net/mo',     val: fmt(base.monthly_net), color: (base.monthly_net||0)>0?'#22c55e':'#ef4444' },
          { label:'Break-Even',      val: base.breakeven_months ? base.breakeven_months+' mo' : '—' },
          { label:'3-Year ROI',      val: base.roi_3yr != null ? (base.roi_3yr>0?'+':'')+base.roi_3yr+'%' : '—' },
        ].map(k => `<div class="fin-kpi"><div class="fin-val" ${k.color?`style="color:${k.color}"`:''}>${k.val}</div><div class="fin-lbl">${k.label}</div></div>`).join('')}
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:12px">${R_data.a7?.summary || ''}</div>
    </div>`,

    // Slide 6: Startup Costs
    `<div class="slide">
      <div class="slide-num">6 / 12</div>
      <h2>💸 Startup Cost Breakdown</h2>
      <div style="font-size:22px;font-weight:900;color:#6366f1;margin-bottom:8px">${fmt(R_data.a7?.total_startup_cost)}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:16px">Total estimated startup investment</div>
      <div class="cost-grid">
        ${(R_data.a7?.startup_breakdown||[]).slice(0,6).map(item =>
          `<div class="cost-item">
            <span>${typeof item==='string'?item:(item.item||item.category||'')}</span>
            <strong>${typeof item==='object'?fmt(item.cost||item.amount||0):'—'}</strong>
          </div>`).join('') || '<p style="color:#64748b">Run Agent 7 for cost breakdown.</p>'}
      </div>
    </div>`,

    // Slide 7: Competitive Landscape
    `<div class="slide">
      <div class="slide-num">7 / 12</div>
      <h2>🔍 Competitive Landscape</h2>
      <div class="slide-body">
        ${R_data.a6?.summary || '<p>Run Agent 6 for competitive analysis.</p>'}
        ${(R_data.a13?.differentiators||[]).slice(0,3).length ? `
        <div style="margin-top:14px"><strong style="font-size:12px;color:#6366f1">YOUR DIFFERENTIATORS</strong>
          <ul>${(R_data.a13.differentiators||[]).slice(0,3).map(d=>`<li>${typeof d==='string'?d:(d.advantage||d.differentiator||'')}</li>`).join('')}</ul>
        </div>` : ''}
      </div>
    </div>`,

    // Slide 8: Compliance & Timeline
    `<div class="slide">
      <div class="slide-num">8 / 12</div>
      <h2>⚖️ Compliance & Permits</h2>
      <div class="slide-body">
        ${R_data.a5?.summary || '<p>Run Agent 5 for compliance analysis.</p>'}
        ${R_data.a5?.total_timeline_months ? `<div class="highlight-box" style="margin-top:12px"><div class="highlight-num">${R_data.a5.total_timeline_months} mo</div><div class="highlight-lbl">Est. licensing timeline</div></div>` : ''}
      </div>
    </div>`,

    // Slide 9: Site Selection
    `<div class="slide">
      <div class="slide-num">9 / 12</div>
      <h2>📍 Site Selection</h2>
      <div class="slide-body">
        ${(R_data.a3?.sites||[]).slice(0,3).map((s,i) => `
          <div class="site-row">
            <span class="site-num">#${i+1}</span>
            <div><strong>${s.address||s.location||s.name||'Site '+(i+1)}</strong>
              <span style="color:#64748b"> · ${s.city||''}</span>
              <div style="font-size:11px;color:#94a3b8">${s.rent_monthly?`$${Number(s.rent_monthly).toLocaleString()}/mo`:''}${s.sq_ft?` · ${Number(s.sq_ft).toLocaleString()} sqft`:''}</div>
            </div>
          </div>`).join('') || '<p style="color:#64748b">Run Agent 3 for site analysis.</p>'}
      </div>
    </div>`,

    // Slide 10: Grants & Funding
    `<div class="slide">
      <div class="slide-num">10 / 12</div>
      <h2>💵 Grants & Funding</h2>
      <div class="slide-body">
        ${R_data.a12?.summary ? `<p>${R_data.a12.summary}</p>` : ''}
        ${grants.length ? `<ul>${grants.map(g=>`<li><strong>${g.name||g.program}</strong> — ${g.amount||'See report'}</li>`).join('')}</ul>` : '<p style="color:#64748b">Run Agent 12 for grant opportunities.</p>'}
      </div>
    </div>`,

    // Slide 11: Risk Matrix
    `<div class="slide">
      <div class="slide-num">11 / 12</div>
      <h2>⚠️ Key Risks</h2>
      <div class="risk-list">
        ${risks.map(r => {
          const sev = (typeof r === 'object' ? r.severity : 'Medium') || 'Medium';
          const title = typeof r === 'string' ? r : (r.risk || r.title || '');
          return `<div class="risk-row">
            <span class="sev-chip ${sev.toLowerCase()}">${sev.toUpperCase()}</span>
            <span>${title}</span>
          </div>`;
        }).join('') || '<p style="color:#64748b">Run Agent 8 for risk analysis.</p>'}
      </div>
    </div>`,

    // Slide 12: Next Steps
    `<div class="slide">
      <div class="slide-num">12 / 12</div>
      <h2>✅ Recommended Next Steps</h2>
      <ol class="steps-list">
        ${steps.map(s => `<li>${typeof s === 'string' ? s : (s.step || s.title || s.action || '')}</li>`).join('') || '<li>Complete the full pipeline to generate next steps.</li>'}
      </ol>
      <div class="slide-brand" style="margin-top:auto">Business Hunter · businesshunter.ai</div>
    </div>`,
  ];

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',-apple-system,sans-serif;background:#0d0d1a;color:#f1f5f9;overflow:hidden}
    .deck{width:100vw;height:100vh;display:flex;flex-direction:column}
    .nav{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
    .nav-btns{display:flex;gap:10px}
    .nav-btn{padding:7px 16px;border-radius:7px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#f1f5f9;font-size:13px;font-weight:600;cursor:pointer}
    .nav-btn:hover{background:rgba(255,255,255,.15)}
    .nav-title{font-size:14px;font-weight:700;background:linear-gradient(135deg,#6366f1,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .slide-wrap{flex:1;overflow:hidden;position:relative}
    .slide{display:none;position:absolute;inset:0;padding:48px 64px;flex-direction:column;overflow:hidden}
    .slide.active{display:flex}
    .slide-num{position:absolute;top:20px;right:24px;font-size:11px;color:rgba(255,255,255,.3);font-weight:600}
    h1{font-size:36px;font-weight:900;letter-spacing:-.03em;margin-bottom:12px;line-height:1.2}
    h2{font-size:22px;font-weight:800;letter-spacing:-.02em;margin-bottom:16px;background:linear-gradient(135deg,#6366f1,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .cover-slide{align-items:flex-start;justify-content:center;gap:6px}
    .cover-score{font-size:64px;font-weight:900;letter-spacing:-.04em;line-height:1}
    .cover-score-lbl{font-size:14px;color:#64748b;font-weight:600;margin-bottom:12px}
    .cover-meta{font-size:13px;color:#64748b;margin-bottom:12px}
    .verdict-chip{display:inline-flex;padding:7px 16px;border-radius:999px;font-size:14px;font-weight:700;margin-top:4px}
    .slide-brand{font-size:11px;color:rgba(255,255,255,.2);margin-top:auto;padding-top:16px}
    .slide-body{font-size:13px;color:#94a3b8;line-height:1.65;flex:1;overflow:hidden}
    .slide-body strong{color:#f1f5f9}
    .highlight-box{display:inline-flex;flex-direction:column;align-items:center;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:12px;padding:14px 20px;margin:0 12px 12px 0}
    .highlight-num{font-size:28px;font-weight:900;color:#6366f1}
    .highlight-lbl{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
    .fin-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px}
    .fin-kpi{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;text-align:center}
    .fin-val{font-size:20px;font-weight:800;letter-spacing:-.02em;color:#f1f5f9}
    .fin-lbl{font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
    .cost-grid{display:flex;flex-direction:column;gap:6px}
    .cost-item{display:flex;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,.04);border-radius:7px;font-size:13px}
    .site-row{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}
    .site-num{font-size:20px;font-weight:900;color:#6366f1;flex-shrink:0;width:28px}
    .risk-list{display:flex;flex-direction:column;gap:10px}
    .risk-row{display:flex;align-items:center;gap:12px;font-size:13px;color:#94a3b8}
    .sev-chip{font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;flex-shrink:0}
    .sev-chip.high{background:rgba(239,68,68,.2);color:#ef4444}
    .sev-chip.medium{background:rgba(245,158,11,.2);color:#f59e0b}
    .sev-chip.low{background:rgba(34,197,94,.2);color:#22c55e}
    .steps-list{padding-left:20px;display:flex;flex-direction:column;gap:10px;font-size:14px;color:#94a3b8;margin-top:8px}
    .steps-list li::marker{color:#6366f1;font-weight:700}
    ul{padding-left:18px;color:#94a3b8;font-size:13px;display:flex;flex-direction:column;gap:6px;margin-top:8px}
    p{font-size:13px;color:#94a3b8;line-height:1.65}
    @media print{body{background:#fff;color:#0f172a}.nav{display:none}.slide{display:flex!important;position:static;page-break-after:always;background:#fff;height:100vh}.slide-num{color:#94a3b8}h2{-webkit-text-fill-color:#6366f1}p,li{color:#334155}.fin-val,.cover-score{color:#0f172a}.highlight-num{color:#6366f1}.fin-kpi,.highlight-box,.cost-item{background:#f8fafc;border-color:#e2e8f0}.risk-row{color:#334155}}`;

  let currentSlide = 0;
  const w = window.open('', '_blank');
  if (!w) { v2Toast('Pop-ups blocked — allow pop-ups for slides export'); return; }

  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>${ind.emoji} ${ind.label} — Pitch Deck</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
    <style>${css}</style></head>
    <body>
    <div class="deck">
      <div class="nav">
        <div class="nav-title">${ind.emoji} ${ind.label} — Pitch Deck</div>
        <div class="nav-btns">
          <button class="nav-btn" onclick="prevSlide()">← Prev</button>
          <button class="nav-btn" id="slide-counter">1 / ${slides.length}</button>
          <button class="nav-btn" onclick="nextSlide()">Next →</button>
          <button class="nav-btn" onclick="window.print()">🖨 Print PDF</button>
          <button class="nav-btn pptx-btn" id="pptx-dl-btn" onclick="downloadPptx()" style="background:rgba(99,102,241,.25);border-color:rgba(99,102,241,.5);color:#a5b4fc">⬇ PPTX</button>
        </div>
      </div>
      <div class="slide-wrap">
        ${slides.map((s,i) => s.replace('class="slide', `class="slide${i===0?' active':''}`)).join('\n')}
      </div>
    </div>
    <script>
      let cur = 0;
      const count = ${slides.length};
      function show(n) {
        document.querySelectorAll('.slide').forEach((s,i) => s.classList.toggle('active', i===n));
        document.getElementById('slide-counter').textContent = (n+1)+' / '+count;
        cur = n;
      }
      function nextSlide() { show(Math.min(cur+1, count-1)); }
      function prevSlide() { show(Math.max(cur-1, 0)); }
      document.addEventListener('keydown', e => {
        if (e.key==='ArrowRight'||e.key==='ArrowDown') nextSlide();
        if (e.key==='ArrowLeft'||e.key==='ArrowUp') prevSlide();
      });

      // ── PPTX Download via PptxGenJS ────────────────────────────────────────
      const _pptxData = ${JSON.stringify({
        title:    ind.label,
        zip:      run.zip || V2?.wizard?.data?.zip || '',
        radius:   run.radius || V2?.wizard?.data?.radius || '',
        budget:   run.budget || V2?.wizard?.data?.budget || '',
        date,
        score,
        verdict:  verdict.title,
        verdictClass: verdict.colorClass,
        ringColor,
        a1summary: a1.summary || '',
        multiRadius: a1.multi_radius || [],
        generations: a1.generation_breakdown || [],
        lifestyleSegs: a1.lifestyle_segments || [],
        consumerExp:  a1.consumer_expenditure || {},
        occupationLQ: a1.occupation_lq || [],
        educationAtt: a1.education_attainment || {},
        popProj:      a1.population_projections || [],
        housingDetail: a1.housing_detail || {},
        scenarios:    R_data.a7?.scenarios || [],
        startupCost:  R_data.a7?.total_startup_cost || 0,
        startupBreak: R_data.a7?.startup_breakdown || [],
        gaps:    R_data.a2?.cities || [],
        gapSummary: R_data.a2?.summary || '',
        risks:   risks,
        steps:   steps,
        grants:  grants,
        comp6sum: R_data.a6?.summary || '',
        differenctiators: R_data.a13?.differentiators || [],
        comp5sum: R_data.a5?.summary || '',
        comp5months: R_data.a5?.total_timeline_months || null,
        sites:   R_data.a3?.sites || [],
        grantSum: R_data.a12?.summary || '',
      })};

      async function downloadPptx() {
        const btn = document.getElementById('pptx-dl-btn');
        if (btn) { btn.textContent = '⏳ Building...'; btn.disabled = true; }
        try {
          if (!window.PptxGenJS) {
            await new Promise((res, rej) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
              s.onload = res; s.onerror = rej;
              document.head.appendChild(s);
            });
          }
          const pptx = new PptxGenJS();
          pptx.layout = 'LAYOUT_WIDE';
          pptx.author = 'Business Hunter AI';
          pptx.title  = _pptxData.title + ' — Business Analysis';

          const DARK = '0D0D1A', ACCENT = '6366F1', GREEN = '22C55E', AMBER = 'F59E0B', RED = 'EF4444';
          const WHITE = 'F1F5F9', GRAY = '64748B', LGRAY = '94A3B8';
          const scoreClr = _pptxData.verdictClass === 'go' ? GREEN : _pptxData.verdictClass === 'caution' ? AMBER : RED;
          const fmtN = v => v ? '$' + Number(v).toLocaleString() : '—';

          // Helper: add dark background
          function bg(slide) { slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:'100%', fill:{color:DARK} }); }
          function hdr(slide, txt, y=0.25) {
            slide.addText(txt, { x:0.5, y, w:12, h:0.55, fontSize:22, bold:true, color:ACCENT, fontFace:'Calibri' });
          }
          function subTxt(slide, txt, x, y, w, h, opts={}) {
            slide.addText(txt, { x, y, w, h, fontSize:11, color:LGRAY, fontFace:'Calibri', wrap:true, ...opts });
          }
          function kpiBox(slide, val, lbl, x, y, clr=ACCENT) {
            slide.addShape(pptx.ShapeType.roundRect, { x, y, w:2.8, h:1.2, fill:{color:'14151E'}, line:{color:'1E2030', width:1}, rectRadius:0.08 });
            slide.addText(val, { x, y:y+0.1, w:2.8, h:0.7, align:'center', fontSize:20, bold:true, color:clr, fontFace:'Calibri' });
            slide.addText(lbl, { x, y:y+0.8, w:2.8, h:0.35, align:'center', fontSize:9, color:LGRAY, fontFace:'Calibri' });
          }

          // ── Slide 1: Cover ──────────────────────────────────────────────────
          const s1 = pptx.addSlide();
          bg(s1);
          s1.addShape(pptx.ShapeType.rect, { x:0, y:0, w:0.08, h:'100%', fill:{color:ACCENT} });
          s1.addText(_pptxData.title, { x:0.4, y:1.2, w:9, h:1.2, fontSize:40, bold:true, color:WHITE, fontFace:'Calibri' });
          s1.addText('Business Viability Analysis', { x:0.4, y:0.7, w:9, h:0.5, fontSize:14, color:LGRAY, fontFace:'Calibri' });
          s1.addText('ZIP ' + _pptxData.zip + '  ·  ' + _pptxData.radius + ' mi radius  ·  $' + Number(_pptxData.budget||0).toLocaleString() + ' budget', { x:0.4, y:2.5, w:9, h:0.4, fontSize:13, color:GRAY, fontFace:'Calibri' });
          s1.addText(_pptxData.date, { x:0.4, y:2.95, w:5, h:0.35, fontSize:11, color:GRAY, fontFace:'Calibri' });
          s1.addShape(pptx.ShapeType.roundRect, { x:0.4, y:3.5, w:3, h:0.7, fill:{color:scoreClr+'22'}, line:{color:scoreClr, width:2}, rectRadius:0.12 });
          s1.addText((_pptxData.verdictClass==='go'?'✅ GO':_pptxData.verdictClass==='caution'?'⚠️ CAUTION':'🚫 NO-GO') + ' — ' + _pptxData.verdict, { x:0.4, y:3.55, w:3, h:0.6, align:'center', fontSize:14, bold:true, color:scoreClr, fontFace:'Calibri' });
          s1.addText(String(_pptxData.score), { x:10, y:1.2, w:2.8, h:1.4, align:'center', fontSize:72, bold:true, color:scoreClr, fontFace:'Calibri' });
          s1.addText('/100 Viability Score', { x:10, y:2.65, w:2.8, h:0.4, align:'center', fontSize:11, color:LGRAY, fontFace:'Calibri' });
          s1.addText('Business Hunter · AI-Powered Analysis', { x:0.4, y:6.8, w:12, h:0.3, fontSize:9, color:'2D2D3F', fontFace:'Calibri' });

          // ── Slide 2: Executive Summary ──────────────────────────────────────
          const s2 = pptx.addSlide();
          bg(s2);
          hdr(s2, '📋 Executive Summary');
          const rationale = (typeof R !== 'undefined' && R.a8?.verdict_rationale) ? R.a8.verdict_rationale : _pptxData.gapSummary || 'Run the full analysis pipeline to generate the executive summary.';
          subTxt(s2, rationale, 0.5, 0.9, 12.3, 2.5, {fontSize:13, color:'CBD5E1', lineSpacingMultiple:1.4});
          const sfList = (typeof R !== 'undefined' && R.a8?.success_factors) ? R.a8.success_factors : [];
          if (sfList.length) {
            s2.addText('KEY SUCCESS FACTORS', { x:0.5, y:3.5, w:12, h:0.35, fontSize:9, bold:true, color:ACCENT, fontFace:'Calibri', charSpacing:2 });
            sfList.slice(0,4).forEach((sf, i) => {
              s2.addShape(pptx.ShapeType.roundRect, { x:0.5+i*3.25, y:3.9, w:3, h:1.0, fill:{color:'14151E'}, line:{color:'1E2030',width:1}, rectRadius:0.08 });
              subTxt(s2, typeof sf==='string'?sf:(sf.factor||sf.title||String(sf)), 0.5+i*3.25, 3.95, 3, 0.9, {fontSize:10, color:WHITE, align:'center'});
            });
          }

          // ── Slide 3: Market Gap ─────────────────────────────────────────────
          const s3 = pptx.addSlide();
          bg(s3);
          hdr(s3, '📊 Market Opportunity');
          subTxt(s3, _pptxData.gapSummary, 0.5, 0.9, 12.3, 1.2, {fontSize:12, color:'CBD5E1', lineSpacingMultiple:1.4});
          const topG = (_pptxData.gaps||[]).sort((a,b)=>(b.gap_score||0)-(a.gap_score||0)).slice(0,4);
          topG.forEach((c,i) => {
            const gs = c.gap_score||0;
            const clr = gs>=7?GREEN:gs>=4?AMBER:RED;
            s3.addShape(pptx.ShapeType.roundRect, { x:0.5+i*3.2, y:2.2, w:3.0, h:1.8, fill:{color:'14151E'}, line:{color:clr, width:2}, rectRadius:0.1 });
            s3.addText(c.city||c.name||'—', { x:0.5+i*3.2, y:2.3, w:3.0, h:0.4, align:'center', fontSize:12, bold:true, color:WHITE, fontFace:'Calibri' });
            s3.addText(String(gs)+'/10', { x:0.5+i*3.2, y:2.75, w:3.0, h:0.65, align:'center', fontSize:28, bold:true, color:clr, fontFace:'Calibri' });
            s3.addText('Gap Score', { x:0.5+i*3.2, y:3.45, w:3.0, h:0.3, align:'center', fontSize:9, color:LGRAY, fontFace:'Calibri' });
            s3.addText(gs>=7?'🟢 High Opp.':gs>=4?'🟡 Moderate':'🔴 Saturated', { x:0.5+i*3.2, y:3.75, w:3.0, h:0.3, align:'center', fontSize:9, color:clr, fontFace:'Calibri' });
          });

          // ── Slide 4: Demographics ───────────────────────────────────────────
          const s4 = pptx.addSlide();
          bg(s4);
          hdr(s4, '👥 Community Demographics — ZIP ' + _pptxData.zip);
          (_pptxData.multiRadius||[]).forEach((r,i) => {
            const clr = i===0?ACCENT:i===1?GREEN:AMBER;
            s4.addShape(pptx.ShapeType.roundRect, { x:0.5+i*4.3, y:0.9, w:4.0, h:2.0, fill:{color:'14151E'}, line:{color:clr, width:2}, rectRadius:0.1 });
            s4.addText(r.ring+' Radius', { x:0.5+i*4.3, y:1.0, w:4.0, h:0.4, align:'center', fontSize:11, bold:true, color:clr, fontFace:'Calibri' });
            [
              {l:'Median HHI',      v:'$'+(Number(r.median_hh_income||0)/1000).toFixed(0)+'K'},
              {l:'Population',      v:Number(r.population||0).toLocaleString()},
              {l:'Children <5',     v:Number(r.pop_under5||0).toLocaleString()},
              {l:'HH w/Children',   v:(r.pct_with_children||'—')+'%'},
            ].forEach((k,j) => {
              s4.addText(k.v, { x:0.5+i*4.3, y:1.45+j*0.32, w:4.0, h:0.28, align:'center', fontSize:14, bold:true, color:WHITE, fontFace:'Calibri' });
              s4.addText(k.l, { x:0.5+i*4.3, y:1.72+j*0.32, w:4.0, h:0.22, align:'center', fontSize:8, color:LGRAY, fontFace:'Calibri' });
            });
          });
          if (_pptxData.generations?.length) {
            s4.addText('GENERATION MIX', { x:0.5, y:3.1, w:12, h:0.3, fontSize:8, bold:true, color:ACCENT, charSpacing:2, fontFace:'Calibri' });
            let gx = 0.5;
            _pptxData.generations.forEach((g,i) => {
              const bw = Math.max(0.5, g.population_pct / 100 * 12.3);
              const gclr = [ACCENT,GREEN,AMBER,'A78BFA','06B6D4','F97316'][i%6];
              s4.addShape(pptx.ShapeType.rect, { x:gx, y:3.5, w:bw, h:0.45, fill:{color:gclr} });
              if (bw > 1.2) s4.addText(g.gen.split(' (')[0]+' '+g.population_pct+'%', { x:gx+0.05, y:3.55, w:bw-0.1, h:0.35, fontSize:8, bold:true, color:'FFFFFF', fontFace:'Calibri' });
              gx += bw;
            });
            s4.addText(_pptxData.a1summary.substring(0,300), { x:0.5, y:4.1, w:12.3, h:1.4, fontSize:10, color:'94A3B8', fontFace:'Calibri', wrap:true, lineSpacingMultiple:1.35 });
          }

          // ── Slide 5: Consumer Expenditure ──────────────────────────────────
          const s5 = pptx.addSlide();
          bg(s5);
          const ce = _pptxData.consumerExp;
          hdr(s5, '💳 Consumer Expenditure — $' + (ce?.total_expenditure_millions ? Number(ce.total_expenditure_millions).toLocaleString()+'M market' : 'Market Spend'));
          (ce?.categories||[]).forEach((c,i) => {
            const barW = Math.max(0.1, (c.pct_of_total/35)*10.5);
            const clrs = [ACCENT,GREEN,AMBER,'A78BFA','06B6D4','F97316','EF4444','EAB308','14B8A6'];
            const yp = 1.0 + i * 0.58;
            s5.addText(c.category, { x:0.5, y:yp, w:3.5, h:0.4, fontSize:11, color:WHITE, fontFace:'Calibri', valign:'middle' });
            s5.addShape(pptx.ShapeType.rect, { x:4.2, y:yp+0.07, w:Math.max(0.05, barW), h:0.28, fill:{color:clrs[i%clrs.length]}, rectRadius:0.04 });
            s5.addText('$'+Number(c.amount_millions).toLocaleString()+'M  '+c.pct_of_total+'%', { x:4.3+barW, y:yp, w:3.5, h:0.4, fontSize:10, bold:true, color:clrs[i%clrs.length], fontFace:'Calibri', valign:'middle' });
          });

          // ── Slide 6: Lifestyle Segments ─────────────────────────────────────
          const s6 = pptx.addSlide();
          bg(s6);
          hdr(s6, '🌆 Lifestyle & Tapestry Segments');
          const segs = _pptxData.lifestyleSegs || [];
          segs.forEach((seg,i) => {
            const sx = 0.5 + (i % 3) * 4.4;
            const sy = 1.0 + Math.floor(i/3) * 2.3;
            const sclr = [ACCENT,GREEN,AMBER,'A78BFA','06B6D4'][i%5];
            s6.addShape(pptx.ShapeType.roundRect, { x:sx, y:sy, w:4.0, h:2.0, fill:{color:'14151E'}, line:{color:sclr, width:3}, rectRadius:0.1 });
            s6.addText(seg.segment, { x:sx+0.1, y:sy+0.1, w:3.8, h:0.5, fontSize:13, bold:true, color:WHITE, fontFace:'Calibri' });
            s6.addText(String(seg.pct)+'%', { x:sx+0.1, y:sy+0.6, w:3.8, h:0.65, fontSize:30, bold:true, color:sclr, fontFace:'Calibri' });
            s6.addText(seg.description||'', { x:sx+0.1, y:sy+1.25, w:3.8, h:0.65, fontSize:9, color:LGRAY, fontFace:'Calibri', wrap:true, lineSpacingMultiple:1.3 });
          });
          if (_pptxData.educationAtt?.bachelors_pct) {
            const ed = _pptxData.educationAtt;
            const edu = ((ed.bachelors_pct||0)+(ed.graduate_pct||0)).toFixed(1);
            s6.addText('🎓 '+edu+'% hold bachelor\'s degree or higher'+(ed.radius_miles?' ('+ed.radius_miles+' mi radius)':''), { x:0.5, y:6.7, w:12, h:0.35, fontSize:12, bold:true, color:GREEN, fontFace:'Calibri' });
          }

          // ── Slide 7: Workforce / LQ ─────────────────────────────────────────
          const s7 = pptx.addSlide();
          bg(s7);
          hdr(s7, '💼 Workforce — Location Quotient vs. US');
          (_pptxData.occupationLQ||[]).forEach((o,i) => {
            const lq = o.lq||(o.area_pct/(o.us_pct||1));
            const lqClr = lq>=1.5?GREEN:lq>=0.75?AMBER:RED;
            const yp = 1.0 + i * 0.72;
            const barW = Math.min(10.5, (lq/5)*10.5);
            s7.addText(o.occupation, { x:0.5, y:yp, w:3.2, h:0.5, fontSize:11, color:WHITE, fontFace:'Calibri', valign:'middle' });
            s7.addText(o.area_pct+'%', { x:3.8, y:yp, w:0.8, h:0.5, fontSize:11, color:LGRAY, fontFace:'Calibri', align:'right', valign:'middle' });
            s7.addShape(pptx.ShapeType.rect, { x:4.8, y:yp+0.1, w:Math.max(0.05, barW), h:0.28, fill:{color:lqClr}, rectRadius:0.04 });
            s7.addText(lq.toFixed(2)+'x', { x:4.9+barW, y:yp, w:1.5, h:0.5, fontSize:12, bold:true, color:lqClr, fontFace:'Calibri', valign:'middle' });
          });
          s7.addText('LQ > 1.0 = more concentrated than US average  ·  LQ > 2.0 = major local specialty', { x:0.5, y:6.8, w:12.3, h:0.3, fontSize:8, color:LGRAY, fontFace:'Calibri' });

          // ── Slide 8: Financial Projections ──────────────────────────────────
          const s8 = pptx.addSlide();
          bg(s8);
          hdr(s8, '💰 Financial Projections');
          const sc = _pptxData.scenarios || [];
          const baseS = sc.find(s=>(s.name||'').toLowerCase().includes('base'))||sc[1]||{};
          [
            {l:'Base Revenue/mo', v:fmtN(baseS.monthly_revenue), c:WHITE},
            {l:'Base Net/mo',     v:fmtN(baseS.monthly_net), c:(baseS.monthly_net||0)>0?GREEN:RED},
            {l:'Break-Even',      v:baseS.breakeven_months?baseS.breakeven_months+' mo':'—', c:AMBER},
            {l:'3-Year ROI',      v:baseS.roi_3yr!=null?(baseS.roi_3yr>0?'+':'')+baseS.roi_3yr+'%':'—', c:GREEN},
          ].forEach((k,i) => kpiBox(s8, k.v, k.l, 0.5+i*3.25, 1.0, k.c));
          sc.forEach((scn,i) => {
            s8.addShape(pptx.ShapeType.roundRect, { x:0.5+i*4.45, y:2.5, w:4.1, h:2.4, fill:{color:'14151E'}, line:{color:[ACCENT,GREEN,AMBER][i]||ACCENT, width:1}, rectRadius:0.1 });
            s8.addText(scn.name||'Scenario', { x:0.5+i*4.45, y:2.6, w:4.1, h:0.4, align:'center', fontSize:12, bold:true, color:WHITE, fontFace:'Calibri' });
            [{l:'Revenue/mo',v:fmtN(scn.monthly_revenue)},{l:'Net/mo',v:fmtN(scn.monthly_net)},{l:'Break-Even',v:scn.breakeven_months?scn.breakeven_months+' mo':'—'},{l:'ROI 3yr',v:scn.roi_3yr!=null?scn.roi_3yr+'%':'—'}]
              .forEach((k,j) => {
                s8.addText(k.v, { x:0.5+i*4.45, y:3.05+j*0.45, w:4.1, h:0.32, align:'center', fontSize:13, bold:true, color:[GREEN,GREEN,AMBER,GREEN][j], fontFace:'Calibri' });
                s8.addText(k.l, { x:0.5+i*4.45, y:3.37+j*0.45, w:4.1, h:0.2, align:'center', fontSize:8, color:LGRAY, fontFace:'Calibri' });
              });
          });

          // ── Slide 9: Startup Costs ──────────────────────────────────────────
          const s9 = pptx.addSlide();
          bg(s9);
          hdr(s9, '💸 Startup Cost Breakdown');
          s9.addText(fmtN(_pptxData.startupCost), { x:0.5, y:0.85, w:12, h:0.8, fontSize:36, bold:true, color:ACCENT, fontFace:'Calibri' });
          s9.addText('Total estimated startup investment', { x:0.5, y:1.65, w:12, h:0.35, fontSize:11, color:LGRAY, fontFace:'Calibri' });
          (_pptxData.startupBreak||[]).slice(0,8).forEach((item,i) => {
            const col = i < 4 ? 0 : 1;
            const row = i % 4;
            s9.addShape(pptx.ShapeType.roundRect, { x:0.5+col*6.6, y:2.15+row*1.1, w:6.2, h:0.95, fill:{color:'14151E'}, line:{color:'1E2030',width:1}, rectRadius:0.08 });
            s9.addText(typeof item==='string'?item:(item.item||item.category||''), { x:0.65+col*6.6, y:2.25+row*1.1, w:4.5, h:0.35, fontSize:11, color:WHITE, fontFace:'Calibri' });
            s9.addText(typeof item==='object'?fmtN(item.cost||item.amount||0):'—', { x:0.65+col*6.6, y:2.6+row*1.1, w:5.8, h:0.35, fontSize:14, bold:true, color:ACCENT, fontFace:'Calibri' });
          });

          // ── Slide 10: Competitive Landscape ────────────────────────────────
          const s10 = pptx.addSlide();
          bg(s10);
          hdr(s10, '🔍 Competitive Landscape');
          subTxt(s10, _pptxData.comp6sum, 0.5, 0.9, 12.3, 1.4, {fontSize:12, color:'CBD5E1', lineSpacingMultiple:1.4});
          const diffs = (_pptxData.differentiators||_pptxData.differenctiators||[]).slice(0,4);
          if (diffs.length) {
            s10.addText('YOUR DIFFERENTIATORS', { x:0.5, y:2.5, w:12, h:0.35, fontSize:9, bold:true, color:GREEN, charSpacing:2, fontFace:'Calibri' });
            diffs.forEach((d,i) => {
              s10.addShape(pptx.ShapeType.roundRect, { x:0.5+i*3.3, y:2.95, w:3.0, h:1.5, fill:{color:'0D2818'}, line:{color:GREEN, width:1}, rectRadius:0.1 });
              subTxt(s10, typeof d==='string'?d:(d.advantage||d.differentiator||String(d)), 0.6+i*3.3, 3.05, 2.8, 1.3, {fontSize:10, color:WHITE, lineSpacingMultiple:1.3});
            });
          }

          // ── Slide 11: Compliance ────────────────────────────────────────────
          const s11 = pptx.addSlide();
          bg(s11);
          hdr(s11, '⚖️ Compliance & Permits');
          subTxt(s11, _pptxData.comp5sum, 0.5, 0.9, 12.3, 2.5, {fontSize:12, color:'CBD5E1', lineSpacingMultiple:1.4});
          if (_pptxData.comp5months) {
            s11.addShape(pptx.ShapeType.roundRect, { x:0.5, y:3.5, w:4, h:1.5, fill:{color:'14151E'}, line:{color:AMBER, width:2}, rectRadius:0.12 });
            s11.addText(String(_pptxData.comp5months)+' months', { x:0.5, y:3.7, w:4, h:0.8, align:'center', fontSize:32, bold:true, color:AMBER, fontFace:'Calibri' });
            s11.addText('Estimated licensing timeline', { x:0.5, y:4.5, w:4, h:0.3, align:'center', fontSize:9, color:LGRAY, fontFace:'Calibri' });
          }

          // ── Slide 12: Site Selection ────────────────────────────────────────
          const s12 = pptx.addSlide();
          bg(s12);
          hdr(s12, '📍 Site Selection');
          (_pptxData.sites||[]).slice(0,3).forEach((site,i) => {
            s12.addShape(pptx.ShapeType.roundRect, { x:0.5, y:1.0+i*1.7, w:12.3, h:1.5, fill:{color:'14151E'}, line:{color:'1E2030',width:1}, rectRadius:0.08 });
            s12.addText('#'+(i+1), { x:0.7, y:1.1+i*1.7, w:0.6, h:1.2, fontSize:24, bold:true, color:ACCENT, fontFace:'Calibri', valign:'middle' });
            s12.addText(site.address||site.location||site.name||'Site '+(i+1), { x:1.5, y:1.15+i*1.7, w:7, h:0.45, fontSize:13, bold:true, color:WHITE, fontFace:'Calibri' });
            s12.addText((site.city||'')+(site.rent_monthly?' · $'+Number(site.rent_monthly).toLocaleString()+'/mo':'')+(site.sq_ft?' · '+Number(site.sq_ft).toLocaleString()+' sqft':''), { x:1.5, y:1.6+i*1.7, w:10.5, h:0.35, fontSize:10, color:LGRAY, fontFace:'Calibri' });
            if (site.score||site.site_score) s12.addText('Score: '+(site.score||site.site_score)+'/10', { x:10.5, y:1.15+i*1.7, w:1.8, h:0.45, align:'right', fontSize:13, bold:true, color:GREEN, fontFace:'Calibri' });
          });

          // ── Slide 13: Grants ────────────────────────────────────────────────
          const s13 = pptx.addSlide();
          bg(s13);
          hdr(s13, '💵 Grants & Funding Opportunities');
          subTxt(s13, _pptxData.grantSum, 0.5, 0.9, 12.3, 1.0, {fontSize:12, color:'CBD5E1'});
          (_pptxData.grants||[]).forEach((g,i) => {
            s13.addShape(pptx.ShapeType.roundRect, { x:0.5, y:2.1+i*1.35, w:12.3, h:1.15, fill:{color:'14151E'}, line:{color:GREEN, width:1}, rectRadius:0.08 });
            s13.addText(g.name||g.program||'Grant '+(i+1), { x:0.7, y:2.2+i*1.35, w:8.5, h:0.4, fontSize:13, bold:true, color:WHITE, fontFace:'Calibri' });
            s13.addText(g.amount||'See report', { x:10, y:2.2+i*1.35, w:2.5, h:0.4, align:'right', fontSize:14, bold:true, color:GREEN, fontFace:'Calibri' });
            s13.addText((g.type||'')+(g.deadline?' · Deadline: '+g.deadline:'')+(g.eligibility?' · '+String(g.eligibility).substring(0,100):''), { x:0.7, y:2.65+i*1.35, w:11.8, h:0.35, fontSize:9, color:LGRAY, fontFace:'Calibri' });
          });

          // ── Slide 14: Risks ──────────────────────────────────────────────────
          const s14 = pptx.addSlide();
          bg(s14);
          hdr(s14, '⚠️ Risk Matrix');
          (_pptxData.risks||[]).forEach((r,i) => {
            const sev = typeof r==='object'?(r.severity||'medium'):'medium';
            const title = typeof r==='string'?r:(r.risk||r.title||'');
            const mit   = typeof r==='object'?(r.mitigation||r.desc||''):'';
            const rClr  = sev.toLowerCase().includes('high')?RED:sev.toLowerCase().includes('low')?GREEN:AMBER;
            s14.addShape(pptx.ShapeType.roundRect, { x:0.5, y:1.0+i*1.35, w:12.3, h:1.1, fill:{color:'14151E'}, line:{color:rClr, width:1}, rectRadius:0.08 });
            s14.addShape(pptx.ShapeType.roundRect, { x:0.6, y:1.1+i*1.35, w:1.2, h:0.35, fill:{color:rClr+'22'}, rectRadius:0.04 });
            s14.addText(sev.toUpperCase(), { x:0.6, y:1.12+i*1.35, w:1.2, h:0.32, align:'center', fontSize:8, bold:true, color:rClr, fontFace:'Calibri' });
            s14.addText(title, { x:2.0, y:1.1+i*1.35, w:10.6, h:0.4, fontSize:12, bold:true, color:WHITE, fontFace:'Calibri' });
            if (mit) subTxt(s14, mit, 2.0, 1.52+i*1.35, 10.6, 0.45, {fontSize:10});
          });

          // ── Slide 15: Next Steps ────────────────────────────────────────────
          const s15 = pptx.addSlide();
          bg(s15);
          hdr(s15, '✅ Recommended Next Steps');
          (_pptxData.steps||[]).forEach((step,i) => {
            const txt = typeof step==='string'?step:(step.step||step.title||step.action||'');
            s15.addShape(pptx.ShapeType.ellipse, { x:0.5, y:1.1+i*1.05, w:0.55, h:0.55, fill:{color:ACCENT} });
            s15.addText(String(i+1), { x:0.5, y:1.13+i*1.05, w:0.55, h:0.5, align:'center', fontSize:14, bold:true, color:WHITE, fontFace:'Calibri' });
            s15.addText(txt, { x:1.2, y:1.1+i*1.05, w:11.5, h:0.55, fontSize:13, color:WHITE, fontFace:'Calibri', valign:'middle' });
          });
          s15.addText('Business Hunter · AI-Powered Business Analysis · ' + _pptxData.date, { x:0.5, y:7.0, w:12.3, h:0.25, fontSize:8, color:'2D2D3F', fontFace:'Calibri' });

          await pptx.writeFile({ fileName: _pptxData.title.replace(/[^a-zA-Z0-9\s]/g,'').trim() + ' — Business Analysis.pptx' });
          if (btn) { btn.textContent = '✓ Downloaded!'; setTimeout(()=>{ btn.textContent='⬇ PPTX'; btn.disabled=false; }, 3000); }
        } catch(err) {
          console.error('PPTX error:', err);
          if (btn) { btn.textContent = '✗ Error — see console'; btn.disabled = false; }
        }
      }
    <\/script>
    </body></html>`);
  w.document.close();
}

// ── F11: AGENT CONFIDENCE SCORES ──────────────────────────────────────────
function v2GetAgentConfidence(id) {
  const R_data = typeof R !== 'undefined' ? R : {};
  const data   = R_data['a' + id];
  if (!data) return null;

  // Demo mode — all data is synthetic
  if (typeof demoMode !== 'undefined' && demoMode) {
    return { pct: 100, label: 'Demo', color: 'var(--v2-blue)', badge: 'blue' };
  }

  const keys = Object.keys(data).filter(k => data[k] !== null && data[k] !== undefined);
  if (!keys.length) return { pct: 0, label: 'Empty', color: 'var(--v2-red)', badge: 'red' };

  // Heuristic: completeness of expected fields
  let pct = 40;
  if (data.summary || data.verdict || data.cities || data.scenarios || data.grants) pct += 25;
  if (keys.length > 4) pct += 15;
  if (data.sources || data.citations || data.data_sources) pct += 10;
  if (data.live || data.real_time || data.timestamp) pct += 10;
  pct = Math.min(pct, 95); // never 100% since we can't fully verify

  const label = pct >= 80 ? 'High' : pct >= 55 ? 'Medium' : 'Low';
  const color  = pct >= 80 ? 'var(--v2-green)' : pct >= 55 ? 'var(--v2-amber)' : 'var(--v2-red)';
  const badge  = pct >= 80 ? 'green' : pct >= 55 ? 'amber' : 'red';
  return { pct, label, color, badge };
}

// ── F12: ZIP AUTOCOMPLETE ─────────────────────────────────────────────────
let _v2ZipLookupTimer = null;

async function v2LookupZIP(zip) {
  const el = document.getElementById('wiz-zip-preview');
  if (!el) return;
  if (!/^\d{5}$/.test(zip)) { el.textContent = ''; return; }

  clearTimeout(_v2ZipLookupTimer);
  el.textContent = '⏳ Looking up…';
  _v2ZipLookupTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!res.ok) { el.textContent = '⚠️ ZIP not found'; return; }
      const d    = await res.json();
      const city = d.places[0]['place name'];
      const st   = d.places[0]['state abbreviation'];
      el.textContent = `📍 ${city}, ${st}`;
      el.style.color = 'var(--v2-green)';
    } catch { el.textContent = ''; }
  }, 400);
}

// ── F4: LIVE DATA REFRESH PER-AGENT ──────────────────────────────────────
function v2RefreshAgentData(id) {
  if (typeof reRunAgent === 'function') {
    reRunAgent(id);
    v2Toast(`🔄 Refreshing ${V2_AGENTS.find(a=>a.id===id)?.name || 'Agent '+id}…`);
  } else {
    v2Toast('Live refresh not available in demo mode');
  }
}

// ── F5: INLINE R DATA EDITOR ──────────────────────────────────────────────
function v2ShowREditor() {
  const modal = document.getElementById('v2-reditor-modal');
  if (!modal) return;
  const R_data = typeof R !== 'undefined' ? R : {};

  const base     = (R_data.a7?.scenarios||[]).find(s=>(s.name||'').toLowerCase().includes('base'))||R_data.a7?.scenarios?.[1]||{};
  const topCity  = (R_data.a2?.cities||[]).sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0];
  const currentScore = v2CalcScore();

  document.getElementById('v2-reditor-content').innerHTML = `
    <div class="v2-modal-header">
      <div>
        <div class="v2-modal-title">🔧 Edit Key Analysis Data</div>
        <div style="font-size:12px;color:var(--v2-t3);margin-top:3px">Correct AI mistakes. Changes update the viability score live.</div>
      </div>
      <button class="v2-modal-close" onclick="v2CloseREditor()">✕</button>
    </div>
    <div class="v2-re-fields">
      <div class="v2-field">
        <label>Gap Score — ${topCity?.city || 'Top City'} (0–10)</label>
        <input class="v2-input" id="re-gap" type="number" min="0" max="10" step="0.1"
          value="${topCity?.gap_score ?? ''}" placeholder="e.g. 7.5" />
        <div style="font-size:11px;color:var(--v2-t3);margin-top:4px">Current: ${topCity?.gap_score ?? '—'} · Drives 25% of score</div>
      </div>
      <div class="v2-field">
        <label>Base Monthly Revenue ($)</label>
        <input class="v2-input" id="re-rev" type="number" min="0"
          value="${base.monthly_revenue || ''}" placeholder="e.g. 85000" />
      </div>
      <div class="v2-field">
        <label>Base Monthly Net Profit ($)</label>
        <input class="v2-input" id="re-net" type="number"
          value="${base.monthly_net || ''}" placeholder="e.g. 33000" />
      </div>
      <div class="v2-field">
        <label>Break-Even (months)</label>
        <input class="v2-input" id="re-be" type="number" min="1"
          value="${base.breakeven_months || ''}" placeholder="e.g. 16" />
      </div>
      <div class="v2-field">
        <label>AI Verdict</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${['go','caution','no-go'].map(v => {
            const cur = (R_data.a8?.verdict || '').toLowerCase();
            return `<div class="v2-choose-item${cur.includes(v)?' selected':''}" onclick="this.parentElement.querySelectorAll('.v2-choose-item').forEach(el=>el.classList.remove('selected'));this.classList.add('selected');this.dataset.val='${v}'" data-tag="re-verdict" data-val="${v}" style="justify-content:center">
              <span class="lbl">${v.toUpperCase()}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;align-items:center">
      <span style="font-size:12px;color:var(--v2-t3)">Current score: <strong>${currentScore}/100</strong></span>
      <button class="v2-btn ghost" onclick="v2CloseREditor()">Cancel</button>
      <button class="v2-btn primary" onclick="v2SaveREdits()">Apply Changes</button>
    </div>`;
  modal.classList.add('open');
}

function v2CloseREditor() {
  document.getElementById('v2-reditor-modal')?.classList.remove('open');
}

function v2SaveREdits() {
  const R_data = typeof R !== 'undefined' ? R : {};

  const gapVal = parseFloat(document.getElementById('re-gap')?.value);
  const revVal = parseInt(document.getElementById('re-rev')?.value);
  const netVal = parseInt(document.getElementById('re-net')?.value);
  const beVal  = parseInt(document.getElementById('re-be')?.value);
  const verdEl = document.querySelector('[data-tag="re-verdict"].selected');

  // Apply to R object
  if (!isNaN(gapVal) && R_data.a2?.cities?.length) {
    const top = [...R_data.a2.cities].sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0];
    if (top) top.gap_score = gapVal;
  }
  const base = (R_data.a7?.scenarios||[]).find(s=>(s.name||'').toLowerCase().includes('base'))||R_data.a7?.scenarios?.[1];
  if (base) {
    if (!isNaN(revVal)) base.monthly_revenue = revVal;
    if (!isNaN(netVal)) base.monthly_net     = netVal;
    if (!isNaN(beVal))  base.breakeven_months = beVal;
  }
  if (verdEl && R_data.a8) {
    R_data.a8.verdict = verdEl.dataset.val;
  }

  v2CloseREditor();
  // Re-render dashboard
  if (V2.run) v2RenderDashboard(V2.run);
  v2Toast('✓ Data updated · Score recalculated');
}

// ── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Check for wizard draft when on landing page
  setTimeout(v2CheckWizardDraft, 1000);
});
