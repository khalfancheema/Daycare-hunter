// ── V2 FEATURES (v2.1) ────────────────────────────────────────────────────
// F1:  Onboarding / Empty State (3-step modal)
// F2:  Real-time Dashboard Updates (live panel refresh)
// F3:  Agent Detail Modal (v2 native, overrides stub in v2-06-dashboard)
// F5:  Print / PDF Export
// F6:  Comparison Mode (side-by-side portfolio)
// F7:  Saved Reports Library (full R object saved/restored)
// F8:  Error Recovery (Re-run buttons on errored agents)
// F10: Demo Walkthrough / Tooltip Tour
// F11: Dark / Light Mode Toggle
// F12: Industry-Specific Wizard Questions
// F13: Shareable Report Links (URL hash)
// F14: Browser Notification on Complete
// F15: Agent Dependency Visualization (DAG)

// ── F11: DARK / LIGHT MODE ────────────────────────────────────────────────
function v2SetTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('v2_theme', mode);
  const btn = document.getElementById('v2-theme-btn');
  if (btn) {
    const ico = btn.querySelector('.v2-theme-ico');
    if (ico) ico.textContent = mode === 'light' ? '🌙' : '☀️';
    else btn.textContent = mode === 'light' ? '🌙' : '☀️';
  }
}

function v2ToggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  v2SetTheme(cur === 'dark' ? 'light' : 'dark');
}

// ── F3: AGENT DETAIL MODAL (overrides stub in v2-06-dashboard.js) ─────────
function v2OpenAgentDetail(id) {
  const agent = V2_AGENTS.find(a => a.id === id);
  if (!agent) return;

  const row     = document.getElementById(`v2-ar-${id}`);
  const isDone  = row?.classList.contains('done');
  const isError = row?.classList.contains('error');
  if (!isDone && !isError) { v2Toast('Agent not yet complete'); return; }

  const modal = document.getElementById('v2-agent-detail-modal');
  if (!modal) return;

  document.getElementById('v2-adm-ico').textContent  = agent.ico;
  document.getElementById('v2-adm-name').textContent = agent.name;
  document.getElementById('v2-adm-num').textContent  = `Agent ${id}`;

  const timerEl = document.getElementById(`v2-at-${id}`);
  const timeEl  = document.getElementById('v2-adm-time');
  if (timeEl) timeEl.textContent = timerEl?.textContent || '';

  // Pull rendered v1 output from the hidden shell
  const outEl  = document.getElementById(`out-${id}`);
  const summary = v2GetAgentSummary(id);
  const R_data  = typeof R !== 'undefined' ? R : {};
  const raw     = R_data['a' + id];

  let content = '';
  if (outEl && outEl.innerHTML.trim()) {
    content = `<div class="v2-adm-v1-out">${outEl.innerHTML}</div>`;
  } else if (summary) {
    content = `<div class="v2-adm-summary">${summary}</div>`;
  } else if (raw) {
    content = `<div class="v2-adm-summary"><pre class="v2-adm-raw">${JSON.stringify(raw, null, 2).slice(0, 5000)}</pre></div>`;
  } else {
    content = `<div class="v2-adm-empty">No output available for this agent.</div>`;
  }

  document.getElementById('v2-adm-body').innerHTML = content;
  modal.classList.add('open');
}

function v2CloseAgentDetail() {
  document.getElementById('v2-agent-detail-modal')?.classList.remove('open');
}

// ── F5: PRINT / PDF EXPORT ────────────────────────────────────────────────
function v2PrintDashboard() {
  window.print();
}

// ── F13: SHAREABLE REPORT LINKS ───────────────────────────────────────────
function v2ShareReport() {
  const d = V2.wizard.data;
  if (!d || !d.industry) { v2Toast('Run an analysis first to share'); return; }
  try {
    const payload = {
      industry: d.industry, zip: d.zip, budget: d.budget,
      capacity: d.capacity, radius: d.radius,
    };
    const hash = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const url  = `${location.origin}${location.pathname}#v2=${hash}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => v2Toast('🔗 Share link copied to clipboard!'));
    } else {
      prompt('Copy this link:', url);
    }
  } catch(e) { v2Toast('Could not generate share link'); }
}

function v2CheckShareHash() {
  const hash = location.hash;
  if (!hash.startsWith('#v2=')) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(hash.slice(4)))));
    if (data.industry) {
      V2.wizard.data = { ...data };
      v2Toast('📋 Shared analysis loaded — review and click Launch');
      history.replaceState(null, '', location.pathname);
      v2GoTo('wizard');
      V2.wizard.step = V2_WIZARD_STEPS.length - 1;
      v2WizRenderStepsBar();
      v2WizRenderStep();
    }
  } catch(e) {}
}

// ── F14: BROWSER NOTIFICATION ─────────────────────────────────────────────
async function v2RequestNotificationPermission() {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function v2SendCompletionNotification(score) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  const ind = V2_INDUSTRIES.find(i => i.val === (V2.wizard?.data?.industry || ''));
  try {
    new Notification('Analysis Complete! 🎉', {
      body: `${ind?.emoji || '🏢'} ${ind?.label || 'Business'} — Viability Score: ${score}/100`,
      tag: 'v2-analysis-complete',
    });
  } catch(e) {}
}

// ── F2: REAL-TIME DASHBOARD UPDATES ──────────────────────────────────────
function v2LiveUpdateDashboard(agentId) {
  if (V2.screen !== 'dashboard' || !V2.run) return;

  // Update score ring
  const newScore  = v2CalcScore();
  const ringColor = newScore >= 70 ? '#22c55e' : newScore >= 45 ? '#f59e0b' : '#ef4444';
  const bigEl     = document.querySelector('.v2-score-card .big');
  if (bigEl) { bigEl.textContent = newScore; bigEl.style.color = ringColor; }
  const ringFill = document.querySelector('.v2-score-ring-fill');
  if (ringFill) {
    const circ = 2 * Math.PI * 54;
    ringFill.setAttribute('stroke', ringColor);
    ringFill.setAttribute('stroke-dashoffset', (circ * (1 - newScore / 100)).toFixed(1));
  }

  // Refresh active tab panel when a relevant agent completes
  const panelMap = {
    2:'market', 3:'market', 4:'market', 6:'competition',
    7:'financials', 8:'executive', 10:'plan', 11:'market', 12:'grants', 13:'competition',
  };
  const panel = panelMap[agentId];
  if (panel) {
    const el = document.getElementById(`v2-panel-${panel}`);
    if (el?.classList.contains('active')) {
      const fns = {
        market: v2RenderMarket, competition: v2RenderCompetition,
        financials: v2RenderFinancials, executive: v2RenderExecutive,
        plan: v2RenderActionPlan, grants: v2RenderGrants,
      };
      if (typeof fns[panel] === 'function') el.innerHTML = fns[panel]();
    }
  }
}

// ── F8: ERROR RECOVERY ────────────────────────────────────────────────────
function v2ReRunAgentFromDash(id) {
  if (typeof reRunAgent === 'function') {
    reRunAgent(id);
    v2Toast(`↺ Re-running ${V2_AGENTS.find(a => a.id === id)?.name || 'Agent ' + id}…`);
  } else {
    v2Toast('Re-run is not available in demo mode');
  }
}

// ── F15: AGENT DEPENDENCY VISUALIZATION (DAG) ─────────────────────────────
const V2_DAG_PHASES = [
  { label: 'Foundation',       ico: '🔬', agents: [1]               },
  { label: 'Market Analysis',  ico: '📊', agents: [2, 3, 4]        },
  { label: 'Intelligence',     ico: '🧠', agents: [5, 6]            },
  { label: 'Strategy',         ico: '🎯', agents: [7, 8, 9, 10, 11, 12, 13] },
  { label: 'QA & Audit',       ico: '✅', agents: [14, 15, 16, 17]  },
];

function v2RenderDAGPanel() {
  return `
    <div class="v2-dag-wrap">
      <div class="v2-dag-intro">Click any agent node to view its full output. Colors show live status.</div>
      <div class="v2-dag-legend">
        <span class="v2-dag-leg-item"><span class="v2-dag-leg-dot done"></span>Complete</span>
        <span class="v2-dag-leg-item"><span class="v2-dag-leg-dot running"></span>Running</span>
        <span class="v2-dag-leg-item"><span class="v2-dag-leg-dot error"></span>Error</span>
        <span class="v2-dag-leg-item"><span class="v2-dag-leg-dot idle"></span>Pending</span>
      </div>
      <div class="v2-dag-flow">
        ${V2_DAG_PHASES.map((phase, pi) => {
          const isLast = pi === V2_DAG_PHASES.length - 1;
          return `
            <div class="v2-dag-col">
              <div class="v2-dag-phase-hd">${phase.ico} ${phase.label}</div>
              <div class="v2-dag-nodes">
                ${phase.agents.map(id => {
                  const ag  = V2_AGENTS.find(a => a.id === id);
                  const row = document.getElementById(`v2-ar-${id}`);
                  const st  = row?.classList.contains('done')    ? 'done'
                            : row?.classList.contains('error')   ? 'error'
                            : row?.classList.contains('running') ? 'running' : 'idle';
                  return `
                    <div class="v2-dag-node ${st}" onclick="v2OpenAgentDetail(${id})" title="View ${ag?.name} output">
                      <span class="v2-dag-node-ico">${ag?.ico || '🤖'}</span>
                      <span class="v2-dag-node-name">${ag?.name || 'Agent ' + id}</span>
                    </div>`;
                }).join('')}
              </div>
            </div>
            ${!isLast ? '<div class="v2-dag-arrow">→</div>' : ''}`;
        }).join('')}
      </div>
    </div>`;
}

// ── F6: COMPARISON MODE ───────────────────────────────────────────────────
let _v2CompareTarget = null;

function v2PortCompareSelect(id) {
  const sid = String(id);
  if (!_v2CompareTarget) {
    _v2CompareTarget = sid;
    document.querySelectorAll('.v2-port-card').forEach(c => c.classList.remove('compare-a'));
    document.getElementById(`v2-port-card-${sid}`)?.classList.add('compare-a');
    v2Toast('Now select a second analysis to compare ↔');
  } else if (_v2CompareTarget === sid) {
    _v2CompareTarget = null;
    document.querySelectorAll('.v2-port-card').forEach(c => c.classList.remove('compare-a'));
  } else {
    v2OpenComparison(_v2CompareTarget, sid);
    _v2CompareTarget = null;
    document.querySelectorAll('.v2-port-card').forEach(c => c.classList.remove('compare-a'));
  }
}

function v2OpenComparison(idA, idB) {
  const a = V2.portfolio.find(r => String(r.id) === idA);
  const b = V2.portfolio.find(r => String(r.id) === idB);
  if (!a || !b) { v2Toast('Could not find both analyses'); return; }

  const modal = document.getElementById('v2-compare-modal');
  if (!modal) return;

  const sc = s => s >= 70 ? 'var(--v2-green)' : s >= 45 ? 'var(--v2-amber)' : 'var(--v2-red)';
  const row = (label, va, vb) => `
    <tr>
      <td class="v2-cmp-label">${label}</td>
      <td class="v2-cmp-val">${va}</td>
      <td class="v2-cmp-val">${vb}</td>
    </tr>`;

  document.getElementById('v2-compare-content').innerHTML = `
    <div class="v2-modal-header">
      <div class="v2-modal-title">↔ Side-by-Side Comparison</div>
      <button class="v2-modal-close" onclick="v2CloseComparison()">✕</button>
    </div>
    <div class="v2-cmp-heads">
      <div class="v2-cmp-head-spacer"></div>
      <div class="v2-cmp-head">
        <div class="v2-cmp-head-ico">${a.indEmoji}</div>
        <div class="v2-cmp-head-name">${a.indLabel}</div>
        <div class="v2-cmp-head-sub">ZIP ${a.zip}</div>
      </div>
      <div class="v2-cmp-head">
        <div class="v2-cmp-head-ico">${b.indEmoji}</div>
        <div class="v2-cmp-head-name">${b.indLabel}</div>
        <div class="v2-cmp-head-sub">ZIP ${b.zip}</div>
      </div>
    </div>
    <table class="v2-cmp-table">
      <tbody>
        ${row('Score',
          `<span style="font-weight:800;color:${sc(a.score)}">${a.score}/100</span>`,
          `<span style="font-weight:800;color:${sc(b.score)}">${b.score}/100</span>`)}
        ${row('Verdict',
          `<span class="v2-badge ${a.verdict||'caution'}">${a.label}</span>`,
          `<span class="v2-badge ${b.verdict||'caution'}">${b.label}</span>`)}
        ${row('Budget', `$${parseInt(a.budget||0).toLocaleString()}`, `$${parseInt(b.budget||0).toLocaleString()}`)}
        ${row('ZIP Code', a.zip, b.zip)}
        ${row('Saved', new Date(a.ts||0).toLocaleDateString(), new Date(b.ts||0).toLocaleDateString())}
      </tbody>
    </table>
    <div class="v2-cmp-verdict">
      ${a.score > b.score
        ? `<span class="v2-badge green">✓ ${a.indEmoji} ${a.indLabel} scores higher (+${a.score - b.score} pts)</span>`
        : b.score > a.score
        ? `<span class="v2-badge green">✓ ${b.indEmoji} ${b.indLabel} scores higher (+${b.score - a.score} pts)</span>`
        : '<span class="v2-badge amber">= Equal score</span>'}
    </div>
  `;
  modal.classList.add('open');
}

function v2CloseComparison() {
  document.getElementById('v2-compare-modal')?.classList.remove('open');
}

// ── F1: ONBOARDING MODAL ──────────────────────────────────────────────────
let _v2OnboardStep = 0;

function v2InitOnboarding() {
  const visited = localStorage.getItem('v2_visited');
  const hasKey  = !!(localStorage.getItem('v2_apikey') || '').trim();
  if (!visited && !hasKey) setTimeout(v2ShowOnboarding, 600);
  localStorage.setItem('v2_visited', '1');
}

function v2ShowOnboarding() {
  _v2OnboardStep = 0;
  v2RenderOnboardStep();
  document.getElementById('v2-onboarding-modal')?.classList.add('open');
}

function v2CloseOnboarding() {
  document.getElementById('v2-onboarding-modal')?.classList.remove('open');
}

function v2RenderOnboardStep() {
  const content = document.getElementById('v2-onboard-content');
  if (!content) return;

  const provGrid = Object.entries(V2_PROVIDERS).map(([k, p]) => {
    const sel = V2.selectedProvider === k;
    return `<div class="v2-onboard-prov${sel?' selected':''}" onclick="v2SelectProvider('${k}');v2RenderOnboardStep()">
      <div style="font-size:22px">${p.ico}</div>
      <div style="font-size:12px;font-weight:700">${p.name}</div>
      <div style="font-size:10px;color:var(--v2-t3);margin-top:2px">${p.model}</div>
    </div>`;
  }).join('');

  const steps = [
    {
      title: 'Welcome to Business Hunter 👋',
      sub:   'AI-powered business analysis · 17 agents · Full plans in minutes',
      body:  `
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:52px;margin-bottom:8px">🚀</div>
          <div style="font-size:13px;color:var(--v2-t2)">Choose your AI provider to get started, or use demo mode with no key needed.</div>
        </div>
        <div class="v2-onboard-prov-grid">${provGrid}</div>`,
      next: 'Next →',
    },
    {
      title: 'Enter Your API Key 🔑',
      sub:   'Stored only in your browser · never sent to our servers',
      body:  `
        <div class="v2-field">
          <label>API Key for ${V2_PROVIDERS[V2.selectedProvider]?.name || 'selected provider'}</label>
          <input class="v2-input" type="password" id="v2-onboard-key"
            placeholder="sk-ant-... or sk-... or AIza..."
            autocomplete="off"
            value="${localStorage.getItem('v2_apikey') || ''}" />
          <div style="font-size:12px;color:var(--v2-t3);margin-top:6px">Key is sent directly to the provider — we never store it.</div>
        </div>
        <div style="text-align:center;margin-top:12px">
          <button class="v2-btn ghost sm" onclick="v2OnboardSkipKey()">Skip — use Demo Mode instead</button>
        </div>`,
      next: 'Save & Continue →',
    },
    {
      title: "You're all set! 🎉",
      sub:   '',
      body:  `
        <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:8px 0">
          <div style="font-size:52px">✅</div>
          <div style="font-size:13px;color:var(--v2-t2);text-align:center">Choose how to get started:</div>
          <button class="v2-btn primary" style="width:100%;justify-content:center"
            onclick="v2CloseOnboarding();v2GoTo('wizard')">🚀 Start My First Analysis</button>
          <button class="v2-btn ghost" style="width:100%;justify-content:center"
            onclick="v2CloseOnboarding();v2StartDemo()">⚡ Run the Demo (No Key Needed)</button>
          <button class="v2-btn ghost sm" onclick="v2CloseOnboarding();v2StartTour()">🗺 Take the Quick Tour</button>
        </div>`,
      next: null,
    },
  ];

  const s = steps[_v2OnboardStep];
  content.innerHTML = `
    <div class="v2-modal-header">
      <div>
        <div class="v2-modal-title">${s.title}</div>
        ${s.sub ? `<div style="font-size:12px;color:var(--v2-t3);margin-top:3px">${s.sub}</div>` : ''}
      </div>
      <button class="v2-modal-close" onclick="v2CloseOnboarding()">✕</button>
    </div>
    <div class="v2-onboard-dots">
      ${[0,1,2].map(i => `<div class="v2-onboard-dot${i === _v2OnboardStep ? ' active' : i < _v2OnboardStep ? ' done' : ''}"></div>`).join('')}
    </div>
    <div style="padding:20px 0">${s.body}</div>
    ${s.next ? `<div style="display:flex;justify-content:flex-end">
      <button class="v2-btn primary" onclick="v2OnboardNext()">${s.next}</button>
    </div>` : ''}
  `;
}

function v2OnboardNext() {
  if (_v2OnboardStep === 1) {
    const keyEl = document.getElementById('v2-onboard-key');
    if (keyEl?.value.trim()) {
      localStorage.setItem('v2_apikey', keyEl.value.trim());
      v2SyncToV1Dom();
    }
  }
  _v2OnboardStep = Math.min(_v2OnboardStep + 1, 2);
  v2RenderOnboardStep();
}

function v2OnboardSkipKey() {
  _v2OnboardStep = 2;
  v2RenderOnboardStep();
}

// ── F10: TOOLTIP TOUR ─────────────────────────────────────────────────────
const V2_TOUR = [
  { sel: '#v2-global-nav .v2-nav-logo', title: 'Business Hunter', desc: 'Click the logo to return home from any screen.' },
  { sel: '#screen-landing .v2-hero-cta', title: 'Get Started', desc: 'Start a new analysis with your API key, or run the demo with no key — all 17 agents complete in seconds.' },
  { sel: '#v2-steps-bar', title: 'Setup Wizard', desc: '5 quick steps: pick your industry, location, budget, capacity, and goals. Takes under a minute.' },
  { sel: '#v2-agent-sidenav', title: 'Agent Sidebar', desc: 'After your run, click any agent to jump directly to its output. Dots go green as agents complete.' },
  { sel: '#v2-chat-widget', title: 'AI Answers', desc: 'Ask follow-up questions once the pipeline finishes. "Best city?", "Biggest risks?", "How does the score work?" — it knows everything.' },
];

let _v2TourIdx = -1;

function v2StartTour() {
  _v2TourIdx = 0;
  document.getElementById('v2-tour-overlay')?.classList.add('active');
  v2RenderTourStep();
}

function v2EndTour() {
  _v2TourIdx = -1;
  document.getElementById('v2-tour-overlay')?.classList.remove('active');
}

function v2TourNext() {
  _v2TourIdx++;
  if (_v2TourIdx >= V2_TOUR.length) { v2EndTour(); return; }
  v2RenderTourStep();
}

function v2RenderTourStep() {
  const s       = V2_TOUR[_v2TourIdx];
  if (!s) { v2EndTour(); return; }
  const tooltip = document.getElementById('v2-tour-tooltip');
  const counter = document.getElementById('v2-tour-count');
  if (!tooltip) return;
  if (counter) counter.textContent = `${_v2TourIdx + 1} / ${V2_TOUR.length}`;

  tooltip.innerHTML = `
    <div class="v2-tour-count-lbl">${_v2TourIdx + 1} / ${V2_TOUR.length}</div>
    <div class="v2-tour-title">${s.title}</div>
    <div class="v2-tour-desc">${s.desc}</div>
    <div class="v2-tour-btns">
      <button class="v2-btn ghost sm" onclick="v2EndTour()">Skip</button>
      <button class="v2-btn primary sm" onclick="v2TourNext()">${_v2TourIdx < V2_TOUR.length - 1 ? 'Next →' : '✓ Done'}</button>
    </div>`;

  // Position tooltip near the target element
  const target = document.querySelector(s.sel);
  if (target) {
    const rect = target.getBoundingClientRect();
    const top  = Math.min(rect.bottom + 14, window.innerHeight - 180);
    const left = Math.max(Math.min(rect.left, window.innerWidth - 320), 12);
    tooltip.style.cssText = `top:${top}px;left:${left}px;transform:none`;
  } else {
    tooltip.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%)';
  }
}

// ── F12: INDUSTRY-SPECIFIC WIZARD EXTRAS ──────────────────────────────────
const V2_INDUSTRY_EXTRAS = {
  daycare: [
    { id:'age_groups', label:'Age Groups Served', multi: true,
      opts:[['infant','👶 Infant (0–18 mo)'],['toddler','🧸 Toddler (18 mo–3 yr)'],['preschool','🎨 Preschool (3–5 yr)'],['school_age','🏫 School Age (5–12 yr)']] },
    { id:'curriculum', label:'Curriculum Model', multi: false,
      opts:[['standard','Standard'],['montessori','Montessori'],['reggio','Reggio Emilia'],['stem','STEM Focus']] },
  ],
  restaurant: [
    { id:'cuisine', label:'Cuisine Type', multi: false,
      opts:[['american','🍔 American'],['italian','🍝 Italian'],['asian','🍜 Asian'],['mexican','🌮 Mexican'],['mediterranean','🥙 Mediterranean'],['other','🍽️ Other']] },
    { id:'service_model', label:'Service Model', multi: false,
      opts:[['qsr','Quick Service (QSR)'],['fast_casual','Fast Casual'],['full_service','Full Service'],['food_truck','Food Truck']] },
  ],
  gym: [
    { id:'gym_format', label:'Gym Format', multi: false,
      opts:[['traditional','Traditional Big Box'],['boutique','Boutique Studio'],['crossfit','CrossFit / HIIT'],['yoga','Yoga / Pilates'],['martial','Martial Arts']] },
  ],
  coffee_shop: [
    { id:'coffee_model', label:'Business Model', multi: false,
      opts:[['standalone','Standalone Café'],['drive_through','Drive-Through'],['hybrid','Café + Drive-Through'],['kiosk','Kiosk / Counter']] },
  ],
  senior_care: [
    { id:'care_type', label:'Care Level', multi: false,
      opts:[['independent','Independent Living'],['assisted','Assisted Living'],['memory','Memory Care'],['skilled','Skilled Nursing']] },
  ],
  gas_station: [
    { id:'cstore', label:'Convenience Store?', multi: false,
      opts:[['yes','Yes — Full C-Store'],['no','Gas Only']] },
    { id:'car_wash', label:'Include Car Wash?', multi: false,
      opts:[['yes','Yes'],['no','No']] },
  ],
  barbershop: [
    { id:'shop_model', label:'Shop Format', multi: false,
      opts:[['barbershop','Barbershop Only'],['salon','Salon Only'],['both','Barbershop + Salon'],['express','Express / Franchise']] },
  ],
  medical_practice: [
    { id:'practice_type', label:'Practice Type', multi: false,
      opts:[['solo','Solo Practitioner'],['group','Group Practice (2–5 providers)'],['employed','Hospital-Employed Group'],['dpc','Direct Primary Care (DPC)']] },
    { id:'specialty', label:'Primary Specialty', multi: false,
      opts:[['family_med','👨‍⚕️ Family Medicine'],['internal_med','🫀 Internal Medicine'],['pediatrics','👶 Pediatrics'],['womens_health','🩺 Women\'s Health'],['mental_health','🧠 Mental Health / Psychiatry'],['other','⚕️ Other Specialty']] },
  ],
};

function v2GetIndustryExtrasHTML(industry) {
  const extras = V2_INDUSTRY_EXTRAS[industry];
  if (!extras) return '';
  const d = V2.wizard.data.extras || {};

  return `<div style="margin-top:8px;border-top:1px solid var(--v2-border);padding-top:18px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--v2-t3);margin-bottom:14px">Industry Details</div>
    ${extras.map(field => {
      const val = d[field.id] || [];
      const arr = Array.isArray(val) ? val : [val];
      return `
        <div class="v2-field">
          <label>${field.label}</label>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
            ${field.opts.map(([v, l]) => `
              <div class="v2-choose-item${arr.includes(v) ? ' selected' : ''}"
                   onclick="v2WizToggleExtra('${field.id}','${v}',${field.multi})"
                   style="justify-content:flex-start;padding:8px 12px;font-size:12px">
                <span class="lbl">${l}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

function v2WizToggleExtra(fieldId, val, multi) {
  if (!V2.wizard.data.extras) V2.wizard.data.extras = {};
  if (multi) {
    const arr = Array.isArray(V2.wizard.data.extras[fieldId]) ? V2.wizard.data.extras[fieldId] : [];
    const idx = arr.indexOf(val);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(val);
    V2.wizard.data.extras[fieldId] = arr;
  } else {
    V2.wizard.data.extras[fieldId] = [val];
  }
  v2WizRenderStep();
}

// ── F7: FULL R SAVE / RESTORE (overrides v2-06-dashboard.js & v2-07-portfolio.js) ──
function v2SaveCurrentRun() {
  if (!V2.run) { v2Toast('No analysis to save yet'); return; }
  const ind     = V2_INDUSTRIES.find(i => i.val === V2.run.industry) || { emoji:'🏢', label:'Business' };
  const score   = V2.run.score || v2CalcScore();
  const verdict = v2ScoreVerdict(score);
  const R_data  = typeof R !== 'undefined' ? JSON.parse(JSON.stringify(R)) : {};
  const entry   = {
    id:          V2.run.id || Date.now(),
    ts:          V2.run.ts || new Date().toISOString(),
    industry:    V2.run.industry,
    zip:         V2.run.zip,
    budget:      V2.run.budget,
    capacity:    V2.run.capacity,
    score,
    verdict:     verdict.colorClass,
    label:       verdict.label,
    indLabel:    ind.label,
    indEmoji:    ind.emoji,
    wizardData:  { ...V2.wizard.data },
    R:           R_data,
  };
  const idx = V2.portfolio.findIndex(p => p.id === entry.id);
  if (idx >= 0) V2.portfolio[idx] = entry; else V2.portfolio.unshift(entry);
  if (V2.portfolio.length > 10) V2.portfolio = V2.portfolio.slice(0, 10);
  v2SavePortfolio();
  v2Toast('✓ Saved to portfolio (full data included)');
}

function v2PortRestore(id) {
  const entry = V2.portfolio.find(r => String(r.id) === String(id));
  if (!entry) { v2Toast('Run not found'); return; }
  V2.run = entry;

  // Restore full R if saved
  if (entry.R) {
    try {
      if (typeof R !== 'undefined') {
        Object.keys(entry.R).forEach(k => { R[k] = entry.R[k]; });
      } else {
        window.R = entry.R;
      }
    } catch(e) {}
  }

  // Restore wizard data
  if (entry.wizardData) V2.wizard.data = { ...entry.wizardData };

  v2GoTo('dashboard');
  v2Toast(`↩ Restored: ${entry.indEmoji} ${entry.indLabel}`);
}

// ── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Theme
  const savedTheme = localStorage.getItem('v2_theme') || 'dark';
  v2SetTheme(savedTheme);

  // Share hash
  v2CheckShareHash();

  // Onboarding (slight delay so landing renders first)
  setTimeout(v2InitOnboarding, 900);
});
