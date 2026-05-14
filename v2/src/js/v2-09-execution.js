// ── V2 EXECUTION PLAN ────────────────────────────────────────────────────
function v2ShowExecution() {
  const modal   = document.getElementById('v2-execution-modal');
  const content = document.getElementById('v2-execution-content');
  if (!modal || !content) return;

  const run = V2.run;
  const ind = run ? (V2_INDUSTRIES.find(i=>i.val===run.industry)||{emoji:'🏢',label:'Business'}) : {emoji:'🏢',label:'Business'};

  // Try to pull milestones from Agent 10 (Project Plan)
  const milestones = _toArr(R?.a10?.milestones || R?.a10?.phases || []);
  // checklist_phases is [{phase, items:[{task,owner,critical}]}] — flatten to item list
  const _cpArr = _toArr(R?.a10?.checklist_phases || R?.a10?.launch_checklist || R?.a10?.checklist || []);
  const checklist = _cpArr.length && _cpArr[0]?.items
    ? _cpArr.flatMap(p => _toArr(p.items))
    : _cpArr;
  const permits    = _toArr(R?.a5?.requirements || R?.a5?.checklist || []);

  const phases = milestones.length ? milestones : v2DefaultExecPhases(ind.label);

  content.innerHTML = `
    <div class="v2-modal-header">
      <div class="v2-modal-title">🗓 Execution Roadmap — ${ind.emoji} ${ind.label}</div>
      <button class="v2-modal-close" onclick="v2CloseExecution()">✕</button>
    </div>

    <div style="margin-bottom:20px">
      <div class="v2-label" style="margin-bottom:10px">52-Week Launch Timeline</div>
      <div class="v2-timeline">
        ${phases.map((ph, i) => `
          <div class="v2-timeline-item">
            <div class="v2-timeline-left">
              <div class="v2-timeline-dot ${i===0?'current':''}"></div>
              ${i < phases.length-1 ? '<div class="v2-timeline-line"></div>' : ''}
            </div>
            <div class="v2-timeline-content">
              <div class="v2-timeline-phase">${ph.phase || ph.period || 'Phase '+(i+1)}</div>
              <div class="v2-timeline-title">${ph.name || ph.title || ph.milestone || 'Milestone'}</div>
              ${_toArr(ph.tasks||ph.items||ph.deliverables||[]).length ?
                `<div class="v2-timeline-items">${_toArr(ph.tasks||ph.items||ph.deliverables||[]).slice(0,4).map(t=>
                  `<div class="v2-timeline-task">${typeof t==='string'?t:(t.task||t.name||t.item||'')}</div>`
                ).join('')}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>

    ${checklist.length ? `
    <div class="v2-investor-section">
      <h4 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--v2-a1);margin-bottom:10px">Launch Checklist</h4>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${checklist.slice(0,12).map(item=>`
          <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 12px;background:var(--v2-s3);border-radius:8px">
            <span style="color:var(--v2-a1);margin-top:1px">☐</span>
            <span style="font-size:13px">${typeof item==='string'?item:(item.task||item.item||item.name||'')}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${permits.length ? `
    <div class="v2-investor-section" style="margin-top:20px">
      <h4 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--v2-a1);margin-bottom:10px">Permit & Compliance Checklist</h4>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${permits.slice(0,8).map(p=>`
          <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 12px;background:var(--v2-s3);border-radius:8px">
            <span style="color:var(--v2-amber);margin-top:1px">⚖</span>
            <span style="font-size:13px">${typeof p==='string'?p:(p.requirement||p.name||p.permit||'')}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:1px solid var(--v2-border)">
      <button class="v2-btn ghost sm" onclick="v2CloseExecution()">Close</button>
      <button class="v2-btn ghost sm" onclick="v2ShowDetail()">📊 Full Project Plan</button>
      <button class="v2-btn primary sm" onclick="v2PrintExecution()">🖨 Print Roadmap</button>
    </div>
  `;

  modal.classList.add('open');
}

function v2DefaultExecPhases(bizLabel) {
  return [
    { phase:'Weeks 1–4',   name:'Planning & Finance',        tasks:['Finalize business plan','Apply for SBA 7(a) loan','Engage attorney & accountant','Form LLC / corporate entity'] },
    { phase:'Weeks 5–12',  name:'Location & Permits',        tasks:['Sign lease on top-ranked site','Submit permit applications','Begin build-out design','Hire contractor & architect'] },
    { phase:'Weeks 13–24', name:'Build-Out & Setup',         tasks:['Complete construction & renovation','Install equipment & technology','Recruit and hire core team','Set up POS, software, insurance'] },
    { phase:'Weeks 25–36', name:'Pre-Launch & Marketing',    tasks:['Staff training program','Build waitlist & social presence','Grand opening event planning','Soft launch with select customers'] },
    { phase:'Weeks 37–52', name:'Launch & Optimize',         tasks:['Grand opening','Weekly KPI reviews','Customer acquisition campaigns','Scale toward break-even occupancy'] },
  ];
}

function v2CloseExecution() {
  document.getElementById('v2-execution-modal').classList.remove('open');
}

function v2PrintExecution() {
  const content = document.getElementById('v2-execution-content')?.innerHTML || '';
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Execution Roadmap</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#fff;color:#1e293b;padding:40px;max-width:720px;margin:0 auto}
    .v2-modal-header{display:flex;justify-content:space-between;margin-bottom:24px}
    .v2-modal-title{font-size:22px;font-weight:800}
    .v2-modal-close,.v2-investor-actions button,.v2-btn{display:none}
    .v2-timeline-item{display:flex;gap:16px;margin-bottom:0}
    .v2-timeline-left{display:flex;flex-direction:column;align-items:center;width:36px;flex-shrink:0}
    .v2-timeline-dot{width:10px;height:10px;border-radius:50%;background:#6366f1;margin-top:4px;flex-shrink:0}
    .v2-timeline-line{flex:1;width:1.5px;background:#e2e8f0;margin:3px 0}
    .v2-timeline-content{padding-bottom:20px}
    .v2-timeline-phase{font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
    .v2-timeline-title{font-size:15px;font-weight:700;margin-bottom:6px}
    .v2-timeline-task{font-size:12px;color:#64748b;margin-bottom:3px;padding-left:12px}
    .v2-label,.v2-investor-section h4{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6366f1;margin:20px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:5px}
    @media print{button{display:none!important}}
  </style></head><body>${content}<script>setTimeout(()=>window.print(),400)<\/script></body></html>`);
  w.document.close();
}
