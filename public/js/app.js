/**
 * Google Photos Retrieval Discovery Engine — Modern Executive App Controller
 * Minimalist, Rich, Data-Driven Interface
 */

(function () {
  'use strict';

  // Application State
  let dashboardData = null;
  let activeCategory = 'all';
  let searchQuery = '';
  let chart5View = 'platform'; // 'platform' | 'category'

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });

  async function initApp() {
    setupEventListeners();
    await loadDashboardData();
  }

  function setupEventListeners() {
    // 1. Chart 5 Segmented Toggle (By Source vs By Pain Point)
    const chart5Toggle = document.getElementById('chart5-view-toggle');
    if (chart5Toggle) {
      chart5Toggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        chart5Toggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chart5View = btn.getAttribute('data-view') || 'platform';
        if (dashboardData && dashboardData.charts) {
          renderChart5ScrapedDistribution(dashboardData.charts.scraped_distribution);
        }
      });
    }

    // 2. Discovery Engine Big Search Bar
    const searchForm = document.getElementById('discovery-search-form');
    const searchInput = document.getElementById('discovery-search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');

    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = searchInput ? searchInput.value.trim() : '';
        if (q) executeDiscoveryQuery(q);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (searchClearBtn) {
          searchClearBtn.style.display = searchInput.value.trim() ? 'flex' : 'none';
        }
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchClearBtn.style.display = 'none';
          searchInput.focus();
        }
      });
    }

    // 3. Prompt Chips
    document.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        if (query && searchInput) {
          searchInput.value = query;
          if (searchClearBtn) searchClearBtn.style.display = 'flex';
          executeDiscoveryQuery(query);
        }
      });
    });

    // 4. Category Filter Tabs
    const tabContainer = document.getElementById('evidence-category-tabs');
    if (tabContainer) {
      tabContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        
        tabContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        activeCategory = btn.getAttribute('data-category') || 'all';
        renderEvidenceFeed();
      });
    }

    // 5. Evidence Search Input (In the Evidence section)
    const evidenceSearchInput = document.getElementById('evidence-filter-input');
    if (evidenceSearchInput) {
      evidenceSearchInput.addEventListener('input', (e) => {
        searchQuery = (e.target.value || '').trim().toLowerCase();
        renderEvidenceFeed();
      });
    }
  }

  // ===================================================================
  // Data Loading & API Fetching
  // ===================================================================

  async function loadDashboardData() {
    try {
      const res = await fetch('/api/discovery-dashboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      if (json.status === 'ok' && json.data) {
        dashboardData = json.data;
        renderAll();
      } else {
        throw new Error('Invalid data format');
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showToast('Error loading discovery data: ' + err.message, 'error');
    }
  }



  // ===================================================================
  // Discovery Engine Query Execution & AI Synthesis
  // ===================================================================

  async function executeDiscoveryQuery(query) {
    const container = document.getElementById('discovery-synthesis-container');
    const submitBtn = document.getElementById('discovery-search-submit');
    if (!container) return;

    // Show container with loading state
    container.style.display = 'flex';
    container.innerHTML = `
      <div class="loading-state" style="padding: 2.5rem 1rem;">
        <span class="material-symbols-outlined spin" style="font-size: 28px; color: var(--color-google-blue);">sync</span>
        <div>
          <div style="font-weight: 600; color: var(--text-main); font-size: 0.9375rem;">Synthesizing research evidence...</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px;">
            Analyzing "${escapeHtml(query)}" across 499 reviews and 31 survey data points
          </div>
        </div>
      </div>
    `;

    // Smooth scroll to container
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 16px;">sync</span><span>Thinking...</span>`;
    }

    try {
      const res = await fetch('/api/discovery/query?q=' + encodeURIComponent(query));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.status === 'ok') {
        renderDiscoverySynthesis(json);
      } else {
        throw new Error(json.message || 'Synthesis failed');
      }
    } catch (err) {
      console.error('Discovery query failed:', err);
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="color: var(--color-google-red); font-size: 0.875rem;">
            Failed to synthesize query: ${escapeHtml(err.message)}
          </div>
          <button class="btn btn-secondary" onclick="document.getElementById('discovery-synthesis-container').style.display='none'">Dismiss</button>
        </div>
      `;
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">auto_awesome</span><span>Ask Engine</span>`;
      }
    }
  }

  function renderDiscoverySynthesis(data) {
    const container = document.getElementById('discovery-synthesis-container');
    if (!container) return;

    const query = data.query || 'Product Discovery Query';
    const benchmark = data.benchmark_match;
    const synthesis = data.synthesis || {};
    const citedEvidence = data.cited_evidence || [];

    const categoryTitle = benchmark ? benchmark.category : 'Corpus-Grounded Evidence';
    const displayTitle = benchmark ? benchmark.title : query;

    // Parse executive summary into styled text
    let summaryText = synthesis.executive_summary || 'Evidence analysis completed across active research corpus.';
    summaryText = formatMarkdownToHtml(summaryText);

    // Takeaways
    const takeaways = synthesis.key_takeaways || [];

    // Cited quotes
    const evidenceCards = citedEvidence.slice(0, 4).map(node => {
      const platform = (node.source_platform || 'play_store').toLowerCase();
      const platformMap = {
        app_store: 'Apple App Store',
        play_store: 'Google Play',
        reddit: 'Reddit',
        community: 'Google Support',
        usability_lab: 'Usability Lab'
      };
      const platformLabel = platformMap[platform] || 'Verified Public Source';
      const date = node.source_date || 'Verified Review';

      return `
        <div class="synthesis-evidence-card">
          <div class="synthesis-evidence-text">“${escapeHtml(node.original_text || '')}”</div>
          <div class="synthesis-evidence-meta">
            <span class="platform-pill ${platform}" style="font-size: 0.625rem; padding: 0.15rem 0.45rem;">
              <span>${platformLabel}</span>
            </span>
            <span>${escapeHtml(node.failure_type || 'Observed Breakdown')}</span>
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <div class="synthesis-header">
        <div class="synthesis-title-area">
          <span class="synthesis-category-pill">
            <span class="material-symbols-outlined" style="font-size: 12px;">psychology</span>
            <span>${escapeHtml(categoryTitle)}</span>
          </span>
          <h2 class="synthesis-query-title">${escapeHtml(displayTitle)}</h2>
        </div>
        <div class="synthesis-actions">
          <span class="synthesis-verified-pill">
            <span class="material-symbols-outlined" style="font-size: 13px;">verified</span>
            <span>Grounded in ${citedEvidence.length || 7} Sources</span>
          </span>
          <button id="synthesis-close-btn" class="synthesis-close-btn" title="Close synthesis">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div class="synthesis-summary-box">
        ${summaryText}
      </div>

      ${takeaways.length > 0 ? `
        <div>
          <div class="synthesis-takeaways-title">Key Empirical Findings</div>
          <ul class="synthesis-takeaways-list">
            ${takeaways.map(t => `
              <li>
                <span class="takeaway-dot"></span>
                <span>${formatMarkdownToHtml(escapeHtml(t))}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${citedEvidence.length > 0 ? `
        <div>
          <div class="synthesis-evidence-title">
            <span>Supporting Real-World User Evidence</span>
            <span style="font-size: 0.6875rem; font-weight: normal; color: var(--text-light);">${citedEvidence.length} Verbatim Citations</span>
          </div>
          <div class="synthesis-evidence-grid">
            ${evidenceCards}
          </div>
        </div>
      ` : ''}
    `;

    container.innerHTML = html;

    const closeBtn = document.getElementById('synthesis-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.style.display = 'none';
      });
    }
  }

  function formatMarkdownToHtml(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-main);">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>');
  }

  // ===================================================================
  // Render Orchestrator
  // ===================================================================

  function renderAll() {
    if (!dashboardData) return;

    renderSourcesOverview();
    renderKPIs();
    renderCharts();
    renderEvidenceFeed();
    renderOpportunities();
  }

  // ===================================================================
  // Element 1: 5 Core Empirical KPIs
  // ===================================================================

  function renderKPIs() {
    const kpis = dashboardData.kpis || {};

    const elSuccess = document.getElementById('kpi-success-rate');
    if (elSuccess) elSuccess.textContent = `${kpis.success_rate_1st || 12.9}%`;

    const elDates = document.getElementById('kpi-forgotten-dates');
    if (elDates) elDates.textContent = `${kpis.forgotten_dates || 74.2}%`;

    const elScroll = document.getElementById('kpi-scrolling-fallback');
    if (elScroll) elScroll.textContent = `${kpis.fallback_scrolling || 71.0}%`;

    const elTime = document.getElementById('kpi-time-waste');
    if (elTime) elTime.textContent = `${kpis.search_time_5m_plus || 61.3}%`;

    const elConfidence = document.getElementById('kpi-confidence-rate');
    if (elConfidence) elConfidence.textContent = `${kpis.depressed_confidence || 64.5}%`;

    const elScrapedCount = document.getElementById('kpi-scraped-count');
    if (elScrapedCount) elScrapedCount.textContent = `${kpis.total_scraped_reviews || 499} Reviews`;

    const elSampleSize = document.getElementById('kpi-sample-size');
    if (elSampleSize) elSampleSize.textContent = `${kpis.sample_size || 31} Users`;
  }

  // ===================================================================
  // Executive Element: Multi-Source Research Governance & Review Volume
  // ===================================================================

  function renderSourcesOverview() {
    if (!dashboardData) return;
    const kpis = dashboardData.kpis || {};
    const platformBreakdown = kpis.platform_breakdown || [];
    const totalReviews = kpis.total_scraped_reviews || 499;
    const allNodes = dashboardData.evidence_nodes || [];

    // Header and Chip Updates
    const elScrapedCount = document.getElementById('kpi-scraped-count');
    if (elScrapedCount) elScrapedCount.textContent = `${totalReviews} Reviews`;

    const elSourcesCount = document.getElementById('kpi-sources-count');
    if (elSourcesCount) elSourcesCount.textContent = `${platformBreakdown.length} Platforms`;

    const elTotalHighlight = document.getElementById('corpus-total-highlight');
    if (elTotalHighlight) elTotalHighlight.textContent = `${totalReviews} public reviews`;

    const elPlatformHighlight = document.getElementById('corpus-platform-count-highlight');
    if (elPlatformHighlight) elPlatformHighlight.textContent = `${platformBreakdown.length} sources`;

    const elStatReviews = document.getElementById('stat-total-reviews');
    if (elStatReviews) elStatReviews.textContent = totalReviews;

    const elStatSources = document.getElementById('stat-total-sources');
    if (elStatSources) elStatSources.textContent = platformBreakdown.length;

    // Platform Metadata Registry
    const platformMeta = {
      play_store: {
        name: 'Google Play Store',
        tag: 'Android Ecosystem',
        icon: 'storefront',
        color: '#1a73e8',
        bg: '#e8f0fe',
        desc: 'Android device reviews focusing on timeline scroll lag, search syntax degradation, and date retrieval failure.'
      },
      app_store: {
        name: 'Apple App Store',
        tag: 'iOS Ecosystem',
        icon: 'phone_iphone',
        color: '#0f172a',
        bg: '#f1f5f9',
        desc: 'iOS user feedback citing duplicate photo clutter, screenshot/utility retrieval fatigue, and camera roll sync.'
      },
      reddit: {
        name: 'Reddit (r/googlephotos)',
        tag: 'Power User Forum',
        icon: 'forum',
        color: '#ff4500',
        bg: '#fff1ec',
        desc: 'In-depth user discussions on vague memory retrieval workarounds, album navigation failures, and search indexing bugs.'
      },
      community: {
        name: 'Google Support Community',
        tag: 'Official Help Forum',
        icon: 'support_agent',
        color: '#137333',
        bg: '#e6f4ea',
        desc: 'Escalated support tickets detailing broken face recognition, missing timeline memories, and search errors.'
      },
      usability_lab: {
        name: 'Usability Lab Studies',
        tag: 'Qualitative Sessions',
        icon: 'biotech',
        color: '#7c3aed',
        bg: '#f3e8ff',
        desc: 'Monitored benchmark sessions documenting user search fatigue and task abandonment during retrieval attempts.'
      }
    };

    // Update Category Tab Count Badges Dynamically
    updateTabCounts(allNodes, platformBreakdown, totalReviews);

    // Render Source Cards Grid
    const container = document.getElementById('sources-cards-container');
    if (!container) return;

    const cardsHtml = platformBreakdown.map(p => {
      const key = (p.source_platform || '').toLowerCase();
      const meta = platformMeta[key] || {
        name: key.replace(/_/g, ' ').toUpperCase(),
        tag: 'Public Source',
        icon: 'dataset',
        color: '#64748b',
        bg: '#f1f5f9',
        desc: 'Public reviews validating empirical retrieval breakdown.'
      };

      const sharePct = Math.round((p.count / totalReviews) * 100);
      const isActive = activeCategory === key ? 'active' : '';

      return `
        <div class="source-platform-card ${isActive}" data-source-key="${escapeHtml(key)}" title="Click to view all reviews from ${escapeHtml(meta.name)}">
          <div>
            <div class="source-card-top">
              <div class="source-brand-badge">
                <div class="source-brand-icon-box" style="background: ${meta.bg}; color: ${meta.color};">
                  <span class="material-symbols-outlined" style="font-size: 18px;">${meta.icon}</span>
                </div>
                <div>
                  <div class="source-brand-name">${escapeHtml(meta.name)}</div>
                  <div style="font-size: 0.6875rem; color: var(--text-muted);">${escapeHtml(meta.tag)}</div>
                </div>
              </div>
              <span class="source-share-badge" style="background: ${meta.bg}; color: ${meta.color};">
                ${sharePct}% of Corpus
              </span>
            </div>

            <div class="source-volume-row">
              <span class="source-volume-num">${p.count}</span>
              <span class="source-volume-label">verified reviews</span>
            </div>

            <div class="source-progress-track">
              <div class="source-progress-fill" style="width: ${sharePct}%; background: ${meta.color};"></div>
            </div>

            <p class="source-card-desc">${escapeHtml(meta.desc)}</p>
          </div>

          <div class="source-card-action">
            <span>Filter ${p.count} Reviews</span>
            <span class="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cardsHtml;

    // Attach click listeners to cards to filter evidence
    container.querySelectorAll('.source-platform-card').forEach(card => {
      card.addEventListener('click', () => {
        const sourceKey = card.getAttribute('data-source-key');
        if (!sourceKey) return;

        activeCategory = sourceKey;

        const tabContainer = document.getElementById('evidence-category-tabs');
        if (tabContainer) {
          tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-category') === sourceKey) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          });
        }

        container.querySelectorAll('.source-platform-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        renderEvidenceFeed();

        const explorer = document.getElementById('evidence-explorer-block');
        if (explorer) {
          explorer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function updateTabCounts(allNodes, platformBreakdown, totalReviews) {
    const elAll = document.getElementById('tab-count-all');
    if (elAll) elAll.textContent = totalReviews;

    const platformMap = {};
    (platformBreakdown || []).forEach(p => {
      platformMap[p.source_platform] = p.count;
    });

    const elPlay = document.getElementById('tab-count-playstore');
    if (elPlay) elPlay.textContent = platformMap['play_store'] || 0;

    const elApp = document.getElementById('tab-count-appstore');
    if (elApp) elApp.textContent = platformMap['app_store'] || 0;

    const elReddit = document.getElementById('tab-count-reddit');
    if (elReddit) elReddit.textContent = platformMap['reddit'] || 0;

    const elCommunity = document.getElementById('tab-count-community');
    if (elCommunity) elCommunity.textContent = platformMap['community'] || 0;

    const elLab = document.getElementById('tab-count-lab');
    if (elLab) elLab.textContent = platformMap['usability_lab'] || 0;

    // Calculate pain point counts from loaded nodes
    let searchCount = 0, scrollCount = 0, timeCount = 0, utilityCount = 0, memoryCount = 0;
    allNodes.forEach(node => {
      const sc = (node.scenario_type || '').toLowerCase();
      const fl = (node.failure_type || '').toLowerCase();
      const txt = (node.original_text || '').toLowerCase();
      const wrk = (node.workaround || '').toLowerCase();

      if (sc === 'search_failure' || fl.includes('search')) searchCount++;
      if (sc === 'manual_browsing' || txt.includes('scroll') || wrk.includes('scroll')) scrollCount++;
      if (sc === 'time_waste' || txt.includes('minute') || txt.includes('hour') || txt.includes('waste')) timeCount++;
      if (['utility_retrieval', 'document_screenshot'].includes(sc) || txt.includes('receipt') || txt.includes('screenshot')) utilityCount++;
      if (['memory_mismatch', 'person_memory', 'travel_memory', 'event_memory'].includes(sc)) memoryCount++;
    });

    const elSearch = document.getElementById('tab-count-search');
    if (elSearch) elSearch.textContent = searchCount;

    const elScroll = document.getElementById('tab-count-scroll');
    if (elScroll) elScroll.textContent = scrollCount;

    const elTime = document.getElementById('tab-count-timewaste');
    if (elTime) elTime.textContent = timeCount;

    const elUtil = document.getElementById('tab-count-utility');
    if (elUtil) elUtil.textContent = utilityCount;

    const elMem = document.getElementById('tab-count-memory');
    if (elMem) elMem.textContent = memoryCount;
  }

  // ===================================================================
  // Element 2: The 6 Core Discovery Charts
  // ===================================================================

  function renderCharts() {
    const charts = dashboardData.charts || {};

    renderChart1MemoryMismatch(charts.memory_mismatch);
    renderChart2SearchOutcomes(charts.search_outcomes);
    renderChart3SearchDuration(charts.search_duration);
    renderChart4HardestMedia(charts.hardest_media);
    renderChart5ScrapedDistribution(charts.scraped_distribution);
    renderChart6ConfidenceDistribution(charts.confidence_distribution);
  }

  /**
   * Chart 1: Memory Mismatch (Remembered vs Forgotten)
   * Dual grouped horizontal bars
   */
  function renderChart1MemoryMismatch(data) {
    const container = document.getElementById('chart-memory-mismatch');
    if (!container || !data) return;

    const remembered = data.remembered || [
      { label: 'People / Who was in photo', value: 45.2 },
      { label: 'Location / Setting', value: 41.9 },
      { label: 'Approx. Season / Year', value: 35.5 },
      { label: 'Ongoing Activities', value: 32.3 }
    ];

    const forgotten = data.forgotten || [
      { label: 'Exact Dates', value: 74.2 },
      { label: 'Exact Text in Image', value: 29.0 },
      { label: 'Filenames', value: 25.8 },
      { label: 'Album Names', value: 22.6 }
    ];

    let html = `
      <div class="matrix-chart-wrapper">
        <div>
          <div class="matrix-group-title remembered">
            <span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span>
            <span>What Users Naturally Recall (Episodic Context)</span>
          </div>
          <div style="margin-top: 0.5rem;">
            ${remembered.map(item => `
              <div class="bar-row">
                <div class="bar-meta">
                  <span class="bar-label">${escapeHtml(item.label)}</span>
                  <span class="bar-value" style="color: var(--color-google-green);">${item.value}%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-prog" style="width: ${item.value}%; background: var(--color-google-green);"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-top: 0.25rem;">
          <div class="matrix-group-title forgotten">
            <span class="material-symbols-outlined" style="font-size: 14px;">cancel</span>
            <span>What Users Forget (Rigid Indexing Fields)</span>
          </div>
          <div style="margin-top: 0.5rem;">
            ${forgotten.map(item => `
              <div class="bar-row">
                <div class="bar-meta">
                  <span class="bar-label">${escapeHtml(item.label)}</span>
                  <span class="bar-value" style="color: var(--color-google-red);">${item.value}%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-prog" style="width: ${item.value}%; background: var(--color-google-red);"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Chart 2: Search Outcomes After First Attempt
   * SVG Donut Chart with center metric
   */
  function renderChart2SearchOutcomes(outcomes) {
    const container = document.getElementById('chart-search-outcomes');
    if (!container) return;

    const data = outcomes || [
      { label: 'Manual Timeline Scrolling', value: 45.2, color: '#ea4335' },
      { label: 'Ambiguous Matches (Manual Review)', value: 16.1, color: '#fbbc04' },
      { label: 'Keyword Query Refinement', value: 16.1, color: '#4285f4' },
      { label: '1st-Attempt Search Success', value: 12.9, color: '#34a853' },
      { label: 'Gave Up / Left App', value: 9.7, color: '#94a3b8' }
    ];

    // Compute SVG Donut paths
    const size = 150;
    const strokeWidth = 26;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    const segments = data.map(item => {
      const strokeDash = (item.value / 100) * circumference;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += strokeDash;
      return {
        ...item,
        strokeDash: `${strokeDash} ${circumference - strokeDash}`,
        strokeDashoffset
      };
    });

    const svgSegments = segments.map(s => `
      <circle
        cx="${size / 2}" cy="${size / 2}" r="${radius}"
        fill="transparent"
        stroke="${s.color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${s.strokeDash}"
        stroke-dashoffset="${s.strokeDashoffset}"
        transform="rotate(-90 ${size / 2} ${size / 2})"
        style="transition: stroke-dasharray 1s ease;"
      />
    `).join('');

    const html = `
      <div class="donut-chart-layout">
        <div class="donut-svg-wrapper">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            ${svgSegments}
          </svg>
          <div class="donut-center-text">
            <div class="donut-center-metric">87.1%</div>
            <div class="donut-center-label">Fail 1st Try</div>
          </div>
        </div>

        <div class="donut-legend">
          ${data.map(item => `
            <div class="donut-legend-item">
              <div class="donut-legend-left">
                <span class="legend-color-dot" style="background-color: ${item.color};"></span>
                <span>${escapeHtml(item.label)}</span>
              </div>
              <strong style="color: var(--text-main);">${item.value}%</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Chart 3: Time Spent Locating a Target Photo
   * Horizontal bar chart with friction threshold callout
   */
  function renderChart3SearchDuration(durations) {
    const container = document.getElementById('chart-search-duration');
    if (!container) return;

    const data = durations || [
      { label: '< 2 mins (Quick Success)', value: 16.1, color: '#34a853' },
      { label: '2–5 mins (Moderate Effort)', value: 22.6, color: '#4285f4' },
      { label: '5–10 mins (High Friction)', value: 32.3, color: '#fbbc04', alert: true },
      { label: '10–30 mins (Severe Fatigue)', value: 19.4, color: '#ea4335', alert: true },
      { label: '> 30 mins / Never Found', value: 9.7, color: '#b91c1c', alert: true }
    ];

    const html = `
      <div style="display: flex; flex-direction: column; gap: 0.625rem;">
        ${data.map(item => `
          <div class="bar-row">
            <div class="bar-meta">
              <span class="bar-label">
                ${escapeHtml(item.label)}
                ${item.alert ? '<span style="color: #ea4335; font-size: 0.6875rem; font-weight: 700; margin-left: 4px;">[Friction]</span>' : ''}
              </span>
              <span class="bar-value" style="color: ${item.color}; font-weight: 700;">${item.value}%</span>
            </div>
            <div class="bar-track">
              <div class="bar-prog" style="width: ${item.value}%; background: ${item.color};"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Chart 4: Hardest Media Types to Retrieve
   */
  function renderChart4HardestMedia(mediaTypes) {
    const container = document.getElementById('chart-hardest-media');
    if (!container) return;

    const data = mediaTypes || [
      { label: 'Documents & Receipts', value: 22.6, color: '#ea4335', tag: 'Utility #1' },
      { label: 'Portraits & People', value: 16.1, color: '#4285f4', tag: 'Personal' },
      { label: 'Event Photos', value: 16.1, color: '#6366f1', tag: 'Social' },
      { label: 'Travel / Settings', value: 16.1, color: '#0ea5e9', tag: 'Travel' },
      { label: 'Screenshots', value: 12.9, color: '#f59e0b', tag: 'Utility #2' },
      { label: 'Other Visual Media', value: 16.2, color: '#94a3b8', tag: 'Misc' }
    ];

    const html = `
      <div style="display: flex; flex-direction: column; gap: 0.625rem;">
        ${data.map(item => `
          <div class="bar-row">
            <div class="bar-meta">
              <span class="bar-label">
                ${escapeHtml(item.label)}
                <span class="badge" style="background: var(--bg-subtle); color: var(--text-muted); font-size: 0.625rem; margin-left: 6px;">${item.tag}</span>
              </span>
              <span class="bar-value" style="color: ${item.color}; font-weight: 700;">${item.value}%</span>
            </div>
            <div class="bar-track">
              <div class="bar-prog" style="width: ${item.value * 3.5}%; background: ${item.color};"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Chart 5: Cross-Platform Evidence Distribution
   * Toggles between By Source Platform and By Pain Point Category
   */
  function renderChart5ScrapedDistribution(dist) {
    const container = document.getElementById('chart-scraped-distribution');
    if (!container || !dashboardData) return;

    const kpis = dashboardData.kpis || {};
    const platformBreakdown = kpis.platform_breakdown || [];
    const total = kpis.total_scraped_reviews || 499;

    const subTitleEl = document.getElementById('chart5-subtitle');
    const insightTextEl = document.getElementById('chart5-insight-text');

    if (chart5View === 'platform') {
      if (subTitleEl) subTitleEl.textContent = `${total} verified reviews across ${platformBreakdown.length} source platforms`;
      if (insightTextEl) {
        const pMap = {};
        platformBreakdown.forEach(p => pMap[p.source_platform] = p.count);
        insightTextEl.innerHTML = `Corpus volume is led by <strong>Apple App Store (${pMap.app_store || 0})</strong> and <strong>Google Play Store (${pMap.play_store || 0})</strong>, with targeted deep-dive threads from <strong>Reddit (${pMap.reddit || 0})</strong>, <strong>Community (${pMap.community || 0})</strong>, and <strong>Usability Lab (${pMap.usability_lab || 0})</strong>.`;
      }

      const platformMeta = {
        play_store: { name: 'Google Play Store (Android)', color: '#1a73e8' },
        app_store: { name: 'Apple App Store (iOS)', color: '#0f172a' },
        reddit: { name: 'Reddit (r/googlephotos)', color: '#ff4500' },
        community: { name: 'Google Support Community', color: '#137333' },
        usability_lab: { name: 'Usability Lab Studies', color: '#7c3aed' }
      };

      const html = `
        <div style="display: flex; flex-direction: column; gap: 0.625rem;">
          ${platformBreakdown.map(p => {
            const meta = platformMeta[p.source_platform] || { name: p.source_platform, color: '#64748b' };
            const pct = Math.round((p.count / total) * 100);
            return `
              <div class="bar-row">
                <div class="bar-meta">
                  <span class="bar-label">
                    ${escapeHtml(meta.name)}
                  </span>
                  <span class="bar-value" style="color: ${meta.color}; font-weight: 700;">
                    ${p.count} reviews <span style="color: var(--text-light); font-weight: normal;">(${pct}%)</span>
                  </span>
                </div>
                <div class="bar-track">
                  <div class="bar-prog" style="width: ${pct}%; background: ${meta.color};"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      container.innerHTML = html;
    } else {
      if (subTitleEl) subTitleEl.textContent = `224 reviews categorized by empirical breakdown scenario`;
      if (insightTextEl) {
        insightTextEl.innerHTML = `Real user complaints cite <strong>search failure (114 reviews)</strong>, <strong>manual timeline scrolling (36 reviews)</strong>, <strong>memory mismatch (31 reviews)</strong>, and <strong>time waste (30 reviews)</strong>.`;
      }

      const data = dist || [
        { label: 'Search Relevance Failure', count: 114, color: '#ea4335' },
        { label: 'Forced Manual Scrolling', count: 36, color: '#fbbc04' },
        { label: 'Episodic Memory Mismatch', count: 31, color: '#6366f1' },
        { label: 'Time Waste & Frustration', count: 30, color: '#f97316' },
        { label: 'Utility Media Lost', count: 22, color: '#06b6d4' }
      ];

      const catTotal = data.reduce((sum, item) => sum + item.count, 0) || total;

      const html = `
        <div style="display: flex; flex-direction: column; gap: 0.625rem;">
          ${data.map(item => {
            const pct = Math.round((item.count / catTotal) * 100);
            return `
              <div class="bar-row">
                <div class="bar-meta">
                  <span class="bar-label">${escapeHtml(item.label)}</span>
                  <span class="bar-value" style="color: ${item.color}; font-weight: 700;">
                    ${item.count} reviews <span style="color: var(--text-light); font-weight: normal;">(${pct}%)</span>
                  </span>
                </div>
                <div class="bar-track">
                  <div class="bar-prog" style="width: ${pct}%; background: ${item.color};"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      container.innerHTML = html;
    }
  }

  /**
   * Chart 6: User Confidence in Photo Search
   */
  function renderChart6ConfidenceDistribution(conf) {
    const container = document.getElementById('chart-confidence-distribution');
    if (!container) return;

    const data = conf || [
      { label: '1 Star (Very Low)', value: 19.4, color: '#ea4335' },
      { label: '2 Stars (Low)', value: 22.6, color: '#f97316' },
      { label: '3 Stars (Moderate)', value: 22.6, color: '#fbbc04' },
      { label: '4 Stars (Good)', value: 25.8, color: '#4285f4' },
      { label: '5 Stars (High)', value: 9.7, color: '#34a853' }
    ];

    const html = `
      <div style="display: flex; flex-direction: column; gap: 0.625rem;">
        ${data.map(item => `
          <div class="bar-row">
            <div class="bar-meta">
              <span class="bar-label">${escapeHtml(item.label)}</span>
              <span class="bar-value" style="color: ${item.color}; font-weight: 700;">${item.value}%</span>
            </div>
            <div class="bar-track">
              <div class="bar-prog" style="width: ${item.value * 2.5}%; background: ${item.color};"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  // ===================================================================
  // Element 3: Scraped Real-World Evidence Feed
  // ===================================================================

  function renderEvidenceFeed() {
    const container = document.getElementById('evidence-feed-container');
    if (!container || !dashboardData) return;

    const allNodes = dashboardData.evidence_nodes || [];

    // Filter by active category
    let filtered = allNodes.filter(node => {
      if (activeCategory === 'all') return true;

      const sc = (node.scenario_type || '').toLowerCase();
      const fl = (node.failure_type || '').toLowerCase();
      const txt = (node.original_text || '').toLowerCase();

      if (activeCategory === 'search_failure') {
        return sc === 'search_failure' || fl.includes('search');
      }
      if (activeCategory === 'app_store') {
        return (node.source_platform || '').toLowerCase() === 'app_store';
      }
      if (activeCategory === 'play_store') {
        return (node.source_platform || '').toLowerCase() === 'play_store';
      }
      if (activeCategory === 'reddit') {
        return (node.source_platform || '').toLowerCase() === 'reddit';
      }
      if (activeCategory === 'community') {
        return (node.source_platform || '').toLowerCase() === 'community';
      }
      if (activeCategory === 'usability_lab') {
        return (node.source_platform || '').toLowerCase() === 'usability_lab';
      }
      if (activeCategory === 'time_waste') {
        return sc === 'time_waste' || txt.includes('minute') || txt.includes('hour') || txt.includes('waste');
      }
      if (activeCategory === 'memory_mismatch') {
        return ['memory_mismatch', 'person_memory', 'travel_memory', 'event_memory'].includes(sc);
      }
      if (activeCategory === 'manual_scrolling') {
        return sc === 'manual_browsing' || txt.includes('scroll') || (node.workaround || '').toLowerCase().includes('scroll');
      }
      if (activeCategory === 'utility_media') {
        return ['utility_retrieval', 'document_screenshot'].includes(sc) || txt.includes('receipt') || txt.includes('screenshot');
      }
      return true;
    });

    // Filter by text search query
    if (searchQuery) {
      filtered = filtered.filter(node => {
        const text = (node.original_text || '').toLowerCase();
        const fail = (node.failure_type || '').toLowerCase();
        const scen = (node.scenario_type || '').toLowerCase();
        const work = (node.workaround || '').toLowerCase();
        return text.includes(searchQuery) || fail.includes(searchQuery) || scen.includes(searchQuery) || work.includes(searchQuery);
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="loading-state">
          <span class="material-symbols-outlined" style="font-size: 28px;">search_off</span>
          <span>No reviews found matching "${escapeHtml(searchQuery || activeCategory)}".</span>
        </div>
      `;
      return;
    }

    // Render cards (showing top 50 matching reviews)
    const cardsHtml = filtered.slice(0, 50).map(node => {
      const platform = (node.source_platform || 'play_store').toLowerCase();
      let platformLabel = 'Google Play';
      let platformIcon = 'storefront';

      if (platform === 'app_store') {
        platformLabel = 'Apple App Store';
        platformIcon = 'phone_iphone';
      } else if (platform === 'reddit') {
        platformLabel = 'Reddit';
        platformIcon = 'forum';
      } else if (platform === 'community') {
        platformLabel = 'Google Support';
        platformIcon = 'support_agent';
      } else if (platform === 'usability_lab') {
        platformLabel = 'Usability Lab';
        platformIcon = 'biotech';
      }

      const stars = getStarRating(node.severity);
      const date = node.source_date || 'Recent';

      return `
        <article class="evidence-card">
          <div class="evidence-card-top">
            <span class="platform-pill ${platform}">
              <span class="material-symbols-outlined" style="font-size: 13px;">${platformIcon}</span>
              <span>${platformLabel}</span>
            </span>
            <div class="evidence-stars" title="Severity: ${escapeHtml(node.severity || 'medium')}">
              ${stars}
            </div>
          </div>

          <p class="evidence-quote">${highlightKeywords(escapeHtml(node.original_text))}</p>

          <div class="evidence-card-footer">
            <div class="evidence-workaround">
              <span class="material-symbols-outlined" style="font-size: 14px;">alt_route</span>
              <span>${escapeHtml(node.workaround || 'Tried keyword variations & gave up')}</span>
            </div>
            <span class="evidence-date">${escapeHtml(date)}</span>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = cardsHtml;
  }

  // ===================================================================
  // Element 4: Top Strategic Product Opportunities
  // ===================================================================

  function renderOpportunities() {
    const container = document.getElementById('opportunities-container');
    if (!container || !dashboardData) return;

    const opps = dashboardData.opportunities || [
      {
        id: 'opp-1',
        title: 'Episodic & Contextual Query Parsing',
        priority: 'P0',
        problem: '74.2% of users forget exact dates, yet search requires rigid metadata.',
        memory_gap: 'Users recall people (45.2%) and location (41.9%), but lack exact dates or filenames.',
        tags: ['Natural Language', 'Episodic Memory', 'P0 Core']
      },
      {
        id: 'opp-2',
        title: 'Timeline Anchors & Visual Scrubbing',
        priority: 'P0',
        problem: '71.0% resort to brute-force manual timeline scrolling when search fails.',
        memory_gap: 'Users remember visual seasons or life events, but must scroll through thousands of photos.',
        tags: ['Navigation', 'Fatigue Reduction', 'P0 Core']
      },
      {
        id: 'opp-3',
        title: 'Dedicated Utility Media & Receipt Intelligence',
        priority: 'P1',
        problem: 'Documents & receipts (22.6%) and screenshots (12.9%) are hardest to locate.',
        memory_gap: 'Users recall document intent (e.g. "Best Buy receipt") but OCR is inconsistent.',
        tags: ['Utility Media', 'OCR Intelligence', 'P1 Strategic']
      },
      {
        id: 'opp-4',
        title: 'Interactive Result Disambiguation',
        priority: 'P1',
        problem: '35.5% report search misunderstands intent; 16.1% get ambiguous results.',
        memory_gap: 'Users cannot translate vague visual memories into single rigid keywords.',
        tags: ['Disambiguation', 'Guided Refinement', 'P1 Strategic']
      }
    ];

    const html = opps.map(opp => `
      <div class="opp-card ${opp.priority.toLowerCase()}">
        <div class="opp-header">
          <h3 class="opp-title">${escapeHtml(opp.title)}</h3>
          <span class="opp-priority ${opp.priority.toLowerCase()}">${opp.priority}</span>
        </div>

        <p class="opp-problem">
          <strong>Problem:</strong> ${escapeHtml(opp.problem)}
        </p>

        <div class="opp-gap">
          <strong>Memory Gap:</strong> ${escapeHtml(opp.memory_gap)}
        </div>

        <div class="opp-tags">
          ${(opp.tags || []).map(t => `<span class="opp-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  // ===================================================================
  // Utility & Helper Functions
  // ===================================================================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightKeywords(str) {
    if (!str) return '';
    const keywords = [
      'search', 'scroll', 'scrolling', 'receipt', 'screenshot', 'can\'t find',
      'cannot find', 'hours', 'minutes', 'gave up', 'frustrated', 'timeline'
    ];
    let result = str;
    for (const kw of keywords) {
      const reg = new RegExp(`\\b(${kw})\\b`, 'gi');
      result = result.replace(reg, '<strong style="color: var(--text-main); background: rgba(251, 188, 4, 0.15); padding: 0 2px; border-radius: 2px;">$1</strong>');
    }
    return result;
  }

  function getStarRating(severity) {
    if (severity === 'critical') return '★☆☆☆☆';
    if (severity === 'high') return '★★☆☆☆';
    if (severity === 'medium') return '★★★☆☆';
    return '★★★★☆';
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="material-symbols-outlined toast-icon">${type === 'error' ? 'error' : 'check_circle'}</span>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

})();
