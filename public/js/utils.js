/**
 * Utility Helpers & Global Filter State
 * Google Photos Retrieval Discovery Engine
 */

const FilterState = {
  source: '',
  scenario: '',
  failure: '',
  severity: '',
  confidence_min: '',
  search: '',

  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
  },

  notify() {
    this.listeners.forEach(fn => fn(this));
  },

  setFilter(key, value) {
    this[key] = value;
    this.notify();
  },

  reset() {
    this.source = '';
    this.scenario = '';
    this.failure = '';
    this.severity = '';
    this.confidence_min = '';
    this.search = '';
    this.notify();
  },

  getParams() {
    const params = {};
    if (this.source) params.source = this.source;
    if (this.scenario) params.scenario = this.scenario;
    if (this.failure) params.failure = this.failure;
    if (this.severity) params.severity = this.severity;
    if (this.confidence_min) params.confidence_min = this.confidence_min;
    if (this.search) params.search = this.search;
    return params;
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, maxLen = 120) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}

function formatPercent(val) {
  return `${Math.round(val || 0)}%`;
}

window.FilterState = FilterState;
window.Utils = {
  escapeHtml,
  truncate,
  formatPercent
};
