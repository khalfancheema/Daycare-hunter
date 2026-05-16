// ══════════════════════════════════════════════════════════════════
// ACCURACY VERIFIER  (44-verifier.js)
// Cross-checks AI agent outputs (R.a*) vs ground-truth R.real values.
// Called after all agents complete. Renders accuracy score card.
// ══════════════════════════════════════════════════════════════════

(function() {

  // ── Helpers ────────────────────────────────────────────────────

  // Numeric accuracy: 1 - |ai - real| / |real|, clamped [0,1]
  function _acc(ai, real) {
    const a = parseFloat(ai), r = parseFloat(real);
    if (isNaN(a) || isNaN(r) || r === 0) return null;
    return Math.max(0, Math.min(1, 1 - Math.abs(a - r) / Math.abs(r)));
  }

  // Rate accuracy (e.g. unemployment %): max(0, 1 - |delta| / tolerance)
  function _accRate(ai, real, tolerancePp) {
    const a = parseFloat(ai), r = parseFloat(real);
    if (isNaN(a) || isNaN(r)) return null;
    return Math.max(0, 1 - Math.abs(a - r) / (tolerancePp || 3));
  }

  // Safely get nested value
  function _get(obj, path) {
    try {
      return path.split('.').reduce((o, k) => {
        if (o == null) return null;
        if (k.includes('[')) {
          const [key, idx] = k.split('[');
          return (o[key] || [])[parseInt(idx)];
        }
        return o[k];
      }, obj);
    } catch { return null; }
  }

  // Format a number for display
  function _fmt(v, prefix='', suffix='') {
    if (v == null) return '—';
    const n = parseFloat(v);
    if (isNaN(n)) return String(v);
    if (Math.abs(n) >= 1000) return prefix + Math.round(n).toLocaleString() + suffix;
    return prefix + (n % 1 === 0 ? n : n.toFixed(1)) + suffix;
  }

  // ── Main verifier ──────────────────────────────────────────────

  function runAccuracyVerifier() {
    if (!window.R || !R.real) return;

    const checks = [];

    // ── A1 Demographics vs ACS ───────────────────────────────────
    const dem = R.real.demographics;
    const a1  = R.a1;
    if (dem && a1) {
      const cities = (a1.cities || []);
      const city0  = cities[0] || {};

      // Income: first city (closest) vs ZIP ACS median income
      const aiIncome   = city0.median_hh_income;
      const realIncome = dem.median_income;
      if (aiIncome && realIncome) {
        checks.push({
          agent: 'A1', field: 'Median HH Income',
          real: realIncome, ai: aiIncome,
          realFmt: _fmt(realIncome, '$'), aiFmt: _fmt(aiIncome, '$'),
          acc: _acc(aiIncome, realIncome), source: 'ACS 2022',
        });
      }

      // Population: first city vs ZIP ACS pop
      const aiPop   = city0.pop_total;
      const realPop = dem.population;
      if (aiPop && realPop) {
        checks.push({
          agent: 'A1', field: 'Population',
          real: realPop, ai: aiPop,
          realFmt: _fmt(realPop), aiFmt: _fmt(aiPop),
          acc: _acc(aiPop, realPop), source: 'ACS 2022',
        });
      }
    }

    // ── A1 vs FRED unemployment ──────────────────────────────────
    const mac = R.real.macro;
    if (mac && a1) {
      const aiUnemp   = _get(a1, 'metro_overview.unemployment_rate_pct');
      const realUnemp = mac.unemployment;
      if (aiUnemp != null && realUnemp != null) {
        checks.push({
          agent: 'A1', field: 'Unemployment Rate',
          real: realUnemp, ai: aiUnemp,
          realFmt: _fmt(realUnemp, '', '%'), aiFmt: _fmt(aiUnemp, '', '%'),
          acc: _accRate(aiUnemp, realUnemp, 3),
          source: 'FRED',
        });
      }
    }

    // ── A6 vs OSM competitor count ───────────────────────────────
    const osm = R.real.competitors_osm;
    const a6  = R.a6;
    if (osm && a6) {
      const realOsm = osm.count || 0;
      const aiTotal = a6.total_licensed_estimated;
      // OSM count ⊆ total licensed; use lenient tolerance (OSM undercounts)
      if (realOsm > 0 && aiTotal) {
        // AI typically reports more than OSM (includes unlisted centers); tolerate 2× delta
        const osmAcc = Math.max(0, 1 - Math.abs(aiTotal - realOsm) / (realOsm * 2));
        checks.push({
          agent: 'A6', field: 'Competitor Count',
          real: realOsm, ai: aiTotal,
          realFmt: _fmt(realOsm, '', ' (OSM)'), aiFmt: _fmt(aiTotal, '', ' (est.)'),
          acc: osmAcc, source: 'OSM Overpass',
        });
      }
    }

    // ── A7 selected site rent vs HUD FMR (very loose proxy) ─────
    const rents = R.real.rents;
    const a7    = R.a7;
    if (rents && rents.fmr_2br && a7) {
      const siteRent = _get(a7, 'selected_site.monthly_rent');
      if (siteRent) {
        // Commercial rent ≈ 2.5–4× HUD FMR 2BR; use midpoint 3× as baseline
        const estCommercial = rents.fmr_2br * 3;
        checks.push({
          agent: 'A7', field: 'Site Rent (vs HUD×3 proxy)',
          real: estCommercial, ai: siteRent,
          realFmt: _fmt(estCommercial, '$', '/mo'), aiFmt: _fmt(siteRent, '$', '/mo'),
          acc: _acc(siteRent, estCommercial), source: 'HUD FMR×3',
        });
      }
    }

    // ── A7 wages vs BLS weekly wage ──────────────────────────────
    const wages = R.real.wages;
    if (wages && wages.avg_weekly_wage && a7) {
      // A7 stores monthly staffing costs; extract avg per employee if possible
      const fixedCosts = a7.fixed_monthly_costs || a7.one_time_startup_costs || [];
      const staffLine  = fixedCosts.find(c =>
        /staff|wage|salary|payroll|labor/i.test(c.item || '')
      );
      if (staffLine && staffLine.amount) {
        // BLS gives state-level weekly wage; annualize and compare to monthly staff cost / est. employees
        // Monthly staff cost / 20 employees ≈ per-employee monthly salary; ×12/52 → weekly
        const estimatedWeekly = (staffLine.amount / 20) * 12 / 52;
        const realWeekly = wages.avg_weekly_wage;
        if (realWeekly > 0) {
          checks.push({
            agent: 'A7', field: 'Staff Weekly Wage (approx)',
            real: realWeekly, ai: estimatedWeekly,
            realFmt: _fmt(realWeekly, '$', '/wk'), aiFmt: _fmt(estimatedWeekly, '$', '/wk'),
            acc: _acc(estimatedWeekly, realWeekly), source: 'BLS QCEW',
          });
        }
      }
    }

    // ── A6 vs CMS NPI (healthcare only) ─────────────────────────
    const npi = R.real.npi_providers;
    if (npi && npi.count > 0 && a6) {
      const aiTotal = a6.total_licensed_estimated;
      if (aiTotal) {
        const npiAcc = Math.max(0, 1 - Math.abs(aiTotal - npi.count) / (npi.count * 2));
        checks.push({
          agent: 'A6', field: `${npi.taxonomy} Count (NPI)`,
          real: npi.count, ai: aiTotal,
          realFmt: _fmt(npi.count, '', ' (licensed)'), aiFmt: _fmt(aiTotal, '', ' (est.)'),
          acc: npiAcc, source: 'CMS NPI',
        });
      }
    }

    // ── Need at least 2 valid checks to display ──────────────────
    const valid = checks.filter(c => c.acc !== null && !isNaN(c.acc));
    if (valid.length < 2) {
      console.log('[Verifier] Not enough checks to display accuracy card:', valid.length);
      return;
    }

    const avgAcc = valid.reduce((s, c) => s + c.acc, 0) / valid.length;
    const pct    = Math.round(avgAcc * 100);

    R.accuracy = { score: pct, checks: valid, checked_at: Date.now() };
    console.log(`[Verifier] Accuracy score: ${pct}% (${valid.length} checks)`);

    _renderAccuracyCard(pct, valid);
  }

  // ── Render ─────────────────────────────────────────────────────

  function _renderAccuracyCard(pct, checks) {
    const statusEl = document.getElementById('realDataStatus');
    if (!statusEl) return;

    const color = pct >= 85 ? 'var(--green)' : pct >= 70 ? 'var(--amber)' : 'var(--red)';
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : 'D';

    const rows = checks.map(c => {
      const ap  = Math.round(c.acc * 100);
      const col = ap >= 85 ? 'var(--green)' : ap >= 70 ? 'var(--amber)' : 'var(--red)';
      const bar = `<div style="width:${ap}%;height:3px;background:${col};border-radius:2px"></div>`;
      return `<tr style="border-top:1px solid var(--border)">
        <td style="font-size:10px;color:var(--blue);padding:3px 8px;font-weight:700;white-space:nowrap">${c.agent}</td>
        <td style="font-size:10px;color:var(--text);padding:3px 8px">${c.field}</td>
        <td style="font-size:10px;color:var(--muted);padding:3px 8px;font-family:monospace">${c.realFmt}</td>
        <td style="font-size:10px;color:var(--muted);padding:3px 8px;font-family:monospace">${c.aiFmt}</td>
        <td style="padding:3px 8px;min-width:60px">
          <div style="font-size:10px;font-weight:700;color:${col};margin-bottom:2px">${ap}%</div>
          <div style="background:var(--surface3);border-radius:2px;overflow:hidden">${bar}</div>
        </td>
        <td style="font-size:9px;color:var(--faint);padding:3px 8px;white-space:nowrap">${c.source}</td>
      </tr>`;
    }).join('');

    const card = document.createElement('div');
    card.id    = 'rdAccuracyCard';
    card.style.cssText = 'margin-top:10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden';

    card.innerHTML = `
      <div style="padding:10px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-size:22px;font-weight:900;font-family:'Syne',sans-serif;color:${color}">${pct}%</span>
          <span style="font-size:11px;font-weight:700;background:${color};color:#fff;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center">${grade}</span>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;font-family:'Syne',sans-serif;color:var(--text)">Data Accuracy Score</div>
          <div style="font-size:10px;color:var(--faint)">${checks.length} AI fields verified vs live government sources</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
          ${pct >= 85
            ? '<span style="font-size:10px;color:var(--green)">✓ High confidence</span>'
            : pct >= 70
            ? '<span style="font-size:10px;color:var(--amber)">△ Moderate confidence</span>'
            : '<span style="font-size:10px;color:var(--red)">⚠ Review figures</span>'}
        </div>
      </div>
      <div style="overflow-x:auto">
        <table style="border-collapse:collapse;width:100%">
          <thead>
            <tr style="background:var(--surface3)">
              <th style="font-size:9px;color:var(--faint);text-align:left;padding:4px 8px;text-transform:uppercase;letter-spacing:0.06em">Agent</th>
              <th style="font-size:9px;color:var(--faint);text-align:left;padding:4px 8px;text-transform:uppercase;letter-spacing:0.06em">Field</th>
              <th style="font-size:9px;color:var(--faint);text-align:left;padding:4px 8px;text-transform:uppercase;letter-spacing:0.06em">Real</th>
              <th style="font-size:9px;color:var(--faint);text-align:left;padding:4px 8px;text-transform:uppercase;letter-spacing:0.06em">AI Said</th>
              <th style="font-size:9px;color:var(--faint);text-align:left;padding:4px 8px;text-transform:uppercase;letter-spacing:0.06em">Match</th>
              <th style="font-size:9px;color:var(--faint);text-align:left;padding:4px 8px;text-transform:uppercase;letter-spacing:0.06em">Source</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    // Remove old card
    const old = document.getElementById('rdAccuracyCard');
    if (old) old.remove();

    statusEl.appendChild(card);
  }

  // Expose globally
  window.runAccuracyVerifier = runAccuracyVerifier;

})();
