function getFallback1(){return {summary:'Demographics data unavailable — using baseline. Run with API key for live data.',cities:[{name:'Area A',county:'Local',distance_miles:10,pop_total:50000,pop_under5:3000,pop_under5_pct:6,median_hh_income:75000,labor_force_pct:65,pop_growth_pct_5yr:5,households:18000,working_parents_est_pct:68,demand_score:70,data_note:'Baseline'}],data_sources:['Baseline estimate']};}
function getFallback2(){return {summary:'Gap analysis unavailable — baseline used.',overall_opportunity_score:70,cities:[{city:'Target Area',rank:1,demand_score:7,supply_score:4,gap_score:7,unserved_children:300,income_tier:'Mid',recommended_tuition_infant:1800,recommended_tuition_preschool:1400,priority:'Good Opportunity',rationale:'Baseline estimate'}],age_gaps:[{age:'Primary Tier',demand_idx:80,supply_idx:50,gap:30}]};}
function getFallback3(){return {summary:'Site recommendations unavailable — baseline used.',locations:[{rank:1,city:'Target Area',submarket:'Main corridor',overall_score:70,scores:{demand:70,competition:70,demographics:70,real_estate:70,regulatory:70},capacity_recommended:parseInt(capacity()),target_infant_tuition:1800,target_preschool_tuition:1400,target_primary_rate:1800,target_secondary_rate:1400,risk:'Medium',timeline_months:14,children_under5_nearby:2000,competitors_within_2mi:3,sqft_needed:5000,est_monthly_rent_range:'$7,000-$10,000',ideal_property_type:'Commercial retail',zoning_needed:'C-1',pros:['Baseline estimate'],cons:['Run with API key for live data']}]};}
function getFallback4(){return {summary:'Real estate data unavailable — baseline used.',listings:[],by_city_summary:[],search_urls:{loopnet:'https://www.loopnet.com'}};}
function getFallback5(){return {summary:'Regulatory data unavailable — baseline used.',decal_url:'https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits',requirements:[{category:'Licensing',item:'Business License',detail:'Required before opening',timeline_weeks:4,cost_usd:200,source:'Local municipality',priority:'Critical'}],timeline_phases:[{phase:'Business Formation',weeks:2,tasks:'LLC, EIN, bank account'},{phase:'Permits',weeks:8,tasks:'Industry license, zoning'},{phase:'Build-Out',weeks:12,tasks:'Construction, equipment'},{phase:'Open',weeks:4,tasks:'Staff, soft launch'}]};}
function getFallback7(){return {summary:'Financial model unavailable — baseline used.',startup_breakdown:[],monthly_ops:[],scenarios:[{name:'Base Case',label:'Baseline',enrolled:Math.round(parseInt(capacity())*0.75),revenue_infant:0,revenue_toddler:0,revenue_preschool:0,revenue_prek:0,avg_tuition:1600,monthly_revenue:Math.round(parseInt(capacity())*0.75*1600),monthly_expenses:Math.round(parseInt(capacity())*0.75*1600*0.85),monthly_net:Math.round(parseInt(capacity())*0.75*1600*0.15),annual_net:Math.round(parseInt(capacity())*0.75*1600*0.15*12),breakeven_months:18,roi_3yr:20,color:'var(--amber)'}],projections:[{month:'M1',rev:0,exp:50000,cum:-50000},{month:'M12',rev:80000,exp:70000,cum:10000},{month:'M24',rev:100000,exp:72000,cum:200000}],by_city_financials:[],funding:[]};}
function getFallback8(){return {verdict:'Cautious Go',verdict_rationale:'Analysis incomplete — run with API key for full evaluation.',assessment:'Based on available data, this area shows moderate opportunity.',success_factors:['Run full analysis for detailed success factors'],risks:[{risk:'Incomplete data',mitigation:'Run with valid API key',severity:'High'}],next_steps:['Run pipeline with API key for complete 15-agent analysis']};}
function getFallback9(){return {business_name:'[Business Name]',entity_type:'LLC',owner_placeholder:'[Owner Name]',executive_summary:{concept:'Business plan unavailable in demo mode.',opportunity:'Run with API key for full business plan.',ask:'Contact SBA for loan information.'},company_overview:{mission:'To be determined.',vision:'To be determined.',values:['Quality','Service','Community'],legal_structure:'LLC',location_rationale:'See site analysis.',services:[]},market_analysis:{target_market:'Local market',market_size:{total_addressable:'TBD',serviceable:'TBD',target_share:'TBD'},competitor_comparison:[],differentiators:['Run with API key for full analysis'],trends:['Market data requires live API call']},operations_plan:{facility:{total_sqft:5000,indoor_sqft_per_child:35,outdoor_sqft_per_child:75,rooms:[]},hours:'Mon-Fri 6:30am-6:30pm',staffing_plan:[],curriculum:'TBD',technology:[]},financial_plan:{startup_capital_needed:parseInt(budget()),use_of_funds:[],funding_sources:[],year1_projections:{revenue:0,gross_profit:0,operating_expenses:0,ebitda:0,net_income:0},year2_projections:{revenue:0,gross_profit:0,operating_expenses:0,ebitda:0,net_income:0},year3_projections:{revenue:0,gross_profit:0,operating_expenses:0,ebitda:0,net_income:0},breakeven_analysis:'TBD',debt_service_coverage:'TBD',collateral:'TBD'},sba_checklist:[],investor_slides:[{slide:1,title:'Demo Mode',content:'Run with a valid API key to generate full investor slides.'}]};}
function getFallback10(){return {project_name:'Launch Plan',total_duration_months:18,target_open_date:'Month 19',phases:[{phase:'Phase 1: Foundation',months:'1-6',color:'#4a9eff',tasks:[{task:'Run with API key',month_start:1,duration:1,owner:'Owner',priority:'Critical',cost:0,detail:'Full project plan requires live API.',links:[]}]}],milestones:[{month:'Month 1',title:'Get Started',detail:'Run with API key for full milestones',owner:'Owner',priority:'critical'}],budget_tracker:[],risk_register:[],team_vendors:[],checklist_phases:[]};}
function getFallback11(){return {center:{lat:33.9,lng:-84.0,label:'Target Area'},cities:[{name:'Target Area',county:'Local',lat:33.9,lng:-84.0,gap_score:7,demand_score:7,supply_score:4,unserved_children:300,median_income:70000,competitor_count:3,priority:'Good Opportunity',recommended_action:'Analyze further',real_estate_url:'https://www.loopnet.com'}],real_estate_pins:[],directions:[]};}
function getFallback6(){return {summary:'Competitive intelligence unavailable — baseline used.',total_licensed_estimated:0,total_accredited_naeyc:0,total_head_start_slots:0,data_sources:['Baseline estimate'],cities:[{city:'Target Area',county:'Local',total_centers_found:0,avg_google_rating:0,avg_yelp_rating:0,licensed_capacity_total:0,market_saturation:'Unknown',market_notes:'Run with API key for live competitive data'}]};}
function getFallback12(){return {summary:'Grant information unavailable — baseline used.',total_potential_funding:0,federal_grants:[],all_grants_table:[],caps_program:{program_name:'CAPS Subsidy Program',administered_by:'State Agency',what_it_is:'State subsidy program — run with API key for current rates',benefit_to_provider:'Guaranteed payment per enrolled subsidized child'},barrow_county_incentives:[],quality_rated_benefits:{program:'Quality Rated',benefits_by_star:[]}};}
function getFallback13(){return {summary:'Competitor analysis unavailable — run with API key.',competitor_profiles:[],pain_point_analysis:[],differentiation_strategy:[],messaging_guide:[]};}
function getFallback14(){return {summary:'Code review unavailable.',overall_grade:'N/A',issues:[],performance_metrics:[],cost_analysis:{total_cost_per_run:0,optimized_cost_per_run:0,monthly_cost_10runs:0,monthly_cost_50runs:0,agents:[],optimization_tips:[]},recommended_fixes_priority:[]};}
function getFallback15(){return {summary:'QA audit unavailable — run with API key for full testing.',overall_pass_rate:0,test_suites:[],data_validation:{fields_checked:0,fields_passed:0,fields_warned:0,fields_failed:0,critical_issues:[],warnings:[],by_agent:[]},ux_audit:[],health_score:{overall:0,dimensions:[]}};}

// ── FALLBACK TAG WRAPPER ───────────────────────────────────────────────
// Every getFallback* return is monkey-patched to carry _is_fallback:true so
// the verifier can exclude these from the consistency score and the UI can
// flag them as "baseline / not real data".
(function() {
  if (typeof window === 'undefined') return;
  for (let n = 1; n <= 17; n++) {
    const fnName = 'getFallback' + n;
    const orig = window[fnName];
    if (typeof orig !== 'function') continue;
    window[fnName] = function() {
      const r = orig.apply(this, arguments);
      if (r && typeof r === 'object') {
        r._is_fallback   = true;
        r._fallback_agent= n;
        r._fallback_at   = Date.now();
      }
      return r;
    };
  }
})();

// ── RAW DATA VIEWER ─────────────────────────────────────────
function showRaw(n) {
  const el=$('raw-'+n);
  if(!el)return;
  if(el.style.display==='block'){el.style.display='none';return;}
  const d=R['a'+n];
  if(!d){el.innerHTML='<pre style="color:var(--muted)">No data yet.</pre>';el.style.display='block';return;}
  const safe=JSON.stringify(d,null,2).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const keyCount=Object.keys(d).length;
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:11px;color:var(--muted)">Raw JSON · ${keyCount} top-level key${keyCount===1?'':'s'}</span>
      <button onclick="navigator.clipboard.writeText(JSON.stringify(R['a${n}'],null,2)).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})" style="font-size:11px;padding:2px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;color:var(--text);cursor:pointer">Copy</button>
    </div>
    <pre style="max-height:400px;overflow-y:auto;margin:0;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-all">${safe}</pre>
  `;
  el.style.display='block';
}

// ── HEAT MAP RENDERER ──────────────────────────────────────
