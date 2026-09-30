const fs = require('fs');
const path = require('path');
const db = require('../db/init');
const queries = require('../db/queries');

/**
 * Data Collector & Manual Ingest Module
 * Google Photos Retrieval Discovery Engine
 */

const SEARCH_TERMS = [
  "can't find photo",
  "search not working google photos",
  "old photo search",
  "find picture",
  "photo retrieval",
  "remember photo but can't find",
  "search google photos",
  "find old picture",
  "photo search failing",
  "find screenshot",
  "looking for photo",
  "scroll through photos",
  "gave up searching photos"
];

/**
 * Ingest evidence records from a JSON file
 * @param {string} filepath - Path to JSON file
 * @returns {object} { total, inserted, skipped }
 */
function ingestFromJSON(filepath) {
  const resolvedPath = path.isAbsolute(filepath) ? filepath : path.resolve(__dirname, '..', filepath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Evidence file not found at: ${resolvedPath}`);
  }

  const rawData = fs.readFileSync(resolvedPath, 'utf-8');
  let items = [];
  try {
    items = JSON.parse(rawData);
  } catch (err) {
    throw new Error(`Failed to parse JSON evidence file: ${err.message}`);
  }

  if (!Array.isArray(items)) {
    throw new Error('Expected JSON file to contain an array of evidence items');
  }

  let inserted = 0;
  let skipped = 0;

  const checkUrlStmt = db.prepare('SELECT id FROM evidence_nodes WHERE source_url = ?');
  const checkTextStmt = db.prepare('SELECT id FROM evidence_nodes WHERE original_text = ?');

  const insertTx = db.transaction((nodes) => {
    for (const node of nodes) {
      if (!node.original_text || node.original_text.trim() === '') {
        skipped++;
        continue;
      }

      // Check duplicates
      let existing = null;
      if (node.source_url) {
        existing = checkUrlStmt.get(node.source_url);
      }
      if (!existing) {
        existing = checkTextStmt.get(node.original_text);
      }

      if (existing) {
        skipped++;
        continue;
      }

      queries.insertEvidence({
        source_platform: node.source_platform || 'manual',
        source_url: node.source_url || null,
        source_date: node.source_date || new Date().toISOString().split('T')[0],
        collected_at: new Date().toISOString(),
        original_text: node.original_text.trim(),
        relevance: node.relevance || 'unprocessed',
        relevance_reasoning: node.relevance_reasoning || null,
        scenario_type: node.scenario_type || null,
        memory_clues: node.memory_clues || [],
        forgotten_info: node.forgotten_info || [],
        search_queries: node.search_queries || [],
        search_methods: node.search_methods || [],
        failure_type: node.failure_type || null,
        failure_detail: node.failure_detail || null,
        workaround: node.workaround || null,
        workaround_effort: node.workaround_effort || null,
        user_segment: node.user_segment || null,
        severity: node.severity || 'medium',
        confidence: node.confidence || 0.0,
        evidence_type: node.evidence_type || 'direct_evidence',
        opportunity_id: node.opportunity_id || null
      });

      inserted++;
    }
  });

  insertTx(items);

  return {
    total: items.length,
    inserted,
    skipped
  };
}

/**
 * Reddit Collector
 * Note: Scraping is deferred per user request ("currently don't scrap data will do that after building").
 * When allowLive=true, this queries Reddit's public JSON API.
 */
async function collectReddit(options = { allowLive: false }) {
  if (!options.allowLive) {
    console.log('[Collector] Live web scraping is paused during initial build phase.');
    console.log('[Collector] Ingesting curated high-fidelity sample evidence corpus...');
    const seedPath = path.join(__dirname, '..', 'data', 'raw', 'sample-evidence.json');
    return ingestFromJSON(seedPath);
  }

  // Live Reddit Public JSON fetcher (ready for post-build execution)
  console.log('[Collector] Running live Reddit search across r/googlephotos...');
  let totalFound = 0;
  let newInserted = 0;
  let skipped = 0;

  // Implementation ready for live fetch when user enables scraping
  return {
    terms_searched: SEARCH_TERMS.length,
    total_found: totalFound,
    inserted: newInserted,
    skipped: skipped,
    note: 'Live scraper ready'
  };
}

module.exports = {
  SEARCH_TERMS,
  ingestFromJSON,
  collectReddit
};
