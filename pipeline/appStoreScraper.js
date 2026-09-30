/**
 * Apple App Store Review Scraper — Google Photos iOS
 * Scrapes iOS customer reviews that support findings in data.txt:
 * 
 * 1. Search failure / can't describe memories in searchable words
 * 2. Only 12.9% find target photo on first attempt → manual timeline scrolling
 * 3. 45.2% resort to manual timeline scrolling
 * 4. 61.3% spend 5+ minutes searching for a single photo
 * 5. Utility content (documents/receipts, screenshots) hardest to retrieve
 * 6. 64.5% have low confidence (3/5 or lower) in search
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Keywords that map directly to data.txt empirical findings
const FINDING_KEYWORDS = {
  search_failure: [
    'search', 'find', 'can\'t find', 'cannot find', 'unable to find',
    'search not working', 'search broken', 'search doesn\'t work',
    'search is useless', 'search fails', 'no results', 'wrong results',
    'irrelevant results', 'doesn\'t understand', 'can\'t describe',
    'search function', 'search feature', 'ask photos', 'face search', 'label search',
    'can\'t search', 'difficulty finding'
  ],
  manual_scrolling: [
    'scroll', 'scrolling', 'manual scroll', 'browse', 'browsing',
    'endless scroll', 'scroll through', 'scroll back', 'swipe through',
    'go through photos', 'look through photos', 'dig through', 'hunt for photo',
    'timeline', 'one by one', 'scroll for hours', 'scroll forever', 'scroll down'
  ],
  time_waste: [
    'minutes searching', 'hours searching', 'took forever to find', 'waste time finding',
    'wasted hours', 'time consuming to find', 'frustrated trying to find', 'gave up looking',
    'give up finding', 'impossible to find', 'lost photo', 'can\'t locate',
    'waste time', 'wasted time', 'took forever', 'spent hours'
  ],
  utility_media: [
    'receipt', 'document', 'screenshot', 'scan', 'scanned',
    'bill', 'invoice', 'ticket', 'boarding pass', 'prescription',
    'barcode', 'qr code', 'text in photo', 'ocr', 'id card',
    'paperwork', 'tax'
  ],
  memory_mismatch: [
    'remember taking', 'recall', 'memory', 'memories', 'vague',
    'approximate', 'who was in', 'where was', 'when was',
    'trip photos', 'vacation photo', 'wedding photo', 'natural language',
    'remember when', 'old photo'
  ],
  low_confidence: [
    'unreliable search', 'hit or miss', 'inconsistent search', 'sometimes finds',
    'unpredictable', 'random results', 'luck', 'unreliable', 'don\'t trust search'
  ]
};

const EXCLUSION_TERMS = [
  'battery drain', 'heating up', 'charging', 'subscription price', 'monthly fee',
  'google one price', 'expensive', 'storage full', 'buy storage', 'backup stuck',
  'stuck on backing up', 'backup failed', 'syncing forever', 'crashed my phone'
];

/**
 * Filter out generic non-retrieval complaints
 */
function isRetrievalRelated(text) {
  const lower = text.toLowerCase();

  const hasRetrieval = 
    lower.includes('search') ||
    lower.includes('find') ||
    lower.includes('locate') ||
    lower.includes('retriev') ||
    lower.includes('scroll') ||
    lower.includes('timeline') ||
    lower.includes('remember') ||
    lower.includes('screenshot') ||
    lower.includes('receipt') ||
    lower.includes('document') ||
    lower.includes('album');

  if (!hasRetrieval) return false;

  const isGenericComplaint = EXCLUSION_TERMS.some(t => lower.includes(t)) &&
    !lower.includes('search') && !lower.includes('find') && !lower.includes('locate');
    
  if (isGenericComplaint) return false;

  return true;
}

/**
 * Classify a review based on keyword matches
 */
function classifyReview(text) {
  if (!isRetrievalRelated(text)) {
    return { matchedFindings: [], matchedKeywords: {} };
  }

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

  // Fallback pattern matching
  if (matchedFindings.length === 0) {
    if (lowerText.includes('find') && (lowerText.includes('can\'t') || lowerText.includes('cannot') || lowerText.includes('hard') || lowerText.includes('difficult') || lowerText.includes('trouble') || lowerText.includes('never'))) {
      matchedFindings.push('search_failure');
      matchedKeywords['search_failure'] = ['difficulty finding'];
    }
    if (lowerText.includes('scroll') && (lowerText.includes('timeline') || lowerText.includes('hours') || lowerText.includes('forever') || lowerText.includes('endless') || lowerText.includes('back'))) {
      matchedFindings.push('manual_scrolling');
      matchedKeywords['manual_scrolling'] = ['timeline scroll'];
    }
  }

  return { matchedFindings, matchedKeywords };
}

/**
 * Convert Apple App Store review into standardized evidence node
 */
function reviewToEvidenceNode(review, classification) {
  const scenarioMap = {
    search_failure: 'search_failure',
    manual_scrolling: 'manual_browsing',
    time_waste: 'time_waste',
    utility_media: 'utility_retrieval',
    memory_mismatch: 'memory_mismatch',
    low_confidence: 'low_confidence'
  };

  const primaryFinding = classification.matchedFindings[0] || 'search_failure';

  let severity = 'medium';
  if (review.score <= 1) severity = 'critical';
  else if (review.score <= 2) severity = 'high';
  else if (review.score <= 3) severity = 'medium';

  const findingDescriptions = {
    search_failure: 'Supports Finding 1: Search fails to understand user intent or returns zero/irrelevant results',
    manual_scrolling: 'Supports Finding 2: 45.2% of users resort to manual timeline scrolling after search fails',
    time_waste: 'Supports Finding 3: 61.3% of users spend 5+ minutes searching for a single photo',
    utility_media: 'Supports Finding 3: Utility content (documents/receipts 22.6%, screenshots 12.9%) is hardest to retrieve',
    memory_mismatch: 'Supports Finding 1: Natural memory triggers mismatch rigid metadata indexing',
    low_confidence: 'Supports Finding 3: 64.5% have low confidence (3/5 or lower) in search'
  };

  const reasoningParts = classification.matchedFindings.map(f => findingDescriptions[f]);

  return {
    source_platform: 'app_store',
    source_url: `https://apps.apple.com/app/google-photos/id962194608?see-all=reviews&reviewId=${review.id || ''}`,
    source_date: review.date || new Date().toISOString().split('T')[0],
    original_text: review.text,
    relevance: 'high',
    relevance_reasoning: reasoningParts.join(' | '),
    scenario_type: scenarioMap[primaryFinding] || 'search_failure',
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
    failure_detail: `Apple App Store ${review.score}-star review matching: ${classification.matchedFindings.join(', ')}`,
    workaround: classification.matchedFindings.includes('manual_scrolling') ? 'Manually scrolled through timeline' : null,
    workaround_effort: null,
    user_segment: 'ios_user',
    severity: severity,
    confidence: Math.min(0.90, 0.55 + (classification.matchedFindings.length * 0.1)),
    evidence_type: 'direct_evidence',
    app_store_metadata: {
      reviewer: review.userName,
      score: review.score,
      country: review.country,
      findings_matched: classification.matchedFindings,
      keywords_matched: classification.matchedKeywords
    }
  };
}

/**
 * Fetch one page of customer reviews from iTunes RSS API
 */
function fetchAppStorePage(country, page) {
  return new Promise((resolve) => {
    const url = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=962194608/sortby=mostrecent/json`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const entries = json.feed && json.feed.entry ? json.feed.entry : [];
          // First entry is app info, remaining are reviews
          const reviews = entries.slice(1).map(e => ({
            id: e.id && e.id.label,
            userName: e.author && e.author.name && e.author.name.label,
            title: e.title && e.title.label ? e.title.label : '',
            text: ((e.title && e.title.label ? e.title.label + '. ' : '') + (e.content && e.content.label ? e.content.label : '')).trim(),
            score: parseInt(e['im:rating'] && e['im:rating'].label ? e['im:rating'].label : '3'),
            date: e.updated && e.updated.label ? e.updated.label.split('T')[0] : new Date().toISOString().split('T')[0],
            country
          }));
          resolve(reviews);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

/**
 * Fetch and filter Apple App Store reviews
 */
async function scrapeAppStoreReviews(options = {}) {
  const {
    countries = ['us', 'gb', 'ca', 'in', 'au', 'nz', 'ie', 'sg', 'ph', 'za'],
    pagesPerCountry = 10
  } = options;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Apple App Store Scraper — Google Photos iOS Reviews         ║');
  console.log('║  Filtering for data.txt-supporting evidence                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let allReviews = [];

  for (const country of countries) {
    console.log(`[Apple Scraper] Fetching reviews for storefront: ${country.toUpperCase()}...`);
    for (let p = 1; p <= pagesPerCountry; p++) {
      const pageReviews = await fetchAppStorePage(country, p);
      allReviews.push(...pageReviews);
    }
  }

  // Deduplicate by review ID
  const seen = new Set();
  const uniqueReviews = [];
  for (const r of allReviews) {
    if (r.id && !seen.has(r.id) && r.text) {
      seen.add(r.id);
      uniqueReviews.push(r);
    }
  }

  console.log(`[Apple Scraper] Total unique reviews fetched: ${uniqueReviews.length}`);

  // Filter for reviews that directly support data.txt
  const supportingEvidence = [];
  const findingCounts = {
    search_failure: 0,
    manual_scrolling: 0,
    time_waste: 0,
    utility_media: 0,
    memory_mismatch: 0,
    low_confidence: 0
  };

  for (const r of uniqueReviews) {
    const classification = classifyReview(r.text);

    // Keep if matches findings and is not a 5-star generic glowing review
    if (classification.matchedFindings.length > 0 && r.score <= 4) {
      const evidenceNode = reviewToEvidenceNode(r, classification);
      supportingEvidence.push(evidenceNode);

      for (const finding of classification.matchedFindings) {
        findingCounts[finding] = (findingCounts[finding] || 0) + 1;
      }
    }
  }

  console.log(`\n[Apple Scraper] Filtered to ${supportingEvidence.length} reviews supporting data.txt findings:`);
  for (const [finding, count] of Object.entries(findingCounts)) {
    console.log(`  - ${finding}: ${count}`);
  }

  return {
    total_scraped: uniqueReviews.length,
    supporting_evidence: supportingEvidence,
    finding_counts: findingCounts
  };
}

/**
 * Save scraped Apple App Store evidence to JSON files
 */
async function scrapeAndSave() {
  const result = await scrapeAppStoreReviews();

  const forIngestion = result.supporting_evidence.map(node => {
    const { app_store_metadata, ...dbNode } = node;
    return dbNode;
  });

  const outputDir = path.join(__dirname, '..', 'data', 'raw');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ingestionPath = path.join(outputDir, 'app-store-evidence.json');
  fs.writeFileSync(ingestionPath, JSON.stringify(forIngestion, null, 2));
  console.log(`\n✅ Saved ${forIngestion.length} Apple App Store evidence nodes to ${ingestionPath}`);

  const fullPath = path.join(outputDir, 'app-store-reviews-full.json');
  fs.writeFileSync(fullPath, JSON.stringify(result.supporting_evidence, null, 2));
  console.log(`✅ Saved full review data with metadata to ${fullPath}`);

  return result;
}

// Run if called directly
if (require.main === module) {
  scrapeAndSave()
    .then(result => {
      console.log(`\n🎯 Apple App Store scrape complete! ${result.supporting_evidence.length} reviews support findings.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Apple App Store scraper failed:', err);
      process.exit(1);
    });
}

module.exports = {
  scrapeAppStoreReviews,
  scrapeAndSave,
  classifyReview,
  FINDING_KEYWORDS
};
