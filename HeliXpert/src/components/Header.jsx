import React from 'react';
import { Search, Database, WifiOff } from 'lucide-react';

export default function Header({ activeTab, onSearchClick, activeHelicopterModel }) {
  const titles = {
    'dashboard': 'Fleet Executive Dashboard',
    'ai-analyst': 'AI Database Analyst & Query Processor',
    'helicopters': 'Helicopter Fleet Directory',
    '3d-model': '3D Helicopter Visualization',
    'details': activeHelicopterModel ? `Digital Twin: ${activeHelicopterModel}` : 'Helicopter Digital Twin',
    'components': 'Subsystem & Component Health Tracker',
    'parameters': 'Real-Time Telemetry & Parameter Explorer',
    'faults': 'Fault Logs & Exceedance Management',
    'maintenance': 'Maintenance Scheduler & Work Orders',
    'prognostics': 'Engine Prognostics (C-MAPSS)',
    'knowledge': 'Technical Documentation & Knowledge Base',
    'datasets': 'Dataset Management',
    'settings': 'System Settings & Local AI Configuration',
  };

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-border fixed top-0 right-0 left-64 z-20 px-6 flex items-center justify-between">
      <h2 className="text-base font-semibold text-foreground font-mono tracking-wide truncate">
        {titles[activeTab] || 'HeliXpert'}
      </h2>

      <div className="flex items-center space-x-3">
        {/* Quick search */}
        <button
          onClick={onSearchClick}
          className="px-3 py-1.5 rounded-lg bg-surface-variant border border-border text-muted hover:text-foreground text-xs flex items-center space-x-2 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-primary-500" />
          <span>Ask AI Analyst...</span>
          <kbd className="px-1 py-0.5 rounded bg-surface text-[10px] font-mono text-muted border border-border">Ctrl+K</kbd>
        </button>

        {/* DB status */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-surface-variant border border-border text-xs font-mono">
          <Database className="w-3.5 h-3.5 text-success-light dark:text-success-dark" />
          <span className="text-muted">SQLite:</span>
          <span className="text-success-light dark:text-success-dark font-semibold">Active</span>
        </div>

        {/* Offline badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-primary-500/10 border border-primary-500/20 text-xs font-mono text-primary-500">
          <WifiOff className="w-3.5 h-3.5" />
          <span>OFFLINE</span>
        </div>
      </div>
    </header>
  );
}
