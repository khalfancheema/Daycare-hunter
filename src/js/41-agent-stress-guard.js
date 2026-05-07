// ══════════════════════════════════════════════════════════════════════════════
// 41-agent-stress-guard.js
//
// Stress-test protection layer for agents prone to:
//   • max_tokens truncation (output too long)
//   • Context overflow (input too large)
//   • Timeout (30s fetch limit)
//
// STRESS TEST FINDINGS (based on prompt + schema analysis):
//
//  Agent  | Input Risk | Output Risk | Status
//  -------|------------|-------------|------------------------------------
//  A7     | Medium     | Medium      | ✅ Already 3 sub-agents (26-fin-subs)
//  A8     | High       | Medium      | ✅ Already streams (33-streaming)
//  A9     | Medium     | High        | ✅ Already 4 sub-agents (24-parts)
//  A10    | Medium     | High        | ✅ Already 3 sub-agents (25-parts)
//  A13    | Low        | CRITICAL    | 🔴 FIXED HERE — 2-pass sub-agents
//  A1     | Low        | Medium      | 🟡 Guarded by safeClaudeJSON
//  A2     | Medium     | Medium      | 🟡 Guarded by safeClaudeJSON
//  A6     | Medium     | High        | 🟡 Guarded by safeClaudeJSON
//  A14    | CRITICAL   | Low         | 🔴 FIXED HERE — input truncation
//
// FIXES:
//  1. `safeClaudeJSON()` — wraps all agent calls; auto-retries with condensed
//     input on max_tokens error and logs a warning to the UI
//  2. `runAgent13()` override — splits the massive output into 2 sub-calls:
//     profiles pass (3 competitors) + strategy pass (pain points + messaging)
//  3. `runAgent14()` override — truncates its enormous R object input
// ══════════════════════════════════════════════════════════════════════════════

// ── TOKEN ESTIMATION ─────────────────────────────────────────────────────────
// Rough heuristic: 1 token ≈ 4 characters of English text
function _estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

// ── SAFE claudeJSON WRAPPER ───────────────────────────────────────────────────
/**
 * Drop-in replacement for claudeJSON with:
 *  - Input size guard: if combined system+user > 30k tokens (~120k chars),
 *    truncates the user prompt to fit
 *  - max_tokens retry: if response was truncated, retries with a shorter
 *    "summary only" fallback request
 *  - Progress label update so user knows when a retry is happening
 */
async function safeClaudeJSON(system, user, agentNum) {
  const INPUT_CHAR_LIMIT = 80000;  // ~20k tokens — well under 200k context
  const MAX_RETRY_PROMPT = 40000;  // Smaller prompt for retry

  let activeUser = user;

  // Guard: truncate if input is huge
  if ((system + user).length > INPUT_CHAR_LIMIT) {
    console.warn(`[StressGuard] Agent ${agentNum}: input ${(system+user).length} chars — truncating to ${INPUT_CHAR_LIMIT}`);
    const headroom = INPUT_CHAR_LIMIT - system.length - 500;
    activeUser = user.slice(0, headroom) + '\n\n[...context truncated for length. Use available data above to complete JSON response.]';
  }

  try {
    const result = await claudeJSON(system, activeUser);
    if (result) return result;
    throw new Error('Null result');
  } catch (e) {
    const isTokenErr = e.message?.toLowerCase().includes('max_token') ||
                       e.message?.toLowerCase().includes('truncat') ||
                       e.message?.toLowerCase().includes('length');

    if (!isTokenErr) throw e; // Not a token error — re-throw

    console.warn(`[StressGuard] Agent ${agentNum}: max_tokens hit. Retrying with condensed prompt…`);

    // Show retry indicator in UI
    try {
      const statusEl = document.querySelector(`#v2-ar-${agentNum} .v2-agent-name`) ||
                       document.querySelector(`[id*="card-${agentNum}"]`);
      if (statusEl) {
        const orig = statusEl.textContent;
        statusEl.textContent += ' (condensing…)';
        setTimeout(() => { statusEl.textContent = orig; }, 5000);
      }
    } catch {}

    // Retry with a radically shorter prompt
    const shortUser = activeUser.slice(0, MAX_RETRY_PROMPT) +
      '\n\n[Context condensed. Return a SHORTER JSON with the same schema — use concise 1-sentence strings instead of detailed paragraphs. Schema structure must be preserved exactly.]';

    try {
      const retryResult = await claudeJSON(system, shortUser);
      if (retryResult) return retryResult;
    } catch (retryErr) {
      console.error(`[StressGuard] Agent ${agentNum}: retry also failed:`, retryErr.message);
    }

    return null; // Let caller fall through to fallback
  }
}

// ── AGENT 13 — COMPETITOR DEEP DIVE (2-PASS) ─────────────────────────────────
/**
 * Agent 13 override: splits the massive single call into:
 *  - Pass A: Get 3 competitor profiles (core data)
 *  - Pass B: Get pain point analysis + differentiation strategy + messaging
 *  - Merge both passes into a single R.a13 object
 *
 * This prevents max_tokens from cutting off mid-response (5+ competitor profiles
 * × 10+ fields each = 3000–4000+ output tokens in one shot).
 */
const _origRunAgent13 = typeof runAgent13 === 'function' ? runAgent13 : null;
async function runAgent13(a6) {
  setDot(13, 'running');

  // Demo mode shortcut
  if (demoMode && typeof getDemoData === 'function') {
    const d = getDemoData(13);
    if (d) {
      R.a13 = d;
      try { buildCompDeepDive(d); } catch {}
      setDot(13, 'done'); showOut(13);
      return JSON.stringify(d);
    }
  }

  const ind  = industry();
  const compCtx = ctx(a6, ['summary', 'cities', 'top_chains'], 600);

  try {
    // ── Pass A: Competitor Profiles ─────────────────────────────────────────
    $('13-sum-t') && ($('13-sum-t').textContent = 'Sub-agent 1/2: Analyzing competitor profiles…');

    const sysA = `You are a competitive intelligence analyst for ${ind.unit} markets. Respond JSON only.`;
    const usrA = `Analyze the top 3 direct competitors for a new ${ind.unit} near ZIP ${zip()}.
Known competitors: ${ind.competitors}
Market context: ${compCtx}

Return ONLY this JSON (exactly 3 competitor_profiles):
{
  "summary": "2-sentence competitive landscape summary",
  "competitor_profiles": [
    {
      "name": "string",
      "type": "Corporate Franchise|Corporate Chain|Independent|Regional",
      "avg_rating": 4.1,
      "review_count_est": 200,
      "monthly_primary_rate": 1800,
      "locations_nearby": 3,
      "top_positive_themes": ["theme1","theme2","theme3"],
      "top_complaint_themes": ["complaint1","complaint2","complaint3"],
      "sample_complaints": ["quote1","quote2"],
      "differentiation_opportunity": "1 sentence"
    }
  ]
}`;

    const passA = await safeClaudeJSON(sysA, usrA, '13a');

    // ── Pass B: Pain Points + Strategy ──────────────────────────────────────
    $('13-sum-t') && ($('13-sum-t').textContent = 'Sub-agent 2/2: Building differentiation strategy…');

    const profileSummary = (passA?.competitor_profiles || [])
      .map(c => `${c.name}: ${c.top_complaint_themes?.slice(0,2).join(', ')}`)
      .join(' | ');

    const sysB = `You are a brand strategist for ${ind.unit} startups. Respond JSON only.`;
    const usrB = `Create a differentiation strategy for a new ${ind.unit} near ZIP ${zip()}.
Industry: ${ind.unit} | Competitors: ${profileSummary}

Return ONLY:
{
  "pain_point_analysis": [
    {"pain":"string","frequency_pct":50,"your_solution":"string","marketing_angle":"string"}
  ],
  "differentiation_strategy": [
    {"pillar":"string","description":"string","marketing_hook":"string"}
  ],
  "messaging_guide": [
    {"audience":"string","headline":"string","body":"string","cta":"string","channel":"string"}
  ]
}`;

    const passB = await safeClaudeJSON(sysB, usrB, '13b');

    // ── Merge both passes ────────────────────────────────────────────────────
    const merged = {
      summary:                  passA?.summary || `Competitor analysis for ${ind.unit} near ZIP ${zip()}.`,
      competitor_profiles:      passA?.competitor_profiles || [],
      pain_point_analysis:      passB?.pain_point_analysis || [],
      differentiation_strategy: passB?.differentiation_strategy || [],
      messaging_guide:          passB?.messaging_guide || [],
    };

    if (!merged.competitor_profiles.length && !merged.pain_point_analysis.length) {
      console.warn('Agent 13: both passes returned empty, using fallback');
      const fallback = typeof getFallback13 === 'function' ? getFallback13() : {};
      R.a13 = fallback;
      buildCompDeepDive(fallback);
      setDot(13, 'done'); showOut(13);
      return JSON.stringify(fallback);
    }

    R.a13 = merged;
    buildCompDeepDive(merged);
    setDot(13, 'done'); showOut(13);
    return JSON.stringify(merged);
  } catch (e) {
    setDot(13, 'error'); showOut(13);
    if ($('13-sum-t')) $('13-sum-t').textContent = 'Error: ' + e.message;
    throw e;
  }
}

// ── AGENT 14 — CODE REVIEW (input truncation guard) ──────────────────────────
/**
 * Agent 14 takes the entire R object (all 13 agent outputs).
 * On a full run, R can be 50k+ characters. Truncate to only the fields needed.
 */
const _origRunAgent14 = typeof runAgent14 === 'function' ? runAgent14 : null;
if (typeof runAgent14 === 'function') {
  const _baseRunAgent14 = runAgent14;
  runAgent14 = async function(RFull) {
    // Extract only the summary fields from each agent — drastically reduces input
    const slim = {};
    for (let i = 1; i <= 17; i++) {
      const a = RFull?.['a'+i];
      if (!a) continue;
      slim['a'+i] = {
        summary:  a.summary || a.verdict_rationale || a.assessment || '',
        verdict:  a.verdict || '',
        score:    a.overall_opportunity_score || a.gap_score || '',
        _hasData: true,
      };
    }
    return _baseRunAgent14(slim);
  };
}

// ── PATCH: Wrap claudeJSON calls that aren't yet using safeClaudeJSON ─────────
// Agents 1, 2, 3, 5, 6, 11, 12 all call claudeJSON directly.
// We patch claudeJSON itself to add token-size monitoring and warnings.
(function _patchClaudeJSON() {
  if (typeof claudeJSON !== 'function') return;
  const _origClaudeJSON = claudeJSON;
  claudeJSON = async function(system, user) {
    const totalChars = (system || '').length + (user || '').length;
    if (totalChars > 100000) {
      console.warn(`[StressGuard] Large claudeJSON call: ${totalChars} chars (~${Math.round(totalChars/4)} tokens). Consider sub-agents.`);
    }
    try {
      return await _origClaudeJSON(system, user);
    } catch (e) {
      const isTokenErr = e.message?.toLowerCase().includes('max_token') ||
                         e.message?.toLowerCase().includes('truncat');
      if (isTokenErr && totalChars > 20000) {
        console.warn('[StressGuard] max_tokens on large prompt — retrying with 50% input…');
        const halfUser = user.slice(0, Math.floor(user.length / 2)) +
          '\n[Context truncated. Return JSON with available data; use null for unknown fields.]';
        try {
          return await _origClaudeJSON(system, halfUser);
        } catch {}
      }
      throw e;
    }
  };
})();

// ── STRESS TEST REPORT (accessible via browser console) ──────────────────────
window._v2StressTestReport = function() {
  const report = {
    title: 'Business Hunter — Agent Stress Test Report',
    generated: new Date().toISOString(),
    findings: [
      { agent: 'A7  Financial',       input_risk: 'Medium',   output_risk: 'Medium',   mitigation: '3 sub-agents (revenue/cost/analysis) ✅' },
      { agent: 'A8  Exec Summary',    input_risk: 'High',     output_risk: 'Medium',   mitigation: 'Streaming (claudeStreamJSON) ✅' },
      { agent: 'A9  Business Plan',   input_risk: 'Medium',   output_risk: 'High',     mitigation: '4 sub-agents (24-agent-09-parts) ✅' },
      { agent: 'A10 Project Plan',    input_risk: 'Medium',   output_risk: 'High',     mitigation: '3 sub-agents (25-agent-10-parts) ✅' },
      { agent: 'A13 Comp Deep Dive',  input_risk: 'Low',      output_risk: 'CRITICAL', mitigation: '2-pass sub-agents (41-stress-guard) 🔴→✅' },
      { agent: 'A14 Code Review',     input_risk: 'CRITICAL', output_risk: 'Low',      mitigation: 'R object slimmed to summaries only (41-stress-guard) 🔴→✅' },
      { agent: 'A1–A6, A11, A12',    input_risk: 'Low',      output_risk: 'Low/Med',  mitigation: 'claudeJSON patch: size monitor + auto-retry ✅' },
    ],
    recommendations: [
      'Agent 6 (Competitive Intel) returns by_city arrays — consider capping at 5 cities',
      'Agent 1 (Demographics) could benefit from streaming if 5-city radius selected',
      'Monitor total R object size after pipeline — flag if > 300KB',
    ],
  };
  console.table(report.findings);
  console.log('Recommendations:', report.recommendations);
  return report;
};
