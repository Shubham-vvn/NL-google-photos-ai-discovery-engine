const fs = require('fs');
const path = require('path');
const db = require('./init');
const collector = require('../pipeline/collector');
const processor = require('../pipeline/processor');
const scorer = require('../pipeline/scorer');

function seed() {
  console.log('--- Starting Database Seeding ---');

  const processedDir = path.join(__dirname, '..', 'data', 'processed');
  const nodesFile = path.join(processedDir, 'nodes.json');
  const oppsFile = path.join(processedDir, 'opportunities.json');
  const taxonomyFile = path.join(processedDir, 'taxonomy.json');
  const segmentsFile = path.join(processedDir, 'segments.json');

  // Fast restore if processed backups exist (Render cold boot)
  if (fs.existsSync(nodesFile) && fs.existsSync(oppsFile)) {
    console.log('[Seed] Found processed backups in data/processed/. Restoring complete verified database...');

    const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf-8'));
    const opps = JSON.parse(fs.readFileSync(oppsFile, 'utf-8'));
    const taxonomy = fs.existsSync(taxonomyFile) ? JSON.parse(fs.readFileSync(taxonomyFile, 'utf-8')) : [];
    const segments = fs.existsSync(segmentsFile) ? JSON.parse(fs.readFileSync(segmentsFile, 'utf-8')) : [];

    // 1. Opportunities
    const insertOpp = db.prepare(`
      INSERT INTO opportunities (
        id, name, priority, user_problem, memory_pattern,
        missing_information, failure_point, typical_workaround,
        affected_segments, evidence_count, frequency_score, severity_score,
        evidence_strength, user_breadth, workaround_difficulty, composite_score,
        confidence, scoring_methodology
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        priority = excluded.priority,
        user_problem = excluded.user_problem,
        composite_score = excluded.composite_score,
        evidence_count = excluded.evidence_count
    `);

    const oppTx = db.transaction((items) => {
      for (const o of items) {
        insertOpp.run(
          o.id, o.name, o.priority, o.user_problem, o.memory_pattern,
          o.missing_information, o.failure_point, o.typical_workaround,
          o.affected_segments, o.evidence_count, o.frequency_score, o.severity_score,
          o.evidence_strength, o.user_breadth, o.workaround_difficulty, o.composite_score,
          o.confidence, o.scoring_methodology
        );
      }
    });
    oppTx(opps);

    // 2. Evidence Nodes
    const insertNode = db.prepare(`
      INSERT INTO evidence_nodes (
        id, source_platform, source_url, source_date, collected_at,
        original_text, relevance, relevance_reasoning,
        scenario_type, memory_clues, forgotten_info,
        search_queries, search_methods, failure_type, failure_detail,
        workaround, workaround_effort, user_segment,
        severity, confidence, evidence_type, opportunity_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        relevance = excluded.relevance,
        failure_type = excluded.failure_type,
        opportunity_id = excluded.opportunity_id
    `);

    const nodeTx = db.transaction((items) => {
      for (const n of items) {
        insertNode.run(
          n.id, n.source_platform, n.source_url, n.source_date, n.collected_at,
          n.original_text, n.relevance, n.relevance_reasoning,
          n.scenario_type, n.memory_clues, n.forgotten_info,
          n.search_queries, n.search_methods, n.failure_type, n.failure_detail,
          n.workaround, n.workaround_effort, n.user_segment,
          n.severity, n.confidence, n.evidence_type, n.opportunity_id
        );
      }
    });
    nodeTx(nodes);

    // 3. Taxonomy
    if (taxonomy.length > 0) {
      const insertTax = db.prepare(`
        INSERT INTO taxonomy_nodes (id, code, label, description, evidence_count, percentage)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
          evidence_count = excluded.evidence_count,
          percentage = excluded.percentage
      `);
      const taxTx = db.transaction((items) => {
        for (const t of items) {
          insertTax.run(t.id, t.code, t.label, t.description, t.evidence_count, t.percentage);
        }
      });
      taxTx(taxonomy);
    }

    // 4. Segments
    if (segments.length > 0) {
      const insertSeg = db.prepare(`
        INSERT INTO user_segments (id, label, description, typical_memory_type, dominant_failure, dominant_workaround, evidence_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(label) DO UPDATE SET
          evidence_count = excluded.evidence_count
      `);
      const segTx = db.transaction((items) => {
        for (const s of items) {
          insertSeg.run(s.id, s.label, s.description, s.typical_memory_type, s.dominant_failure, s.dominant_workaround, s.evidence_count);
        }
      });
      segTx(segments);
    }

    console.log(`[Seed] Restored ${nodes.length} classified nodes and ${opps.length} opportunities from backup.`);
    console.log('--- Database Seeding Complete ---');
    return;
  }

  // Fallback: Ingest raw sample evidence and run pipeline
  const samplePath = path.join(__dirname, '..', 'data', 'raw', 'sample-evidence.json');
  console.log(`Ingesting sample evidence from: ${samplePath}`);
  const ingestResult = collector.ingestFromJSON(samplePath);
  console.log(`Evidence Nodes -> Total: ${ingestResult.total}, Inserted: ${ingestResult.inserted}, Skipped: ${ingestResult.skipped}`);

  // Classify and score
  processor.processAll(100);
  processor.clusterOpportunities();
  scorer.scoreAll();

  console.log('--- Database Seeding Complete ---');
}

if (require.main === module) {
  seed();
}

module.exports = seed;
