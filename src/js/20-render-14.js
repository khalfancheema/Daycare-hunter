async function runAgent14(allResults) {
  setDot(14,'running');
  const ind = industry();

  if (demoMode && typeof getDemoData === 'function') {
    const _d = getDemoData(14);
    if (_d) { R.a14 = _d; try { renderCodeReview(_d); } catch(e){} setDot(14,'done'); showOut(14); return JSON.stringify(_d); }
  }

  // Build real pipeline state from actual R data
  const agentMap = [
    {n:1, name:'Demographics'}, {n:2, name:'Gap Analysis'}, {n:3, name:'Site Selection'},
    {n:4, name:'Real Estate'}, {n:5, name:'Compliance'}, {n:6, name:'Competitive Intel'},
    {n:7, name:'Financials'}, {n:8, name:'Executive Summary'}, {n:9, name:'Business Plan'},
    {n:10, name:'Project Plan'}, {n:11, name:'Market Map'}, {n:12, name:'Grants'},
    {n:13, name:'Competitor Deep-Dive'}, {n:16, name:'Build vs Buy'}, {n:17, name:'Data Sources'}
  ];
  const completed = agentMap.filter(a => !!R[`a${a.n}`]);
  const failed    = agentMap.filter(a => !R[`a${a.n}`]);
  const completePct = Math.round(completed.length / agentMap.length * 100);

  // Derive real data quality signals
  const signals = [];
  if (R.a2) {
    const cities = _toArr(R.a2.cities||[]);
    signals.push(`Gap analysis: ${cities.length} cities, top gap ${Math.max(...cities.map(c=>c.gap_score||0),0)}/10`);
  }
  if (R.a7) {
    const sc = _toArr(R.a7.scenarios||[]);
    const base = sc.find(s=>(s.name||'').toLowerCase().includes('base'))||sc[1]||{};
    signals.push(`Financials: ${sc.length} scenarios, base net $${(base.monthly_net||0).toLocaleString()}/mo, break-even month ${base.breakeven_months||'?'}`);
  }
  if (R.a5) signals.push(`Compliance: ${_toArr(R.a5.requirements||[]).length} requirements, ${R.a5.total_timeline_months||'?'}-month timeline`);
  if (R.a6) signals.push(`Competition: ${_toArr(R.a6.cities||[]).length} markets scanned, ${R.a6.total_licensed_estimated||'?'} total licensed`);
  if (R.a13) signals.push(`Deep-dive: ${_toArr(R.a13.competitor_profiles||[]).length} profiles, ${_toArr(R.a13.pain_point_analysis||[]).length} pain points`);
  if (R.a12) signals.push(`Grants: $${((R.a12.total_potential_funding||0)/1000).toFixed(0)}K potential funding`);
  if (R.a8)  signals.push(`Verdict: ${R.a8.verdict||R.a8.recommendation||'present'}`);

  // Show sub-agent progress
  const _t14 = $('14-sum-t'); if (_t14) _t14.innerHTML = subProgress(1, 2, 'Reviewing issues & performance…');

  const sysCommon = `You are a senior AI pipeline architect reviewing a multi-agent ${ind.unit} business planning pipeline. Respond JSON only.`;
  const ctxBlock = `ACTUAL PIPELINE STATE:
- Industry: ${ind.unit}
- Agents completed: ${completed.length}/${agentMap.length} (${completePct}%)
- Failed agents: ${failed.length > 0 ? failed.map(a=>a.n+' '+a.name).join(', ') : 'none'}
- Input: ZIP ${zip()}, Radius ${radius()}mi, Budget $${budget()}, Capacity ${capacity()}
- Data signals: ${signals.join(' | ') || 'no data yet'}

ARCHITECTURE FACTS:
- claudeJSON(): 3-retry + 5-strategy JSON extraction, max_tokens 8192, stop_reason guard
- ctx(): field extraction limits upstream context size
- Parallel phases: agents 1+5+6 (phase 1), agents 11+12+13+16 (phase 9)
- Per-agent fallbacks: getFallback1()-getFallback17()
- Source files: src/js/ modules bundled via build.mjs → public/index.html
- Sub-agents: agents 7 (3 sub-calls), 9 (4 sub-calls), 10 (3 sub-calls), 13 (3 sub-calls), 14 (2 sub-calls), 1 (2 sub-calls)`;

  // ── Part A: Issues + performance + summary + recommended fixes ───────
  const usrA = `Review this browser-based ${ind.unit} planning pipeline. Part A: issues + performance.

${ctxBlock}

Return ONLY:
{
  "summary": "2-3 sentence honest assessment based on actual completion rate and data quality above",
  "overall_grade": "A|B|C|D",
  "issues": [
    {"id":"CR-001","severity":"critical|high|medium|low","category":"Performance|Cost|Reliability|Data|UX","title":"Issue title","detail":"Specific detail referencing actual pipeline state","location":"function or agent number","fix":"Specific actionable fix"}
  ],
  "performance_metrics": [
    {"metric":"Metric name","current":"observed","optimized":"target","score":85,"notes":"explanation"}
  ],
  "recommended_fixes_priority": [
    {"priority":1,"id":"CR-001","effort":"1 hour","impact":"Specific impact"}
  ]
}
Identify 4-8 real issues. Ground-truth: completion rate, failed agents, data signals above.`;

  // ── Part B: Cost analysis (the heaviest section) ──────────────────────
  const usrB = `Cost analysis for the same ${ind.unit} pipeline. Part B: token economics only.

${ctxBlock}

Return ONLY:
{
  "cost_analysis": {
    "model": "claude-sonnet-4-6",
    "input_cost_per_mtok": 3.00,
    "output_cost_per_mtok": 15.00,
    "agents": [
      {"agent":"Demographics","avg_input_tokens":900,"avg_output_tokens":1200,"cost_per_run":0.021}
    ],
    "total_cost_per_run": 0.45,
    "optimized_cost_per_run": 0.35,
    "monthly_cost_10runs": 4.50,
    "monthly_cost_50runs": 22.50,
    "optimization_tips": ["Specific tip based on actual data"]
  }
}
Include all 15 active agents (1,2,3,4,5,6,7,8,9,10,11,12,13,16,17) with realistic token estimates.`;

  try {
    const partA = await claudeJSON(sysCommon, usrA);
    if (_t14) _t14.innerHTML = subProgress(2, 2, 'Building cost analysis…');
    // webSearch: fetch current Claude API pricing (rates change frequently)
    const partB = await claudeJSON(sysCommon, usrB, {webSearch:true});

    const d = Object.assign({}, partA || {}, partB || {});
    if (!d.summary && !d.issues) { console.warn('Agent 14 fallback'); Object.assign(d, getFallback14()); }
    R.a14 = d;
    renderCodeReview(d);
    setDot(14,'done'); showOut(14);
    return JSON.stringify(d);
  } catch(e) { setDot(14,'error'); showOut(14); if ($('14-sum-t')) $('14-sum-t').textContent = 'Error: ' + e.message; throw e; }
}

function renderCodeReview(d) {
  $('14-sum-t').textContent=(d.summary||'')+'\n\nOverall Grade: '+(d.overall_grade||'N/A');
  const sevIcons={critical:'🔴',high:'🟠',medium:'🟡',low:'🔵'};
  const sevOrder={critical:0,high:1,medium:2,low:3};
  const sorted=[...(d.issues||[])].sort((a,b)=>(sevOrder[a.severity]||4)-(sevOrder[b.severity]||4));
  let issues='';
  sorted.forEach(i=>{
    const bc=i.severity==='critical'?'b-red':i.severity==='high'?'b-amber':i.severity==='medium'?'b-blue':'b-green';
    issues+=`<div class="cr-issue ${i.severity||''}"><div class="cr-issue-icon">${sevIcons[i.severity]||'⚪'}</div><div><div class="cr-issue-title">${i.id||''} — ${i.title||''}</div><div class="cr-issue-detail">${i.detail||''}</div><div class="cr-issue-location">📍 ${i.location||''} | ${i.category||''}</div><div class="cr-fix">✅ Fix: ${i.fix||''}</div></div><span class="badge ${bc}">${(i.severity||'info').toUpperCase()}</span></div>`;
  });
  $('14-issues-c').innerHTML=issues;
  let perf='';
  _toArr(d.performance_metrics).forEach(m=>{
    const col=m.score>=80?'var(--green)':m.score>=60?'var(--amber)':'var(--red)';
    perf+=`<div class="perf-metric"><div class="perf-metric-label">${m.metric}</div><div style="flex:1"><div class="perf-metric-bar"><div class="perf-metric-fill" style="width:${m.score}%;background:${col}"></div></div><div style="font-size:10px;color:var(--faint);margin-top:3px">${m.notes}</div></div><div class="perf-metric-val" style="color:${col}">${m.score}/100</div></div><div style="display:flex;gap:12px;margin:-2px 0 8px 202px;font-size:11px"><span style="color:var(--muted)">Now: <strong style="color:var(--text)">${m.current}</strong></span><span style="color:var(--green)">→ ${m.optimized}</span></div>`;
  });
  $('14-perf-c').innerHTML=perf;
  const ca=d.cost_analysis||{total_cost_per_run:0,optimized_cost_per_run:0,monthly_cost_10runs:0,monthly_cost_50runs:0,agents:[],optimization_tips:[]};
  let cost=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:16px">
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">Cost / Run</div><div style="font-size:24px;font-weight:700;font-family:'Syne',sans-serif;color:var(--amber)">$${(ca.total_cost_per_run||0).toFixed(3)}</div></div>
    <div style="background:var(--green-dim);border:1px solid var(--green);border-radius:8px;padding:12px"><div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">Optimized</div><div style="font-size:24px;font-weight:700;font-family:'Syne',sans-serif;color:var(--green)">$${(ca.optimized_cost_per_run||0).toFixed(3)}</div><div style="font-size:10px;color:var(--green)">Save $${((ca.total_cost_per_run||0)-(ca.optimized_cost_per_run||0)).toFixed(3)}/run</div></div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">10 Runs/Mo</div><div style="font-size:24px;font-weight:700;font-family:'Syne',sans-serif;color:var(--text)">$${(ca.monthly_cost_10runs||0).toFixed(2)}</div></div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px">50 Runs/Mo</div><div style="font-size:24px;font-weight:700;font-family:'Syne',sans-serif;color:var(--text)">$${(ca.monthly_cost_50runs||0).toFixed(2)}</div></div>
  </div>
  <table class="tbl"><thead><tr><th>Agent</th><th>Input Tokens</th><th>Output Tokens</th><th>Cost/Run</th></tr></thead><tbody>`;
  (ca.agents||[]).forEach(a=>{cost+=`<tr><td>${a.agent}</td><td>${(a.avg_input_tokens||0).toLocaleString()}</td><td>${(a.avg_output_tokens||0).toLocaleString()}</td><td style="color:var(--amber)">$${(a.cost_per_run||0).toFixed(3)}</td></tr>`;});
  cost+=`<tr style="border-top:2px solid var(--border2)"><td><strong>Total</strong></td><td colspan="2"></td><td style="color:var(--amber);font-weight:700">$${(ca.total_cost_per_run||0).toFixed(3)}</td></tr></tbody></table>
  <div style="margin-top:14px">`;
  (ca.optimization_tips||[]).forEach((tip,i)=>{cost+=`<div style="display:flex;gap:10px;padding:8px 12px;background:var(--green-dim);border:1px solid var(--green);border-radius:7px;margin-bottom:5px;font-size:12px"><strong style="color:var(--green);font-family:'Syne',sans-serif;flex-shrink:0">${i+1}.</strong><span style="color:var(--muted)">${tip}</span></div>`;});
  cost+=`</div>`;
  $('14-cost-c').innerHTML=cost;
  let fixes=`<table class="tbl"><thead><tr><th>Priority</th><th>Issue</th><th>Effort</th><th>Impact</th></tr></thead><tbody>`;
  (d.recommended_fixes_priority||[]).forEach(f=>{fixes+=`<tr><td><strong style="color:var(--blue)">#${f.priority}</strong></td><td><span class="badge b-blue">${f.id}</span></td><td style="color:var(--muted)">${f.effort}</td><td style="font-size:12px">${f.impact}</td></tr>`;});
  fixes+=`</tbody></table>`;
  $('14-fixes-c').innerHTML=fixes;
}

// ══════════════════════════════════════════════════════════
// AGENT 15 — QA & Testing
// ══════════════════════════════════════════════════════════
