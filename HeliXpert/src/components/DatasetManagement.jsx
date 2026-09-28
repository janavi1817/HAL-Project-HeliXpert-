import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import EmptyState from './EmptyState';
import { Database, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Package } from 'lucide-react';

export default function DatasetManagement() {
  const [datasets, setDatasets] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatasetStatus();
  }, []);

  const loadDatasetStatus = async () => {
    setLoading(true);
    const status = await dataService.getDatasetsStatus();
    setDatasets(status);
    setLoading(false);
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await dataService.triggerDatasetImport();
      setImportResult(result);
      // Reload dataset status after import
      await loadDatasetStatus();
    } catch (error) {
      setImportResult({ status: 'error', message: error.message });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <EmptyState title="Loading Dataset Status" message="Fetching dataset information..." loading={true} type="info" />;
  }

  const datasetInfo = [
    {
      key: 'helicopters',
      name: 'Helicopter Master Reference',
      type: 'Helicopter Intelligence',
      description: 'Real helicopter specifications and reference data',
      source: 'Multiple verified aviation sources',
      helicopter_specific: true
    },
    {
      key: 'components',
      name: 'Component Reference Taxonomy',
      type: 'Helicopter Components',
      description: 'General helicopter component taxonomy',
      source: 'Reference Taxonomy',
      helicopter_specific: true
    },
    {
      key: 'maintenance',
      name: 'Annotated Maintenance Logbook',
      type: 'Aviation Maintenance',
      description: 'Real annotated aviation maintenance records with problem/action/cause',
      source: 'Aviation Maintenance Dataset',
      helicopter_specific: false,
      note: 'General aviation reference — not verified as helicopter-specific'
    },
    {
      key: 'phm_engine',
      name: 'PHM 2024 Helicopter Engine Health',
      type: 'Helicopter Engine Health',
      description: 'Real helicopter turboshaft engine health monitoring with fault detection labels',
      source: 'PHM North America 2024',
      helicopter_specific: true
    }
  ];

  const getDatasetStats = (key) => {
    if (!datasets || !datasets.datasets || !datasets.datasets[key]) {
      return { loaded: false, records: 0 };
    }
    const ds = datasets.datasets[key];
    return { loaded: ds !== null, records: ds?.records || 0, ...ds };
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="card-premium p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 gold-accent" /> Dataset Management & Ingestion
          </h2>
          <p className="text-xs text-muted font-mono mt-0.5">
            Import and manage real helicopter datasets from local data sources
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDatasetStatus}
            className="btn-secondary flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-primary flex items-center space-x-2"
          >
            <Package className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
            <span>{importing ? 'Importing...' : 'Import Datasets'}</span>
          </button>
        </div>
      </div>

      {/* Database Status Banner */}
      {datasets && (
        <div className={`card-premium p-4 ${datasets.database_status === 'connected' ? 'bg-success-light/5 dark:bg-success-dark/5 border-success-light/20 dark:border-success-dark/20' : 'bg-error-light/5 dark:bg-error-dark/5 border-error-light/20 dark:border-error-dark/20'}`}>
          <div className="flex items-center gap-3">
            {datasets.database_status === 'connected' ? (
              <CheckCircle className="w-5 h-5 text-success-light dark:text-success-dark" />
            ) : (
              <AlertCircle className="w-5 h-5 text-error-light dark:text-error-dark" />
            )}
            <div>
              <h4 className="font-mono font-bold text-sm text-foreground">
                Database Status: {datasets.database_status === 'connected' ? 'Connected' : 'Disconnected'}
              </h4>
              <p className="text-xs text-muted">
                {datasets.database_status === 'connected' 
                  ? 'SQLite database is operational and accessible' 
                  : 'Database not found. Run dataset import to initialize.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className={`card-premium p-4 ${importResult.status === 'success' ? 'bg-success-light/5 dark:bg-success-dark/5 border-success-light/20 dark:border-success-dark/20' : 'bg-error-light/5 dark:bg-error-dark/5 border-error-light/20 dark:border-error-dark/20'}`}>
          <div className="flex items-start gap-3">
            {importResult.status === 'success' ? (
              <CheckCircle className="w-5 h-5 text-success-light dark:text-success-dark flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-error-light dark:text-error-dark flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-mono font-bold text-sm text-foreground mb-1">
                {importResult.status === 'success' ? 'Import Successful' : 'Import Failed'}
              </h4>
              <p className="text-xs text-muted">{importResult.message}</p>
              {importResult.output && (
                <pre className="mt-2 p-2 rounded bg-surface-variant/50 text-xs font-mono text-foreground overflow-x-auto">
                  {importResult.output}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dataset Cards */}
      <div className="space-y-4">
        {datasetInfo.map((info) => {
          const stats = getDatasetStats(info.key);
          
          return (
            <div key={info.key} className="card-premium p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-bold text-foreground font-mono">
                      {info.name}
                    </h3>
                    {stats.loaded ? (
                      <span className="status-success px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                        LOADED
                      </span>
                    ) : (
                      <span className="status-warning px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                        NOT LOADED
                      </span>
                    )}
                    {info.helicopter_specific ? (
                      <span className="status-info px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                        HELICOPTER DATA
                      </span>
                    ) : (
                      <span className="status-warning px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                        REFERENCE DATA
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted mb-2">{info.description}</p>
                  
                  {info.note && (
                    <p className="text-xs text-warning-light dark:text-warning-dark italic">
                      ⚠ {info.note}
                    </p>
                  )}
                </div>

                {stats.loaded && (
                  <div className="text-right">
                    <div className="metric-value text-2xl">{stats.records?.toLocaleString() || 0}</div>
                    <div className="metric-label">Records</div>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-border text-xs font-mono">
                <div>
                  <span className="text-muted block mb-1">Type:</span>
                  <span className="text-foreground font-semibold">{info.type}</span>
                </div>
                <div>
                  <span className="text-muted block mb-1">Source:</span>
                  <span className="text-foreground font-semibold">{info.source}</span>
                </div>
                <div>
                  <span className="text-muted block mb-1">Status:</span>
                  <span className={`font-semibold ${stats.loaded ? 'text-success-light dark:text-success-dark' : 'text-muted'}`}>
                    {stats.loaded ? `${stats.records?.toLocaleString() || 0} records` : 'Not imported'}
                  </span>
                </div>
              </div>

              {/* Additional Stats */}
              {stats.loaded && stats.columns && (
                <div className="text-xs text-muted font-mono pt-2 border-t border-border">
                  Columns: {stats.columns}
                  {stats.datasets && <span className="ml-4">Datasets: {stats.datasets.join(', ')}</span>}
                  {stats.files_processed && <span className="ml-4">Files: {stats.files_processed}/{stats.total_files}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Data Location Info */}
      <div className="card-premium p-4 bg-primary-500/5 border-primary-500/20">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-mono font-bold text-sm text-foreground mb-1">Data Storage Locations</h4>
            <div className="text-xs text-muted space-y-1 font-mono">
              <p><strong>Database:</strong> data/database/helixpert.db</p>
              <p><strong>Raw Data:</strong> data/raw/ (helicopters/, components/, maintenance/, phm_helicopter/)</p>
              <p><strong>Metadata:</strong> data/metadata/dataset_registry.json</p>
              <p><strong>All data is stored locally and never transmitted.</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
