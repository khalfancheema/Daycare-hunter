// ══════════════════════════════════════════════════════════
// SOURCES & CITATIONS AGENT  (28-agent-sources.js)
// Agent 17 — Collects data sources used across all agents
// (R.a1–R.a16), runs one AI call to validate/complete the
// list, then renders in out-17 with 4 tabs.
// ══════════════════════════════════════════════════════════

async function runAgent17() {
  setDot(17, 'running');
  showOut(17);
  const out = $('out-17');
  if (out) out.innerHTML = `<div style="padding:16px">${subProgress(1, 1, 'Collecting & validating sources…')}</div>`;

  // Demo mode early-return (parity with all other agents)
  if (demoMode && typeof getDemoData === 'function') {
    const _d = getDemoData(17);
    if (_d) {
      R.a17 = _d;
      try { renderAgent17(_d); } catch(e) {}
      setDot(17, 'done');
      return JSON.stringify(_d);
    }
  }

  const ind = industry();

  // ── Collect partial data from completed agents ──────────
  // Cap each agent snippet to ~500 chars so total context stays well under
  // the input window even when all 16 upstream agents have completed.
  // (16 agents × 1200 chars = ~19KB was excessive for an audit summary.)
  function safeStr(key) {
    try {
      const v = R[key];
      if (!v) return '';
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      return s.substring(0, 500);
    } catch (e) { return ''; }
  }

  const agentSummaries = [
    { id: 'a1',  label: 'Agent 1 — Demographics',          snippet: safeStr('a1')  },
    { id: 'a2',  label: 'Agent 2 — Gap Analysis',           snippet: safeStr('a2')  },
    { id: 'a3',  label: 'Agent 3 — Site Selection',         snippet: safeStr('a3')  },
    { id: 'a4',  label: 'Agent 4 — Real Estate Listings',   snippet: safeStr('a4')  },
    { id: 'a5',  label: 'Agent 5 — Compliance',             snippet: safeStr('a5')  },
    { id: 'a6',  label: 'Agent 6 — Competitor Analysis',    snippet: safeStr('a6')  },
    { id: 'a7',  label: 'Agent 7 — Financial Model',        snippet: safeStr('a7')  },
    { id: 'a8',  label: 'Agent 8 — Executive Summary',      snippet: safeStr('a8')  },
    { id: 'a9',  label: 'Agent 9 — Business Plan',          snippet: safeStr('a9')  },
    { id: 'a10', label: 'Agent 10 — Project Plan',          snippet: safeStr('a10') },
    { id: 'a11', label: 'Agent 11 — Market Map / Grants',   snippet: safeStr('a11') },
    { id: 'a12', label: 'Agent 12 — Grants',                snippet: safeStr('a12') },
    { id: 'a13', label: 'Agent 13 — Competitor Messaging',  snippet: safeStr('a13') },
    { id: 'a14', label: 'Agent 14 — Code Review',           snippet: safeStr('a14') },
    { id: 'a15', label: 'Agent 15 — QA Testing',            snippet: safeStr('a15') },
    { id: 'a16', label: 'Agent 16 — Build vs Buy',          snippet: safeStr('a16') },
  ].filter(a => a.snippet);

  const agentContext = agentSummaries
    .map(a => `[${a.label}]: ${a.snippet}`)
    .join('\n\n');

  const sys = `You are a research methodology auditor for a ${ind.unit} business planning system. Return JSON only. Be thorough — flag every data source used and every claim that cannot be independently verified.`;
  const usr = `Audit all data sources and claims used across this ${ind.unit} business planning analysis for ZIP ${zip()}, budget $${parseInt(budget()).toLocaleString()}.

AGENT OUTPUTS (summarized):
${agentContext}

Return ONLY:
{
  "summary": "This analysis drew on X primary data sources across Y categories",
  "data_sources": [
    {
      "category": "Demographics",
      "source": "U.S. Census Bureau American Community Survey 5-Year Estimates",
      "url": "https://data.census.gov",
      "data_used": "Population by age group, household income, employment status for ZIP codes in analysis radius",
      "agent": "Agent 1 — Demographics",
      "reliability": "High",
      "last_updated": "2023 (5-Year ACS 2019-2023)"
    }
  ],
  "data_quality_notes": [
    {
      "note": "Note about data quality, recency, or limitation",
      "severity": "Warning|Info"
    }
  ],
  "sourced_claims": [
    {
      "claim": "Specific quantitative claim made in the analysis",
      "source": "Data source name",
      "verifiable": true
    }
  ],
  "unable_to_source": [
    {
      "claim": "Claim that could not be independently verified",
      "reason": "Why it cannot be sourced — AI estimate, no public dataset, proprietary data, etc.",
      "agent": "Which agent made this claim"
    }
  ]
}

Important: Be honest. Flag every number or statistic the AI generated as an estimate that has no public data source. Mark those in unable_to_source. Only mark verifiable:true in sourced_claims if a real public dataset exists.`;

  try {
    _setDemoKey(17);
    let d = await claudeJSON(sys, usr, {webSearch:true});
    if (!d) { d = _fallbackSources17(agentSummaries); }

    R.a17 = d;
    renderAgent17(d);
    setDot(17, 'done');
    return JSON.stringify(d);
  } catch (e) {
    setDot(17, 'error');
    if (out) out.innerHTML = `<div class="prose" style="color:var(--red);padding:16px">Error: ${e.message}</div>`;
    throw e;
  }
}

function _fallbackSources17(agentSummaries) {
  return {
    summary: `Analysis drew on ${agentSummaries.length} agent outputs. Source validation could not be completed.`,
    data_sources: [],
    data_quality_notes: [{note: 'Source validation failed — review agent outputs manually.', severity: 'Warning'}],
    sourced_claims: [],
    unable_to_source: []
  };
}

function renderAgent17(d) {
  if (!d) return;
  const out = $('out-17');
  if (!out) return;

  const sources    = d.data_sources     || [];
  const notes      = d.data_quality_notes || [];
  const claimed    = d.sourced_claims   || [];
  const unsourced  = d.unable_to_source || [];

  // ── Stats ────────────────────────────────────────────────
  const totalSources  = sources.length;
  const highRelPct    = totalSources
    ? Math.round(sources.filter(s => (s.reliability || '').toLowerCase() === 'high').length / totalSources * 100)
    : 0;
  const claimedCount   = claimed.length;
  const unsourcedCount = unsourced.length;

  // ── Group sources by category ────────────────────────────
  const grouped = {};
  sources.forEach(s => {
    const cat = s.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  const relBadge  = r => (r || '').toLowerCase() === 'high'   ? 'b-green'
                       : (r || '').toLowerCase() === 'medium' ? 'b-amber'
                       :                                         'b-red';
  const sevBadge  = s => s === 'Warning' ? 'b-amber' : 'b-blue';

  // ── Tab shell ────────────────────────────────────────────
  // IMPORTANT: panels must NOT have display: in their inline style —
  // tab() toggles via .panel{display:none} / .panel.active{display:block} CSS rules.
  out.innerHTML = `
    <div class="tabs">
      <button class="tab active" onclick="tab('17','sum')">Summary</button>
      <button class="tab"        onclick="tab('17','src')">All Sources</button>
      <button class="tab"        onclick="tab('17','claims')">Sourced Claims</button>
      <button class="tab"        onclick="tab('17','unsrc')">Unable to Source</button>
    </div>

    <div id="17-sum" class="panel active">
      <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
        <div style="font-size:13px;line-height:1.7;color:var(--muted)">${d.summary || ''}</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
          ${_srcStat17('Total Sources',        totalSources,     'var(--blue)')}
          ${_srcStat17('High Reliability',     highRelPct + '%', highRelPct >= 70 ? 'var(--green)' : 'var(--amber)')}
          ${_srcStat17('Claims Sourced',       claimedCount,     'var(--green)')}
          ${_srcStat17('Unable to Source',     unsourcedCount,   unsourcedCount > 5 ? 'var(--red)' : 'var(--amber)')}
        </div>
        ${notes.length ? `<div style="display:flex;flex-direction:column;gap:6px">
          <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Data Quality Notes</div>
          ${notes.map(n => `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:var(--surface2);border-radius:6px;border:1px solid var(--border)">
            <span class="badge ${sevBadge(n.severity)}">${n.severity || 'Info'}</span>
            <span style="font-size:12px;color:var(--text);line-height:1.6">${n.note || ''}</span>
          </div>`).join('')}
        </div>` : ''}
      </div>
    </div>

    <div id="17-src" class="panel">
      <div style="padding:16px;display:flex;flex-direction:column;gap:14px">
        ${Object.keys(grouped).length
          ? Object.entries(grouped).map(([cat, items]) => `
            <div>
              <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--blue);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">${cat} (${items.length})</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                ${items.map(s => `
                  <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:5px">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
                      <div style="font-size:13px;font-weight:700;font-family:'Syne',sans-serif">${s.source || ''}</div>
                      <span class="badge ${relBadge(s.reliability)}">${s.reliability || 'Unknown'}</span>
                    </div>
                    <div style="font-size:11px;color:var(--muted)">${s.agent || ''}</div>
                    ${s.data_used    ? `<div style="font-size:12px;color:var(--text);line-height:1.6">${s.data_used}</div>` : ''}
                    ${s.last_updated ? `<div style="font-size:10px;color:var(--muted)">Last updated: ${s.last_updated}</div>` : ''}
                    ${s.url ? `<a href="${s.url}" target="_blank" class="link-btn" style="font-size:11px;width:fit-content">↗ Open Source</a>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>`).join('')
          : `<div class="prose" style="color:var(--muted)">No sources catalogued.</div>`}
      </div>
    </div>

    <div id="17-claims" class="panel">
      <div style="padding:16px">
        ${claimed.length
          ? `<div class="tbl-wrap"><table class="tbl">
              <thead><tr><th>Claim</th><th>Source</th><th>Verifiable</th></tr></thead>
              <tbody>
                ${claimed.map(c => `<tr>
                  <td style="font-size:12px">${c.claim || ''}</td>
                  <td style="font-size:12px;color:var(--muted)">${c.source || ''}</td>
                  <td><span class="badge ${c.verifiable ? 'b-green' : 'b-amber'}">${c.verifiable ? 'Yes' : 'Partial'}</span></td>
                </tr>`).join('')}
              </tbody>
            </table></div>`
          : `<div class="prose" style="color:var(--muted)">No sourced claims recorded.</div>`}
      </div>
    </div>

    <div id="17-unsrc" class="panel">
      <div style="padding:16px;display:flex;flex-direction:column;gap:8px">
        ${unsourced.length
          ? `<div style="padding:8px 12px;background:var(--surface2);border:1px solid var(--amber);border-radius:8px;font-size:12px;color:var(--amber);margin-bottom:4px">
              These ${unsourced.length} claim(s) were generated by the AI and could not be verified against a public data source. Treat them as estimates.
            </div>
            ${unsourced.map(u => `
              <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:4px">
                <div style="font-size:13px;font-weight:700;font-family:'Syne',sans-serif">${u.claim || ''}</div>
                <div style="font-size:11px;color:var(--muted)">${u.agent || ''}</div>
                <div style="font-size:12px;color:var(--amber)">${u.reason || ''}</div>
              </div>`).join('')}`
          : `<div class="prose" style="color:var(--green)">All claims were successfully sourced.</div>`}
      </div>
    </div>`;

  // activate first tab
  tab('17', 'sum');
}

function _srcStat17(label, value, color) {
  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px">
    <div style="font-size:10px;font-weight:700;font-family:'Syne',sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">${label}</div>
    <div style="font-size:22px;font-weight:700;font-family:'Syne',sans-serif;color:${color}">${value}</div>
  </div>`;
}
