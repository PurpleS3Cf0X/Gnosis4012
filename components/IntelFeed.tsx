import React, { useEffect, useState } from 'react';
import { AnalysisResult, ThreatLevel } from '../types';
import { generateExecutiveSummary } from '../services/geminiService';
import { FileText, Radio, Zap } from 'lucide-react';

interface IntelFeedProps {
  history: AnalysisResult[];
}

export const IntelFeed: React.FC<IntelFeedProps> = ({ history }) => {
  const [briefing, setBriefing] = useState<string>("Waiting for data to generate briefing...");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBriefing = async () => {
      if (history.length > 0) {
        setLoading(true);
        try {
          const summary = await generateExecutiveSummary(history);
          setBriefing(summary);
        } catch (e) {
          setBriefing("Failed to generate briefing.");
        } finally {
          setLoading(false);
        }
      } else {
        setBriefing("Process indicators to generate an AI Executive Briefing.");
      }
    };
    
    // Simple debounce/check to avoid too many API calls
    const timeout = setTimeout(fetchBriefing, 1000);
    return () => clearTimeout(timeout);
  }, [history.length]); // Only regenerate when new items added

  return (
    <div className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 w-80 flex-shrink-0 hidden xl:flex flex-col h-screen sticky top-0 transition-colors duration-200">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10 transition-colors">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-primary" /> Live Intelligence
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Executive Summary */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
             <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
               <Zap className="w-4 h-4" />
             </div>
             <span className="text-xs font-bold text-purple-700 dark:text-purple-200 uppercase tracking-wider">AI Executive Brief</span>
          </div>
          <p className={`text-sm text-gray-600 dark:text-gray-300 leading-relaxed ${loading ? 'animate-pulse' : ''}`}>
            {briefing}
          </p>
        </div>

        {/* Recent Feed */}
        <div>
           <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Recent Analysis</div>
           <div className="space-y-3">
             {history.length === 0 && (
               <div className="text-sm text-gray-500 dark:text-gray-600 italic text-center py-4">No recent activity</div>
             )}
             {[...history].reverse().map((item, idx) => (
               <div key={idx} className="bg-gray-50 dark:bg-gray-700/20 p-3 rounded-lg border border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-200 truncate max-w-[120px]" title={item.ioc}>{item.ioc}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      item.verdict === ThreatLevel.CRITICAL ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                      item.verdict === ThreatLevel.HIGH ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                      'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}>{item.verdict}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>{item.type}</span>
                    <span>{item.riskScore} / 100</span>
                  </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};