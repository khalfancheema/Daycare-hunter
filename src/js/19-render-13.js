// ══════════════════════════════════════════════════════════
// AGENT 13 — Competitor Deep-Dive (3 sub-calls to avoid max_tokens)
// Part A: Summary + Competitor Profiles
// Part B: Pain Point Analysis + Differentiation Strategy
// Part C: Messaging Guide
// ══════════════════════════════════════════════════════════
async function runAgent13(a6) {
  setDot(13,'running');
  const ind = industry();
  const compCtx = ctx(a6, ['summary','cities','top_chains'], 800);

  if (demoMode && typeof getDemoData === 'function') {
    const _d = getDemoData(13);
    if (_d) { R.a13 = _d; try { buildCompDeepDive(_d); } catch(e){} setDot(13,'done'); showOut(13); return JSON.stringify(_d); }
  }

  try {
    // ── Part A: Summary + Competitor Profiles ───────────────
    $('13-sum-t').textContent = 'Analyzing competitor profiles…';
    const _rdCtx13 = (typeof buildRealDataCtx === 'function') ? buildRealDataCtx(['competitors_osm','business_density']) : '';
    const sysA = `You are a competitive intelligence analyst for ${ind.unit} markets. Search Google, Yelp, Facebook reviews for real customer data. Respond JSON only.`;
    const usrA = `${_rdCtx13 ? _rdCtx13 + '\n\n' : ''}Search Google Maps and Yelp for reviews of ${ind.units} near ZIP ${zip()} (${radius()} mi radius). Known competitors: ${ind.competitors}.
Competitor market context: ${compCtx}
Return ONLY:
{
  "summary": "5-sentence competitive landscape and differentiation opportunity summary citing real competitors and review patterns",
  "competitor_profiles": [
    {
      "name": "Competitor name",
      "type": "Corporate Franchise|Corporate Chain|Independent|Regional",
      "avg_rating": 4.1,
      "review_count_est": 340,
      "monthly_tuition_infant": 2100,
      "locations_nearby": 6,
      "google_search_url": "https://www.google.com/search?q=...",
      "yelp_url": "https://www.yelp.com/search?...",
      "top_positive_themes": ["Theme 1","Theme 2","Theme 3"],
      "top_complaint_themes": ["Complaint 1","Complaint 2","Complaint 3"],
      "sample_complaints": ["Verbatim review quote 1","Quote 2","Quote 3"],
      "differentiation_opportunity": "1-sentence gap this competitor creates for a new entrant"
    }
  ]
}
Include 4-5 specific competitor profiles (named chains + local independents). Use real review themes from your search.`;

    const partA = await claudeJSON(sysA, usrA, {webSearch:true});

    // ── Part B: Pain Points + Differentiation ───────────────
    const competitorNames = (partA?.competitor_profiles || []).map(c => c.name).join(', ');
    const sysB = `You are a ${ind.unit} market strategist. Respond JSON only.`;
    const usrB = `Based on competitor review data for ${ind.units} near ZIP ${zip()}: competitors include ${competitorNames || ind.competitors}.
Return ONLY:
{
  "pain_point_analysis": [
    {
      "pain": "Pain point name",
      "frequency_pct": 68,
      "competitors_affected": ["Competitor A","Competitor B"],
      "your_solution": "Specific solution your new center would offer",
      "marketing_angle": "Short compelling tagline"
    }
  ],
  "differentiation_strategy": [
    {
      "pillar": "Strategic pillar name",
      "description": "2-3 sentence description of this differentiator and how to execute it",
      "competitors_this_beats": ["Competitor A","Competitor B"],
      "marketing_hook": "Short punchy tagline"
    }
  ]
}
Include 6-8 pain points (with real frequency estimates from review data) and 5-6 differentiation pillars.`;

    const partB = await claudeJSON(sysB, usrB, {webSearch:true});

    // ── Part C: Messaging Guide ──────────────────────────────
    const sysC = `You are a ${ind.unit} marketing strategist. Respond JSON only.`;
    const usrC = `Create targeted messaging for a new ${ind.unit} near ZIP ${zip()} competing against: ${competitorNames || ind.competitors}.
Return ONLY:
{
  "messaging_guide": [
    {
      "audience": "Specific parent segment (e.g. Primrose waitlisted parents)",
      "headline": "Compelling headline targeting this pain",
      "body": "2-3 sentence ad copy addressing their specific frustration",
      "cta": "Call to action",
      "channel": "Best marketing channel for this audience"
    }
  ]
}
Include 5 distinct audience segments with messaging tailored to their specific competitor frustrations.`;

    const partC = await claudeJSON(sysC, usrC, {webSearch:true});

    // Merge all 3 parts
    const d = Object.assign(
      { summary: '', competitor_profiles: [], pain_point_analysis: [], differentiation_strategy: [], messaging_guide: [] },
      partA || {},
      partB || {},
      partC || {}
    );

    if (!d.summary && !_toArr(d.competitor_profiles).length) {
      console.warn('Agent 13 all parts failed — using fallback');
      const fb = getFallback13();
      R.a13 = fb; buildCompDeepDive(fb); setDot(13,'done'); showOut(13);
      return JSON.stringify(fb);
    }

    R.a13 = d;
    if (typeof rdRenderRealDataBadge === 'function') rdRenderRealDataBadge('13-sum-t', ['competitors_osm','business_density']);
    buildCompDeepDive(d);
    setDot(13,'done'); showOut(13);
    return JSON.stringify(d);
  } catch(e) {
    setDot(13,'error'); showOut(13);
    $('13-sum-t').textContent = 'Error: ' + e.message;
    throw e;
  }
}

function buildCompDeepDive(d) {
  $('13-sum-t').textContent=d.summary;

  // Competitor profiles
  const ind13=industry();
  let ph='';
  (d.competitor_profiles||[]).forEach(c=>{
    const rc=c.avg_rating>=4.3?'var(--green)':c.avg_rating>=4.0?'var(--amber)':'var(--red)';
    const primRate=(c.monthly_tuition_infant||c.monthly_primary_rate||0).toLocaleString();
    ph+=`<div class="comp-profile">
      <div class="comp-header">
        <div><div class="comp-name">${c.name}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${c.type} · ${c.locations_nearby} locations · $${primRate}/mo ${ind13.price_label_primary}</div></div>
        <div style="text-align:right"><div class="comp-rating" style="color:${rc}">${c.avg_rating}★</div><div style="font-size:10px;color:var(--faint)">~${c.review_count_est} reviews</div>
          <div style="display:flex;gap:4px;margin-top:4px">
            <a href="${c.google_search_url}" target="_blank" class="link-btn" style="font-size:10px;padding:2px 7px">↗ Google</a>
            <a href="${c.yelp_url}" target="_blank" class="link-btn" style="font-size:10px;padding:2px 7px">↗ Yelp</a>
          </div>
        </div>
      </div>
      <div class="comp-reviews-grid">
        <div class="review-block"><div class="review-block-label" style="color:var(--green)">✓ Top Praise</div>${(c.top_positive_themes||[]).map(t=>`<div class="review-item">${t}</div>`).join('')}</div>
        <div class="review-block"><div class="review-block-label" style="color:var(--red)">✗ Top Complaints</div>${(c.top_complaint_themes||[]).map(t=>`<div class="review-item" style="color:var(--red)">${t}</div>`).join('')}</div>
      </div>
      <div style="margin:10px 0;background:var(--surface3);border-radius:8px;padding:10px">
        <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--faint);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px">Customer Quotes</div>
        ${(c.sample_complaints||[]).map(q=>`<div style="font-size:11px;color:var(--muted);margin-bottom:5px;padding-left:8px;border-left:2px solid var(--border2);font-style:italic">${q}</div>`).join('')}
      </div>
      <div style="padding:8px 12px;background:var(--blue-dim);border:1px solid var(--blue);border-radius:8px;font-size:12px"><strong style="font-family:'Syne',sans-serif;color:var(--blue)">Our Opportunity: </strong><span style="color:var(--muted)">${c.differentiation_opportunity}</span></div>
    </div>`;
  });
  $('13-comp-c').innerHTML=ph;

  // Pain points
  let pain=`<div style="margin-bottom:12px;font-size:13px;color:var(--muted)">Frequency = % of negative reviews mentioning this theme across all Gwinnett/Barrow competitors:</div><div class="pain-grid">`;
  [...(d.pain_point_analysis||[])].sort((a,b)=>b.frequency_pct-a.frequency_pct).forEach(p=>{
    const col=p.frequency_pct>=60?'var(--red)':p.frequency_pct>=45?'var(--amber)':'var(--blue)';
    pain+=`<div class="pain-card">
      <div class="pain-title">${p.pain}</div>
      <div class="pain-freq">In ${p.frequency_pct}% of negative reviews</div>
      <div class="pain-bar"><div class="pain-bar-fill" style="width:${p.frequency_pct}%;background:${col}"></div></div>
      <div style="font-size:10px;color:var(--faint);margin-bottom:6px">Affects: ${(p.competitors_affected||[]).join(', ')}</div>
      <div class="pain-opp">→ ${p.your_solution}</div>
    </div>`;
  });
  pain+=`</div>`;
  $('13-pain-c').innerHTML=pain;

  // Differentiation strategy
  const cols=['var(--green)','var(--blue)','var(--amber)','var(--purple)','var(--teal)','var(--red)'];
  let diff=`<div style="margin-bottom:8px;font-size:13px;color:var(--muted)">6 strategic pillars — each directly addresses a documented competitor weakness:</div>
  <div style="display:grid;gap:8px">`;
  (d.differentiation_strategy||[]).forEach((s,i)=>{
    diff+=`<div style="display:grid;grid-template-columns:1.5fr 2fr auto;gap:12px;padding:12px 14px;background:var(--surface2);border-radius:9px;border:1px solid var(--border);align-items:start">
      <div><div style="font-size:13px;font-weight:700;font-family:'Syne',sans-serif;color:${cols[i%cols.length]};margin-bottom:4px">${i+1}. ${s.pillar}</div>
      <div style="font-size:11px;color:var(--faint);font-style:italic">"${s.marketing_hook}"</div></div>
      <div style="font-size:12px;color:var(--muted)">${s.description}</div>
      <div style="display:flex;flex-direction:column;gap:4px">${(s.competitors_this_beats||[]).map(c=>`<span class="badge b-red">${c}</span>`).join('')}</div>
    </div>`;
  });
  diff+=`</div>`;
  $('13-diff-c').innerHTML=diff;

  // Messaging
  let msg='';
  (d.messaging_guide||[]).forEach(m=>{
    msg+=`<div class="msg-card">
      <div class="msg-audience">${m.audience}</div>
      <div class="msg-headline">${m.headline}</div>
      <div class="msg-body">${m.body}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div class="msg-cta">${m.cta}</div>
        <div style="font-size:11px;color:var(--faint);font-style:italic">Channel: ${m.channel}</div>
      </div>
    </div>`;
  });
  $('13-msg-c').innerHTML=msg;
}

// ══════════════════════════════════════════════════════════
// AGENT 14 — Code Review
// ══════════════════════════════════════════════════════════
