import React, { useState, useEffect } from 'react';
import { aiEngine } from '../services/aiEngine';
import { dataService } from '../services/dataService';
import {
  Settings, Server, Database, Activity,
  CheckCircle2, AlertCircle, Check, RefreshCw, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsView() {
  const { theme, toggleTheme } = useTheme();
  const [ollamaUrl, setOllamaUrl] = useState(aiEngine.ollamaUrl || 'http://localhost:11434');
  const [useOllama, setUseOllama] = useState(aiEngine.useOllama || false);
  const [modelName, setModelName] = useState(aiEngine.modelName || 'llama3:8b');
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const s = await dataService.getSystemStatus();
      setStatus(s);
    } catch {
      setStatus({ backend: 'offline', database: 'error' });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    aiEngine.setOllamaConfig(ollamaUrl, useOllama, modelName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const StatusBadge = ({ ok, labelOk = 'Online', labelFail = 'Offline' }) => ok
    ? <span className="status-success text-xs px-2 py-0.5 rounded font-mono">{labelOk}</span>
    : <span className="status-error text-xs px-2 py-0.5 rounded font-mono">{labelFail}</span>;

  return (
    <div className="space-y-5 max-w-2xl pb-8">
      {/* Header */}
      <div className="card-premium p-5">
        <h2 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-500" /> Settings
        </h2>
        <p className="text-xs text-muted font-mono mt-0.5">
          System status, AI engine configuration, and appearance.
        </p>
      </div>

      {/* System Status */}
      <div className="card-premium p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-primary-500" /> System Status
          </h3>
          <button onClick={fetchStatus} className="text-muted hover:text-foreground transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-variant border border-border">
            <span className="text-xs font-mono text-foreground">Backend API</span>
            <StatusBadge ok={status?.backend === 'online'} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-variant border border-border">
            <span className="text-xs font-mono text-foreground">Database</span>
            <StatusBadge ok={status?.database === 'ready'} labelOk="Ready" labelFail="Error" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-variant border border-border">
            <span className="text-xs font-mono text-foreground">Datasets Loaded</span>
            <span className="text-xs font-bold gold-accent font-mono">{status?.datasets_loaded ?? '—'}/4</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-variant border border-border">
            <span className="text-xs font-mono text-foreground">Mode</span>
            <span className="status-success text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% Offline
            </span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card-premium p-5 space-y-3">
        <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-primary-500" /> : <Moon className="w-3.5 h-3.5 text-primary-500" />}
          Appearance
        </h3>
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-variant border border-border">
          <div>
            <p className="text-sm font-mono text-foreground">Theme</p>
            <p className="text-xs text-muted font-mono">{theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}</p>
          </div>
          <button onClick={toggleTheme} className="btn-secondary text-xs flex items-center gap-1.5">
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {/* AI Engine */}
      <div className="card-premium p-5 space-y-3">
        <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-primary-500" /> AI Engine
        </h3>
        <form onSubmit={handleSave} className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-variant border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={useOllama}
              onChange={(e) => setUseOllama(e.target.checked)}
              className="w-4 h-4 text-primary-500"
            />
            <div>
              <p className="text-xs font-mono font-bold text-foreground">Use Local LLM (Ollama)</p>
              <p className="text-[11px] text-muted font-mono">
                Connect to a local Ollama server for richer AI responses. Off = built-in rule engine.
              </p>
            </div>
          </label>

          {useOllama && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
              <div>
                <label className="text-[11px] text-muted font-mono block mb-1">Ollama URL</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-border text-foreground font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted font-mono block mb-1">Model</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-border text-foreground font-mono"
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary flex items-center gap-2 text-xs">
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Data */}
      <div className="card-premium p-5 space-y-3">
        <h3 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-primary-500" /> Data
        </h3>
        <div className="p-3 rounded-lg bg-surface-variant border border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-mono font-bold text-foreground">Reload Datasets</p>
            <p className="text-[11px] text-muted font-mono">Re-ingest from raw CSV / H5 files.</p>
          </div>
          <button
            onClick={() => alert('Run setup_offline.bat from the project root to reload datasets.')}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
        </div>
        <p className="text-[11px] font-mono text-muted px-1">
          Database: <code>data/database/helixpert.db</code> · Raw data: <code>data/raw/</code>
        </p>
      </div>
    </div>
  );
}
