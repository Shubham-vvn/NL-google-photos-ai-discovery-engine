/**
 * Google Play Store Review Scraper
 * Scrapes reviews for Google Photos that support findings in data.txt
 * 
 * Key findings to validate:
 * 1. Search doesn't understand user intent / can't describe memories in searchable words
 * 2. Only 12.9% find target photo on first attempt → manual timeline scrolling
 * 3. 45.2% resort to manual timeline scrolling
 * 4. 61.3% spend 5+ minutes searching for a single photo
 * 5. Utility content (documents/receipts, screenshots) hardest to retrieve
 * 6. 64.5% have low confidence (3/5 or lower) in search
 */

const fs = require('fs');
const path = require('path');
const gplay = require('google-play-scraper');

// Keywords that map to each data.txt finding
const FINDING_KEYWORDS = {
  search_failure: [
    'search', 'find', 'can\'t find', 'cannot find', 'unable to find',
    'search not working', 'search broken', 'search doesn\'t work',
    'search is useless', 'search fails', 'no results', 'wrong results',
    'irrelevant results', 'doesn\'t understand', 'can\'t describe',
    'search function', 'search feature', 'ask photos'
  ],
  manual_scrolling: [
    'scroll', 'scrolling', 'manually', 'browse', 'browsing',
    'endless scroll', 'scroll through', 'scroll back', 'swipe',
    'go through', 'look through', 'dig through', 'hunt for',
    'timeline', 'one by one'
  ],
  time_waste: [
    'minutes', 'hours', 'forever', 'long time', 'waste time',
    'wasted', 'took forever', 'spent', 'time consuming',
    'frustrat', 'tedious', 'painful', 'nightmare', 'gave up',
    'give up', 'impossible'
  ],
  utility_media: [
    'receipt', 'document', 'screenshot', 'scan', 'scanned',
    'bill', 'invoice', 'ticket', 'boarding pass', 'prescription',
    'barcode', 'qr code', 'text in photo', 'ocr', 'id card',
    'insurance', 'warranty', 'contract'
  ],
  memory_mismatch: [
    'remember', 'recall', 'memory', 'memories', 'vague',
    'approximate', 'context', 'who was', 'where was', 'when was',
    'trip', 'vacation', 'event', 'birthday', 'wedding',
    'natural language', 'describe'
  ],
  low_confidence: [
    'unreliable', 'trust', 'don\'t trust', 'confidence',
    'hit or miss', 'inconsistent', 'sometimes works',
    'unpredictable', 'random', 'luck', 'lucky'
  ]
};

/**
 * Map a review to its supporting findings based on keyword matches
 */
function classifyReview(text) {
  const lowerText = text.toLowerCase();
  const matchedFindings = [];
  const matchedKeywords = {};

  for (const [finding, keywords] of Object.entries(FINDING_KEYWORDS)) {
    const matched = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      matchedFindings.push(finding);
      matchedKeywords[finding] = matched;
    }
  }

  return { matchedFindings, matchedKeywords };
}

/**
 * Convert a Play Store review into an evidence node
 */
function reviewToEvidenceNode(review, classification) {
  // Map findings to scenario types
  const scenarioMap = {
    search_failure: 'search_failure',
    manual_scrolling: 'manual_browsing',
    time_waste: 'time_waste',
    utility_media: 'utility_retrieval',
    memory_mismatch: 'memory_mismatch',
    low_confidence: 'low_confidence'
  };

  const primaryFinding = classification.matchedFindings[0];

  // Determine severity from star rating
  let severity = 'medium';
  if (review.score <= 1) severity = 'critical';
  else if (review.score <= 2) severity = 'high';
  else if (review.score <= 3) severity = 'medium';

  // Build relevance reasoning
  const findingDescriptions = {
    search_failure: 'Supports Finding 1: Search doesn\'t understand user intent (35.5% each for "search did not understand" and "couldn\'t describe in searchable words")',
    manual_scrolling: 'Supports Finding 2: 45.2% resort to manual timeline scrolling after search failure',
    time_waste: 'Supports Finding 3: 61.3% spend 5+ minutes searching for a single photo',
    utility_media: 'Supports Finding 3: Utility content (documents/receipts 22.6%, screenshots 12.9%) is hardest to retrieve',
    memory_mismatch: 'Supports Finding 1: Natural memory triggers mismatch rigid search capabilities',
    low_confidence: 'Supports Finding 3: 64.5% have low confidence (3/5 or lower) in search'
  };

  const reasoningParts = classification.matchedFindings.map(f => findingDescriptions[f]);

  return {
    source_platform: 'play_store',
    source_url: `https://play.google.com/store/apps/details?id=com.google.android.apps.photos&reviewId=${review.id}`,
    source_date: review.date ? new Date(review.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    original_text: review.text,
    relevance: 'high',
    relevance_reasoning: reasoningParts.join(' | '),
    scenario_type: scenarioMap[primaryFinding] || 'general',
    memory_clues: classification.matchedFindings.includes('memory_mismatch')
      ? classification.matchedKeywords.memory_mismatch || []
      : [],
    forgotten_info: [],
    search_queries: classification.matchedFindings.includes('search_failure')
      ? classification.matchedKeywords.search_failure || []
      : [],
    search_methods: classification.matchedFindings.includes('manual_scrolling')
      ? ['manual_timeline_scroll']
      : ['app_search'],
    failure_type: classification.matchedFindings.includes('search_failure')
      ? 'search_relevance_failure'
      : classification.matchedFindings.includes('manual_scrolling')
        ? 'navigation_difficulty'
        : 'general_friction',
    failure_detail: `Play Store ${review.score}-star review matching: ${classification.matchedFindings.join(', ')}`,
    workaround: null,
    workaround_effort: null,
    user_segment: 'general_user',
    severity: severity,
    confidence: Math.min(0.85, 0.5 + (classification.matchedFindings.length * 0.1)),
    evidence_type: 'direct_evidence',
    play_store_metadata: {
      reviewer: review.userName,
      score: review.score,
      thumbsUp: review.thumbsUp,
      version: review.version,
      findings_matched: classification.matchedFindings,
      keywords_matched: classification.matchedKeywords
    }
  };
}

/**
 * Fetch and filter Play Store reviews
 */
async function scrapePlayStoreReviews(options = {}) {
  const {
    countries = ['us', 'gb', 'ca', 'in', 'au'],
    minFindings = 1,
    lang = 'en'
  } = options;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Google Play Store Scraper — Google Photos Reviews          ║');
  console.log('║  Filtering for data.txt-supporting evidence                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log(`[Scraper] Fetching reviews across countries: ${countries.join(', ').toUpperCase()}...`);

  let allReviews = [];

  for (const country of countries) {
    try {
      // Relevance reviews (most helpful)
      const relReviews = await gplay.reviews({
        appId: 'com.google.android.apps.photos',
        sort: gplay.sort.RELEVANCE,
        num: 150,
        lang,
        country
      });
      allReviews.push(...(relReviews.data || relReviews));
    } catch (err) {
      console.error(`[Scraper] Error fetching relevance reviews for ${country}:`, err.message);
    }

    try {
      // Newest reviews
      const newReviews = await gplay.reviews({
        appId: 'com.google.android.apps.photos',
        sort: gplay.sort.NEWEST,
        num: 150,
        lang,
        country
      });
      allReviews.push(...(newReviews.data || newReviews));
    } catch (err) {
      console.error(`[Scraper] Error fetching newest reviews for ${country}:`, err.message);
    }

    try {
      // 1-star reviews (critical pain points)
      const oneStarReviews = await gplay.reviews({
        appId: 'com.google.android.apps.photos',
        sort: gplay.sort.RELEVANCE,
        num: 100,
        score: 1,
        lang,
        country
      });
      allReviews.push(...(oneStarReviews.data || oneStarReviews));
    } catch (err) {
      console.error(`[Scraper] Error fetching 1-star reviews for ${country}:`, err.message);
    }

    try {
      // 2-star reviews
      const twoStarReviews = await gplay.reviews({
        appId: 'com.google.android.apps.photos',
        sort: gplay.sort.RELEVANCE,
        num: 100,
        score: 2,
        lang,
        country
      });
      allReviews.push(...(twoStarReviews.data || twoStarReviews));
    } catch (err) {
      console.error(`[Scraper] Error fetching 2-star reviews for ${country}:`, err.message);
    }

    try {
      // 3-star reviews
      const threeStarReviews = await gplay.reviews({
        appId: 'com.google.android.apps.photos',
        sort: gplay.sort.RELEVANCE,
        num: 80,
        score: 3,
        lang,
        country
      });
      allReviews.push(...(threeStarReviews.data || threeStarReviews));
    } catch (err) {
      console.error(`[Scraper] Error fetching 3-star reviews for ${country}:`, err.message);
    }

    console.log(`[Scraper] Total raw reviews fetched so far: ${allReviews.length}`);
  }

  // Deduplicate by review ID
  const uniqueReviews = new Map();
  for (const review of allReviews) {
    if (review && review.id && review.text) {
      uniqueReviews.set(review.id, review);
    }
  }
  console.log(`[Scraper] ${uniqueReviews.size} unique reviews after dedup`);

  // Classify and filter reviews
  const supportingEvidence = [];
  const findingCounts = {};
  
  for (const review of uniqueReviews.values()) {
    if (!review.text || review.text.trim().length < 30) continue;

    const classification = classifyReview(review.text);
    
    if (classification.matchedFindings.length >= minFindings) {
      const evidenceNode = reviewToEvidenceNode(review, classification);
      supportingEvidence.push(evidenceNode);

      // Track finding counts
      for (const finding of classification.matchedFindings) {
        findingCounts[finding] = (findingCounts[finding] || 0) + 1;
      }
    }
  }

  // Sort by confidence (higher = more findings matched)
  supportingEvidence.sort((a, b) => b.confidence - a.confidence);

  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('                     SCRAPING RESULTS                        ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total unique reviews scraped: ${uniqueReviews.size}`);
  console.log(`Reviews supporting data.txt findings: ${supportingEvidence.length}`);
  console.log(`\nFinding distribution:`);
  
  const findingLabels = {
    search_failure: '🔍 Search Failure (Finding 1&2)',
    manual_scrolling: '📜 Manual Scrolling (Finding 2)',
    time_waste: '⏰ Time Waste (Finding 3)',
    utility_media: '📄 Utility Media (Finding 3)',
    memory_mismatch: '🧠 Memory Mismatch (Finding 1)',
    low_confidence: '😞 Low Confidence (Finding 3)'
  };

  for (const [finding, label] of Object.entries(findingLabels)) {
    const count = findingCounts[finding] || 0;
    const bar = '█'.repeat(Math.min(count, 40));
    console.log(`  ${label}: ${count} ${bar}`);
  }

  // Print top 5 highest-signal reviews
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('              TOP 5 HIGHEST-SIGNAL REVIEWS                   ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (const node of supportingEvidence.slice(0, 5)) {
    const meta = node.play_store_metadata;
    console.log(`\n  ⭐ ${meta.score}/5 by ${meta.reviewer} (${meta.thumbsUp || 0} helpful)`);
    console.log(`  Date: ${node.source_date}`);
    console.log(`  Findings: ${meta.findings_matched.join(', ')}`);
    console.log(`  Text: "${node.original_text.substring(0, 200)}${node.original_text.length > 200 ? '...' : ''}"`);
  }

  return {
    total_scraped: uniqueReviews.size,
    supporting_evidence: supportingEvidence,
    finding_counts: findingCounts
  };
}

/**
 * Save scraped evidence to JSON for ingestion
 */
async function scrapeAndSave() {
  const result = await scrapePlayStoreReviews();
  
  // Strip play_store_metadata for DB ingestion (keep a full version too)
  const forIngestion = result.supporting_evidence.map(node => {
    const { play_store_metadata, ...dbNode } = node;
    return dbNode;
  });

  // Save filtered evidence for DB ingestion
  const outputDir = path.join(__dirname, '..', 'data', 'raw');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ingestionPath = path.join(outputDir, 'play-store-evidence.json');
  fs.writeFileSync(ingestionPath, JSON.stringify(forIngestion, null, 2));
  console.log(`\n✅ Saved ${forIngestion.length} evidence nodes to ${ingestionPath}`);

  // Save full version with metadata for reference
  const fullPath = path.join(outputDir, 'play-store-reviews-full.json');
  fs.writeFileSync(fullPath, JSON.stringify(result.supporting_evidence, null, 2));
  console.log(`✅ Saved full review data with metadata to ${fullPath}`);

  return result;
}

// Run if called directly
if (require.main === module) {
  scrapeAndSave()
    .then(result => {
      console.log(`\n🎯 Done! ${result.supporting_evidence.length} Play Store reviews support data.txt findings.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Scraper failed:', err);
      process.exit(1);
    });
}

module.exports = { scrapePlayStoreReviews, scrapeAndSave, classifyReview, reviewToEvidenceNode, FINDING_KEYWORDS };
