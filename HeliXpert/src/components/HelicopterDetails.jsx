import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import EmptyState from './EmptyState';
import { 
  Plane, 
  Cpu, 
  Activity, 
  AlertTriangle, 
  Wrench, 
  ArrowLeft,
  Database,
  Info
} from 'lucide-react';

export default function HelicopterDetails({ helicopterId, onBack }) {
  const [helicopter, setHelicopter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('overview');

  useEffect(() => {
    const loadHelicopter = async () => {
      if (!helicopterId) return;
      setLoading(true);
      const data = await dataService.getHelicopter(helicopterId);
      if (data && !data.isEmpty) {
        setHelicopter(data);
      } else {
        setHelicopter(null);
      }
      setLoading(false);
    };
    loadHelicopter();
  }, [helicopterId]);

  if (loading) {
    return <EmptyState title="Loading Helicopter Details" message="Fetching data from database..." loading={true} type="info" />;
  }

  if (!helicopter || helicopter.isEmpty) {
    return (
      <div className="space-y-6">
        <EmptyState 
          title="Helicopter Not Found"
          message={`Helicopter ${helicopterId} not found in database or data not available.`}
          type="error"
          actionText="Back to Fleet"
          onAction={onBack}
        />
      </div>
    );
  }

  const heliData = helicopter.helicopter || helicopter;
  const components = helicopter.components || [];
  const telemetrySample = helicopter.telemetry_sample || [];
  const hasRelatedData = helicopter.related_data_available || false;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Plane },
    { id: 'components', label: `Components (${components.length})`, icon: Cpu },
    { id: 'telemetry', label: `Telemetry Sample (${telemetrySample.length})`, icon: Activity },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner Navigation */}
      <div className="card-premium flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-surface border border-border hover:border-primary-500/50 text-muted hover:text-primary-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="px-2.5 py-0.5 rounded bg-primary-500/10 text-primary-500 border border-primary-500/30 font-mono font-bold text-xs">
                {heliData.helicopter_id}
              </span>
              <span className="status-success px-2.5 py-0.5 rounded font-mono text-xs font-semibold">
                {heliData.data_status || 'Active'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground font-mono tracking-tight">
              {heliData.model || 'Unknown Model'}
            </h1>
            <p className="text-xs text-muted font-mono">
              {heliData.manufacturer || 'Unknown'} • {heliData.variant || 'Standard'} • {heliData.helicopter_type || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Database className="w-4 h-4 text-primary-500" />
          <span className="font-mono text-muted">Real Dataset</span>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-border overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center space-x-2 transition ${
                isActive
                  ? 'bg-primary-500/15 text-primary-500 border border-primary-500/30'
                  : 'text-muted hover:text-foreground hover:bg-surface-variant/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Renderer */}

      {/* TAB 1: OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="card-premium space-y-4">
            <h3 className="text-sm font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 gold-accent" /> Basic Information
            </h3>
            <div className="space-y-3 font-mono text-xs divide-y divide-border">
              <div className="flex justify-between pt-2">
                <span className="text-muted">Helicopter ID:</span>
                <span className="text-foreground font-semibold">{heliData.helicopter_id}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted">Model:</span>
                <span className="text-foreground font-semibold">{heliData.model || 'N/A'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted">Manufacturer:</span>
                <span className="text-foreground font-semibold">{heliData.manufacturer || 'N/A'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted">Variant:</span>
                <span className="text-foreground font-semibold">{heliData.variant || 'N/A'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted">Type:</span>
                <span className="text-foreground font-semibold">{heliData.helicopter_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted">Rotor Configuration:</span>
                <span className="text-foreground font-semibold">{heliData.rotor_configuration || 'N/A'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted">Country:</span>
                <span className="text-foreground font-semibold">{heliData.country || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Data Availability */}
          <div className="card-premium space-y-4">
            <h3 className="text-sm font-bold font-mono text-foreground uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 gold-accent" /> Available Data
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted">Components</span>
                  <span className="text-sm font-bold gold-accent font-mono">{components.length}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted">Telemetry Records</span>
                  <span className="text-sm font-bold gold-accent font-mono">{telemetrySample.length}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-variant/50 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted">Related Data Available</span>
                  <span className={`text-sm font-bold font-mono ${hasRelatedData ? 'text-success-light dark:text-success-dark' : 'text-muted'}`}>
                    {hasRelatedData ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPONENTS */}
      {activeSubTab === 'components' && (
        <div>
          {components.length > 0 ? (
            <div className="card-premium overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-surface-variant text-muted border-b border-border uppercase">
                  <tr>
                    <th className="p-3">Component ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {components.map((c, idx) => (
                    <tr key={idx} className="hover:bg-surface-variant/40">
                      <td className="p-3 font-bold gold-accent">{c.component_id}</td>
                      <td className="p-3 font-bold">{c.component_name || 'N/A'}</td>
                      <td className="p-3">{c.component_type || 'N/A'}</td>
                      <td className="p-3 text-muted">{c.description || 'No description'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState 
              title="No Components"
              message="No component data available for this helicopter in the current dataset."
              type="info"
            />
          )}
        </div>
      )}

      {/* TAB 3: TELEMETRY SAMPLE */}
      {activeSubTab === 'telemetry' && (
        <div>
          {telemetrySample.length > 0 ? (
            <div className="card-premium overflow-hidden">
              <div className="p-4 border-b border-border bg-surface-variant font-mono text-xs text-muted">
                Showing sample telemetry records from PHM helicopter engine dataset
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-surface-variant text-muted border-b border-border uppercase">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Torque</th>
                      <th className="p-3">OAT (°C)</th>
                      <th className="p-3">MGT (°C)</th>
                      <th className="p-3">IAS</th>
                      <th className="p-3">Np (%)</th>
                      <th className="p-3">Ng (%)</th>
                      <th className="p-3">Faulty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {telemetrySample.slice(0, 20).map((t, idx) => (
                      <tr key={idx} className="hover:bg-surface-variant/40">
                        <td className="p-3 text-muted">{t.id}</td>
                        <td className="p-3">{t.trq_measured?.toFixed(2) || 'N/A'}</td>
                        <td className="p-3">{t.oat?.toFixed(2) || 'N/A'}</td>
                        <td className="p-3 gold-accent font-bold">{t.mgt?.toFixed(2) || 'N/A'}</td>
                        <td className="p-3">{t.ias?.toFixed(2) || 'N/A'}</td>
                        <td className="p-3">{t.np?.toFixed(2) || 'N/A'}</td>
                        <td className="p-3">{t.ng?.toFixed(2) || 'N/A'}</td>
                        <td className="p-3">
                          <span className={t.faulty === 1 ? 'status-error' : 'status-success'}>
                            {t.faulty === 1 ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState 
              title="No Telemetry Data"
              message="No telemetry sample available for this helicopter."
              type="info"
            />
          )}
        </div>
      )}
    </div>
  );
}
