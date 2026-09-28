import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import EmptyState from './EmptyState';
import { 
  Plane, 
  AlertTriangle, 
  Activity, 
  Bot, 
  ArrowRight, 
  Wrench,
  Database,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function Dashboard({ setActiveTab, onSelectQuickPrompt, onSelectHelicopter }) {
  const [stats, setStats] = useState(null);
  const [telemetrySummary, setTelemetrySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [dashboardStats, telemetryData] = await Promise.all([
          dataService.getDashboardStats(),
          dataService.getTelemetrySummary()
        ]);
        
        setStats(dashboardStats);
        setTelemetrySummary(telemetryData && !telemetryData.isEmpty ? telemetryData : null);
        setError(null);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <EmptyState 
          title="Loading Dashboard Data"
          message="Fetching real dataset information..."
          loading={true}
          type="info"
        />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6 pb-8">
        <EmptyState 
          title="Dashboard Error"
          message={error || 'Failed to load dashboard'}
          type="error"
          actionText="Retry Loading"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const quickPrompts = [
    { 
      title: "PHM Engine Health", 
      prompt: "Show me the average MGT and torque from the PHM helicopter engine dataset", 
      icon: Activity
    },
    { 
      title: "Maintenance Analysis", 
      prompt: "What are the most common maintenance problem types?", 
      icon: Wrench
    },
    { 
      title: "Component Overview", 
      prompt: "List all available helicopter components", 
      icon: Database
    },
    { 
      title: "Helicopter Fleet", 
      prompt: "Show all helicopters in the database", 
      icon: Plane
    },
  ];

  // Create health chart data from telemetry summary
  const healthData = telemetrySummary ? [
    { name: 'Healthy', value: telemetrySummary.healthy_observations || 0, fill: 'rgb(34 197 94)' },
    { name: 'Faulty', value: telemetrySummary.faulty_observations || 0, fill: 'rgb(239 68 68)' }
  ] : [];

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Banner */}
      <div className="card-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 text-xs font-mono mb-3">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-gold"></span>
              REAL DATASET INTELLIGENCE ACTIVE
            </div>
            <h1 className="text-2xl font-bold text-foreground font-mono tracking-tight">
              HeliXpert Analytics Dashboard
            </h1>
            <p className="text-sm text-muted mt-1 max-w-2xl">
              Real-time analysis of helicopter datasets: PHM engine health, maintenance logbooks, and component references — all 100% offline.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('ai-analyst')}
            className="btn-primary flex items-center space-x-2"
          >
            <Bot className="w-5 h-5" />
            <span>Launch AI Analyst</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Helicopters */}
        <div className="metric-card">
          <div>
            <span className="metric-label">Helicopters Loaded</span>
            <div className="metric-value">{typeof stats.helicopters === 'number' ? stats.helicopters : stats.helicopters}</div>
            <span className="text-xs text-success-light dark:text-success-dark font-mono flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Real Dataset
            </span>
          </div>
          <div className="metric-icon">
            <Plane className="w-6 h-6" />
          </div>
        </div>

        {/* Telemetry Observations */}
        <div className="metric-card">
          <div>
            <span className="metric-label">PHM Engine Data</span>
            <div className="metric-value">
              {typeof stats.telemetry_observations === 'number' ? 
                stats.telemetry_observations.toLocaleString() : 
                stats.telemetry_observations
              }
            </div>
            <span className="text-xs text-muted font-mono mt-1 block">Turboshaft Health Records</span>
          </div>
          <div className="metric-icon">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Maintenance Records */}
        <div className="metric-card">
          <div>
            <span className="metric-label">Maintenance Records</span>
            <div className="metric-value">
              {typeof stats.maintenance_records === 'number' ? 
                stats.maintenance_records.toLocaleString() : 
                stats.maintenance_records
              }
            </div>
            <span className="text-xs text-info-light dark:text-info-dark font-mono flex items-center gap-1 mt-1">
              <Wrench className="w-3.5 h-3.5" /> Annotated Logbook
            </span>
          </div>
          <div className="metric-icon">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* Fault Observations */}
        <div className="metric-card">
          <div>
            <span className="metric-label">Fault Observations</span>
            <div className="metric-value">
              {typeof stats.fault_observations === 'number' ? 
                stats.fault_observations.toLocaleString() : 
                stats.fault_observations || 0
              }
            </div>
            <span className="text-xs text-error-light dark:text-error-dark font-mono mt-1 block">PHM Fault Labels</span>
          </div>
          <div className="metric-icon">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick AI Prompts Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold font-mono text-foreground uppercase tracking-wider flex items-center space-x-2">
            <Bot className="w-4 h-4 text-primary-500" />
            <span>AI Analyst Quick Prompts</span>
          </h3>
          <span className="text-xs text-muted font-mono">Click to analyze database</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickPrompts.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectQuickPrompt(qp.prompt)}
                className="card-premium text-left transition-all duration-200 hover:shadow-gold-glow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 text-primary-500" />
                  <ArrowRight className="w-4 h-4 text-muted" />
                </div>
                <h4 className="font-semibold text-sm text-foreground mb-1">{qp.title}</h4>
                <p className="text-xs text-muted line-clamp-2">"{qp.prompt}"</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Distribution Chart */}
        {healthData.length > 0 && (
          <div className="lg:col-span-2 card-premium p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-mono text-foreground">Engine Health Distribution</h3>
                <p className="text-xs text-muted">PHM helicopter turboshaft engine dataset</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-primary-500/10 text-primary-500 font-mono text-xs border border-primary-500/20">
                Real Data
              </span>
            </div>

            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success-light dark:bg-success-dark"></div>
                <span className="text-muted">Healthy: {healthData[0]?.value.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-error-light dark:bg-error-dark"></div>
                <span className="text-muted">Faulty: {healthData[1]?.value.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Datasets Summary */}
        <div className="card-premium p-5 space-y-4">
          <h3 className="text-base font-bold font-mono text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-500" />
            Loaded Datasets
          </h3>
          
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted">Helicopters</span>
                <span className="text-sm font-bold gold-accent font-mono">{stats.helicopters || 0}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                <div className="h-full bg-primary-500" style={{ width: stats.helicopters > 0 ? '100%' : '0%' }}></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted">Telemetry</span>
                <span className="text-sm font-bold gold-accent font-mono">
                  {typeof stats.telemetry_observations === 'number' ? (stats.telemetry_observations / 1000).toFixed(0) + 'K' : '0'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                <div className="h-full bg-success-light dark:bg-success-dark" style={{ width: stats.telemetry_observations > 0 ? '100%' : '0%' }}></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted">Maintenance</span>
                <span className="text-sm font-bold gold-accent font-mono">
                  {typeof stats.maintenance_records === 'number' ? (stats.maintenance_records / 1000).toFixed(1) + 'K' : '0'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                <div className="h-full bg-info-light dark:bg-info-dark" style={{ width: stats.maintenance_records > 0 ? '100%' : '0%' }}></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted">Fault Records</span>
                <span className="text-sm font-bold gold-accent font-mono">
                  {typeof stats.fault_observations === 'number' ? (stats.fault_observations / 1000).toFixed(0) + 'K' : '0'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                <div className="h-full bg-error-light dark:bg-error-dark" style={{ width: stats.fault_observations > 0 ? '100%' : '0%' }}></div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('datasets')}
            className="w-full btn-secondary text-xs flex items-center justify-center gap-2"
          >
            <span>Manage Datasets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
}
