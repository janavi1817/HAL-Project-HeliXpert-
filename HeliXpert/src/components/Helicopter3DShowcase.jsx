import React, { useState } from 'react';
import Helicopter3D from './Helicopter3D';
import { Play, Pause, RotateCcw, Eye } from 'lucide-react';

export default function Helicopter3DShowcase() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [showHUD, setShowHUD] = useState(true);

  return (
    <div className="h-full flex flex-col bg-black rounded-2xl overflow-hidden border border-border">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 bg-surface/90 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground font-mono">3D Helicopter Model</h1>
          <p className="text-muted text-sm font-mono">Interactive 360° rotating helicopter visualization</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-sm font-mono ${
              autoRotate
                ? 'bg-primary-500/20 border-primary-500 text-primary-500'
                : 'border-border text-muted hover:border-primary-500/50'
            }`}
          >
            {autoRotate ? <Pause size={15} /> : <Play size={15} />}
            <span>{autoRotate ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => setHovering(!hovering)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-sm font-mono ${
              hovering
                ? 'bg-success-light/20 dark:bg-success-dark/20 border-success-light dark:border-success-dark text-success-light dark:text-success-dark'
                : 'border-border text-muted hover:border-primary-500/50'
            }`}
          >
            <RotateCcw size={15} />
            <span>{hovering ? 'Landing' : 'Hover'}</span>
          </button>

          <button
            onClick={() => setShowHUD(!showHUD)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-sm font-mono ${
              showHUD
                ? 'bg-primary-500/20 border-primary-500 text-primary-500'
                : 'border-border text-muted hover:border-primary-500/50'
            }`}
          >
            <Eye size={15} />
            <span>HUD</span>
          </button>
        </div>
      </div>

      {/* 3D Model */}
      <div className="flex-1 relative">
        <Helicopter3D
          autoRotate={autoRotate}
          hovering={hovering}
          showHUD={showHUD}
          className="h-full"
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-primary-500/30">
          <p className="text-primary-500 text-xs text-center font-mono">
            Drag to rotate · Scroll to zoom · Right-click to pan
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="p-3 bg-surface/90 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted font-mono">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${autoRotate ? 'bg-success-light dark:bg-success-dark animate-pulse' : 'bg-muted'}`}></div>
              <span>Auto Rotation: {autoRotate ? 'ON' : 'OFF'}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${hovering ? 'bg-info-light dark:bg-info-dark animate-pulse' : 'bg-muted'}`}></div>
              <span>Hover Mode: {hovering ? 'ON' : 'OFF'}</span>
            </div>
          </div>
          <div className="text-primary-500">
            HeliXpert 3D Visualization System v1.0
          </div>
        </div>
      </div>
    </div>
  );
}
