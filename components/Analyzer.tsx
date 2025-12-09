import React, { useState } from 'react';
import { AnalysisResult, ThreatLevel, IndicatorType } from '../types';
import { analyzeIndicator } from '../services/geminiService';
import { enrichIndicator } from '../services/integrationService';
import { dbService } from '../services/dbService';
import { alertService } from '../services/alertService';
import { Search, AlertTriangle, Shield, Terminal, MapPin, Server, FileCode, CheckCircle, Loader2, Globe, Activity, Users, Target, Crosshair, ExternalLink, Database, Filter, Network, Swords } from 'lucide-react';

interface AnalyzerProps {
  onAnalyzeComplete: (result: AnalysisResult) => void;
  onNavigateToActor?: (actorName: string) => void;
}

export const Analyzer: React.FC<AnalyzerProps> = ({ onAnalyzeComplete, onNavigateToActor }) => {
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState<IndicatorType | 'AUTO'>('AUTO');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setLoadingStage('Processing AI Logic...');
      const typeToPass = selectedType === 'AUTO' ? undefined : selectedType;
      const aiResult = await analyzeIndicator(input, typeToPass);
      
      setLoadingStage('Querying External Integrations (VT, OTX, AbuseIPDB)...');
      const externalData = await enrichIndicator(aiResult.ioc, aiResult.type);
      
      const finalResult: AnalysisResult = {
          ...aiResult,
          externalIntel: externalData
      };

      setLoadingStage('Archiving to Local Intelligence Repository...');
      await dbService.saveAnalysis(finalResult);

      setLoadingStage('Evaluating Detection Rules...');
      const alerts = await alertService.evaluateRules(finalResult);
      if (alerts.length > 0) {
          console.log("Alerts triggered:", alerts);
      }

      setResult(finalResult);
      onAnalyzeComplete(finalResult);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 50) return 'text-orange-500';
    if (score >= 20) return 'text-yellow-500';
    return 'text-emerald-500';
  };

  const getVerdictBadge = (verdict: ThreatLevel) => {
    switch (verdict) {
      case ThreatLevel.CRITICAL:
        return <span className="px-3 py-1 bg-red-100/50 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30 rounded-lg text-xs font-bold tracking-wider backdrop-blur-sm shadow-sm">CRITICAL</span>;
      case ThreatLevel.HIGH:
        return <span className="px-3 py-1 bg-orange-100/50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30 rounded-lg text-xs font-bold tracking-wider backdrop-blur-sm shadow-sm">HIGH RISK</span>;
      case ThreatLevel.MEDIUM:
        return <span className="px-3 py-1 bg-yellow-100/50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-500/30 rounded-lg text-xs font-bold tracking-wider backdrop-blur-sm shadow-sm">MEDIUM</span>;
      case ThreatLevel.LOW:
        return <span className="px-3 py-1 bg-blue-100/50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 rounded-lg text-xs font-bold tracking-wider backdrop-blur-sm shadow-sm">LOW</span>;
      default:
        return <span className="px-3 py-1 bg-emerald-100/50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-xs font-bold tracking-wider backdrop-blur-sm shadow-sm">SAFE</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Search Input Section */}
      <div className="glass-panel p-8 rounded-2xl transition-all hover:shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 drop-shadow-sm">Threat Intelligence Engine</h2>
          <p className="text-gray-500 dark:text-gray-300">Enter an IP, Domain, Hash, or URL for AI-powered enrichment.</p>
        </div>

        <form onSubmit={handleAnalyze} className="relative max-w-2xl mx-auto z-10">
          <div className="relative group flex items-center bg-white/60 dark:bg-black/30 backdrop-blur-md border border-gray-200/50 dark:border-white/10 rounded-2xl focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50 shadow-lg transition-all">
            
            {/* Type Selector Dropdown */}
            <div className="pl-2 relative flex items-center border-r border-gray-200/50 dark:border-white/10">
               <div className="absolute left-3 pointer-events-none text-gray-400 dark:text-gray-500">
                  {selectedType === 'AUTO' ? <Search className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
               </div>
               <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="appearance-none bg-transparent border-none py-4 pl-9 pr-8 text-sm font-semibold text-gray-600 dark:text-gray-300 focus:ring-0 cursor-pointer hover:text-primary transition-colors uppercase tracking-wide"
               >
                   <option className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white" value="AUTO">Auto-Detect</option>
                   <option className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white" value={IndicatorType.IP}>IP Address</option>
                   <option className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white" value={IndicatorType.DOMAIN}>Domain</option>
                   <option className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white" value={IndicatorType.HASH}>Hash</option>
                   <option className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white" value={IndicatorType.URL}>URL</option>
               </select>
            </div>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 w-full px-4 py-4 bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 font-mono"
              placeholder="e.g., 192.168.1.1, example.com, 5e884..."
            />
            
            <div className="pr-2">
              <button
                type="submit"
                disabled={loading || !input}
                className="px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 transform active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
              </button>
            </div>
          </div>
          {loading && <div className="text-center mt-3 text-xs text-primary animate-pulse font-mono font-bold tracking-wider">{loadingStage}</div>}
        </form>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-md border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-200 flex items-center gap-3 max-w-2xl mx-auto shadow-lg">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          
          {/* Header Card */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200/50 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 dark:bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 shadow-sm`}>
                   {result.type === 'IP Address' ? <Server className="w-6 h-6 text-blue-500 dark:text-blue-400" /> : 
                    result.type === 'Domain' ? <Globe className="w-6 h-6 text-purple-500 dark:text-purple-400" /> :
                    <FileCode className="w-6 h-6 text-orange-500 dark:text-orange-400" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white font-mono tracking-tight">{result.ioc}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{result.type}</span>
                    <span>•</span>
                    <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold mb-0.5">Risk Score</div>
                  <div className={`text-3xl font-bold font-mono ${getRiskColor(result.riskScore)} drop-shadow-sm`}>
                    {result.riskScore}/100
                  </div>
                </div>
                {getVerdictBadge(result.verdict)}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200/50 dark:divide-white/5">
              
              {/* Left Col: Overview & Geo & Actors */}
              <div className="p-6 space-y-6 lg:col-span-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> Intelligence Summary
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed bg-white/50 dark:bg-black/20 p-5 rounded-xl border border-gray-200/50 dark:border-white/5 backdrop-blur-sm">
                    {result.description}
                  </p>
                </div>

                {/* External Integrations Display */}
                {result.externalIntel && result.externalIntel.length > 0 && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-500/10 overflow-hidden backdrop-blur-sm">
                        <div className="p-3 border-b border-blue-100/50 dark:border-blue-500/10 bg-blue-100/30 dark:bg-blue-900/20">
                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                                <Database className="w-4 h-4" /> Integrated Sources
                            </h4>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result.externalIntel.map((item, i) => (
                                <div key={i} className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2">
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

                {/* Threat Actor Profiles */}
                {result.threatActorDetails && result.threatActorDetails.length > 0 && (
                  <div className="glass-card rounded-xl border border-gray-200/50 dark:border-white/5 overflow-hidden">
                    <div className="p-3 border-b border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" /> Identified Threat Actors
                      </h4>
                    </div>
                    <div className="p-4 space-y-4">
                      {result.threatActorDetails.map((actor, idx) => (
                        <div key={idx} className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white text-lg">{actor.name}</span>
                              {actor.origin && (
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-gray-200/60 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 rounded-full backdrop-blur-sm">
                                  {actor.origin}
                                </span>
                              )}
                              {onNavigateToActor && (
                                <button 
                                  onClick={() => onNavigateToActor(actor.name)}
                                  className="ml-2 text-primary hover:text-primary-dark transition-colors"
                                  title="View Full Profile in Knowledgebase"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {actor.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                              "{actor.description}"
                            </p>
                          )}
                          
                          {actor.motivation && (
                             <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300 bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100/50 dark:border-blue-500/10">
                               <Crosshair className="w-4 h-4 text-blue-500 mt-0.5" />
                               <span><strong className="text-gray-700 dark:text-gray-200">Motivation:</strong> {actor.motivation}</span>
                             </div>
                          )}

                          {/* Relationships */}
                          {(actor.relationships?.affiliated_with?.length || actor.relationships?.rival_of?.length) ? (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                {actor.relationships.affiliated_with && actor.relationships.affiliated_with.length > 0 && (
                                    <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-100/50 dark:border-green-500/10 p-2 rounded">
                                        <div className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase flex items-center gap-1 mb-1">
                                            <Network className="w-3 h-3" /> Affiliates
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {actor.relationships.affiliated_with.map((rel, i) => (
                                                <span key={i} className="text-xs text-gray-700 dark:text-gray-300">{rel}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {actor.relationships.rival_of && actor.relationships.rival_of.length > 0 && (
                                    <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-500/10 p-2 rounded">
                                        <div className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase flex items-center gap-1 mb-1">
                                            <Swords className="w-3 h-3" /> Rivals
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {actor.relationships.rival_of.map((rel, i) => (
                                                <span key={i} className="text-xs text-gray-700 dark:text-gray-300">{rel}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                          ) : null}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            {actor.ttps.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">TTPs</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {actor.ttps.map((ttp, i) => (
                                    <span key={i} className="text-xs px-2 py-1 bg-purple-100/50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded border border-purple-200/50 dark:border-purple-500/20">
                                      {ttp}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {actor.preferredMalware.length > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Preferred Malware</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {actor.preferredMalware.map((mal, i) => (
                                    <span key={i} className="text-xs px-2 py-1 bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded border border-red-200/50 dark:border-red-500/20">
                                      {mal}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {idx < result.threatActorDetails!.length - 1 && <hr className="border-gray-200/50 dark:border-white/5 my-4" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.geoGeolocation && (
                    <div className="glass-card p-4 rounded-xl">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1 font-bold">
                        <MapPin className="w-3 h-3" /> Origin
                      </div>
                      <div className="text-gray-900 dark:text-white font-medium">{result.geoGeolocation}</div>
                    </div>
                  )}
                  {result.technicalDetails.asn && (
                    <div className="glass-card p-4 rounded-xl">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1 font-bold">ASN Organization</div>
                      <div className="text-gray-900 dark:text-white font-medium">{result.technicalDetails.asn}</div>
                    </div>
                  )}
                </div>

                {result.mitigationSteps.length > 0 && (
                  <div className="glass-card p-5 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Mitigation Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {result.mitigationSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Col: Technical Details */}
              <div className="p-6 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Technical Indicators
                </h4>
                
                <div className="space-y-4">
                   {result.threatActors && result.threatActors.length > 0 && (
                     <div>
                       <div className="text-xs text-gray-500 mb-1">Potential Actors (Quick Tags)</div>
                       <div className="flex flex-wrap gap-2">
                         {result.threatActors.map(actor => (
                           <span key={actor} className="px-2 py-1 bg-red-100/50 dark:bg-red-900/30 border border-red-200/50 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded backdrop-blur-sm">
                             {actor}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}

                   {result.malwareFamilies && result.malwareFamilies.length > 0 && (
                     <div>
                       <div className="text-xs text-gray-500 mb-1">Malware Families</div>
                       <div className="flex flex-wrap gap-2">
                         {result.malwareFamilies.map(malware => (
                           <span key={malware} className="px-2 py-1 bg-orange-100/50 dark:bg-orange-900/30 border border-orange-200/50 dark:border-orange-900/50 text-orange-700 dark:text-orange-300 text-xs rounded backdrop-blur-sm">
                             {malware}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}

                   <div>
                      <div className="text-xs text-gray-500 mb-1">Raw Metadata</div>
                      <pre className="text-xs text-gray-700 dark:text-gray-400 font-mono bg-white/60 dark:bg-black/40 p-3 rounded-lg border border-gray-200/50 dark:border-white/10 overflow-x-auto shadow-inner">
                        {JSON.stringify(result.technicalDetails, null, 2)}
                      </pre>
                   </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};