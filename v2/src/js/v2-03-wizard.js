// ── V2 WIZARD ─────────────────────────────────────────────────────────────
const V2_WIZARD_STEPS = [
  { id:'industry', label:'Industry', heading:'What kind of business?', desc:'Select the industry you want to analyze.' },
  { id:'location', label:'Location',  heading:'Where are you targeting?', desc:'Enter a ZIP code and search radius.' },
  { id:'budget',   label:'Budget',    heading:'What\'s your budget?', desc:'Total startup capital you have available.' },
  { id:'details',  label:'Details',   heading:'Business details', desc:'Capacity, target opening timeline, and goals.' },
  { id:'confirm',  label:'Launch',    heading:'Ready to analyze', desc:'Review your inputs and launch the AI pipeline.' },
];

const V2_INDUSTRIES = [
  { val:'daycare',      emoji:'🏫', label:'Daycare / Childcare' },
  { val:'gas_station',  emoji:'⛽', label:'Gas Station / C-Store' },
  { val:'laundromat',   emoji:'🫧', label:'Laundromat' },
  { val:'car_wash',     emoji:'🚗', label:'Car Wash' },
  { val:'restaurant',   emoji:'🍽️', label:'Restaurant' },
  { val:'gym',          emoji:'💪', label:'Gym / Fitness Center' },
  { val:'indoor_play',  emoji:'🎠', label:'Indoor Play Area / FEC' },
  { val:'dry_cleaning', emoji:'👔', label:'Dry Cleaning / Laundry' },
  { val:'senior_care',  emoji:'🏥', label:'Senior Care / Assisted Living' },
  { val:'tutoring',     emoji:'📚', label:'Tutoring / Learning Center' },
  { val:'urgent_care',  emoji:'🩺', label:'Urgent Care Clinic' },
  { val:'coffee_shop',  emoji:'☕', label:'Coffee Shop / Café' },
  { val:'barbershop',   emoji:'✂️', label:'Barbershop / Salon' },
  { val:'coworking',    emoji:'🖥️', label:'Co-Working Space' },
];

const V2_BUDGETS = [
  { val:'150000',  label:'$150K',   desc:'Small / lean startup' },
  { val:'300000',  label:'$300K',   desc:'Mid-size operation' },
  { val:'600000',  label:'$600K',   desc:'Standard launch budget' },
  { val:'1000000', label:'$1M+',    desc:'Full-scale build-out' },
  { val:'custom',  label:'Custom',  desc:'Enter your own amount' },
];

function v2InitWizard() {
  v2WizRenderStepsBar();
  v2WizRenderStep();
}

function v2WizRenderStepsBar() {
  const bar = document.getElementById('v2-steps-bar');
  if (!bar) return;
  bar.innerHTML = V2_WIZARD_STEPS.map((s, i) => {
    const cur = V2.wizard.step;
    const cls = i < cur ? 'done' : i === cur ? 'active' : '';
    const lineCls = i < cur ? 'done' : '';
    return `
      <div class="v2-step-item">
        <div class="v2-step-dot ${cls}">${i < cur ? '✓' : i + 1}</div>
        ${i < V2_WIZARD_STEPS.length - 1 ? `<div class="v2-step-line ${lineCls}"></div>` : ''}
      </div>`;
  }).join('');
}

function v2WizRenderStep() {
  const card = document.getElementById('v2-wizard-card');
  if (!card) return;
  const s = V2_WIZARD_STEPS[V2.wizard.step];
  const d = V2.wizard.data;

  let body = '';
  if (s.id === 'industry') {
    body = `<div class="v2-grid-choose">${V2_INDUSTRIES.map(ind => `
      <div class="v2-choose-item${d.industry===ind.val?' selected':''}" onclick="v2WizPickIndustry('${ind.val}')">
        <span class="ico">${ind.emoji}</span><span class="lbl">${ind.label}</span>
      </div>`).join('')}</div>`;

  } else if (s.id === 'location') {
    body = `
      <div class="v2-field">
        <label>ZIP Code</label>
        <input class="v2-input" id="wiz-zip" type="text" maxlength="5" placeholder="e.g. 30097" value="${d.zip||''}" oninput="V2.wizard.data.zip=this.value;if(typeof v2LookupZIP==='function')v2LookupZIP(this.value)" />
        <div id="wiz-zip-preview" style="font-size:12px;color:var(--v2-t2);margin-top:4px;min-height:16px"></div>
      </div>
      <div class="v2-field">
        <label>Search Radius (miles)</label>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${['15','25','40','60'].map(r=>`<div class="v2-choose-item${(d.radius||'40')===r?' selected':''}" onclick="v2WizPickRadius('${r}')" style="justify-content:center"><span class="lbl">${r} mi</span></div>`).join('')}
        </div>
      </div>`;

  } else if (s.id === 'budget') {
    // Sync state with the visual default so "Continue" doesn't silently block
    if (!d.budget) { V2.wizard.data.budget = '600000'; d = V2.wizard.data; }
    body = `
      <div class="v2-budget-grid">
        ${V2_BUDGETS.map(b=>`<div class="v2-budget-item${d.budget===b.val?' selected':''}" onclick="v2WizPickBudget('${b.val}')">
          <div class="v2-budget-val">${b.label}</div><div class="v2-budget-desc">${b.desc}</div></div>`).join('')}
      </div>
      <div class="v2-field" id="wiz-custom-budget-row" style="display:${d.budget==='custom'?'block':'none'};margin-top:12px">
        <label>Enter your budget ($)</label>
        <input class="v2-input" id="wiz-custom-budget" type="number" placeholder="e.g. 450000" value="${d.customBudget||''}" oninput="V2.wizard.data.customBudget=this.value" />
      </div>`;

  } else if (s.id === 'details') {
    const ind = V2_INDUSTRIES.find(i=>i.val===d.industry)||{label:'Business'};
    body = `
      <div class="v2-field">
        <label>Capacity (${ind.label} units)</label>
        <input class="v2-input" id="wiz-capacity" type="number" min="1" placeholder="e.g. 75" value="${d.capacity||''}" oninput="V2.wizard.data.capacity=this.value" />
      </div>
      <div class="v2-field">
        <label>Experience Level</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${[['none','None'],['some','Some'],['expert','Expert']].map(([v,l])=>`
            <div class="v2-choose-item${(d.experience||'some')===v?' selected':''}" onclick="V2.wizard.data.experience='${v}';v2WizRenderStep()" style="justify-content:center">
              <span class="lbl">${l}</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="v2-field">
        <label>Primary Goal</label>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
          ${[['open','Open & Operate'],['invest','Investment / ROI'],['sell','Sell / Exit'],['validate','Just Validating']].map(([v,l])=>`
            <div class="v2-choose-item${(d.goal||'open')===v?' selected':''}" onclick="V2.wizard.data.goal='${v}';v2WizRenderStep()" style="justify-content:center">
              <span class="lbl">${l}</span>
            </div>`).join('')}
        </div>
      </div>
      ${typeof v2GetIndustryExtrasHTML === 'function' ? v2GetIndustryExtrasHTML(d.industry||'') : ''}`;

  } else if (s.id === 'confirm') {
    const ind  = V2_INDUSTRIES.find(i=>i.val===d.industry)||{emoji:'🏢',label:'Business'};
    const budg = d.budget==='custom' ? `$${parseInt(d.customBudget||600000).toLocaleString()}` : `$${parseInt(d.budget||600000).toLocaleString()}`;
    const hasKey = !!(localStorage.getItem('v2_apikey')||'').trim();
    body = `
      <div style="display:grid;gap:12px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;padding:12px 16px;background:var(--v2-s3);border-radius:10px">
          <span style="color:var(--v2-t2);font-size:13px">Industry</span>
          <strong>${ind.emoji} ${ind.label}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 16px;background:var(--v2-s3);border-radius:10px">
          <span style="color:var(--v2-t2);font-size:13px">Location</span>
          <strong>ZIP ${d.zip||'30097'} · ${d.radius||'40'} mi radius</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 16px;background:var(--v2-s3);border-radius:10px">
          <span style="color:var(--v2-t2);font-size:13px">Budget</span>
          <strong>${budg}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 16px;background:var(--v2-s3);border-radius:10px">
          <span style="color:var(--v2-t2);font-size:13px">Capacity</span>
          <strong>${d.capacity||75} units</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 16px;background:var(--v2-s3);border-radius:10px">
          <span style="color:var(--v2-t2);font-size:13px">Goal</span>
          <strong style="text-transform:capitalize">${d.goal||'open'}</strong>
        </div>
      </div>
      ${hasKey ? `<div style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--v2-green);margin-bottom:12px">✓ API key configured</div>`
                : `<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--v2-amber);margin-bottom:12px;cursor:pointer" onclick="v2ShowApiKey()">⚠ No API key — <u>click to add one</u> or enable Demo Mode below</div>`}
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="v2-btn ghost sm" onclick="v2StartDemo()">⚡ Use Demo Mode (no key)</button>
      </div>`;
  }

  card.innerHTML = `
    <div class="v2-step-label">Step ${V2.wizard.step+1} of ${V2_WIZARD_STEPS.length}</div>
    <div class="v2-step-heading">${s.heading}</div>
    <div class="v2-step-desc">${s.desc}</div>
    ${body}
  `;

  // Update nav buttons
  const back = document.getElementById('v2-wiz-back');
  const next = document.getElementById('v2-wiz-next');
  if (back) back.style.visibility = V2.wizard.step === 0 ? 'hidden' : 'visible';
  if (next) next.textContent = s.id === 'confirm' ? '🚀 Launch Analysis' : 'Continue →';
}

function v2WizPickIndustry(val) {
  V2.wizard.data.industry = val;
  v2WizRenderStep();
}
function v2WizPickRadius(val) {
  V2.wizard.data.radius = val;
  v2WizRenderStep();
}
function v2WizPickBudget(val) {
  V2.wizard.data.budget = val;
  v2WizRenderStep();
  const row = document.getElementById('wiz-custom-budget-row');
  if (row) row.style.display = val === 'custom' ? 'block' : 'none';
}

function v2WizNext() {
  const s = V2_WIZARD_STEPS[V2.wizard.step];
  // Validate
  if (s.id === 'industry' && !V2.wizard.data.industry) { v2Toast('Please select an industry'); return; }
  if (s.id === 'location') {
    const z = (document.getElementById('wiz-zip')?.value||V2.wizard.data.zip||'').trim();
    if (!/^\d{5}$/.test(z)) { v2Toast('Enter a valid 5-digit ZIP code'); return; }
    V2.wizard.data.zip = z;
    if (!V2.wizard.data.radius) V2.wizard.data.radius = '40';
  }
  if (s.id === 'budget' && !V2.wizard.data.budget) { v2Toast('Please select a budget'); return; }
  if (s.id === 'details') {
    const cap = document.getElementById('wiz-capacity')?.value || V2.wizard.data.capacity;
    if (!cap || parseInt(cap) < 1) { v2Toast('Enter a valid capacity'); return; }
    V2.wizard.data.capacity = cap;
  }
  if (s.id === 'confirm') {
    v2LaunchPipeline();
    return;
  }
  V2.wizard.step = Math.min(V2.wizard.step + 1, V2_WIZARD_STEPS.length - 1);
  if (typeof v2SaveWizardDraft === 'function') v2SaveWizardDraft();
  v2WizRenderStepsBar();
  v2WizRenderStep();
}

function v2WizBack() {
  V2.wizard.step = Math.max(0, V2.wizard.step - 1);
  v2WizRenderStepsBar();
  v2WizRenderStep();
}

function v2LaunchPipeline() {
  const d = V2.wizard.data;
  const budget = d.budget === 'custom' ? (d.customBudget||600000) : (d.budget||600000);

  // Sync wizard values to v1 DOM
  const zipEl      = document.getElementById('zip');
  const radEl      = document.getElementById('radius');
  const capEl      = document.getElementById('capacity');
  const budEl      = document.getElementById('budget');
  const indEl      = document.getElementById('industrySelect');

  if (zipEl) zipEl.value = d.zip || '30097';
  if (radEl) radEl.value = d.radius || '40';
  if (capEl) capEl.value = d.capacity || '75';
  if (budEl) budEl.value = budget;
  if (indEl) { indEl.value = d.industry || 'daycare'; if (typeof onIndustryChange === 'function') onIndustryChange(); }

  // Sync API key
  v2SyncToV1Dom();

  // Go to copilot screen
  v2GoTo('copilot');
  const ind = V2_INDUSTRIES.find(i=>i.val===d.industry)||{emoji:'🏢',label:'Business'};
  const ctxText = `${ind.emoji} ${ind.label} · ZIP ${d.zip||'30097'} · $${parseInt(budget).toLocaleString()} budget`;
  // Update copilot screen sub-heading
  const copCtx = document.getElementById('v2-copilot-context');
  if (copCtx) copCtx.textContent = ctxText;
  // Update chat widget context label
  const chatCtx = document.getElementById('v2-chat-context');
  if (chatCtx) chatCtx.textContent = ctxText;

  // Reset pipeline state
  if (typeof _v2PipelineCompleted !== 'undefined') _v2PipelineCompleted = false;

  // Clear chat history for new run
  if (typeof v2ClearChatHistory === 'function') v2ClearChatHistory();

  // Clear draft on launch
  if (typeof v2ClearWizardDraft === 'function') v2ClearWizardDraft();

  // Clear previous chat, lock chat input, collapse widget
  const msgs = document.getElementById('v2-chat-msgs');
  if (msgs) msgs.innerHTML = '';
  const inp = document.getElementById('v2-chat-input');
  const btn = document.getElementById('v2-chat-send');
  if (inp) { inp.disabled = true; inp.placeholder = 'Available after analysis completes…'; }
  if (btn) { btn.disabled = true; }
  const widget = document.getElementById('v2-chat-widget');
  if (widget) widget.classList.add('collapsed');
  const toggleBtn = document.getElementById('v2-chat-toggle-btn');
  if (toggleBtn) toggleBtn.textContent = '💬 AI Answers';

  // Add opening copilot message (widget will be opened at pipeline complete)
  v2ChatMsg('ai', `🚀 Starting full analysis for your ${ind.label} in ZIP ${d.zip||'30097'}.<br><br>I'll run all 17 research agents — demographics, compliance, real estate, financials, and more. ${demoMode ? 'Demo mode: instant results.' : 'Live mode: ~5–8 minutes with API key.'}`);

  // F14: Request notification permission before pipeline starts
  if (typeof v2RequestNotificationPermission === 'function') v2RequestNotificationPermission();

  // Run the pipeline
  setTimeout(() => {
    stopRequested = false;
    const stopBtn = document.getElementById('v2-copilot-stop');
    if (stopBtn) { stopBtn.textContent = '⬛ Stop'; stopBtn.disabled = false; }
    runPipeline();
  }, 800);
}
