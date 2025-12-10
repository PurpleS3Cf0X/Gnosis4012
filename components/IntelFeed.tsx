
import React, { useEffect, useState, useMemo } from 'react';
import { AnalysisResult, ThreatLevel, IndicatorType } from '../types';
import { generateExecutiveSummary } from '../services/geminiService';
import { Radio, Zap, ShieldAlert, AlertTriangle, Layers, Clock, X, Calendar, Server, Globe, FileCode, Hash, Database, AlertCircle, Copy, Check, ChevronUp, ChevronDown, Minimize2 } from 'lucide-react';

interface IntelFeedProps {
  history: AnalysisResult[];
  isOpen?: boolean;
  onClose?: () => void;
}

export const IntelFeed: React.FC<IntelFeedProps> = ({ history, isOpen, onClose }) => {
  const [briefing, setBriefing] = useState<string>("Initializing intelligence subsystem...");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'PRIORITY' | 'ALL'>('PRIORITY');
  const [selectedItem, setSelectedItem] = useState<AnalysisResult | null>(null);
  const [isBriefingCollapsed, setIsBriefingCollapsed] = useState(false);

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

  const getTypeIcon = (type: IndicatorType) => {
        switch (type) {
            case IndicatorType.IP: return <Server className="w-4 h-4 text-blue-500" />;
            case IndicatorType.DOMAIN: return <Globe className="w-4 h-4 text-purple-500" />;
            case IndicatorType.HASH: return <Hash className="w-4 h-4 text-orange-500" />;
            case IndicatorType.URL: return <FileCode className="w-4 h-4 text-cyan-500" />;
            default: return <Database className="w-4 h-4 text-gray-500" />;
        }
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

  return (
    <>
      {/* Overlay for mobile/tablet when open */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 xl:hidden backdrop-blur-sm" onClick={onClose}></div>
      )}

      {/* Main Sidebar Container */}
      <div className={`
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-l border-white/20 dark:border-white/5 
        w-80 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out z-50
        fixed inset-y-0 right-0 xl:static xl:h-screen
        ${isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full xl:translate-x-0'}
      `}>
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-md z-10 flex justify-between items-center h-[88px]">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
            <Radio className={`w-4 h-4 text-red-500 ${history.length > 0 ? 'animate-pulse' : ''}`} /> 
            Live Intel
          </h3>
          <div className="flex items-center gap-2">
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
              {/* Close button only visible on mobile/tablet overlay mode */}
              <button onClick={onClose} className="xl:hidden p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
              </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
          
          {/* AI Briefing Card - Collapsible */}
          <div className="relative group transition-all">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-30 blur group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    onClick={() => setIsBriefingCollapsed(!isBriefingCollapsed)}
                  >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg text-white shadow-lg shadow-purple-500/20">
                            <Zap className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">SitRep</span>
                      </div>
                      <div className="flex items-center gap-2">
                          {loading && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />}
                          {isBriefingCollapsed ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronUp className="w-3 h-3 text-gray-400" />}
                      </div>
                  </div>
                  
                  {!isBriefingCollapsed && (
                      <div className="p-4 bg-white/50 dark:bg-black/20">
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium animate-in fade-in slide-in-from-top-1">
                              {briefing}
                          </p>
                      </div>
                  )}
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
                 <FeedCard key={idx} item={item} onClick={() => setSelectedItem(item)} getTypeIcon={getTypeIcon} />
             ))}
          </div>
        </div>

        {/* Detail Modal (Enhanced with Mitigation) */}
        {selectedItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="glass-panel w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] !p-0 shadow-2xl">
                  <div className="p-4 border-b border-gray-200/50 dark:border-white/5 flex justify-between items-start bg-white/40 dark:bg-white/5">
                      <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 font-mono break-all">
                              {getTypeIcon(selectedItem.type)} {selectedItem.ioc}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                              {getVerdictBadge(selectedItem.verdict)}
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {new Date(selectedItem.timestamp).toLocaleString()}
                              </span>
                          </div>
                      </div>
                      <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
                      <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-gray-200/50 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed backdrop-blur-sm">
                          {selectedItem.description}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2.5 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                              <div className="text-[10px] text-blue-500 font-bold uppercase mb-1">Geolocation</div>
                              <div className="text-xs text-gray-900 dark:text-white font-medium">{selectedItem.geoGeolocation || 'Unknown'}</div>
                          </div>
                          <div className="bg-purple-50/50 dark:bg-purple-900/10 p-2.5 rounded-lg border border-purple-100/50 dark:border-purple-900/30">
                              <div className="text-[10px] text-purple-500 font-bold uppercase mb-1">Risk Score</div>
                              <div className="text-xs text-gray-900 dark:text-white font-medium">{selectedItem.riskScore} / 100</div>
                          </div>
                      </div>

                      {/* Mitigation Steps (Added) */}
                      {selectedItem.mitigationSteps && selectedItem.mitigationSteps.length > 0 && (
                          <div className="space-y-2">
                              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                  <ShieldAlert className="w-3 h-3" /> Mitigation Steps
                              </div>
                              <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-3">
                                  <ul className="space-y-1.5">
                                      {selectedItem.mitigationSteps.map((step, idx) => (
                                          <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                                              <span className="w-1 h-1 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                              {step}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          </div>
                      )}

                      {selectedItem.externalIntel && selectedItem.externalIntel.length > 0 && (
                          <div className="space-y-2">
                              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Source Intelligence</div>
                              {selectedItem.externalIntel.map((intel, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                      <AlertCircle className="w-3 h-3 text-gray-400" />
                                      <span className="font-bold">{intel.source}:</span>
                                      <span>{intel.details}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
        )}
      </div>
    </>
  );
};

const FeedCard: React.FC<{ item: AnalysisResult, onClick: () => void, getTypeIcon: any }> = ({ item, onClick, getTypeIcon }) => {
    const [copied, setCopied] = useState(false);
    const isCritical = item.verdict === ThreatLevel.CRITICAL;
    const isHigh = item.verdict === ThreatLevel.HIGH;
    const isMedium = item.verdict === ThreatLevel.MEDIUM;
    
    // Smart Timestamp: Show "Time" if today, otherwise "Date"
    const timestamp = new Date(item.timestamp);
    const isToday = new Date().toDateString() === timestamp.toDateString();
    const timeDisplay = isToday 
        ? timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
        : timestamp.toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(item.ioc);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div 
            onClick={onClick}
            className={`relative overflow-hidden rounded-xl border transition-all hover:scale-[1.02] cursor-pointer group active:scale-95 ${
            isCritical ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200/60 dark:border-red-900/30' : 
            isHigh ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/60 dark:border-orange-900/30' :
            isMedium ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200/60 dark:border-yellow-900/30' :
            'bg-white dark:bg-gray-800/40 border-gray-200 dark:border-white/5'
        }`}>
            {/* Severity Indicator Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                isCritical ? 'bg-red-500' : 
                isHigh ? 'bg-orange-500' : 
                isMedium ? 'bg-yellow-500' : 'bg-emerald-500'
            }`} />

            <div className="p-3 pl-4">
                <div className="flex justify-between items-start mb-1.5 relative">
                    <div className="flex items-center gap-1.5 max-w-[70%]">
                        {isCritical && <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 animate-pulse flex-shrink-0" />}
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate font-mono" title={item.ioc}>
                            {item.ioc}
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {timeDisplay}
                    </span>

                    {/* Copy Button (Visible on Hover) */}
                    <button 
                        onClick={handleCopy}
                        className={`absolute right-0 -top-1 p-1.5 rounded-lg bg-white/80 dark:bg-black/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 shadow-sm transition-all duration-200 ${copied ? 'text-green-500 opacity-100' : 'text-gray-500 opacity-0 group-hover:opacity-100 hover:text-primary'}`}
                        title="Copy IOC"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2 items-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                        isCritical ? 'bg-red-200/50 text-red-800 dark:bg-red-900/40 dark:text-red-200' :
                        isHigh ? 'bg-orange-200/50 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' :
                        isMedium ? 'bg-yellow-200/50 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}>
                        {item.verdict}
                    </span>
                    {/* Compact Type Indicator (Icon + Tooltip) */}
                    <div className="p-0.5 bg-white/50 dark:bg-black/20 rounded border border-gray-100 dark:border-white/5 text-gray-500 dark:text-gray-400" title={item.type}>
                        {getTypeIcon(item.type)}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 font-mono">
                        Risk: {item.riskScore}
                    </span>
                </div>

                {item.threatActors && item.threatActors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100/50 dark:border-white/5">
                        <div className="text-[9px] text-gray-400 uppercase mb-1">Attribution</div>
                        <div className="flex flex-wrap gap-1">
                            {item.threatActors.slice(0, 2).map((actor, i) => (
                                <span key={i} className="text-[9px] text-purple-600 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-900/20 px-1 rounded truncate max-w-full">
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
