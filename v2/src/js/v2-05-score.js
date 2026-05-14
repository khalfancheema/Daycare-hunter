// ── V2 VIABILITY SCORE & DATA EXTRACTION ─────────────────────────────────
function v2CalcScore() {
  if (typeof R === 'undefined') return 0;

  let score = 0, weight = 0;

  // Agent 2: Gap analysis — top city gap score (0–10 → 0–25 pts)
  if (R.a2) {
    const cities = R.a2.cities || [];
    const topGap = Math.max(...cities.map(c => Number(c.gap_score) || 0), 0);
    score  += (topGap / 10) * 25;
    weight += 25;
  }

  // Agent 7: Financial — base-case monthly net (0–25 pts)
  // Break-even speed bonus only applies when net is positive — a money-losing
  // business that "breaks even" at month 10 still loses money for years.
  if (R.a7) {
    const scenarios = _toArr(R.a7.scenarios);
    const base = scenarios.find(s => (s.name||'').toLowerCase().includes('base')) || scenarios[1] || {};
    const net  = base.monthly_net || 0;
    const be   = base.breakeven_months || 36;
    const profPts = net > 0 ? 15 : 5;
    const bePts   = net > 0 ? (be < 18 ? 10 : be < 24 ? 6 : be < 36 ? 3 : 0) : 0;
    score  += Math.max(0, Math.min(25, profPts + bePts));
    weight += 25;
  }

  // Agent 8: Executive Summary verdict
  if (R.a8) {
    const text = (R.a8.verdict || R.a8.recommendation || R.a8.summary || '').toLowerCase();
    let v = 0;
    if (text.includes('go') && !text.includes('no-go') && !text.includes('no go')) v = 20;
    else if (text.includes('cautious')) v = 12;
    else if (text.includes('no-go') || text.includes('no go') || text.includes('avoid')) v = 4;
    else v = 10;
    score  += v;
    weight += 20;
  }

  // Agent 6: Competitive intel — market saturation
  // Skip the component entirely when no city data exists — don't fabricate
  // an "average of 5" that gives 10/15 to an unanalyzed market.
  if (R.a6) {
    const cities = _toArr(R.a6.cities || R.a6.by_city || []);
    if (cities.length) {
      const avgComp = cities.reduce((s,c)=>s+(Number(c.competitor_count||c.total_competitors)||0),0)/cities.length;
      score  += Math.max(0, Math.min(15, 15 - avgComp));
      weight += 15;
    }
  }

  // Agent 5: Compliance — timeline (simpler = better)
  if (R.a5) {
    const months = R.a5.total_timeline_months || R.a5.timeline_months || 6;
    const compScore = months <= 3 ? 15 : months <= 6 ? 12 : months <= 12 ? 8 : 5;
    score  += compScore;
    weight += 15;
  }

  if (weight === 0) return 0;
  // Score is on a fixed 100-point scale (Gap25+Fin25+Verdict20+Comp15+Compl15).
  // Do NOT normalize by `weight` — that would let a partial pipeline run show
  // 100/100 from a single high-scoring agent. Return raw earned points.
  return Math.round(score);
}

// Returns per-component breakdown matching v2CalcScore() exactly
function v2GetScoreBreakdown() {
  if (typeof R === 'undefined') return [];
  const components = [];

  // ── Agent 2: Gap Analysis (0–25 pts) ─────────────────────────────────────
  if (R.a2) {
    const cities  = R.a2.cities || [];
    const topGap  = Math.max(...cities.map(c => c.gap_score || 0), 0);
    const earned  = Math.round((topGap / 10) * 25);
    const topCity = [...cities].sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0];
    const pct     = topGap / 10;
    components.push({
      label:  'Demand Gap',
      agent:  'Agent 2 · Gap Analysis',
      ico:    '📈',
      earned, max: 25,
      pct,
      detail: topCity
        ? `Top market: ${topCity.city} — gap score ${topGap.toFixed(1)}/10`
        : `Highest gap score found: ${topGap.toFixed(1)}/10`,
      tip: topGap < 5
        ? 'Low gap score — too many existing providers. Try a different radius or city.'
        : topGap < 7
        ? 'Moderate opportunity. Look for micro-markets with higher unmet demand.'
        : null,
    });
  } else {
    components.push({ label:'Demand Gap', agent:'Agent 2 · Gap Analysis', ico:'📈', earned:0, max:25, pct:0, detail:'Not yet analyzed', missing:true });
  }

  // ── Agent 7: Financial Viability (0–25 pts) ───────────────────────────────
  if (R.a7) {
    const scenarios = _toArr(R.a7.scenarios);
    const base   = scenarios.find(s=>(s.name||'').toLowerCase().includes('base')) || scenarios[1] || {};
    const net    = base.monthly_net || 0;
    const be     = base.breakeven_months || 36;
    const earned = Math.max(0, Math.min(25, (net > 0 ? 15 : 5) + (be < 18 ? 10 : be < 24 ? 6 : be < 36 ? 3 : 0)));
    const netPts = net > 0 ? 15 : 5;
    const bePts  = be < 18 ? 10 : be < 24 ? 6 : be < 36 ? 3 : 0;
    components.push({
      label:  'Financial Viability',
      agent:  'Agent 7 · Financials',
      ico:    '💰',
      earned, max: 25,
      pct:    earned / 25,
      subPts: [
        { label: `Monthly net income ${net > 0 ? '(positive)' : '(negative)'}`, pts: netPts, maxPts: 15 },
        { label: `Break-even at month ${be}`, pts: bePts, maxPts: 10 },
      ],
      detail: `Base case: $${net.toLocaleString()}/mo net · break-even month ${be}`,
      tip: net <= 0
        ? 'Negative net income — increase occupancy rate or adjust pricing in the scenario builder.'
        : be >= 36
        ? 'Break-even beyond 3 years — consider lower startup costs or SBA financing.'
        : null,
    });
  } else {
    components.push({ label:'Financial Viability', agent:'Agent 7 · Financials', ico:'💰', earned:0, max:25, pct:0, detail:'Not yet analyzed', missing:true });
  }

  // ── Agent 8: Executive Verdict (0–20 pts) ────────────────────────────────
  if (R.a8) {
    const raw  = (R.a8.verdict || R.a8.recommendation || R.a8.summary || '').toLowerCase();
    let earned = 10, verdictLabel = 'Neutral';
    if (raw.includes('go') && !raw.includes('no-go') && !raw.includes('no go')) { earned = 20; verdictLabel = 'GO'; }
    else if (raw.includes('cautious'))                                           { earned = 12; verdictLabel = 'Cautious GO'; }
    else if (raw.includes('no-go') || raw.includes('no go') || raw.includes('avoid')) { earned = 4; verdictLabel = 'NO-GO'; }
    components.push({
      label:  'AI Verdict',
      agent:  'Agent 8 · Executive Summary',
      ico:    '📋',
      earned, max: 20,
      pct:    earned / 20,
      detail: `Verdict: ${verdictLabel}`,
      tip: earned < 12
        ? 'AI flagged significant concerns. Review the executive summary for specific risk factors.'
        : null,
    });
  } else {
    components.push({ label:'AI Verdict', agent:'Agent 8 · Executive Summary', ico:'📋', earned:0, max:20, pct:0, detail:'Not yet analyzed', missing:true });
  }

  // ── Agent 6: Market Saturation (0–15 pts) ────────────────────────────────
  if (R.a6) {
    const cities  = _toArr(R.a6.cities || R.a6.by_city || []);
    const avgComp = cities.length
      ? cities.reduce((s,c)=>s+(c.competitor_count||c.total_competitors||5),0)/cities.length
      : 5;
    const earned = Math.max(0, Math.min(15, Math.round(15 - avgComp)));
    components.push({
      label:  'Market Saturation',
      agent:  'Agent 6 · Competitive Intel',
      ico:    '🔍',
      earned, max: 15,
      pct:    earned / 15,
      detail: `Avg ${avgComp.toFixed(1)} competitors per market (lower is better)`,
      tip: avgComp > 10
        ? 'Highly saturated market. Focus on underserved ZIP codes or differentiate strongly.'
        : avgComp > 6
        ? 'Moderate competition. Strong differentiation and location choice will be key.'
        : null,
    });
  } else {
    components.push({ label:'Market Saturation', agent:'Agent 6 · Competitive Intel', ico:'🔍', earned:0, max:15, pct:0, detail:'Not yet analyzed', missing:true });
  }

  // ── Agent 5: Regulatory Ease (0–15 pts) ──────────────────────────────────
  if (R.a5) {
    const months = R.a5.total_timeline_months || R.a5.timeline_months || 6;
    const earned = months <= 3 ? 15 : months <= 6 ? 12 : months <= 12 ? 8 : 5;
    components.push({
      label:  'Regulatory Ease',
      agent:  'Agent 5 · Compliance',
      ico:    '⚖️',
      earned, max: 15,
      pct:    earned / 15,
      detail: `Permit & licensing timeline: ${months} month${months !== 1 ? 's' : ''}`,
      tip: months > 12
        ? 'Complex regulatory environment. Budget for attorney fees and permitting delays.'
        : months > 6
        ? 'Moderate complexity. Start permit applications early to avoid timeline slippage.'
        : null,
    });
  } else {
    components.push({ label:'Regulatory Ease', agent:'Agent 5 · Compliance', ico:'⚖️', earned:0, max:15, pct:0, detail:'Not yet analyzed', missing:true });
  }

  return components;
}

function v2CalcScoreBreakdown() {
  if (typeof R === 'undefined') return [];
  const components = [];

  // Agent 2: Market Demand Gap (max 25)
  if (R.a2) {
    const cities  = R.a2.cities || [];
    const topCity = [...cities].sort((a,b)=>(b.gap_score||0)-(a.gap_score||0))[0] || {};
    const topGap  = topCity.gap_score || 0;
    const earned  = Math.round((topGap / 10) * 25 * 10) / 10;
    const pct     = topGap / 10;
    components.push({
      id:      'gap',
      label:   'Market Demand Gap',
      agent:   'Agent 2 · Gap Analysis',
      ico:     '📈',
      earned,
      max:     25,
      pct,
      detail:  `Top city gap score: ${topGap}/10 (${topCity.city || '—'})`,
      tip:     topGap >= 7 ? 'Strong unmet demand in your area.' :
               topGap >= 4 ? 'Moderate demand — check secondary cities.' :
               'Market may be saturated. Consider a different ZIP or radius.',
      tier:    pct >= 0.7 ? 'strong' : pct >= 0.4 ? 'moderate' : 'weak',
    });
  }

  // Agent 7: Financial Viability (max 25)
  if (R.a7) {
    const scenarios = _toArr(R.a7.scenarios);
    const base   = scenarios.find(s=>(s.name||'').toLowerCase().includes('base')) || scenarios[1] || {};
    const net    = base.monthly_net    || 0;
    const be     = base.breakeven_months || 36;
    const profPts = net > 0 ? 15 : 5;
    const bePts   = be < 18 ? 10 : be < 24 ? 6 : be < 36 ? 3 : 0;
    const earned  = Math.min(25, profPts + bePts);
    const pct     = earned / 25;
    components.push({
      id:      'financials',
      label:   'Financial Viability',
      agent:   'Agent 7 · Financials',
      ico:     '💰',
      earned,
      max:     25,
      pct,
      detail:  `Monthly net: $${net.toLocaleString()} · Break-even: ${be} months`,
      tip:     net > 0 && be < 24 ? 'Profitable with fast payback. Solid fundamentals.' :
               net > 0           ? 'Profitable but slower break-even. Optimize fixed costs.' :
                                   'Base case is loss-making. Revisit pricing or capacity assumptions.',
      tier:    pct >= 0.7 ? 'strong' : pct >= 0.4 ? 'moderate' : 'weak',
      sub: [
        { label: 'Profitability', pts: profPts, max: 15,
          note: net > 0 ? `Net positive (+$${net.toLocaleString()}/mo)` : `Net negative ($${net.toLocaleString()}/mo)` },
        { label: 'Break-Even Speed', pts: bePts, max: 10,
          note: `${be} months to break-even` },
      ],
    });
  }

  // Agent 8: AI Verdict (max 20)
  if (R.a8) {
    const text = (R.a8.verdict || R.a8.recommendation || R.a8.summary || '').toLowerCase();
    let earned = 10, verdictLabel = 'Neutral';
    if (text.includes('go') && !text.includes('no-go') && !text.includes('no go')) { earned = 20; verdictLabel = 'GO'; }
    else if (text.includes('cautious'))                                              { earned = 12; verdictLabel = 'Cautious GO'; }
    else if (text.includes('no-go') || text.includes('no go') || text.includes('avoid')) { earned = 4; verdictLabel = 'NO-GO'; }
    const pct = earned / 20;
    components.push({
      id:      'verdict',
      label:   'AI Executive Verdict',
      agent:   'Agent 8 · Executive Summary',
      ico:     '📋',
      earned,
      max:     20,
      pct,
      detail:  `Verdict: "${verdictLabel}"`,
      tip:     earned === 20 ? 'AI analysis supports moving forward.' :
               earned >= 12 ? 'AI sees opportunity with caveats. Review risk section.' :
               earned <= 4  ? 'AI recommends against this. Address root causes before proceeding.' :
                              'AI verdict is neutral. More data may sharpen the recommendation.',
      tier:    pct >= 0.7 ? 'strong' : pct >= 0.4 ? 'moderate' : 'weak',
    });
  }

  // Agent 6: Competitive Landscape (max 15)
  if (R.a6) {
    const cities  = _toArr(R.a6.cities || R.a6.by_city || []);
    const avgComp = cities.length
      ? cities.reduce((s,c)=>s+(c.competitor_count||c.total_competitors||5),0)/cities.length
      : 5;
    const earned = Math.max(0, Math.min(15, Math.round(15 - avgComp)));
    const pct    = earned / 15;
    components.push({
      id:      'competition',
      label:   'Competitive Landscape',
      agent:   'Agent 6 · Competitor Intel',
      ico:     '🔍',
      earned,
      max:     15,
      pct,
      detail:  `Avg ${avgComp.toFixed(1)} competitors/city across ${cities.length} cities`,
      tip:     avgComp <= 3  ? 'Low competition — significant whitespace opportunity.' :
               avgComp <= 7  ? 'Moderate competition. Differentiation strategy is key.' :
                               'High saturation. A clear niche or superior offering is essential.',
      tier:    pct >= 0.7 ? 'strong' : pct >= 0.4 ? 'moderate' : 'weak',
    });
  }

  // Agent 5: Compliance Timeline (max 15)
  if (R.a5) {
    const months = R.a5.total_timeline_months || R.a5.timeline_months || 6;
    const earned = months <= 3 ? 15 : months <= 6 ? 12 : months <= 12 ? 8 : 5;
    const pct    = earned / 15;
    components.push({
      id:      'compliance',
      label:   'Compliance Timeline',
      agent:   'Agent 5 · Regulatory',
      ico:     '⚖️',
      earned,
      max:     15,
      pct,
      detail:  `${months}-month permit & licensing timeline`,
      tip:     months <= 3  ? 'Fast regulatory path — minimal delays expected.' :
               months <= 6  ? 'Standard timeline. Plan permit costs into your budget.' :
                              'Complex regulatory environment. Factor delays into cash flow projections.',
      tier:    pct >= 0.7 ? 'strong' : pct >= 0.4 ? 'moderate' : 'weak',
    });
  }

  return components;
}

function v2ScoreVerdict(score) {
  if (score >= 70) return {
    label: '✓ GO', badge: 'green', color: 'var(--v2-green)', colorClass: 'go', icon: '🟢',
    title: 'Strong Opportunity',
    summary: 'Market data supports moving forward. Solid demand, manageable competition, and favorable financials align with your goals.',
  };
  if (score >= 45) return {
    label: '⚠ CAUTIOUS GO', badge: 'amber', color: 'var(--v2-amber)', colorClass: 'caution', icon: '🟡',
    title: 'Proceed with Caution',
    summary: 'Opportunity exists but notable risks require mitigation. Review the financial model and competitive landscape before committing.',
  };
  return {
    label: '✗ NO-GO', badge: 'red', color: 'var(--v2-red)', colorClass: 'no', icon: '🔴',
    title: 'High Risk — Do Not Proceed',
    summary: 'Current market conditions, financial projections, or competitive density make this a risky investment at this time.',
  };
}

function v2GetRisks() {
  if (typeof R === 'undefined' || !R.a8) return [];
  const raw = R.a8.risks || R.a8.risk_factors || R.a8.key_risks || [];
  return _toArr(raw).slice(0, 8).map(r => ({
    title:    typeof r === 'string' ? r : (r.risk || r.title || r.name || ''),
    desc:     typeof r === 'string' ? '' : (r.mitigation || r.description || r.detail || ''),
    severity: typeof r === 'string' ? 'medium' : (r.severity || r.level || 'medium'),
  })).filter(r => r.title);
}

function v2GetInsights() {
  const insights = [];
  if (typeof R === 'undefined') return insights;
  if (R.a1?.summary) insights.push({ ico:'📊', title:'Demographics', body: _truncate(R.a1.summary, 200) });
  if (R.a5?.summary) insights.push({ ico:'⚖️', title:'Compliance', body: _truncate(R.a5.summary, 200) });
  if (R.a6?.summary) insights.push({ ico:'🔍', title:'Competition', body: _truncate(R.a6.summary, 200) });
  if (R.a12?.summary) insights.push({ ico:'💵', title:'Grants Available', body: _truncate(R.a12.summary, 200) });
  return insights;
}

function v2GetAssessment() {
  if (typeof R === 'undefined' || !R.a8) return null;
  return {
    verdict:       R.a8.verdict || R.a8.recommendation || '',
    rationale:     R.a8.verdict_rationale || R.a8.rationale || '',
    assessment:    R.a8.assessment || R.a8.summary || '',
    successFactors:_toArr(R.a8.success_factors || R.a8.strengths || []).slice(0, 8),
    nextStepsAI:   _toArr(R.a8.next_steps || R.a8.action_items || []).slice(0, 8),
  };
}

function v2GetFinancialsDetail() {
  if (typeof R === 'undefined' || !R.a7) return null;
  const scenarios = _toArr(R.a7.scenarios || []);
  const breakdown = _toArr(R.a7.startup_breakdown || R.a7.cost_breakdown || []).slice(0, 10);

  // Derive startup cost: explicit field OR sum breakdown OR fall back to scenario
  let startup = R.a7.total_startup_cost || R.a7.startup_cost || 0;
  if (!startup && breakdown.length) {
    startup = breakdown.reduce((s, b) => s + (b.amount || b.cost || b.value || 0), 0);
  }

  // Derive monthly expenses: explicit field OR from first scenario OR from monthly_ops
  const monthlyOps = R.a7.monthly_ops;
  let monthly_expenses = R.a7.monthly_expenses || R.a7.fixed_costs || R.a7.monthly_fixed_costs || 0;
  if (!monthly_expenses) {
    if (scenarios.length) {
      const base = scenarios.find(s => (s.name||'').toLowerCase().includes('base')) || scenarios[1] || scenarios[0] || {};
      monthly_expenses = base.monthly_expenses || base.operating_costs || 0;
    }
    if (!monthly_expenses && monthlyOps) {
      const opsArr = Array.isArray(monthlyOps) ? monthlyOps : Object.values(monthlyOps);
      if (opsArr.length) {
        const first = opsArr[0];
        monthly_expenses = typeof first === 'object'
          ? (first.total || first.amount || first.expenses || 0)
          : (typeof first === 'number' ? first : 0);
      }
    }
  }

  return {
    startup,
    monthly_expenses,
    scenarios,
    funding:     _toArr(R.a7.funding_sources || R.a7.funding || []).slice(0, 6),
    assumptions: _toArr(R.a7.key_assumptions || []).slice(0, 6),
    startup_breakdown: breakdown,
  };
}

function v2GetGrantsDetail() {
  if (typeof R === 'undefined' || !R.a12) return [];
  // Support both generic and demo-specific data shapes
  const raw = _toArr(
    R.a12.grants || R.a12.programs || R.a12.opportunities ||
    R.a12.all_grants_table || R.a12.grant_list || []
  );
  return raw.slice(0, 12).map(g => ({
    name:        g.name || g.program || g.title || '',
    amount:      g.amount || g.max_award || g.funding || g.amount_est || '',
    deadline:    g.deadline || g.due_date || '',
    eligibility: g.eligibility || g.requirements || g.action_required || '',
    type:        g.type || g.category || g.source || 'Program',
    probability: g.probability || '',
  })).filter(g => g.name);
}

function v2GetMarketData() {
  if (typeof R === 'undefined') return { gap: null, sites: [], realEstate: [] };
  const gap = R.a2 ? {
    summary:     R.a2.summary || '',
    total_pop:   R.a2.total_population || 0,
    demand:      R.a2.demand_units || R.a2.unserved_demand || 0,
    cities:      _toArr(R.a2.cities || []).sort((a,b)=>(b.gap_score||0)-(a.gap_score||0)).slice(0, 8),
  } : null;
  const sites      = R.a3 ? _toArr(R.a3.sites || R.a3.locations || R.a3.top_sites || []).slice(0, 6) : [];
  const realEstate = R.a4 ? _toArr(R.a4.listings || R.a4.properties || []).slice(0, 4) : [];
  return { gap, sites, realEstate };
}

function v2GetCompetitorData() {
  if (typeof R === 'undefined') return { comp6: null, comp13: null };
  const comp6 = R.a6 ? {
    summary:    R.a6.summary || '',
    cities:     _toArr(R.a6.cities || R.a6.by_city || []).slice(0, 6),
    avg_rating: R.a6.avg_rating || 0,
    total:      R.a6.total_competitors || 0,
  } : null;

  const comp13 = R.a13 ? (() => {
    // pain points: generic or demo-specific shape
    const rawPain = _toArr(
      R.a13.pain_points || R.a13.competitor_weaknesses ||
      R.a13.pain_point_analysis || []
    ).slice(0, 5).map(p =>
      typeof p === 'string' ? p : (p.pain || p.issue || p.problem || p.title || '')
    ).filter(Boolean);

    // differentiators: may be array or keyed object
    let rawDiff = R.a13.differentiators || R.a13.your_advantages || R.a13.differentiation_strategy || [];
    if (!Array.isArray(rawDiff) && typeof rawDiff === 'object') {
      rawDiff = Object.values(rawDiff);
    }
    const diffs = _toArr(rawDiff).slice(0, 5).map(d =>
      typeof d === 'string' ? d : (d.pillar || d.advantage || d.differentiator || d.title || d.description || '')
    ).filter(Boolean);

    return {
      summary:         R.a13.summary || '',
      pain_points:     rawPain,
      differentiators: diffs,
    };
  })() : null;

  return { comp6, comp13 };
}

function v2GetActionPlan() {
  if (typeof R === 'undefined') return { steps: [], phases: [] };
  const steps  = _toArr(R.a8?.next_steps || R.a8?.action_items || []).slice(0, 10);
  const phases = _toArr(R.a10?.milestones || R.a10?.phases || []).slice(0, 5);
  return { steps, phases };
}

function v2GetAgentSummary(id) {
  if (typeof R === 'undefined') return '';
  const d = R[`a${id}`];
  if (!d) return '';
  // Agent-specific summary extraction for agents that don't use a top-level `summary` field
  if (id === 9) {
    const es = d.executive_summary || {};
    return _truncate(es.concept || d.business_name || '', 180);
  }
  if (id === 10) {
    const phases = (d.phases || []).length;
    const tasks  = (d.phases || []).reduce((s, p) => s + (p.tasks || []).length, 0);
    return _truncate(d.project_name ? `${d.project_name} — ${phases} phases, ${tasks} tasks, ${d.total_duration_months || 18}-month timeline` : '', 180);
  }
  if (id === 17) {
    const src = (d.data_sources || []).length;
    const q   = d.citation_quality_score || '';
    return _truncate(d.summary || (src ? `${src} data sources audited${q ? '. Citation quality: ' + q + '/100' : ''}` : ''), 180);
  }
  return _truncate(d.summary || d.assessment || d.overview || '', 180);
}

function _truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}
