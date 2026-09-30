# Architecture — Google Photos AI-Powered Discovery Engine

> **Project**: Google Photos Retrieval Research · Discovery Engine  
> **Version**: 1.1  
> **Design Reference**: Sapphire Research Console (Stitch AI)  
> **Deployment**: Render Free Tier (single service)  
> **Status**: Planning

---

## 1. System Overview

The Discovery Engine is an **evidence-driven product research platform** — a single, lightweight web application that collects, classifies, and synthesizes public user feedback about vague photo retrieval in Google Photos.

### Key Constraints

| Constraint | Decision |
|---|---|
| **Unified codebase** | Frontend + Backend in one project, one server, one deploy |
| **Render free tier** | 512 MB RAM, auto-sleep after 15 min inactivity, 750 hrs/month |
| **Small footprint** | No heavy frameworks, no build tools, minimal `node_modules` |
| **Free tier APIs only** | Google Gemini free tier (15 RPM, 1M tokens/day), no paid services |
| **No hallucination** | Every insight must chain to real evidence — never fabricate data |

```
┌────────────────────────────────────────────────────────┐
│              SINGLE NODE.JS SERVER (Render)             │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Express.js                                      │  │
│  │                                                  │  │
│  │  /api/*  ──▶  Pipeline + Data + LLM logic        │  │
│  │  /*      ──▶  Static HTML/CSS/JS (Dashboard)     │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                              │
│                         ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │          SQLite (single file on disk)             │  │
│  │          evidence.db (~5-10 MB max)               │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

**Everything runs as one Node.js process.** No separate frontend server, no build pipeline, no Docker.

| Layer | Technology | Why |
|---|---|---|
| **Server** | Express.js | Lightweight, serves both API routes and static files |
| **Database** | better-sqlite3 | Zero-config, single-file DB, no external service needed |
| **LLM** | Google Gemini API (free tier) | 15 requests/min, 1M tokens/day, sufficient for batch processing |
| **Frontend** | Static HTML + Vanilla CSS + Vanilla JS | Zero build step, no bundler, no framework, tiny footprint |
| **Typography** | Manrope + Hanken Grotesk (Google Fonts CDN) | Loaded from CDN, zero bundle cost |
| **Icons** | Material Symbols Outlined (Google Fonts CDN) | Loaded from CDN, zero bundle cost |
| **Deployment** | Render Free Tier (Web Service) | `node server.js`, auto-deploy from Git |

### What We Do NOT Use (To Stay Minimal)

- ❌ React / Vue / Svelte — no framework
- ❌ Vite / Webpack / Rollup — no build tools
- ❌ TailwindCSS — vanilla CSS with custom properties
- ❌ PostgreSQL / MongoDB — SQLite only
- ❌ Redis / Queues — in-process only
- ❌ Docker — Render runs Node.js natively
- ❌ Any paid API — free tier everything

### Estimated Package Size

```
node_modules estimate:
  express          ~1.8 MB
  better-sqlite3   ~8 MB (native binary)
  @google/genai    ~0.5 MB
  cors, dotenv     ~0.1 MB
  ─────────────────────
  Total:           ~10 MB

Static frontend:    ~150 KB (HTML + CSS + JS)
SQLite database:    ~5-10 MB (evidence corpus)
─────────────────────────────────
Full deploy:        < 25 MB
```

---

## 3. Project Structure

Single flat project — no monorepo, no workspaces, no sub-packages.

```
V1 Google Photos/
├── problemStatement.md          # Source of truth
├── architecture.md              # This file
├── stitch_photo_retrieval_discovery_engine/
│   ├── code.html                # Stitch UI reference (not deployed)
│   ├── DESIGN.md                # Sapphire design system spec
│   └── screen.png               # Design screenshot
│
├── server.js                    # Express server (entry point)
├── package.json                 # Minimal dependencies
├── .env.example                 # Environment variable template
│
├── db/
│   ├── schema.sql               # SQLite table definitions
│   ├── seed.js                  # Seed database with initial data
│   └── queries.js               # Reusable query helpers
│
├── pipeline/
│   ├── collector.js             # Data collection (all sources)
│   ├── processor.js             # All 10 pipeline stages in one file
│   └── scorer.js                # Transparent scoring engine
│
├── routes/
│   ├── api.js                   # All API endpoints
│   └── pipeline.js              # Pipeline trigger endpoints
│
├── public/                      # Static files (served by Express)
│   ├── index.html               # Single-page dashboard
│   ├── css/
│   │   └── styles.css           # All styles (design tokens + components + layout)
│   └── js/
│       ├── app.js               # Main app controller + router
│       ├── components.js        # All UI components
│       ├── api.js               # Fetch wrapper for /api/* calls
│       └── utils.js             # Helpers (filters, search, export)
│
├── data/
│   └── evidence.db              # SQLite database file (gitignored)
│
└── render.yaml                  # Render deployment config (optional)
```

**Total files: ~20.** Intentionally flat and minimal.

---

## 4. Data Architecture

### 4.1 Evidence Node (Core Table)

Every piece of user feedback is one row. This is the atomic unit.

```sql
CREATE TABLE evidence_nodes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Source Traceability (never lose the origin)
    source_platform TEXT NOT NULL,       -- 'reddit', 'play_store', 'community', 'manual'
    source_url      TEXT,                -- Original URL for traceability
    source_date     TEXT,                -- When the user posted (ISO date)
    collected_at    TEXT NOT NULL,       -- When we collected it (ISO timestamp)
    
    -- Original Content (sacred — never modify)
    original_text   TEXT NOT NULL,       -- Verbatim user statement
    
    -- AI Classification
    relevance           TEXT NOT NULL DEFAULT 'unprocessed',  -- 'relevant'|'potentially_relevant'|'not_relevant'
    relevance_reasoning TEXT,
    
    -- Extraction Results (all stored as JSON strings)
    scenario_type       TEXT,            -- 'travel_memory', 'event_memory', etc.
    memory_clues        TEXT,            -- JSON array: what user remembers
    forgotten_info      TEXT,            -- JSON array: what user forgot
    search_queries      TEXT,            -- JSON array: actual queries tried
    search_methods      TEXT,            -- JSON array: 'keyword', 'scroll', etc.
    failure_type        TEXT,            -- 'semantic_gap', 'missing_metadata', etc.
    failure_detail      TEXT,            -- Why retrieval failed
    workaround          TEXT,            -- What user did instead
    workaround_effort   TEXT,            -- 'low'|'medium'|'high'|'abandoned'
    user_segment        TEXT,            -- Discovered segment label
    
    -- Scoring
    severity        TEXT DEFAULT 'medium',   -- 'critical'|'high'|'medium'|'low'
    confidence      REAL DEFAULT 0.0,        -- 0.0 to 1.0
    evidence_type   TEXT DEFAULT 'direct_evidence',  -- 'direct_evidence'|'ai_inference'|'hypothesis'
    
    -- Opportunity Link
    opportunity_id  INTEGER,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
);
```

### 4.2 Opportunities Table

```sql
CREATE TABLE opportunities (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    priority            TEXT NOT NULL,       -- 'P0'|'P1'|'P2'
    user_problem        TEXT NOT NULL,
    memory_pattern      TEXT,
    missing_information TEXT,
    failure_point       TEXT,
    typical_workaround  TEXT,
    affected_segments   TEXT,               -- JSON array
    evidence_count      INTEGER DEFAULT 0,
    
    -- Transparent Scores (all 0.0-1.0, methodology shown in UI)
    frequency_score     REAL DEFAULT 0,
    severity_score      REAL DEFAULT 0,
    evidence_strength   REAL DEFAULT 0,
    user_breadth        REAL DEFAULT 0,
    workaround_difficulty REAL DEFAULT 0,
    composite_score     REAL DEFAULT 0,
    
    confidence          TEXT DEFAULT 'low',  -- 'high'|'medium'|'low'
    scoring_methodology TEXT                 -- Exact formula + inputs shown to PM
);
```

### 4.3 Taxonomy Table

```sql
CREATE TABLE taxonomy_nodes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id       INTEGER,
    code            TEXT NOT NULL UNIQUE,    -- 'A', 'B', 'C.1'
    label           TEXT NOT NULL,
    description     TEXT,
    evidence_count  INTEGER DEFAULT 0,
    percentage      REAL DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES taxonomy_nodes(id)
);
```

### 4.4 Segments Table

```sql
CREATE TABLE user_segments (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    label               TEXT NOT NULL UNIQUE,
    description         TEXT,
    typical_memory_type TEXT,           -- JSON array
    dominant_failure     TEXT,
    dominant_workaround  TEXT,
    evidence_count      INTEGER DEFAULT 0
);
```

**Total tables: 4.** Intentionally simple.

---

## 5. API Design

All API routes live under `/api/`. The same Express server serves these AND the static frontend.

### 5.1 Data Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/stats` | Aggregate KPIs (counts, percentages) |
| `GET` | `/api/evidence` | Paginated evidence list with filters |
| `GET` | `/api/evidence/:id` | Single evidence node (full detail) |
| `GET` | `/api/scenarios` | Retrieval scenario breakdown |
| `GET` | `/api/memory-matrix` | Remember vs Forget aggregated data |
| `GET` | `/api/failures` | Failure taxonomy with counts |
| `GET` | `/api/segments` | User segment profiles |
| `GET` | `/api/opportunities` | Scored opportunity list |
| `GET` | `/api/journey` | Retrieval journey stage data |
| `GET` | `/api/quotes/:opportunity_id` | Representative quotes per opportunity |

### 5.2 Pipeline Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/pipeline/collect` | Trigger data collection |
| `POST` | `/api/pipeline/process` | Run AI processing on unprocessed nodes |
| `POST` | `/api/pipeline/score` | Recalculate opportunity scores |
| `GET`  | `/api/pipeline/status` | Pipeline run status |

### 5.3 Export Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/export/csv` | Full evidence table as CSV |
| `GET` | `/api/export/json` | Full evidence corpus as JSON |
| `GET` | `/api/export/report` | Opportunity report as JSON |

### 5.4 Query Parameters (Filtering)

All list endpoints support these query params:

```
?source=reddit,play_store
&scenario=travel_memory,event_memory
&failure=semantic_gap
&severity=critical,high
&confidence_min=0.85
&search=yellow jacket waterfall
&page=1
&limit=20
```

---

## 6. Processing Pipeline

All 10 stages run inside the same Node.js process. No external workers, no queues.

### 6.1 Pipeline Flow

```
collector.js                    processor.js                    scorer.js
┌──────────┐    ┌──────────────────────────────────────────┐    ┌────────────┐
│ Collect   │───▶│ Stage 2: Relevance Filter               │───▶│ Stage 10:  │
│ raw data  │    │ Stage 3: Scenario Extraction             │    │ Score &    │
│ from      │    │ Stage 4: Memory Signal Extraction        │    │ Prioritize │
│ public    │    │ Stage 5: Search Attempt Extraction       │    │            │
│ sources   │    │ Stage 6: Failure Classification          │    │ Transparent│
│           │    │ Stage 7: Workaround Extraction           │    │ weighted   │
│           │    │ Stage 8: Segment Discovery               │    │ formula    │
│           │    │ Stage 9: Opportunity Clustering          │    │            │
└──────────┘    └──────────────────────────────────────────┘    └────────────┘
     │                          │                                      │
     └──────────────────────────┴──────────────────────────────────────┘
                                │
                       ┌────────┴────────┐
                       │   evidence.db   │
                       │   (SQLite)      │
                       └─────────────────┘
```

### 6.2 LLM Strategy (Gemini Free Tier)

| Constraint | Limit | Our Strategy |
|---|---|---|
| Requests/minute | 15 RPM | Batch with 4-second delays between calls |
| Tokens/day | 1,000,000 | Process ~200 evidence nodes/day |
| Model | `gemini-2.0-flash` | Fast, free, sufficient for classification |

**Prompt pattern** — every LLM call follows this structure:

```javascript
const prompt = {
  systemInstruction: "You are a Product Research Analyst. Respond ONLY in valid JSON.",
  contents: `
    TASK: ${taskDescription}
    USER STATEMENT: "${originalText}"
    
    RULES:
    - Base your answer ONLY on the text provided
    - Quote the exact fragment supporting your classification
    - Never invent information not present in the text
    - Assign confidence: 0.0-1.0
    - Label evidence_type: "direct_evidence" | "ai_inference" | "hypothesis"
    
    RESPOND IN JSON:
    ${jsonSchema}
  `
};
```

**Rate limiting**: Simple in-process queue with `setTimeout` — no external library needed.

```javascript
// Simple rate limiter for Gemini free tier (15 RPM)
const DELAY_MS = 4200; // ~14 requests/minute to stay safe
let lastCallTime = 0;

async function callGemini(prompt) {
    const now = Date.now();
    const wait = Math.max(0, DELAY_MS - (now - lastCallTime));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastCallTime = Date.now();
    
    const response = await model.generateContent(prompt);
    return JSON.parse(response.text());
}
```

### 6.3 Stages 2-9: Unified Processor

All extraction stages run in a single `processor.js` file. For each unprocessed evidence node:

1. **Relevance Filter** → relevant / not_relevant
2. If relevant → **Extract scenario** (travel, event, health, etc.)
3. **Extract memory clues** (JSON array of what user remembers)
4. **Extract forgotten info** (JSON array of what user forgot)
5. **Extract search attempts** (queries + methods)
6. **Classify failure** (semantic_gap, missing_metadata, etc.)
7. **Extract workaround** (what they did instead + effort)
8. **Assign segment** (traveler, parent, screenshot-user, etc.)

**One LLM call per evidence node** — we combine all extractions into a single prompt to conserve rate limits.

```javascript
// Single combined extraction prompt (saves rate limit)
const extractionPrompt = `
Given this user statement about finding a photo:
"${node.original_text}"

Extract ALL of the following in one JSON response:
{
  "relevance": "relevant|potentially_relevant|not_relevant",
  "relevance_reasoning": "why",
  "scenario_type": "travel_memory|event_memory|health_memory|object_product|person_memory|document_screenshot|other",
  "memory_clues": ["what user remembers"],
  "forgotten_info": ["what user forgot"],
  "search_queries": ["actual queries mentioned"],
  "search_methods": ["keyword|date_filter|scroll|person_search|gave_up"],
  "failure_type": "semantic_gap|missing_metadata|memory_expression|query_understanding|result_evaluation|search_refinement|memory_ambiguity|retrieval_fatigue|co_occurrence|ocr_failure",
  "failure_detail": "explain why retrieval failed",
  "workaround": "what they did instead",
  "workaround_effort": "low|medium|high|abandoned",
  "user_segment": "traveler|parent|professional|student|screenshot_user|archivist|event_focused",
  "severity": "critical|high|medium|low",
  "confidence": 0.0-1.0,
  "evidence_type": "direct_evidence|ai_inference|hypothesis",
  "supporting_quote": "exact text fragment from the statement"
}

RULES:
- Only use information present in the text. Never invent.
- If information is unclear, set confidence lower and evidence_type to "hypothesis"
- supporting_quote MUST be a substring of the original text
`;
```

### 6.4 Stage 10: Transparent Scoring

**No AI** — purely mathematical. Every score is explainable.

```
Opportunity Score = (0.20 × Frequency) 
                  + (0.25 × Severity) 
                  + (0.15 × Evidence Strength) 
                  + (0.15 × User Breadth) 
                  + (0.15 × Retrieval Impact) 
                  + (0.10 × Workaround Difficulty)
```

| Dimension | How It's Calculated |
|---|---|
| **Frequency** | `evidence_count / total_count` |
| **Severity** | Average: critical=1.0, high=0.75, medium=0.5, low=0.25 |
| **Evidence Strength** | Average confidence score of linked evidence |
| **User Breadth** | Distinct segments affected / total segments |
| **Retrieval Impact** | % where `workaround_effort = 'abandoned'` |
| **Workaround Difficulty** | Average: abandoned=1.0, high=0.75, medium=0.5, low=0.25 |

The methodology string is stored alongside every score so the PM can audit it.

---

## 7. Data Collection Strategy

### 7.1 Sources & Methods

| Source | Method | Free? | Notes |
|---|---|---|---|
| **Reddit** | Public JSON API (`/search.json?q=...&limit=100`) | ✅ Free | No auth needed for public posts |
| **Google Play Store** | Scrape public review pages | ✅ Free | Cheerio HTML parsing |
| **Google Photos Community** | Scrape public help forum threads | ✅ Free | Cheerio HTML parsing |
| **Manual Ingest** | Upload CSV/JSON file via dashboard | ✅ Free | For diary studies, lab transcripts |

**No Apple App Store** initially (requires authentication). Can add later if needed.

### 7.2 Search Terms

```javascript
const SEARCH_TERMS = [
    "can't find photo", "search not working google photos",
    "old photo search", "find picture", "photo retrieval",
    "remember photo but can't find", "search google photos",
    "find old picture", "photo search failing",
    "find screenshot", "looking for photo",
    "scroll through photos", "gave up searching photos"
];
```

### 7.3 Relevance Filter

Only keep content about **vague photo retrieval**. Discard:
- App crashes, battery, pricing, storage, backup, general UI
- Unless directly affecting retrieval

---

## 8. Frontend Architecture

### 8.1 Single HTML File + CSS + JS

No framework, no build step. The dashboard is pure static files served by Express.

```javascript
// server.js — this is the entire server setup
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));   // Serves the dashboard
app.use('/api', require('./routes/api'));
app.use('/api/pipeline', require('./routes/pipeline'));

app.listen(process.env.PORT || 3000);
```

### 8.2 Design System (Sapphire — from Stitch)

All Stitch design tokens converted to CSS custom properties in one `styles.css` file:

#### Colors

```css
:root {
    --surface:                  #f9f9ff;
    --surface-container-lowest: #ffffff;
    --surface-container-low:    #f1f3ff;
    --surface-container:        #e9edff;
    --surface-container-high:   #e1e8fd;
    --on-surface:               #141b2b;
    --on-surface-variant:       #444653;
    --outline:                  #757684;
    --primary:                  #00288e;
    --on-primary:               #ffffff;
    --primary-container:        #1e40af;
    --primary-fixed:            #dde1ff;
    --secondary:                #006c4a;
    --secondary-container:      #82f5c1;
    --error:                    #ba1a1a;
    --error-container:          #ffdad6;
    --on-error-container:       #93000a;
    --inverse-surface:          #293040;
    --inverse-on-surface:       #edf0ff;
}
```

#### Typography

```css
/* Headlines — Manrope */
.text-display-sm { font-family: 'Manrope', sans-serif; font-size: 2.25rem; font-weight: 600; }
.text-headline-lg { font-family: 'Manrope', sans-serif; font-size: 1.75rem; font-weight: 600; }
.text-headline-md { font-family: 'Manrope', sans-serif; font-size: 1.25rem; font-weight: 600; }
.text-headline-sm { font-family: 'Manrope', sans-serif; font-size: 1rem; font-weight: 600; }

/* Body & Labels — Hanken Grotesk */
.text-body-md { font-family: 'Hanken Grotesk', sans-serif; font-size: 0.9375rem; }
.text-body-sm { font-family: 'Hanken Grotesk', sans-serif; font-size: 0.8125rem; }
.text-label-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 0.875rem; font-weight: 600; }
.text-label-sm { font-family: 'Hanken Grotesk', sans-serif; font-size: 0.6875rem; font-weight: 500; }
```

### 8.3 Page Routing

Hash-based routing — no server-side rendering, no page reloads.

```javascript
// Client-side hash router (in app.js)
const routes = {
    'overview':           renderOverview,
    'evidence-explorer':  renderEvidenceExplorer,
    'retrieval-scenarios':renderScenarios,
    'memory-signals':     renderMemorySignals,
    'failure-modes':      renderFailureModes,
    'user-segments':      renderSegments,
    'opportunity-map':    renderOpportunityMap,
    'retrieval-journey':  renderJourney,
    'evidence-quotes':    renderQuotes,
    'export-synthesis':   renderExport,
};

window.addEventListener('hashchange', () => {
    const page = location.hash.slice(2) || 'overview';
    routes[page]?.();
});
```

### 8.4 Dashboard Layout (Matching Stitch Design)

```
┌──────────────────────────────────────────────────────────────┐
│                    FIXED HEADER (64px)                        │
│  [☰] Photos Engine · Discovery Engine  [🔍 Search] [Export]  │
├──────────┬───────────────────────────────────────────────────┤
│          │  FILTER BAR                                       │
│  SIDEBAR │  [Source] [Date] [Scenario] [Severity] [Conf]     │
│  (260px) ├───────────────────────────────────────────────────┤
│          │                                                   │
│  Nav:    │  PAGE CONTENT (scrollable)                        │
│  • Overv │                                                   │
│  • Evid. │  Rendered by hash router                          │
│  • Scen. │  All data fetched from /api/* endpoints           │
│  • Mem.  │                                                   │
│  • Fail. │                                                   │
│  • Seg.  │                                                   │
│  • Opp.  │                                                   │
│  • Jour. │                                                   │
│  • Quot. │                                                   │
│  • Exp.  │                                                   │
│          │                                                   │
│  ─────── │                                                   │
│  Corpus  │                                                   │
│  Status  │                                                   │
└──────────┴───────────────────────────────────────────────────┘
```

### 8.5 Dashboard Sections (from Stitch Design)

| Section | Data Endpoint | Key Visuals |
|---|---|---|
| **KPI Strip** (6 cards) | `GET /api/stats` | Sources, Signals, Scenarios, Failures, Opportunities, Segments |
| **Retrieval Problem Distribution** | `GET /api/failures` | Stacked bar: Visual Ambiguity, Temporal Vagueness, etc. |
| **Memory vs Forgotten Matrix** | `GET /api/memory-matrix` | Two-column: green "Remember" bars vs red "Forget" bars |
| **Top Failure Modes** | `GET /api/failures` | Ranked list with evidence counts |
| **Opportunity Spaces** | `GET /api/opportunities` | P0/P1 cards with scores |
| **Scenario Archetypes** | `GET /api/scenarios` | 6 cards: Travel, Event, Screenshot, etc. |
| **Retrieval Journey** | `GET /api/journey` | 8-stage strip with breakdown markers at steps 3 & 6 |
| **Evidence Table** | `GET /api/evidence?page=1` | Paginated table + Inspection Panel |

---

## 9. Required Outputs Mapping

| Problem Statement Output | Dashboard Section | Export |
|---|---|---|
| **Output 1 — Evidence Dataset** | Evidence Explorer (table) | CSV, JSON |
| **Output 2 — Retrieval Problem Taxonomy** | Failure Modes (tree) | JSON |
| **Output 3 — Memory vs Forgotten Matrix** | Memory Signals (bars) | CSV |
| **Output 4 — Opportunity Map** | Opportunity Map (scored table) | CSV, JSON |
| **Output 5 — Representative Quotes** | Evidence & Quotes | Markdown |
| **Output 6 — Retrieval Journey** | Journey (8-stage visual) | JSON |
| **Output 7 — Segment × Problem Matrix** | User Segments (cross-tab) | CSV |
| **Output 8 — Top Opportunity Areas** | Opportunity Map (top cards) | Full report |

---

## 10. Anti-Hallucination Rules

Hardcoded into every pipeline stage and enforced in the UI:

| Rule | Implementation |
|---|---|
| **Every AI output cites the source text** | LLM must return `supporting_quote` — a substring of the original |
| **Evidence type labeling** | Every extraction tagged: `direct_evidence` / `ai_inference` / `hypothesis` |
| **Confidence scoring** | Every extraction has a 0.0–1.0 score |
| **No fabricated data** | System never generates fake reviews, quotes, URLs, counts, or percentages |
| **Transparent methodology** | Every score shows: formula + inputs + calculation |
| **Source traceability** | Every insight chains: Insight → Evidence Node → Original Source URL |
| **Confidence thresholds in UI** | Dashboard shows confidence labels: High (≥0.8, ≥10 nodes, ≥2 sources) / Medium / Low |
| **UI distinguishes evidence types** | Direct evidence shown with green badge, AI inference with blue, hypothesis with amber |

---

## 11. Render Deployment

### 11.1 render.yaml

```yaml
services:
  - type: web
    name: photos-discovery-engine
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: GEMINI_API_KEY
        sync: false
      - key: NODE_ENV
        value: production
```

### 11.2 Environment Variables

```env
GEMINI_API_KEY=your_free_tier_key
PORT=3000
NODE_ENV=production
DB_PATH=./data/evidence.db
```

### 11.3 Render Free Tier Constraints

| Constraint | Impact | Mitigation |
|---|---|---|
| 512 MB RAM | SQLite + Express fits easily | Keep DB < 10 MB |
| Auto-sleep after 15 min | Cold start ~30s | Acceptable for research tool |
| 750 hours/month | ~31 days continuous | Sufficient |
| No persistent disk | DB file lost on redeploy | Seed script rebuilds from `/data/raw/` JSON files |
| Outbound network allowed | Can call Gemini API | ✅ Works |

### 11.4 Data Persistence Strategy

Since Render free tier has **no persistent disk**, we handle this by:

1. **Raw evidence stored as JSON files** in `data/raw/` (committed to repo)
2. **Processed results also stored as JSON** in `data/processed/`
3. **SQLite DB rebuilt on each deploy** from these JSON files via `seed.js`
4. **Pipeline results saved back to JSON** so they persist across deploys

```
On deploy:
  npm install
  → node server.js
    → on startup: seed.js reads data/raw/*.json + data/processed/*.json
    → rebuilds evidence.db in memory/disk
    → serves dashboard
```

---

## 12. Export Capabilities

| Format | Endpoint | Contents |
|---|---|---|
| **CSV** | `GET /api/export/csv` | Full evidence table with all columns |
| **JSON** | `GET /api/export/json` | Structured evidence corpus + metadata |
| **Report** | `GET /api/export/report` | Top opportunities with evidence, quotes, methodology |

All exports preserve source URLs for PM traceability.

---

## 13. Development Plan

### Phase 1 — Skeleton (Days 1-2)
- [ ] Initialize `package.json` with minimal deps
- [ ] Create `server.js` with Express + static serving
- [ ] Create SQLite schema + seed script
- [ ] Build `public/index.html` with Sapphire design system CSS
- [ ] Implement sidebar, header, hash router

### Phase 2 — Pipeline (Days 3-5)
- [ ] Build Reddit collector (public JSON API)
- [ ] Build unified processor (single Gemini call per node)
- [ ] Build rate limiter (4s delay for free tier)
- [ ] Build scoring engine (transparent formula)
- [ ] Create API routes for all data endpoints

### Phase 3 — Dashboard (Days 6-8)
- [ ] Build Overview page (KPIs, failure chart, memory matrix)
- [ ] Build Evidence Explorer (table + inspection panel)
- [ ] Build Retrieval Journey visualization
- [ ] Build all remaining pages
- [ ] Implement global filter system

### Phase 4 — Polish & Deploy (Days 9-10)
- [ ] Export functionality (CSV, JSON, report)
- [ ] Responsive design for tablet
- [ ] Data persistence strategy (JSON backup)
- [ ] Deploy to Render
- [ ] Final validation

---

## 14. Constraints & Non-Goals

### Hard Constraints
- **No Git operations during development** — upload separately after completion
- **Single deploy unit** — frontend + backend in one process
- **Free tier everything** — Gemini API, Render, no paid services
- **< 25 MB total footprint** — minimal dependencies
- **Zero hallucination tolerance** — every insight traceable to real evidence

### Explicit Non-Goals
- ❌ Building the actual Google Photos product improvement
- ❌ Building a conversational search or chatbot
- ❌ Real-time data streaming
- ❌ User authentication or multi-tenancy
- ❌ Mobile native app
- ❌ Paid API integrations
- ❌ Heavy visualization libraries (D3.js etc.)
- ❌ SSR, React, Vue, or any frontend framework
