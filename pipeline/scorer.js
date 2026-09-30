const db = require('../db/init');

/**
 * Transparent Mathematical Scoring Engine
 * Pure math — zero AI hallucinations.
 * Formula: Composite Score = 0.20*Freq + 0.25*Sev + 0.15*Strength + 0.15*Breadth + 0.15*Impact + 0.10*Diff
 */

const SEVERITY_WEIGHTS = {
  critical: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25
};

const EFFORT_WEIGHTS = {
  abandoned: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25
};

/**
 * Calculate scores for a single opportunity
 */
function scoreOpportunity(oppId) {
  const totalEvidenceCount = db.prepare('SELECT COUNT(*) as count FROM evidence_nodes').get().count || 1;
  const totalSegmentsCount = db.prepare('SELECT COUNT(*) as count FROM user_segments').get().count || 4;

  const linkedNodes = db.prepare(`
    SELECT severity, confidence, workaround_effort, user_segment 
    FROM evidence_nodes 
    WHERE opportunity_id = ?
  `).all(oppId);

  const count = linkedNodes.length;

  if (count === 0) {
    return {
      frequency_score: 0,
      severity_score: 0,
      evidence_strength: 0,
      user_breadth: 0,
      retrieval_impact: 0,
      workaround_difficulty: 0,
      composite_score: 0,
      confidence: 'low',
      priority: 'P2',
      scoring_methodology: 'No linked evidence nodes found.'
    };
  }

  // 1. Frequency (Normalized relative to total corpus, clamped 0.0-1.0)
  const frequency_score = Math.min(1.0, parseFloat((count / (totalEvidenceCount * 0.4)).toFixed(2)));

  // 2. Severity Score (Average)
  const totalSev = linkedNodes.reduce((sum, n) => sum + (SEVERITY_WEIGHTS[n.severity] || 0.5), 0);
  const severity_score = parseFloat((totalSev / count).toFixed(2));

  // 3. Evidence Strength (Average confidence)
  const totalConf = linkedNodes.reduce((sum, n) => sum + (n.confidence || 0.5), 0);
  const evidence_strength = parseFloat((totalConf / count).toFixed(2));

  // 4. User Breadth (Unique segments / total)
  const uniqueSegments = new Set(linkedNodes.map(n => n.user_segment).filter(Boolean)).size;
  const user_breadth = parseFloat((uniqueSegments / totalSegmentsCount).toFixed(2));

  // 5. Retrieval Impact (% of nodes where workaround = 'abandoned')
  const abandonedCount = linkedNodes.filter(n => n.workaround_effort === 'abandoned').length;
  const retrieval_impact = parseFloat((abandonedCount / count).toFixed(2));

  // 6. Workaround Difficulty (Average effort score)
  const totalEffort = linkedNodes.reduce((sum, n) => sum + (EFFORT_WEIGHTS[n.workaround_effort] || 0.5), 0);
  const workaround_difficulty = parseFloat((totalEffort / count).toFixed(2));

  // Composite Formula
  const composite_score = parseFloat((
    (0.20 * frequency_score) +
    (0.25 * severity_score) +
    (0.15 * evidence_strength) +
    (0.15 * user_breadth) +
    (0.15 * retrieval_impact) +
    (0.10 * workaround_difficulty)
  ).toFixed(2));

  // Confidence rating
  let confidence = 'low';
  if (count >= 4 && evidence_strength >= 0.80) {
    confidence = 'high';
  } else if (count >= 2) {
    confidence = 'medium';
  }

  // Priority classification
  let priority = 'P2';
  if (composite_score >= 0.65) {
    priority = 'P0';
  } else if (composite_score >= 0.40) {
    priority = 'P1';
  }

  const scoring_methodology = `Composite (${composite_score}) = 0.20*Freq(${frequency_score}) + 0.25*Sev(${severity_score}) + 0.15*Str(${evidence_strength}) + 0.15*Brd(${user_breadth}) + 0.15*Imp(${retrieval_impact}) + 0.10*Diff(${workaround_difficulty}) across ${count} verified nodes.`;

  return {
    frequency_score,
    severity_score,
    evidence_strength,
    user_breadth,
    retrieval_impact,
    workaround_difficulty,
    composite_score,
    confidence,
    priority,
    scoring_methodology,
    evidence_count: count
  };
}

/**
 * Score all opportunities in the database
 */
function scoreAll() {
  console.log('[Scorer] Calculating transparent mathematical scores for all opportunities...');
  const opportunities = db.prepare('SELECT id, name FROM opportunities').all();

  const updateStmt = db.prepare(`
    UPDATE opportunities SET
      frequency_score = ?,
      severity_score = ?,
      evidence_strength = ?,
      user_breadth = ?,
      workaround_difficulty = ?,
      composite_score = ?,
      confidence = ?,
      priority = ?,
      scoring_methodology = ?,
      evidence_count = ?
    WHERE id = ?
  `);

  const results = [];
  const scoreTx = db.transaction(() => {
    for (const opp of opportunities) {
      const scores = scoreOpportunity(opp.id);
      updateStmt.run(
        scores.frequency_score,
        scores.severity_score,
        scores.evidence_strength,
        scores.user_breadth,
        scores.workaround_difficulty,
        scores.composite_score,
        scores.confidence,
        scores.priority,
        scores.scoring_methodology,
        scores.evidence_count,
        opp.id
      );
      results.push({ id: opp.id, name: opp.name, ...scores });
    }
  });

  scoreTx();
  console.log(`[Scorer] Successfully scored ${results.length} opportunities.`);
  return results;
}

module.exports = {
  scoreOpportunity,
  scoreAll
};
