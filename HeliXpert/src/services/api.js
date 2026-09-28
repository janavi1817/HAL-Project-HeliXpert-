/**
 * HeliXpert API Service
 * Connects to FastAPI backend for real dataset access
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new APIError(
          `API request failed: ${response.statusText}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      // Handle network errors
      throw new APIError(
        `Network error: ${error.message}`,
        0
      );
    }
  }

  // Dataset Management
  async getDatasetsStatus() {
    return this.request('/api/datasets');
  }

  async triggerDatasetImport() {
    return this.request('/api/datasets/import', { method: 'POST' });
  }

  // Helicopters
  async getHelicopters() {
    return this.request('/api/helicopters');
  }

  async getHelicopter(id) {
    return this.request(`/api/helicopters/${id}`);
  }

  // Components
  async getComponents() {
    return this.request('/api/components');
  }

  // Telemetry & Parameters
  async getTelemetrySummary() {
    return this.request('/api/telemetry/summary');
  }

  async getTelemetryTrends(limit = 100) {
    return this.request(`/api/telemetry/trends?limit=${limit}`);
  }

  // Faults & Health
  async getFaults() {
    return this.request('/api/faults');
  }

  async getFaultsSummary() {
    return this.request('/api/faults/summary');
  }

  // Maintenance
  async getMaintenanceSummary() {
    return this.request('/api/maintenance/summary');
  }

  async searchMaintenance(query) {
    return this.request(`/api/maintenance/search?q=${encodeURIComponent(query)}`);
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }

  // CMAPSS Prognostics
  async getCMAPSSData() {
    return this.request('/api/cmapss');
  }

  async getCMApssSummary() {
    return this.request('/api/cmapss/summary');
  }

  // AI Analyst
  async queryAI(question, mode = 'nlp', language = 'en') {
    return this.request('/api/analyst/query', {
      method: 'POST',
      body: JSON.stringify({ question, mode, language })
    });
  }

  // System status
  async getSystemStatus() {
    try {
      return await this.request('/api/system/status');
    } catch (error) {
      return { backend: 'error', database: 'error', datasets_loaded: 0 };
    }
  }

  // Documents / Knowledge Base
  async getDocuments(search = '') {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/api/documents${qs}`);
  }

  // Health check
  async healthCheck() {
    try {
      await this.request('/api/health');
      return { status: 'connected', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'disconnected', 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const apiService = new APIService();

// Utility functions for common patterns
export const withErrorHandling = async (apiCall, fallback = null) => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API Error:', error);
    return fallback;
  }
};

export const createEmptyState = (message) => ({
  isEmpty: true,
  message,
  timestamp: new Date().toISOString()
});

// Data validation utilities
export const validateDataset = (data) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return false;
  }
  return true;
};

export default apiService;