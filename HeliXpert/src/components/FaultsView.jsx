import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import EmptyState from './EmptyState';
import { AlertTriangle, ShieldAlert, Database, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function FaultsView() {
  const [faultsSummary, setFaultsSummary] = useState(null);
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFaults = async () => {
      setLoading(true);
      const [summary, faultList] = await Promise.all([
        dataService.getFaultsSummary(),
        dataService.getFaults()
      ]);
      
      if (summary && !summary.isEmpty) {
        setFaultsSummary(summary);
      }
      if (faultList && !faultList.isEmpty) {
        setFaults(Array.isArray(faultList) ? faultList : faultList.data || []);
      }
      setLoading(false);
    };
    loadFaults();
  }, []);

  if (loading) {
    return <EmptyState title="Loading Fault Data" message="Fetching fault and health information..." loading={true} type="info" />;
  }

  if (!faultsSummary || (faults.length === 0 && faultsSummary.total_faults === 0)) {
    return (
      <EmptyState 
        title="No Fault Data"
        message="Fault/health dataset not available. PHM helicopter engine dataset needs to be loaded to view fault observations."
        type="warning"
      />
    );
  }

  // Prepare chart data
  const chartData = faults.slice(0, 10).map(f => ({
    name: f.fault_type || f.dataset_id || 'Unknown',
    count: f.count || 1,
    health: f.health_state
  }));

  return (
    <div className="space-y-6 pb-8">
      {/* Header Bar */}
      <div className="card-premium p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 gold-accent" /> Fault & Health Monitoring
          </h2>
          <p className="text-xs text-muted font-mono mt-0.5">
            PHM helicopter turboshaft engine health observations with documented fault labels.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Database className="w-4 h-4 text-primary-500" />
          <span className="font-mono text-muted">Real Dataset</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <div>
            <span className="metric-label">Total Observations</span>
            <div className="metric-value">{faultsSummary.total_faults?.toLocaleString() || 0}</div>
          </div>
          <div className="metric-icon">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <span className="metric-label">Faulty Records</span>
            <div className="metric-value text-error-light dark:text-error-dark">
              {faultsSummary.faulty_count?.toLocaleString() || 0}
            </div>
          </div>
          <div className="metric-icon bg-error-light/10 dark:bg-error-dark/10">
            <AlertTriangle className="w-6 h-6 text-error-light dark:text-error-dark" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <span className="metric-label">Healthy Records</span>
            <div className="metric-value text-success-light dark:text-success-dark">
              {faultsSummary.healthy_count?.toLocaleString() || 0}
            </div>
          </div>
          <div className="metric-icon bg-success-light/10 dark:bg-success-dark/10">
            <ShieldAlert className="w-6 h-6 text-success-light dark:text-success-dark" />
          </div>
        </div>
      </div>

      {/* Fault Distribution Chart */}
      {chartData.length > 0 && (
        <div className="card-premium p-5 space-y-4">
          <h3 className="text-sm font-bold font-mono text-foreground uppercase tracking-wider">
            Fault Distribution by Type
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="rgb(var(--muted))" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgb(var(--muted))" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(var(--surface))', 
                    borderColor: 'rgb(var(--border))',
                    borderRadius: '8px' 
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.health === 'Faulty' ? 'rgb(239 68 68)' : 'rgb(34 197 94)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Fault Summary Table */}
      {faults.length > 0 && (
        <div className="card-premium overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-variant font-mono text-xs text-muted font-bold">
            Fault Summary by Dataset and Type
          </div>
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-surface-variant text-muted border-b border-border uppercase">
              <tr>
                <th className="p-3">Dataset</th>
                <th className="p-3">Fault Type</th>
                <th className="p-3">Health State</th>
                <th className="p-3">Observation Count</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {faults.map((f, idx) => (
                <tr key={idx} className="hover:bg-surface-variant/40">
                  <td className="p-3 gold-accent font-bold">{f.dataset_id}</td>
                  <td className="p-3">{f.fault_type || 'N/A'}</td>
                  <td className="p-3">
                    <span className={f.health_state === 'Faulty' ? 'status-error' : 'status-success'}>
                      {f.health_state}
                    </span>
                  </td>
                  <td className="p-3 font-bold">{f.count?.toLocaleString() || 0}</td>
                  <td className="p-3 text-xs text-muted">PHM Dataset Label</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Important Note */}
      <div className="card-premium p-4 bg-primary-500/5 border-primary-500/20">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-mono font-bold text-sm text-foreground mb-1">About This Data</h4>
            <p className="text-xs text-muted leading-relaxed">
              Fault observations are from the <strong>PHM 2024 Helicopter Turboshaft Engine Health Dataset</strong>. 
              These are documented fault labels from the dataset, not AI-detected anomalies. 
              The "faulty" field indicates health state: 0 = Healthy, 1 = Faulty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
