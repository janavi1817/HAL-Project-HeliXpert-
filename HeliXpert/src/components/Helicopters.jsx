import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import EmptyState from './EmptyState';
import { 
  Plane, 
  Search, 
  Filter, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Grid, 
  List,
  Database
} from 'lucide-react';

export default function Helicopters({ onSelectHelicopter }) {
  const [helicopters, setHelicopters] = useState([]);
  const [search, setSearch] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHelicopters = async () => {
      setLoading(true);
      const data = await dataService.getHelicopters();
      if (data && !data.isEmpty) {
        setHelicopters(Array.isArray(data) ? data : []);
      } else {
        setHelicopters([]);
      }
      setLoading(false);
    };
    loadHelicopters();
  }, []);

  if (loading) {
    return <EmptyState title="Loading Helicopters" message="Fetching helicopter data from database..." loading={true} type="info" />;
  }

  if (helicopters.length === 0) {
    return (
      <EmptyState 
        title="No Helicopter Data"
        message="Helicopter dataset not loaded. Import the helicopter master dataset to view helicopter records."
        type="warning"
      />
    );
  }

  // Get unique manufacturers
  const manufacturers = ['All', ...new Set(helicopters.map(h => h.manufacturer || 'Unknown').filter(Boolean))];

  const filtered = helicopters.filter(h => {
    const matchesSearch = 
      (h.model || '').toLowerCase().includes(search.toLowerCase()) ||
      (h.helicopter_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (h.manufacturer || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesManufacturer = filterManufacturer === 'All' || (h.manufacturer || '') === filterManufacturer;

    return matchesSearch && matchesManufacturer;
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header Controls & Filters */}
      <div className="card-premium p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search model, ID, manufacturer..."
            className="input-primary w-full pl-9 pr-4"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Manufacturer filter */}
          <select
            value={filterManufacturer}
            onChange={(e) => setFilterManufacturer(e.target.value)}
            className="input-primary px-3 py-2 text-xs"
          >
            {manufacturers.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Grid / List Toggle */}
          <div className="flex items-center rounded-lg bg-surface p-1 border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-primary-500/15 text-primary-500' : 'text-muted'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-primary-500/15 text-primary-500' : 'text-muted'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>Showing {filtered.length} of {helicopters.length} helicopters</span>
        <span className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary-500" />
          Real Dataset
        </span>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((h) => (
            <div
              key={h.helicopter_id}
              onClick={() => onSelectHelicopter(h.helicopter_id)}
              className="card-premium cursor-pointer transition-all hover:shadow-gold-glow"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-500/10 text-primary-500 border border-primary-500/20">
                  {h.helicopter_id}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold status-success">
                  {h.data_status || 'Active'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-foreground font-mono tracking-tight mb-1">
                {h.model || 'Unknown Model'}
              </h3>
              <p className="text-xs text-muted mb-4">
                {h.manufacturer || 'Unknown'} • {h.variant || 'Standard'} • {h.helicopter_type || 'Unknown Type'}
              </p>

              {/* Technical Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-surface-variant/50 p-3 rounded-xl border border-border">
                <div>
                  <span className="text-muted block text-[10px]">MANUFACTURER</span>
                  <span className="text-foreground font-semibold">{h.manufacturer || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">TYPE</span>
                  <span className="text-foreground font-semibold">{h.helicopter_type || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">VARIANT</span>
                  <span className="text-foreground font-semibold">{h.variant || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">COUNTRY</span>
                  <span className="text-foreground font-semibold">{h.country || 'N/A'}</span>
                </div>
              </div>

              {/* Footer Link */}
              <div className="flex items-center justify-between pt-3 text-xs font-mono gold-accent font-semibold">
                <span>View Details</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-variant text-muted border-b border-border uppercase">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Manufacturer</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Variant</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filtered.map((h) => (
                  <tr key={h.helicopter_id} className="hover:bg-surface-variant/50 transition">
                    <td className="p-3 font-bold gold-accent">{h.helicopter_id}</td>
                    <td className="p-3 font-bold">{h.model || 'Unknown'}</td>
                    <td className="p-3 text-muted">{h.manufacturer || 'Unknown'}</td>
                    <td className="p-3">{h.helicopter_type || 'N/A'}</td>
                    <td className="p-3">{h.variant || 'N/A'}</td>
                    <td className="p-3">{h.country || 'N/A'}</td>
                    <td className="p-3">
                      <span className="status-success px-2 py-0.5 rounded text-[10px]">
                        {h.data_status || 'Active'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => onSelectHelicopter(h.helicopter_id)}
                        className="btn-ghost px-2.5 py-1"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
