# Edge Cases — Google Photos AI-Powered Discovery Engine

> **Source**: [implementationPlan.md](file:///Users/shubhamthakur/Downloads/nextleap%20antigravity%20projects/Google%20Photos%20Project%20/V1%20Google%20Photos/implementationPlan.md) + [architecture.md](file:///Users/shubhamthakur/Downloads/nextleap%20antigravity%20projects/Google%20Photos%20Project%20/V1%20Google%20Photos/architecture.md)  
> Every edge case has a **Scenario**, **Risk**, and **Handling** section.

---

## 1. Data Collection Edge Cases

### 1.1 Reddit API Returns Empty Results

**Scenario:** A search term like `"can't find photo"` returns `{ data: { children: [] } }` — zero posts.

**Risk:** Pipeline reports success but collects nothing. Corpus stays empty without warning.

**Handling:**
- Log a warning per empty query: `WARN: Reddit query "can't find photo" returned 0 results`
- Track per-query hit counts. If ALL 12 queries return zero → surface an alert in pipeline status
- Never treat empty results as an error — it's valid, just worth noting

---

### 1.2 Reddit API Rate Limiting (429 Response)

**Scenario:** We exceed Reddit's unauthenticated rate limit (~10 requests/minute). Response returns HTTP 429.

**Risk:** Remaining search queries silently fail. Corpus is incomplete.

**Handling:**
- On 429 → wait 60 seconds, retry once
- If retry also fails → skip that query, log: `ERROR: Reddit rate limited, skipped query "..."`
- Record the limitation in pipeline status: `{ limitations: ["Reddit rate limited on 3 of 12 queries"] }`
- Do NOT fabricate results to compensate

---

### 1.3 Reddit API Returns HTML Instead of JSON

**Scenario:** Reddit occasionally returns an HTML error page (503, maintenance) instead of JSON at the `.json` endpoint.

**Risk:** `JSON.parse()` throws. Unhandled crash takes down the pipeline.

**Handling:**
- Check `Content-Type` header before parsing
- Wrap `JSON.parse()` in try/catch
- On parse failure → log error, skip that query, continue to next
- Never crash the pipeline for one bad response

---

### 1.4 Reddit Post Contains Only an Image/Link (No Text)

**Scenario:** A Reddit post is a link post or image post with no `selftext` body. Only has a title like `"Can't find old photos"`.

**Risk:** `original_text` is too short for meaningful AI extraction. Wastes a Gemini API call.

**Handling:**
- If `selftext` is empty → use `title` as `original_text`
- If combined text is < 20 characters → skip, log: `SKIP: Post too short (14 chars)`
- Minimum length threshold: **20 characters**

---

### 1.5 Reddit Post is in a Non-English Language

**Scenario:** A post in r/googlephotos is written in Hindi, Spanish, Portuguese, etc.

**Risk:** Gemini can handle multilingual input but our analysis framework is English-centric. Extracted categories may be inconsistent.

**Handling:**
- Do NOT filter out non-English posts during collection (Gemini handles them)
- During processing: if Gemini returns low confidence (< 0.4) AND the text contains non-ASCII characters → flag as `evidence_type: 'hypothesis'`
- Store original text as-is — never translate or modify

---

### 1.6 Duplicate Evidence from Multiple Search Queries

**Scenario:** The same Reddit post appears in results for both `"can't find photo"` and `"search not working google photos"`.

**Risk:** Duplicate rows in the database inflate evidence counts and skew opportunity scoring.

**Handling:**
- Deduplicate by `source_url` before INSERT
- Use `INSERT OR IGNORE` with a UNIQUE constraint on `source_url`
- Log: `DEDUP: Skipped 23 duplicate URLs`

---

### 1.7 Reddit Post is a Bot/Spam/Automod Reply

**Scenario:** Automod posts, bot replies, or spam caught in search results (e.g., "Your post has been removed...").

**Risk:** Pollutes corpus with non-user content. AI processes junk.

**Handling:**
- Skip posts where `author` is `AutoModerator`, `[deleted]`, or common bot names
- Skip posts with `score < 1` (likely spam/removed)
- The AI relevance filter (Stage 2) provides a second layer — classifies these as `not_relevant`

---

### 1.8 Manual Ingest JSON is Malformed

**Scenario:** User uploads a JSON file with missing fields, wrong types, or invalid structure.

**Risk:** `seed.js` crashes. Database left in partial state.

**Handling:**
- Validate each record before insert:
  - `original_text` must be a non-empty string
  - `source_platform` must be a non-empty string
  - All other fields are optional
- Skip invalid records, log: `SKIP: Record 14 missing original_text`
- Report: `Ingested 28 of 30 records (2 skipped)`

---

### 1.9 Play Store / Community Scraping Returns Unexpected HTML

**Scenario:** Google changes the HTML structure of the Play Store review page or Help Community forum. Cheerio selectors return empty arrays.

**Risk:** Collector returns 0 reviews without error. Silent data loss.

**Handling:**
- After scraping, check if result count is 0 → log warning
- Store the raw HTML response hash so we can detect structural changes
- Have a fallback: `manual-ingest.json` always works even if scraping breaks
- In pipeline status: `{ source_status: { play_store: "0 results — possible selector breakage" } }`

---

### 1.10 Source URL No Longer Exists

**Scenario:** A Reddit post is later deleted. The stored `source_url` returns 404.

**Risk:** PM clicks "View Source" link and gets a dead page. Traceability broken.

**Handling:**
- We store the `original_text` verbatim at collection time — the evidence survives even if the URL dies
- Do NOT re-validate URLs periodically (wastes rate limits)
- In the UI, show a note: "Source URL may no longer be available. Original text preserved below."
- Never delete evidence nodes because their source URL dies

---

## 2. LLM / Gemini Edge Cases

### 2.1 Gemini Free Tier Rate Limit Exceeded (429)

**Scenario:** We send requests faster than 15 RPM. Gemini returns 429 `RESOURCE_EXHAUSTED`.

**Risk:** Processing halts. Partially processed batch leaves nodes in inconsistent state.

**Handling:**
- Rate limiter enforces 4.2s delay between calls (14 RPM, safely under 15)
- On 429 → exponential backoff: wait 30s, then 60s, then 120s
- After 3 retries → stop processing, log: `RATE_LIMITED: Paused at node 87/200. Resume later.`
- Partially processed nodes are fine — they're fully updated per-row, no partial writes
- Pipeline status shows: `{ processed: 87, remaining: 113, status: 'rate_limited' }`

---

### 2.2 Gemini Returns Non-JSON Response

**Scenario:** Despite the prompt saying "RESPOND IN JSON ONLY", Gemini wraps its response in markdown fences, adds preamble text, or returns plain text.

**Risk:** `JSON.parse()` throws. Node is left unprocessed.

**Handling:**
- Strip markdown code fences: `response.replace(/```json\n?/g, '').replace(/```\n?/g, '')`
- Strip leading/trailing whitespace
- Try `JSON.parse()` on the cleaned string
- If still fails → try extracting JSON from within the text using regex: `/\{[\s\S]*\}/`
- If still fails → mark node as: `relevance = 'processing_error'`, log the raw response for debugging
- Never retry more than once (conserve rate limit)

---

### 2.3 Gemini Returns Valid JSON But Wrong Schema

**Scenario:** Gemini returns JSON but with wrong field names, missing fields, or wrong types. E.g., `{ "type": "travel" }` instead of `{ "scenario_type": "travel_memory" }`.

**Risk:** Database receives nulls or invalid values. Dashboard shows blank cells.

**Handling:**
- Validate every field after parsing:
  - `scenario_type` must be in allowed enum, else → `'other'`
  - `failure_type` must be in allowed enum, else → `'other'`
  - `severity` must be in `['critical','high','medium','low']`, else → `'medium'`
  - `confidence` must be number 0.0–1.0, else → `0.5`
  - `memory_clues` must be array, else → `[]`
  - `forgotten_info` must be array, else → `[]`
- Log: `WARN: Node 42 — failure_type "xyz" not in enum, defaulted to "other"`
- Apply defaults rather than rejecting the entire extraction

---

### 2.4 Gemini Hallucinated Supporting Quote

**Scenario:** Gemini returns a `supporting_quote` that is NOT a substring of the `original_text`. The AI paraphrased or invented the quote.

**Risk:** This is the #1 hallucination vector. A fabricated quote poisons PM research.

**Handling:**
- **Hard check**: `original_text.includes(supporting_quote)` must be `true`
- If false → set `evidence_type = 'ai_inference'` (downgrade from direct evidence)
- Set `confidence = Math.min(confidence, 0.6)` (cap at 0.6)
- Log: `HALLUCINATION_CHECK: Node 42 — supporting_quote not found in original text`
- Store the original AI-provided quote in a separate field for auditing: `ai_raw_quote`
- In the UI, show a warning badge: "⚠ AI-inferred — quote not verified against source"

---

### 2.5 Gemini Returns Extremely Long Response

**Scenario:** Gemini generates a 10,000+ character response for a single evidence node extraction.

**Risk:** SQLite TEXT columns can handle it, but it bloats the DB and slows queries.

**Handling:**
- Truncate `failure_detail` to 500 characters max
- Truncate `relevance_reasoning` to 300 characters max
- `memory_clues` and `forgotten_info` arrays: max 10 items each
- `search_queries` array: max 5 items
- Log if truncation occurs

---

### 2.6 Gemini API Key Missing or Invalid

**Scenario:** `GEMINI_API_KEY` is not set in `.env`, or the key is revoked/expired.

**Risk:** Pipeline crashes on first LLM call. Confusing error for the user.

**Handling:**
- On server startup: check `process.env.GEMINI_API_KEY` exists and is non-empty
- If missing → log `ERROR: GEMINI_API_KEY not configured. Pipeline will not process.`
- Pipeline endpoints return: `{ status: 'error', message: 'Gemini API key not configured' }`
- Dashboard still works with existing processed data — collection and display don't need the API key
- Never expose the API key in logs or API responses

---

### 2.7 Gemini Daily Token Quota Exhausted

**Scenario:** We hit the 1M tokens/day free tier limit partway through processing.

**Risk:** Similar to rate limit but won't recover until next day.

**Handling:**
- On quota error → stop processing immediately
- Log: `QUOTA_EXHAUSTED: Processed 142 of 200 nodes today. Resume tomorrow.`
- Pipeline status: `{ status: 'quota_exhausted', processed_today: 142, remaining: 58 }`
- Already-processed nodes are fully saved — no data loss
- Do NOT attempt retries (they'll just fail and waste nothing)

---

### 2.8 Evidence Text is Too Short for Meaningful Extraction

**Scenario:** `original_text` is something like `"Search sucks"` or `"Can't find anything"`.

**Risk:** Gemini either hallucinates details to fill the schema or returns empty fields. Either way, low-value extraction.

**Handling:**
- If `original_text.length < 30` → process but force:
  - `confidence = Math.min(confidence, 0.3)`
  - `evidence_type = 'hypothesis'`
- If `original_text.length < 15` → skip processing entirely, set `relevance = 'too_short'`
- Log: `SKIP: Node 88 — text too short (12 chars) for extraction`

---

### 2.9 Evidence Text Contains Profanity or Abusive Content

**Scenario:** Frustrated user wrote an angry, profanity-laden rant about Google Photos search.

**Risk:** Gemini might refuse to process it (content safety filter). Or it processes fine and the profanity appears in the dashboard quotes.

**Handling:**
- If Gemini returns a safety block → mark `relevance = 'content_filtered'`, skip
- Do NOT pre-filter profanity in the text — angry users are often the most informative evidence
- In the dashboard, user quotes display as-is (it's a research tool, not a consumer product)
- If needed later: add an optional profanity mask toggle in the UI

---

### 2.10 Gemini Invents a New Scenario/Failure Category

**Scenario:** Gemini returns `scenario_type: "nostalgia_retrieval"` or `failure_type: "emotional_recall_mismatch"` — valid concepts but not in our enum.

**Risk:** Inconsistent categorization. Same concept gets different labels across nodes.

**Handling:**
- Validate against the allowed enum
- If not in enum → map to `'other'` but preserve Gemini's original label in `failure_detail`
- After processing batch: review all `'other'` values. If a new category appears 3+ times → consider adding it to the enum
- This is the "allow AI to discover new scenarios" requirement from the problem statement — we just do it in a controlled way

---

## 3. Database Edge Cases

### 3.1 SQLite Database File Locked

**Scenario:** Two concurrent API requests try to write to SQLite simultaneously (e.g., pipeline processing while user exports data).

**Risk:** `SQLITE_BUSY` error. Request fails with 500.

**Handling:**
- `better-sqlite3` is synchronous — no true concurrent writes possible in single-threaded Node.js
- However, long-running pipeline processing blocks the event loop during writes
- Solution: pipeline processes in batches of 10, yielding control between batches with `setImmediate()`
- WAL mode enabled: `db.pragma('journal_mode = WAL')` — allows concurrent reads during writes

---

### 3.2 Database File Corruption

**Scenario:** Server crashes mid-write (Render kills process during deploy). SQLite file is corrupted.

**Risk:** All data lost. Server won't start.

**Handling:**
- On startup: run `PRAGMA integrity_check` — if it fails, delete the DB and rebuild from seed
- `db/seed.js` rebuilds from `data/raw/*.json` and `data/processed/*.json`
- Log: `ERROR: Database corruption detected. Rebuilding from seed files.`
- This is expected behavior on Render free tier — the DB is ephemeral anyway

---

### 3.3 Database File Exceeds Render Free Tier Disk

**Scenario:** Evidence corpus grows large. `evidence.db` exceeds available disk on Render.

**Risk:** Write fails. Processing stops.

**Handling:**
- Monitor DB size: `SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()`
- Hard cap: 5,000 evidence nodes maximum
- If cap reached → refuse to collect more: `{ status: 'error', message: 'Corpus limit reached (5000 nodes)' }`
- Export and archive old data before collecting more
- In practice, 5,000 nodes × ~2KB each = ~10 MB — well within limits

---

### 3.4 JSON Fields Contain Invalid JSON Strings

**Scenario:** `memory_clues` column contains `"[color: yellow, person: sister]"` (not valid JSON) because Gemini formatted it oddly.

**Risk:** `JSON.parse(row.memory_clues)` throws in API route. 500 error on the endpoint.

**Handling:**
- Every `JSON.parse()` in API routes wrapped in try/catch
- On parse failure → return `[]` (empty array)
- During processing: validate JSON before storing. If not valid JSON array → wrap the raw string: `[raw_string]`
- Log: `WARN: Node 42 — memory_clues was not valid JSON, wrapped as string`

---

### 3.5 Concurrent Pipeline Runs

**Scenario:** User clicks "Process" button twice rapidly, or calls `POST /api/pipeline/process` twice.

**Risk:** Two pipeline runs process the same nodes simultaneously. Duplicate work, wasted Gemini calls, potential data inconsistency.

**Handling:**
- Pipeline lock: global boolean `let pipelineRunning = false`
- If `pipelineRunning` → return `{ status: 'already_running' }`
- Set to `true` on start, `false` on completion (including error paths — use `finally`)
- Pipeline status endpoint reports current state

---

## 4. Frontend Edge Cases

### 4.1 Dashboard Loads Before Any Data Exists

**Scenario:** First-ever deploy. Database is empty. User opens the dashboard.

**Risk:** KPIs show "0" everywhere. Charts are empty. Evidence table is blank. Poor first impression.

**Handling:**
- Detect empty state: `GET /api/stats` returns `{ total_evidence: 0 }`
- Show an onboarding state:
  - "No evidence data yet. Run the collection pipeline or upload a dataset."
  - Show "Collect from Reddit" and "Upload JSON" action buttons
- Never show broken charts or NaN percentages — explicitly handle zero-division

---

### 4.2 Division by Zero in Percentages

**Scenario:** No evidence for a scenario/failure type. Percentage calculation: `0 / 0 = NaN`.

**Risk:** Dashboard shows "NaN%" in cards, charts, and tables.

**Handling:**
- Every percentage calculation: `total === 0 ? 0 : (count / total * 100).toFixed(1)`
- Every progress bar width: `total === 0 ? '0%' : (count / total * 100) + '%'`
- API endpoints return `0` (not `null` or `NaN`) for missing values

---

### 4.3 Evidence Table with 0 Results After Filtering

**Scenario:** User applies restrictive filters (e.g., Severity: Critical + Confidence: ≥0.95 + Source: Manual). Zero results match.

**Risk:** Blank table. User thinks it's broken.

**Handling:**
- Show empty state message: "No evidence matches the current filters. Try broadening your criteria."
- Show "Reset Filters" button prominently
- Keep the filter bar visible so user can see what's active
- "Matched Nodes: 0 of 2,840" counter makes it clear filters are the cause

---

### 4.4 Extremely Long User Quote in Evidence Table

**Scenario:** A Reddit user wrote a 2,000-character post. Table cell tries to show the full text.

**Risk:** Table row becomes massive. Layout breaks.

**Handling:**
- Table preview truncated to 2 lines: CSS `line-clamp: 2` (matches Stitch design)
- Full text visible in the Inspection Panel when row is clicked
- Verbatim quote in Inspection Panel: displayed in a scrollable `<blockquote>` with max-height

---

### 4.5 Special Characters in User Quotes

**Scenario:** User text contains `<script>`, HTML entities, emojis, or Unicode characters.

**Risk:** XSS attack if inserted via `innerHTML`. Broken rendering for entities.

**Handling:**
- **Never use `innerHTML` for user-generated text**
- Always use `textContent` or create text nodes via `document.createTextNode()`
- Emojis render natively — no special handling needed
- HTML entities in source text (e.g., `&amp;`) stored as-is, displayed correctly via `textContent`

---

### 4.6 Hash Router — Unknown Route

**Scenario:** User navigates to `#/nonexistent-page` via URL manipulation.

**Risk:** Blank page. No error message.

**Handling:**
- Router fallback: if route not found → redirect to `#/overview`
- Log: `WARN: Unknown route "#/nonexistent-page", redirecting to overview`

---

### 4.7 API Fetch Fails (Network Error)

**Scenario:** User's network drops while the dashboard is open. `fetch('/api/evidence')` rejects.

**Risk:** Page shows stale data or crashes with unhandled promise rejection.

**Handling:**
- Wrap all `fetch()` calls in try/catch
- On network error → show inline error message: "Failed to load data. Check your connection."
- Keep showing last-loaded data (don't clear the page)
- Add a "Retry" button

---

### 4.8 Browser Back Button Behavior

**Scenario:** User navigates Overview → Evidence → Scenarios → hits browser Back button.

**Risk:** Hash changes correctly but page state (scroll position, active filters, selected row) is lost.

**Handling:**
- `hashchange` event triggers re-render of the target page
- Filters persist in the global `FilterState` object (not tied to route)
- Scroll position: not preserved (acceptable for a data dashboard)
- Selected evidence row: deselected on page change (inspection panel clears)

---

### 4.9 Mobile / Narrow Screen

**Scenario:** PM opens the dashboard link on their phone.

**Risk:** 260px sidebar + content doesn't fit. Evidence table is unreadable.

**Handling:**
- `< 1024px`: Sidebar hidden, hamburger menu toggle
- `< 768px`: KPI strip 2 columns. Evidence table horizontal scroll. Filter bar horizontal scroll.
- Inspection panel: full-width below table on mobile
- Minimum supported width: 360px

---

### 4.10 Large Dataset Performance

**Scenario:** Evidence corpus grows to 3,000+ nodes. Evidence table tries to render all at once.

**Risk:** DOM has 3,000 `<tr>` elements. Page becomes sluggish.

**Handling:**
- Server-side pagination: default 20 rows per page
- Client renders only one page of rows at a time
- Search/filter is server-side (SQL query) not client-side JS
- KPI calculations are SQL aggregates, not client-side loops

---

## 5. Pipeline Processing Edge Cases

### 5.1 Evidence Node Already Processed — Re-processing

**Scenario:** User runs "Process" again after some nodes are already processed.

**Risk:** Re-processes already-done nodes. Wastes Gemini calls. Might overwrite good extractions with different results (LLM non-determinism).

**Handling:**
- Only process nodes where `relevance = 'unprocessed'`
- Already-processed nodes are skipped
- To force re-processing: add a separate "Re-process" endpoint that resets selected nodes to `'unprocessed'` first
- Log: `Process: 58 unprocessed nodes found (142 already done, skipping)`

---

### 5.2 Relevance Filter Marks Everything as "Not Relevant"

**Scenario:** The LLM misinterprets the relevance criteria and classifies all evidence as unrelated to photo retrieval.

**Risk:** Zero relevant nodes. No downstream processing possible. Dashboard empty.

**Handling:**
- After processing a batch: check ratio of `relevant` vs `not_relevant`
- If > 80% marked not relevant → log warning: `WARN: 85% of nodes marked not_relevant — check relevance prompt`
- Allow manual override: PM can set `relevance = 'relevant'` for specific nodes via API
- Pipeline status reports the relevance distribution

---

### 5.3 All Evidence Falls Into One Scenario

**Scenario:** Gemini classifies 90% of evidence as `travel_memory`, ignoring other scenarios.

**Risk:** Scenario distribution is heavily skewed. Other scenarios underrepresented.

**Handling:**
- This might be real (travel IS the dominant scenario per the Stitch design: 32%)
- Check: if one scenario has > 60% → log info (not error): `INFO: travel_memory dominates at 72%`
- The transparent scoring system will still score opportunities correctly based on actual evidence
- Do NOT artificially balance categories — that would be data manipulation

---

### 5.4 Opportunity Clustering Produces Too Many/Few Clusters

**Scenario:** Gemini creates 25 tiny opportunity areas, or collapses everything into 2 mega-opportunities.

**Risk:** Problem statement asks for 5–8 opportunity areas.

**Handling:**
- If > 12 opportunities → merge clusters with < 3 evidence nodes into "Other Opportunities"
- If < 3 opportunities → lower the clustering threshold (allow smaller clusters)
- Log the actual count: `Clustering produced 14 opportunities (merged 6 small clusters into 'Other')`
- Final opportunity count will be 5–12 (acceptable range)

---

### 5.5 Scoring Produces Tied Composite Scores

**Scenario:** Two opportunities have identical composite scores of 0.72.

**Risk:** Priority ordering is ambiguous.

**Handling:**
- Tiebreaker: higher `evidence_count` wins
- If still tied: higher `severity_score` wins
- If still tied: alphabetical by opportunity name (deterministic, if arbitrary)
- All three tiebreakers are documented in `scoring_methodology`

---

### 5.6 No Evidence Has Workaround Information

**Scenario:** Users complain about search failing but never mention what they did instead.

**Risk:** `workaround` column is NULL for all nodes. Workaround Difficulty score = 0 for all opportunities. That dimension contributes nothing to scoring.

**Handling:**
- Scoring formula handles this gracefully — if all workaround scores are 0, that dimension simply doesn't differentiate
- In the UI, workaround columns show "Not mentioned" instead of blank
- API returns `null` for missing workaround (not empty string)

---

## 6. Export Edge Cases

### 6.1 CSV Export with Commas in User Quotes

**Scenario:** User text contains commas, newlines, and double quotes: `"I searched 'café, beach' and it showed "random" things"`

**Risk:** CSV formatting breaks. Excel shows garbled columns.

**Handling:**
- Wrap all text fields in double quotes
- Escape internal double quotes by doubling them: `""random""`
- Replace literal newlines with `\n` or space
- Use proper CSV escaping: `"${value.replace(/"/g, '""')}"`

---

### 6.2 JSON Export is Too Large

**Scenario:** Full evidence corpus with all fields exports as a 15 MB JSON file.

**Risk:** Browser hangs trying to download. Render might timeout the response.

**Handling:**
- Stream the response: `res.write()` rows one at a time instead of `JSON.stringify(entireArray)`
- Set appropriate headers: `Content-Type: application/json`, `Content-Disposition: attachment`
- If over 5,000 nodes, add `?limit=1000` pagination to export
- For the Render free tier: response timeout is 30s, streaming avoids this

---

### 6.3 Export Contains Sensitive URLs

**Scenario:** Evidence includes Reddit profile URLs, Google community profile links.

**Risk:** Exporting user profile URLs could raise privacy concerns.

**Handling:**
- Export includes post URLs (public content) — this is fine
- Do NOT include author usernames or profile URLs in exports
- `source_url` points to the content, not the user

---

## 7. Render Deployment Edge Cases

### 7.1 Cold Start After Sleep (30s Delay)

**Scenario:** Render free tier auto-sleeps after 15 min inactivity. First visit after sleep takes 30s.

**Risk:** User thinks the app is broken during cold start.

**Handling:**
- This is a known Render free tier limitation — no mitigation possible without upgrading
- `index.html` loads instantly (static file), shows the styled shell immediately
- API calls made after page load will resolve once the server wakes
- Show a loading spinner on data sections while API calls are pending
- Consider: small "Loading server…" toast on first data fetch if it takes > 3 seconds

---

### 7.2 Database Lost on Redeploy

**Scenario:** Every Render redeploy provisions a fresh filesystem. `evidence.db` is gone.

**Risk:** All processed data lost. PM's carefully collected corpus disappears.

**Handling (from architecture Section 11.4):**
- After pipeline processing → save results to `data/processed/nodes.json` (committed to repo)
- On startup → `seed.js` checks if `evidence.db` exists, if not → rebuilds from JSON files
- Critical: `seed.js` must run BEFORE the server starts accepting requests
- Startup sequence: `init DB → seed if empty → start Express`

---

### 7.3 Render Build Fails Due to Native Module

**Scenario:** `better-sqlite3` requires native compilation. Render's build environment might not have the right build tools.

**Risk:** Deploy fails entirely. App never starts.

**Handling:**
- `better-sqlite3` ships prebuilt binaries for common platforms (Linux x64 = Render's environment)
- If prebuilt binary not available → `npm install` triggers compilation, needs `python3` and `make` (available on Render)
- Fallback: if `better-sqlite3` fails to install, use `sql.js` (pure JS SQLite, slower but zero native dependencies)
- Test the build locally first: `npm install --target_platform=linux --target_arch=x64`

---

### 7.4 Environment Variable Not Set on Render

**Scenario:** User deploys but forgets to set `GEMINI_API_KEY` in Render dashboard.

**Risk:** Server starts. Dashboard loads. User triggers pipeline → crashes with auth error.

**Handling:**
- On startup: validate all required env vars exist
- If `GEMINI_API_KEY` missing → log clear message: `WARNING: GEMINI_API_KEY not set. Pipeline processing disabled. Dashboard will work with existing data.`
- Dashboard remains functional (reads existing data, just can't process new nodes)
- Pipeline endpoints return: `{ status: 'error', message: 'GEMINI_API_KEY not configured. Set it in Render dashboard → Environment.' }`

---

### 7.5 Render Health Check Fails

**Scenario:** Render pings the server for health check. If no response → marks as crashed → restarts.

**Risk:** If server is busy processing a large pipeline batch, it might not respond to health check in time.

**Handling:**
- Add a `GET /health` route that returns `{ status: 'ok' }` immediately (no DB queries)
- Pipeline processing yields control between batches (`setImmediate()`) so Express can handle health checks
- Render health check path: configure to `/health`

---

## 8. Anti-Hallucination Edge Cases

### 8.1 Gemini Fabricates a Source URL

**Scenario:** The LLM invents a Reddit URL that doesn't exist: `https://reddit.com/r/googlephotos/comments/fake123`.

**Risk:** PM follows the link, gets 404, loses trust in the entire system.

**Handling:**
- We NEVER ask Gemini to generate URLs
- `source_url` comes from the collector (real API response), NOT from LLM extraction
- LLM only processes `original_text` — it has no access to URLs
- This edge case is eliminated by architecture design

---

### 8.2 Gemini Invents Statistics ("34% of users…")

**Scenario:** In `failure_detail`, Gemini writes: "34% of Google Photos users experience this issue."

**Risk:** PM cites this fabricated stat in their presentation.

**Handling:**
- `failure_detail` is the AI's explanation of a single evidence node — it should not contain aggregate stats
- Prompt includes: "Do not cite any statistics, percentages, or aggregate claims in your response"
- All real statistics come from SQL aggregates (counted from actual evidence), never from LLM
- UI clearly labels which numbers are "Calculated from N evidence nodes" vs AI interpretation

---

### 8.3 Gemini Attributes Intent the User Didn't Express

**Scenario:** User says: "I searched for beach photos." Gemini extracts: `scenario_type: "travel_memory"` and `memory_clues: ["vacation", "tropical location"]`.

**Risk:** The user might have been searching for beach photos taken at a local lake. AI inferred "travel/vacation" without evidence.

**Handling:**
- The `supporting_quote` check catches this — "vacation" and "tropical" are not in the original text
- `evidence_type` gets downgraded to `ai_inference`
- Confidence capped at 0.6
- UI shows blue "AI Inference" badge instead of green "Direct Evidence"
- PM knows to treat this extraction with appropriate skepticism

---

### 8.4 Confidence Score Disagrees with Evidence Quality

**Scenario:** Gemini returns `confidence: 0.95` for a 15-character input like `"search is bad"`.

**Risk:** Dashboard shows high confidence for a worthless extraction.

**Handling:**
- Post-processing confidence adjustment:
  - Text < 30 chars → cap confidence at 0.3
  - Text < 50 chars → cap confidence at 0.5
  - Missing `supporting_quote` match → cap confidence at 0.6
  - `evidence_type = 'hypothesis'` → cap confidence at 0.5
- Log when confidence is reduced: `CONFIDENCE_ADJUSTED: Node 42 — 0.95 → 0.3 (text too short)`

---

### 8.5 Same User Statement Processed Differently on Retry

**Scenario:** Due to LLM non-determinism, re-processing the same node gives different results. First time: `failure_type: "semantic_gap"`. Second time: `failure_type: "query_understanding"`.

**Risk:** Data inconsistency. Same evidence classified differently across runs.

**Handling:**
- We do NOT re-process already-processed nodes by default (Step 5.1)
- If forced re-processing: overwrite the old extraction completely (no merge)
- Set Gemini `temperature: 0.1` (near-deterministic) for classification tasks
- Accept that some ambiguity is inherent — the confidence score communicates uncertainty

---

## 9. Data Integrity Edge Cases

### 9.1 Evidence Node Has NULL for All Extracted Fields

**Scenario:** Processing failed silently. Node has `relevance = 'relevant'` but all extraction fields are NULL.

**Risk:** Dashboard shows a row with blank cells. Clicking it shows empty inspection panel.

**Handling:**
- API query: identify nodes where `relevance = 'relevant'` but `scenario_type IS NULL` → flag as `relevance = 'processing_error'`
- Pipeline status reports: `{ processing_errors: 3 }`
- Dashboard hides `processing_error` nodes from evidence table by default
- "Show errors" toggle in Evidence Explorer reveals them for debugging

---

### 9.2 Opportunity Has 0 Linked Evidence Nodes

**Scenario:** After re-filtering or re-processing, an opportunity's evidence nodes were all reclassified. The opportunity exists but has no supporting evidence.

**Risk:** Dashboard shows an opportunity card with "0 Evidence" and a confidence of 0.

**Handling:**
- Scoring engine: if `evidence_count = 0` → set `composite_score = 0`, `confidence = 'none'`
- Dashboard: hide opportunities with 0 evidence from the main view
- "Show archived" toggle to reveal them
- Never delete opportunities — just hide. Re-processing might re-link evidence.

---

### 9.3 Taxonomy Node Has 0% Share

**Scenario:** A failure category from the initial taxonomy (e.g., "Memory Ambiguity") has zero evidence in the actual corpus.

**Risk:** Stacked bar shows a 0-width segment. Taxonomy tree has an empty leaf.

**Handling:**
- Taxonomy builder only creates nodes that have ≥ 1 evidence node
- Initial taxonomy categories without evidence are noted: `{ unused_categories: ["memory_ambiguity"] }`
- Problem statement says "modify this taxonomy based on actual evidence" — empty categories are simply not included

---

## 10. Security & Abuse Edge Cases

### 10.1 API Endpoint Abuse (Excessive Requests)

**Scenario:** Someone discovers the Render URL and hammers `/api/pipeline/collect` repeatedly.

**Risk:** Burns through Reddit rate limits and Gemini quota. Fills database with duplicates.

**Handling:**
- Simple in-memory rate limiter on pipeline endpoints: max 1 trigger per 5 minutes
- Deduplicate by `source_url` prevents duplicate evidence
- Gemini quota is per-key (protected by Google), we just get rate limited
- For a research tool, this is acceptable — no auth needed for reads

---

### 10.2 SQL Injection via Filter Parameters

**Scenario:** User crafts a malicious URL: `?search='; DROP TABLE evidence_nodes;--`

**Risk:** Database destroyed.

**Handling:**
- `better-sqlite3` uses parameterized queries (prepared statements) — SQL injection is impossible if used correctly
- **NEVER** string-concatenate user input into SQL: `db.prepare('SELECT * WHERE text LIKE ?').all('%' + search + '%')`
- All query params sanitized through prepared statement parameter binding

---

### 10.3 XSS via Malicious Evidence Text

**Scenario:** A Reddit post contains `<img src=x onerror=alert('xss')>` in its text. This gets stored in the database and rendered in the dashboard.

**Risk:** Cross-site scripting attack executes in the PM's browser.

**Handling:**
- **ALL user text rendered via `textContent`, NEVER via `innerHTML`**
- HTML in evidence text is treated as literal text, not markup
- This is enforced at the component level — `components.js` has no `innerHTML` calls for user data
- Exception: static HTML structure (not user data) can use `innerHTML`

---

## Summary — Edge Case Count by Category

| Category | Count | Severity |
|---|---|---|
| Data Collection | 10 | Medium — graceful degradation |
| LLM / Gemini | 10 | High — core pipeline reliability |
| Database | 5 | Medium — data integrity |
| Frontend | 10 | Low — UI polish |
| Pipeline Processing | 6 | High — data quality |
| Export | 3 | Low — formatting |
| Render Deployment | 5 | Medium — operational |
| Anti-Hallucination | 5 | Critical — trust |
| Data Integrity | 3 | Medium — consistency |
| Security | 3 | Medium — safety |
| **Total** | **60** | |
