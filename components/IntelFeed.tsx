import React, { useEffect, useState, useMemo } from 'react';
import { AnalysisResult, ThreatLevel } from '../types';
import { generateExecutiveSummary } from '../services/geminiService';
import { Radio, Zap, ShieldAlert, AlertTriangle, Layers, Clock } from 'lucide-react';

interface IntelFeedProps {
  history: AnalysisResult[];
}

export const IntelFeed: React.FC<IntelFeedProps> = ({ history }) => {
  const [briefing, setBriefing] = useState<string>("Initializing intelligence subsystem...");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'PRIORITY' | 'ALL'>('PRIORITY');

  // Generate summary only when significant history changes
  useEffect(() => {
    const fetchBriefing = async () => {
      if (history.length > 0) {
        setLoading(true);
        try {
          // Pass top 5 most recent high-risk items for summary context if available
          const highRisk = history.filter(h => h.verdict === ThreatLevel.CRITICAL || h.verdict === ThreatLevel.HIGH);
          const contextSet = highRisk.length > 0 ? highRisk : history.slice(0, 5);
          
          const summary = await generateExecutiveSummary(contextSet);
          setBriefing(summary);
        } catch (e) {
          setBriefing("Briefing generation unavailable.");
        } finally {
          setLoading(false);
        }
      } else {
        setBriefing("Awaiting threat data for analysis...");
      }
    };
    
    const timeout = setTimeout(fetchBriefing, 2000); // Debounce
    return () => clearTimeout(timeout);
  }, [history.length]); 

  const filteredFeed = useMemo(() => {
    if (viewMode === 'ALL') return [...history].reverse();
    // Priority: Critical or High
    return [...history].reverse().filter(h => h.verdict === ThreatLevel.CRITICAL || h.verdict === ThreatLevel.HIGH);
  }, [history, viewMode]);

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-l border-white/20 dark:border-white/5 w-80 flex-shrink-0 hidden xl:flex flex-col h-screen sticky top-0 transition-all duration-300">
      
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-md z-10 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
          <Radio className={`w-4 h-4 text-red-500 ${history.length > 0 ? 'animate-pulse' : ''}`} /> 
          Live Intel
        </h3>
        <div className="flex bg-gray-200/50 dark:bg-black/20 rounded-lg p-0.5">
            <button 
                onClick={() => setViewMode('PRIORITY')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'PRIORITY' ? 'bg-white dark:bg-gray-700 shadow-sm text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Priority Events"
            >
                <ShieldAlert className="w-3.5 h-3.5" />
            </button>
            <button 
                onClick={() => setViewMode('ALL')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'ALL' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="All Events"
            >
                <Layers className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
        
        {/* AI Briefing Card */}
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-30 blur group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
                    <div className="p-1.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg text-white shadow-lg shadow-purple-500/20">
                    <Zap className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">SitRep</span>
                    {loading && <div className="ml-auto w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                    {briefing}
                </p>
            </div>
        </div>

        {/* Feed Stream */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-1">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                   {viewMode === 'PRIORITY' ? 'Critical Signals' : 'Event Stream'}
               </span>
               <span className="text-[10px] font-mono text-gray-400">
                   {filteredFeed.length} Events
               </span>
           </div>

           {filteredFeed.length === 0 && (
             <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                <ShieldAlert className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-gray-500">No events of interest detected.</p>
             </div>
           )}

           {filteredFeed.map((item, idx) => (
               <FeedCard key={idx} item={item} />
           ))}
        </div>
      </div>
    </div>
  );
};

const FeedCard: React.FC<{ item: AnalysisResult }> = ({ item }) => {
    const isCritical = item.verdict === ThreatLevel.CRITICAL;
    const isHigh = item.verdict === ThreatLevel.HIGH;
    
    return (
        <div className={`relative overflow-hidden rounded-xl border transition-all hover:scale-[1.02] cursor-default group ${
            isCritical ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/60 dark:border-red-900/30' : 
            isHigh ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/60 dark:border-orange-900/30' :
            'bg-white dark:bg-gray-800/40 border-gray-200 dark:border-white/5'
        }`}>
            {/* Severity Indicator Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                isCritical ? 'bg-red-500' : 
                isHigh ? 'bg-orange-500' : 
                item.verdict === ThreatLevel.MEDIUM ? 'bg-yellow-500' : 'bg-emerald-500'
            }`} />

            <div className="p-3 pl-4">
                <div className="flex justify-between items-start mb-1.5">
                    <div className="flex items-center gap-1.5">
                        {isCritical && <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 animate-pulse" />}
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[140px] font-mono" title={item.ioc}>
                            {item.ioc}
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                        isCritical ? 'bg-red-200/50 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                        isHigh ? 'bg-orange-200/50 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                        {item.verdict}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5">
                        {item.type}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 font-mono">
                        Risk: {item.riskScore}
                    </span>
                </div>

                {item.threatActors && item.threatActors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100/50 dark:border-white/5">
                        <div className="text-[9px] text-gray-400 uppercase mb-1">Attribution</div>
                        <div className="flex flex-wrap gap-1">
                            {item.threatActors.slice(0, 2).map((actor, i) => (
                                <span key={i} className="text-[9px] text-purple-600 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-900/20 px-1 rounded">
                                    {actor}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}