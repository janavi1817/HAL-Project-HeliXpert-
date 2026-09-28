import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import EmptyState from './EmptyState';
import { Wrench, Search, Database, AlertCircle } from 'lucide-react';

export default function MaintenanceView() {
  const [maintenanceSummary, setMaintenanceSummary] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const loadMaintenance = async () => {
      setLoading(true);
      const summary = await dataService.getMaintenanceSummary();
      if (summary && !summary.isEmpty) {
        setMaintenanceSummary(Array.isArray(summary) ? summary : summary.data || []);
      }
      setLoading(false);
    };
    loadMaintenance();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.trim().length < 2) return;
    setSearching(true);
    const results = await dataService.searchMaintenance(searchQuery);
    if (results && !results.isEmpty) {
      setSearchResults(Array.isArray(results) ? results : results.data || []);
    } else {
      setSearchResults([]);
    }
    setSearching(false);
  };

  if (loading) {
    return <EmptyState title="Loading Maintenance Data" message="Fetching maintenance records..." loading={true} type="info" />;
  }

  if (maintenanceSummary.length === 0) {
    return (
      <EmptyState 
        title="No Maintenance Data"
        message="Annotated maintenance logbook dataset not loaded. Import the aviation maintenance dataset to view records."
        type="warning"
      />
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="card-premium p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
            <Wrench className="w-5 h-5 gold-accent" /> Maintenance Log Analysis
          </h2>
          <p className="text-xs text-muted font-mono mt-0.5">
            Annotated aviation maintenance logbook with problem/action/cause analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Database className="w-4 h-4 text-primary-500" />
          <span className="font-mono text-muted">Real Dataset</span>
        </div>
      </div>

      {/* Important Note */}
      <div className="card-premium p-4 bg-warning-light/5 dark:bg-warning-dark/5 border-warning-light/20 dark:border-warning-dark/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning-light dark:text-warning-dark flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-mono font-bold text-sm text-foreground mb-1">Dataset Information</h4>
            <p className="text-xs text-muted leading-relaxed">
              This is a <strong>general aviation maintenance reference dataset</strong>. 
              Records may not be helicopter-specific and should be used as reference material only.
            </p>
          </div>
        </div>
      </div>

      {/* Search Box */}
      <div className="card-premium p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search maintenance records (problem, action, cause, location)..."
              className="input-primary w-full pl-9 pr-4"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchQuery.length < 2 || searching}
            className="btn-primary"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div>
          <h3 className="text-sm font-bold font-mono text-foreground mb-3">
            Search Results ({searchResults.length})
          </h3>
          <div className="space-y-3">
            {searchResults.map((record, idx) => (
              <div key={idx} className="card-premium p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="status-info px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                        {record.PROBLEM_TYPE || 'General'}
                      </span>
                      {record.LOCATION && (
                        <span className="text-xs text-muted font-mono">
                          Location: {record.LOCATION}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted font-mono font-semibold block mb-1">Problem:</span>
                        <p className="text-foreground">{record.PROBLEM || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted font-mono font-semibold block mb-1">Action:</span>
                        <p className="text-foreground">{record.ACTION || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted font-mono font-semibold block mb-1">Cause:</span>
                        <p className="text-foreground">{record.CAUSE || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Summary by Problem Type */}
      <div>
        <h3 className="text-sm font-bold font-mono text-foreground mb-3">
          Top Problem Types ({maintenanceSummary.length})
        </h3>
        <div className="card-premium overflow-hidden">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-surface-variant text-muted border-b border-border uppercase">
              <tr>
                <th className="p-3">Problem Type</th>
                <th className="p-3">Occurrence Count</th>
                <th className="p-3">Common Locations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {maintenanceSummary.map((record, idx) => (
                <tr key={idx} className="hover:bg-surface-variant/40">
                  <td className="p-3 font-bold">{record.PROBLEM_TYPE || 'Unknown'}</td>
                  <td className="p-3 gold-accent font-bold">{record.count?.toLocaleString() || 0}</td>
                  <td className="p-3 text-muted text-[11px]">{record.common_locations || 'Various'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
