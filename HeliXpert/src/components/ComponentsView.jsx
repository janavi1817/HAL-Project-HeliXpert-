import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import EmptyState from './EmptyState';
import { Cpu, Search, Database } from 'lucide-react';

export default function ComponentsView() {
  const [components, setComponents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComponents = async () => {
      setLoading(true);
      const data = await dataService.getComponents();
      if (data && !data.isEmpty) {
        setComponents(Array.isArray(data) ? data : data.data || []);
      } else {
        setComponents([]);
      }
      setLoading(false);
    };
    loadComponents();
  }, []);

  if (loading) {
    return <EmptyState title="Loading Components" message="Fetching component data..." loading={true} type="info" />;
  }

  if (components.length === 0) {
    return (
      <EmptyState 
        title="No Component Data"
        message="Component/IPC dataset not loaded. This is a general helicopter component taxonomy reference."
        type="warning"
      />
    );
  }

  // Get unique types
  const types = ['All', ...new Set(components.map(c => c.component_type || 'Unknown').filter(Boolean))];

  const filtered = components.filter(c => {
    const matchesSearch = 
      (c.component_name || '').toLowerCase().includes(search.toLowerCase()) || 
      (c.component_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || (c.component_type || '') === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Controls */}
      <div className="card-premium p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search component name, ID, or description..."
            className="input-primary w-full pl-9 pr-4"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-primary px-3 py-2 text-xs"
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex items-center gap-2 text-xs">
            <Database className="w-4 h-4 text-primary-500" />
            <span className="font-mono text-muted">Real Dataset</span>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted">
        Showing {filtered.length} of {components.length} components
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => (
          <div key={c.component_id} className="card-premium space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-primary-500 px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/20">
                {c.component_id}
              </span>
              <span className="status-info text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                {c.source_type || 'Reference'}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground font-mono mb-1">
                {c.component_name || 'Unknown Component'}
              </h3>
              <p className="text-xs text-muted font-mono">
                Type: <span className="text-foreground">{c.component_type || 'N/A'}</span>
              </p>
            </div>

            <p className="text-xs text-muted leading-relaxed bg-surface-variant/50 p-3 rounded-xl border border-border">
              {c.description || 'No description available'}
            </p>

            {c.helicopter_id && (
              <div className="pt-2 border-t border-border">
                <span className="text-xs text-muted font-mono">
                  Associated: <span className="gold-accent">{c.helicopter_id}</span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
