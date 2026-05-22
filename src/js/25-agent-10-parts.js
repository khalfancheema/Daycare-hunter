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

Return ONLY this JSON. All values are placeholders — populate every one from
the upstream SITES / FINANCIALS / COMPLIANCE context. The single example task
shown is structural ONLY; do not echo "Form Business Entity" or its dollar
amount as a literal output.

{
  "project_name":          null,
  "total_duration_months": null,
  "target_open_date":      null,
  "phases": [
    {
      "phase":  null,    // "Phase 1: Foundation & Funding" | "Phase 2: ..." (etc.)
      "months": null,    // e.g. "1-3"
      "color":  null,    // hex like "#4a9eff"
      "tasks": [
        {
          "task":        null,
          "month_start": null,
          "duration":    null,   // months as decimal (0.25, 0.5, 1, 2...)
          "owner":       null,
          "priority":    null,   // "Critical" | "High" | "Medium" (exact strings)
          "cost":        null,   // USD
          "detail":      null,   // step-by-step instructions with real URLs/phones for user's ZIP+state
          "links":       []
        }
      ]
    }
  ]
}
Include ALL 5 phases: Foundation & Funding (1-3), Legal/Lease/Design (3-6), Construction & Licensing (6-12), Staffing & Pre-Opening (12-16), Soft Open & Ramp (16-18). Each phase 8-12 tasks. Priority strings exactly "Critical", "High", "Medium".`;

  // ── Part 2 of 3: Milestones + Budget Tracker ─────────────
  const p1 = await claudeJSON(sys1, usr1, {webSearch:true});
  $('10-mile-c').innerHTML = subProgress(2,3,'Milestones & Budget Tracker');
  const sys2 = `You are a ${ind.unit} project manager. Return JSON only.`;
  const usr2 = `${_rdCtx10 ? _rdCtx10 + '\n\n' : ''}Create milestones and budget tracker for launching a ${base}.
FINANCIALS: ${ctx7}
BUSINESS PLAN: ${ctx9}

Return ONLY this JSON. All values are placeholders.

{
  "milestones": [
    {
      "month":    null,
      "title":    null,
      "detail":   null,
      "owner":    null,
      "priority": null   // "critical" | "high"
    }
  ],
  "budget_tracker": [
    {
      "category": null,
      "budgeted": null,   // USD
      "phase":    null,
      "due":      null,
      "notes":    null
    }
  ]
}
15-20 milestones from Week 1 through Month 18. 15-20 budget line items covering all startup costs with cost-driver notes.`;

  // ── Part 3 of 3: Risk Register + Team + Checklist ────────
  const p2 = await claudeJSON(sys2, usr2, {webSearch:true});
  $('10-risk-c').innerHTML = subProgress(3,3,'Risk Register, Team & Checklist');
  const sys3 = `You are a ${ind.unit} project risk manager and operations consultant. Return JSON only.`;
  const usr3 = `Create risk register, team/vendor directory, and launch checklist for a ${base}.
SITE: ${ctx3}
COMPLIANCE: ${ctx(a5,['summary','requirements'])}
FINANCIALS: ${ctx7}

Return ONLY this JSON. All values are placeholders.

{
  "risk_register": [
    {
      "risk":        null,
      "probability": null,   // "High" | "Medium" | "Low"
      "impact":      null,   // "Critical" | "High" | "Medium"
      "mitigation":  null,
      "owner":       null,
      "phase":       null
    }
  ],
  "team_vendors": [
    {
      "role":    null,
      "name":    null,   // real verified vendor for user's location, or null
      "contact": null,
      "phone":   null,
      "type":    null,   // "Financial" | "Legal" | "Real Estate" | "Operations" | etc.
      "notes":   null
    }
  ],
  "checklist_phases": [
    {
      "phase": null,
      "items": [
        {"task": null, "owner": null, "critical": null}
      ]
    }
  ]
}
Risk register: 8-10. Team/vendors: 10-14 (only include vendors you can actually verify — null phone/contact if unknown). Checklist: 5 phases × 10-15 items.`;

  const p3 = await claudeJSON(sys3, usr3, {webSearch:true});

  // Merge all 3 parts
  return Object.assign(
    { project_name: '', total_duration_months: 18, target_open_date: '' },
    p1 || {},
    p2 || {},
    p3 || {}
  );
}
