// ── V2 LANDING ────────────────────────────────────────────────────────────
function v2RenderLandingDemo() {
  const el = document.getElementById('v2-demo-preview');
  if (!el) return;
  el.innerHTML = `
    <div class="v2-demo-card">
      <div class="v2-demo-label">✨ Sample Analysis — Daycare · Suwanee GA</div>
      <div class="v2-demo-biz">🧸 Premium Childcare Center</div>
      <div class="v2-demo-meta">ZIP 30097 · Suwanee, GA · $600,000 budget · 75 slots</div>
      <div class="v2-demo-stats">
        <div class="v2-demo-stat">
          <div class="v2-demo-stat-val" style="background:linear-gradient(135deg,#22c55e,#16a34a);-webkit-background-clip:text;-webkit-text-fill-color:transparent">84</div>
          <div class="v2-demo-stat-lbl">Viability Score</div>
        </div>
        <div class="v2-demo-stat">
          <div class="v2-demo-stat-val" style="color:#22c55e">$33K</div>
          <div class="v2-demo-stat-lbl">Net/mo (Base)</div>
        </div>
        <div class="v2-demo-stat">
          <div class="v2-demo-stat-val" style="color:#f59e0b">16 mo</div>
          <div class="v2-demo-stat-lbl">Break-Even</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        <div style="display:flex;gap:8px;align-items:center">
          <span class="v2-badge green">✓ GO</span>
          <span style="font-size:12px;color:var(--v2-t2)">Childcare desert · $112K median income · 49% gap coverage</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span style="font-size:11px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:4px;padding:2px 7px;color:#93c5fd">17 Agents</span>
          <span style="font-size:11px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:4px;padding:2px 7px;color:#86efac">Full Business Plan</span>
          <span style="font-size:11px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:4px;padding:2px 7px;color:#fcd34d">SBA Ready</span>
          <span style="font-size:11px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:4px;padding:2px 7px;color:#c4b5fd">Grants Included</span>
        </div>
      </div>
      <button class="v2-btn primary" style="width:100%;justify-content:center;font-size:14px;padding:13px 20px" onclick="v2StartDemo()">⚡ Run Full Demo — No API Key Needed</button>
    </div>
  `;
}

function v2StartDemo() {
  // Pre-fill wizard with complete daycare demo data
  // NOTE: ONLY 'daycare' has complete DEMO_DATA coverage across all 17 agents
  V2.wizard.data = {
    industry: 'daycare',
    zip: '30097',       // Suwanee, GA — matches demo dataset
    budget: '600000',
    capacity: '75',
    radius: '25',
    experience: 'some',
    goal: 'open',
  };
  // Activate demo mode in v1 (window-scoped to avoid strict-mode ReferenceError)
  try { demoMode = true; } catch(e) { window.demoMode = true; }
  const demoBtn = document.getElementById('demoBtn');
  if (demoBtn) {
    demoBtn.style.background = 'var(--amber-dim)';
  }
  v2Toast('⚡ Demo mode — all 17 agents running with pre-built data');
  v2LaunchPipeline();
}
