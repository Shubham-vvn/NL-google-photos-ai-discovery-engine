const db = require('./init');

/**
 * Reusable Prepared Statements and Database Queries
 */

// --- Evidence Queries ---

function getEvidenceStats(includeAll = false) {
  const dateClause = includeAll ? '' : "WHERE source_date >= '2024-01-01'";
  const andDateClause = includeAll ? '' : "AND source_date >= '2024-01-01'";
  const whereOrAnd = includeAll ? 'WHERE' : "WHERE source_date >= '2024-01-01' AND";

  const total = db.prepare(`SELECT COUNT(*) as count FROM evidence_nodes ${dateClause}`).get().count;
  const processed = db.prepare(`SELECT COUNT(*) as count FROM evidence_nodes WHERE relevance != 'unprocessed' ${andDateClause}`).get().count;
  const relevant = db.prepare(`SELECT COUNT(*) as count FROM evidence_nodes WHERE relevance = 'relevant' ${andDateClause}`).get().count;
  const opportunities = db.prepare('SELECT COUNT(*) as count FROM opportunities').get().count;
  const p0Count = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE priority = 'P0'").get().count;
  const segments = db.prepare('SELECT COUNT(*) as count FROM user_segments').get().count;

  // Breakdown by sources
  const sources = db.prepare(`
    SELECT source_platform, COUNT(*) as count 
    FROM evidence_nodes 
    ${dateClause}
    GROUP BY source_platform
  `).all();

  // Top failure mode
  const topFailure = db.prepare(`
    SELECT failure_type, COUNT(*) as count 
    FROM evidence_nodes 
    ${whereOrAnd} failure_type IS NOT NULL AND failure_type != ''
    GROUP BY failure_type 
    ORDER BY count DESC 
    LIMIT 1
  `).get() || { failure_type: 'Semantic Gap', count: 0 };

  const topFailurePercentage = total > 0 ? Math.round((topFailure.count / total) * 100) : 0;

  return {
    total_sources: total,
    validated_nodes: relevant,
    processed_count: processed,
    validation_rate: total > 0 ? Math.round((relevant / total) * 100) : 0,
    top_failure_mode: topFailure.failure_type || 'None',
    top_failure_percentage: topFailurePercentage,
    opportunities_count: opportunities,
    p0_solutions: p0Count,
    user_segments_count: segments,
    sources_breakdown: sources
  };
}

function getEvidence(filters = {}, page = 1, limit = 20) {
  let query = 'SELECT * FROM evidence_nodes WHERE 1=1';
  const params = [];

  if (!filters.include_all && filters.include_all !== 'true') {
    if (filters.date_min) {
      query += ' AND source_date >= ?';
      params.push(filters.date_min);
    } else {
      query += " AND source_date >= '2024-01-01'";
    }
  } else if (filters.date_min) {
    query += ' AND source_date >= ?';
    params.push(filters.date_min);
  }

  if (filters.relevance) {
    query += ' AND relevance = ?';
    params.push(filters.relevance);
  }
  if (filters.source) {
    const sources = filters.source.split(',').map(s => s.trim());
    query += ` AND source_platform IN (${sources.map(() => '?').join(',')})`;
    params.push(...sources);
  }
  if (filters.scenario) {
    const scenarios = filters.scenario.split(',').map(s => s.trim());
    query += ` AND scenario_type IN (${scenarios.map(() => '?').join(',')})`;
    params.push(...scenarios);
  }
  if (filters.failure) {
    const failures = filters.failure.split(',').map(s => s.trim());
    query += ` AND failure_type IN (${failures.map(() => '?').join(',')})`;
    params.push(...failures);
  }
  if (filters.severity) {
    const severities = filters.severity.split(',').map(s => s.trim());
    query += ` AND severity IN (${severities.map(() => '?').join(',')})`;
    params.push(...severities);
  }
  if (filters.confidence_min) {
    query += ' AND confidence >= ?';
    params.push(parseFloat(filters.confidence_min));
  }
  if (filters.search) {
    query += ' AND (original_text LIKE ? OR failure_detail LIKE ? OR workaround LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  // Count total matching
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const total = db.prepare(countQuery).get(...params).total;

  // Pagination
  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const offset = (page - 1) * limit;
  const items = db.prepare(query).all(...params, limit, offset);

  // Parse JSON fields
  const parsedItems = items.map(item => ({
    ...item,
    memory_clues: safeJsonParse(item.memory_clues, []),
    forgotten_info: safeJsonParse(item.forgotten_info, []),
    search_queries: safeJsonParse(item.search_queries, []),
    search_methods: safeJsonParse(item.search_methods, [])
  }));

  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit) || 1,
    data: parsedItems
  };
}

function getEvidenceById(id) {
  const item = db.prepare('SELECT * FROM evidence_nodes WHERE id = ?').get(id);
  if (!item) return null;
  return {
    ...item,
    memory_clues: safeJsonParse(item.memory_clues, []),
    forgotten_info: safeJsonParse(item.forgotten_info, []),
    search_queries: safeJsonParse(item.search_queries, []),
    search_methods: safeJsonParse(item.search_methods, [])
  };
}

function insertEvidence(node) {
  const stmt = db.prepare(`
    INSERT INTO evidence_nodes (
      source_platform, source_url, source_date, collected_at,
      original_text, relevance, relevance_reasoning,
      scenario_type, memory_clues, forgotten_info,
      search_queries, search_methods, failure_type, failure_detail,
      workaround, workaround_effort, user_segment,
      severity, confidence, evidence_type, opportunity_id
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  return stmt.run(
    node.source_platform,
    node.source_url || null,
    node.source_date || null,
    node.collected_at || new Date().toISOString(),
    node.original_text,
    node.relevance || 'unprocessed',
    node.relevance_reasoning || null,
    node.scenario_type || null,
    typeof node.memory_clues === 'string' ? node.memory_clues : JSON.stringify(node.memory_clues || []),
    typeof node.forgotten_info === 'string' ? node.forgotten_info : JSON.stringify(node.forgotten_info || []),
    typeof node.search_queries === 'string' ? node.search_queries : JSON.stringify(node.search_queries || []),
    typeof node.search_methods === 'string' ? node.search_methods : JSON.stringify(node.search_methods || []),
    node.failure_type || null,
    node.failure_detail || null,
    node.workaround || null,
    node.workaround_effort || null,
    node.user_segment || null,
    node.severity || 'medium',
    node.confidence || 0.0,
    node.evidence_type || 'direct_evidence',
    node.opportunity_id || null
  );
}

function updateEvidenceClassification(id, classification) {
  const stmt = db.prepare(`
    UPDATE evidence_nodes SET
      relevance = ?,
      relevance_reasoning = ?,
      scenario_type = ?,
      memory_clues = ?,
      forgotten_info = ?,
      search_queries = ?,
      search_methods = ?,
      failure_type = ?,
      failure_detail = ?,
      workaround = ?,
      workaround_effort = ?,
      user_segment = ?,
      severity = ?,
      confidence = ?,
      evidence_type = ?
    WHERE id = ?
  `);

  return stmt.run(
    classification.relevance || 'relevant',
    classification.relevance_reasoning || null,
    classification.scenario_type || null,
    typeof classification.memory_clues === 'string' ? classification.memory_clues : JSON.stringify(classification.memory_clues || []),
    typeof classification.forgotten_info === 'string' ? classification.forgotten_info : JSON.stringify(classification.forgotten_info || []),
    typeof classification.search_queries === 'string' ? classification.search_queries : JSON.stringify(classification.search_queries || []),
    typeof classification.search_methods === 'string' ? classification.search_methods : JSON.stringify(classification.search_methods || []),
    classification.failure_type || null,
    classification.failure_detail || null,
    classification.workaround || null,
    classification.workaround_effort || null,
    classification.user_segment || null,
    classification.severity || 'medium',
    classification.confidence || 0.0,
    classification.evidence_type || 'direct_evidence',
    id
  );
}

function getUnprocessedEvidence(limit = 15) {
  return db.prepare("SELECT * FROM evidence_nodes WHERE relevance = 'unprocessed' LIMIT ?").all(limit);
}

// --- Opportunities ---

function getOpportunities() {
  const items = db.prepare('SELECT * FROM opportunities ORDER BY composite_score DESC').all();
  return items.map(item => ({
    ...item,
    affected_segments: safeJsonParse(item.affected_segments, [])
  }));
}

function getOpportunityById(id) {
  const item = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id);
  if (!item) return null;
  return {
    ...item,
    affected_segments: safeJsonParse(item.affected_segments, [])
  };
}

// --- Scenarios & Taxonomy ---

function getScenarioBreakdown(includeAll = false) {
  const dateClause = includeAll ? '' : "AND source_date >= '2024-01-01'";
  const results = db.prepare(`
    SELECT 
      scenario_type, 
      COUNT(*) as count,
      ROUND(AVG(confidence), 2) as avg_confidence
    FROM evidence_nodes 
    WHERE scenario_type IS NOT NULL AND scenario_type != '' ${dateClause}
    GROUP BY scenario_type 
    ORDER BY count DESC
  `).all();

  const total = results.reduce((acc, curr) => acc + curr.count, 0);
  return results.map(r => ({
    ...r,
    percentage: total > 0 ? Math.round((r.count / total) * 100) : 0
  }));
}

function getFailureTaxonomy() {
  return db.prepare('SELECT * FROM taxonomy_nodes ORDER BY evidence_count DESC').all();
}

function getSegments() {
  const items = db.prepare('SELECT * FROM user_segments ORDER BY evidence_count DESC').all();
  return items.map(item => ({
    ...item,
    typical_memory_type: safeJsonParse(item.typical_memory_type, [])
  }));
}

function getQuotesByOpportunity(opportunityId) {
  return db.prepare(`
    SELECT id, original_text, source_platform, source_date, severity, confidence 
    FROM evidence_nodes 
    WHERE opportunity_id = ? 
    ORDER BY confidence DESC 
    LIMIT 10
  `).all(opportunityId);
}

// --- Utility: Safe JSON parsing ---
function safeJsonParse(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

module.exports = {
  getEvidenceStats,
  getEvidence,
  getEvidenceById,
  insertEvidence,
  updateEvidenceClassification,
  getUnprocessedEvidence,
  getOpportunities,
  getOpportunityById,
  getScenarioBreakdown,
  getFailureTaxonomy,
  getSegments,
  getQuotesByOpportunity
};
