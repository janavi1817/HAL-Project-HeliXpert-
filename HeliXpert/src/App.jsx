import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AiAnalyst from './components/AiAnalyst';
import Helicopters from './components/Helicopters';
import HelicopterDetails from './components/HelicopterDetails';
import Helicopter3DShowcase from './components/Helicopter3DShowcase';
import ComponentsView from './components/ComponentsView';
import ParametersView from './components/ParametersView';
import FaultsView from './components/FaultsView';
import MaintenanceView from './components/MaintenanceView';
import KnowledgeBase from './components/KnowledgeBase';
import DatasetManagement from './components/DatasetManagement';
import SettingsView from './components/SettingsView';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedHelicopterId, setSelectedHelicopterId] = useState('H01');
  const [aiPrompt, setAiPrompt] = useState(null);

  const handleSelectHelicopter = (id) => {
    setSelectedHelicopterId(id);
    setActiveTab('details');
  };

  const handleSelectQuickPrompt = (promptText) => {
    setAiPrompt(promptText);
    setActiveTab('ai-analyst');
  };

  if (showLanding) {
    return (
      <ThemeProvider>
        <LandingPage onEnter={() => setShowLanding(false)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground font-sans flex transition-colors duration-300">
        {/* Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          selectedHelicopterId={selectedHelicopterId}
        />

        {/* Main App Container */}
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          {/* Header Bar */}
          <Header 
            activeTab={activeTab} 
            onSearchClick={() => setActiveTab('ai-analyst')}
          />

          {/* Dynamic Main View Content */}
          <main className="flex-1 mt-16 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard 
                setActiveTab={setActiveTab}
                onSelectQuickPrompt={handleSelectQuickPrompt}
                onSelectHelicopter={handleSelectHelicopter}
              />
            )}

            {activeTab === 'ai-analyst' && (
              <AiAnalyst 
                initialPrompt={aiPrompt}
                clearInitialPrompt={() => setAiPrompt(null)}
              />
            )}

            {activeTab === 'helicopters' && (
              <Helicopters 
                onSelectHelicopter={handleSelectHelicopter}
              />
            )}

            {activeTab === '3d-model' && <Helicopter3DShowcase />}

            {activeTab === 'details' && (
              <HelicopterDetails 
                helicopterId={selectedHelicopterId}
                onBack={() => setActiveTab('helicopters')}
              />
            )}

            {activeTab === 'components' && <ComponentsView />}

            {activeTab === 'parameters' && <ParametersView />}

            {activeTab === 'faults' && <FaultsView />}

            {activeTab === 'maintenance' && <MaintenanceView />}

            {activeTab === 'knowledge' && <KnowledgeBase />}

            {activeTab === 'datasets' && <DatasetManagement />}

            {activeTab === 'settings' && <SettingsView />}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
