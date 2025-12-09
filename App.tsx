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
import { Settings } from './components/Settings'; // New Component
import { AnalysisResult } from './types';
import { dbService } from './services/dbService';

const App = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analyzer' | 'repository' | 'kb' | 'integrations' | 'alerts' | 'reports' | 'notifications' | 'settings'>('dashboard');
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State to handle deep linking to KB
  const [kbQuery, setKbQuery] = useState<string>('');

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return true;
  });

  // Initialize Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedHistory = await dbService.getHistory();
        setHistory(savedHistory);
      } catch (error) {
        console.error("Failed to load history from local DB", error);
      }
    };
    loadData();
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
    // Optimistically update UI, saving happens in Analyzer component or we can verify here
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        activeTab === id 
          ? 'bg-primary/10 text-primary border-r-2 border-primary' 
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-200">
      
      {/* Sidebar Navigation (Desktop) */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col transition-colors duration-200">
        <div className="p-6 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Gnosis<span className="text-primary">4012</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-4">Platform</div>
          <NavButton id="dashboard" label="Threat Dashboard" icon={LayoutDashboard} />
          <NavButton id="analyzer" label="Intel Analyzer" icon={Search} />
          <NavButton id="repository" label="Intel Repository" icon={Database} />
          <NavButton id="alerts" label="Alerts" icon={Shield} />
          
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-8 mb-4 px-4">Intelligence</div>
          <NavButton id="kb" label="Threat Actors" icon={BookOpen} />
          <NavButton id="reports" label="Reporting" icon={FileText} />
          
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-8 mb-4 px-4">System</div>
          <NavButton id="notifications" label="Notifications" icon={Bell} />
          {/* Changed Icon to Network to avoid duplicate Settings gear */}
          <NavButton id="integrations" label="Integrations" icon={Network} />
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
           {/* Replaced specific AI Settings with General Settings */}
           <NavButton id="settings" label="Settings" icon={SettingsIcon} />
           
           <button
             onClick={toggleTheme}
             className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
           >
             {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             <span className="font-medium">{darkMode ? "Light Mode" : "Dark Mode"}</span>
           </button>
           
           <div className="text-[10px] text-gray-400 text-center pt-2">
             v2.7.0-flash / Secure Env
           </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed w-full bg-white dark:bg-gray-900 z-50 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between p-4 transition-colors duration-200">
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
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-40 pt-20 px-4 space-y-4 md:hidden transition-colors duration-200 overflow-y-auto">
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
          {activeTab === 'integrations' && <Integrations />}
          {activeTab === 'settings' && <Settings />}
        </div>
        
        {/* Right Side Feed (Desktop only) */}
        <IntelFeed history={history} />
      </main>

    </div>
  );
};

export default App;