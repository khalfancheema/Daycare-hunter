// ── V2 COPILOT ────────────────────────────────────────────────────────────
const V2_COPILOT_MSGS = {
  1:  'Researching demographics, income, and population data for your target area…',
  2:  'Analyzing supply vs demand gap. How many similar businesses already exist?',
  3:  'Scoring the top site locations by foot traffic, demographics, and rent…',
  4:  'Pulling live real estate listings from LoopNet, Crexi, and BizBuySell…',
  5:  'Checking licensing requirements, zoning, and permit timelines…',
  6:  'Mapping the competitive landscape — who are you up against?',
  7:  'Building your financial model: 3 scenarios, P&L projections, and break-even…',
  8:  'Writing your executive summary and Go/No-Go verdict…',
  9:  'Drafting the full SBA 7(a) business plan and investor deck…',
  10: 'Creating your 18-month project plan with Gantt chart and risk register…',
  11: 'Generating interactive market map with gap scores and competitor pins…',
  12: 'Searching federal, state, and local grants for this industry…',
  13: 'Deep-diving competitor reviews and pain points to build your advantage…',
  14: 'Running code review across the pipeline output for accuracy…',
  15: 'Running QA validation and pipeline health check…',
  16: 'Analyzing build vs buy options for your market…',
  17: 'Auditing all data sources and citations for integrity…',
};

const V2_DONE_MSGS = [
  'Analysis complete. Your Business Viability Score is ready.',
  'All 17 agents finished. Here\'s what the AI found.',
  'Research done. Time to make your decision.',
];

function v2InitCopilotSidebar() {
  const list = document.getElementById('v2-agent-list');
  if (!list) return;
  list.innerHTML = V2_AGENTS.map(a => `
    <div class="v2-agent-row" id="v2-ar-${a.id}">
      <div class="v2-agent-status" id="v2-as-${a.id}"></div>
      <span class="v2-agent-name">${a.ico} ${a.name}</span>
      <span class="v2-agent-time" id="v2-at-${a.id}"></span>
    </div>
  `).join('');
}

function v2ChatMsg(role, html) {
  const msgs = document.getElementById('v2-chat-msgs');
  if (!msgs) return;
  const isAi = role === 'ai';
  const div = document.createElement('div');
  div.className = `v2-msg ${role}`;
  div.innerHTML = `
    <div class="v2-msg-avatar">${isAi ? '🤖' : '👤'}</div>
    <div class="v2-msg-bubble">${html}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// Hook into v1 setDot() to drive v2 copilot UI
const _v1SetDot = typeof setDot !== 'undefined' ? setDot : null;
// We override after v1 loads via the v2 init
function v2HookPipeline() {
  // Patch setDot to also update v2 sidebar
  const origSetDot = window.setDot;
  window.setDot = function(n, state) {
    if (typeof origSetDot === 'function') origSetDot(n, state);
    v2UpdateAgentRow(n, state);
    // ── KEY FIX: trigger completion check on every terminal state ──
    // showOut() is called at the START of agents (running state),
    // so we must also check here when agents actually finish.
    if (state === 'done' || state === 'error') {
      v2OnAgentComplete(n);
    }
  };

  // Patch setProgress to update v2 progress bar
  const origSetProgress = window.setProgress;
  window.setProgress = function(p, t) {
    if (typeof origSetProgress === 'function') origSetProgress(p, t);
    const fill = document.getElementById('v2-progress-fill');
    const lbl  = document.getElementById('v2-progress-label');
    if (fill) fill.style.transform = `scaleX(${p / 100})`;
    if (lbl)  lbl.textContent = t || '';
  };

  // Patch showOut — also triggers completion check (belt-and-suspenders)
  const origShowOut = window.showOut;
  window.showOut = function(id) {
    if (typeof origShowOut === 'function') origShowOut(id);
    v2OnAgentComplete(id);
  };

  // Patch showErr — render partial dashboard when pipeline fails/stops mid-run
  const origShowErr = window.showErr;
  window.showErr = function(msg) {
    if (typeof origShowErr === 'function') origShowErr(msg);
    // Only trigger partial render if we're on the copilot screen and have some results
    if (V2.screen !== 'copilot') return;
    if (_v2PipelineCompleted) return;
    const hasResults = typeof R !== 'undefined' && Object.keys(R).length > 0;
    if (!hasResults) return;

    // Mark all still-pending agents as error/skipped
    setTimeout(() => {
      V2_AGENTS.forEach(a => {
        const row = document.getElementById(`v2-ar-${a.id}`);
        if (row && !row.classList.contains('done') && !row.classList.contains('error')) {
          v2UpdateAgentRow(a.id, 'error');
        }
      });
      // Show partial results CTA in chat
      const agentsDone = V2_AGENTS.filter(a => {
        const r = document.getElementById(`v2-ar-${a.id}`);
        return r?.classList.contains('done');
      }).length;
      if (agentsDone > 0 && !_v2PipelineCompleted) {
        v2ChatMsg('ai', `⚠️ <strong>Pipeline stopped after ${agentsDone} agent${agentsDone>1?'s':''}.</strong> Partial results are available.<br><br>
          <button class="v2-btn primary sm" onclick="v2GoToDashboard()" style="margin-top:6px">View Partial Dashboard →</button>`);
        v2EnableChatInput();
      }
    }, 600);
  };
}

function v2UpdateAgentRow(n, state) {
  const row = document.getElementById(`v2-ar-${n}`);
  const dot = document.getElementById(`v2-as-${n}`);
  const time = document.getElementById(`v2-at-${n}`);
  if (!row) return;
  row.className = `v2-agent-row ${state}`;
  if (dot) {
    dot.className = `v2-agent-status ${state}`;
  }
  if (state === 'running') {
    const msg = V2_COPILOT_MSGS[n];
    const agentInfo = V2_AGENTS.find(a => a.id === n);
    const label = agentInfo ? `${agentInfo.ico} ${agentInfo.name}` : `Agent ${n}`;
    if (msg) v2ChatMsg('ai', `<strong>${label}</strong><br><span style="color:var(--v2-t2);font-size:12px">${msg}</span>`);
  }
}

function v2OnAgentComplete(id) {
  const time = document.getElementById(`v2-at-${id}`);
  const timerEl = document.getElementById(`timer-${id}`);
  if (time && timerEl) time.textContent = timerEl.textContent;

  // F2: Live-update dashboard panels if user is watching
  if (typeof v2LiveUpdateDashboard === 'function') v2LiveUpdateDashboard(id);

  // Live-update sidenav dot if it's already rendered
  const sideRow = document.getElementById(`v2-ar-${id}`);
  const sideItem = document.getElementById(`v2-aside-item-${id}`);
  if (sideItem && sideRow) {
    const st = sideRow.classList.contains('done') ? 'done'
             : sideRow.classList.contains('error') ? 'error' : '';
    sideItem.className = `v2-aside-item ${st}`;
    const dot = sideItem.querySelector('.v2-aside-dot');
    if (dot) dot.className = `v2-aside-dot ${st}`;
    // Update subtitle count
    const subtitle = document.querySelector('.v2-aside-subtitle');
    if (subtitle) {
      const doneN = V2_AGENTS.filter(a => {
        const r = document.getElementById(`v2-ar-${a.id}`);
        return r?.classList.contains('done');
      }).length;
      subtitle.textContent = `${doneN} / ${V2_AGENTS.length} complete`;
    }
  }

  // Check if all agents done
  const allDone = V2_AGENTS.every(a => {
    const row = document.getElementById(`v2-ar-${a.id}`);
    return row && (row.classList.contains('done') || row.classList.contains('error'));
  });
  if (allDone) v2PipelineComplete();
}

let _v2PipelineCompleted = false;

function v2PipelineComplete() {
  if (_v2PipelineCompleted) return; // fire once
  _v2PipelineCompleted = true;

  const msg = V2_DONE_MSGS[Math.floor(Math.random() * V2_DONE_MSGS.length)];
  const score = v2CalcScore();
  const verdict = v2ScoreVerdict(score);
  v2ChatMsg('ai', `
    ✅ <strong>${msg}</strong><br><br>
    <span style="font-size:18px;font-weight:800;color:${verdict.color}">${score}/100</span>
    <span class="v2-badge ${verdict.badge}" style="margin-left:8px">${verdict.label}</span><br><br>
    ${verdict.summary}<br><br>
    <button class="v2-btn primary sm" onclick="v2GoToDashboard()" style="margin-top:8px">View Full Dashboard →</button>
  `);

  // F14: Browser notification
  if (typeof v2SendCompletionNotification === 'function') v2SendCompletionNotification(score);

  // Auto-open the persistent chat widget
  const widget = document.getElementById('v2-chat-widget');
  if (widget) widget.classList.remove('collapsed');
  const toggleBtn = document.getElementById('v2-chat-toggle-btn');
  if (toggleBtn) toggleBtn.textContent = '✕ AI Answers';

  // Unlock chat Q&A
  v2EnableChatInput();

  // Advanced: proactive follow-up suggestions
  if (typeof v2ShowProactiveFollowUps === 'function') {
    setTimeout(() => v2ShowProactiveFollowUps(), 1000);
  }

  // Auto-navigate after 3s
  setTimeout(() => v2GoToDashboard(), 3000);
}

// ── Chat Q&A ──────────────────────────────────────────────────
function v2EnableChatInput() {
  const inp = document.getElementById('v2-chat-input');
  const btn = document.getElementById('v2-chat-send');
  if (inp) { inp.disabled = false; inp.placeholder = 'Ask anything about this analysis…'; }
  if (btn) { btn.disabled = false; }
  setTimeout(() => {
    v2ChatMsg('ai', '💬 <strong>Ask me anything about this analysis.</strong> Try: "What\'s the best city?", "Explain the financials", "What are the biggest risks?"');
  }, 500);
}

function v2SendChatQuestion() {
  const inp = document.getElementById('v2-chat-input');
  if (!inp) return;
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  v2ChatMsg('user', q);
  v2AnswerQuestion(q);
}

function v2AnswerQuestion(q) {
  const lower = q.toLowerCase();
  const R_data = typeof R !== 'undefined' ? R : {};

  // Try API-powered answer first (if key available)
  const apiKey = localStorage.getItem('v2_apikey') || (typeof key === 'function' ? key() : '');
  if (apiKey && typeof claudeJSON === 'function') {
    _v2AiAnswer(q, R_data);
    return;
  }

  // Keyword-based offline answers using R data
  let answer = '';
  if (lower.includes('best city') || lower.includes('top city') || lower.includes('which city')) {
    const cities = R_data.a2?.cities || [];
    const top = cities.length ? [...cities].sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0] : null;
    answer = top
      ? `Based on the gap analysis, <strong>${top.city}</strong> is the top opportunity with a gap score of ${top.gap_score}/10. ${top.rationale || ''}`
      : 'Run the full analysis to identify the best city.';
  } else if (lower.includes('financ') || lower.includes('revenue') || lower.includes('money')) {
    const sc = (R_data.a7?.scenarios || []);
    const base = sc.find(s=>(s.name||'').toLowerCase().includes('base')) || sc[1] || {};
    answer = base.monthly_revenue
      ? `<strong>Financial Highlights:</strong><br>• Base monthly revenue: $${(base.monthly_revenue/1000).toFixed(0)}K<br>• Monthly net: $${(base.monthly_net/1000).toFixed(0)}K<br>• Break-even: Month ${base.breakeven_months}<br>• 3-year ROI: ${base.roi_3yr}%`
      : 'Financial data not yet available. Complete the pipeline first.';
  } else if (lower.includes('risk')) {
    const risks = (R_data.a8?.risks || []).slice(0,3);
    answer = risks.length
      ? `<strong>Top risks:</strong><br>${risks.map(r=>`• ${typeof r==='string'?r:(r.risk||r.title||'')} <em>(${r.severity||'Medium'})</em>`).join('<br>')}`
      : 'Complete the pipeline to see risk analysis.';
  } else if (lower.includes('score') || lower.includes('viability')) {
    const score = v2CalcScore();
    const v = v2ScoreVerdict(score);
    answer = `<strong>Viability Score: ${score}/100</strong> — ${v.title}<br><br>${v.summary}`;
  } else if (lower.includes('compet') || lower.includes('competitor')) {
    const comp = R_data.a6;
    answer = comp?.summary
      ? comp.summary
      : 'Competitive intelligence not yet available.';
  } else if (lower.includes('grant') || lower.includes('funding')) {
    const grants = (R_data.a12?.grants || []).slice(0,3);
    answer = grants.length
      ? `<strong>Top funding opportunities:</strong><br>${grants.map(g=>`• ${g.name||g.program}: ${g.amount||'See report'}`).join('<br>')}`
      : (R_data.a12?.summary || 'Run the grants agent for funding opportunities.');
  } else if (lower.includes('next step') || lower.includes('what should') || lower.includes('action')) {
    const steps = (R_data.a8?.next_steps || []).slice(0,5);
    answer = steps.length
      ? `<strong>Recommended next steps:</strong><br>${steps.map((s,i)=>`${i+1}. ${typeof s==='string'?s:(s.step||s)}`).join('<br>')}`
      : 'Complete the executive summary agent for next steps.';
  } else if (lower.includes('permit') || lower.includes('license') || lower.includes('compliance')) {
    const comp = R_data.a5;
    answer = comp?.summary || `Timeline: ${comp?.total_timeline_months || '?'} months. ${comp?.summary || 'See compliance report for details.'}`;
  } else if (lower.includes('startup') || lower.includes('cost') || lower.includes('invest')) {
    const startup = R_data.a7?.total_startup_cost || R_data.a7?.startup_cost;
    answer = startup
      ? `Estimated startup investment: <strong>$${(startup/1000).toFixed(0)}K</strong>. See the Financials tab for full breakdown.`
      : 'See the financials section for startup cost details.';
  } else if (lower.includes('verdict') || lower.includes('go') || lower.includes('recommend')) {
    const v = R_data.a8?.verdict || R_data.a8?.recommendation || '';
    const r = R_data.a8?.verdict_rationale || '';
    answer = v ? `<strong>Verdict: ${v}</strong><br><br>${r}` : 'Complete the executive summary for a full verdict.';
  } else if (lower.includes('what is') || lower.includes('how does') || lower.includes('explain')) {
    if (lower.includes('gap')) answer = 'The gap score (0-10) measures unmet demand: supply of existing businesses vs. projected demand based on demographics. Higher = more opportunity.';
    else if (lower.includes('viability')) answer = 'The viability score (0-100) is a weighted composite of gap analysis (25%), financials (25%), executive verdict (20%), competition (15%), and compliance timeline (15%).';
    else if (lower.includes('reggio')) answer = 'Reggio Emilia is a child-centered education philosophy emphasizing inquiry, creativity, and natural environments — a premium positioning signal in the childcare market.';
    else answer = 'I can answer questions about the analysis results. Try asking about financials, risks, the best city, grants, or next steps.';
  } else {
    answer = `I can answer questions about this analysis. Try:<br>• "What's the best city?"<br>• "Explain the financial projections"<br>• "What are the biggest risks?"<br>• "What funding is available?"<br>• "What are the next steps?"`;
  }

  setTimeout(() => v2ChatMsg('ai', answer), 350);
}

async function _v2AiAnswer(question, R_data) {
  const thinkingId = 'v2-thinking-' + Date.now();
  v2ChatMsg('ai', `<span id="${thinkingId}">⏳ Analyzing report data…</span>`);

  try {
    const snapshot = JSON.stringify({
      verdict: R_data.a8?.verdict,
      rationale: R_data.a8?.verdict_rationale,
      score: v2CalcScore(),
      top_city: (R_data.a2?.cities||[]).sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0]?.city,
      financials: R_data.a7?.scenarios?.[1] || {},
      risks: (R_data.a8?.risks||[]).slice(0,5),
      next_steps: (R_data.a8?.next_steps||[]).slice(0,5),
      competition_summary: R_data.a6?.summary,
      compliance: R_data.a5?.summary,
      grants_summary: R_data.a12?.summary,
    }, null, 2).slice(0, 3000);

    const sys = `You are AI Answers for Business Hunter, an AI-powered business viability analysis app.
Answer concisely (2-4 sentences max) based on the analysis data provided. Be specific, cite numbers.
If the answer isn't in the data, say so briefly. Use HTML formatting: <strong> for emphasis, <br> for line breaks.`;

    const usr = `User question: "${question}"

Analysis data snapshot:
${snapshot}

Answer the question based on this data.`;

    const d = await claudeJSON(sys, usr);
    const thinking = document.getElementById(thinkingId);
    if (thinking) thinking.parentElement.innerHTML = d?.answer || d?.response || JSON.stringify(d) || 'I couldn\'t generate a response.';
  } catch(e) {
    const thinking = document.getElementById(thinkingId);
    if (thinking) thinking.parentElement.innerHTML = '⚠️ Could not connect to AI. Check your API key.';
  }
}

function v2GoToDashboard() {
  // Capture current run
  V2.run = {
    id: Date.now(),
    ts: new Date().toISOString(),
    industry: V2.wizard.data.industry || document.getElementById('industrySelect')?.value || 'daycare',
    zip: document.getElementById('zip')?.value || '30097',
    budget: document.getElementById('budget')?.value || '600000',
    capacity: document.getElementById('capacity')?.value || '75',
    radius: document.getElementById('radius')?.value || '40',
    score: v2CalcScore(),
    R: typeof R !== 'undefined' ? JSON.parse(JSON.stringify(R)) : {},
  };
  v2GoTo('dashboard');
  v2RenderDashboard(V2.run);
}

// Called on DOMContentLoaded after all JS loaded
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(v2HookPipeline, 100);
});
