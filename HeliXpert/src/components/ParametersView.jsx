import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import EmptyState from './EmptyState';
import { Activity, Database, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function ParametersView() {
  const [telemetrySummary, setTelemetrySummary] = useState(null);
  const [telemetryTrends, setTelemetryTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParam, setSelectedParam] = useState('mgt');

  useEffect(() => {
    const loadTelemetry = async () => {
      setLoading(true);
      const [summary, trends] = await Promise.all([
        dataService.getTelemetrySummary(),
        dataService.getTelemetryTrends(200)
      ]);
      
      if (summary && !summary.isEmpty) {
        setTelemetrySummary(summary);
      }
      if (trends && !trends.isEmpty) {
        setTelemetryTrends(Array.isArray(trends) ? trends : trends.data || []);
      }
      setLoading(false);
    };
    loadTelemetry();
  }, []);

  if (loading) {
    return <EmptyState title="Loading Telemetry Data" message="Fetching sensor parameters..." loading={true} type="info" />;
  }

  if (!telemetrySummary || telemetrySummary.message) {
    return (
      <EmptyState 
        title="No Telemetry Data"
        message="PHM helicopter engine telemetry dataset not loaded. Import the PHM dataset to view sensor parameters."
        type="warning"
      />
    );
  }

  const paramConfigs = {
    mgt: { label: 'Mean Gas Temperature (MGT)', color: '#FFCC33', unit: '°C' },
    oat: { label: 'Outside Air Temperature (OAT)', color: '#60a5fa', unit: '°C' },
    trq_measured: { label: 'Measured Torque', color: '#34d399', unit: '' },
    np: { label: 'Power Turbine Speed (Np)', color: '#f59e0b', unit: '%' },
    ng: { label: 'Gas Generator Speed (Ng)', color: '#a78bfa', unit: '%' },
  };

  const currentCfg = paramConfigs[selectedParam];

  // Prepare chart data
  const chartData = telemetryTrends.map((t, idx) => ({
    index: idx,
    value: t[selectedParam],
    faulty: t.faulty
  })).filter(d => d.value !== null && d.value !== undefined);

  return (
    <div className="space-y-6 pb-8">
      {/* Header Bar */}
      <div className="card-premium p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 gold-accent" /> Telemetry & Engine Parameters
          </h2>
          <p className="text-xs text-muted font-mono mt-0.5">
            PHM 2024 Helicopter Turboshaft Engine Health Monitoring Dataset
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Database className="w-4 h-4 text-primary-500" />
          <span className="font-mono text-muted">Real Dataset</span>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metric-card">
          <div>
            <span className="metric-label">Total Observations</span>
            <div className="metric-value">{telemetrySummary.total_observations?.toLocaleString() || 0}</div>
          </div>
          <div className="metric-icon">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <span className="metric-label">Avg MGT</span>
            <div className="metric-value">{telemetrySummary.avg_mean_gas_temp?.toFixed(2) || 'N/A'} °C</div>
          </div>
          <div className="metric-icon">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <span className="metric-label">Healthy Records</span>
            <div className="metric-value text-success-light dark:text-success-dark">
              {telemetrySummary.healthy_observations?.toLocaleString() || 0}
            </div>
          </div>
          <div className="metric-icon bg-success-light/10 dark:bg-success-dark/10">
            <Activity className="w-6 h-6 text-success-light dark:text-success-dark" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <span className="metric-label">Faulty Records</span>
            <div className="metric-value text-error-light dark:text-error-dark">
              {telemetrySummary.faulty_observations?.toLocaleString() || 0}
            </div>
          </div>
          <div className="metric-icon bg-error-light/10 dark:bg-error-dark/10">
            <Activity className="w-6 h-6 text-error-light dark:text-error-dark" />
          </div>
        </div>
      </div>

      {/* Parameter Selector */}
      <div className="card-premium p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-muted">Select Parameter:</span>
          {Object.keys(paramConfigs).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedParam(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                selectedParam === key
                  ? 'bg-primary-500 text-white shadow-gold-glow'
                  : 'bg-surface-variant text-muted border border-border hover:text-foreground'
              }`}
            >
              {paramConfigs[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Trend Chart */}
      {chartData.length > 0 && (
        <div className="card-premium p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-foreground">
              {currentCfg.label} Trend Over Observations
            </h3>
            <span className="text-xs font-mono text-muted">
              Showing {chartData.length} samples
            </span>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis 
                  dataKey="index" 
                  stroke="rgb(var(--muted))" 
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Observation Index', position: 'insideBottom', offset: -5, style: { fontSize: 11 } }}
                />
                <YAxis 
                  stroke="rgb(var(--muted))" 
                  tick={{ fontSize: 11 }}
                  label={{ value: `${currentCfg.label} ${currentCfg.unit}`, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(var(--surface))', 
                    borderColor: 'rgb(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(val) => [`${val}${currentCfg.unit}`, currentCfg.label]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={currentCfg.color} 
                  strokeWidth={2}
                  dot={false}
                  name={currentCfg.label}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Parameter Summary Table */}
      <div className="card-premium p-5 space-y-4">
        <h3 className="text-sm font-bold font-mono text-foreground uppercase tracking-wider">
          Parameter Statistics Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
            <div className="flex justify-between mb-1">
              <span className="text-muted">Avg Torque:</span>
              <span className="text-foreground font-bold">{telemetrySummary.avg_torque?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
            <div className="flex justify-between mb-1">
              <span className="text-muted">Avg Outside Air Temp:</span>
              <span className="text-foreground font-bold">{telemetrySummary.avg_outside_air_temp?.toFixed(2) || 'N/A'} °C</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
            <div className="flex justify-between mb-1">
              <span className="text-muted">Avg Mean Gas Temp:</span>
              <span className="text-foreground font-bold gold-accent">{telemetrySummary.avg_mean_gas_temp?.toFixed(2) || 'N/A'} °C</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
            <div className="flex justify-between mb-1">
              <span className="text-muted">Avg Power Turbine Speed:</span>
              <span className="text-foreground font-bold">{telemetrySummary.avg_power_turbine_speed?.toFixed(2) || 'N/A'} %</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Info */}
      <div className="card-premium p-4 bg-primary-500/5 border-primary-500/20">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-mono font-bold text-sm text-foreground mb-1">Dataset Information</h4>
            <p className="text-xs text-muted leading-relaxed">
              <strong>PHM 2024 Helicopter Turboshaft Engine Health Dataset</strong> - Real sensor measurements from helicopter turbine engines including torque, temperature, pressure, and speed parameters with documented health labels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
