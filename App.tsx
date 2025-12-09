import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Search, Shield, Menu, X, Database, Sun, Moon, BookOpen, Settings as SettingsIcon, Bell, FileText, Share2, Network } from 'lucide-react';
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
import { AnalysisResult } from './types';
import { dbService } from './services/dbService';

const App = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analyzer' | 'repository' | 'kb' | 'integrations' | 'alerts' | 'reports' | 'notifications' | 'settings'>('dashboard');
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
    refreshData();
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
          ? 'bg-primary/20 text-primary border border-primary/20 shadow-lg shadow-primary/10 backdrop-blur-sm' 
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden text-gray-900 dark:text-slate-200 selection:bg-primary/30">
      
      {/* Sidebar Navigation (Desktop) - Glass Effect */}
      <aside className="w-72 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border-r border-white/20 dark:border-white/10 hidden md:flex flex-col transition-all duration-300 z-20">
        <div className="p-6 flex items-center gap-3 border-b border-white/10 dark:border-white/5">
          <div className="bg-primary/20 p-2.5 rounded-xl backdrop-blur-sm ring-1 ring-primary/20 shadow-lg shadow-primary/20">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Gnosis<span className="text-primary">4012</span></h1>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wider">THREAT INTEL PLATFORM</div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4 mt-2">Platform</div>
          <NavButton id="dashboard" label="Threat Dashboard" icon={LayoutDashboard} />
          <NavButton id="analyzer" label="Intel Analyzer" icon={Search} />
          <NavButton id="repository" label="Intel Repository" icon={Database} />
          <NavButton id="alerts" label="Alerts & Rules" icon={Shield} />
          
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-6 mb-2 px-4">Intelligence</div>
          <NavButton id="kb" label="Threat Actors" icon={BookOpen} />
          <NavButton id="reports" label="Reporting" icon={FileText} />
          
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-6 mb-2 px-4">System</div>
          <NavButton id="notifications" label="Notifications" icon={Bell} />
          <NavButton id="integrations" label="Integrations" icon={Network} />
        </nav>

        <div className="p-4 border-t border-white/10 dark:border-white/5 space-y-2 bg-white/30 dark:bg-black/20 backdrop-blur-md">
           <NavButton id="settings" label="Settings" icon={SettingsIcon} />
           
           <button
             onClick={toggleTheme}
             className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-600 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
           >
             {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             <span className="font-medium">{darkMode ? "Light Mode" : "Dark Mode"}</span>
           </button>
           
           <div className="text-[10px] text-gray-400 dark:text-gray-600 text-center pt-2 font-mono">
             v2.7.0-flash / Secure Env
           </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-50 border-b border-white/20 dark:border-white/10 flex items-center justify-between p-4 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-bold text-gray-900 dark:text-white">Gnosis4012</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="text-gray-500 dark:text-gray-400">
             {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600 dark:text-gray-400">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl z-40 pt-20 px-4 space-y-3 md:hidden overflow-y-auto">
          <NavButton id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavButton id="analyzer" label="Analyzer" icon={Search} />
          <NavButton id="repository" label="Intel Repository" icon={Database} />
          <NavButton id="alerts" label="Alerts" icon={Shield} />
          <NavButton id="reports" label="Reporting" icon={FileText} />
          <NavButton id="kb" label="Knowledgebase" icon={BookOpen} />
          <NavButton id="notifications" label="Notifications" icon={Bell} />
          <NavButton id="integrations" label="Integrations" icon={Network} />
          <NavButton id="settings" label="Settings" icon={SettingsIcon} />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard history={history} />}
          {activeTab === 'analyzer' && <Analyzer onAnalyzeComplete={handleAnalysisComplete} onNavigateToActor={navigateToActor} />}
          {activeTab === 'repository' && <IntelRepository />}
          {activeTab === 'alerts' && <AlertsManager />}
          {activeTab === 'reports' && <ReportsCenter />}
          {activeTab === 'kb' && <ThreatActorKB initialQuery={kbQuery} />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'integrations' && <Integrations onIntegrationComplete={refreshData} />}
          {activeTab === 'settings' && <Settings />}
        </div>
        
        {/* Right Side Feed (Desktop only) */}
        <IntelFeed history={history} />
      </main>

    </div>
  );
};

export default App;