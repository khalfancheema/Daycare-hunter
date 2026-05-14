async function runAgent1() {
  setDot(1,'running');
  const ind=industry();
  const sys=`You are a senior demographics and market research analyst with deep expertise in US Census data, GIS mapping, labor economics, and consumer demand modeling. You source data from multiple authoritative federal, state, and commercial databases. Always respond with a JSON object only.`;

  const usr=`Conduct a comprehensive demographic research sweep for a ${ind.unit} business opportunity within ${radius()} miles of ZIP ${zip()}.

Industry: ${ind.label}. Revenue unit: ${ind.revenue_unit}.

PRIMARY DATA SOURCES — search and cite as many of the following as possible:
1. US Census Bureau ACS 2023 1-year & 2022 5-year estimates
   - Table B01001 (sex by age), B01003 (total population)
   - Table B19013 (median household income), B19001 (income distribution)
   - Table B23025 (employment status), B23022 (employment by sex/age)
   - Table B25001 (housing units), B25003 (tenure — own vs rent)
   - Table S1101 (households and families), S0901 (children characteristics)
   - Table B08303 (travel time to work — commute demand proxy)
   - Table B14001 (school enrollment), B14003 (school type)
2. Census Bureau Population Estimates Program (PEP) — annual population estimates 2020–2023
3. Census TIGER/Line shapefiles + ZIP Code Tabulation Areas (ZCTAs) for geographic precision
4. BLS Quarterly Census of Employment and Wages (QCEW) — local industry employment levels
5. BLS Consumer Expenditure Survey (CES) — spending on ${ind.units} / relevant services by income tier
6. BLS Occupational Employment and Wage Statistics (OEWS) — working parent occupations in area
7. HUD Location Affordability Portal — housing cost burden, who can afford premium services
8. EPA Smart Location Database — walkability index, transit access, employment accessibility score
9. FHWA / state DOT Annual Average Daily Traffic (AADT) counts near major corridors
10. National Center for Education Statistics (NCES) — public school enrollment as demand proxy
11. State vital statistics / birth records — annual birth rates by county (lagging demand indicator)
12. FRED (Federal Reserve Economic Data) — local unemployment rate, GDP, housing starts for area
13. Esri / ArcGIS Business Analyst Community Profile (if accessible) — lifestyle segmentation
14. NAR / Realtor.com migration data — net in-migration by metro area
15. USDA ERS rural-urban commuting area (RUCA) codes — urban density classification

SEARCH STRATEGY:
- Search "US Census ACS ZIP ${zip()} population income"
- Search "Census QuickFacts [county name]"
- Search "BLS employment [city/county name] QCEW"
- Search "FRED [city/metro] economic data"
- Search "birth rate [county name] vital statistics [state]"
- Search "[city name] school enrollment NCES"
- For each city within ${radius()} miles, find ACTUAL census tract / place-level data

KEY DEMAND SIGNALS FOR A ${ind.unit.toUpperCase()}:
- ${ind.capacity_label} population density (children under 5 or primary demographic)
- Median household income and income tier distribution
- Dual-income / working parent household percentage
- Labor force participation rate (especially women 25–44)
- Population growth rate 2019–2023 (momentum indicator)
- Household formation rate (new construction permits as proxy)
- Daily traffic count on primary commercial corridors
- School-age population as pipeline / future demand
- Birth rate trend (leading indicator, 2–3 yr lag)
- Housing affordability index (determines ability to pay)

Return ONLY this JSON (use real data from the sources above, note source and "est." if estimated):
{
  "data_sources": [
    "US Census ACS 2023 1-year estimates (Tables B01001, B19013, B23025, B25001)",
    "US Census ACS 2022 5-year estimates (Tables S0901, B08303, B14001)",
    "Census Population Estimates Program 2020–2023",
    "BLS QCEW Q3 2023 — county-level employment",
    "BLS Consumer Expenditure Survey 2022",
    "HUD Location Affordability Portal",
    "FHWA AADT traffic counts",
    "NCES school enrollment data 2022–23",
    "State vital statistics birth records 2022",
    "FRED economic data — local metro",
    "NAR migration trends 2023"
  ],
  "summary": "5-sentence narrative citing specific numbers and sources on demographic opportunity for a ${ind.unit} in this area",
  "metro_overview": {
    "metro_name": "Atlanta-Sandy Springs-Alpharetta MSA",
    "total_pop_metro": 6200000,
    "pop_growth_pct_1yr": 1.8,
    "median_hh_income_metro": 78000,
    "unemployment_rate_pct": 3.4,
    "net_migration_annual": 45000,
    "birth_rate_per_1000": 11.2,
    "source": "Census PEP 2023 / FRED / Vital Statistics"
  },
  "cities": [
    {
      "name": "City A", "county": "County", "distance_miles": 10,
      "pop_total": 82000, "pop_under5": 4800, "pop_under5_pct": 5.8,
      "median_hh_income": 112000, "income_distribution": {"under_50k_pct": 12, "50_100k_pct": 28, "over_100k_pct": 60},
      "labor_force_pct": 68, "women_25_44_lfp_pct": 74,
      "pop_growth_pct_5yr": 4.2, "pop_growth_pct_1yr": 1.1,
      "households": 28000, "owner_occupied_pct": 72, "renter_pct": 28,
      "working_parents_est_pct": 71, "dual_income_hh_est_pct": 64,
      "avg_commute_minutes": 28,
      "school_enrollment_k12": 14200,
      "annual_births_county_est": 1800,
      "traffic_aadt_main_corridor": 32000,
      "walkability_score": 42,
      "housing_affordability_index": 88,
      "demand_score": 88,
      "data_note": "ACS 2022 5yr est. + PEP 2023"
    },
    {
      "name": "City B", "county": "County", "distance_miles": 28,
      "pop_total": 18000, "pop_under5": 1400, "pop_under5_pct": 7.8,
      "median_hh_income": 52000, "income_distribution": {"under_50k_pct": 45, "50_100k_pct": 38, "over_100k_pct": 17},
      "labor_force_pct": 65, "women_25_44_lfp_pct": 68,
      "pop_growth_pct_5yr": 14, "pop_growth_pct_1yr": 3.2,
      "households": 6800, "owner_occupied_pct": 58, "renter_pct": 42,
      "working_parents_est_pct": 74, "dual_income_hh_est_pct": 55,
      "avg_commute_minutes": 34,
      "school_enrollment_k12": 3800,
      "annual_births_county_est": 620,
      "traffic_aadt_main_corridor": 14000,
      "walkability_score": 28,
      "housing_affordability_index": 112,
      "demand_score": 72,
      "data_note": "ACS 2022 5yr est. + Vital Stats 2022"
    }
  ],
  "age_breakdown_county": [
    {"age_group": "Segment 1", "gwinnett_pop": 7200, "fulton_pop": 5100, "gap_capacity": 380, "source": "ACS B01001"},
    {"age_group": "Segment 2", "gwinnett_pop": 14800, "fulton_pop": 10400, "gap_capacity": 620, "source": "ACS B01001"}
  ],
  "labor_market_summary": {
    "top_employer_sectors": ["Healthcare", "Professional Services", "Technology", "Education"],
    "median_wage_primary_occupation": 72000,
    "female_labor_force_pct_county": 59,
    "source": "BLS QCEW + OEWS 2023"
  },
  "housing_market_summary": {
    "median_home_value": 420000,
    "new_permits_issued_2023": 3200,
    "yoy_permit_growth_pct": 8.4,
    "source": "Census Building Permits Survey 2023"
  },
  "age_pyramid": [
    {"bracket": "0-4",   "male": 2400, "female": 2350},
    {"bracket": "5-9",   "male": 2600, "female": 2500},
    {"bracket": "10-14", "male": 2550, "female": 2480},
    {"bracket": "15-19", "male": 2300, "female": 2200},
    {"bracket": "20-24", "male": 2800, "female": 2750},
    {"bracket": "25-29", "male": 4200, "female": 4100},
    {"bracket": "30-34", "male": 5100, "female": 4900},
    {"bracket": "35-39", "male": 4800, "female": 4700},
    {"bracket": "40-44", "male": 4200, "female": 4100},
    {"bracket": "45-49", "male": 3800, "female": 3900},
    {"bracket": "50-54", "male": 3200, "female": 3400},
    {"bracket": "55-59", "male": 2800, "female": 3100},
    {"bracket": "60-64", "male": 2200, "female": 2600},
    {"bracket": "65-69", "male": 1600, "female": 2100},
    {"bracket": "70-74", "male": 1100, "female": 1600},
    {"bracket": "75+",   "male":  700, "female": 1200}
  ],
  "generation_breakdown": [
    {"gen": "Gen Alpha (0-12)",   "population_pct": 16.2, "households_pct": 19.4},
    {"gen": "Gen Z (13-28)",      "population_pct": 14.8, "households_pct": 12.1},
    {"gen": "Millennial (29-44)", "population_pct": 24.6, "households_pct": 32.8},
    {"gen": "Gen X (45-60)",      "population_pct": 22.4, "households_pct": 25.2},
    {"gen": "Boomer (61-79)",     "population_pct": 18.2, "households_pct":  9.4},
    {"gen": "Silent (80+)",       "population_pct":  3.8, "households_pct":  1.1}
  ],
  "multi_radius": [
    {"ring": "1 mi", "population": 8200,   "households": 2900,  "median_hh_income": 142000, "pct_with_children": 38, "pop_under5":   980, "avg_hh_size": 2.82},
    {"ring": "3 mi", "population": 48600,  "households": 16800, "median_hh_income": 138900, "pct_with_children": 41, "pop_under5":  5800, "avg_hh_size": 2.91},
    {"ring": "5 mi", "population": 124000, "households": 42400, "median_hh_income": 128400, "pct_with_children": 40, "pop_under5": 14800, "avg_hh_size": 2.88}
  ],
  "consumer_expenditure": {
    "radius_miles": 5,
    "total_expenditure_millions": 8110,
    "categories": [
      {"category": "Housing",               "amount_millions": 2840, "pct_of_total": 35.0},
      {"category": "Transportation",        "amount_millions": 1140, "pct_of_total": 14.1},
      {"category": "Food at Home",          "amount_millions":  810, "pct_of_total": 10.0},
      {"category": "Healthcare",            "amount_millions":  620, "pct_of_total":  7.6},
      {"category": "Education & Childcare", "amount_millions":  490, "pct_of_total":  6.0},
      {"category": "Food Away from Home",   "amount_millions":  480, "pct_of_total":  5.9},
      {"category": "Entertainment",         "amount_millions":  340, "pct_of_total":  4.2},
      {"category": "Personal Care",         "amount_millions":  180, "pct_of_total":  2.2},
      {"category": "Other",                 "amount_millions": 1210, "pct_of_total": 14.9}
    ]
  },
  "lifestyle_segments": [
    {"segment": "Savvy Suburbanites",         "pct": 18.4, "description": "Established upper-middle-class families, homeowners, education-focused"},
    {"segment": "Professional Pride",         "pct": 14.2, "description": "Younger professionals, dual-income, high education, tech-forward"},
    {"segment": "Bright Young Professionals", "pct": 11.8, "description": "Recent college grads building careers, renter households"},
    {"segment": "In Style",                   "pct":  9.6, "description": "Upper-middle urban lifestyle, brand conscious, high disposable income"},
    {"segment": "Family Foundations",         "pct":  7.3, "description": "Young families prioritizing schools, safety, and suburban amenities"}
  ],
  "population_projections": [
    {"year": 2020, "population": 41200},
    {"year": 2021, "population": 43800},
    {"year": 2022, "population": 46100},
    {"year": 2023, "population": 47800},
    {"year": 2024, "population": 49200},
    {"year": 2025, "population": 51000},
    {"year": 2030, "population": 58400}
  ],
  "occupation_lq": [
    {"occupation": "Computer & Math",          "area_pct": 12.4, "us_pct":  3.1, "lq": 4.00},
    {"occupation": "Business & Financial",     "area_pct":  8.6, "us_pct":  5.3, "lq": 1.62},
    {"occupation": "Management",               "area_pct":  7.2, "us_pct":  5.8, "lq": 1.24},
    {"occupation": "Healthcare Practitioners", "area_pct":  6.8, "us_pct":  6.3, "lq": 1.08},
    {"occupation": "Education & Training",     "area_pct":  5.4, "us_pct":  6.1, "lq": 0.89},
    {"occupation": "Sales & Related",          "area_pct":  9.2, "us_pct": 10.1, "lq": 0.91},
    {"occupation": "Service Occupations",      "area_pct": 11.8, "us_pct": 17.4, "lq": 0.68}
  ],
  "education_attainment": {
    "radius_miles": 3,
    "less_than_hs_pct":  2.4,
    "hs_grad_pct":       8.6,
    "some_college_pct": 14.2,
    "associates_pct":    5.8,
    "bachelors_pct":    38.4,
    "graduate_pct":     30.6
  },
  "housing_detail": {
    "median_home_value":    548000,
    "avg_home_value":       624000,
    "owner_occupied_pct":    72.4,
    "renter_occupied_pct":   27.6,
    "median_gross_rent":     1840,
    "built_2010_later_pct":  28.2,
    "built_2000_2009_pct":   34.6
  },
  "language_spoken": [
    {"language": "English only",  "pct": 58.4},
    {"language": "Asian/Pacific", "pct": 22.8},
    {"language": "Spanish",       "pct": 12.6},
    {"language": "Indo-European", "pct":  4.2},
    {"language": "Other",         "pct":  2.0}
  ],
  "daytime_population": {
    "residential_pop":               49200,
    "daytime_pop":                   54800,
    "daytime_to_residential_ratio":   1.11,
    "workers_present":               28400,
    "workers_at_home":               14600
  }
}`;

  try {
    _setDemoKey(1);
    let d=await claudeJSON(sys,usr);
    if(!d) { console.warn('Agent 1 fallback'); d=getFallback1(); }
    R.a1=d;

    // Summary + sources
    let summaryHtml = d.summary || '';
    if (d.data_sources && d.data_sources.length) {
      summaryHtml += '\n\n📚 Sources used: ' + d.data_sources.join(' · ');
    }
    // Metro overview panel
    if (d.metro_overview) {
      const m = d.metro_overview;
      summaryHtml += `\n\n🌆 Metro: ${m.metro_name||''} · Pop ${(m.total_pop_metro||0).toLocaleString()} · Growth ${m.pop_growth_pct_1yr||'—'}%/yr · Median HHI $${((m.median_hh_income_metro||0)/1000).toFixed(0)}k · Unemployment ${m.unemployment_rate_pct||'—'}% · Net migration +${(m.net_migration_annual||0).toLocaleString()}/yr · Birth rate ${m.birth_rate_per_1000||'—'}/1k (${m.source||''})`;
    }
    if (d.labor_market_summary) {
      const l = d.labor_market_summary;
      summaryHtml += `\n\n💼 Labor market: Top sectors — ${(l.top_employer_sectors||[]).join(', ')} · Female LFP ${l.female_labor_force_pct_county||'—'}% · Median wage $${((l.median_wage_primary_occupation||0)/1000).toFixed(0)}k (${l.source||''})`;
    }
    if (d.housing_market_summary) {
      const h = d.housing_market_summary;
      summaryHtml += `\n\n🏠 Housing: Median value $${((h.median_home_value||0)/1000).toFixed(0)}k · ${(h.new_permits_issued_2023||0).toLocaleString()} new permits · ${h.yoy_permit_growth_pct||'—'}% YoY growth (${h.source||''})`;
    }
    $('1-s-t').textContent=summaryHtml;

    // Heatmap — now with more dimensions
    const ind=industry();
    const cities1=d.cities||[];
    renderHmap('1-h-c',cities1,[
      {key:'pop_under5',label:ind.capacity_label.split(' ')[0]+' Pop',fmt:v=>v.toLocaleString()},
      {key:'median_hh_income',label:'Median Income',fmt:v=>'$'+(v/1000).toFixed(0)+'k'},
      {key:'dual_income_hh_est_pct',label:'Dual Income %',fmt:v=>v+'%'},
      {key:'pop_growth_pct_5yr',label:'Pop Growth 5yr',fmt:v=>v+'%'},
      {key:'annual_births_county_est',label:'Annual Births',fmt:v=>(v||0).toLocaleString()},
      {key:'traffic_aadt_main_corridor',label:'Traffic AADT',fmt:v=>(v||0).toLocaleString()},
      {key:'demand_score',label:'Demand Score',fmt:v=>v+'/100'}
    ]);

    // Chart — 3 datasets: children under 5, dual-income HHs, demand score
    killChart('ch-1');
    const ctx=$('ch-1').getContext('2d');
    charts['ch-1']=new Chart(ctx,{type:'bar',data:{
      labels:cities1.map(c=>c.name),
      datasets:[
        {label:'Children Under 5',data:cities1.map(c=>c.pop_under5||0),backgroundColor:'rgba(74,158,255,0.7)',borderWidth:0,borderRadius:3,yAxisID:'y'},
        {label:'Annual Births (est.)',data:cities1.map(c=>c.annual_births_county_est||0),backgroundColor:'rgba(167,139,250,0.7)',borderWidth:0,borderRadius:3,yAxisID:'y'},
        {label:'Demand Score',data:cities1.map(c=>c.demand_score||0),backgroundColor:'rgba(61,214,140,0.7)',borderWidth:0,borderRadius:3,yAxisID:'y2'}
      ]
    },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8a8d96',font:{size:11}}}},scales:{x:{ticks:{color:'#8a8d96',font:{size:9}},grid:{color:'#2a2d35'}},y:{ticks:{color:'#4a9eff'},grid:{color:'#2a2d35'},position:'left'},y2:{ticks:{color:'#3dd68c'},grid:{display:false},position:'right',min:0,max:100}}}});

    // Rich city table with expanded columns
    let tbl=`<table class="tbl"><thead><tr><th>City</th><th>County</th><th>Dist</th><th>Kids&lt;5</th><th>Income</th><th>Dual Income%</th><th>LFP%</th><th>Growth 5yr</th><th>Births/yr</th><th>AADT</th><th>School Enroll.</th><th>Demand</th><th>Source</th></tr></thead><tbody>`;
    cities1.forEach(c=>{
      const score=c.demand_score;
      const b=score>=80?'b-green':score>=65?'b-amber':'b-red';
      tbl+=`<tr>
        <td><strong>${c.name}</strong></td>
        <td>${_nv(c.county)}</td>
        <td>${_nv(c.distance_miles, v=>v+'mi')}</td>
        <td>${_nvNum(c.pop_under5, v=>v.toLocaleString())}</td>
        <td>${_nvNum(c.median_hh_income, v=>'$'+(v/1000).toFixed(0)+'k')}</td>
        <td>${_nv(c.dual_income_hh_est_pct, v=>v+'%')}</td>
        <td>${_nv(c.labor_force_pct, v=>v+'%')}</td>
        <td>${_nv(c.pop_growth_pct_5yr, v=>v+'%')}</td>
        <td>${_nvNum(c.annual_births_county_est, v=>v.toLocaleString())}</td>
        <td>${_nvNum(c.traffic_aadt_main_corridor, v=>v.toLocaleString())}</td>
        <td>${_nvNum(c.school_enrollment_k12, v=>v.toLocaleString())}</td>
        <td>${score!=null?`<span class="badge ${b}">${score}</span>`:'<span style="color:var(--faint);font-size:11px">N/A</span>'}</td>
        <td style="font-size:10px;color:var(--faint)">${c.data_note||''}</td>
      </tr>`;
    });
    tbl+=`</tbody></table>`;
    $('1-t-c').innerHTML=tbl;
    setDot(1,'done'); showOut(1);
    return JSON.stringify(d);
  } catch(e){setDot(1,'error');showOut(1);$('1-s-t').textContent='Error: '+e.message;throw e}
}

// ══════════════════════════════════════════════════════════
// AGENT 5 — Regulatory
// ══════════════════════════════════════════════════════════
