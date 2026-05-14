// ══════════════════════════════════════════════════════════
// 35-compare-zip.js — Compare two ZIP codes side by side
//
// Uses a single focused AI call that pulls real data for
// both ZIPs and returns a structured comparison JSON.
// Does NOT re-run all 17 agents — just one comparison call
// that is aware of the already-run primary results.
// ══════════════════════════════════════════════════════════

async function runZipComparison() {
  const zip2 = ($('compareZipInput')?.value || '').trim();
  if (!zip2 || !/^\d{5}$/.test(zip2)) {
    showErr('Enter a valid 5-digit ZIP code for comparison.');
    return;
  }

  const zip1 = zip();
  if (zip2 === zip1) {
    showErr('Comparison ZIP must be different from your primary ZIP.');
    return;
  }

  const btn = $('compareZipBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Comparing…'; }

  const panel = $('zipComparePanel');
  if (panel) {
    panel.innerHTML = `<div class="comp-loading"><span class="stream-dot"></span> Researching ZIP ${zip2} and comparing with ZIP ${zip1}…</div>`;
    panel.style.display = 'block';
  }

  const ind = industry();

  // Build context from existing primary run (if available)
  const ctx1 = {
    verdict:    R.a8?.verdict || null,
    rationale:  (R.a8?.verdict_rationale || '').slice(0, 150),
    opp_score:  R.a2?.overall_opportunity_score || null,
    top_city:   R.a3?.locations?.[0]?.city || null,
    top_income: R.a1?.cities?.[0]?.median_hh_income || null,
    top_kids:   R.a1?.cities?.[0]?.pop_under5 || null,
    metro:      R.a1?.metro_overview?.metro_name || null,
    ndcp_rate:  R.a2?.ndcp_median_preschool_rate || null,
  };

  const sys = `You are a comparative market research analyst specializing in ${ind.unit} business opportunities. Always respond with a JSON object only.`;

  const usr = `Compare two ZIP code markets for opening a ${ind.unit}.

PRIMARY MARKET — ZIP ${zip1} (already analyzed):
${JSON.stringify(ctx1)}
Industry: ${ind.label} · Capacity: ${capacity()} · Budget: $${parseInt(budget()).toLocaleString()}

COMPARISON MARKET — ZIP ${zip2}:
Search for real data for ZIP ${zip2}: population, median household income, children under 5, income growth, labor force participation, competitor count, and available real estate.

Return ONLY this JSON:
{
  "zip1": "${zip1}",
  "zip2": "${zip2}",
  "industry": "${ind.label}",
  "winner": "${zip1}|${zip2}|Tie",
  "winner_reason": "One sentence explaining which ZIP is the stronger opportunity and why",
  "zip1_name": "City/area name for ${zip1}",
  "zip2_name": "City/area name for ${zip2}",
  "metrics": [
    {
      "metric": "Population (Primary City)",
      "zip1_value": "string or null",
      "zip2_value": "string or null",
      "winner": "${zip1}|${zip2}|Tie",
      "notes": "string"
    }
  ],
  "zip1_pros": ["string"],
  "zip2_pros": ["string"],
  "zip1_cons": ["string"],
  "zip2_cons": ["string"],
  "recommendation": "2-3 sentences on which ZIP to prioritize and why",
  "data_sources": ["string"]
}

Include these metrics: Population, Children Under 5 / Primary Demographic, Median HH Income, Income Growth %, Dual-Income HH %, Competitor Count, Real Estate Cost, Opportunity Score (1-10).`;

  try {
    const d = await claudeJSON(sys, usr);
    if (!d) throw new Error('No comparison data returned');
    renderZipComparisonPanel(d, zip1, zip2);
  } catch(e) {
    if (panel) panel.innerHTML = `<div class="prose" style="color:var(--red)">Comparison failed: ${e.message}</div>`;
    showErr('ZIP comparison failed: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⚖ Compare ZIPs'; }
  }
}

function renderZipComparisonPanel(d, zip1, zip2) {
  const panel = $('zipComparePanel');
  if (!panel) return;

  const winnerClass = (metric_winner) => {
    if (!metric_winner) return '';
    return metric_winner === zip1 ? 'zip-win-a' : metric_winner === zip2 ? 'zip-win-b' : '';
  };

  const winnerIcon = (metric_winner, side) => {
    if (!metric_winner || metric_winner === 'Tie') return '';
    return metric_winner === side ? '★' : '';
  };

  const overallWinClass = w => w === zip1 ? 'zcomp-winner-a' : w === zip2 ? 'zcomp-winner-b' : 'zcomp-winner-tie';

  let metricsHtml = '';
  (d.metrics || []).forEach(m => {
    metricsHtml += `
    <tr class="${winnerClass(m.winner)}">
      <td class="zcomp-metric">${m.metric}</td>
      <td class="zcomp-val ${m.winner === zip1 ? 'zcomp-best' : ''}">${winnerIcon(m.winner, zip1)} ${m.zip1_value ?? 'N/A'}</td>
      <td class="zcomp-val ${m.winner === zip2 ? 'zcomp-best' : ''}">${winnerIcon(m.winner, zip2)} ${m.zip2_value ?? 'N/A'}</td>
      <td class="zcomp-note">${m.notes || ''}</td>
    </tr>`;
  });

  const prosList = (items, cls) =>
    (items || []).map(p => `<li class="${cls}">${p}</li>`).join('');

  panel.innerHTML = `
  <div class="zcomp-panel">
    <div class="zcomp-header">
      <div class="zcomp-title">ZIP Comparison — ${d.industry || industry().label}</div>
      <button class="zcomp-close" onclick="$('zipComparePanel').style.display='none'">✕</button>
    </div>

    <div class="zcomp-verdict ${overallWinClass(d.winner)}">
      <div class="zcomp-win-label">Recommended Market</div>
      <div class="zcomp-win-zip">${d.winner === zip1 ? (d.zip1_name||zip1) : d.winner === zip2 ? (d.zip2_name||zip2) : 'Tie'}</div>
      <div class="zcomp-win-reason">${d.winner_reason || ''}</div>
    </div>

    <div class="zcomp-grid">
      <div class="zcomp-col-a">
        <div class="zcomp-col-head ${d.winner===zip1?'zcomp-col-winner':''}">
          ${d.winner===zip1?'★ ':''}ZIP ${zip1}
          <span class="zcomp-col-sub">${d.zip1_name||''}</span>
        </div>
      </div>
      <div class="zcomp-col-b">
        <div class="zcomp-col-head ${d.winner===zip2?'zcomp-col-winner':''}">
          ${d.winner===zip2?'★ ':''}ZIP ${zip2}
          <span class="zcomp-col-sub">${d.zip2_name||''}</span>
        </div>
      </div>
    </div>

    <div class="zcomp-metrics-wrap">
      <table class="zcomp-table">
        <thead><tr>
          <th>Metric</th>
          <th>ZIP ${zip1}</th>
          <th>ZIP ${zip2}</th>
          <th>Notes</th>
        </tr></thead>
        <tbody>${metricsHtml}</tbody>
      </table>
    </div>

    <div class="zcomp-pros-grid">
      <div>
        <div class="zcomp-pros-head">ZIP ${zip1} — Strengths</div>
        <ul class="zcomp-pros-list">${prosList(d.zip1_pros, 'pro-a')}</ul>
        ${(d.zip1_cons||[]).length ? `<div class="zcomp-pros-head" style="margin-top:10px">Weaknesses</div><ul class="zcomp-pros-list">${prosList(d.zip1_cons,'con')}</ul>` : ''}
      </div>
      <div>
        <div class="zcomp-pros-head">ZIP ${zip2} — Strengths</div>
        <ul class="zcomp-pros-list">${prosList(d.zip2_pros, 'pro-b')}</ul>
        ${(d.zip2_cons||[]).length ? `<div class="zcomp-pros-head" style="margin-top:10px">Weaknesses</div><ul class="zcomp-pros-list">${prosList(d.zip2_cons,'con')}</ul>` : ''}
      </div>
    </div>

    ${d.recommendation ? `<div class="zcomp-rec">${d.recommendation}</div>` : ''}
    ${(d.data_sources||[]).length ? `<div class="zcomp-sources">Sources: ${d.data_sources.join(' · ')}</div>` : ''}
  </div>`;
  panel.style.display = 'block';
}
