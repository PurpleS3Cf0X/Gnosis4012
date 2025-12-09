import React, { useState, useEffect } from 'react';
import { getAISettings, saveAISettings } from '../services/settingsService';
import { AISettingsConfig } from '../types';
import { Bot, Save, RefreshCw, Globe, Sliders, FileText, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';

export const AISettings: React.FC = () => {
    const [settings, setSettings] = useState<AISettingsConfig>(getAISettings());
    const [saved, setSaved] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const languages = [
        "English", "Spanish", "French", "German", "Portuguese", "Japanese", "Chinese (Simplified)", "Russian", "Korean", "Italian"
    ];

    const handleChange = (key: keyof AISettingsConfig, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
        setSaved(false);
    };

    const handleSave = () => {
        saveAISettings(settings);
        setSaved(true);
        setHasChanges(false);
        // Reset saved indicator after 2s
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
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Bot className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Service Configuration</h1>
                        <p className="text-gray-500 dark:text-gray-400">Tune the cognitive parameters of the Gnosis4012 analysis engine.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleReset}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                    >
                        <RefreshCw className="w-4 h-4" /> Reset Defaults
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
                        {saved ? 'Saved!' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            {/* Config Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Creativity & Determinism */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Model Temperature</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-gray-500">Deterministic (0.0)</span>
                            <span className="text-primary">{settings.temperature.toFixed(1)}</span>
                            <span className="text-gray-500">Creative (1.0)</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.1"
                            value={settings.temperature}
                            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                            <strong>Recommended:</strong> 0.4 for Threat Analysis. Lower values provide more consistent, factual responses. Higher values allow for more creative hypothesis generation but increase the risk of hallucinations.
                        </p>
                    </div>
                </div>

                {/* Localization */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Globe className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Output Language</h3>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Target Language</label>
                        <div className="relative">
                            <select 
                                value={settings.language}
                                onChange={(e) => handleChange('language', e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white appearance-none"
                            >
                                {languages.map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>
                            <Globe className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            The AI will auto-translate analysis reports, threat actor profiles, and verdicts into this language.
                        </p>
                    </div>
                </div>

                {/* Detail Level */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Analysis Depth</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {(['brief', 'detailed', 'comprehensive'] as const).map((level) => (
                            <button
                                key={level}
                                onClick={() => handleChange('detailLevel', level)}
                                className={`py-3 px-2 rounded-lg text-sm font-bold capitalize transition-all border ${
                                    settings.detailLevel === level 
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shadow-sm' 
                                    : 'bg-gray-50 dark:bg-gray-900 text-gray-500 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Controls the verbosity of the generated reports. <strong>Comprehensive</strong> may take longer to generate but includes deeper technical context.
                    </p>
                </div>

                {/* Custom Instructions */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                            <Sliders className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Custom Instructions</h3>
                    </div>

                    <div className="space-y-2">
                         <textarea 
                            value={settings.customInstructions}
                            onChange={(e) => handleChange('customInstructions', e.target.value)}
                            placeholder="e.g. 'Always mention the MITRE ATT&CK T-Code' or 'Focus specifically on financial impact'"
                            className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white text-sm resize-none"
                         />
                         <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10 p-2 rounded">
                             <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                             <span>These instructions are appended to the system prompt and can override default behavior. Use with caution.</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};