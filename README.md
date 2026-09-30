# Google Photos AI-Powered Discovery Engine
### Sapphire Research Console — Product Management Intelligence Platform

An end-to-end qualitative research and discovery platform that collects, classifies, and synthesizes public user feedback regarding **vague photo retrieval failures** in Google Photos. Built specifically for Product Managers to discover high-value opportunity spaces with mathematical rigor and zero hallucinated data.

---

## 📸 Key Features

- **Single Unified Architecture**: Zero complex microservices. One lightweight Express server serves both the data APIs and the single-page application dashboard.
- **Sapphire Research Console Design**: Built with Google's Sapphire design system tokens (Manrope typography, Hanken Grotesk, Material Symbols Outlined, curated color harmonies).
- **Zero Hallucination Tolerance**:
  - Exact verbatim substring verification for all supporting quotes.
  - Automatic confidence capping and inference flagging (`direct_evidence`, `ai_inference`, `hypothesis`).
- **Transparent Mathematical Scoring**: Opportunity prioritization uses a deterministic 6-dimension weighted composite formula with stored audit trails (no LLM hallucinated scores).
- **Render Free Tier Optimized**: Auto-restoring SQLite persistence from JSON backups across ephemeral server restarts. Zero build steps, runs within 512MB RAM.

---

## 🏛️ System Architecture

```
Google Photos Project / V1 Google Photos
├── package.json              # 4 minimal dependencies (express, better-sqlite3, @google/genai, dotenv)
├── render.yaml               # Render free-tier deployment configuration
├── server.js                 # Unified Express entry point (serves public/ & mounts /api)
├── .env.example              # Configuration template
├── db/
│   ├── schema.sql            # 4 SQLite tables (evidence_nodes, opportunities, taxonomy_nodes, user_segments)
│   ├── init.js               # Database connection and table initialization
│   ├── seed.js               # Cold-boot database seeder & fast backup restoration
│   └── queries.js            # Prepared statements for KPIs, evidence, scenarios, quotes, exports
├── pipeline/
│   ├── collector.js          # Ingestion engine with URL and text deduplication
│   ├── gemini.js             # Rate-limited Gemini free-tier REST client (14.2 RPM cap)
│   ├── processor.js          # Combined prompt extraction, anti-hallucination checks, clustering
│   └── scorer.js             # Pure mathematical 6-dimension composite scoring formula
├── routes/
│   ├── api.js                # 14 data & export endpoints (CSV, JSON, KPIs, journey, matrix)
│   └── pipeline.js           # Collection, processing, and scoring execution endpoints
├── data/
│   ├── raw/
│   │   └── sample-evidence.json   # 25 curated verbatim real-world feedback nodes
│   └── processed/
│       ├── nodes.json             # Pre-classified evidence backup
│       └── opportunities.json     # Synthesized opportunity backup
└── public/
    ├── index.html            # Sapphire Research Console SPA shell
    ├── css/styles.css        # Vanilla CSS custom properties & component styling
    └── js/
        ├── utils.js          # Reactive FilterState & formatting helpers
        ├── api.js            # Frontend API client wrapper
        ├── components.js     # Sapphire component renderers
        └── app.js            # SPA hash router mapping all 10 research views
```

---

## 🧭 The 10 Research Dashboard Views

| # | View | Route | Description |
|---|---|---|---|
| 1 | **Overview** | `#/overview` | Executive console with 6 KPI cards, stacked distribution bar, memory matrix, failure list, opportunity spaces, and journey progression |
| 2 | **Evidence Explorer** | `#/evidence-explorer` | Interactive split-view table with search and dynamic inspection panel showing verbatim quotes and AI cues |
| 3 | **Retrieval Scenarios** | `#/retrieval-scenarios` | Breakdown cards of 14+ contexts (travel, receipts, candid moments, health records) |
| 4 | **Memory Signals** | `#/memory-signals` | Quantified comparison of what users remember (*visual cues 88%*) vs what users forget (*exact date 84%*) |
| 5 | **Failure Modes** | `#/failure-modes` | 8 hierarchical failure modes with codes (A–H), descriptions, and drop-off percentages |
| 6 | **User Segments** | `#/user-segments` | 4 behavioral personas (*Memory Archivist, Utility Capturer, Candid Chronicler, Casual Searcher*) |
| 7 | **Opportunity Map** | `#/opportunity-map` | Prioritized P0/P1 product spaces with 6-dimension score breakdown bars |
| 8 | **Retrieval Journey** | `#/retrieval-journey` | 8-stage search progression strip with high friction drop-off callouts |
| 9 | **Evidence & Quotes** | `#/evidence-and-quotes` | Opportunity-grouped verbatim quote repository with original source links |
| 10 | **Export & Synthesis** | `#/export-and-synthesis` | Executive PM synthesis summary and one-click CSV / JSON / Report downloads |

---

## 📐 Mathematical Scoring Formula

Every opportunity space is evaluated purely mathematically:

$$\text{Composite Score} = 0.20 \times \text{Freq} + 0.25 \times \text{Sev} + 0.15 \times \text{Str} + 0.15 \times \text{Brd} + 0.15 \times \text{Imp} + 0.10 \times \text{Diff}$$

- **Frequency ($\text{Freq}$)**: Ratio of linked evidence nodes to corpus baseline.
- **Severity ($\text{Sev}$)**: Average severity of linked nodes ($\text{critical}=1.0$, $\text{high}=0.75$, $\text{med}=0.5$, $\text{low}=0.25$).
- **Evidence Strength ($\text{Str}$)**: Average confidence rating of verified evidence nodes.
- **User Breadth ($\text{Brd}$)**: Distinct user segments affected / total segments.
- **Retrieval Impact ($\text{Imp}$)**: Percentage of linked nodes where workaround effort resulted in permanent abandonment.
- **Workaround Difficulty ($\text{Diff}$)**: Average user friction score to recover the lost photo.

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js (v16.15+ or v18/v20+)
- npm (v8+)

### 2. Installation
```bash
# Clone or navigate to the project directory
cd "V1 Google Photos"

# Install dependencies (4 packages only)
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
*(Optional)* Add your free Google AI Studio Gemini API key:
```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```
> **Note**: Even without a Gemini API key, the engine includes a high-precision deterministic rule-based extractor that runs seamlessly offline.

### 4. Seed Database
```bash
npm run seed
```

### 5. Start Application
```bash
npm start
```
Open your browser at **`http://localhost:3000`**.

---

## 📡 API Reference

### Data Endpoints
- `GET /api/stats` — Aggregate KPI metrics, validation rate, top failure mode.
- `GET /api/evidence?page=1&limit=20` — Paginated evidence list with search and filters.
- `GET /api/evidence/:id` — Single evidence node with full classification and metadata.
- `GET /api/scenarios` — Cognitive retrieval scenario breakdown with frequencies.
- `GET /api/memory-matrix` — Aggregated remembered vs forgotten signals.
- `GET /api/failures` — 8 failure taxonomy modes with counts.
- `GET /api/segments` — User segment profiles with dominant workarounds.
- `GET /api/opportunities` — Scored opportunity spaces with 6-dimension breakdowns.
- `GET /api/journey` — 8-stage search progression with drop-off percentages.
- `GET /api/quotes/:opportunity_id` — Verbatim quotes linked to an opportunity.

### Export Endpoints
- `GET /api/export/csv` — Download full classified evidence corpus as CSV.
- `GET /api/export/json` — Download raw structured JSON corpus.
- `GET /api/export/report` — Download PM executive opportunity synthesis report.

### Pipeline Endpoints
- `POST /api/pipeline/collect` — Trigger evidence ingestion.
- `POST /api/pipeline/process` — Run batch classification and opportunity clustering.
- `POST /api/pipeline/score` — Recompute mathematical opportunity scores.
- `GET /api/pipeline/status` — Get current pipeline execution state.

---

## ☁️ Deployment to Render (Free Tier)

This application is pre-configured for zero-friction deployment to Render:

1. **Upload your code to GitHub / GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service** → Select your repository.
4. Render will auto-detect `render.yaml` or you can configure manually:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. Set Environment Variable: `GEMINI_API_KEY` (optional).
6. Click **Deploy**.

> **Ephemeral Disk Resilience**: Render's free tier resets the local disk on restarts. On startup, `server.js` automatically detects an empty database and restores the complete verified corpus from `data/processed/` in ~50ms.
