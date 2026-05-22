# 🏢 Business Planning Agent System

> A **17-agent AI pipeline** that performs end-to-end business planning across **14 industries** — demographics research, regulatory compliance, competitive intelligence, gap analysis, site selection, live real estate search, financial modeling, SBA business plan generation, project planning, market mapping, grant discovery, competitor deep-dive, code review, QA validation, build vs buy analysis, and source verification — all in a **single browser HTML file**.

---

## Quick Start

1. **Download** `public/index.html`
2. **Open** it in Chrome or Firefox (double-click — no server needed)
3. **Choose** your industry, enter your ZIP code, radius, capacity, and budget
4. **Select** your AI provider and enter your API key
5. **Click** ▶ Run Pipeline

No server. No install. No dependencies. Just open and run.

> **Try it first:** Click **⚡ Demo Mode** to run the full pipeline with sample data — no API key required.

---

## ⚠ Security & Key Storage — Read Before Deploying

This app is a **static single-page bundle**. Three things follow from that:

1. **API keys baked into the bundle are visible in browser source view.**
   The build supports `process.env.<KEY>` injection (Vercel env vars / CI secrets)
   and `src/js/local-keys.js` (gitignored). Both end up inside `<script>` in the
   shipped HTML. Anyone who opens DevTools on your deployed site can read them.
2. **In-browser 🔑 button stores keys to `localStorage`.** Convenient for personal
   use, but it persists in the user's browser. This is **not** a zero-storage BYOK flow.
3. **No server-side proxy is included by default.** Every API call goes from
   the user's browser directly to the upstream provider with the embedded key.

**Implications by key type:**

| Key | Risk if leaked | Recommendation |
|-----|----------------|----------------|
| Free government APIs (Census, HUD, BEA, NOAA, AirNow, BLS, FRED, NREL, FBI) | Rate-limit pollution only; replaceable free | Acceptable in bundle for personal use. Regenerate if abused. |
| LLM provider keys (Anthropic, OpenAI, Gemini) | **Billable usage** — could rack up real charges | **NEVER bake into deployed bundle.** Always use the in-app key field OR a server-side proxy. |
| SAM.gov | Identity-tied, abuse-flaggable | Server-side proxy strongly recommended for any public deployment. |

**For public deployments**, build a server-side proxy (e.g., a Vercel serverless
function) that holds keys in `process.env` and forwards requests. Frontend never
sees the key. See `api/` directory (when present) for the reference implementation.

For **personal / single-user / local-network** use, the bundled-key pattern is
acceptable because the only person opening the page is you.

---

## Supported AI Providers

| Provider | Default Model | Get API Key |
|----------|--------------|-------------|
| **Anthropic (Claude)** | claude-sonnet-4-6 | [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI (GPT-4o)** | gpt-4o | [platform.openai.com](https://platform.openai.com) |
| **Google Gemini** | gemini-1.5-pro | [aistudio.google.com](https://aistudio.google.com) |
| **OpenAI-Compatible** | Any local model | Custom URL (LM Studio, Ollama, Together AI, etc.) |

Enter any model override in the **Model** field to use a specific version (e.g. `claude-opus-4-5`, `gpt-4o-mini`).

---

## Supported Industries

| Industry | Units | Key Planning Focus |
|----------|-------|--------------------|
| 🏫 **Daycare / Childcare** | Enrolled children | DECAL licensing, age-group ratios, CACFP/CAPS subsidy, Quality Rated |
| ⛽ **Gas Station / C-Store** | Fuel pumps | EPA UST registration, fuel margin, c-store mix, environmental compliance |
| 🫧 **Laundromat** | Washers | Machine mix, wash-dry-fold revenue, water/utility costs |
| 🚗 **Car Wash** | Wash bays | Throughput, membership model, water reclamation, stormwater permits |
| 🍽️ **Restaurant / Food Service** | Seats | Covers/day, average check, health permits, ANSUL system, grease trap |
| 💪 **Gym / Fitness Center** | Members | Membership tiers, PT revenue, NASM/ACE certification, equipment capex |
| 🎠 **Indoor Play Area / FEC** | Daily visitors | CPSC/ASTM safety, birthday party packages, membership + admission mix |
| 👔 **Dry Cleaning / Laundry** | Garments/day | EPA PERC compliance, green-cleaning transition, pickup/delivery model |
| 🏥 **Senior Care / Assisted Living** | Resident beds | CMS/DHS licensing, staffing ratios, Medicare/Medicaid reimbursement |
| 📚 **Tutoring / Learning Center** | Student seats | Business license, franchise vs independent, curriculum mix |
| 🩺 **Urgent Care Clinic** | Exam rooms | CLIA waiver, DEA registration, state medical board, payer mix |
| ☕ **Coffee Shop / Café** | Seating capacity | GA DPH food service permit, drive-thru vs dine-in, loyalty model |
| ✂️ **Barbershop / Salon** | Styling stations | State cosmetology board, booth-rental vs employee model |
| 🖥️ **Coworking Space** | Desk capacity | Office zoning, COO, membership tiers, amenity mix |

All prompts, financial models, compliance checklists, and output labels adapt automatically when you switch industry.

---

## The 17-Agent Pipeline

```
┌──────────────────────────────────────────────────────────────────────────┐
│              USER INPUT  (ZIP · Industry · Radius · Capacity · Budget)   │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                         MASTER ORCHESTRATOR
                    (12 phases · parallel execution)
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │            PHASE 1 — Parallel Foundation           │
        ▼                         ▼                          ▼
  Agent 1                   Agent 5                    Agent 6
  Demographics               Compliance                Competitive Intel
  (Census·GIS·BLS)           (Permits·Licensing·       (Winnie·Yelp·NAEYC·
                              How to Apply)             QRIS·Care.com)
        │                         │                          │
        └─────────────────────────┼──────────────────────────┘
                                  │
                         Phase 2 ─▶  Agent 2: Gap Analysis
                                  │  (NDCP·Child Care Aware·CCDF)
                                  │
                         Phase 3 ─▶  Agent 3: Site Selection
                                  │  (6 ranked locations)
                                  │
                         Phase 4 ─▶  Agent 4: Real Estate
                                  │  (LoopNet·Crexi·BizBuySell·Zillow)
                                  │
                         Phase 5 ─▶  Agent 7: Financial Feasibility
                                  │  (3 scenarios · P&L · projections)
                                  │
                         Phase 6 ─▶  Agent 8: Executive Summary
                                  │  (Go / Cautious Go / No Go verdict)
                                  │
                         Phase 7 ─▶  Agent 9: Business Plan
                                  │  (SBA 7a · Investor Deck · 4 sub-agents)
                                  │
                         Phase 8 ─▶  Agent 10: Project Plan
                                  │  (18-mo Gantt · Risk Register · 3 sub-agents)
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │            PHASE 9 — Parallel Supplemental         │
        ▼                ▼                ▼                   ▼
  Agent 11          Agent 12         Agent 13           Agent 16
  Market Map        Grant Search     Competitor         Build vs Buy
                                     Deep-Dive
        │                         │
        └─────────────────────────┘
                         Phase 11 ─▶  Agent 14: Code Review
                                      Agent 15: QA Validation
                         Phase 12 ─▶  Agent 17: Sources & Citations
```

---

## Agent Output Reference

| # | Agent | Output Tabs / Panels |
|---|-------|----------------------|
| **1** | **Demographics** | Summary · Heatmap · Chart · City Table |
| **2** | **Gap Analysis** | Analysis · Heatmap · City Rankings · Gap Chart |
| **3** | **Site Selection** | Strategy · 6 Ranked Options (with reasoning + Walk/Transit/School scores) · Radar Chart · Comparison Table |
| **4** | **Real Estate** | Summary · Live Listings (with URLs) · By City · Cost Chart |
| **5** | **Compliance** | Summary · Requirements Table · **How to Apply** · Timeline |
| **6** | **Competitive Intel** | Summary · Market Chart · City Deep-Dive (NAEYC · QRIS · Winnie) |
| **7** | **Financial Feasibility** | Summary · 3 Scenarios · P&L Chart · By-City Comparison · **Interactive Scenario Builder** |
| **8** | **Executive Summary** | Go/No-Go verdict + rationale + risk matrix + next steps |
| **9** | **Business Plan** | Overview · Market · Financials · Operations · SBA Package · Investor Deck |
| **10** | **Project Plan** | Gantt · Milestones · Budget Tracker · Risk Register · Team & Vendors · Launch Checklist |
| **11** | **Market Map** | Interactive Leaflet Map (real tiles) · City Markers · Competitor Pins · Radius Ring |
| **12** | **Grant Search** | Summary · Federal Grants · State Grants · Local Incentives · Full Table |
| **13** | **Competitor Deep-Dive** | Profiles · Pain Points · Differentiation Matrix · Messaging Guide |
| **14** | **Code Review** | Issues Found · Performance · Cost Analysis · Recommended Fixes |
| **15** | **QA Validation** | Test Suites · Data Validation · UX Audit · Health Score |
| **16** | **Build vs Buy** | Summary · Platform List · Comparison · Decision Matrix · Action Steps |
| **17** | **Sources & Citations** | Summary · All Sources · Unverified Claims · Citation Quality Score |

Every agent card has:
- **{ } Raw** — inspect the full JSON output driving that panel
- **↗ Expand** — open a full-screen drill-down modal with raw data + reasoning card
- **↺ Re-run** — re-run that single agent using cached context from upstream agents (visible on every *completed* agent, not just errors)
- **⬇ Export** — export this agent's data as PDF, Word doc, Excel, or Slides

---

## Features

### 🔁 Pipeline Controls
| Button | Action |
|--------|--------|
| **▶ Run Pipeline** | Starts all 17 agents in sequence |
| **⬛ Stop** | Halts after the current agent completes |
| **↺ Reset** | Clears all results and resets to idle |
| **⚡ Demo Mode** | Runs full pipeline with built-in sample data — no API key needed |
| **⚙ Phases** | Opens phase selector — uncheck phases to skip them and use cached data |
| **🔗 Pipeline Graph** | Opens the Agent Dependency Graph — live SVG DAG showing agent status in real time |
| **📂 Runs** | Opens the Named Runs panel — browse, restore, or delete saved pipeline runs |
| **💾 Save Run** | Saves the current completed pipeline as a named run with full output snapshot |

### 💾 Session & Sharing
| Button | Action |
|--------|--------|
| **🔗 Copy Link** | Copies a shareable URL with all inputs encoded (`?zip=&industry=&radius=&capacity=&budget=`) |
| **Session Restore Banner** | Appears on page load if a previous session exists (24-hour TTL) — click **↩ Restore** to reload all agent outputs without re-running |
| **🕐 Recent Reports** | Opens the session history panel showing your last 5 pipeline runs with verdict badges — click any run to restore its inputs |
| **📂 Named Runs** | Save up to 10 fully-named pipeline runs with all agent HTML snapshots — restore any run by name, anytime |

### 📄 Export
| Button | Action |
|--------|--------|
| **📄 Full PDF** | Opens a print-ready window with cover page, TOC, and all 17 agents — charts are captured as PNG images |
| **⬇ Export JSON** | Downloads all agent data as a single JSON file |
| **🖨 Print Report** | Quick print of executive summary + key sections |
| **Per-agent ⬇ Export** | Each agent card has PDF / Word / Excel / Slides export |

### ⚙ Phase Selection & Quick Presets
Click **⚙ Phases** to open the phase selector. Uncheck any phase to skip it — the pipeline uses cached R data from a previous run for skipped phases so downstream agents still receive context.

**One-click presets:**

| Preset | Phases | Est. Cost | Est. Time |
|--------|--------|-----------|-----------|
| ⚡ **Quick Verdict** | 1–6 (Foundation → Executive) | ~$0.15 | ~2 min |
| 🔬 **Foundation Only** | 1 (Demographics · Compliance · Competitive) | ~$0.06 | ~1 min |
| 💰 **Thru Financials** | 1–5 (Foundation → Financial Feasibility) | ~$0.20 | ~3 min |
| 📋 **Full Report** | All 12 phases (all 17 agents) | ~$0.40 | ~8 min |

Use **All** / **None** to select or clear all phases at once, or mix and match individual checkboxes.

### 🔄 Streaming Responses
Agent 8 (Executive Summary) streams its response token-by-token directly into the prose panel using Anthropic's SSE API. You see the verdict and assessment building in real time as it generates — eliminating the "is it frozen?" wait. Other providers (OpenAI, Gemini) fall back to the standard call silently.

### ⚖ ZIP Comparison Mode
Enter a second ZIP code in the **Compare ZIP** field and click **⚖ Compare ZIPs** to run a single focused AI call comparing both markets. The comparison panel renders:
- An overall recommended market with rationale
- Side-by-side metrics table (population, income, children under 5, competitor count, real estate cost, opportunity score)
- Strengths and weaknesses for each ZIP
- A 2–3 sentence recommendation

Uses context from your existing primary-run results — no need to re-run 17 agents.

### ✔ Input Validation
Before launching, all inputs are validated:
- **ZIP** — must be a valid 5-digit US ZIP code
- **Radius** — must be between 10 and 150 miles
- **Capacity** — positive number within the industry's typical range
- **Budget** — must meet the industry's minimum viable startup investment

Errors appear inline as red tips under each field. The pipeline will not launch until all inputs are valid.

### 📊 Data Quality
- **Anti-hallucination** — all 17 agents are instructed to return `null` for missing numeric fields and `"N/A"` / `"Information not available"` for missing text — never fabricated data
- **Null-safe rendering** — all tables and cards display "N/A" gracefully when data is not available
- **Response caching** — results cached in memory + localStorage (4-hour TTL); re-running the same ZIP + industry skips API calls
- **Error recovery** — every agent has fallback data; a partial failure does not crash the pipeline
- **Multi-source prompts** — Agent 1 searches 15 federal data sources (Census ACS, BLS QCEW, FRED, FHWA AADT, NCES, etc.); Agent 6 searches 20 competitive databases
- **Array coercion** — `_toArr()` helper safely coerces any AI-returned value (array, object, or null) into an array before rendering, preventing `forEach is not a function` crashes when the model returns an object instead of a list
- **Optional-chaining guards** — all nested property accesses on AI output use optional chaining (`?.`) so missing fields render as empty strings rather than crashing the renderer
- **Sub-agent null-coalesce** — Financial Feasibility sub-agent results (Revenue Model, Cost Model) are null-coalesced to `{}` before merging, so a partial API failure doesn't crash the consolidation step

### 🔬 Real Data Pipeline
Before any agent runs, `43-real-data.js` prefetches **17 live government APIs** — Census ACS, BLS QCEW, FRED, EIA, FEMA/NFIP, SBA FOIA, FBI CDE, CDC PLACES, Open-Meteo, OSM Overpass, OpenStreetMap NPI, and others — into `R.real`. The `buildRealDataCtx(keys)` function injects a verified block of real numbers directly into agent prompts, grounding AI outputs in authoritative data.

After the pipeline completes, `44-verifier.js` cross-checks **15 specific fields** from AI outputs against `R.real` (median income, population, rents, competitor counts, SBA loan amounts, revenue projections, and more) and renders a scored accuracy card in the UI. A badge panel shows which data sources loaded successfully. If a source fails, the relevant agent falls back to live webSearch for that data category.

### 🏭 Dynamic Agent UI per Industry
Every agent card subtitle updates automatically when you switch industry — no need to re-run:
- **Agent 1** subtitle reflects the demographic focus (e.g. "Children Under 5 · Family Income" for Daycare, "Traffic Counts (AADT) · Vehicle Ownership" for Gas Station)
- **Agent 5** shows the primary regulatory body for that industry
- **Agent 6** lists the top competitors for that vertical
- **Agent 7** shows the revenue model (tuition, fuel margin, membership, etc.)
- **Agent 12** grant tab labels switch to the primary and secondary grant programs for that industry (e.g. "GA CAPS · USDA CACFP" for Daycare, "EPA Brownfields · USDA Rural Biz" for Gas Station)
- Agents 2, 3, 4, 9, 13 all update to use industry-specific units, labels, and competitor names

### 💬 Button Tooltips
Every button and control in the UI has a descriptive tooltip that appears on hover:
- Explains **what** the button does, **when** to use it, and **why** it matters
- Covers all pipeline controls, export buttons, session controls, and per-agent actions
- Helps new users discover features without reading documentation

### 🔍 Drill-Down & Inspection
- Click **↗ Expand** on any agent card to open a full-screen modal
- The modal shows the raw data in a structured view plus a **reasoning card** extracted from the agent's JSON (looks for `reasoning`, `rationale`, `why_chosen`, `recommendation_rationale`, etc.)
- Competitive Intel and Gap Analysis heatmap cells are clickable — click any city cell for a city-level deep-dive overlay
- Site Selection locations have an expandable reasoning section per location

### 📊 Industry Comparison
- Select a second industry in the **Compare With** dropdown and click **⚖ Compare Industries** to run a side-by-side analysis with the current ZIP and radius

### 🗺️ Interactive Market Map (Agent 11)
Agent 11's Market Map uses **Leaflet.js** with CartoDB Dark Matter tiles — real street-level geography with no API key required. Features:
- City circle markers sized and colored by gap score
- Radius ring showing your search boundary
- Competitor location pins with 🏢 markers
- Permanent city name labels
- Click any marker for a full stats popup (income, children under 5, gap score, RE listings)

### ✏️ Personalize Report
- Click the **✏️ Personalize Report** section to add your business name, founder, target opening date, equity, email, and notes
- This information appears in the profile header and is included in all export formats
- Profile is saved in localStorage and persists across sessions

### 🗺️ Walk Score / Transit / School Proximity (Agent 3)
Each of the 6 ranked site locations in Agent 3 now includes walkability, transit, and school proximity scoring:
- **Walk Score** (0–100) with label (Walker's Paradise / Very Walkable / etc.)
- **Transit Score** with description of available transit options
- **Nearest school** — name, distance (mi), and star rating
- **Average school rating** within 2 miles

Displayed as color-coded badges on each location card alongside the existing scoring dimensions.

### 📊 Interactive Financial Scenario Builder (Agent 7)
After Agent 7 completes, a live scenario builder is injected directly below the financials. Drag sliders to adjust:
- **Occupancy %** — % of capacity enrolled / booked
- **Monthly Revenue per Unit** — tuition, membership, rate, etc.
- **Monthly Rent / Lease**

The builder recalculates in real time:
- Monthly Revenue · Monthly Expenses · Monthly Net
- Annual Net Income · Break-Even timeline (months)
- Visual expense vs revenue bar comparison

No API call required — all math runs locally in the browser.

### 🔗 Agent Dependency Graph (DAG)
Click **🔗 Pipeline Graph** in the toolbar to open a live SVG visualization of all 17 agents and their dependencies:
- Nodes colored by live status: **idle** (gray) · **running** (blue pulse) · **done** (green) · **error** (red)
- Bezier curve edges show which agents feed into which
- Auto-refreshes every 800ms while the pipeline is running
- Click any node to re-run that single agent

### 💾 Persistent Named Pipeline Runs
Save up to 10 complete pipeline runs by name (e.g. "Atlanta Q1 Childcare", "Phoenix Gas Station"):
- **💾 Save Run** — prompts for a name and saves full R object + all rendered HTML panels + inputs
- **📂 Runs** — opens a panel listing all saved runs with date, ZIP, industry, and verdict badge
- Click any saved run to instantly restore all inputs and agent outputs — no re-run needed
- Per-run delete button to manage storage

Stored in `biz_named_runs_v1` localStorage key (separate from the auto-save session).

### 🏷️ Data Freshness Indicators
Key data points throughout the app are annotated with freshness badges:
- 🟢 **Verified** — sourced from a live or recently-confirmed API
- 🟡 **Estimated** — modeled or interpolated from recent data
- 🔵 **Live** — streamed or fetched in real time during this run

Rendered by `_freshBadge(year, confidence)` and applied automatically to elements with `data-note` attributes.

### 🦙 Ollama / Local LLM Setup Guide
Select **OpenAI-Compatible** as your provider and a step-by-step Ollama setup guide appears inline:
1. Install Ollama (`brew install ollama` / Windows installer)
2. Pull a model (`ollama pull llama3`)
3. Start the server (`ollama serve`)
4. Set the base URL to `http://localhost:11434/v1` and enter any model name

Works with LM Studio, Jan, Together AI, and any OpenAI-compatible endpoint.

---

## Configuration Reference

| Field | Default | Description |
|-------|---------|-------------|
| Industry | `Daycare` | Business type — changes all labels, prompts, and financial models |
| ZIP Code | `30097` | Center of the search radius |
| Radius | `40 mi` | Search area radius (10–150 miles) |
| Capacity | `75` | Target units: enrolled children, pumps, washers, seats, members, etc. |
| Budget | `$600,000` | Total startup capital budget |
| Provider | `Anthropic` | AI provider |
| API Key | *(your key)* | Provider API key — never stored, session only |
| Model | *(auto)* | Override model ID (defaults to provider's recommended model) |

---

## API Cost Estimate

| Preset | Phases | Est. cost (Claude Sonnet) | Est. time |
|--------|--------|---------------------------|-----------|
| ⚡ Quick Verdict | 1–6 | ~$0.15 | ~2 min |
| 🔬 Foundation Only | 1 | ~$0.06 | ~1 min |
| 💰 Thru Financials | 1–5 | ~$0.20 | ~3 min |
| 📋 Full Report | All 12 phases | ~$0.40–$0.70 | ~8 min |
| Cached re-run (same inputs) | — | ~$0.00 | instant |

Costs vary by industry, response length, and provider pricing. Use the preset buttons inside **⚙ Phases** to pick the right scope before running.

---

## Project Structure

```
daycare-agent-system/
├── public/
│   └── index.html              ← THE APP — single file, open in browser
├── src/
│   ├── template.html           ← HTML skeleton
│   ├── styles.css              ← All CSS
│   └── js/
│       ├── 01-config.js        ← INDUSTRIES config, global state
│       ├── 02-cache.js         ← localStorage caching (4h TTL)
│       ├── 03-utils.js         ← DOM helpers ($, zip, radius, etc.)
│       ├── 04-api.js           ← Multi-provider API + anti-hallucination
│       ├── 05-fallbacks.js     ← Fallback data for all 17 agents
│       ├── 06-ui.js            ← Render helpers (_nv, _nvNum, renderHmap)
│       ├── 07-render-01.js     ← Agent 1: Demographics
│       ├── 08-render-02.js     ← Agent 5: Compliance + How to Apply
│       ├── 09-render-03.js     ← Agent 6: Competitive Intelligence
│       ├── 10-render-04.js     ← Agent 2: Gap Analysis
│       ├── 11-render-05.js     ← Agent 3: Site Selection
│       ├── 12-render-06.js     ← Agent 4: Real Estate
│       ├── 14-render-08.js     ← Agent 8: Executive Summary
│       ├── 15-render-09.js     ← Agent 9: Business Plan
│       ├── 16-render-10.js     ← Agent 10: Project Plan
│       ├── 17-render-11.js     ← Agent 11: Market Map
│       ├── 18-render-12.js     ← Agent 12: Grant Search
│       ├── 19-render-13.js     ← Agent 13: Competitor Deep-Dive
│       ├── 20-render-14.js     ← Agent 14: Code Review
│       ├── 21-render-15.js     ← Agent 15: QA Validation
│       ├── 22-pipeline.js      ← Pipeline orchestration (12 phases)
│       ├── 23-drilldown.js     ← Drill-down modal + expand buttons
│       ├── 24-agent-09-parts.js← Business Plan sub-agents (4 parts)
│       ├── 25-agent-10-parts.js← Project Plan sub-agents (3 parts)
│       ├── 26-agent-fin-subs.js← Financial Feasibility sub-agents
│       ├── 27-agent-buildvsbuy.js ← Agent 16: Build vs Buy
│       ├── 28-agent-sources.js ← Agent 17: Sources & Citations
│       ├── 29-export.js        ← Per-agent export + industry comparison
│       ├── 30-session.js       ← Auto-save, session restore, shareable URL
│       ├── 31-full-export.js   ← Full pipeline PDF export
│       ├── 32-phases.js        ← Phase selection + input validation + presets
│       ├── 33-streaming.js     ← Streaming responses (claudeStream + claudeStreamJSON)
│       ├── 34-history.js       ← Session history — last 5 runs panel
│       ├── 35-compare-zip.js   ← ZIP comparison mode (two markets side by side)
│       ├── 36-demo-data.js     ← Rich demo data for all 17 agents × 14 industries
│       ├── 37-runs.js          ← Persistent named pipeline runs (save/restore/delete)
│       ├── 38-dag.js           ← Agent dependency graph (SVG DAG, live status)
│       ├── 39-scenario.js      ← Interactive financial scenario builder (Agent 7)
│       ├── 40-local-guide.js   ← Ollama/local LLM guide + data freshness badges
│       ├── 41-agent-stress-guard.js ← Stress-guard: max_tokens truncation detection, JSON repair, retry
│       ├── 43-real-data.js     ← Real data pipeline: prefetch 17 gov APIs → R.real; buildRealDataCtx()
│       └── 44-verifier.js      ← Accuracy verifier: 15 cross-checks AI outputs vs R.real
├── v2/
│   ├── src/js/                 ← v2-only JS additions (v2-01-state.js … v2-16-free-apis.js)
│   ├── public/
│   │   └── index.html          ← v2 built output (current Vercel deployment target)
│   └── build-v2.mjs            ← v2 build: concatenates src/js/ + v2/src/js/ → v2/public/index.html
├── test-all.mjs                ← 180-assertion test suite (Node.js, zero deps)
├── .claude/
│   └── launch.json             ← Dev server configurations for preview_start
├── docs/
│   ├── HOW-TO.md               ← Step-by-step user guide
│   ├── architecture.md         ← Pipeline architecture + data flow
│   ├── agent-schemas.md        ← JSON output schemas for all 17 agents
│   └── deployment.md           ← Deployment options
├── build.mjs                   ← Build script (concatenates src/ → public/)
└── package.json
```

### Building from Source

```bash
# v1 build (no npm install needed — zero dependencies)
node build.mjs
# → public/index.html
# or
npm run build

# v2 build (uses both src/js/ and v2/src/js/)
node v2/build-v2.mjs
# → v2/public/index.html  (current Vercel deployment target)

# Dev server options
npm run serve      # npx serve public → http://localhost:8080
npm run start      # python3 http.server → http://localhost:8080
npm run dev        # build + serve in one step

# Run tests
npm test           # 180 assertions, Node.js 18+
```

The v1 build concatenates all JS files in `src/js/` and inlines the CSS into a single `public/index.html`. The v2 build additionally includes all files in `v2/src/js/` and outputs to `v2/public/index.html`. No bundler, no transpilation — just concatenation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI | Anthropic Claude, OpenAI GPT-4o, Google Gemini, OpenAI-compatible |
| Charts | Chart.js 4.4.1 |
| Fonts | Syne + Instrument Sans (Google Fonts) |
| Map | Leaflet.js 1.9.4 + CartoDB Dark Matter tiles (free, no API key) |
| Build | Node.js — `build.mjs` concatenation, zero npm deps in browser |
| Storage | Browser localStorage (4h response cache · 24h session · 5-run history · 10 named runs) |
| Testing | `test-all.mjs` — 180 assertions, Node.js 18+, zero dependencies |

---

## Documentation

| Doc | Description |
|-----|-------------|
| [HOW-TO.md](docs/HOW-TO.md) | Step-by-step guide for every feature |
| [architecture.md](docs/architecture.md) | Pipeline phases, data flow, context passing |
| [agent-schemas.md](docs/agent-schemas.md) | JSON output schemas for all 17 agents |
| [deployment.md](docs/deployment.md) | Local, GitHub Pages, Netlify, Vercel, S3 |

---

## License

MIT — use freely, modify as needed.

---

*Built with Claude Sonnet 4.6 · Chart.js · Leaflet.js · Syne & Instrument Sans*
