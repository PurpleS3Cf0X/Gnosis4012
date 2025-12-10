
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Search, Shield, Menu, X, Database, Sun, Moon, BookOpen, Settings as SettingsIcon, Bell, FileText, Share2, Network, ChevronLeft, ChevronRight, Bug, PanelRight } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Analyzer } from './components/Analyzer';
import { IntelFeed } from './components/IntelFeed';
import { ThreatActorKB } from './components/ThreatActorKB';
import { Integrations } from './components/Integrations';
import { AlertsManager } from './components/AlertsManager';
import { ReportsCenter } from './components/ReportsCenter';
import { NotificationSettings } from './components/NotificationSettings';
import { IntelRepository } from './components/IntelRepository';
import { Settings } from './components/Settings'; 
import { VulnerabilityManager } from './components/VulnerabilityManager';
import { AnalysisResult } from './types';
import { dbService } from './services/dbService';
import { checkAndRunAutoSync } from './services/integrationService';

const App = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analyzer' | 'vuln' | 'repository' | 'kb' | 'integrations' | 'alerts' | 'reports' | 'notifications' | 'settings'>('dashboard');
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  
  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  
  // Sidebar is open if it's pinned open (not collapsed) OR if the mouse is hovering over it
  const isSidebarOpen = !isSidebarCollapsed || isSidebarHovered;

  const [kbQuery, setKbQuery] = useState<string>('');
  
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return true;
  });

  const refreshData = async () => {
    try {
      const savedHistory = await dbService.getHistory();
      setHistory(savedHistory);
    } catch (error) {
      console.error("Failed to load history from local DB", error);
    }
  };

  useEffect(() => {
    const init = async () => {
       await dbService.initializeDefaults();
       refreshData();
    };
    init();

    // Auto-Sync Poller
    const syncInterval = setInterval(() => {
        checkAndRunAutoSync().then(() => refreshData());
    }, 60000); // Check every minute

    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setHistory(prev => [result, ...prev]);
  };

  const navigateToActor = (actorName: string) => {
    setKbQuery(actorName);
    setActiveTab('kb');
  };

  const NavButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        activeTab === id 
          ? 'bg-primary/20 text-primary border border-primary/20 shadow-lg shadow-primary/10' 
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
      } ${!isSidebarOpen ? 'justify-center' : ''}`}
      title={!isSidebarOpen ? label : undefined}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${activeTab === id ? 'animate-pulse' : ''} ${!isSidebarOpen ? 'w-6 h-6' : ''}`} />
      <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
        {label}
      </span>
      {activeTab === id && isSidebarOpen && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
      )}
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#020617] text-gray-900 dark:text-gray-100 selection:bg-primary/30">
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200 dark:border-white/5 transform transition-all duration-300 ease-in-out lg:transform-none flex flex-col ${
            mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'}`}
      >
        {/* Logo Area */}
        <div className={`p-6 border-b border-gray-100 dark:border-white/5 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} h-[88px]`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
            </div>
            <div className={`transition-all duration-300 whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
              <h1 className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Gnosis<span className="text-primary">4012</span></h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">Threat Intel Platform</p>
            </div>
          </div>

          {/* Toggle Button (Visible when open, or on hover) */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className={`hidden lg:flex text-gray-500 hover:text-gray-900 dark:hover:text-white p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-all ${!isSidebarOpen ? 'hidden' : ''}`}
          >
             {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar overflow-x-hidden">
          <div className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-4 mt-2 transition-opacity duration-300 whitespace-nowrap ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>Platform</div>
          <NavButton id="dashboard" label="Threat Dashboard" icon={LayoutDashboard} />
          <NavButton id="analyzer" label="Intel Analyzer" icon={Search} />
          <NavButton id="vuln" label="Vuln & Malware Vault" icon={Bug} />
          <NavButton id="repository" label="Intel Repository" icon={Database} />
          <NavButton id="alerts" label="Alerts & Rules" icon={Bell} />
          
          <div className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-4 mt-6 transition-opacity duration-300 whitespace-nowrap ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>Intelligence</div>
          <NavButton id="kb" label="Threat Actors" icon={BookOpen} />
          <NavButton id="reports" label="Reporting" icon={FileText} />
          
          <div className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-4 mt-6 transition-opacity duration-300 whitespace-nowrap ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>System</div>
          <NavButton id="notifications" label="Notifications" icon={Share2} />
          <NavButton id="integrations" label="Integrations" icon={Network} />
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-2 bg-gray-50/50 dark:bg-black/20 overflow-hidden">
          <NavButton id="settings" label="Settings" icon={SettingsIcon} />
          {/* Dark Mode toggle removed as requested */}
          <div className={`px-4 py-2 text-[10px] text-gray-400 text-center font-mono whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
            v2.8.0-flash / Secure Env
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header (Mobile & Desktop Aux Actions) */}
        <div className="p-4 border-b border-gray-200/50 dark:border-white/5 flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3 lg:hidden">
             <button onClick={() => setMobileMenuOpen(true)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
               <Menu className="w-6 h-6" />
             </button>
             <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-bold text-gray-900 dark:text-white">Gnosis4012</span>
             </div>
          </div>
          
          {/* Spacer for desktop layout alignment if needed */}
          <div className="hidden lg:block"></div>

          <div className="flex items-center gap-3">
             <button 
               onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
               className={`p-2 rounded-lg transition-all xl:hidden ${rightSidebarOpen ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
               title="Toggle Live Intel Feed"
             >
                <PanelRight className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          <div className="p-4 lg:p-8 max-w-[1600px] mx-auto w-full">
            {activeTab === 'dashboard' && <Dashboard history={history} />}
            {activeTab === 'analyzer' && (
              <Analyzer 
                onAnalyzeComplete={handleAnalysisComplete} 
                onNavigateToActor={navigateToActor}
              />
            )}
            {activeTab === 'vuln' && <VulnerabilityManager />}
            {activeTab === 'repository' && <IntelRepository />}
            {activeTab === 'kb' && <ThreatActorKB initialQuery={kbQuery} />}
            {activeTab === 'integrations' && <Integrations onIntegrationComplete={refreshData} />}
            {activeTab === 'alerts' && <AlertsManager />}
            {activeTab === 'reports' && <ReportsCenter />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </div>
      </main>

      {/* Right Sidebar (Intel Feed) */}
      <IntelFeed history={history} isOpen={rightSidebarOpen} onClose={() => setRightSidebarOpen(false)} />

    </div>
  );
};

export default App;
