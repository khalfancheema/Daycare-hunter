// ══════════════════════════════════════════════════════════
// PROJECT PLAN SUB-CALLS  (25-agent-10-parts.js)
// Splits the single large Agent 10 call into 3 focused calls
// to prevent Response truncated at max_tokens errors.
// Part 1: all 5 phases with tasks (Gantt data)
// Part 2: milestones + budget tracker
// Part 3: risk register + team/vendors + checklist
// ══════════════════════════════════════════════════════════

async function runAgent10Parts(a3,a4,a5,a7,a9) {
  const ind = industry();
  const base = `${ind.unit} (${ind.capacity_label}: ${capacity()}) near ZIP ${zip()}, budget $${parseInt(budget()).toLocaleString()}`;
  const ctx3 = ctx(a3,['summary','locations']);
  const ctx7 = ctx(a7,['summary','scenarios','startup_breakdown','total_startup_cost']);
  const ctx9 = ctx(a9,['executive_summary','financial_plan','operations_plan']);
  // Verified real data for cost/wage grounding in budget tracker
  const _rdCtx10 = typeof buildRealDataCtx === 'function'
    ? buildRealDataCtx(['wages','rents','macro','energy_rates'])
    : '';

  if(demoMode&&typeof getDemoData==='function'){const _d=getDemoData(10);if(_d){R.a10=_d;try{renderProjectPlan(_d);}catch(e){}setDot(10,'done');showOut(10);return _d;}}
  // ── Part 1 of 3: All 5 Project Phases (Gantt) ───────────
  $('10-gantt-c').innerHTML = subProgress(1,3,'Project Phases & Gantt Chart');
  const sys1 = `You are a senior ${ind.unit} project manager with 15+ years experience on commercial launches. Return JSON only.`;
  const usr1 = `Create all project phases for launching a ${base}.
SITE: ${ctx3}
COMPLIANCE: ${ctx(a5,['summary','requirements','timeline_phases'])}

Return ONLY:
{
  "project_name": "string",
  "total_duration_months": 18,
  "target_open_date": "Month 19 from start",
  "phases": [
    {
      "phase": "Phase 1: Foundation & Funding",
      "months": "1-3",
      "color": "#4a9eff",
      "tasks": [
        {
          "task": "Form Business Entity",
          "month_start": 1,
          "duration": 0.5,
          "owner": "Owner",
          "priority": "Critical",
          "cost": 150,
          "detail": "Detailed step-by-step instructions with specific URLs and phone numbers",
          "links": ["https://specific-link.com"]
        }
      ]
    }
  ]
}
Include ALL 5 phases: Foundation & Funding (months 1-3), Legal/Lease/Design (months 3-6), Construction & Licensing (months 6-12), Staffing & Pre-Opening (months 12-16), Soft Open & Ramp (months 16-18). Each phase should have 8-12 tasks with detailed step-by-step instructions, specific vendor names, phone numbers, and URLs. Priority must be exactly "Critical", "High", or "Medium".`;

  // ── Part 2 of 3: Milestones + Budget Tracker ─────────────
  const p1 = await claudeJSON(sys1, usr1, {webSearch:true});
  $('10-mile-c').innerHTML = subProgress(2,3,'Milestones & Budget Tracker');
  const sys2 = `You are a ${ind.unit} project manager. Return JSON only.`;
  const usr2 = `${_rdCtx10 ? _rdCtx10 + '\n\n' : ''}Create milestones and budget tracker for launching a ${base}.
FINANCIALS: ${ctx7}
BUSINESS PLAN: ${ctx9}

Return ONLY:
{
  "milestones": [
    {
      "month": "Week 1",
      "title": "Milestone title",
      "detail": "Specific criteria that prove this milestone is complete",
      "owner": "Owner",
      "priority": "critical"
    }
  ],
  "budget_tracker": [
    {
      "category": "Budget category",
      "budgeted": 8000,
      "phase": "Phase 1",
      "due": "Month 3",
      "notes": "What drives this cost and how to minimize it"
    }
  ]
}
Include 15-20 milestones from Week 1 through Month 18 (use "critical" or "high" for priority). Include 15-20 budget line items covering all startup costs with notes on cost drivers.`;

  // ── Part 3 of 3: Risk Register + Team + Checklist ────────
  const p2 = await claudeJSON(sys2, usr2, {webSearch:true});
  $('10-risk-c').innerHTML = subProgress(3,3,'Risk Register, Team & Checklist');
  const sys3 = `You are a ${ind.unit} project risk manager and operations consultant. Return JSON only.`;
  const usr3 = `Create risk register, team/vendor directory, and launch checklist for a ${base}.
SITE: ${ctx3}
COMPLIANCE: ${ctx(a5,['summary','requirements'])}
FINANCIALS: ${ctx7}

Return ONLY:
{
  "risk_register": [
    {
      "risk": "Risk description",
      "probability": "High",
      "impact": "Critical",
      "mitigation": "Specific mitigation steps with named resources and contacts",
      "owner": "Owner",
      "phase": "Phase 1"
    }
  ],
  "team_vendors": [
    {
      "role": "SBA Lender",
      "name": "Specific company name",
      "contact": "website.com",
      "phone": "phone number",
      "type": "Financial",
      "notes": "Why this vendor, what makes them right for this business type"
    }
  ],
  "checklist_phases": [
    {
      "phase": "Month 1-3: Foundation",
      "items": [
        {
          "task": "Specific actionable task",
          "owner": "Owner",
          "critical": true
        }
      ]
    }
  ]
}
Risk register: 8-10 risks with probability (High/Medium/Low) and impact (Critical/High/Medium). Team/vendors: 10-14 specific named vendors with real phone numbers and websites. Checklist: 5 phases with 10-15 items each.`;

  const p3 = await claudeJSON(sys3, usr3, {webSearch:true});

  // Merge all 3 parts
  return Object.assign(
    { project_name: '', total_duration_months: 18, target_open_date: '' },
    p1 || {},
    p2 || {},
    p3 || {}
  );
}
