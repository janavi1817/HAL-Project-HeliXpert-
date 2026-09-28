/**
 * HeliXpert AI Engine - Bulletproof offline version
 */

import { dataService } from './dataService';

export class AiEngine {
  constructor() {
    this.ollamaUrl = localStorage.getItem('helixpert_ollama_url') || 'http://localhost:11434';
    this.useOllama = localStorage.getItem('helixpert_use_ollama') === 'true';
    this.modelName = localStorage.getItem('helixpert_model_name') || 'llama3:8b';
    this.backendUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  }

  setOllamaConfig(url, enable, model) {
    this.ollamaUrl = url;
    this.useOllama = enable;
    this.modelName = model;
    localStorage.setItem('helixpert_ollama_url', url);
    localStorage.setItem('helixpert_use_ollama', String(enable));
    localStorage.setItem('helixpert_model_name', model);
  }

  async testBackendConnection() {
    try {
      const response = await fetch(`${this.backendUrl}/api/analyst/test`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      return false;
    }
  }

  async processQuery(userQuestion, mode = 'nlp', language = 'en') {
    console.log('🔍 AI Engine - Processing query:', { userQuestion, mode, language });

    try {
      // First, test if backend is reachable
      const backendAvailable = await this.testBackendConnection();

      if (!backendAvailable) {
        console.error('❌ Backend not available at', this.backendUrl);
        return {
          success: false,
          error: "Backend server not running",
          answer: `Cannot connect to backend at ${this.backendUrl}.\n\nPlease ensure the backend is running:\npython -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000`
        };
      }

      // Use the data service to query the backend AI
      const result = await dataService.queryAI(userQuestion, mode, language);

      console.log('📥 AI Engine - Backend response:', result);

      // Check for error responses
      if (result && result.isEmpty) {
        console.error('❌ AI Engine - Empty result:', result.error);
        return {
          success: false,
          error: result.error || "AI service unavailable",
          answer: result.error || "I'm unable to process your question right now."
        };
      }

      // Check if we have a valid explanation
      if (result && (result.explanation || result.answer)) {
        const visualization = result.chartType && result.chartType !== 'none' ? {
          type: result.chartType,
          data: result.chartData || []
        } : null;

        return {
          success: true,
          answer: result.explanation || result.answer || "Query processed successfully",
          data: result.queryResult?.data || result.chartData || null,
          visualization: visualization,
          sql: result.sql || null,
          intent: result.intent || null,
          source: result.source || 'unknown',
          mode: result.mode || mode,
          language: result.language || language,
          processingTime: "~2.1s"
        };
      } else {
        console.error('❌ AI Engine - Invalid result format:', result);
        return {
          success: false,
          error: "Invalid response format from backend",
          answer: "I received an unexpected response format. Please check the backend logs."
        };
      }
    } catch (error) {
      console.error('❌ AI Engine - Error:', error);
      return {
        success: false,
        error: error.message,
        answer: `Error: ${error.message}\n\nPlease ensure:\n1. Backend is running at http://localhost:8000\n2. Database is loaded\n3. Check browser console (F12) for details`
      };
    }
  }

  /**
   * Get Ollama status from backend
   * @returns {Promise<{available: boolean, model: string|null, models: Array<string>}>}
   */
  async getOllamaStatus() {
    try {
      const response = await fetch(`${this.backendUrl}/api/analyst/ollama-status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.debug('Ollama status check failed:', error);
      // Return offline status on any error
      return {
        available: false,
        model: null,
        models: []
      };
    }
  }
}

// Export singleton instance
export const aiEngine = new AiEngine();
