const express = require('express');
const router = express.Router();
const collector = require('../pipeline/collector');
const processor = require('../pipeline/processor');
const scorer = require('../pipeline/scorer');
const db = require('../db/init');

let pipelineState = {
  status: 'idle',           // 'idle' | 'running' | 'completed' | 'error'
  current_step: null,       // 'collecting' | 'processing' | 'scoring'
  total_items: 0,
  processed_items: 0,
  last_run: null,
  error_message: null
};

// GET Detailed Pipeline Status
router.get('/status', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM evidence_nodes').get().count;
  const processed = db.prepare("SELECT COUNT(*) as count FROM evidence_nodes WHERE relevance != 'unprocessed'").get().count;
  const unprocessed = total - processed;
  const opportunities = db.prepare('SELECT COUNT(*) as count FROM opportunities').get().count;

  res.json({
    status: 'ok',
    data: {
      ...pipelineState,
      total_nodes: total,
      processed_nodes: processed,
      unprocessed_nodes: unprocessed,
      opportunities_count: opportunities
    }
  });
});

// POST Trigger Collection
router.post('/collect', async (req, res) => {
  try {
    pipelineState.status = 'running';
    pipelineState.current_step = 'collecting';

    const result = await collector.collectReddit({ allowLive: req.body && req.body.allowLive === true });

    pipelineState.status = 'completed';
    pipelineState.total_items = result.total || result.total_found || 0;
    pipelineState.last_run = new Date().toISOString();

    res.json({
      status: 'ok',
      message: 'Collection completed successfully',
      data: {
        ...result,
        pipeline: pipelineState
      }
    });
  } catch (err) {
    pipelineState.status = 'error';
    pipelineState.error_message = err.message;
    console.error('[Pipeline] Collection failed:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST Trigger AI Processing
router.post('/process', async (req, res) => {
  try {
    pipelineState.status = 'running';
    pipelineState.current_step = 'processing';

    const limit = parseInt(req.body && req.body.limit) || 100;
    const processResult = await processor.processAll(limit);
    const clusterResult = processor.clusterOpportunities();

    pipelineState.status = 'completed';
    pipelineState.processed_items = processResult.processed;
    pipelineState.last_run = new Date().toISOString();

    res.json({
      status: 'ok',
      message: 'Processing and clustering completed successfully',
      data: {
        classification: processResult,
        opportunities_clustered: clusterResult.length,
        pipeline: pipelineState
      }
    });
  } catch (err) {
    pipelineState.status = 'error';
    pipelineState.error_message = err.message;
    console.error('[Pipeline] Processing failed:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST Trigger Scoring
router.post('/score', (req, res) => {
  try {
    pipelineState.status = 'running';
    pipelineState.current_step = 'scoring';

    const scores = scorer.scoreAll();

    pipelineState.status = 'completed';
    pipelineState.last_run = new Date().toISOString();

    res.json({
      status: 'ok',
      message: 'Scoring completed successfully',
      data: {
        scored_count: scores.length,
        opportunities: scores,
        pipeline: pipelineState
      }
    });
  } catch (err) {
    pipelineState.status = 'error';
    pipelineState.error_message = err.message;
    console.error('[Pipeline] Scoring failed:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST Trigger Play Store Scraper Live
router.post('/scrape-playstore', async (req, res) => {
  try {
    pipelineState.status = 'running';
    pipelineState.current_step = 'playstore_scrape';

    const playStoreScraper = require('../pipeline/playStoreScraper');
    const collector = require('../pipeline/collector');

    const result = await playStoreScraper.scrapeAndSave();
    const ingestResult = collector.ingestFromJSON('data/raw/play-store-evidence.json');

    pipelineState.status = 'completed';
    pipelineState.last_run = new Date().toISOString();

    const totalNodes = db.prepare('SELECT COUNT(*) as count FROM evidence_nodes').get().count;

    res.json({
      status: 'ok',
      message: `Scraped ${result.supporting_evidence.length} relevant reviews. Ingested ${ingestResult.ingested} new evidence items.`,
      data: {
        total_scraped: result.supporting_evidence.length,
        ingested: ingestResult.ingested,
        total_in_db: totalNodes,
        finding_counts: result.finding_counts
      }
    });
  } catch (err) {
    pipelineState.status = 'error';
    pipelineState.error_message = err.message;
    console.error('[Pipeline] Play Store scraping failed:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST Trigger Apple App Store Scraper Live
router.post('/scrape-appstore', async (req, res) => {
  try {
    pipelineState.status = 'running';
    pipelineState.current_step = 'appstore_scrape';

    const appStoreScraper = require('../pipeline/appStoreScraper');
    const collector = require('../pipeline/collector');

    const result = await appStoreScraper.scrapeAndSave();
    const ingestResult = collector.ingestFromJSON('data/raw/app-store-evidence.json');

    pipelineState.status = 'completed';
    pipelineState.last_run = new Date().toISOString();

    const totalNodes = db.prepare('SELECT COUNT(*) as count FROM evidence_nodes').get().count;

    res.json({
      status: 'ok',
      message: `Scraped ${result.supporting_evidence.length} Apple App Store reviews. Ingested ${ingestResult.inserted} new evidence items.`,
      data: {
        total_scraped: result.supporting_evidence.length,
        ingested: ingestResult.inserted,
        total_in_db: totalNodes,
        finding_counts: result.finding_counts
      }
    });
  } catch (err) {
    pipelineState.status = 'error';
    pipelineState.error_message = err.message;
    console.error('[Pipeline] Apple App Store scraping failed:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST Trigger All Scrapers (Play Store + Apple App Store)
router.post('/scrape-all', async (req, res) => {
  try {
    pipelineState.status = 'running';
    pipelineState.current_step = 'scrape_all';

    const playStoreScraper = require('../pipeline/playStoreScraper');
    const appStoreScraper = require('../pipeline/appStoreScraper');
    const collector = require('../pipeline/collector');

    const [playResult, appResult] = await Promise.all([
      playStoreScraper.scrapeAndSave(),
      appStoreScraper.scrapeAndSave()
    ]);

    const playIngest = collector.ingestFromJSON('data/raw/play-store-evidence.json');
    const appIngest = collector.ingestFromJSON('data/raw/app-store-evidence.json');

    pipelineState.status = 'completed';
    pipelineState.last_run = new Date().toISOString();

    const totalNodes = db.prepare('SELECT COUNT(*) as count FROM evidence_nodes').get().count;

    res.json({
      status: 'ok',
      message: `Scraped ${playResult.supporting_evidence.length} Play Store reviews and ${appResult.supporting_evidence.length} Apple App Store reviews. Total DB evidence: ${totalNodes}.`,
      data: {
        play_store_scraped: playResult.supporting_evidence.length,
        app_store_scraped: appResult.supporting_evidence.length,
        total_in_db: totalNodes
      }
    });
  } catch (err) {
    pipelineState.status = 'error';
    pipelineState.error_message = err.message;
    console.error('[Pipeline] Scrape all failed:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
