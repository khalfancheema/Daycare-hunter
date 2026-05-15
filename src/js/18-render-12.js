async function runAgent12(a3,a5) {
  setDot(12,'running');
  const ind=industry();

  if (demoMode && typeof getDemoData === 'function') {
    const _d = getDemoData(12);
    if (_d) { R.a12 = _d; try { buildGrants(_d); } catch(e){} setDot(12,'done'); showOut(12); return JSON.stringify(_d); }
  }

  // ── Real grants data from Grants.gov + SAM.gov ──────────
  const _rdCtx12 = typeof buildRealDataCtx === 'function'
    ? buildRealDataCtx(['grants_gov','federal_opps','sba','demographics'])
    : '';

  // ── Part A: Overview + grants summary table ───────────────
  const sysA=`You are a grant research specialist for ${ind.unit} businesses. Search for real, current grant and subsidy programs. Respond JSON only.`;
  const usrA=(_rdCtx12 ? _rdCtx12 + '\nThe VERIFIED grants above are REAL opportunities from Grants.gov — include them in your table with their exact titles, agencies, amounts, and deadlines.\n\n' : '') +
  `Search for all available grants, subsidies, and funding incentives for opening a ${ind.unit} near ZIP ${zip()}. Regulatory body: ${ind.regulatory}. Search for: SBA programs, USDA Rural Development, local county business incentives, industry subsidies (${ind.grants}), and federal small business grants.

Return ONLY:
{
  "summary": "5-sentence summary of funding landscape citing specific programs and amounts",
  "total_potential_funding": 0,
  "all_grants_table": [
    {
      "program": "Program name", "type": "Ongoing Revenue|One-Time Grant|Tax Credit|Tax Savings|Loan",
      "amount_est": "$X,000/yr or range", "deadline": "Rolling|After licensing|Date",
      "probability": "High|Medium-High|Medium|Low", "action_required": "Specific next action"
    }
  ]
}
Include 8-12 real programs for ZIP ${zip()} state: state industry subsidy, state pre-k/quality program, CACFP meals, USDA Rural Dev grant, SBA microloan, state job tax credit, county development authority incentives, local DDA grants, federal stabilization grants. Use real program names and dollar amounts.`;

  // ── Part B: Program details (non-blocking post-render) ────
  async function _runAgent12PartB(data) {
    const progList = (data.all_grants_table||[]).map(g=>g.program).slice(0,10).join('\n');
    const sysB=`You are a grant research specialist. Respond JSON only.`;
    const usrB=`For a ${ind.unit} near ZIP ${zip()}, provide detailed info for these programs:

${progList}

Return ONLY:
{
  "industry_subsidy": {
    "program_name": "Name", "administered_by": "Agency", "website": "https://...", "phone": "XXX-XXX-XXXX",
    "what_it_is": "2-sentence description", "benefit_to_provider": "Key benefit",
    "revenue_impact": "Revenue impact estimate",
    "current_rates": [{"age_group": "Group", "daily_rate": 0, "monthly_est": 0, "notes": "Note"}],
    "eligibility_for_provider": "Requirements", "how_to_apply": "Process"
  },
  "state_program": {
    "program_name": "Name", "administered_by": "Agency", "website": "https://...", "phone": "XXX",
    "what_it_is": "Description", "annual_revenue_per_class": 0, "class_size": 0,
    "eligibility": "Requirements", "website_apply": "https://...", "notes": "Important note"
  },
  "federal_grants": [
    {
      "name": "Grant name", "agency": "Agency", "website": "https://...", "phone": "XXX-XXX-XXXX",
      "amount_available": "$X,000 range", "direct_apply": true, "apply_url": "https://...", "notes": "Notes"
    }
  ],
  "local_incentives": [
    {
      "name": "Program name", "contact": "Org name", "phone": "XXX-XXX-XXXX",
      "website": "https://...", "incentives": ["Incentive 1", "Incentive 2"], "notes": "Notes"
    }
  ],
  "quality_rated_benefits": {
    "program": "Quality rating program name", "website": "https://...",
    "benefits_by_star": [{"stars": 1, "benefits": "Benefits", "additional_per_child": 0}],
    "recommendation": "Target X-star at opening"
  }
}
Use REAL URLs, phone numbers, and dollar amounts for ZIP ${zip()} state.`;
    try {
      const partB = await claudeJSON(sysB, usrB);
      if (!partB) return;
      if (partB.industry_subsidy) data.caps_program = partB.industry_subsidy;
      if (partB.state_program) data.georgia_pre_k = partB.state_program;
      if (partB.federal_grants) data.federal_grants = partB.federal_grants;
      if (partB.local_incentives) { data.local_incentives = partB.local_incentives; data.barrow_county_incentives = partB.local_incentives; }
      if (partB.quality_rated_benefits) data.quality_rated_benefits = partB.quality_rated_benefits;
      buildGrants(data);
    } catch(e2) { console.warn('Agent 12 Part B failed:', e2.message); }
  }

  try {
    // webSearch=true: Claude uses live search to verify grant program details
    let d = await claudeJSON(sysA, usrA, {webSearch:true});
    if(!d) { console.warn('Agent 12 fallback'); d=getFallback12(); }
    R.a12 = d;
    buildGrants(d);
    setDot(12,'done'); showOut(12);
    // Part B: enrich with program details (non-blocking)
    if (!demoMode) {
      _runAgent12PartB(d).catch(e=>console.warn('Agent 12 Part B err:', e.message));
    }
    return JSON.stringify(d);
  } catch(e){setDot(12,'error');showOut(12);$('12-sum-t').textContent='Error: '+e.message;throw e}
}

function buildGrantCard(g) {
  return `<div class="grant-card">
    <div class="grant-card-top"><div><div class="grant-name">${g.name||g.program_name||''}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${g.agency||g.contact||''}</div></div>
    <div class="grant-amount" style="font-size:15px">${g.amount_available||g.amount||''}</div></div>
    <div class="grant-meta">${g.direct_apply!==undefined?`<span class="badge ${g.direct_apply?'b-green':'b-blue'}">${g.direct_apply?'Direct Apply':'Indirect'}</span>`:''}</div>
    ${Array.isArray(g.incentives)&&g.incentives.length?`<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">${g.incentives.map(i=>`<div style="display:flex;gap:8px;font-size:12px;color:var(--muted)"><span style="color:var(--green);flex-shrink:0">✓</span>${i}</div>`).join('')}</div>`:''}
    <div class="grant-body">${g.notes||g.what_it_is||''}</div>
    <div class="grant-actions">
      ${g.website?`<a href="${g.website}" target="_blank" class="link-btn primary-btn">↗ Info</a>`:''}
      ${g.apply_url?`<a href="${g.apply_url}" target="_blank" class="link-btn">↗ Apply</a>`:''}
      ${g.phone?`<span style="padding:5px 10px;font-size:11px;color:var(--muted)">${g.phone}</span>`:''}
    </div>
  </div>`;
}

function buildGrants(d) {
  const total = d.total_potential_funding||0;
  $('12-sum-t').textContent=d.summary+(total?`\n\nTotal potential funding (Year 1): $${total.toLocaleString()} across grants + ongoing programs.`:'');

  // Industry subsidy tab — supports both daycare CAPS structure and generic subsidy lists
  let ch='';
  if(d.caps_program) {
    const caps=d.caps_program;
    ch+=`<div class="bp-section"><h3>${caps.program_name||'Industry Subsidy Program'}</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        ${caps.website?`<a href="${caps.website}" target="_blank" class="link-btn primary-btn">↗ Portal</a>`:''}
        ${caps.phone?`<span style="padding:6px 12px;background:var(--surface2);border-radius:6px;font-size:12px;color:var(--muted)">${caps.phone}</span>`:''}
      </div>
      <div class="bp-prose" style="margin-bottom:10px">${caps.what_it_is||''}</div>
      ${caps.revenue_impact?`<div style="padding:10px 14px;background:var(--green-dim);border:1px solid var(--green);border-radius:8px;margin-bottom:12px;font-size:12px;color:var(--muted)"><strong style="color:var(--green)">Revenue Impact: </strong>${caps.revenue_impact}</div>`:''}`;
    const rateTable=(rates,title)=>{
      if(!rates||!rates.length) return '';
      return `<h4>${title}</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tier</th><th>Daily Rate</th><th>Monthly Est.</th><th>Notes</th></tr></thead><tbody>`
        +rates.map(r=>`<tr><td>${r.age_group||r.tier||''}</td><td style="color:var(--green)">$${r.daily_rate}/day</td><td style="color:var(--green)">~$${r.monthly_est}/mo</td><td style="font-size:11px;color:var(--faint)">${r.notes||''}</td></tr>`).join('')
        +`</tbody></table></div>`;
    };
    if(caps.current_rates_gwinnett) ch+=rateTable(caps.current_rates_gwinnett,'Primary Market Rates');
    if(caps.current_rates_barrow) ch+=rateTable(caps.current_rates_barrow,'Secondary Market Rates');
    if(caps.current_rates) ch+=rateTable(caps.current_rates,'Subsidy Rates');
    ch+=`</div>`;
    if(d.georgia_pre_k) {
      const prek=d.georgia_pre_k;
      ch+=`<div class="bp-section"><h3>${prek.program_name||'State Program'}</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          ${prek.website?`<a href="${prek.website}" target="_blank" class="link-btn primary-btn">↗ Info</a>`:''}
          ${prek.website_apply?`<a href="${prek.website_apply}" target="_blank" class="link-btn">↗ Apply</a>`:''}
        </div>
        ${prek.annual_revenue_per_class?`<div class="bp-grid"><div class="bp-stat"><div class="bp-stat-label">Annual Revenue</div><div class="bp-stat-val">$${prek.annual_revenue_per_class.toLocaleString()}</div><div class="bp-stat-sub">Guaranteed state payment</div></div>${prek.class_size?`<div class="bp-stat"><div class="bp-stat-label">Class Size</div><div class="bp-stat-val">${prek.class_size}</div></div>`:''}</div>`:''}
        <div class="bp-prose">${prek.what_it_is||''}</div>
        ${prek.notes?`<div style="margin-top:8px;padding:8px 12px;background:var(--amber-dim);border:1px solid var(--amber);border-radius:8px;font-size:12px;color:var(--amber)">⚡ ${prek.notes}</div>`:''}
      </div>`;
    }
  } else if(d.industry_subsidies) {
    (d.industry_subsidies||[]).forEach(g=>{ch+=buildGrantCard(g);});
  } else if(d.state_grants) {
    (d.state_grants||[]).forEach(g=>{ch+=buildGrantCard(g);});
  } else {
    ch=`<div style="font-size:13px;color:var(--muted);padding:16px">⏳ Loading program details… (run pipeline for full data)</div>`;
  }
  $('12-caps-c').innerHTML=ch;

  // Federal/USDA tab
  const fedGrants=d.federal_grants||d.grants||[];
  let fh=`<div class="bp-section"><h3>Federal &amp; SBA Grant Programs</h3>`;
  fedGrants.forEach(g=>{fh+=buildGrantCard(g);});
  if(!fedGrants.length) fh+=`<div style="font-size:13px;color:var(--muted)">No federal grants data available.</div>`;
  fh+=`</div>`;
  $('12-usda-c').innerHTML=fh;

  // Local incentives tab
  const localIncentives=d.local_incentives||d.barrow_county_incentives||d.county_incentives||[];
  let lh=`<div class="bp-section"><h3>Local &amp; County Incentives</h3>`;
  localIncentives.forEach(g=>{lh+=buildGrantCard(g);});
  if(!localIncentives.length) lh+=`<div style="font-size:13px;color:var(--muted)">No local incentive data available.</div>`;
  const qr=d.quality_rated_benefits;
  if(qr) {
    lh+=`<h3 style="margin-top:16px">${qr.program}</h3>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Level</th><th>Key Benefits</th><th>Extra Per Unit/Day</th></tr></thead><tbody>`;
    (qr.benefits_by_star||[]).forEach(s=>{lh+=`<tr><td>${'★'.repeat(Math.max(0,parseInt(s.stars)||0))}</td><td style="font-size:12px">${s.benefits}</td><td style="color:var(--green)">+$${s.additional_per_child}/day</td></tr>`;});
    lh+=`</tbody></table></div>${qr.website?`<div style="margin-top:8px"><a href="${qr.website}" target="_blank" class="link-btn primary-btn">↗ Program Portal</a></div>`:''}`;
  }
  lh+=`</div>`;
  $('12-local-c').innerHTML=lh;

  // Full table
  let tbl=`<div style="margin-bottom:10px;padding:10px 14px;background:var(--green-dim);border:1px solid var(--green);border-radius:8px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:13px;font-weight:700;font-family:'Syne',sans-serif">Total Potential Funding (Year 1)</div>
    <div style="font-size:22px;font-weight:700;font-family:'Syne',sans-serif;color:var(--green)">$${total.toLocaleString()}</div>
  </div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Program</th><th>Type</th><th>Estimated Amount</th><th>Deadline</th><th>Probability</th><th>Next Action</th></tr></thead><tbody>`;
  (d.all_grants_table||d.grants_table||[]).forEach(g=>{
    const pb=(g.probability||'').startsWith('High')?'b-green':(g.probability||'').startsWith('Medium')?'b-amber':'b-red';
    const tb=(g.type||'').includes('Revenue')||(g.type||'').includes('Grant')?'b-green':(g.type||'').includes('Tax')?'b-amber':'b-blue';
    tbl+=`<tr><td><strong>${g.program||g.name||''}</strong></td><td><span class="badge ${tb}">${g.type||''}</span></td><td style="color:var(--green);font-weight:600">${g.amount_est||g.amount_range||g.amount||''}</td><td style="font-size:11px;color:var(--muted)">${g.deadline||''}</td><td><span class="badge ${pb}">${g.probability||''}</span></td><td style="font-size:11px;color:var(--muted)">${g.action_required||g.notes||''}</td></tr>`;
  });
  tbl+=`</tbody></table></div>`;
  $('12-tbl-c').innerHTML=tbl;
}

// ══════════════════════════════════════════════════════════
// COMPETITOR DEEP-DIVE AGENT (Agent 13)
// ══════════════════════════════════════════════════════════
