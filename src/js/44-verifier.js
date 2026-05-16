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

    // ── A1 median wage vs BLS avg weekly wage ───────────────────
    const wages0 = R.real.wages;
    if (wages0 && wages0.avg_weekly_wage && a1) {
      // A1 labor_market_summary.median_wage_primary_occupation is annual
      const aiAnnual = _get(a1, 'labor_market_summary.median_wage_primary_occupation');
      if (aiAnnual && aiAnnual > 0) {
        const aiWeekly  = aiAnnual / 52;
        const realWeekly = wages0.avg_weekly_wage;
        checks.push({
          agent: 'A1', field: 'Median Occupation Wage',
          real: realWeekly, ai: aiWeekly,
          realFmt: _fmt(realWeekly, '$', '/wk'), aiFmt: _fmt(aiWeekly, '$', '/wk'),
          acc: _acc(aiWeekly, realWeekly), source: 'BLS QCEW',
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

    // ── A2 gap score direction vs ZBP business density ──────────
    // If ZBP shows 0 competitors in ZIP, A2 gap score should be high (>=7)
    // If ZBP shows many competitors, gap score should be lower
    const zbp = R.real.business_density;
    const a2  = R.a2;
    if (zbp != null && a2 && a2.overall_opportunity_score) {
      const zbpCount   = zbp.count || 0;
      const gapScore   = a2.overall_opportunity_score;         // 0-100 scale
      // Normalize: expect high gap when zbpCount low, low gap when zbpCount high
      // Cap zbpCount at 20 for scoring (above 20 = saturated)
      const expectedGap = Math.max(0, 100 - zbpCount * 5);
      const gapAcc = Math.max(0, 1 - Math.abs(gapScore - expectedGap) / 50);
      checks.push({
        agent: 'A2', field: 'Opportunity Score (vs ZBP density)',
        real: expectedGap, ai: gapScore,
        realFmt: _fmt(expectedGap, '', ' (expected)'), aiFmt: _fmt(gapScore, '', '/100'),
        acc: gapAcc, source: 'Census ZBP',
      });
    }

    // ── A4 real estate rent vs HUD FMR residential proxy ────────
    const a4 = R.a4;
    if (rents && rents.fmr_2br && a4) {
      // A4 stores recommended monthly rent per sqft or total monthly rent
      const a4Rent = _get(a4, 'selected_property.monthly_rent') ||
                     _get(a4, 'best_option.monthly_rent') ||
                     _get(a4, 'options[0].monthly_rent');
      if (a4Rent) {
        const estCommercial = rents.fmr_2br * 3;
        checks.push({
          agent: 'A4', field: 'Selected Property Rent (vs HUD×3)',
          real: estCommercial, ai: a4Rent,
          realFmt: _fmt(estCommercial, '$', '/mo'), aiFmt: _fmt(a4Rent, '$', '/mo'),
          acc: _acc(a4Rent, estCommercial), source: 'HUD FMR×3',
        });
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

    // ── A1 education bachelors+ % vs ACS ─────────────────────────
    // ACS: bachelors count / population × 100 = real bachelors+ %
    // A1 Part 2: education_attainment.bachelors_pct + graduate_pct
    if (dem && dem.bachelors && dem.population && a1) {
      const realEduPct = (dem.bachelors / dem.population) * 100;
      const aiEdu = a1.education_attainment;
      if (aiEdu && (aiEdu.bachelors_pct != null || aiEdu.graduate_pct != null)) {
        const aiBaPct = (aiEdu.bachelors_pct || 0) + (aiEdu.graduate_pct || 0);
        if (aiBaPct > 0 && realEduPct > 0) {
          checks.push({
            agent: 'A1', field: 'Bachelors+ Attainment %',
            real: realEduPct, ai: aiBaPct,
            realFmt: _fmt(realEduPct, '', '%'), aiFmt: _fmt(aiBaPct, '', '%'),
            acc: _accRate(aiBaPct, realEduPct, 15), // ±15pp tolerance (metro vs ZIP)
            source: 'ACS B15003',
          });
        }
      }
    }

    // ── A1 renter % vs ACS tenure ────────────────────────────────
    // ACS: renter_pct; A1 cities[0].renter_pct
    if (dem && dem.renter_pct != null && a1) {
      const city0r = (a1.cities || [])[0] || {};
      const aiRenter = city0r.renter_pct;
      if (aiRenter != null) {
        checks.push({
          agent: 'A1', field: 'Renter-Occupied %',
          real: dem.renter_pct, ai: aiRenter,
          realFmt: _fmt(dem.renter_pct, '', '%'), aiFmt: _fmt(aiRenter, '', '%'),
          acc: _accRate(aiRenter, dem.renter_pct, 10), // ±10pp tolerance
          source: 'ACS B25003',
        });
      }
    }

    // ── A1 households vs ACS ─────────────────────────────────────
    // ACS: households (owner + renter occ); A1 cities[0].households
    if (dem && dem.households && a1) {
      const city0h = (a1.cities || [])[0] || {};
      const aiHH = city0h.households;
      if (aiHH && aiHH > 0) {
        checks.push({
          agent: 'A1', field: 'Households',
          real: dem.households, ai: aiHH,
          realFmt: _fmt(dem.households), aiFmt: _fmt(aiHH),
          acc: _acc(aiHH, dem.households), source: 'ACS B25003',
        });
      }
    }

    // ── A7 SBA loan amount vs SBA FOIA avg ───────────────────────
    // SBA FOIA: avg_loan_amount in area; A7 funding[0].amount (SBA 7(a) tranche)
    const sba = R.real.sba;
    const a7v = R.a7;
    if (sba && sba.avg_loan_amount && sba.loan_count >= 3 && a7v) {
      const funding = a7v.funding || [];
      const sbaLine = funding.find(f => /sba|7\(a\)|small business/i.test(f.source || ''));
      if (sbaLine && sbaLine.amount > 0) {
        // Requested loan vs avg in area — use very loose tolerance (4×); they legitimately differ
        const sbaAcc = Math.max(0, 1 - Math.abs(sbaLine.amount - sba.avg_loan_amount) / (sba.avg_loan_amount * 4));
        checks.push({
          agent: 'A7', field: 'SBA Loan Amount (vs area avg)',
          real: sba.avg_loan_amount, ai: sbaLine.amount,
          realFmt: _fmt(sba.avg_loan_amount, '$', ' avg'), aiFmt: _fmt(sbaLine.amount, '$', ' requested'),
          acc: sbaAcc, source: 'SBA FOIA',
        });
      }
    }

    // ── A9 year1 revenue consistency vs A7 base case ─────────────
    // A9 builds on A7; year1 revenue should be within 30% of A7 base monthly×12
    const a9 = R.a9;
    if (a7v && a9) {
      const a9rev = _get(a9, 'financial_plan.year1_projections.revenue');
      const scenarios = a7v.scenarios || [];
      const base = scenarios.find(s => /base/i.test(s.name || '')) || scenarios[1];
      if (a9rev && base && base.monthly_revenue) {
        const a7annual = base.monthly_revenue * 12;
        checks.push({
          agent: 'A9', field: 'Year-1 Revenue (vs A7 base)',
          real: a7annual, ai: a9rev,
          realFmt: _fmt(a7annual, '$', '/yr (A7)'), aiFmt: _fmt(a9rev, '$', '/yr (A9)'),
          acc: _acc(a9rev, a7annual), source: 'Cross-agent',
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
