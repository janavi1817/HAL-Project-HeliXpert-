import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LayoutDashboard, 
  Bot, 
  Plane, 
  Cpu, 
  Activity, 
  AlertTriangle, 
  Wrench, 
  Camera, 
  Settings,
  ShieldCheck,
  Radio,
  Sun,
  Moon
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, selectedHelicopterId }) {
  const { theme, toggleTheme } = useTheme();
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai-analyst', label: 'AI Analyst', icon: Bot, badge: 'Real Data' },
    { id: 'helicopters', label: 'Helicopters', icon: Plane },
    { id: 'components', label: 'Components', icon: Cpu },
    { id: 'parameters', label: 'Telemetry & Params', icon: Activity },
    { id: 'faults', label: 'Faults & Alerts', icon: AlertTriangle, badgeColor: 'status-error' },
    { id: 'maintenance', label: 'Maintenance Log', icon: Wrench },
    { id: 'datasets', label: 'Dataset Management', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-400 to-primary-600 flex items-center justify-center shadow-gold-glow">
            <Radio className="w-6 h-6 text-white animate-pulse-gold" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground tracking-wider font-mono">HeliXpert</h1>
            <span className="text-xs gold-accent font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block animate-pulse-gold"></span>
              REAL DATA INTEL
            </span>
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="mx-3 my-3 p-2.5 rounded-lg glass-panel flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-foreground">
          <ShieldCheck className="w-4 h-4 text-success-light dark:text-success-dark" />
          <span className="font-mono">Local Datasets</span>
        </div>
        <span className="px-1.5 py-0.5 rounded status-success font-mono font-semibold text-[10px]">
          100% OFFLINE
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-gold">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500/15 text-primary-500 border-l-4 border-primary-500 shadow-gold-glow/30'
                  : 'text-muted hover:text-foreground hover:bg-surface-variant'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-500' : 'text-muted'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  item.badgeColor || 'bg-primary-500/10 text-primary-500 border border-primary-500/20'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Build Version */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-variant hover:bg-primary-500/10 transition-all duration-200 text-sm"
        >
          <div className="flex items-center space-x-2">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-muted">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
        </button>
        
        {/* Version Info */}
        <div className="text-xs text-muted font-mono flex items-center justify-between px-3">
          <span>v1.0.0-premium</span>
          <span className="text-[10px] gold-accent">Real Datasets</span>
        </div>
      </div>
    </aside>
  );
}
