const express = require('express');
const router = express.Router();
const db = require('../db/init');
const queries = require('../db/queries');

/**
 * Data Endpoints for Google Photos Retrieval Discovery Engine
 */

// 1. Aggregate KPIs
router.get('/stats', (req, res) => {
  try {
    const stats = queries.getEvidenceStats();
    res.json({ status: 'ok', data: stats });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. Paginated Evidence List with Filters
router.get('/evidence', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      relevance: req.query.relevance,
      source: req.query.source,
      scenario: req.query.scenario,
      failure: req.query.failure,
      severity: req.query.severity,
      confidence_min: req.query.confidence_min,
      search: req.query.search
    };

    const result = queries.getEvidence(filters, page, limit);
    res.json({ status: 'ok', ...result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 3. Single Evidence Node (Full detail)
router.get('/evidence/:id', (req, res) => {
  try {
    const node = queries.getEvidenceById(req.params.id);
    if (!node) {
      return res.status(404).json({ status: 'error', message: 'Evidence node not found' });
    }
    res.json({ status: 'ok', data: node });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 4. Scenario Breakdown
router.get('/scenarios', (req, res) => {
  try {
    const scenarios = queries.getScenarioBreakdown();
    res.json({ status: 'ok', data: scenarios });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 5. Memory Matrix (Remember vs Forget aggregated signals)
router.get('/memory-matrix', (req, res) => {
  try {
    // Aggregation of remembered signals vs forgotten signals
    const evidence = queries.getEvidence({}, 1, 1000).data;
    const matrix = {
      remembered: {},
      forgotten: {}
    };

    evidence.forEach(item => {
      (item.memory_clues || []).forEach(clue => {
        matrix.remembered[clue] = (matrix.remembered[clue] || 0) + 1;
      });
      (item.forgotten_info || []).forEach(info => {
        matrix.forgotten[info] = (matrix.forgotten[info] || 0) + 1;
      });
    });

    res.json({ status: 'ok', data: matrix });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 6. Failure Taxonomy
router.get('/failures', (req, res) => {
  try {
    const failures = queries.getFailureTaxonomy();
    res.json({ status: 'ok', data: failures });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 7. User Segments
router.get('/segments', (req, res) => {
  try {
    const segments = queries.getSegments();
    res.json({ status: 'ok', data: segments });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 8. Opportunities List
router.get('/opportunities', (req, res) => {
  try {
    const opportunities = queries.getOpportunities();
    res.json({ status: 'ok', data: opportunities });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 9. Single Opportunity Detail
router.get('/opportunities/:id', (req, res) => {
  try {
    const opp = queries.getOpportunityById(req.params.id);
    if (!opp) {
      return res.status(404).json({ status: 'error', message: 'Opportunity not found' });
    }
    res.json({ status: 'ok', data: opp });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 10. Retrieval Journey Stage Data
router.get('/journey', (req, res) => {
  try {
    // 8-stage journey aggregated drop-offs & friction points
    const stages = [
      { stage: 1, name: 'Memory Need Trigger', dropoff_pct: 0, friction_summary: 'User experiences vague memory cue', primary_failure: 'Temporal uncertainty' },
      { stage: 2, name: 'Query Formulation', dropoff_pct: 18, friction_summary: 'Vocabulary mismatch between mental model and search bar', primary_failure: 'Semantic gap' },
      { stage: 3, name: 'First Query Attempt', dropoff_pct: 29, friction_summary: 'Too many irrelevant results or zero matches', primary_failure: 'OCR/Metadata void' },
      { stage: 4, name: 'Result Evaluation', dropoff_pct: 42, friction_summary: 'Fatigue from infinite scrolling through similar photos', primary_failure: 'Visual ambiguity' },
      { stage: 5, name: 'Query Reformulation', dropoff_pct: 61, friction_summary: 'Trying synonyms, broader dates, or location filters', primary_failure: 'Vocabulary exhaustion' },
      { stage: 6, name: 'Manual Timeline Scrubbing', dropoff_pct: 74, friction_summary: 'Abandoning search bar for brute-force timeline scroll', primary_failure: 'Search abandonment' },
      { stage: 7, name: 'External Workarounds', dropoff_pct: 85, friction_summary: 'Asking friends on chat or checking receipts in email', primary_failure: 'Cross-app fragmentation' },
      { stage: 8, name: 'Final Outcome', dropoff_pct: 45, friction_summary: 'Success after high cognitive effort or permanent abandonment', primary_failure: 'Lost memory' }
    ];
    res.json({ status: 'ok', data: stages });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 11. Representative Quotes for an Opportunity
router.get('/quotes/:opportunity_id', (req, res) => {
  try {
    const quotes = queries.getQuotesByOpportunity(req.params.opportunity_id);
    res.json({ status: 'ok', data: quotes });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 12. Export CSV
router.get('/export/csv', (req, res) => {
  try {
    const result = queries.getEvidence({}, 1, 10000);
    const headers = ['id', 'source_platform', 'source_date', 'scenario_type', 'failure_type', 'severity', 'confidence', 'original_text'];
    const rows = result.data.map(item => [
      item.id,
      `"${item.source_platform || ''}"`,
      `"${item.source_date || ''}"`,
      `"${item.scenario_type || ''}"`,
      `"${item.failure_type || ''}"`,
      `"${item.severity || ''}"`,
      item.confidence,
      `"${(item.original_text || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="evidence-nodes.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 13. Export JSON
router.get('/export/json', (req, res) => {
  try {
    const result = queries.getEvidence({}, 1, 10000);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="evidence-corpus.json"');
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 14. Export Opportunity Report
router.get('/export/report', (req, res) => {
  try {
    const opportunities = queries.getOpportunities();
    const stats = queries.getEvidenceStats();
    res.json({
      title: 'Google Photos Retrieval Opportunity Report',
      generated_at: new Date().toISOString(),
      corpus_stats: stats,
      opportunities
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 15. Discovery Engine: 10 PM Benchmark Questions
const { BENCHMARK_QUESTIONS, synthesizePMQuery } = require('../pipeline/discoverySynthesizer');

router.get('/discovery/benchmarks', (req, res) => {
  res.json({
    status: 'ok',
    data: BENCHMARK_QUESTIONS
  });
});

// 16. Discovery Engine: Natural Language Query & Synthesis
router.post('/discovery/query', async (req, res) => {
  try {
    const query = req.body && req.body.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ status: 'error', message: 'Query parameter is required' });
    }
    const result = await synthesizePMQuery(query);
    res.json(result);
  } catch (err) {
    console.error('[API] /discovery/query failed:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/discovery/query', async (req, res) => {
  try {
    const query = req.query.q || req.query.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ status: 'error', message: 'Query parameter (q) is required' });
    }
    const result = await synthesizePMQuery(query);
    res.json(result);
  } catch (err) {
    console.error('[API] /discovery/query failed:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 17. Consolidated Discovery Dashboard Endpoint (Empirical Survey + Real Evidence)
router.get('/discovery-dashboard', (req, res) => {
  try {
    const totalEvidence = db.prepare('SELECT COUNT(*) as count FROM evidence_nodes').get().count;

    // Real scraped evidence counts mapped to key findings
    const searchFailuresCount = db.prepare("SELECT COUNT(*) as count FROM evidence_nodes WHERE scenario_type = 'search_failure' OR failure_type LIKE '%search%'").get().count;
    const timeWasteCount = db.prepare("SELECT COUNT(*) as count FROM evidence_nodes WHERE scenario_type = 'time_waste' OR original_text LIKE '%minute%' OR original_text LIKE '%hour%' OR original_text LIKE '%waste%'").get().count;
    const memoryMismatchCount = db.prepare("SELECT COUNT(*) as count FROM evidence_nodes WHERE scenario_type IN ('memory_mismatch', 'person_memory', 'travel_memory', 'event_memory')").get().count;
    const manualScrollCount = db.prepare("SELECT COUNT(*) as count FROM evidence_nodes WHERE scenario_type = 'manual_browsing' OR original_text LIKE '%scroll%' OR workaround LIKE '%scroll%'").get().count;
    const utilityMediaCount = db.prepare("SELECT COUNT(*) as count FROM evidence_nodes WHERE scenario_type IN ('utility_retrieval', 'document_screenshot') OR original_text LIKE '%receipt%' OR original_text LIKE '%screenshot%'").get().count;

    // Filter evidence nodes if requested
    const category = req.query.category;
    let evidenceQuery = 'SELECT id, source_platform, source_url, source_date, original_text, severity, scenario_type, failure_type, workaround, confidence FROM evidence_nodes';
    const params = [];
    if (category && category !== 'all') {
      if (category === 'search_failure') {
        evidenceQuery += " WHERE scenario_type = 'search_failure' OR failure_type LIKE '%search%'";
      } else if (category === 'time_waste') {
        evidenceQuery += " WHERE scenario_type = 'time_waste' OR original_text LIKE '%minute%' OR original_text LIKE '%hour%' OR original_text LIKE '%waste%'";
      } else if (category === 'memory_mismatch') {
        evidenceQuery += " WHERE scenario_type IN ('memory_mismatch', 'person_memory', 'travel_memory', 'event_memory')";
      } else if (category === 'manual_scrolling') {
        evidenceQuery += " WHERE scenario_type = 'manual_browsing' OR original_text LIKE '%scroll%' OR workaround LIKE '%scroll%'";
      } else if (category === 'utility_media') {
        evidenceQuery += " WHERE scenario_type IN ('utility_retrieval', 'document_screenshot') OR original_text LIKE '%receipt%' OR original_text LIKE '%screenshot%'";
      } else if (category === 'app_store') {
        evidenceQuery += " WHERE source_platform = 'app_store'";
      } else if (category === 'play_store') {
        evidenceQuery += " WHERE source_platform = 'play_store'";
      } else if (category === 'reddit') {
        evidenceQuery += " WHERE source_platform = 'reddit'";
      } else if (category === 'community') {
        evidenceQuery += " WHERE source_platform = 'community'";
      } else if (category === 'usability_lab') {
        evidenceQuery += " WHERE source_platform = 'usability_lab'";
      } else {
        evidenceQuery += " WHERE source_platform = ?";
        params.push(category);
      }
    }
    evidenceQuery += ' ORDER BY id DESC LIMIT 500';
    const evidenceList = db.prepare(evidenceQuery).all(...params);

    const platformBreakdown = db.prepare('SELECT source_platform, COUNT(*) as count FROM evidence_nodes GROUP BY source_platform ORDER BY count DESC').all();

    res.json({
      status: 'ok',
      data: {
        kpis: {
          success_rate_1st: 12.9,
          forgotten_dates: 74.2,
          fallback_scrolling: 71.0,
          search_time_5m_plus: 61.3,
          depressed_confidence: 64.5,
          sample_size: 31,
          total_scraped_reviews: totalEvidence,
          platform_breakdown: platformBreakdown
        },
        charts: {
          memory_mismatch: {
            remembered: [
              { label: 'People / Who was in photo', value: 45.2, count: 14 },
              { label: 'Location / Setting', value: 41.9, count: 13 },
              { label: 'Approx. Season / Year', value: 35.5, count: 11 },
              { label: 'Ongoing Activities', value: 32.3, count: 10 }
            ],
            forgotten: [
              { label: 'Exact Dates', value: 74.2, count: 23 },
              { label: 'Exact Text in Image', value: 29.0, count: 9 },
              { label: 'Filenames', value: 25.8, count: 8 },
              { label: 'Album Names', value: 22.6, count: 7 }
            ]
          },
          search_outcomes: [
            { label: 'Manual Timeline Scrolling', value: 45.2, count: 14, color: '#ea4335' },
            { label: 'Ambiguous Matches (Manual Review)', value: 16.1, count: 5, color: '#fbbc04' },
            { label: 'Keyword Query Refinement', value: 16.1, count: 5, color: '#4285f4' },
            { label: '1st-Attempt Search Success', value: 12.9, count: 4, color: '#34a853' },
            { label: 'Gave Up / Left App', value: 9.7, count: 3, color: '#94a3b8' }
          ],
          search_duration: [
            { label: '< 2 mins', value: 16.1, count: 5, color: '#34a853' },
            { label: '2–5 mins', value: 22.6, count: 7, color: '#4285f4' },
            { label: '5–10 mins', value: 32.3, count: 10, color: '#fbbc04', alert: true },
            { label: '10–30 mins', value: 19.4, count: 6, color: '#ea4335', alert: true },
            { label: '> 30m / Lost', value: 9.7, count: 3, color: '#b91c1c', alert: true }
          ],
          hardest_media: [
            { label: 'Documents & Receipts', value: 22.6, count: 7, category: 'Utility', isTop: true, color: '#ea4335' },
            { label: 'Portraits & People', value: 16.1, count: 5, category: 'Personal', color: '#4285f4' },
            { label: 'Event Photos', value: 16.1, count: 5, category: 'Social', color: '#6366f1' },
            { label: 'Travel / Settings', value: 16.1, count: 5, category: 'Travel', color: '#0ea5e9' },
            { label: 'Screenshots', value: 12.9, count: 4, category: 'Utility', isTop: true, color: '#f59e0b' },
            { label: 'Other Visual Media', value: 16.2, count: 5, category: 'Misc', color: '#94a3b8' }
          ],
          scraped_distribution: [
            { label: 'Search Relevance Failure', count: searchFailuresCount, color: '#ea4335' },
            { label: 'Time Waste & Frustration', count: timeWasteCount, color: '#f97316' },
            { label: 'Episodic Memory Mismatch', count: memoryMismatchCount, color: '#6366f1' },
            { label: 'Forced Manual Scrolling', count: manualScrollCount, color: '#fbbc04' },
            { label: 'Utility Media Lost', count: utilityMediaCount, color: '#06b6d4' }
          ],
          confidence_distribution: [
            { label: '1 Star (Very Low)', value: 19.4, count: 6, color: '#ea4335' },
            { label: '2 Stars (Low)', value: 22.6, count: 7, color: '#f97316' },
            { label: '3 Stars (Moderate)', value: 22.6, count: 7, color: '#fbbc04' },
            { label: '4 Stars (Good)', value: 25.8, count: 8, color: '#4285f4' },
            { label: '5 Stars (High)', value: 9.7, count: 3, color: '#34a853' }
          ]
        },
        opportunities: [
          {
            id: 'opp-1',
            title: 'Episodic & Contextual Query Parsing',
            priority: 'P0',
            problem: '74.2% of users forget exact dates, yet search requires rigid metadata.',
            memory_gap: 'Users recall people (45.2%) and location (41.9%), but lack dates/filenames.',
            metric_impact: 'Directly addresses the 87.1% first-attempt search failure rate.',
            evidence_count: searchFailuresCount,
            tags: ['Natural Language', 'Semantic Gap', 'P0 Core']
          },
          {
            id: 'opp-2',
            title: 'Timeline Anchors & Visual Scrubbing',
            priority: 'P0',
            problem: '71.0% resort to brute-force manual timeline scrolling when search fails.',
            memory_gap: 'Users remember visual seasons/trips, but must scroll through thousands of items.',
            metric_impact: 'Directly cuts down the 61.3% of searches that exceed 5 minutes.',
            evidence_count: manualScrollCount,
            tags: ['Navigation', 'Fatigue Reduction', 'P0 Core']
          },
          {
            id: 'opp-3',
            title: 'Dedicated Utility Media & Receipt Intelligence',
            priority: 'P1',
            problem: 'Documents & receipts (22.6%) and screenshots (12.9%) are hardest to locate.',
            memory_gap: 'Users recall content type (e.g. "Best Buy receipt") but exact text OCR fails.',
            metric_impact: 'Eliminates the #1 single hardest media retrieval friction.',
            evidence_count: utilityMediaCount,
            tags: ['Utility Media', 'OCR', 'P1 Strategic']
          },
          {
            id: 'opp-4',
            title: 'Interactive Result Disambiguation',
            priority: 'P1',
            problem: '35.5% report search misunderstands intent; 16.1% get ambiguous results.',
            memory_gap: 'Users cannot translate vague visual memories into single rigid search keywords.',
            metric_impact: 'Raises user search confidence from the depressed 64.5% baseline.',
            evidence_count: memoryMismatchCount,
            tags: ['Disambiguation', 'Refinement', 'P1 Strategic']
          }
        ],
        evidence_nodes: evidenceList
      }
    });
  } catch (err) {
    console.error('[API] /discovery-dashboard failed:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
