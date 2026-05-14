async function runPipeline() {
  if(running) return;
  if(!demoMode && !key()) { showErr('Please enter your Anthropic API key.'); return; }
  hideErr(); running=true; stopRequested=false;
  $('runBtn').disabled=true;
  $('stopBtn').style.display='inline-flex';
  $('resetBtn').style.display='none';
  $('orchStatus').textContent='orchestrating…';
  $('finalBox').className='final-box';

  const fb     = k => JSON.stringify(window['getFallback'+k]?.() || {});
  const cached = k => R['a'+k] ? JSON.stringify(R['a'+k]) : null;
  const best   = k => cached(k) || fb(k);
  try {
    // ── Phase 1: Foundation Research (parallel) ─────────────
    let r1, r5, r6;
    if (phaseShouldRun(1)) {
      setProgress(5,'Phase 1 — Demographics · Compliance · Competitive Intel (parallel)…');
      const [res1,res5,res6]=await Promise.allSettled([runAgent1(),runAgent5(),runAgent6()]);
      r1=res1.status==='fulfilled'?res1.value:fb(1);
      r5=res5.status==='fulfilled'?res5.value:fb(5);
      r6=res6.status==='fulfilled'?res6.value:fb(6);
      if(res1.status==='rejected') console.error('Agent 1 failed:',res1.reason?.message);
      if(res5.status==='rejected') console.error('Agent 5 failed:',res5.reason?.message);
      if(res6.status==='rejected') console.error('Agent 6 failed:',res6.reason?.message);
    } else {
      setProgress(5,'Phase 1 — skipped (using cached data)');
      r1=best(1); r5=best(5); r6=best(6);
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 2: Gap Analysis ────────────────────────────────
    setProgress(16, phaseShouldRun(2)?'Phase 2 — Gap Analysis…':'Phase 2 — skipped');
    let r2=best(2);
    if (phaseShouldRun(2)) {
      try { r2=await runAgent2(r1,r5,r6); } catch(e) { console.error('Agent 2 failed:',e.message); r2=fb(2); }
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 3: Site Selection ──────────────────────────────
    setProgress(24, phaseShouldRun(3)?'Phase 3 — Site Selection…':'Phase 3 — skipped');
    let r3=best(3);
    if (phaseShouldRun(3)) {
      try { r3=await runAgent3(r1,r2,r5); } catch(e) { console.error('Agent 3 failed:',e.message); r3=fb(3); }
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 4: Real Estate (needs site selection first) ────
    setProgress(32, phaseShouldRun(4)?'Phase 4 — Real Estate Search…':'Phase 4 — skipped');
    let r4=best(4);
    if (phaseShouldRun(4)) {
      try { r4=await runAgent4(r3,r5); } catch(e) { console.error('Agent 4 failed:',e.message); r4=fb(4); }
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 5: Financial Feasibility (site-aware, 3 sub-calls) ──
    setProgress(40, phaseShouldRun(5)?'Phase 5 — Financial Feasibility (revenue model · cost model · analysis)…':'Phase 5 — skipped');
    let r7=best(7);
    if (phaseShouldRun(5)) {
      try { r7=await runAgent7(r3,r4,r5); } catch(e) { console.error('Agent 7 failed:',e.message); r7=fb(7); }
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 6: Executive Summary ───────────────────────────
    setProgress(50, phaseShouldRun(6)?'Phase 6 — Executive Summary & Verdict…':'Phase 6 — skipped');
    let r8=best(8);
    if (phaseShouldRun(6)) {
      try { r8=await runAgent8(r1,r2,r3,r4,r5,r6,r7); } catch(e) { console.error('Agent 8 failed:',e.message); r8=fb(8); }
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 7: Business Plan (4 sub-calls) ─────────────────
    setProgress(58, phaseShouldRun(7)?'Phase 7 — Business Plan (4 focused sub-agents)…':'Phase 7 — skipped');
    let r9=best(9);
    if (phaseShouldRun(7)) {
      try { r9=await runAgent9(r1,r2,r3,r4,r5,r6,r7,r8); } catch(e) { console.error('Agent 9 failed:',e.message); r9=fb(9); }
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 8: Project Plan (3 sub-calls) ──────────────────
    setProgress(66, phaseShouldRun(8)?'Phase 8 — Project Plan (3 focused sub-agents)…':'Phase 8 — skipped');
    if (phaseShouldRun(8)) {
      try { await runAgent10(r3,r4,r5,r7,r9); } catch(e) { console.error('Agent 10 failed:',e.message); }
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 9: Supplemental Analysis (parallel) ───────────
    if (phaseShouldRun(9)) {
      setProgress(72,'Phase 9 — Market Map · Grants · Competitor Deep-Dive · Build vs Buy (parallel)…');
      const [res11,res12,res13,res16] = await Promise.allSettled([
        runAgent11(r1,r2,r4),
        runAgent12(r3,r5),
        runAgent13(r6),
        (typeof runAgent16==='function' ? runAgent16(r3,r4,r7,r8) : Promise.resolve()),
      ]);
      if(res11.status==='rejected') console.error('Agent 11 failed:',res11.reason?.message);
      if(res12.status==='rejected') console.error('Agent 12 failed:',res12.reason?.message);
      if(res13.status==='rejected') console.error('Agent 13 failed:',res13.reason?.message);
      if(res16.status==='rejected') console.error('Agent 16 failed:',res16.reason?.message);
      // Apply fallbacks for any phase 9 agent that failed and has no data
      if(!R.a11) try{R.a11=getFallback11();}catch(e){}
      if(!R.a12) try{R.a12=getFallback12();}catch(e){}
      if(!R.a13) try{R.a13=getFallback13();}catch(e){}
    } else {
      setProgress(72,'Phase 9 — skipped');
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 10: Marketing Strategy ────────────────────────
    // (Agent 10 = project plan, marketing is embedded — no separate agent yet)

    // ── Phase 11: Meta Agents ────────────────────────────────
    if (phaseShouldRun(11)) {
      setProgress(86,'Phase 11 — Code Review · QA Testing…');
      try { await runAgent14(R); } catch(e) { console.error('Agent 14 failed:',e.message); }
      if(stopRequested){showErr('Pipeline stopped by user.');return;}
      try { await runAgent15(R); } catch(e) { console.error('Agent 15 failed:',e.message); }
    } else {
      setProgress(86,'Phase 11 — skipped');
    }
    if(stopRequested){showErr('Pipeline stopped by user.');return;}

    // ── Phase 12: Sources & Citations ────────────────────────
    if (phaseShouldRun(12)) {
      setProgress(94,'Phase 12 — Sources & Citations…');
      try {
        if(typeof runAgent17==='function') await runAgent17(R);
      } catch(e) { console.error('Agent 17 failed:',e.message); }
    } else {
      setProgress(94,'Phase 12 — skipped');
    }

    setProgress(100,'Complete — all agents finished');
    $('orchStatus').textContent='done';
  } catch(e) {
    $('orchStatus').textContent='error';
    showErr('Pipeline error: '+e.message+'\n\nTip: Make sure your API key is correct and has credits.');
    setProgress(0,'Pipeline failed — see error above');
  } finally {
    running=false;
    $('runBtn').disabled=false;
    $('resetBtn').style.display='';
    $('stopBtn').style.display='none';
    $('stopBtn').disabled=false;
    $('stopBtn').textContent='⬛ Stop';
  }
}

async function reRunAgent(n) {
  if(running) return;
  const btn=$('rerun-'+n);
  if(btn) btn.style.display='none';
  running=true;
  try {
    const s = k => JSON.stringify(R['a'+k]||{});
    if(n===1)      { const r=await runAgent1();  R.a1=JSON.parse(r||'{}'); }
    else if(n===2) { await runAgent2(s(1),s(5),s(6)); }
    else if(n===3) { await runAgent3(s(1),s(2),s(5)); }
    else if(n===4) { await runAgent4(s(3),s(5)); }
    else if(n===5) { await runAgent5(); }
    else if(n===6) { await runAgent6(); }
    else if(n===7) { await runAgent7(s(3),s(4),s(5)); }
    else if(n===8) { await runAgent8(s(1),s(2),s(3),s(4),s(5),s(6),s(7)); }
    else if(n===9) { await runAgent9(s(1),s(2),s(3),s(4),s(5),s(6),s(7),s(8)); }
    else if(n===10){ await runAgent10(s(3),s(4),s(5),s(7),s(9)); }
    else if(n===11){ await runAgent11(s(1),s(2),s(4)); }
    else if(n===12){ await runAgent12(s(3),s(5)); }
    else if(n===13){ await runAgent13(s(6)); }
    else if(n===14){ await runAgent14(R); }
    else if(n===15){ await runAgent15(R); }
    else if(n===16){ await runAgent16(s(3),s(4),s(7),s(8)); }
    else if(n===17){ await runAgent17(R); }
  } catch(e) {
    console.error('Re-run agent '+n+' failed:',e.message);
  } finally {
    running=false;
  }
}

function exportResults() {
  if(!Object.keys(R).length) { showErr('No results to export yet — run the pipeline first.'); return; }
  const blob = new Blob([JSON.stringify(R, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pipeline-results-${zip()}-${Date.now()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function printReport() {
  if(!Object.keys(R).length) { showErr('No results to print yet — run the pipeline first.'); return; }
  const w = window.open('', '_blank');
  const sections = [];
  if(R.a8) sections.push(`<h2>Executive Summary</h2><p><strong>${R.a8.verdict||''}</strong> — ${R.a8.verdict_rationale||''}</p><p>${R.a8.assessment||''}</p>`);
  if(R.a1) sections.push(`<h2>Demographics</h2><p>${R.a1.summary||''}</p>`);
  if(R.a2) sections.push(`<h2>Gap Analysis</h2><p>${R.a2.summary||''}</p>`);
  if(R.a3) sections.push(`<h2>Top Locations</h2>${(R.a3.locations||[]).slice(0,3).map(l=>`<p><strong>${l.city}</strong> (#${l.rank}, score ${l.overall_score}): ${l.submarket||''}</p>`).join('')}`);
  if(R.a7) sections.push(`<h2>Financial Summary</h2><p>${R.a7.summary||''}</p>`);
  if(R.a9) { const es=(R.a9.executive_summary||{}); sections.push(`<h2>Business Plan</h2><p>${es.concept||''}</p><p>${es.opportunity||''}</p>`); }
  if(R.a8 && R.a8.next_steps) sections.push(`<h2>Next Steps</h2><ol>${(R.a8.next_steps||[]).map(s=>`<li>${s}</li>`).join('')}</ol>`);
  const p = R.userProfile || {};
  const profileHtml = (p.name||p.owner) ? `<div style="background:#f5f5f5;border-radius:8px;padding:14px 18px;margin-bottom:24px">
    ${p.name?`<div style="font-size:20px;font-weight:700;margin-bottom:8px">${p.name}</div>`:''}
    <div style="display:flex;flex-wrap:wrap;gap:20px;font-size:13px">
      ${p.owner?`<span><strong>Founder:</strong> ${p.owner}</span>`:''}
      ${p.location?`<span><strong>Location:</strong> ${p.location}</span>`:''}
      ${p.opening?`<span><strong>Target Open:</strong> ${new Date(p.opening+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>`:''}
      ${p.equity?`<span><strong>Equity:</strong> $${parseInt(p.equity).toLocaleString()}</span>`:''}
      ${p.email?`<span><strong>Contact:</strong> ${p.email}</span>`:''}
    </div>
    ${p.notes?`<div style="margin-top:10px;font-size:13px;color:#555;font-style:italic">${p.notes}</div>`:''}
  </div>` : '';
  w.document.write(`<!DOCTYPE html><html><head><title>Pipeline Report — ZIP ${zip()}</title><style>body{font-family:sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#222}h1{border-bottom:2px solid #333;padding-bottom:8px}h2{margin-top:2rem;color:#444;border-bottom:1px solid #ddd;padding-bottom:4px}p{line-height:1.7;margin:8px 0}ol{line-height:1.8}@media print{body{margin:0}}</style></head><body><h1>Business Planning Report — ZIP ${zip()}</h1><p style="color:#888;font-size:13px">Generated ${new Date().toLocaleString()} · ${Object.keys(R).length} agents completed</p>${profileHtml}${sections.join('')}</body></html>`);
  w.document.close();
  w.print();
}

// ── Profile / Personalize Report ─────────────────────────────

function toggleProfileForm() {
  const f = $('profileForm');
  if (!f) return;
  const open = f.style.display === 'block';
  f.style.display = open ? 'none' : 'block';
  const btn = $('profileFormToggle');
  if (btn) btn.textContent = open ? '✏️ Personalize Report' : '✕ Close';
}

function applyProfile() {
  const get = id => $(id) ? $(id).value.trim() : '';
  const p = {
    name:     get('pf-name'),
    owner:    get('pf-owner'),
    opening:  get('pf-opening'),
    location: get('pf-location'),
    equity:   get('pf-equity'),
    email:    get('pf-email'),
    notes:    get('pf-notes')
  };
  R.userProfile = p;
  try { localStorage.setItem('dh_profile', JSON.stringify(p)); } catch(e) {}

  const el = $('profileHeader');
  if (!el) return;
  if (!p.name && !p.owner && !p.opening && !p.location && !p.equity) {
    el.style.display = 'none';
    return;
  }

  const items = [];
  if (p.owner)    items.push({l:'Founder', v: p.owner});
  if (p.location) items.push({l:'Location', v: p.location});
  if (p.opening)  items.push({l:'Target Open', v: new Date(p.opening+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'})});
  if (p.equity)   items.push({l:'Equity', v: '$'+parseInt(p.equity).toLocaleString()});
  if (p.email)    items.push({l:'Contact', v: p.email});

  el.innerHTML = `<div class="ph-wrap">
    ${p.name ? `<div class="ph-business">${p.name}</div>` : ''}
    <div class="ph-row">${items.map(i=>`<div class="ph-item"><span class="ph-label">${i.l}</span><span class="ph-val">${i.v}</span></div>`).join('')}</div>
    ${p.notes ? `<div class="ph-notes">${p.notes}</div>` : ''}
  </div>`;
  el.style.display = 'block';

  const saved = $('pf-saved');
  if (saved) { saved.style.display='inline'; setTimeout(()=>{ saved.style.display='none'; }, 2500); }
}

function clearProfile() {
  ['pf-name','pf-owner','pf-opening','pf-location','pf-equity','pf-email','pf-notes'].forEach(id=>{
    const el=$(id); if(el) el.value='';
  });
  try { localStorage.removeItem('dh_profile'); } catch(e) {}
  R.userProfile = null;
  const h=$('profileHeader'); if(h) h.style.display='none';
}

function loadSavedProfile() {
  try {
    const saved = localStorage.getItem('dh_profile');
    if (!saved) return;
    const p = JSON.parse(saved);
    if ($('pf-name'))    $('pf-name').value    = p.name    || '';
    if ($('pf-owner'))   $('pf-owner').value   = p.owner   || '';
    if ($('pf-opening')) $('pf-opening').value = p.opening || '';
    if ($('pf-equity'))  $('pf-equity').value  = p.equity  || '';
    if ($('pf-email'))   $('pf-email').value   = p.email   || '';
    if ($('pf-notes'))   $('pf-notes').value   = p.notes   || '';
    R.userProfile = p;
    if (p.name || p.owner) applyProfile();
  } catch(e) {}
}

function populateLocationDropdown() {
  const sel = $('pf-location');
  if (!sel) return;
  const locs = (R.a3 && R.a3.locations) ? R.a3.locations : [];
  if (!locs.length) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Select a location —</option>' +
    locs.map(l => {
      const label = l.address || l.city || l.submarket || 'Location';
      const score = l.overall_score || l.score || '';
      return `<option value="${label}"${current===label?' selected':''}>${label}${score?' · Score '+score:''}</option>`;
    }).join('');
}

function resetAll() {
  ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17'].forEach(id=>{
    const dot=$('dot-'+id), card=$('card-'+id), out=$('out-'+id);
    if(dot) dot.className='agent-dot';
    if(card) card.className='agent-card';
    if(out) out.className='agent-out';
  });
  // Clear rendered HTML in all output panels
  const clearIds=['1-s-t','1-h-c','1-t-c','2-s-t','2-h-c','2-r-c','3-s-t','3-r-c','3-t-c',
    '4-s-t','4-l-c','4-t-c','5-s-t','5-t-c','6-s-t','6-t-c','7-s-t','7-sc-c','7-t-c',
    '8-s-t','9-ov-c','9-mkt-c','9-fin-c','9-ops-c','9-sba-c','9-inv-c',
    '10-gantt-c','10-mile-c','10-budget-c','10-risk-c','10-team-c','10-check-c',
    '11-map-c','11-leg-c','11-dir-c','12-sum-t','12-caps-c','12-usda-c','12-local-c','12-tbl-c',
    '13-sum-t','13-comp-c','13-pain-c','13-diff-c','13-msg-c',
    '14-sum-t','14-issues-c','14-perf-c','14-cost-c','14-fixes-c',
    '15-sum-t','15-tests-c','15-data-c','15-ux-c','15-score-c',
    '16-sum-c','16-list-c','16-comp-c','16-matrix-c','16-steps-c',
    '17-sum-c','17-sources-c','17-claims-c','17-unsourced-c'];
  clearIds.forEach(id=>{const el=$(id);if(el)el.innerHTML='';});
  Object.keys(charts).forEach(k=>{try{charts[k].destroy()}catch{}});
  charts={};
  const fb=$('finalBox'); if(fb) fb.className='final-box';
  const ph=$('profileHeader'); if(ph){ph.innerHTML='';ph.style.display='none';}
  const pf=$('profileForm'); if(pf) pf.style.display='none';
  const pfill=$('progressFill'); if(pfill) pfill.style.width='0%';
  const ptxt=$('progressText'); if(ptxt) ptxt.textContent='Enter your API key and click Run';
  const os=$('orchStatus'); if(os) os.textContent='idle';
  const rb=$('resetBtn'); if(rb) rb.style.display='none';
  hideErr();
  // Empty R in-place so other modules that hold a reference see the cleared object
  Object.keys(R).forEach(k => { delete R[k]; });
}

