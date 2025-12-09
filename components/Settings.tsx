import React, { useState, useEffect } from 'react';
import { getAISettings, saveAISettings } from '../services/settingsService';
import { testGeminiConnection } from '../services/geminiService';
import { AISettingsConfig } from '../types';
import { 
  Bot, Save, RefreshCw, Globe, Sliders, FileText, Sparkles, AlertTriangle, 
  CheckCircle, Scale, Brain, Monitor, Shield, Info, Gauge, Cpu, Zap, 
  Lightbulb, Activity, Lock, Terminal, Cloud, Key, Server
} from 'lucide-react';

export const Settings: React.FC = () => {
    const [settings, setSettings] = useState<AISettingsConfig>(getAISettings());
    const [activeTab, setActiveTab] = useState<'ai' | 'general'>('ai');
    const [saved, setSaved] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    
    // Connection Test State
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [connectionMsg, setConnectionMsg] = useState('');

    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return true;
    });

    const languages = [
        "English", "Spanish", "French", "German", "Portuguese", "Japanese", "Chinese (Simplified)", "Russian", "Korean", "Italian"
    ];

    const handleChange = <K extends keyof AISettingsConfig>(key: K, value: AISettingsConfig[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
        setSaved(false);
        setConnectionStatus('idle'); 
    };

    const handleSave = () => {
        saveAISettings(settings);
        setSaved(true);
        setHasChanges(false);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = () => {
        const defaults: AISettingsConfig = {
            activeModel: 'gemini-2.5-flash',
            temperature: 0.4,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            thinkingBudget: 0,
            language: 'English',
            detailLevel: 'detailed',
            riskTolerance: 'balanced',
            maxContextItems: 5,
            customInstructions: ''
        };
        setSettings(defaults);
        setHasChanges(true);
        setConnectionStatus('idle');
    };

    const handleTestConnection = async () => {
        setConnectionStatus('testing');
        setConnectionMsg('');
        // Save locally first to ensure consistent state
        saveAISettings(settings);
        const result = await testGeminiConnection();
        setConnectionStatus(result.success ? 'success' : 'error');
        setConnectionMsg(result.message);
    };

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Sliders className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Configuration</h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage AI providers, model parameters, and platform settings.</p>
                    </div>
                </div>
                
                {activeTab === 'ai' && (
                    <div className="flex gap-3">
                        <button 
                            onClick={handleReset}
                            className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                        >
                            <RefreshCw className="w-4 h-4" /> Defaults
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!hasChanges && !saved}
                            className={`px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg transition-all transform active:scale-95 ${
                                saved 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : hasChanges 
                                    ? 'bg-primary hover:bg-primary-dark text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saved ? 'Settings Saved' : 'Save Configuration'}
                        </button>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-2">
                    <button 
                        onClick={() => setActiveTab('ai')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${
                            activeTab === 'ai' 
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30' 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Bot className="w-5 h-5" /> AI Services
                    </button>
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors font-medium ${
                            activeTab === 'general' 
                            ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600' 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Monitor className="w-5 h-5" /> General & Display
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-9 space-y-6">
                    
                    {activeTab === 'ai' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            
                            {/* 1. Provider & Authentication */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-4 flex items-center gap-2">
                                    <Cloud className="w-5 h-5 text-sky-500" /> Provider & Authentication
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Provider</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full p-3 pl-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-900 dark:text-white appearance-none"
                                                disabled
                                                defaultValue="google"
                                            >
                                                <option value="google">Google Generative AI (Gemini)</option>
                                                <option value="openai">OpenAI (Coming Soon)</option>
                                                <option value="anthropic">Anthropic (Coming Soon)</option>
                                            </select>
                                            <Cloud className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between">
                                            <span>API Key Status</span>
                                            <span className={`text-xs px-2 py-0.5 rounded font-mono ${connectionStatus === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                                {connectionStatus === 'success' ? 'VERIFIED' : connectionStatus === 'error' ? 'FAILED' : 'UNVERIFIED'}
                                            </span>
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="password" 
                                                    value="********************************"
                                                    disabled
                                                    className="w-full p-3 pl-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 font-mono text-sm"
                                                />
                                                <Key className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                                            </div>
                                            <button 
                                                onClick={handleTestConnection}
                                                disabled={connectionStatus === 'testing'}
                                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                                            >
                                                {connectionStatus === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Test Connection'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Info className="w-3 h-3" /> Managed via <code>process.env.API_KEY</code>. Update your environment variables to rotate keys.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Model Configuration */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-4 flex items-center gap-2">
                                    <Cpu className="w-5 h-5 text-indigo-500" /> Active Model
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleChange('activeModel', 'gemini-2.5-flash')}
                                        className={`p-4 rounded-xl border text-left transition-all relative group ${
                                            settings.activeModel === 'gemini-2.5-flash'
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-orange-500" /> Gemini 2.5 Flash
                                            </span>
                                            {settings.activeModel === 'gemini-2.5-flash' && <CheckCircle className="w-4 h-4 text-primary" />}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                                            Fast, cost-effective model optimized for high-volume tasks and quick triage.
                                        </p>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-900 text-gray-500 px-1.5 py-0.5 rounded">Low Latency</span>
                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-900 text-gray-500 px-1.5 py-0.5 rounded">Thinking Supported</span>
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => handleChange('activeModel', 'gemini-3-pro-preview')}
                                        className={`p-4 rounded-xl border text-left transition-all relative group ${
                                            settings.activeModel === 'gemini-3-pro-preview'
                                            ? 'border-purple-500 bg-purple-500/5 ring-1 ring-purple-500'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <Brain className="w-4 h-4 text-purple-500" /> Gemini 3.0 Pro
                                            </span>
                                            {settings.activeModel === 'gemini-3-pro-preview' && <CheckCircle className="w-4 h-4 text-purple-500" />}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                                            Advanced reasoning engine for complex threat correlation and detailed profiling.
                                        </p>
                                        <div className="flex gap-2">
                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-900 text-gray-500 px-1.5 py-0.5 rounded">Deep Reasoning</span>
                                            <span className="text-[10px] bg-gray-100 dark:bg-gray-900 text-gray-500 px-1.5 py-0.5 rounded">Complex Tasks</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* 3. Generation Parameters */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-6 flex items-center gap-2">
                                    <Gauge className="w-5 h-5 text-pink-500" /> Generation Parameters
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Temperature */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Temperature (Creativity)</label>
                                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-primary">{settings.temperature.toFixed(2)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1" step="0.05"
                                            value={settings.temperature}
                                            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-400">
                                            <span>Deterministic</span>
                                            <span>Balanced</span>
                                            <span>Creative</span>
                                        </div>
                                    </div>

                                    {/* Max Tokens */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Output Tokens</label>
                                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-primary">{settings.maxOutputTokens}</span>
                                        </div>
                                        <input 
                                            type="range" min="1024" max="32768" step="1024"
                                            value={settings.maxOutputTokens}
                                            onChange={(e) => handleChange('maxOutputTokens', parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>

                                    {/* Top P */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Top P (Nucleus Sampling)</label>
                                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-primary">{settings.topP.toFixed(2)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="1" step="0.05"
                                            value={settings.topP}
                                            onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>

                                    {/* Top K */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Top K</label>
                                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-primary">{settings.topK}</span>
                                        </div>
                                        <input 
                                            type="range" min="1" max="100" step="1"
                                            value={settings.topK}
                                            onChange={(e) => handleChange('topK', parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>

                                    {/* Thinking Budget */}
                                    {settings.activeModel.includes('gemini-2.5') && (
                                        <div className="col-span-1 md:col-span-2 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                             <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <Lightbulb className="w-4 h-4 text-yellow-500" /> Thinking Budget (CoT)
                                                </label>
                                                <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-primary">
                                                    {settings.thinkingBudget === 0 ? 'Disabled' : `${settings.thinkingBudget} tokens`}
                                                </span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="16384" step="1024"
                                                value={settings.thinkingBudget}
                                                onChange={(e) => handleChange('thinkingBudget', parseInt(e.target.value))}
                                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                            />
                                            <p className="text-xs text-gray-500">
                                                Allocate token budget for the model's internal reasoning process before output generation.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 4. Behavioral Alignment */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-6 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-emerald-500" /> Behavioral Alignment
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Profile (Bias)</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['conservative', 'balanced', 'aggressive'] as const).map((mode) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => handleChange('riskTolerance', mode)}
                                                    className={`py-2 px-1 rounded-lg text-xs font-bold capitalize border transition-all ${
                                                        settings.riskTolerance === mode 
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                                                        : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    }`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Adjusts the AI's sensitivity to potential indicators of compromise.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Output Language</label>
                                        <select 
                                            value={settings.language}
                                            onChange={(e) => handleChange('language', e.target.value)}
                                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm text-gray-900 dark:text-white"
                                        >
                                            {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Terminal className="w-4 h-4 text-gray-500" />
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">System Prompt Overrides</label>
                                    </div>
                                    <textarea 
                                        value={settings.customInstructions}
                                        onChange={(e) => handleChange('customInstructions', e.target.value)}
                                        placeholder="Define specific instructions or personas for the AI analyst (e.g., 'Act as a SOC Tier 3 Analyst')..."
                                        className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white text-sm font-mono resize-none"
                                    />
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'general' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-6 flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-blue-500" /> Display & Appearance
                                </h3>
                                
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">Dark Mode</div>
                                        <div className="text-sm text-gray-500">Toggle high-contrast dark theme for SOC environments.</div>
                                    </div>
                                    <button 
                                        onClick={toggleTheme}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${darkMode ? 'bg-primary' : 'bg-gray-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-6 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-gray-500" /> System Information
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-bold">Client Version</div>
                                            <div className="font-mono text-gray-900 dark:text-white">v2.7.0-flash</div>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-bold">Environment</div>
                                            <div className="font-mono text-emerald-600">Secure / Production</div>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-bold">Database</div>
                                            <div className="font-mono text-gray-900 dark:text-white">IndexedDB (Local)</div>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <div className="text-xs text-gray-500 uppercase font-bold">AI Model</div>
                                            <div className="font-mono text-purple-500">{settings.activeModel}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 flex gap-3">
                                        <Shield className="w-5 h-5 flex-shrink-0" />
                                        <p>
                                            This instance is running in a secure client-side environment. No analysis data is sent to third-party servers other than the configured AI and Intel providers.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};