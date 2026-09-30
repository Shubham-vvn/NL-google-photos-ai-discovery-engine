# Implementation Plan — Google Photos AI-Powered Discovery Engine

> **Source**: [architecture.md](file:///Users/shubhamthakur/Downloads/nextleap%20antigravity%20projects/Google%20Photos%20Project%20/V1%20Google%20Photos/architecture.md) + [problemStatement.md](file:///Users/shubhamthakur/Downloads/nextleap%20antigravity%20projects/Google%20Photos%20Project%20/V1%20Google%20Photos/problemStatement.md)  
> **Approach**: Build in strict order — each step produces a working, testable state  
> **Rule**: No step depends on a future step. Every step ends with something you can run.

---

## Phase 1 — Project Skeleton & Server

> **Goal**: A running Express server that serves a blank dashboard page at `localhost:3000`

---

### Step 1.1 — Initialize Project

Create `package.json` with minimal dependencies.

**Files created:**
- `package.json`

**Dependencies (4 total):**
```json
{
  "name": "photos-discovery-engine",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "seed": "node db/seed.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "better-sqlite3": "^11.0.0",
    "@google/genai": "^1.0.0",
    "dotenv": "^16.4.0"
  }
}
```

**Run:** `npm install`

**Verify:** `node_modules` exists, total size < 15 MB

---

### Step 1.2 — Create Server Entry Point

Create `server.js` — the single entry point for the entire application.

**Files created:**
- `server.js`
- `.env.example`
- `.gitignore`

**What it does:**
1. Loads `.env` config
2. Initializes SQLite database (auto-creates if missing)
3. Serves static files from `public/`
4. Mounts `/api/*` routes
5. Starts listening on `PORT` (default 3000)

**Verify:** `npm run dev` → browser at `http://localhost:3000` shows "Cannot GET /" (no static files yet — that's expected)

---

### Step 1.3 — Create SQLite Database Schema

Create the database layer with all 4 tables from the architecture.

**Files created:**
- `db/schema.sql` — Table definitions (evidence_nodes, opportunities, taxonomy_nodes, user_segments)
- `db/init.js` — Reads `schema.sql` and executes it on the SQLite database
- `db/queries.js` — Reusable prepared statements for all CRUD operations

**What `init.js` does:**
1. Creates `data/` directory if missing
2. Opens/creates `data/evidence.db`
3. Runs `schema.sql` to create tables (IF NOT EXISTS)
4. Returns the database instance

**Verify:** `node -e "require('./db/init.js')"` → `data/evidence.db` file appears, no errors

---

### Step 1.4 — Create API Route Skeleton

Create the API router with all endpoints returning placeholder data.

**Files created:**
- `routes/api.js` — All GET endpoints from architecture Section 5.1
- `routes/pipeline.js` — Pipeline trigger endpoints (POST)

**Endpoints (all return `{ status: 'ok', data: [] }` for now):**

| Route | Purpose |
|---|---|
| `GET /api/stats` | Aggregate KPIs |
| `GET /api/evidence` | Paginated evidence list |
| `GET /api/evidence/:id` | Single evidence node |
| `GET /api/scenarios` | Scenario breakdown |
| `GET /api/memory-matrix` | Remember vs Forget data |
| `GET /api/failures` | Failure taxonomy |
| `GET /api/segments` | User segments |
| `GET /api/opportunities` | Opportunity list |
| `GET /api/journey` | Journey stage data |
| `GET /api/quotes/:id` | Quotes per opportunity |
| `GET /api/export/csv` | CSV export |
| `GET /api/export/json` | JSON export |
| `POST /api/pipeline/collect` | Trigger collection |
| `POST /api/pipeline/process` | Trigger processing |
| `POST /api/pipeline/score` | Trigger scoring |
| `GET /api/pipeline/status` | Pipeline status |

**Verify:** `npm run dev` → `curl http://localhost:3000/api/stats` returns `{"status":"ok","data":[]}`

---

### Step 1.5 — Create Static Dashboard Shell

Create the bare HTML file with the Sapphire design system CSS and empty layout.

**Files created:**
- `public/index.html` — Full HTML structure (sidebar + header + main content area)
- `public/css/styles.css` — All CSS: design tokens + typography + component classes + layout
- `public/js/app.js` — Hash router + page rendering stubs
- `public/js/api.js` — Fetch wrapper for `/api/*` calls

**What `index.html` contains:**
1. Google Fonts links (Manrope, Hanken Grotesk, Material Symbols)
2. Sidebar with 10 navigation items (matching Stitch design)
3. Fixed header with search input, filter presets, export button
4. Global filter bar
5. Empty `<main id="page-content">` container
6. Script tags for `app.js` and `api.js`

**What `styles.css` contains:**
1. CSS custom properties (all Sapphire color tokens from Stitch DESIGN.md)
2. Typography utility classes (`.text-display-sm`, `.text-headline-md`, etc.)
3. Spacing utilities (`.p-md`, `.gap-sm`, etc.)
4. Component styles: cards, badges, chips, buttons, inputs, tables
5. Layout: sidebar, header, filter bar, page container, responsive breakpoints

**What `app.js` contains:**
1. Hash router mapping `#/overview` → render function
2. Sidebar active state management (highlight current nav item)
3. Placeholder render functions for all 10 pages (just show page title for now)

**What `api.js` contains:**
1. `fetchAPI(endpoint, params)` — wrapper around `fetch('/api/...')`
2. Query param builder from filter state

**Verify:** `npm run dev` → browser at `http://localhost:3000`
- See: Sapphire-styled sidebar with 10 nav items
- See: Fixed header with search + export
- See: Filter bar with chip buttons
- Click sidebar items → hash changes, page title updates
- Fonts load correctly (Manrope for headings, Hanken Grotesk for body)

---

### ✅ Phase 1 Checkpoint

At this point you have:
- A running Express server
- SQLite database with schema
- API routes returning placeholder data
- A styled dashboard shell matching the Stitch design
- Client-side routing between 10 pages
- **0 evidence data, 0 AI calls, 0 real content — but it works end to end**

---

## Phase 2 — Data Collection & Storage

> **Goal**: Real user feedback data stored in SQLite, viewable via API

---

### Step 2.1 — Build Reddit Collector

Create the data collector that fetches public Reddit posts about Google Photos search problems.

**Files created:**
- `pipeline/collector.js`

**What it does:**
1. Searches Reddit public JSON API: `https://www.reddit.com/r/googlephotos/search.json?q=...&limit=100`
2. Uses the 12 search terms from architecture Section 7.2
3. Extracts: `source_platform`, `source_url`, `source_date`, `original_text`
4. Deduplicates by URL
5. Inserts raw records into `evidence_nodes` table with `relevance = 'unprocessed'`
6. Logs collection stats (total found, duplicates skipped, new inserted)
7. Handles rate limiting (Reddit limits to 10 req/min for unauthenticated)

**Important:**
- Does NOT fabricate any data
- Records `collection_limitations` if a request fails
- Stores the exact, unmodified original text

**Verify:** `node -e "require('./pipeline/collector.js').collectReddit()"` → check `data/evidence.db` has new rows

---

### Step 2.2 — Build Manual Ingest

Add ability to load evidence from a JSON file (for diary studies, lab transcripts, curated datasets).

**Update:**
- `pipeline/collector.js` — add `ingestFromJSON(filepath)` function

**JSON format expected:**
```json
[
  {
    "source_platform": "usability_lab",
    "source_url": null,
    "source_date": "2024-04-15",
    "original_text": "I remember my sister was wearing that bright yellow raincoat..."
  }
]
```

**Also create:**
- `data/raw/sample-evidence.json` — A curated set of 20–30 real-world representative examples from public sources (manually gathered). These serve as the seed dataset so the dashboard has content from day one.

**Important:** Every sample must be a real, publicly available user statement. Never fabricate. Include source URLs where available.

**Verify:** `npm run seed` → database populated with sample data

---

### Step 2.3 — Wire Collection to API

Connect the collector to the pipeline API endpoint.

**Update:**
- `routes/pipeline.js` — `POST /api/pipeline/collect` now triggers `collector.collectReddit()`
- Returns `{ status: 'running', collected: N, skipped: N }`

**Verify:** `curl -X POST http://localhost:3000/api/pipeline/collect` → returns collection stats

---

### Step 2.4 — Build Evidence List API

Wire the `GET /api/evidence` endpoint to return real data from SQLite.

**Update:**
- `routes/api.js` — Replace placeholder with real query
- Support query params: `?page=1&limit=20&source=reddit&search=yellow jacket`
- Return: `{ data: [...], total: N, page: N, pages: N }`

**Update:**
- `routes/api.js` — `GET /api/evidence/:id` returns full single node

**Verify:** `curl http://localhost:3000/api/evidence?page=1&limit=5` → returns real evidence records

---

### ✅ Phase 2 Checkpoint

At this point you have:
- Real evidence data in SQLite (from Reddit + manual seed)
- API returning real paginated data
- Collection can be triggered via API
- **All evidence is raw/unprocessed — no AI yet**

---

## Phase 3 — AI Processing Pipeline

> **Goal**: Every evidence node gets classified, extracted, and scored by Gemini

---

### Step 3.1 — Build Gemini API Client

Create the LLM wrapper with rate limiting for free tier.

**Files created:**
- `pipeline/gemini.js`

**What it does:**
1. Initializes Gemini client with API key from `.env`
2. Uses `gemini-2.0-flash` model (free tier)
3. Rate limiter: 4.2s delay between calls (stays under 15 RPM)
4. JSON-only response parsing with error handling
5. Retry logic: 1 retry on transient failure, then skip with error logged

**Key function:**
```javascript
async function callGemini(prompt) → parsed JSON object
```

**Verify:** Simple test call → returns valid JSON response

---

### Step 3.2 — Build Unified Processor

Create the single-call processor that extracts ALL fields from one evidence node in one Gemini call.

**Files created:**
- `pipeline/processor.js`

**What it does:**
1. Queries all `evidence_nodes` where `relevance = 'unprocessed'`
2. For each node, sends ONE combined extraction prompt to Gemini (architecture Section 6.3)
3. Prompt extracts all of:
   - Relevance classification + reasoning
   - Scenario type
   - Memory clues (JSON array)
   - Forgotten info (JSON array)
   - Search queries + methods
   - Failure type + detail
   - Workaround + effort
   - User segment
   - Severity + confidence + evidence_type
   - Supporting quote (must be substring of original text)
4. **Validates** the response:
   - `supporting_quote` must be a substring of `original_text` (anti-hallucination check)
   - `confidence` must be between 0.0 and 1.0
   - `failure_type` must be from the allowed enum
   - If validation fails → mark as `evidence_type: 'hypothesis'` with low confidence
5. Updates the database row with all extracted fields
6. Logs progress: `Processed 15/200 nodes (7.5%)`

**Anti-hallucination safeguards built into this step:**
- `supporting_quote` substring check
- Confidence clamping
- Enum validation for all categorical fields
- Any invalid AI response → flagged, not silently accepted

**Verify:** `node -e "require('./pipeline/processor.js').processAll()"` → evidence nodes now have all extracted fields populated

---

### Step 3.3 — Build Opportunity Clusterer

After all nodes are processed, cluster similar failures into opportunity areas.

**Update:**
- `pipeline/processor.js` — add `clusterOpportunities()` function

**What it does:**
1. Groups processed evidence by `failure_type`
2. For each group with ≥ 3 evidence nodes:
   - Sends a synthesis prompt to Gemini asking for: opportunity name, user problem, memory pattern, failure summary
   - Creates/updates a row in `opportunities` table
3. Links evidence nodes to their opportunity via `opportunity_id`
4. Counts evidence per opportunity

**Verify:** `opportunities` table has 5–8 rows, each linked to multiple evidence nodes

---

### Step 3.4 — Build Scoring Engine

Calculate transparent opportunity scores — NO AI, purely mathematical.

**Files created:**
- `pipeline/scorer.js`

**What it does (from architecture Section 6.4):**
```
Score = (0.20 × Frequency) + (0.25 × Severity) + (0.15 × Evidence Strength) 
      + (0.15 × User Breadth) + (0.15 × Retrieval Impact) + (0.10 × Workaround Difficulty)
```

1. For each opportunity:
   - Frequency = `evidence_count / total_count`
   - Severity = average of linked nodes (critical=1.0, high=0.75, medium=0.5, low=0.25)
   - Evidence Strength = average confidence of linked nodes
   - User Breadth = distinct segments / total segments
   - Retrieval Impact = % of linked nodes where `workaround_effort = 'abandoned'`
   - Workaround Difficulty = average effort (abandoned=1.0, high=0.75, medium=0.5, low=0.25)
2. Stores all 6 dimension scores + composite
3. Stores the exact `scoring_methodology` string explaining the calculation
4. Assigns confidence label: High / Medium / Low (per architecture Section 8.2)
5. Assigns priority: P0 (score ≥ 0.7), P1 (≥ 0.4), P2 (< 0.4)

**Verify:** `opportunities` table has composite scores, methodology strings, and priority labels

---

### Step 3.5 — Build Taxonomy Builder

Create the hierarchical failure taxonomy from processed evidence.

**Update:**
- `pipeline/processor.js` — add `buildTaxonomy()` function

**What it does:**
1. Aggregates failure types from evidence nodes
2. Creates parent taxonomy nodes (A–I from problem statement)
3. Creates child nodes for subtypes discovered in evidence
4. Calculates evidence count and percentage for each node
5. Inserts into `taxonomy_nodes` table

**Verify:** `taxonomy_nodes` table has hierarchical failure categories with counts

---

### Step 3.6 — Build Segment Discoverer

Aggregate evidence by user segment and build segment profiles.

**Update:**
- `pipeline/processor.js` — add `buildSegments()` function

**What it does:**
1. Groups evidence by `user_segment` field
2. For each segment with ≥ 2 evidence nodes:
   - Calculates most common memory type, failure mode, workaround
   - Creates a profile row in `user_segments` table

**Verify:** `user_segments` table has 4–9 segment profiles

---

### Step 3.7 — Wire Processing to API

Connect all pipeline stages to the API endpoints.

**Update:**
- `routes/pipeline.js`:
  - `POST /api/pipeline/process` → runs `processAll()` + `clusterOpportunities()` + `buildTaxonomy()` + `buildSegments()`
  - `POST /api/pipeline/score` → runs `scoreAll()`
  - `GET /api/pipeline/status` → returns counts of unprocessed, processed, total nodes

**Verify:** Full pipeline runnable via API:
```bash
curl -X POST http://localhost:3000/api/pipeline/collect
curl -X POST http://localhost:3000/api/pipeline/process
curl -X POST http://localhost:3000/api/pipeline/score
curl http://localhost:3000/api/pipeline/status
```

---

### ✅ Phase 3 Checkpoint

At this point you have:
- Gemini free tier integration with rate limiting
- Every evidence node classified and extracted
- Opportunities clustered and scored transparently
- Taxonomy and segments built from evidence
- Full pipeline triggerable via API
- **Backend is complete. All data endpoints ready.**

---

## Phase 4 — Dashboard Pages (Frontend)

> **Goal**: Every dashboard section from the Stitch design rendered with real data

---

### Step 4.1 — Wire All Data API Endpoints

Replace all placeholder API returns with real SQLite queries.

**Update — `routes/api.js`:**

| Endpoint | Query Logic |
|---|---|
| `GET /api/stats` | COUNT queries across all tables |
| `GET /api/scenarios` | GROUP BY `scenario_type`, count + percentage |
| `GET /api/memory-matrix` | Parse `memory_clues` and `forgotten_info` JSON, aggregate frequencies |
| `GET /api/failures` | JOIN `taxonomy_nodes` with evidence counts |
| `GET /api/segments` | SELECT all from `user_segments` with evidence counts |
| `GET /api/opportunities` | SELECT all ordered by `composite_score` DESC |
| `GET /api/journey` | Aggregate failure types mapped to 8 journey stages |
| `GET /api/quotes/:id` | SELECT evidence with `opportunity_id`, return top quotes by confidence |

**All endpoints support filters:**
```
?source=reddit&severity=critical,high&confidence_min=0.85&search=text
```

**Verify:** Every endpoint returns structured, real data

---

### Step 4.2 — Build Overview Page

The default landing page — most complex, mirrors the Stitch design overview.

**Update — `public/js/components.js`:**

Create these render functions (each fetches from its API endpoint):

1. **`renderKPIStrip()`** — 6 metric cards in a grid
   - Sources Analyzed, Retrieval Signals, Scenarios, Failure Modes, Opportunities, User Segments
   - Each shows count + trend indicator

2. **`renderProblemDistribution()`** — Stacked horizontal progress bar
   - Visual Ambiguity %, Temporal Vagueness %, Metadata Void %, Linguistic Gap %
   - Color-coded segments matching Stitch design
   - "Key Finding" info box below

3. **`renderMemoryMatrix()`** — Two-column side-by-side
   - Left (green): "What Users Remember" — progress bars with percentages
   - Right (red): "What Users Forget" — progress bars with percentages

4. **`renderFailureBreakdown()`** — Ranked list cards
   - Each failure mode: name, description, evidence count badge, percentage

5. **`renderOpportunitySpaces()`** — 2×2 card grid
   - P0/P1 priority labels, opportunity name, description, verified/pending icons

6. **`renderScenarioCards()`** — 6 cards in a responsive grid
   - Icon, percentage badge, name, description, node count, priority label

**Update — `public/js/app.js`:**
- `renderOverview()` calls all 6 component functions and assembles them in the page

**Verify:** Navigate to `http://localhost:3000/#/overview` → see full Stitch-style overview with real data

---

### Step 4.3 — Build Retrieval Journey Visualization

The 8-stage horizontal journey strip.

**Update — `public/js/components.js`:**

**`renderRetrievalJourney()`:**
- 8 cards in a horizontal/responsive grid
- Each stage: number, icon, title, description, user quote
- Stages 3 (Query Formation) and 6 (Evaluation) highlighted in red with "% Drop" badge
- Legend: Normal Transition vs High Failure Point
- User quotes pulled from representative evidence nodes

**Verify:** Journey section shows 8 stages with real quotes and correct breakdown highlighting

---

### Step 4.4 — Build Evidence Explorer

The searchable evidence table + inspection panel.

**Update — `public/js/components.js`:**

**`renderEvidenceTable(data)`:**
- Responsive HTML table with 8 columns: Source/Date, Statement Preview, Scenario, Memory vs Forgotten, Failure Point, Severity, Confidence, Inspect button
- Client-side text search filtering (input at top)
- Pagination controls (Prev / Page N of M / Next)
- Row click → highlights row, updates inspection panel
- Severity badges: color-coded (red for High, neutral for Med)
- Confidence shown as bold percentage

**`renderInspectionPanel(nodeId)`:**
- Fetches `GET /api/evidence/:id`
- Section 1 — Direct Evidence:
  - Verbatim quote in blockquote
  - Raw search queries in code blocks
  - Workaround description
- Section 2 — AI Interpretation:
  - Episodic cues as colored chips
  - Cognitive gap analysis text
  - Taxonomy mapping
  - Evidence type badge (direct / inference / hypothesis)
  - Confidence score

**Verify:** Click through evidence rows → inspection panel updates with full detail

---

### Step 4.5 — Build Remaining Pages

Each page is a focused deep-dive into one data dimension.

**Update — `public/js/app.js`** — implement all remaining render functions:

| Page | Route | Key Component | Data Source |
|---|---|---|---|
| **Retrieval Scenarios** | `#/retrieval-scenarios` | Expanded scenario cards with example quotes, memory patterns per scenario | `GET /api/scenarios` |
| **Memory Signals** | `#/memory-signals` | Full remember vs forget breakdown with per-scenario drill-down | `GET /api/memory-matrix` |
| **Failure Modes** | `#/failure-modes` | Hierarchical taxonomy tree (parent → children) with evidence counts | `GET /api/failures` |
| **User Segments** | `#/user-segments` | Segment profile cards + Segment × Problem cross-tab matrix | `GET /api/segments` |
| **Opportunity Map** | `#/opportunity-map` | Scored table with all 6 dimension scores visible + methodology | `GET /api/opportunities` |
| **Retrieval Journey** | `#/retrieval-journey` | Full-page 8-stage journey (reuses Step 4.3 component) | `GET /api/journey` |
| **Evidence & Quotes** | `#/evidence-quotes` | Grouped by opportunity — verbatim quotes with source links | `GET /api/quotes/:id` |
| **Export & Synthesis** | `#/export-synthesis` | Export buttons (CSV, JSON, Report) + dataset summary stats | `GET /api/export/*` |

**Verify:** All 10 sidebar nav items lead to working pages with real data

---

### Step 4.6 — Build Global Filter System

Filters apply across ALL pages simultaneously.

**Update — `public/js/utils.js`:**

**`FilterState` object:**
```javascript
const filters = {
    source: [],           // ['reddit', 'play_store']
    scenario: [],         // ['travel_memory']
    failure: [],          // ['semantic_gap']
    severity: [],         // ['critical', 'high']
    confidence_min: 0,    // 0.85
    search: '',           // free text
    date_from: null,
    date_to: null
};
```

**How it works:**
1. Filter bar chip buttons toggle values in `FilterState`
2. Active filters shown as removable chip tokens
3. Every API call appends filter params: `api.fetchAPI('/api/evidence', filters)`
4. Server-side: `routes/api.js` builds SQL WHERE clauses from query params
5. "Matched Nodes: X of Y" counter updates in real time
6. "Reset" button clears all filters

**Verify:** Toggle filters → table updates, KPIs recalculate, all pages reflect filtered data

---

### ✅ Phase 4 Checkpoint

At this point you have:
- All 10 dashboard pages fully working with real data
- Evidence table with search, pagination, and inspection panel
- Global filters affecting all views
- Retrieval journey visualization
- Memory matrix, failure taxonomy, opportunity map
- **The dashboard is functionally complete**

---

## Phase 5 — Export, Persistence & Deploy

> **Goal**: Export works, data survives redeploy, app runs on Render

---

### Step 5.1 — Build Export Functions

Wire the export endpoints to generate downloadable files.

**Update — `routes/api.js`:**

| Endpoint | Output |
|---|---|
| `GET /api/export/csv` | CSV file download — all evidence columns, source URLs preserved |
| `GET /api/export/json` | JSON file download — full evidence corpus with metadata |
| `GET /api/export/report` | JSON with top opportunities, quotes, methodology, traceability |

**CSV implementation:** Manual string building (no library needed — `evidence_nodes` is a flat table).

**Update — `public/js/components.js`:**
- Export page buttons trigger downloads via `window.location = '/api/export/csv'`

**Verify:** Click "Export CSV" → downloads valid CSV file with all columns and source URLs

---

### Step 5.2 — Build Data Persistence Layer

Since Render free tier has no persistent disk, ensure data survives redeployments.

**Files created:**
- `db/seed.js` — Reads JSON files from `data/raw/` and `data/processed/`, rebuilds SQLite

**Strategy:**
1. Raw collected evidence saved to `data/raw/evidence.json` (committed to repo)
2. Processed results saved to `data/processed/nodes.json` (committed to repo)
3. On server startup: `db/init.js` checks if DB exists
   - If not → runs `seed.js` to rebuild from JSON files
   - If yes → uses existing DB
4. Pipeline `process` endpoint: after processing, also writes results back to `data/processed/nodes.json`

**Update — `server.js`:**
- On startup: check `data/evidence.db` exists, if not → auto-seed

**Verify:** Delete `data/evidence.db` → restart server → DB auto-rebuilds from JSON

---

### Step 5.3 — Add Responsive Design

Make dashboard usable on tablet (Render preview, PM sharing).

**Update — `public/css/styles.css`:**

| Breakpoint | Changes |
|---|---|
| `< 1024px` | Sidebar becomes overlay drawer (toggled by hamburger menu) |
| `< 768px` | KPI strip: 2 columns instead of 6. Evidence table: horizontal scroll. Filter bar: horizontal scroll |
| Inspection panel | Becomes full-width section below table on small screens |

**Verify:** Resize browser → layout adapts cleanly

---

### Step 5.4 — Deploy to Render

Push to Render free tier.

**Files created:**
- `render.yaml` (optional — can also configure via Render dashboard)

**Deployment steps:**
1. Create Git repo (separate from this dev workspace)
2. Push code to GitHub/GitLab
3. Connect repo to Render → "New Web Service"
4. Settings:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `node server.js`
   - Plan: Free
5. Add environment variable: `GEMINI_API_KEY`
6. Deploy

**Verify:** `https://photos-discovery-engine.onrender.com` loads the dashboard

---

### Step 5.5 — Final Validation

Run through the Definition of Done from the problem statement.

| # | Requirement | How to Verify |
|---|---|---|
| 1 | Collect or ingest public user feedback | `POST /api/pipeline/collect` returns data |
| 2 | Filter for vague-photo-retrieval problems | Evidence table shows only relevant nodes |
| 3 | Extract what users remember | Memory matrix shows "What Users Remember" bars |
| 4 | Extract what users forgot | Memory matrix shows "What Users Forget" bars |
| 5 | Identify retrieval attempts | Evidence inspection panel shows search queries |
| 6 | Identify retrieval failure points | Failure modes page shows taxonomy with counts |
| 7 | Identify workarounds | Evidence table shows workaround column |
| 8 | Discover meaningful user segments | User segments page shows profiles |
| 9 | Cluster evidence into opportunity areas | Opportunity map shows scored opportunities |
| 10 | Quantify opportunity frequency | Opportunity scores show frequency dimension |
| 11 | Preserve source traceability | Every evidence node has source_url, clickable |
| 12 | Distinguish evidence from inference | Badges: green (direct) / blue (inference) / amber (hypothesis) |
| 13 | Generate structured opportunity map | Opportunity map page with all 6 scoring dimensions |
| 14 | Produce outputs for Parts 2–4 | Export CSV/JSON/Report with full traceability |

---

### ✅ Phase 5 Checkpoint — DONE

The Discovery Engine is complete:
- Deployed on Render free tier
- Real evidence data collected and processed
- All 8 required outputs available in the dashboard
- Export working (CSV, JSON, Report)
- Source traceability: Insight → Evidence → Original Source
- Anti-hallucination: every insight has confidence + evidence type + supporting quote

---

## Execution Order Summary

```
Phase 1 — Skeleton (Steps 1.1–1.5)
  1.1  package.json + npm install
  1.2  server.js (Express entry point)
  1.3  SQLite schema + init
  1.4  API route skeleton (placeholders)
  1.5  Static dashboard shell (HTML + CSS + router)
  ── Checkpoint: Running server with styled empty dashboard ──

Phase 2 — Data (Steps 2.1–2.4)
  2.1  Reddit collector
  2.2  Manual JSON ingest + seed data
  2.3  Wire collection to API
  2.4  Evidence list API (real queries)
  ── Checkpoint: Real data in DB, visible via API ──

Phase 3 — AI Pipeline (Steps 3.1–3.7)
  3.1  Gemini API client with rate limiter
  3.2  Unified processor (single-call extraction)
  3.3  Opportunity clusterer
  3.4  Scoring engine (transparent, no AI)
  3.5  Taxonomy builder
  3.6  Segment discoverer
  3.7  Wire pipeline to API
  ── Checkpoint: Backend complete, all data processed ──

Phase 4 — Dashboard (Steps 4.1–4.6)
  4.1  Wire all data API endpoints
  4.2  Overview page (KPIs, charts, matrix)
  4.3  Retrieval journey visualization
  4.4  Evidence explorer + inspection panel
  4.5  All remaining pages (8 pages)
  4.6  Global filter system
  ── Checkpoint: Dashboard functionally complete ──

Phase 5 — Ship (Steps 5.1–5.5)
  5.1  Export functions (CSV, JSON, Report)
  5.2  Data persistence (JSON backup for Render)
  5.3  Responsive design
  5.4  Deploy to Render
  5.5  Final validation against Definition of Done
  ── Checkpoint: DEPLOYED AND VALIDATED ──
```

---

## File Creation Order

This is the exact sequence of files to create, in dependency order:

| Step | File(s) | Depends On |
|---|---|---|
| 1.1 | `package.json` | — |
| 1.2 | `server.js`, `.env.example`, `.gitignore` | 1.1 |
| 1.3 | `db/schema.sql`, `db/init.js`, `db/queries.js` | 1.2 |
| 1.4 | `routes/api.js`, `routes/pipeline.js` | 1.3 |
| 1.5 | `public/index.html`, `public/css/styles.css`, `public/js/app.js`, `public/js/api.js` | 1.4 |
| 2.1 | `pipeline/collector.js` | 1.3 |
| 2.2 | `data/raw/sample-evidence.json`, `db/seed.js` | 2.1 |
| 2.3 | Update `routes/pipeline.js` | 2.1, 1.4 |
| 2.4 | Update `routes/api.js` | 1.3, 1.4 |
| 3.1 | `pipeline/gemini.js` | 1.1 (needs @google/genai) |
| 3.2 | `pipeline/processor.js` | 3.1, 1.3 |
| 3.3 | Update `pipeline/processor.js` | 3.2 |
| 3.4 | `pipeline/scorer.js` | 1.3 |
| 3.5 | Update `pipeline/processor.js` | 3.2 |
| 3.6 | Update `pipeline/processor.js` | 3.2 |
| 3.7 | Update `routes/pipeline.js` | 3.2, 3.4 |
| 4.1 | Update `routes/api.js` | 1.3 |
| 4.2 | Update `public/js/components.js` (new), `public/js/app.js` | 4.1 |
| 4.3 | Update `public/js/components.js` | 4.1 |
| 4.4 | Update `public/js/components.js` | 4.1 |
| 4.5 | Update `public/js/app.js` | 4.2–4.4 |
| 4.6 | `public/js/utils.js`, update `public/js/api.js` | 4.5 |
| 5.1 | Update `routes/api.js` | 4.1 |
| 5.2 | Update `db/seed.js`, `server.js` | 2.2 |
| 5.3 | Update `public/css/styles.css` | 4.2 |
| 5.4 | `render.yaml` | all |
| 5.5 | Manual testing | all |

**Total unique files: ~18**
