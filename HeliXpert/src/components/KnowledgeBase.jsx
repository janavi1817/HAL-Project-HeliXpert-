import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import EmptyState from './EmptyState';
import { BookOpen, Search, FileText, Tag, Upload, Database, CheckCircle2 } from 'lucide-react';

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await dataService.getDocuments();
      
      if (response && !response.isEmpty) {
        setDocs(Array.isArray(response) ? response : []);
      } else {
        setDocs([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load knowledge base');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      // Reload documents after successful upload
      await loadDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const filtered = docs.filter(d => {
    const searchLower = search.toLowerCase();
    return (
      d.filename?.toLowerCase().includes(searchLower) ||
      d.title?.toLowerCase().includes(searchLower) ||
      d.content?.toLowerCase().includes(searchLower) ||
      d.metadata?.keywords?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <EmptyState 
          title="Loading Knowledge Base"
          message="Fetching technical documents and manuals..."
          loading={true}
          type="info"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="card-premium p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-500" /> 
            Technical Documentation & Knowledge Base
          </h2>
          <p className="text-xs text-muted font-mono mt-0.5">
            Local RAG-powered document search across Flight Manuals (AFM), Maintenance Manuals (TM), and IPC Catalogs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search manuals, SOPs, IPC codes..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface border border-border text-foreground placeholder-muted text-xs font-mono focus:outline-none focus:border-primary-500"
            />
          </div>

          <label className="btn-primary cursor-pointer flex items-center gap-2 text-sm">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload'}
            <input
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card">
          <div>
            <span className="metric-label">Total Documents</span>
            <div className="metric-value">{docs.length}</div>
          </div>
          <div className="metric-icon">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <span className="metric-label">Search Results</span>
            <div className="metric-value">{filtered.length}</div>
          </div>
          <div className="metric-icon">
            <Search className="w-5 h-5" />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <span className="metric-label">RAG System</span>
            <div className="text-sm font-bold text-success-light dark:text-success-dark font-mono flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Active
            </div>
          </div>
          <div className="metric-icon">
            <Database className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Documents List */}
      {error && (
        <EmptyState 
          title="Error Loading Documents"
          message={error}
          type="error"
          actionText="Retry"
          onAction={loadDocuments}
        />
      )}

      {!error && docs.length === 0 && (
        <EmptyState 
          title="No Documents Uploaded"
          message="Upload technical manuals, maintenance procedures, or flight operation handbooks to build your knowledge base."
          type="info"
          icon={BookOpen}
          actionText="Upload Document"
          onAction={() => document.querySelector('input[type="file"]').click()}
        />
      )}

      {!error && filtered.length === 0 && docs.length > 0 && (
        <EmptyState 
          title="No Search Results"
          message={`No documents match "${search}". Try different keywords.`}
          type="info"
          icon={Search}
        />
      )}

      {!error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((doc, idx) => (
            <div key={doc.id || idx} className="card-premium p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-primary-500/10 text-primary-500 border border-primary-500/20 font-mono font-bold text-xs">
                  {doc.doc_type || doc.metadata?.type || 'MANUAL'}
                </span>
                <span className="font-mono text-xs text-muted">
                  {doc.section || doc.metadata?.section || 'General'}
                </span>
              </div>

              <h3 className="text-base font-bold text-foreground font-mono">
                {doc.title || doc.filename || 'Untitled Document'}
              </h3>
              
              <p className="text-xs text-muted leading-relaxed font-sans bg-surface-variant/50 p-3 rounded-xl border border-border">
                {doc.content || doc.chunk_text || 'No content preview available.'}
              </p>

              {(doc.keywords || doc.metadata?.keywords) && (
                <div className="flex items-center space-x-2 text-[11px] font-mono text-muted">
                  <Tag className="w-3.5 h-3.5 text-primary-500" />
                  <span>Keywords: {doc.keywords || doc.metadata?.keywords}</span>
                </div>
              )}

              {doc.page_number && (
                <div className="text-[11px] font-mono text-muted">
                  Page: {doc.page_number}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
