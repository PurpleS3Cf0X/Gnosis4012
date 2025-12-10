
import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisResult, ThreatLevel, IndicatorType } from '../types';
import { dbService } from '../services/dbService';
import { analyzeIndicator } from '../services/geminiService';
import { enrichIndicator } from '../services/integrationService';
import { Database, Search, Filter, Trash2, Eye, X, Calendar, Server, Globe, FileCode, Hash, ShieldAlert, AlertTriangle, ChevronDown, RotateCcw, Download, Sparkles, Loader2 } from 'lucide-react';

export const IntelRepository: React.FC = () => {
    const [data, setData] = useState<AnalysisResult[]>([]);
    const [selectedItem, setSelectedItem] = useState<AnalysisResult | null>(null);
    const [enrichingId, setEnrichingId] = useState<string | null>(null);
    
    // Filter States
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [verdictFilter, setVerdictFilter] = useState<string>('ALL');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const history = await dbService.getHistory();
        setData(history);
    };

    // Derived State for Filtering
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = search === '' || 
                item.ioc.toLowerCase().includes(search.toLowerCase()) || 
                item.description.toLowerCase().includes(search.toLowerCase());
            
            const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
            
            const matchesVerdict = verdictFilter === 'ALL' || item.verdict === verdictFilter;

            return matchesSearch && matchesType && matchesVerdict;
        });
    }, [data, search, typeFilter, verdictFilter]);

    const handleDelete = async (e: React.MouseEvent, id?: string) => {
        e.stopPropagation();
        if (!id) return;
        if (window.confirm("Are you sure you want to permanently delete this record?")) {
            await dbService.deleteAnalysis(id);
            loadData();
            if (selectedItem?.id === id) setSelectedItem(null);
        }
    };

    const handleExport = (e: React.MouseEvent, item: AnalysisResult) => {
        e.stopPropagation();
        const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gnosis_intel_${item.ioc.replace(/[^a-z0-9]/gi, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleEnrich = async (e: React.MouseEvent, item: AnalysisResult) => {
        e.stopPropagation();
        if (enrichingId) return; // Prevent concurrent actions
        
        setEnrichingId(item.id || 'temp');
        
        try {
            // 1. External APIs (Get fresh context)
            const externalData = await enrichIndicator(item.ioc, item.type);
            
            // 2. AI Analysis (Re-run synthesis)
            const aiResult = await analyzeIndicator(item.ioc, item.type, externalData);
            
            // 3. Merge & Save (Keep ID to update existing record, update timestamp)
            const updatedResult: AnalysisResult = {
                ...aiResult,
                id: item.id, // Preserve ID to update
                externalIntel: externalData,
                timestamp: new Date().toISOString() // Fresh timestamp
            };
            
            await dbService.saveAnalysis(updatedResult);
            
            // 4. Refresh View
            await loadData();
            if (selectedItem?.id === item.id) {
                setSelectedItem(updatedResult);
            }
        } catch (error: any) {
            console.error("Enrichment failed", error);
            alert("Failed to enrich indicator: " + (error.message || "Unknown error"));
        } finally {
            setEnrichingId(null);
        }
    };

    const resetFilters = () => {
        setSearch('');
        setTypeFilter('ALL');
        setVerdictFilter('ALL');
    };

    const getVerdictBadge = (verdict: ThreatLevel) => {
        let classes = '';
        switch (verdict) {
            case ThreatLevel.CRITICAL: classes = 'bg-red-100/50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-900/50'; break;
            case ThreatLevel.HIGH: classes = 'bg-orange-100/50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-900/50'; break;
            case ThreatLevel.MEDIUM: classes = 'bg-yellow-100/50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50'; break;
            case ThreatLevel.LOW: classes = 'bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'; break;
            default: classes = 'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';
        }
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border backdrop-blur-sm ${classes}`}>{verdict}</span>;
    };

    const getTypeIcon = (type: IndicatorType) => {
        switch (type) {
            case IndicatorType.IP: return <Server className="w-4 h-4 text-blue-500" />;
            case IndicatorType.DOMAIN: return <Globe className="w-4 h-4 text-purple-500" />;
            case IndicatorType.HASH: return <Hash className="w-4 h-4 text-orange-500" />;
            case IndicatorType.URL: return <FileCode className="w-4 h-4 text-cyan-500" />;
            default: return <Database className="w-4 h-4 text-gray-500" />;
        }
    };

    const hasActiveFilters = search !== '' || typeFilter !== 'ALL' || verdictFilter !== 'ALL';

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            
            <div className="glass-panel p-8 rounded-2xl">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <div className="flex items-center gap-4">
                         <div className="p-3 bg-cyan-100/50 dark:bg-cyan-900/30 rounded-xl text-cyan-600 dark:text-cyan-400 backdrop-blur-sm shadow-sm">
                             <Database className="w-8 h-8" />
                         </div>
                         <div>
                             <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">Intelligence Repository</h1>
                             <p className="text-gray-500 dark:text-gray-300">Search, manage, and audit all collected threat data.</p>
                         </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white font-mono drop-shadow-sm">{filteredData.length} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/ {data.length}</span></div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Records Found</div>
                     </div>
                 </div>

                 {/* Filters */}
                 <div className="mt-8 flex flex-col md:flex-row gap-4">
                     <div className="flex-1 relative">
                         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                         <input 
                            type="text" 
                            placeholder="Search by IOC or description..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                         />
                     </div>
                     <div className="w-full md:w-48 relative">
                         <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                         <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer transition-all hover:bg-white/60 dark:hover:bg-white/5"
                         >
                             <option value="ALL">All Types</option>
                             {Object.values(IndicatorType).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                     </div>
                     <div className="w-full md:w-48 relative">
                         <ShieldAlert className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                         <select
                            value={verdictFilter}
                            onChange={e => setVerdictFilter(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer transition-all hover:bg-white/60 dark:hover:bg-white/5"
                         >
                             <option value="ALL">All Verdicts</option>
                             {Object.values(ThreatLevel).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                     </div>
                     
                     {hasActiveFilters && (
                         <button 
                            onClick={resetFilters}
                            className="px-4 py-2.5 bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-xl flex items-center justify-center gap-2 transition-colors border border-gray-200/50 dark:border-white/10 backdrop-blur-sm"
                            title="Reset Filters"
                         >
                             <RotateCcw className="w-4 h-4" />
                         </button>
                     )}
                 </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200/50 dark:border-white/5 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                                <th className="p-4">Type</th>
                                <th className="p-4">Indicator (IOC)</th>
                                <th className="p-4">Verdict</th>
                                <th className="p-4">Risk</th>
                                <th className="p-4">Date Collected</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50 dark:divide-white/5">
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <Search className="w-10 h-10 opacity-20" />
                                            <p>No intelligence data found matching your filters.</p>
                                            {hasActiveFilters && (
                                                <button onClick={resetFilters} className="text-primary hover:underline text-sm">
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {filteredData.map(item => (
                                <tr 
                                    key={item.id} 
                                    onClick={() => setSelectedItem(item)}
                                    className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {getTypeIcon(item.type)} {item.type}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-mono text-sm text-gray-900 dark:text-white truncate max-w-[200px] font-medium drop-shadow-sm" title={item.ioc}>
                                            {item.ioc}
                                        </div>
                                    </td>
                                    <td className="p-4">{getVerdictBadge(item.verdict)}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${
                                                        item.riskScore > 75 ? 'bg-red-500' :
                                                        item.riskScore > 50 ? 'bg-orange-500' :
                                                        item.riskScore > 25 ? 'bg-yellow-500' : 'bg-emerald-500'
                                                    }`} 
                                                    style={{ width: `${item.riskScore}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{item.riskScore}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={(e) => handleEnrich(e, item)}
                                                disabled={enrichingId === item.id}
                                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                                title="Enrich with AI (Re-Analyze)"
                                            >
                                                {enrichingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            </button>
                                            <button 
                                                onClick={(e) => handleExport(e, item)}
                                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                                title="Export JSON"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, item.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] !p-0">
                        <div className="p-6 border-b border-gray-200/50 dark:border-white/5 flex justify-between items-start bg-white/40 dark:bg-white/5">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 font-mono">
                                    {getTypeIcon(selectedItem.type)} {selectedItem.ioc}
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    {getVerdictBadge(selectedItem.verdict)}
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Analyzed: {new Date(selectedItem.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Executive Summary</h4>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={(e) => handleEnrich(e, selectedItem)}
                                            disabled={enrichingId === selectedItem.id}
                                            className="text-xs flex items-center gap-1 text-indigo-500 hover:text-indigo-600 font-bold"
                                        >
                                            {enrichingId === selectedItem.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            Update Analysis
                                        </button>
                                        <button 
                                            onClick={(e) => handleExport(e, selectedItem)}
                                            className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-bold"
                                        >
                                            <Download className="w-3 h-3" /> Export
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-gray-200/50 dark:border-white/5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed backdrop-blur-sm">
                                    {selectedItem.description}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedItem.geoGeolocation && (
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                                        <div className="text-xs text-blue-500 font-bold uppercase mb-1">Geolocation</div>
                                        <div className="text-gray-900 dark:text-white font-medium">{selectedItem.geoGeolocation}</div>
                                    </div>
                                )}
                                <div className="bg-purple-50/50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100/50 dark:border-purple-900/30">
                                    <div className="text-xs text-purple-500 font-bold uppercase mb-1">Risk Score</div>
                                    <div className="text-gray-900 dark:text-white font-medium">{selectedItem.riskScore} / 100</div>
                                </div>
                            </div>

                            {/* External Integrations View (STIX, VT, etc) */}
                            {selectedItem.externalIntel && selectedItem.externalIntel.length > 0 && (
                                <div className="bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-900/30 overflow-hidden">
                                    <div className="p-3 border-b border-blue-100/50 dark:border-blue-900/30 bg-blue-100/30 dark:bg-blue-900/20">
                                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                                            <Database className="w-4 h-4" /> Integrated Sources & Feeds
                                        </h4>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedItem.externalIntel.map((item, i) => (
                                            <div key={i} className="flex flex-col gap-1">
                                                <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                                    {item.source}
                                                    {item.error && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                                </span>
                                                {item.error ? (
                                                    <div className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20 p-2 rounded border border-red-100/50 dark:border-red-900/30 text-xs">
                                                        {item.error}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{item.details}</span>
                                                        {item.tags && (
                                                            <div className="flex gap-1 flex-wrap mt-1">
                                                                {item.tags.map(t => (
                                                                    <span key={t} className="text-[10px] bg-white/60 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-white/5">{t}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {selectedItem.threatActors && selectedItem.threatActors.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Attributed Actors</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedItem.threatActors.map((actor, i) => (
                                            <span key={i} className="px-2 py-1 bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded border border-red-200/50 dark:border-red-900/30 text-xs font-bold">
                                                {actor}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Raw Data Inspector</h4>
                                <pre className="text-xs font-mono bg-white/50 dark:bg-black/30 p-4 rounded-xl overflow-x-auto border border-gray-200/50 dark:border-white/10 text-gray-700 dark:text-gray-400 backdrop-blur-sm">
                                    {JSON.stringify(selectedItem, null, 2)}
                                </pre>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-end">
                            <button 
                                onClick={(e) => { handleDelete(e, selectedItem.id); setSelectedItem(null); }}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> Delete Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
