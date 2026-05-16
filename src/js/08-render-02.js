async function runAgent5() {
  setDot(5,'running');
  const ind=industry();

  if (demoMode && typeof getDemoData === 'function') {
    const _d = getDemoData(5);
    if (_d) { R.a5 = _d; }
  }

  // ── Real regulatory + environmental data ─────────────────
  const _rdCtx5 = typeof buildRealDataCtx === 'function'
    ? buildRealDataCtx(['regulations','flood','crime','energy_rates'])
    : '';

  // ── Part A: Requirements metadata + timeline ────────────────
  $('5-s-t').textContent = 'Researching licensing requirements…';
  const sysA=`You are a regulatory compliance expert for small businesses in the US. Research current licensing, zoning, and permit requirements for opening a ${ind.unit}. Respond JSON only.`;
  const usrA=(_rdCtx5 ? _rdCtx5 + '\nUse the CFR regulation dates above as authoritative; do NOT estimate what year a regulation was last updated.\n\n' : '') +
  `Search for ALL federal, state, and local requirements to open a ${ind.unit} near ZIP ${zip()}.

Regulatory authority: ${ind.regulatory}
Key compliance areas: ${ind.compliance}

Return ONLY this JSON (no apply_instructions yet — those come separately):
{
  "summary": "4-sentence overview of main regulatory requirements mentioning key agencies by name",
  "state_portal_url": "https://[actual state licensing portal URL]",
  "sba_permits_url": "https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits",
  "total_timeline_months": 14,
  "requirements": [
    {
      "category": "Business Formation|Tax|Licensing|Zoning|Building|Fire|Insurance|Staffing",
      "item": "Requirement name",
      "detail": "1-2 sentence detail",
      "timeline_weeks": 2,
      "cost_usd": 100,
      "source": "Agency short name",
      "priority": "Critical|High|Medium",
      "agency_name": "Full official agency name",
      "apply_url": "https://actual-portal-url",
      "form_name": "Form name/number or null",
      "apply_phone": "Phone number or null",
      "apply_email": "Email or null",
      "online_available": true
    }
  ],
  "timeline_phases": [
    {"phase": "Phase name", "weeks": 4, "tasks": "Brief task list"}
  ]
}
Include 8-10 requirements covering: LLC formation, EIN, state ${ind.unit} license, zoning/CUP, building permit, fire inspection, certificate of occupancy, insurance, background checks.
Use REAL URLs, agency names, and phone numbers for ZIP ${zip()}.`;

  // ── Part B (called after Part A renders) ───────────────────
  async function _runAgent5PartB(reqs) {
    const sysB = `You are a regulatory compliance expert. Respond JSON only.`;
    const reqList = reqs.map(r => `${r.category}: ${r.item}`).join('\n');
    const usrB = `For each requirement below for opening a ${ind.unit} near ZIP ${zip()}, provide apply_instructions and apply_notes.

Requirements:
${reqList}

Return ONLY this JSON:
{
  "instructions": [
    {
      "item": "Exact requirement name",
      "apply_instructions": ["1. Step one", "2. Step two", "3. Step three", "4. Step four", "5. Step five"],
      "apply_notes": "Critical caveat or null"
    }
  ]
}
For each item provide 4-6 numbered steps with SPECIFIC actions (not generic). Include actual form names, website paths, and timing caveats.`;
    try {
      const partB = await claudeJSON(sysB, usrB, {webSearch:true});
      if (partB && Array.isArray(partB.instructions)) {
        partB.instructions.forEach(inst => {
          const req = reqs.find(r => r.item === inst.item ||
            r.item.toLowerCase().includes((inst.item||'').toLowerCase().split(' ')[0]));
          if (req) {
            if (inst.apply_instructions) req.apply_instructions = inst.apply_instructions;
            if (inst.apply_notes) req.apply_notes = inst.apply_notes;
          }
        });
        // Re-render How to Apply tab
        const applyContainer = $('5-a-c');
        if (applyContainer) _renderAgent5ApplyCards(R.a5, applyContainer);
      }
    } catch(e2) { console.warn('Agent 5 Part B failed:', e2.message); }
  }

  try {
    let d = !demoMode ? await claudeJSON(sysA, usrA, {webSearch:true}) : (R.a5 || null);
    if(!d) { console.warn('Agent 5 fallback'); d=getFallback5(); }
    R.a5=d;

    // ── Summary tab ────────────────────────────────────────
    let sumText = d.summary || '';
    const portalLinks = [
      d.state_portal_url  ? `State licensing portal: ${d.state_portal_url}` : '',
      d.decal_url         ? `Apply / info: ${d.decal_url}` : '',
      d.sba_permits_url   ? `SBA permits guide: ${d.sba_permits_url}` : ''
    ].filter(Boolean);
    if (portalLinks.length) sumText += '\n\n🔗 Key portals:\n' + portalLinks.join('\n');
    $('5-s-t').textContent = sumText;

    // ── Requirements table ────────────────────────────────
    let tbl = `<table class="tbl"><thead><tr><th>Category</th><th>Requirement</th><th>Detail</th><th>Timeline</th><th>Cost</th><th>Agency</th><th>Priority</th><th>Apply</th></tr></thead><tbody>`;
    (d.requirements||[]).forEach(r => {
      const pb = r.priority==='Critical'?'b-red':r.priority==='High'?'b-amber':'b-blue';
      const hasUrl = r.apply_url && r.apply_url !== 'N/A' && r.apply_url.startsWith('http');
      const applyBtn = hasUrl
        ? `<a href="${r.apply_url}" target="_blank" class="link-btn primary-btn" style="font-size:11px;white-space:nowrap">↗ Apply</a>`
        : `<span style="font-size:10px;color:var(--faint)">See How to Apply tab</span>`;
      const costDisplay = r.cost_usd === null || r.cost_usd === undefined
        ? 'N/A'
        : r.cost_usd === 0 ? 'Free'
        : '$' + r.cost_usd.toLocaleString();
      tbl += `<tr>
        <td><span class="badge b-blue">${_nv(r.category)}</span></td>
        <td><strong>${_nv(r.item)}</strong></td>
        <td style="font-size:11px;color:var(--muted)">${_nv(r.detail,'','—')}</td>
        <td>${_nv(r.timeline_weeks, v=>v>0?v+' wks':'—', '—')}</td>
        <td>${costDisplay}</td>
        <td style="font-size:10px;color:var(--faint)">${_nv(r.agency_name||r.source,'','—')}</td>
        <td>${r.priority?`<span class="badge ${pb}">${r.priority}</span>`:'—'}</td>
        <td>${applyBtn}</td>
      </tr>`;
    });
    tbl += `</tbody></table>`;
    $('5-t-c').innerHTML = tbl;

    // ── How to Apply cards ────────────────────────────────
    const applyContainer = $('5-a-c');
    if (applyContainer) _renderAgent5ApplyCards(d, applyContainer);

    // ── Timeline chart ────────────────────────────────────
    killChart('ch-5');
    const ctx5=$('ch-5').getContext('2d');
    charts['ch-5']=new Chart(ctx5,{type:'bar',data:{
      labels:(d.timeline_phases||[]).map(p=>p.phase),
      datasets:[{label:'Weeks',data:(d.timeline_phases||[]).map(p=>p.weeks),backgroundColor:['rgba(74,158,255,0.7)','rgba(61,214,140,0.7)','rgba(245,166,35,0.7)','rgba(167,139,250,0.7)','rgba(45,212,191,0.7)','rgba(255,95,95,0.7)','rgba(74,158,255,0.5)'],borderWidth:0,borderRadius:4}]
    },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw} weeks — ${(d.timeline_phases||[])[c.dataIndex]?.tasks||''}`}}},scales:{x:{ticks:{color:'#8a8d96'},grid:{color:'#2a2d35'}},y:{ticks:{color:'#8a8d96',font:{size:10}},grid:{color:'#2a2d35'}}}}});

    setDot(5,'done'); showOut(5);

    // Part B: enrich with apply_instructions (non-blocking, post-render)
    if (!demoMode && d.requirements && d.requirements.length) {
      _runAgent5PartB(d.requirements).catch(e => console.warn('Agent 5 Part B err:', e.message));
    }

    return JSON.stringify(d);
  } catch(e){setDot(5,'error');showOut(5);$('5-s-t').textContent='Error: '+e.message;throw e}
}

function _renderAgent5ApplyCards(d, applyContainer) {
  let applyHtml = `<div style="padding:14px;display:flex;flex-direction:column;gap:14px">`;
  (d.requirements||[]).forEach((r) => {
    const pb = r.priority==='Critical'?'b-red':r.priority==='High'?'b-amber':'b-blue';
    const onlineBadge = r.online_available
      ? `<span class="badge b-green" style="font-size:10px">🌐 Online</span>`
      : `<span class="badge b-amber" style="font-size:10px">📄 In-Person / Paper</span>`;
    const stepsHtml = (r.apply_instructions||[]).map(step =>
      `<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:6px">
        <span style="background:var(--blue-dim);color:var(--blue);border-radius:50%;width:22px;height:22px;min-width:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:'Syne',sans-serif">${step.match(/^\d+/)?step.match(/^\d+/)[0]:'•'}</span>
        <span style="font-size:12px;line-height:1.65;color:var(--text)">${step.replace(/^\d+\.\s*/,'')}</span>
      </div>`
    ).join('');
    const loadingSteps = r.apply_instructions ? '' :
      `<div style="font-size:11px;color:var(--faint);padding:8px 0;font-style:italic">⏳ Loading step-by-step instructions…</div>`;
    const phoneOk = r.apply_phone && r.apply_phone !== 'N/A' && r.apply_phone !== 'null';
    const emailOk = r.apply_email && r.apply_email !== 'N/A' && r.apply_email !== 'null';
    const contactRow = [
      phoneOk ? `📞 ${r.apply_phone}` : '',
      emailOk ? `✉ <a href="mailto:${r.apply_email}" style="color:var(--blue)">${r.apply_email}</a>` : ''
    ].filter(Boolean).join(' &nbsp;·&nbsp; ');

    applyHtml += `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="badge ${pb}">${r.category}</span>
          ${onlineBadge}
          <strong style="font-size:13px;font-family:'Syne',sans-serif;flex:1;min-width:140px">${r.item}</strong>
          <span style="font-size:11px;color:var(--faint)">${r.timeline_weeks>0?r.timeline_weeks+' wks':''} ${r.cost_usd>0?'· $'+r.cost_usd.toLocaleString():'· Free'}</span>
        </div>
        <div style="padding:12px 14px;display:flex;flex-direction:column;gap:10px">
          <div style="font-size:11px;color:var(--muted)">🏛 <strong>${r.agency_name||r.source||''}</strong></div>
          ${r.form_name ? `<div style="font-size:11px;color:var(--faint)">📋 Form: ${r.form_name}</div>` : ''}
          ${contactRow ? `<div style="font-size:11px;color:var(--muted)">${contactRow}</div>` : ''}
          ${stepsHtml ? `<div style="margin-top:4px">${stepsHtml}</div>` : loadingSteps}
          ${r.apply_notes ? `<div style="padding:8px 10px;background:var(--surface3);border-left:3px solid var(--amber);border-radius:0 6px 6px 0;font-size:11px;color:var(--amber);line-height:1.6">⚠ ${r.apply_notes}</div>` : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
            ${r.apply_url && r.apply_url !== 'N/A' && r.apply_url.startsWith('http')
              ? `<a href="${r.apply_url}" target="_blank" class="link-btn primary-btn" style="font-size:12px">↗ Go to Application Portal</a>`
              : `<span style="font-size:11px;color:var(--faint)">Application portal URL not available — contact agency directly</span>`}
          </div>
        </div>
      </div>`;
  });
  applyHtml += `</div>`;
  applyContainer.innerHTML = applyHtml;
}

// ══════════════════════════════════════════════════════════
// AGENT 6 — Competitor Analysis (Live Search)
// ══════════════════════════════════════════════════════════
