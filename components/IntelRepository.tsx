import React, { useState, useEffect } from 'react';
import { AnalysisResult, ThreatLevel, IndicatorType } from '../types';
import { dbService } from '../services/dbService';
import { Database, Search, Filter, Trash2, Eye, X, Calendar, Server, Globe, FileCode, Hash, ShieldAlert, AlertTriangle } from 'lucide-react';

export const IntelRepository: React.FC = () => {
    const [data, setData] = useState<AnalysisResult[]>([]);
    const [filteredData, setFilteredData] = useState<AnalysisResult[]>([]);
    const [selectedItem, setSelectedItem] = useState<AnalysisResult | null>(null);
    
    // Filter States
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [verdictFilter, setVerdictFilter] = useState<string>('ALL');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterData();
    }, [data, search, typeFilter, verdictFilter]);

    const loadData = async () => {
        const history = await dbService.getHistory();
        setData(history);
    };

    const handleDelete = async (e: React.MouseEvent, id?: string) => {
        e.stopPropagation();
        if (!id) return;
        if (window.confirm("Are you sure you want to permanently delete this record?")) {
            await dbService.deleteAnalysis(id);
            loadData();
            if (selectedItem?.id === id) setSelectedItem(null);
        }
    };

    const filterData = () => {
        let res = [...data];

        if (search) {
            const q = search.toLowerCase();
            res = res.filter(item => 
                item.ioc.toLowerCase().includes(q) || 
                item.description.toLowerCase().includes(q)
            );
        }

        if (typeFilter !== 'ALL') {
            res = res.filter(item => item.type === typeFilter);
        }

        if (verdictFilter !== 'ALL') {
            res = res.filter(item => item.verdict === verdictFilter);
        }

        setFilteredData(res);
    };

    const getVerdictBadge = (verdict: ThreatLevel) => {
        let classes = '';
        switch (verdict) {
            case ThreatLevel.CRITICAL: classes = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-900/50'; break;
            case ThreatLevel.HIGH: classes = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-900/50'; break;
            case ThreatLevel.MEDIUM: classes = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50'; break;
            case ThreatLevel.LOW: classes = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'; break;
            default: classes = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';
        }
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${classes}`}>{verdict}</span>;
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

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <div className="flex items-center gap-4">
                         <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600 dark:text-cyan-400">
                             <Database className="w-8 h-8" />
                         </div>
                         <div>
                             <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Intelligence Repository</h1>
                             <p className="text-gray-500 dark:text-gray-400">Search, manage, and audit all collected threat data.</p>
                         </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white font-mono">{data.length}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Total Records</div>
                     </div>
                 </div>

                 {/* Filters */}
                 <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div className="md:col-span-2 relative">
                         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                         <input 
                            type="text" 
                            placeholder="Search by IOC or description..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                         />
                     </div>
                     <div className="relative">
                         <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                         <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none"
                         >
                             <option value="ALL">All Types</option>
                             {Object.values(IndicatorType).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                     </div>
                     <div className="relative">
                         <ShieldAlert className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                         <select
                            value={verdictFilter}
                            onChange={e => setVerdictFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none appearance-none"
                         >
                             <option value="ALL">All Verdicts</option>
                             {Object.values(ThreatLevel).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                     </div>
                 </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="p-4">Type</th>
                                <th className="p-4">Indicator (IOC)</th>
                                <th className="p-4">Verdict</th>
                                <th className="p-4">Risk</th>
                                <th className="p-4">Date Collected</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No intelligence data found matching your filters.
                                    </td>
                                </tr>
                            )}
                            {filteredData.map(item => (
                                <tr 
                                    key={item.id} 
                                    onClick={() => setSelectedItem(item)}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {getTypeIcon(item.type)} {item.type}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-mono text-sm text-gray-900 dark:text-white truncate max-w-[200px] font-medium" title={item.ioc}>
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
                                            <span className="text-xs text-gray-500 font-mono">{item.riskScore}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-blue-500 hover:text-blue-600 p-1">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, item.id)}
                                                className="text-gray-400 hover:text-red-500 p-1"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Executive Summary</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {selectedItem.description}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedItem.geoGeolocation && (
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                        <div className="text-xs text-blue-500 font-bold uppercase mb-1">Geolocation</div>
                                        <div className="text-gray-900 dark:text-white font-medium">{selectedItem.geoGeolocation}</div>
                                    </div>
                                )}
                                <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-900/30">
                                    <div className="text-xs text-purple-500 font-bold uppercase mb-1">Risk Score</div>
                                    <div className="text-gray-900 dark:text-white font-medium">{selectedItem.riskScore} / 100</div>
                                </div>
                            </div>

                            {/* External Integrations View (STIX, VT, etc) */}
                            {selectedItem.externalIntel && selectedItem.externalIntel.length > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 overflow-hidden">
                                    <div className="p-3 border-b border-blue-100 dark:border-blue-900/30 bg-blue-100/50 dark:bg-blue-900/20">
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
                                                    <div className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30 text-xs">
                                                        {item.error}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{item.details}</span>
                                                        {item.tags && (
                                                            <div className="flex gap-1 flex-wrap mt-1">
                                                                {item.tags.map(t => (
                                                                    <span key={t} className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">{t}</span>
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
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attributed Actors</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedItem.threatActors.map((actor, i) => (
                                            <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-900/30 text-xs font-bold">
                                                {actor}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Raw Data Inspector</h4>
                                <pre className="text-xs font-mono bg-gray-100 dark:bg-black p-4 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400">
                                    {JSON.stringify(selectedItem, null, 2)}
                                </pre>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-end">
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