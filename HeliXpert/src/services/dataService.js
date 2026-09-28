/**
 * HeliXpert Data Service
 * Provides data access layer connecting to real datasets via API
 * IMPORTANT: No dummy/mock data - all data comes from actual datasets
 */

import { apiService, withErrorHandling, createEmptyState, validateDataset } from './api.js';

class DataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastHealthCheck = null;
  }

  // Cache management
  getCacheKey(method, params = {}) {
    return `${method}_${JSON.stringify(params)}`;
  }

  async getFromCacheOrAPI(cacheKey, apiCall) {
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
      return cached.data;
    }

    const data = await withErrorHandling(apiCall, null);
    if (data !== null) {
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }
    
    return data;
  }

  clearCache() {
    this.cache.clear();
  }

  // Dataset status and management
  async getDatasetsStatus() {
    return this.getFromCacheOrAPI('datasets_status', () => apiService.getDatasetsStatus());
  }

  async triggerDatasetImport() {
    this.clearCache(); // Clear cache after import
    return withErrorHandling(() => apiService.triggerDatasetImport());
  }

  // Helicopters - Real dataset only
  async getHelicopters() {
    const data = await this.getFromCacheOrAPI('helicopters', () => apiService.getHelicopters());
    
    if (!validateDataset(data)) {
      return createEmptyState('Helicopter dataset not loaded. Go to Dataset Management to import helicopter data.');
    }
    
    return data;
  }
  async getHelicopter(id) {
    if (!id) return null;
    
    const data = await withErrorHandling(() => apiService.getHelicopter(id), null);
    
    if (!data) {
      return createEmptyState(`Helicopter ${id} not found in loaded dataset.`);
    }
    
    return data;
  }

  // Components - Real dataset only
  async getComponents() {
    const data = await this.getFromCacheOrAPI('components', () => apiService.getComponents());
    
    if (!validateDataset(data)) {
      return createEmptyState('Component/IPC dataset not loaded. Component data is not available.');
    }
    
    return data;
  }

  // Telemetry & Parameters - Real PHM dataset only
  async getTelemetrySummary() {
    const data = await this.getFromCacheOrAPI('telemetry_summary', () => apiService.getTelemetrySummary());
    
    if (!validateDataset(data)) {
      return createEmptyState('PHM helicopter engine telemetry dataset not loaded.');
    }
    
    return data;
  }

  async getTelemetryTrends(limit = 100) {
    const cacheKey = this.getCacheKey('telemetry_trends', { limit });
    const data = await this.getFromCacheOrAPI(cacheKey, () => apiService.getTelemetryTrends(limit));
    
    if (!validateDataset(data)) {
      return createEmptyState('PHM helicopter engine telemetry dataset not loaded.');
    }
    
    return data;
  }

  // Faults & Health - Real dataset only
  async getFaults() {
    const data = await this.getFromCacheOrAPI('faults', () => apiService.getFaults());
    
    if (!validateDataset(data)) {
      return createEmptyState('Fault/health dataset not available.');
    }
    
    return data;
  }

  async getFaultsSummary() {
    const data = await this.getFromCacheOrAPI('faults_summary', () => apiService.getFaultsSummary());
    
    if (!validateDataset(data)) {
      return createEmptyState('Fault/health dataset not available.');
    }
    
    return data;
  }
  // Maintenance - Real annotated logbook only
  async getMaintenanceSummary() {
    const data = await this.getFromCacheOrAPI('maintenance_summary', () => apiService.getMaintenanceSummary());
    
    if (!validateDataset(data)) {
      return createEmptyState('Annotated maintenance logbook dataset not loaded.');
    }
    
    return data;
  }

  async searchMaintenance(query) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const data = await withErrorHandling(() => apiService.searchMaintenance(query), []);
    
    if (!validateDataset(data)) {
      return createEmptyState('Annotated maintenance logbook dataset not loaded.');
    }
    
    return data;
  }

  // Dashboard stats - Real data only
  async getDashboardStats() {
    const data = await this.getFromCacheOrAPI('dashboard_stats', () => apiService.getDashboardStats());
    
    if (!data) {
      return {
        helicopters: 'Not loaded',
        telemetry: 'Not loaded', 
        maintenance: 'Not loaded',
        faults: 'Not loaded',
        cmapss: 'Not loaded',
        datasets_loaded: 0
      };
    }
    
    return data;
  }

  // CMAPSS prognostics - Real NASA dataset only
  async getCMAPSSData() {
    const data = await this.getFromCacheOrAPI('cmapss_data', () => apiService.getCMAPSSData());
    
    if (!validateDataset(data)) {
      return createEmptyState('NASA C-MAPSS turbofan engine degradation dataset not loaded.');
    }
    
    return data;
  }

  async getCMApssSummary() {
    const data = await this.getFromCacheOrAPI('cmapss_summary', () => apiService.getCMApssSummary());
    
    if (!validateDataset(data)) {
      return createEmptyState('NASA C-MAPSS turbofan engine degradation dataset not loaded.');
    }
    
    return data;
  }
  // AI Analyst - Must work with real data only
  async queryAI(question, mode = 'nlp', language = 'en') {
    if (!question || question.trim().length === 0) {
      return {
        error: 'Please provide a question to analyze.',
        isEmpty: true
      };
    }
    
    const result = await withErrorHandling(() => apiService.queryAI(question, mode, language), null);
    
    if (!result) {
      return {
        error: 'AI Analyst service unavailable. Ensure datasets are loaded and backend is running.',
        isEmpty: true
      };
    }
    
    return result;
  }

  // System health
  async checkSystemHealth() {
    const health = await apiService.healthCheck();
    this.lastHealthCheck = health;
    return health;
  }

  getLastHealthCheck() {
    return this.lastHealthCheck;
  }

  // System status for settings view
  async getSystemStatus() {
    const data = await withErrorHandling(() => apiService.getSystemStatus(), null);
    if (!data) {
      return { backend: 'offline', database: 'error', datasets_loaded: 0 };
    }
    return data;
  }

  // Documents / Knowledge Base
  async getDocuments(search = '') {
    const data = await withErrorHandling(() => apiService.getDocuments(search), null);
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.documents) return data.documents;
    return [];
  }

  // Legacy compatibility - DEPRECATED, will be removed
  executeSql(query) {
    console.warn('DEPRECATED: executeSql() is deprecated. Use specific data methods instead.');
    return {
      success: false,
      error: 'SQL execution deprecated. Use API-based data methods.',
      query
    };
  }

  // REMOVED: All dummy data methods
  // No more: getHelicopterById with fake data
  // No more: getDashboardStats with fake calculations  
  // No more: INITIAL_DATABASE usage
  // No more: LocalStorage fake data
}

// Export singleton instance
export const dataService = new DataService();

// Legacy export for compatibility - will be deprecated
export const db = dataService;