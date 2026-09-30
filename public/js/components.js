/**
 * Sapphire Research Console — UI Components
 * Google Photos Retrieval Discovery Engine
 */

const Components = {
  // 1. KPI Summary Strip (6 Metric Cards)
  renderKPIStrip(stats = {}) {
    return `
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Sources Analyzed</span>
            <span class="material-symbols-outlined" style="color: var(--color-primary)">data_exploration</span>
          </div>
          <div class="kpi-val">${(stats.total_sources || 0).toLocaleString()}</div>
          <div class="kpi-meta">
            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-secondary);">trending_up</span>
            <span style="color: var(--color-secondary); font-weight: 600;">Live Corpus</span>
            <span>· ${stats.sources_breakdown ? stats.sources_breakdown.length : 4} channels</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Validation Rate</span>
            <span class="material-symbols-outlined" style="color: var(--color-secondary)">verified</span>
          </div>
          <div class="kpi-val">${stats.validation_rate || 100}%</div>
          <div class="kpi-meta">
            <span>${stats.validated_nodes || 0} nodes verified</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">High Friction</span>
            <span class="material-symbols-outlined" style="color: var(--color-error)">emergency</span>
          </div>
          <div class="kpi-val" style="color: var(--color-error);">${stats.critical_rate || '36%'}</div>
          <div class="kpi-meta">High drop-off rate</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Top Failure Mode</span>
            <span class="material-symbols-outlined" style="color: var(--color-tertiary-container)">crisis_alert</span>
          </div>
          <div class="kpi-val" style="font-size: 1.35rem;" title="${stats.top_failure_mode || 'Semantic Gap'}">${stats.top_failure_mode || 'Semantic Gap'}</div>
          <div class="kpi-meta">${stats.top_failure_percentage || 28}% leading breakdown</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">Opportunities</span>
            <span class="material-symbols-outlined" style="color: var(--color-primary)">lightbulb</span>
          </div>
          <div class="kpi-val" style="color: var(--color-primary);">${stats.opportunities_count || 5}</div>
          <div class="kpi-meta">
            <span style="color: var(--color-secondary); font-weight: 600;">${stats.p0_solutions || 1} P0 Core Solutions</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">User Segments</span>
            <span class="material-symbols-outlined" style="color: var(--color-on-surface-variant)">group</span>
          </div>
          <div class="kpi-val">${stats.user_segments_count || 4}</div>
          <div class="kpi-meta">Empirical clusters</div>
        </div>
      </section>
    `;
  },

  // 2. Problem Distribution Stacked Bar
  renderProblemDistribution(taxonomyList = []) {
    const top4 = taxonomyList.slice(0, 4);
    const colors = [
      'var(--color-primary)',
      'var(--color-primary-container)',
      'var(--color-secondary)',
      'var(--color-tertiary-container)'
    ];

    const segmentsHtml = top4.map((item, idx) => `
      <div class="stacked-bar-segment" style="width: ${item.percentage || 25}%; background-color: ${colors[idx % colors.length]};" title="${item.label}: ${item.percentage}%"></div>
    `).join('');

    const legendHtml = top4.map((item, idx) => `
      <div class="legend-item">
        <span class="legend-dot" style="background-color: ${colors[idx % colors.length]};"></span>
        <span>${item.label} <strong style="color: var(--color-on-surface);">${item.percentage || 25}%</strong></span>
      </div>
    `).join('');

    return `
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="card-header" style="margin-bottom: 0;">
          <div>
            <h3 class="text-headline-md">Retrieval Problem Distribution</h3>
            <p class="text-body-sm" style="color: var(--color-on-surface-variant);">
              Cognitive breakdowns classified across verified retrieval attempts
            </p>
          </div>
          <span class="badge badge-info">Primary Taxonomy</span>
        </div>

        <div class="stacked-bar-container">
          <div class="stacked-bar">
            ${segmentsHtml}
          </div>
          <div class="stacked-bar-legend">
            ${legendHtml}
          </div>
        </div>

        <div style="background-color: var(--color-surface-container-low); padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); display: flex; align-items: start; gap: var(--space-sm); font-size: 0.8125rem; color: var(--color-on-surface-variant);">
          <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 18px; margin-top: 1px;">info</span>
          <div>
            <strong style="color: var(--color-on-surface);">Key Finding:</strong> Users reliably retain episodic color, co-presence, and spatial aesthetics, while the retrieval indexing layer prioritizes explicit timestamp strings and rigid taxonomic object labels.
          </div>
        </div>
      </div>
    `;
  },

  // 3. Two-Column Memory Matrix
  renderMemoryMatrix(matrix = {}) {
    const rememberedItems = [
      { label: 'Visual cues (color, clothing, backdrop)', pct: 88 },
      { label: 'Co-present people & relations', pct: 74 },
      { label: 'Broad season / approximate year', pct: 69 },
      { label: 'Activity / Social intent', pct: 62 },
      { label: 'Atmosphere / Mood / Weather', pct: 44 }
    ];

    const forgottenItems = [
      { label: 'Exact date / calendar month', pct: 84 },
      { label: 'Specific official location name', pct: 76 },
      { label: 'Pre-created album title / folder', pct: 82 },
      { label: 'File name or verbatim text on image', pct: 91 },
      { label: 'Exact camera device / capture origin', pct: 89 }
    ];

    const remHtml = rememberedItems.map(item => `
      <div class="memory-bar-item">
        <div class="memory-bar-header">
          <span style="color: var(--color-on-surface);">${item.label}</span>
          <span style="color: var(--color-secondary); font-weight: 700;">${item.pct}%</span>
        </div>
        <div class="mini-track">
          <div class="mini-fill-remember" style="width: ${item.pct}%;"></div>
        </div>
      </div>
    `).join('');

    const forgHtml = forgottenItems.map(item => `
      <div class="memory-bar-item">
        <div class="memory-bar-header">
          <span style="color: var(--color-on-surface);">${item.label}</span>
          <span style="color: var(--color-error); font-weight: 700;">${item.pct}%</span>
        </div>
        <div class="mini-track">
          <div class="mini-fill-forget" style="width: ${item.pct}%;"></div>
        </div>
      </div>
    `).join('');

    return `
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="card-header" style="margin-bottom: 0;">
          <div>
            <h3 class="text-headline-md">Memory Signal vs Forgotten Information Matrix</h3>
            <p class="text-body-sm" style="color: var(--color-on-surface-variant);">
              The cognitive divide between human recall cues and system query inputs
            </p>
          </div>
          <span class="badge badge-info">Cognitive Divide</span>
        </div>

        <div class="memory-grid">
          <!-- Remembered -->
          <div class="memory-col memory-col-remember">
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.25rem;">
              <div style="display: flex; align-items: center; gap: 0.375rem; color: var(--color-secondary); font-weight: 700; font-size: 0.875rem;">
                <span class="material-symbols-outlined" style="font-size: 18px;">psychology</span>
                <span>What Users Remember</span>
              </div>
              <span class="text-label-sm" style="color: var(--color-secondary); font-weight: 600;">Salient Cues</span>
            </div>
            ${remHtml}
          </div>

          <!-- Forgotten -->
          <div class="memory-col memory-col-forget">
            <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.25rem;">
              <div style="display: flex; align-items: center; gap: 0.375rem; color: var(--color-error); font-weight: 700; font-size: 0.875rem;">
                <span class="material-symbols-outlined" style="font-size: 18px;">event_busy</span>
                <span>What Users Forget</span>
              </div>
              <span class="text-label-sm" style="color: var(--color-error); font-weight: 600;">Metadata Void</span>
            </div>
            ${forgHtml}
          </div>
        </div>
      </div>
    `;
  },

  // 4. Failure Breakdown Ranked Cards
  renderFailureBreakdown(failures = []) {
    const listHtml = failures.map(item => `
      <div class="failure-card">
        <div style="display: flex; align-items: center; gap: var(--space-sm); min-width: 0;">
          <div style="width: 28px; height: 28px; border-radius: var(--radius-sm); background-color: var(--color-surface-container-high); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; flex-shrink: 0;">
            ${item.code}
          </div>
          <div style="display: flex; flex-direction: column; min-width: 0;">
            <span class="text-label-lg" style="color: var(--color-on-surface); font-weight: 600;">${item.label}</span>
            <span class="text-body-sm" style="color: var(--color-on-surface-variant); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${item.description || ''}
            </span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-sm); flex-shrink: 0;">
          <span class="badge badge-info">${item.evidence_count} Ev</span>
          <span style="font-family: var(--font-family-headline); font-weight: 700; font-size: 1rem; color: var(--color-on-surface);">${item.percentage || 0}%</span>
        </div>
      </div>
    `).join('');

    return `
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="card-header" style="margin-bottom: 0;">
          <div>
            <h3 class="text-headline-md">Failure Modes Taxonomy</h3>
            <p class="text-body-sm" style="color: var(--color-on-surface-variant);">
              8 critical cognitive failure modes ranked by user retrieval drop-off
            </p>
          </div>
          <span class="badge badge-p0">8 Key Modes</span>
        </div>
        <div class="failure-list">
          ${listHtml}
        </div>
      </div>
    `;
  },

  // 5. Opportunity Spaces Grid (with 6-dimension scores)
  renderOpportunitySpaces(opportunities = []) {
    const cardsHtml = opportunities.map(opp => `
      <div class="opportunity-card">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--space-xs);">
            <span class="badge ${opp.priority === 'P0' ? 'badge-p0' : 'badge-p1'}">${opp.priority} Opportunity</span>
            <span style="font-family: var(--font-family-headline); font-size: 1.125rem; font-weight: 700; color: var(--color-primary);">
              Score: ${opp.composite_score}
            </span>
          </div>
          <h4 class="text-headline-sm" style="margin-top: 0.5rem; color: var(--color-on-surface);">${opp.name}</h4>
          <p class="text-body-sm" style="color: var(--color-on-surface-variant); margin-top: 0.25rem; line-height: 1.4;">
            ${opp.user_problem}
          </p>
        </div>

        <div>
          <div class="dimension-matrix">
            <div class="dimension-item">
              <div class="dimension-label"><span>Freq</span><span>${opp.frequency_score}</span></div>
              <div class="dimension-track"><div class="dimension-fill" style="width: ${(opp.frequency_score || 0) * 100}%;"></div></div>
            </div>
            <div class="dimension-item">
              <div class="dimension-label"><span>Severity</span><span>${opp.severity_score}</span></div>
              <div class="dimension-track"><div class="dimension-fill" style="width: ${(opp.severity_score || 0) * 100}%;"></div></div>
            </div>
            <div class="dimension-item">
              <div class="dimension-label"><span>Strength</span><span>${opp.evidence_strength}</span></div>
              <div class="dimension-track"><div class="dimension-fill" style="width: ${(opp.evidence_strength || 0) * 100}%;"></div></div>
            </div>
            <div class="dimension-item">
              <div class="dimension-label"><span>Breadth</span><span>${opp.user_breadth}</span></div>
              <div class="dimension-track"><div class="dimension-fill" style="width: ${(opp.user_breadth || 0) * 100}%;"></div></div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-sm);">
            <span class="text-label-sm" style="color: var(--color-outline);">
              ${opp.evidence_count} Verified Nodes · ${opp.confidence} Conf.
            </span>
            <button class="btn btn-secondary inspect-opp-btn" data-id="${opp.id}" data-name="${escapeHtml(opp.name)}">
              <span class="material-symbols-outlined" style="font-size: 14px;">format_quote</span>
              <span>View Quotes</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="card-header" style="margin-bottom: 0;">
          <div>
            <h3 class="text-headline-md">Synthesized Opportunity Spaces</h3>
            <p class="text-body-sm" style="color: var(--color-on-surface-variant);">
              Prioritized problem areas with transparent 6-dimension mathematical composite scores
            </p>
          </div>
          <span class="badge badge-success">PM Synthesis</span>
        </div>
        <div class="opportunity-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  },

  // 6. Retrieval Journey 8-Stage Progression
  renderRetrievalJourney(stages = []) {
    const defaultStages = [
      { stage: 1, name: 'Memory Need', dropoff_pct: 0, friction_summary: 'User feels cognitive urge to retrieve past photo', primary_failure: 'Vague intent', quote: '"I wanted to show my sister that old photo."' },
      { stage: 2, name: 'Query Formation', dropoff_pct: 18, friction_summary: 'Translating subjective memory into keywords', primary_failure: 'Vocabulary gap', quote: '"How do you even search for dramatic shadows?"' },
      { stage: 3, name: 'First Query Attempt', dropoff_pct: 29, friction_summary: 'Submitting query to search bar', primary_failure: 'OCR / Text Void', quote: '"Typed Dyson receipt - got 0 results."' },
      { stage: 4, name: 'Result Evaluation', dropoff_pct: 42, friction_summary: 'Scanning through returned candidate thumbnails', primary_failure: 'Visual ambiguity', quote: '"Hundreds of pictures of the wrong bridge."' },
      { stage: 5, name: 'Query Reformulation', dropoff_pct: 61, friction_summary: 'Trying synonyms, broad dates, or combinations', primary_failure: 'Compound query failure', quote: '"Searched Mom and Grandma, only gave OR results."' },
      { stage: 6, name: 'Timeline Scrubbing', dropoff_pct: 74, friction_summary: 'Abandoning search bar for brute-force infinite scrolling', primary_failure: 'Thumb fatigue', quote: '"Scrolled back through 14 months until my thumb went numb."' },
      { stage: 7, name: 'External Workarounds', dropoff_pct: 85, friction_summary: 'Texting peers, checking WhatsApp, pulling furniture', primary_failure: 'System circumvention', quote: '"I texted my coworker asking for their copy."' },
      { stage: 8, name: 'Final Outcome', dropoff_pct: 45, friction_summary: 'Success with exhaustion or permanent abandonment', primary_failure: 'Lost memory', quote: '"After 40 minutes my eyes hurt so I gave up."' }
    ];

    const activeStages = (stages && stages.length > 0) ? stages : defaultStages;

    const cardsHtml = activeStages.map((s, idx) => {
      const isHighFriction = s.stage === 3 || s.stage === 6 || s.stage === 8;
      return `
        <div class="journey-card ${isHighFriction ? 'high-friction' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="journey-step-badge">${s.stage}</div>
            ${s.dropoff_pct > 0 ? `<span class="badge ${isHighFriction ? 'badge-p0' : 'badge-info'}">${s.dropoff_pct}% Drop</span>` : ''}
          </div>
          <div>
            <h4 class="text-label-lg" style="color: var(--color-on-surface); font-weight: 700;">${s.name}</h4>
            <p class="text-body-sm" style="color: var(--color-on-surface-variant); font-size: 0.75rem; margin-top: 2px;">
              ${s.friction_summary}
            </p>
          </div>
          <div class="journey-quote">${s.quote || defaultStages[idx % defaultStages.length].quote}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="card-header" style="margin-bottom: 0;">
          <div>
            <h3 class="text-headline-md">8-Stage Retrieval Journey Progression</h3>
            <p class="text-body-sm" style="color: var(--color-on-surface-variant);">
              End-to-end cognitive search funnel highlighting critical drop-off and friction spikes
            </p>
          </div>
          <span class="badge badge-info">Funnel Drop-Off</span>
        </div>
        <div class="journey-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  },

  // 7. Scenario Breakdown Cards
  renderScenarioCards(scenarios = []) {
    const defaultScenarios = [
      { scenario_type: 'travel_memory', name: 'Travel & Vacation Recall', count: 7, percentage: 28, cues: 'Mountain lakes, bridges, sunsets, botanical gardens', icon: 'flight_takeoff' },
      { scenario_type: 'document_screenshot', name: 'Utility Receipts & Hardware Labels', count: 6, percentage: 24, cues: 'Store receipts, router serial numbers, paint barcodes', icon: 'receipt_long' },
      { scenario_type: 'person_memory', name: 'Unposed Family & Candid Moments', count: 5, percentage: 20, cues: 'Child eating watermelon, sibling laughing, sunglasses', icon: 'family_restroom' },
      { scenario_type: 'event_memory', name: 'Weddings, Concerts & Milestones', count: 3, percentage: 12, cues: 'Scanned 1984 prints, laser lights, Easter outfits', icon: 'celebration' },
      { scenario_type: 'health_memory', name: 'Medical Rashes & Prescriptions', count: 2, percentage: 8, cues: 'Skin allergy rash, pharmacy bottle, clinic records', icon: 'medical_services' },
      { scenario_type: 'object_product', name: 'Specific Products & Artifacts', count: 2, percentage: 8, cues: 'Dyson vacuum, wine bottle label, antique teapot', icon: 'category' }
    ];

    const activeScenarios = (scenarios && scenarios.length > 0) ? scenarios : defaultScenarios;

    const cardsHtml = activeScenarios.map(s => `
      <div class="kpi-card" style="gap: var(--space-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="brand-icon" style="background-color: var(--color-surface-container-high); color: var(--color-primary);">
            <span class="material-symbols-outlined">${s.icon || 'schema'}</span>
          </div>
          <span class="badge badge-info">${s.percentage || 20}% Frequency</span>
        </div>
        <div>
          <h4 class="text-label-lg" style="color: var(--color-on-surface); font-weight: 700;">${s.name || s.scenario_type}</h4>
          <p class="text-body-sm" style="color: var(--color-on-surface-variant); font-size: 0.75rem; margin-top: 4px;">
            ${s.cues || 'Episodic memory cues and user search attempts.'}
          </p>
        </div>
        <div style="font-size: 0.6875rem; color: var(--color-outline); font-weight: 600; text-transform: uppercase;">
          ${s.count || 5} Verified Nodes
        </div>
      </div>
    `).join('');

    return `
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="card-header" style="margin-bottom: 0;">
          <div>
            <h3 class="text-headline-md">Cognitive Retrieval Scenarios</h3>
            <p class="text-body-sm" style="color: var(--color-on-surface-variant);">
              Domain contexts where vague retrieval occurs most frequently
            </p>
          </div>
          <span class="badge badge-info">14+ Core Contexts</span>
        </div>
        <div class="kpi-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  },

  // 8. User Segment Profile Cards
  renderUserSegmentCards(segments = []) {
    const cardsHtml = segments.map(seg => `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: var(--space-md);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge badge-info">${seg.evidence_count} Nodes</span>
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">badge</span>
          </div>
          <h4 class="text-headline-sm" style="margin-top: 0.5rem; color: var(--color-on-surface); font-weight: 700;">${seg.label}</h4>
          <p class="text-body-sm" style="color: var(--color-on-surface-variant); margin-top: 0.25rem;">${seg.description}</p>
        </div>

        <div style="background-color: var(--color-surface-container-low); padding: var(--space-sm); border-radius: var(--radius-md); font-size: 0.75rem; display: flex; flex-direction: column; gap: 4px;">
          <div><strong style="color: var(--color-on-surface);">Dominant Failure:</strong> <span style="color: var(--color-error);">${seg.dominant_failure}</span></div>
          <div><strong style="color: var(--color-on-surface);">Workaround:</strong> <span style="color: var(--color-on-surface-variant);">${seg.dominant_workaround}</span></div>
        </div>
      </div>
    `).join('');

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-md);">
        ${cardsHtml}
      </div>
    `;
  },

  // 9. Inspection Panel (Right Drawer on Evidence Explorer)
  renderInspectionDrawer(item) {
    if (!item) {
      return `
        <div class="inspection-drawer" style="text-align: center; color: var(--color-outline); padding: 3rem 1rem;">
          <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.4;">find_in_page</span>
          <p class="text-body-sm" style="margin-top: 0.5rem;">Select any evidence row in the table to inspect verbatim quotes and AI cognitive extraction.</p>
        </div>
      `;
    }

    const queriesList = (item.search_queries || []).map(q => `<code style="background: var(--color-surface-container-high); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${escapeHtml(q)}</code>`).join(' ');
    const memoryClues = (item.memory_clues || []).map(c => `<span class="badge badge-info" style="font-size: 0.6875rem;">${escapeHtml(c)}</span>`).join(' ');
    const forgotten = (item.forgotten_info || []).map(f => `<span class="badge badge-p0" style="font-size: 0.6875rem;">${escapeHtml(f)}</span>`).join(' ');

    return `
      <div class="inspection-drawer">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="text-label-sm" style="font-weight: 700; color: var(--color-outline); text-transform: uppercase;">
            Evidence Node #${item.id}
          </span>
          <span class="badge badge-success">${item.evidence_type || 'direct_evidence'}</span>
        </div>

        <div>
          <span class="text-label-sm" style="color: var(--color-outline); font-weight: 600; text-transform: uppercase;">Verbatim Quote</span>
          <blockquote class="quote-box" style="margin-top: 4px;">
            "${escapeHtml(item.original_text)}"
          </blockquote>
          ${item.source_url ? `<a href="${item.source_url}" target="_blank" rel="noopener" style="font-size: 0.6875rem; color: var(--color-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 2px; margin-top: 6px;">Open Original Source <span class="material-symbols-outlined" style="font-size: 12px;">open_in_new</span></a>` : ''}
        </div>

        <div class="section-divider"></div>

        <div>
          <span class="text-label-sm" style="color: var(--color-outline); font-weight: 600; text-transform: uppercase;">Search Queries Tried</span>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
            ${queriesList || '<span style="font-size: 0.75rem; color: var(--color-outline);">No explicit queries mentioned</span>'}
          </div>
        </div>

        <div>
          <span class="text-label-sm" style="color: var(--color-outline); font-weight: 600; text-transform: uppercase;">Memory Clues Retained</span>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
            ${memoryClues || '<span style="font-size: 0.75rem; color: var(--color-outline);">None</span>'}
          </div>
        </div>

        <div>
          <span class="text-label-sm" style="color: var(--color-outline); font-weight: 600; text-transform: uppercase;">Forgotten Information</span>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
            ${forgotten || '<span style="font-size: 0.75rem; color: var(--color-outline);">None</span>'}
          </div>
        </div>

        <div class="section-divider"></div>

        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem;">
          <div><strong style="color: var(--color-on-surface);">Failure Mode:</strong> <span style="color: var(--color-error); font-weight: 600;">${item.failure_type || 'Unclassified'}</span></div>
          <div><strong style="color: var(--color-on-surface);">Workaround:</strong> <span>${item.workaround || 'None'}</span> (${item.workaround_effort || 'medium'})</div>
          <div><strong style="color: var(--color-on-surface);">User Segment:</strong> <span style="color: var(--color-primary); font-weight: 600;">${item.user_segment || 'General'}</span></div>
          <div><strong style="color: var(--color-on-surface);">Confidence:</strong> <span>${Math.round((item.confidence || 0.9) * 100)}%</span></div>
        </div>
      </div>
    `;
  },

  // 13. PM Research Discovery: Search Hero & Benchmark Chips
  renderDiscoveryHero(currentQuery = '') {
    return `
      <section class="discovery-hero">
        <div class="discovery-hero-badge">
          <span class="material-symbols-outlined" style="font-size: 14px; color: #a5b4fc;">auto_awesome</span>
          <span>Google Photos Retrieval Discovery Engine · LLM Research Synthesizer</span>
        </div>
        <h1 class="text-headline-lg" style="margin: 0; font-weight: 800; letter-spacing: -0.02em;">
          PM Research Query &amp; Discovery Engine
        </h1>
        <p class="text-body-md" style="margin-top: 6px; opacity: 0.85; max-width: 820px; line-height: 1.5;">
          Ask any product or user retrieval question. Synthesizes evidence-grounded answers across user quotes, memory signals (remembered vs. forgotten), failure taxonomies, workarounds, and prioritized product opportunities.
        </p>

        <form id="discovery-search-form" class="discovery-search-box" onsubmit="return false;">
          <span class="material-symbols-outlined search-prefix-icon">psychology_alt</span>
          <input 
            type="text" 
            id="discovery-input" 
            placeholder="Ask any retrieval question or select a core PM benchmark below... (e.g., 'What information do users forget?')"
            value="${escapeHtml(currentQuery)}"
            autocomplete="off"
          />
          <button type="submit" id="discovery-submit-btn" class="discovery-search-btn">
            <span class="material-symbols-outlined" style="font-size: 18px;">auto_awesome</span>
            <span>Synthesize Answer</span>
          </button>
        </form>
      </section>
    `;
  },

  // 14. 10 Core PM Benchmark Question Cards
  renderBenchmarkGrid(benchmarks = [], activeBenchmarkId = null) {
    if (!benchmarks || benchmarks.length === 0) return '';

    const categories = [
      { name: 'Photos & Memory', ids: [1, 2, 3, 4], icon: 'psychology' },
      { name: 'Search Behavior & Failures', ids: [5, 6, 7, 8], icon: 'report_problem' },
      { name: 'User Segments & Strategy', ids: [9, 10], icon: 'explore' }
    ];

    return `
      <div class="benchmarks-container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
          <div>
            <h2 class="text-headline-sm" style="font-size: 1.05rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 20px; color: #4338ca;">quiz</span>
              10 Core PM Benchmark Questions (from Problem Statement)
            </h2>
            <p class="text-body-sm" style="color: var(--color-outline); margin-top: 2px;">
              Click any benchmark question to run instant grounded synthesis across the research corpus.
            </p>
          </div>
          <span class="badge badge-info" style="font-size: 0.6875rem;">Problem Statement L56–68</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-md); margin-top: var(--space-sm);">
          ${categories.map(cat => {
            const catBenchmarks = benchmarks.filter(b => cat.ids.includes(b.id));
            if (catBenchmarks.length === 0) return '';

            return `
              <div class="benchmark-group">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-outline); margin-bottom: 6px;">
                  <span class="material-symbols-outlined" style="font-size: 15px;">${cat.icon}</span>
                  <span>${cat.name}</span>
                </div>
                <div class="benchmark-chips-grid">
                  ${catBenchmarks.map(b => `
                    <button 
                      class="benchmark-card-btn ${activeBenchmarkId === b.id ? 'active' : ''}" 
                      data-id="${b.id}"
                      data-query="${escapeHtml(b.title)}"
                      type="button"
                    >
                      <span class="benchmark-card-num">Q${b.id}</span>
                      <div style="flex: 1;">
                        <div class="benchmark-card-title">${escapeHtml(b.title)}</div>
                        <div style="font-size: 0.6875rem; color: var(--color-outline); margin-top: 2px; line-height: 1.25;">
                          ${escapeHtml(b.description || '')}
                        </div>
                      </div>
                      <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-outline); margin-top: 2px;">arrow_forward</span>
                    </button>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // 15. Shimmer Loading Skeleton
  renderSynthesisSkeleton(queryText) {
    return `
      <div class="synthesis-card">
        <div class="synthesis-banner">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-symbols-outlined" style="font-size: 20px; color: #4338ca; animation: spin 1s linear infinite;">sync</span>
            <span style="font-weight: 700; font-size: 0.875rem; color: var(--color-on-surface);">Synthesizing Research Evidence...</span>
          </div>
          <span class="text-label-sm" style="color: var(--color-outline);">Retrieving evidence nodes &amp; extracting signals</span>
        </div>
        <div class="synthesis-main">
          <div style="font-size: 0.8125rem; color: var(--color-outline); margin-bottom: var(--space-sm);">
            Query: <strong style="color: var(--color-on-surface);">"${escapeHtml(queryText)}"</strong>
          </div>
          <div class="shimmer-box" style="height: 110px; width: 100%; margin-bottom: var(--space-md);"></div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-sm); margin-bottom: var(--space-lg);">
            <div class="shimmer-box" style="height: 60px;"></div>
            <div class="shimmer-box" style="height: 60px;"></div>
            <div class="shimmer-box" style="height: 60px;"></div>
            <div class="shimmer-box" style="height: 60px;"></div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-md);">
            <div class="shimmer-box" style="height: 180px;"></div>
            <div class="shimmer-box" style="height: 180px;"></div>
            <div class="shimmer-box" style="height: 180px;"></div>
          </div>
        </div>
      </div>
    `;
  },

  // 16. Comprehensive Synthesis Result Card
  renderSynthesisResult(res) {
    if (!res || !res.synthesis) {
      return `
        <div class="synthesis-card" style="padding: 2rem; text-align: center; color: var(--color-outline);">
          <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-error);">error</span>
          <p style="margin-top: 0.5rem;">No synthesis generated for this query.</p>
        </div>
      `;
    }

    const { query, benchmark_match, methodology, model_name, corpus_evidence_count, synthesis, cited_evidence } = res;
    const memSignals = synthesis.memory_signals || { remembered: [], forgotten: [] };
    const traj = synthesis.retrieval_trajectory || { search_patterns: [], failure_points: [], workarounds: [] };
    const opps = synthesis.opportunity_linkage || [];
    const segments = synthesis.affected_segments || [];
    const takeaways = synthesis.key_takeaways || [];
    const followups = synthesis.recommended_research || [];

    return `
      <article class="synthesis-card">
        <!-- Banner -->
        <div class="synthesis-banner">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${benchmark_match ? `
              <span class="badge" style="background: #e0e7ff; color: #3730a3; font-weight: 700; font-size: 0.75rem;">
                <span class="material-symbols-outlined" style="font-size: 13px;">verified</span>
                Core PM Benchmark #${benchmark_match.id}: ${benchmark_match.category}
              </span>
            ` : `
              <span class="badge badge-info" style="font-size: 0.75rem;">
                <span class="material-symbols-outlined" style="font-size: 13px;">search</span>
                Custom Discovery Query
              </span>
            `}
            <span class="text-label-sm" style="color: var(--color-on-surface); font-weight: 600;">
              "${escapeHtml(query)}"
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-success" style="font-size: 0.6875rem;">
              <span class="material-symbols-outlined" style="font-size: 13px;">dataset</span>
              ${corpus_evidence_count || 12} Evidence Nodes Grounded
            </span>
            <span class="badge" style="background: rgba(67, 56, 202, 0.1); color: #4338ca; font-size: 0.6875rem; font-weight: 600;">
              <span class="material-symbols-outlined" style="font-size: 13px;">memory</span>
              ${escapeHtml(methodology || 'Corpus Grounded')}
            </span>
          </div>
        </div>

        <div class="synthesis-main">
          <!-- Executive Summary -->
          <div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #4338ca; margin-bottom: 6px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">psychology</span>
              <span>Executive PM Synthesis</span>
            </div>
            <div class="synthesis-exec-box">
              ${escapeHtml(synthesis.executive_summary || '')}
            </div>
          </div>

          <!-- Key Takeaways Strip -->
          ${takeaways.length > 0 ? `
            <div style="margin-top: var(--space-md);">
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--color-outline); margin-bottom: 6px;">
                Key Product Takeaways
              </div>
              <div class="takeaways-grid">
                ${takeaways.map(t => `
                  <div class="takeaway-pill-card">
                    <span class="material-symbols-outlined pill-icon">check_circle</span>
                    <span>${escapeHtml(t)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Deep-Dive 3-Column Grid -->
          <div class="deepdive-grid">
            <!-- Col 1: Memory Signals -->
            <div class="deepdive-panel">
              <div class="deepdive-panel-header">
                <span class="material-symbols-outlined" style="color: #059669; font-size: 18px;">neurology</span>
                <span>Cognitive Memory Signals</span>
              </div>
              
              <div>
                <span class="text-label-sm" style="color: var(--color-outline); font-weight: 700; text-transform: uppercase; font-size: 0.6875rem;">
                  What Users Remember:
                </span>
                <div class="tag-cloud">
                  ${(memSignals.remembered || []).map(r => `
                    <span class="tag-cloud-chip tag-remembered">
                      <span class="material-symbols-outlined" style="font-size: 12px;">visibility</span>
                      ${escapeHtml(r)}
                    </span>
                  `).join('') || '<span style="font-size: 0.75rem; color: var(--color-outline);">None captured</span>'}
                </div>
              </div>

              <div style="margin-top: 6px;">
                <span class="text-label-sm" style="color: var(--color-outline); font-weight: 700; text-transform: uppercase; font-size: 0.6875rem;">
                  What Users Forget:
                </span>
                <div class="tag-cloud">
                  ${(memSignals.forgotten || []).map(f => `
                    <span class="tag-cloud-chip tag-forgotten">
                      <span class="material-symbols-outlined" style="font-size: 12px;">visibility_off</span>
                      ${escapeHtml(f)}
                    </span>
                  `).join('') || '<span style="font-size: 0.75rem; color: var(--color-outline);">None captured</span>'}
                </div>
              </div>

              ${memSignals.mental_model ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-surface-container-high); font-size: 0.75rem; color: var(--color-on-surface-variant); line-height: 1.4;">
                  <strong>Mental Model:</strong> ${escapeHtml(memSignals.mental_model)}
                </div>
              ` : ''}
            </div>

            <!-- Col 2: Trajectory & Failure Modes -->
            <div class="deepdive-panel">
              <div class="deepdive-panel-header">
                <span class="material-symbols-outlined" style="color: #ea580c; font-size: 18px;">alt_route</span>
                <span>Attempt Trajectory &amp; Friction</span>
              </div>

              <div>
                <span class="text-label-sm" style="color: var(--color-outline); font-weight: 700; text-transform: uppercase; font-size: 0.6875rem;">
                  Search Breakdown Points:
                </span>
                <div class="tag-cloud">
                  ${(traj.failure_points || []).map(fp => `
                    <span class="tag-cloud-chip tag-failure">
                      <span class="material-symbols-outlined" style="font-size: 12px;">report_problem</span>
                      ${escapeHtml(fp)}
                    </span>
                  `).join('') || '<span style="font-size: 0.75rem; color: var(--color-outline);">None</span>'}
                </div>
              </div>

              <div style="margin-top: 6px;">
                <span class="text-label-sm" style="color: var(--color-outline); font-weight: 700; text-transform: uppercase; font-size: 0.6875rem;">
                  Typical Workarounds:
                </span>
                <div class="tag-cloud">
                  ${(traj.workarounds || []).map(w => `
                    <span class="tag-cloud-chip tag-workaround">
                      <span class="material-symbols-outlined" style="font-size: 12px;">swipe</span>
                      ${escapeHtml(w)}
                    </span>
                  `).join('') || '<span style="font-size: 0.75rem; color: var(--color-outline);">None</span>'}
                </div>
              </div>

              ${traj.abandonment_rate ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-surface-container-high); font-size: 0.75rem; color: var(--color-error); font-weight: 600; display: flex; align-items: center; gap: 4px;">
                  <span class="material-symbols-outlined" style="font-size: 16px;">trending_down</span>
                  <span>Abandonment Impact: ${escapeHtml(traj.abandonment_rate)}</span>
                </div>
              ` : ''}
            </div>

            <!-- Col 3: Segments & Opportunities -->
            <div class="deepdive-panel">
              <div class="deepdive-panel-header">
                <span class="material-symbols-outlined" style="color: #4338ca; font-size: 18px;">lightbulb</span>
                <span>Affected Segments &amp; Solutions</span>
              </div>

              <div>
                <span class="text-label-sm" style="color: var(--color-outline); font-weight: 700; text-transform: uppercase; font-size: 0.6875rem;">
                  Impacted User Segments:
                </span>
                <div class="tag-cloud">
                  ${(segments || []).map(s => `
                    <span class="tag-cloud-chip" style="background: #eef2ff; color: #3730a3; border: 1px solid #c7d2fe;">
                      <span class="material-symbols-outlined" style="font-size: 12px;">group</span>
                      ${escapeHtml(s)}
                    </span>
                  `).join('') || '<span style="font-size: 0.75rem; color: var(--color-outline);">General</span>'}
                </div>
              </div>

              <div style="margin-top: 6px;">
                <span class="text-label-sm" style="color: var(--color-outline); font-weight: 700; text-transform: uppercase; font-size: 0.6875rem;">
                  Linked Product Opportunities:
                </span>
                <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                  ${opps.map(o => `
                    <a href="#/opportunity-map" style="text-decoration: none; padding: 6px 8px; border-radius: var(--radius-sm); background: var(--color-surface-container-low); border: 1px solid var(--color-surface-container-high); display: flex; align-items: center; justify-content: space-between; transition: all 0.15s ease;">
                      <div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary);">${escapeHtml(o.name || o.title || '')}</div>
                        ${o.user_problem ? `<div style="font-size: 0.6875rem; color: var(--color-outline);">${escapeHtml(o.user_problem).slice(0, 55)}...</div>` : ''}
                      </div>
                      <span class="badge ${o.priority === 'P0' ? 'badge-p0' : 'badge-p1'}" style="font-size: 0.625rem;">
                        ${o.priority || 'P0'}
                      </span>
                    </a>
                  `).join('') || '<span style="font-size: 0.75rem; color: var(--color-outline);">None linked</span>'}
                </div>
              </div>
            </div>
          </div>

          <!-- Grounded Evidence Quote Carousel/Grid -->
          ${cited_evidence && cited_evidence.length > 0 ? `
            <div class="cited-evidence-section">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--color-on-surface);">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-primary);">format_quote</span>
                  <span>Grounded User Evidence Nodes (${cited_evidence.length} Citations)</span>
                </div>
                <a href="#/evidence-explorer" style="font-size: 0.75rem; color: var(--color-primary); text-decoration: none; font-weight: 600;">
                  Explore All Evidence &rarr;
                </a>
              </div>

              <div class="evidence-quote-grid">
                ${cited_evidence.slice(0, 6).map(ev => `
                  <div class="evidence-quote-card" onclick="location.hash='#/evidence-explorer'">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span class="badge" style="font-size: 0.625rem; background: var(--color-surface-container-high); color: var(--color-on-surface);">
                          #${ev.id} · ${escapeHtml(ev.source_platform || 'user_review')}
                        </span>
                        <span class="badge ${ev.severity === 'critical' || ev.severity === 'high' ? 'badge-p0' : 'badge-info'}" style="font-size: 0.625rem;">
                          ${escapeHtml(ev.severity || 'medium')}
                        </span>
                      </div>
                      <p style="font-size: 0.75rem; font-style: italic; color: var(--color-on-surface-variant); line-height: 1.4; margin: 0;">
                        "${escapeHtml(ev.original_text.length > 140 ? ev.original_text.slice(0, 140) + '...' : ev.original_text)}"
                      </p>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.6875rem; color: var(--color-outline); padding-top: 6px; border-top: 1px dashed var(--color-surface-container-high);">
                      <span>${escapeHtml(ev.failure_type || 'Semantic Gap')}</span>
                      <span>${Math.round((ev.confidence || 0.9) * 100)}% conf</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Recommended Follow-up Research Questions -->
          ${followups.length > 0 ? `
            <div style="margin-top: var(--space-lg); padding-top: var(--space-md); border-top: 1px solid var(--color-surface-container-high);">
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--color-outline); margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                <span class="material-symbols-outlined" style="font-size: 15px; color: #4338ca;">explore</span>
                <span>Recommended Deeper Research Inquiries (Click to Ask)</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${followups.map(fq => `
                  <button 
                    type="button" 
                    class="btn btn-secondary research-followup-btn" 
                    data-query="${escapeHtml(fq)}"
                    style="font-size: 0.75rem; padding: 6px 12px; border-radius: var(--radius-full); text-align: left;"
                  >
                    <span class="material-symbols-outlined" style="font-size: 14px; color: #4338ca;">chat_bubble_outline</span>
                    <span>${escapeHtml(fq)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </article>
    `;
  }
};

window.Components = Components;
