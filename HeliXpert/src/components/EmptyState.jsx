import React from 'react';
import { Database, AlertCircle, Loader, RefreshCw } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = Database,
  title = "Dataset Not Loaded",
  message = "The required dataset has not been imported.",
  actionText = "Go to Dataset Management",
  onAction = null,
  loading = false,
  type = "warning" // "warning", "error", "info"
}) {
  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          iconColor: 'text-red-500',
          bgColor: 'bg-red-500/5',
          borderColor: 'border-red-500/20'
        };
      case 'info':
        return {
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-500/5', 
          borderColor: 'border-blue-500/20'
        };
      default:
        return {
          iconColor: 'text-primary-500',
          bgColor: 'bg-primary-500/5',
          borderColor: 'border-primary-500/20'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`card-premium p-12 text-center ${styles.bgColor} border ${styles.borderColor}`}>
      <div className="max-w-md mx-auto">
        {loading ? (
          <Loader className={`w-16 h-16 mx-auto mb-4 ${styles.iconColor} animate-spin`} />
        ) : (
          <Icon className={`w-16 h-16 mx-auto mb-4 ${styles.iconColor}`} />
        )}
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {title}
        </h3>
        
        <p className="text-muted mb-6 leading-relaxed">
          {message}
        </p>
        
        {onAction && actionText && !loading && (
          <button
            onClick={onAction}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{actionText}</span>
          </button>
        )}
        
        {loading && (
          <p className="text-sm text-muted">
            Loading dataset...
          </p>
        )}
      </div>
    </div>
  );
}