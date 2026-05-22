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

    // Track which agents fired their fallback — these get EXCLUDED from
    // the consistency score because comparing baseline placeholder data
    // against real government data produces a false high or low score.
    const fallbackAgents = [];
    for (let n = 1; n <= 17; n++) {
      const a = R['a' + n];
      if (a && a._is_fallback) fallbackAgents.push(n);
    }

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

    // ══ Phase E: NEW verifier checks for accuracy upgrade sources ══

    // ── A1 female labor force participation vs ACS S2301 ─────────
    const acsX = R.real.acs_expanded;
    if (acsX && acsX.female_lfp_pct != null && a1) {
      const city0lfp = (a1.cities || [])[0] || {};
      const aiFemLFP = city0lfp.women_25_44_lfp_pct;
      if (aiFemLFP != null && aiFemLFP > 0) {
        checks.push({
          agent: 'A1', field: 'Female Labor Force Participation',
          real: acsX.female_lfp_pct, ai: aiFemLFP,
          realFmt: _fmt(acsX.female_lfp_pct, '', '%'), aiFmt: _fmt(aiFemLFP, '', '%'),
          acc: _accRate(aiFemLFP, acsX.female_lfp_pct, 12),
          source: 'ACS S2301',
        });
      }
    }

    // ── A1 poverty rate vs ACS B17001 ────────────────────────────
    if (acsX && acsX.poverty_pct != null && a1) {
      const city0p = (a1.cities || [])[0] || {};
      const aiPov = city0p.poverty_rate_pct || _get(a1, 'metro_overview.poverty_rate_pct');
      if (aiPov != null && aiPov > 0) {
        checks.push({
          agent: 'A1', field: 'Poverty Rate',
          real: acsX.poverty_pct, ai: aiPov,
          realFmt: _fmt(acsX.poverty_pct, '', '%'), aiFmt: _fmt(aiPov, '', '%'),
          acc: _accRate(aiPov, acsX.poverty_pct, 8),
          source: 'ACS B17001',
        });
      }
    }

    // ── A4 rent vs HUD FMR or ACS median gross rent ──────────────
    const a4v = R.a4;
    const hudFmr = R.real.hud_fmr;
    const acsRentBenchmark = (hudFmr && hudFmr.fmr_2br) || (acsX && acsX.median_gross_rent);
    if (acsRentBenchmark && a4v) {
      const byCity = a4v.by_city_summary || [];
      const c0 = byCity[0] || {};
      // Estimate monthly rent from $/sqft × typical 2000sqft commercial space
      const aiSqftCost = c0.avg_rent_sqft || c0.avg_rent_per_sqft;
      if (aiSqftCost && aiSqftCost > 0) {
        const aiMonthly = aiSqftCost * 2000 / 12; // annual rent/sqft × 2000sqft / 12 mo
        // Use 1.5× residential as commercial floor benchmark
        const benchmark = acsRentBenchmark * 1.5;
        checks.push({
          agent: 'A4', field: 'Commercial Rent (vs HUD/ACS×1.5)',
          real: benchmark, ai: aiMonthly,
          realFmt: _fmt(benchmark, '$', '/mo'), aiFmt: _fmt(aiMonthly, '$', '/mo'),
          acc: Math.max(0, 1 - Math.abs(aiMonthly - benchmark) / (benchmark * 1.5)),
          source: hudFmr ? 'HUD FMR' : 'ACS B25064',
        });
      }
    }

    // ── A6 competitor count vs CBP county (NAICS-specific) ──────
    const cbp = R.real.cbp_county;
    const a6v = R.a6;
    if (cbp && cbp.establishments > 0 && a6v) {
      const aiTotal = a6v.total_licensed_estimated;
      if (aiTotal && aiTotal > 0) {
        checks.push({
          agent: 'A6', field: 'Competitor Count (CBP county)',
          real: cbp.establishments, ai: aiTotal,
          realFmt: _fmt(cbp.establishments, '', ' establishments'),
          aiFmt: _fmt(aiTotal, '', ' estimated'),
          acc: Math.max(0, 1 - Math.abs(aiTotal - cbp.establishments) / (cbp.establishments * 2)),
          source: 'Census CBP',
        });
      }
    }

    // ── A7 staff wages vs BLS OES occupation median ──────────────
    const oes = R.real.bls_oes;
    if (oes && oes.median_annual_wage && a7v) {
      // Look for staff wage in monthly_ops or scenarios
      const opsItems = a7v.monthly_ops || [];
      const staffLine = opsItems.find(i => /staff|wages|salaries|labor|payroll/i.test(i.item || ''));
      if (staffLine && staffLine.amount > 0) {
        // Estimate annual per-staff: monthly staff cost / typical staff count for industry
        const aiAnnual = staffLine.amount * 12;
        // Tolerance: ±50% since one-line staff cost ≠ single-occupation wage
        const acc = Math.max(0, 1 - Math.abs(aiAnnual / oes.median_annual_wage - 1) / 2);
        checks.push({
          agent: 'A7', field: `${oes.occupation} Wage`,
          real: oes.median_annual_wage, ai: aiAnnual,
          realFmt: _fmt(oes.median_annual_wage, '$', '/yr median'),
          aiFmt: _fmt(aiAnnual, '$', '/yr total payroll'),
          acc, source: 'BLS OES',
        });
      }
    }

    // ── A2 NDCP infant rate vs DOL NDCP county data (daycare only) ─
    const ndcp = R.real.ndcp_county;
    const a2v = R.a2;
    if (ndcp && ndcp.median_infant_center && a2v) {
      const aiInfant = a2v.ndcp_median_infant_rate;
      if (aiInfant && aiInfant > 0) {
        checks.push({
          agent: 'A2', field: 'NDCP Infant Rate',
          real: ndcp.median_infant_center, ai: aiInfant,
          realFmt: _fmt(ndcp.median_infant_center, '$', '/mo'),
          aiFmt: _fmt(aiInfant, '$', '/mo'),
          acc: _acc(aiInfant, ndcp.median_infant_center),
          source: 'DOL NDCP',
        });
      }
    }

    // ══ Phase F: more verifier checks ══

    // ── A1 county unemployment vs FRED LAUS ──────────────────────
    const localUnemp = R.real.local_unemp;
    if (localUnemp && localUnemp.unemployment_rate != null && a1) {
      const aiCountyUnemp = _get(a1, 'metro_overview.unemployment_rate_pct');
      if (aiCountyUnemp != null) {
        checks.push({
          agent: 'A1', field: 'County Unemployment',
          real: localUnemp.unemployment_rate, ai: aiCountyUnemp,
          realFmt: _fmt(localUnemp.unemployment_rate, '', '%'),
          aiFmt: _fmt(aiCountyUnemp, '', '%'),
          acc: _accRate(aiCountyUnemp, localUnemp.unemployment_rate, 2),
          source: 'FRED LAUS',
        });
      }
    }

    // ── A1 median home value vs ACS B25077 ───────────────────────
    const acsHv = R.real.acs_home_value;
    if (acsHv && acsHv.median_home_value && a1) {
      const aiHv = _get(a1, 'housing_market_summary.median_home_value');
      if (aiHv && aiHv > 0) {
        checks.push({
          agent: 'A1', field: 'Median Home Value',
          real: acsHv.median_home_value, ai: aiHv,
          realFmt: _fmt(acsHv.median_home_value, '$'),
          aiFmt: _fmt(aiHv, '$'),
          acc: _acc(aiHv, acsHv.median_home_value),
          source: 'ACS B25077',
        });
      }
    }

    // ── A3 schools near sites vs NCES ────────────────────────────
    const schools = R.real.schools;
    const a3v = R.a3;
    if (schools && schools.total_public_schools_5mi > 0 && a3v) {
      const locs = a3v.locations || [];
      const loc0 = locs[0] || {};
      const aiSchools = loc0.schools_within_2mi || loc0.nearby_school_count;
      if (aiSchools && aiSchools > 0) {
        // NCES is 5mi count; AI usually reports 2mi — scale: 2mi ≈ 16% of 5mi area
        const scaled = schools.total_public_schools_5mi * 0.4;
        checks.push({
          agent: 'A3', field: 'Schools Within Radius',
          real: scaled, ai: aiSchools,
          realFmt: _fmt(scaled, '', ' (NCES scaled)'),
          aiFmt: _fmt(aiSchools, '', ' (AI 2mi)'),
          acc: Math.max(0, 1 - Math.abs(aiSchools - scaled) / Math.max(scaled, 1) / 2),
          source: 'NCES',
        });
      }
    }

    // ── A4 vacancy vs HUD USPS ───────────────────────────────────
    const hudVac = R.real.hud_vacancy;
    if (hudVac && hudVac.vacancy_pct_biz != null && a4v) {
      const c0v = (a4v.by_city_summary || [])[0] || {};
      const aiVac = c0v.available_listings_est;
      if (aiVac != null && aiVac > 0 && hudVac.vacancy_pct_biz > 0) {
        // Loose comparison: AI listings count vs HUD business vacancy %
        // Just check that both signal non-zero availability in same direction
        const realFlag = hudVac.vacancy_pct_biz >= 5 ? 'available' : 'tight';
        const aiFlag   = aiVac >= 10 ? 'available' : 'tight';
        checks.push({
          agent: 'A4', field: 'Property Availability',
          real: hudVac.vacancy_pct_biz, ai: aiVac,
          realFmt: _fmt(hudVac.vacancy_pct_biz, '', '% biz vacant'),
          aiFmt: _fmt(aiVac, '', ' listings'),
          acc: realFlag === aiFlag ? 0.9 : 0.5,
          source: 'HUD USPS',
        });
      }
    }

    // ══ Phase G: more verifier checks ══

    // ── A1 building permits vs Census BPS ────────────────────────
    const bps = R.real.building_permits;
    if (bps && bps.permits_total && a1) {
      const aiPermits = _get(a1, 'housing_market_summary.new_permits_issued_2023')
                     || _get(a1, 'housing_market_summary.new_permits_issued');
      if (aiPermits != null && aiPermits > 0) {
        checks.push({
          agent: 'A1', field: 'Annual Building Permits',
          real: bps.permits_total, ai: aiPermits,
          realFmt: _fmt(bps.permits_total),
          aiFmt: _fmt(aiPermits),
          acc: _acc(aiPermits, bps.permits_total),
          source: 'Census BPS',
        });
      }
    }

    // ── A1 median family income vs HUD Income Limits ─────────────
    const hudInc = R.real.hud_income;
    if (hudInc && hudInc.median_family_income && a1) {
      const aiMFI = _get(a1, 'metro_overview.median_family_income')
                 || _get(a1, 'metro_overview.median_hh_income_metro');
      if (aiMFI && aiMFI > 0) {
        checks.push({
          agent: 'A1', field: 'Median Family Income (state)',
          real: hudInc.median_family_income, ai: aiMFI,
          realFmt: _fmt(hudInc.median_family_income, '$'),
          aiFmt: _fmt(aiMFI, '$'),
          acc: _acc(aiMFI, hudInc.median_family_income),
          source: 'HUD Income Limits',
        });
      }
    }

    // ── A1 per capita income vs ACS B19301 ───────────────────────
    const acsIm = R.real.acs_industry_mix;
    if (acsIm && acsIm.per_capita_income && a1) {
      const aiPCI = _get(a1, 'metro_overview.per_capita_income');
      if (aiPCI && aiPCI > 0) {
        checks.push({
          agent: 'A1', field: 'Per Capita Income',
          real: acsIm.per_capita_income, ai: aiPCI,
          realFmt: _fmt(acsIm.per_capita_income, '$'),
          aiFmt: _fmt(aiPCI, '$'),
          acc: _acc(aiPCI, acsIm.per_capita_income),
          source: 'ACS B19301',
        });
      }
    }

    // ══ Phase H: more verifier checks ══

    // ── A1 pop growth vs Census PEP ──────────────────────────────
    const pep = R.real.census_pep;
    if (pep && pep.pop_growth_1yr_pct != null && a1) {
      const aiGrowth = _get(a1, 'metro_overview.pop_growth_pct_1yr');
      if (aiGrowth != null) {
        checks.push({
          agent: 'A1', field: 'Population Growth 1yr',
          real: pep.pop_growth_1yr_pct, ai: aiGrowth,
          realFmt: _fmt(pep.pop_growth_1yr_pct, '', '%'),
          aiFmt: _fmt(aiGrowth, '', '%'),
          acc: _accRate(aiGrowth, pep.pop_growth_1yr_pct, 2),
          source: 'Census PEP 2023',
        });
      }
    }

    // ── A1 net migration vs ACS B07001 ───────────────────────────
    const mig = R.real.acs_migration;
    if (mig && mig.newcomers_1yr_pct != null && a1) {
      const aiMig = _get(a1, 'metro_overview.net_migration_annual_pct');
      if (aiMig != null && aiMig > 0) {
        checks.push({
          agent: 'A1', field: 'Newcomer % (vs ACS movers)',
          real: mig.newcomers_1yr_pct, ai: aiMig,
          realFmt: _fmt(mig.newcomers_1yr_pct, '', '%'),
          aiFmt: _fmt(aiMig, '', '%'),
          acc: _accRate(aiMig, mig.newcomers_1yr_pct, 8),
          source: 'ACS B07001',
        });
      }
    }

    // ── A1 BEA per capita personal income ────────────────────────
    const bea = R.real.bea_income;
    if (bea && bea.per_capita_personal_income && a1) {
      const aiPCPI = _get(a1, 'metro_overview.per_capita_personal_income')
                  || _get(a1, 'metro_overview.per_capita_income');
      if (aiPCPI && aiPCPI > 0) {
        checks.push({
          agent: 'A1', field: 'Per Capita Personal Income',
          real: bea.per_capita_personal_income, ai: aiPCPI,
          realFmt: _fmt(bea.per_capita_personal_income, '$'),
          aiFmt: _fmt(aiPCPI, '$'),
          acc: _acc(aiPCPI, bea.per_capita_personal_income),
          source: 'BEA CAINC1',
        });
      }
    }

    // ══ Phase I: more verifier checks ══

    // ── A1 uninsured % vs County Health Rankings ─────────────────
    const chr = R.real.county_health;
    if (chr && chr.uninsured_pct != null && a1) {
      const aiUninsured = _get(a1, 'metro_overview.uninsured_pct')
                       || _get(R.real.health, 'no_insurance_pct');
      const realUninsured = chr.uninsured_pct;
      if (aiUninsured != null && aiUninsured > 0 && realUninsured > 0) {
        checks.push({
          agent: 'A1', field: 'Uninsured %',
          real: realUninsured, ai: aiUninsured,
          realFmt: _fmt(realUninsured, '', '%'),
          aiFmt: _fmt(aiUninsured, '', '%'),
          acc: _accRate(aiUninsured, realUninsured, 5),
          source: 'CHR / CDC',
        });
      }
    }

    // ── A1 annual avg temp vs NOAA Normals ───────────────────────
    const noaa = R.real.noaa_climate;
    if (noaa && noaa.annual_avg_temp_f != null) {
      // Cross-check vs existing climate (Open-Meteo) °C → °F
      const oldClimate = R.real.climate;
      if (oldClimate && oldClimate.avgTemp_c != null) {
        const omFahr = oldClimate.avgTemp_c * 9 / 5 + 32;
        checks.push({
          agent: 'Data', field: 'Climate Cross-Check (NOAA vs OpenMeteo)',
          real: noaa.annual_avg_temp_f, ai: Math.round(omFahr * 10) / 10,
          realFmt: _fmt(noaa.annual_avg_temp_f, '', '°F NOAA'),
          aiFmt: _fmt(Math.round(omFahr * 10) / 10, '', '°F OM'),
          acc: _accRate(omFahr, noaa.annual_avg_temp_f, 3),
          source: 'NOAA NCEI',
        });
      }
    }

    // ── Drop checks whose agent fired its fallback (baseline data isn't real) ──
    const beforeFilter = checks.length;
    const realChecks = checks.filter(c => {
      const m = (c.agent || '').match(/^A(\d+)/);
      return !(m && fallbackAgents.includes(parseInt(m[1])));
    });
    const droppedFallback = beforeFilter - realChecks.length;

    // ── Classify each check by match type ────────────────────────
    // exact            — same field, same geography, same unit (e.g. ZIP ACS median income vs city0.median_hh_income WHEN city0 = primary ZIP city)
    // tolerance_rate   — percentage rate with bounded tolerance (e.g. unemployment ±2pp)
    // proxy            — derived/inferred comparison (e.g. commercial rent = HUD FMR 2BR × 3, OSM-only competitor count)
    // cross_agent      — internal consistency (A9 year1 revenue vs A7 base × 12)
    // direction_only   — high/low/match flag, not a numeric comparison
    function _classify(c) {
      const s   = (c.source || '').toLowerCase();
      const fld = (c.field  || '').toLowerCase();
      if (/×|proxy|hud×3|osm overpass|usps$|estimated|proxy/i.test(c.source || '')) return 'proxy';
      if (/cross[- ]?agent/.test(s)) return 'cross_agent';
      if (/availability|tight/i.test(fld)) return 'direction_only';
      if (/rate|%|pct/.test(fld) || /\bpct\b/.test(fld)) return 'tolerance_rate';
      return 'exact';
    }
    realChecks.forEach(c => { c.match_type = _classify(c); });

    // ── Need at least 2 valid checks to display ──────────────────
    const valid = realChecks.filter(c => c.acc !== null && !isNaN(c.acc));
    if (valid.length < 2) {
      console.log('[Verifier] Not enough valid checks to display consistency card:', valid.length,
                  '(dropped', droppedFallback, 'fallback-tainted checks; agents on fallback:', fallbackAgents.join(',') || 'none', ')');
      return;
    }

    // ── Three weighted scores: strict (exact only), normal (exact+rate), and broad (incl proxy/cross-agent) ──
    const buckets = { exact:[], tolerance_rate:[], proxy:[], cross_agent:[], direction_only:[] };
    valid.forEach(c => (buckets[c.match_type] || buckets.exact).push(c));

    const avg = arr => arr.length ? arr.reduce((s,c)=>s+c.acc,0)/arr.length : null;
    const pctOf = v => v == null ? null : Math.round(v*100);

    const strictPct = pctOf(avg(buckets.exact));                                       // strict field equality
    const normalPct = pctOf(avg([...buckets.exact, ...buckets.tolerance_rate]));        // field+rate tolerance
    const broadPct  = pctOf(avg(valid));                                                // includes proxy / cross-agent

    // Headline = strict if enough exact checks, else normal
    const pct = (buckets.exact.length >= 3 ? strictPct : normalPct) ?? broadPct ?? 0;

    R.accuracy = {
      score: pct,
      score_strict: strictPct,
      score_normal: normalPct,
      score_broad:  broadPct,
      checks: valid,
      checked_at: Date.now(),
      fallback_agents: fallbackAgents,
      dropped_checks:  droppedFallback,
      buckets: Object.fromEntries(Object.entries(buckets).map(([k,v])=>[k,v.length])),
    };
    console.log(`[Verifier] Consistency: strict=${strictPct}% normal=${normalPct}% broad=${broadPct}% (${valid.length} checks; ${droppedFallback} dropped due to fallbacks; buckets: ${JSON.stringify(R.accuracy.buckets)})`);

    _renderAccuracyCard(pct, valid, {
      fallbackAgents, droppedFallback,
      strictPct, normalPct, broadPct,
      buckets: R.accuracy.buckets,
    });
  }

  // ── Render ─────────────────────────────────────────────────────

  function _renderAccuracyCard(pct, checks, meta) {
    const statusEl = document.getElementById('realDataStatus');
    if (!statusEl) return;
    meta = meta || {};

    const color = pct >= 85 ? 'var(--green)' : pct >= 70 ? 'var(--amber)' : 'var(--red)';
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : 'D';

    const typeBadge = {
      exact:          {label:'EXACT',     color:'var(--green)',  bg:'rgba(34,197,94,0.15)'},
      tolerance_rate: {label:'±RATE',     color:'var(--blue)',   bg:'rgba(74,158,255,0.15)'},
      proxy:          {label:'PROXY',     color:'var(--amber)',  bg:'rgba(245,158,11,0.15)'},
      cross_agent:    {label:'X-AGENT',   color:'var(--purple)', bg:'rgba(167,139,250,0.15)'},
      direction_only: {label:'DIR ONLY',  color:'var(--muted)',  bg:'rgba(138,141,150,0.15)'},
    };
    // Sort: exact first, then tolerance_rate, then proxy, then cross_agent, then direction_only
    const order = {exact:0,tolerance_rate:1,proxy:2,cross_agent:3,direction_only:4};
    const sorted = [...checks].sort((a,b) => (order[a.match_type]??9) - (order[b.match_type]??9));
    const rows = sorted.map(c => {
      const ap  = Math.round(c.acc * 100);
      const col = ap >= 85 ? 'var(--green)' : ap >= 70 ? 'var(--amber)' : 'var(--red)';
      const bar = `<div style="width:${ap}%;height:3px;background:${col};border-radius:2px"></div>`;
      const tb  = typeBadge[c.match_type] || typeBadge.exact;
      return `<tr style="border-top:1px solid var(--border)">
        <td style="font-size:10px;color:var(--blue);padding:3px 8px;font-weight:700;white-space:nowrap">${c.agent}</td>
        <td style="font-size:10px;color:var(--text);padding:3px 8px">${c.field}</td>
        <td style="font-size:10px;color:var(--muted);padding:3px 8px;font-family:monospace">${c.realFmt}</td>
        <td style="font-size:10px;color:var(--muted);padding:3px 8px;font-family:monospace">${c.aiFmt}</td>
        <td style="padding:3px 8px;min-width:60px">
          <div style="font-size:10px;font-weight:700;color:${col};margin-bottom:2px">${ap}%</div>
          <div style="background:var(--surface3);border-radius:2px;overflow:hidden">${bar}</div>
        </td>
        <td style="padding:3px 8px;white-space:nowrap"><span style="font-size:9px;font-weight:700;color:${tb.color};background:${tb.bg};padding:1px 5px;border-radius:3px">${tb.label}</span></td>
        <td style="font-size:9px;color:var(--faint);padding:3px 8px;white-space:nowrap">${c.source}</td>
      </tr>`;
    }).join('');

    const card = document.createElement('div');
    card.id    = 'rdAccuracyCard';
    card.style.cssText = 'margin-top:10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden';

    // Sub-score chips
    const subScore = (lbl, v, n, tipExtra) => v == null ? '' : `
      <div title="${tipExtra}" style="display:flex;flex-direction:column;align-items:center;padding:3px 8px;background:var(--surface3);border-radius:6px;min-width:62px">
        <div style="font-size:13px;font-weight:700;font-family:'Syne',sans-serif;color:${v>=85?'var(--green)':v>=70?'var(--amber)':'var(--red)'}">${v}%</div>
        <div style="font-size:8px;color:var(--faint);text-transform:uppercase;letter-spacing:0.05em">${lbl} · ${n}</div>
      </div>`;
    const b = meta.buckets || {};
    const subChips = [
      subScore('Strict', meta.strictPct, b.exact || 0, 'Same field, same geography, same unit — strictest field-level match'),
      subScore('+Rate',  meta.normalPct, (b.exact||0) + (b.tolerance_rate||0), 'Adds percentage rates with bounded tolerance (e.g. ±2pp unemployment)'),
      subScore('+Proxy', meta.broadPct,  Object.values(b).reduce((s,n)=>s+(n||0),0), 'Includes proxy comparisons (HUD×3 rent, OSM-only competitor count) and cross-agent consistency'),
    ].join('');

    card.innerHTML = `
      <div style="padding:10px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-size:22px;font-weight:900;font-family:'Syne',sans-serif;color:${color}">${pct}%</span>
          <span style="font-size:11px;font-weight:700;background:${color};color:#fff;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center">${grade}</span>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;font-family:'Syne',sans-serif;color:var(--text)" title="Headline = strict-only score when there are ≥3 exact-match checks, else exact+rate. Sub-scores break it down by match strictness.">Data Consistency Score</div>
          <div style="font-size:10px;color:var(--faint)">${checks.length} cross-checks · field-level match-typed${meta.fallbackAgents && meta.fallbackAgents.length ? ` · ⚠ ${meta.fallbackAgents.length} agent${meta.fallbackAgents.length===1?'':'s'} on fallback (excluded): A${meta.fallbackAgents.join(', A')}` : ''}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap">${subChips}</div>
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
              <th style="font-size:9px;color:var(--faint);text-align:left;padding:4px 8px;text-transform:uppercase;letter-spacing:0.06em">Type</th>
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
