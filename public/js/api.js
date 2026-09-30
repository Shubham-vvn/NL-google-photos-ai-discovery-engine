/**
 * API Client Wrapper for Google Photos Retrieval Discovery Engine
 */

const API = {
  // Base request helper
  async request(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error(`Fetch failed for ${endpoint}:`, err);
      return { status: 'error', message: err.message };
    }
  },

  // KPI & Stats
  async getStats() {
    return this.request('/api/stats');
  },

  // Evidence Explorer
  async getEvidence(params = {}) {
    return this.request('/api/evidence', params);
  },

  async getEvidenceById(id) {
    return this.request(`/api/evidence/${id}`);
  },

  // Scenarios
  async getScenarios() {
    return this.request('/api/scenarios');
  },

  // Memory Matrix
  async getMemoryMatrix() {
    return this.request('/api/memory-matrix');
  },

  // Failure Modes
  async getFailures() {
    return this.request('/api/failures');
  },

  // User Segments
  async getSegments() {
    return this.request('/api/segments');
  },

  // Opportunities
  async getOpportunities() {
    return this.request('/api/opportunities');
  },

  async getOpportunityById(id) {
    return this.request(`/api/opportunities/${id}`);
  },

  // Journey
  async getJourney() {
    return this.request('/api/journey');
  },

  // Quotes
  async getQuotes(opportunityId) {
    return this.request(`/api/quotes/${opportunityId}`);
  },

  // Pipeline
  async getPipelineStatus() {
    return this.request('/api/pipeline/status');
  },

  // PM Discovery Search & Synthesis
  async getBenchmarks() {
    return this.request('/api/discovery/benchmarks');
  },

  async queryDiscovery(query) {
    try {
      const res = await fetch('/api/discovery/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (!res.ok) {
        throw new Error(`Discovery query failed (${res.status}): ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('queryDiscovery error:', err);
      return { status: 'error', message: err.message };
    }
  }
};

window.API = API;
