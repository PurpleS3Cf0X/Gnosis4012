import React, { useState } from 'react';
import { AnalysisResult, ThreatLevel, IndicatorType } from '../types';
import { analyzeIndicator } from '../services/geminiService';
import { enrichIndicator } from '../services/integrationService';
import { dbService } from '../services/dbService';
import { alertService } from '../services/alertService';
import { Search, AlertTriangle, Shield, Terminal, MapPin, Server, FileCode, CheckCircle, Loader2, Globe, Activity, Users, Target, Crosshair, BookOpen, ExternalLink, Database, Filter, Network, Swords } from 'lucide-react';

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
      // 1. AI Analysis
      setLoadingStage('Processing AI Logic...');
      // Pass selectedType if it's not AUTO
      const typeToPass = selectedType === 'AUTO' ? undefined : selectedType;
      const aiResult = await analyzeIndicator(input, typeToPass);
      
      // 2. Integration Enrichment (Simulated)
      setLoadingStage('Querying External Integrations (VT, OTX, AbuseIPDB)...');
      const externalData = await enrichIndicator(aiResult.ioc, aiResult.type);
      
      // Merge results
      const finalResult: AnalysisResult = {
          ...aiResult,
          externalIntel: externalData
      };

      // 3. Database Persistence
      setLoadingStage('Archiving to Local Intelligence Repository...');
      await dbService.saveAnalysis(finalResult);

      // 4. Alert Evaluation
      setLoadingStage('Evaluating Detection Rules...');
      const alerts = await alertService.evaluateRules(finalResult);
      if (alerts.length > 0) {
          // In a real app, this might show a toast notification
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
        return <span className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded text-xs font-bold tracking-wider">CRITICAL</span>;
      case ThreatLevel.HIGH:
        return <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded text-xs font-bold tracking-wider">HIGH RISK</span>;
      case ThreatLevel.MEDIUM:
        return <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 rounded text-xs font-bold tracking-wider">MEDIUM</span>;
      case ThreatLevel.LOW:
        return <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded text-xs font-bold tracking-wider">LOW</span>;
      default:
        return <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded text-xs font-bold tracking-wider">SAFE</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Search Input Section */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl transition-colors">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Threat Intelligence Engine</h2>
          <p className="text-gray-500 dark:text-gray-400">Enter an IP, Domain, Hash, or URL for AI-powered enrichment.</p>
        </div>

        <form onSubmit={handleAnalyze} className="relative max-w-2xl mx-auto z-10">
          <div className="relative group flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus-within:ring-2 focus-within:ring-primary shadow-inner transition-all">
            
            {/* Type Selector Dropdown */}
            <div className="pl-2 relative flex items-center border-r border-gray-200 dark:border-gray-700">
               <div className="absolute left-3 pointer-events-none text-gray-400 dark:text-gray-500">
                  {selectedType === 'AUTO' ? <Search className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
               </div>
               <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="appearance-none bg-transparent border-none py-4 pl-9 pr-8 text-sm font-semibold text-gray-600 dark:text-gray-300 focus:ring-0 cursor-pointer hover:text-primary transition-colors uppercase tracking-wide"
               >
                   <option value="AUTO">Auto-Detect</option>
                   <option value={IndicatorType.IP}>IP Address</option>
                   <option value={IndicatorType.DOMAIN}>Domain</option>
                   <option value={IndicatorType.HASH}>Hash</option>
                   <option value={IndicatorType.URL}>URL</option>
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
                className="px-6 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
              </button>
            </div>
          </div>
          {loading && <div className="text-center mt-3 text-xs text-primary animate-pulse font-mono">{loadingStage}</div>}
        </form>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 flex items-center gap-3 max-w-2xl mx-auto">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl transition-colors">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700`}>
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
                  <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Risk Score</div>
                  <div className={`text-3xl font-bold font-mono ${getRiskColor(result.riskScore)}`}>
                    {result.riskScore}/100
                  </div>
                </div>
                {getVerdictBadge(result.verdict)}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">
              
              {/* Left Col: Overview & Geo & Actors */}
              <div className="p-6 space-y-6 lg:col-span-2">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> Intelligence Summary
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700/50">
                    {result.description}
                  </p>
                </div>

                {/* External Integrations Display */}
                {result.externalIntel && result.externalIntel.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 overflow-hidden">
                        <div className="p-3 border-b border-blue-100 dark:border-blue-900/30 bg-blue-100/50 dark:bg-blue-900/20">
                            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                                <Database className="w-4 h-4" /> Integrated Sources
                            </h4>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result.externalIntel.map((item, i) => (
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

                {/* Threat Actor Profiles */}
                {result.threatActorDetails && result.threatActorDetails.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700/30 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700/50 bg-gray-100 dark:bg-gray-800/50">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
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
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
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
                             <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/10 p-2 rounded">
                               <Crosshair className="w-4 h-4 text-blue-500 mt-0.5" />
                               <span><strong className="text-gray-700 dark:text-gray-200">Motivation:</strong> {actor.motivation}</span>
                             </div>
                          )}

                          {/* Relationships */}
                          {(actor.relationships?.affiliated_with?.length || actor.relationships?.rival_of?.length) ? (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                {actor.relationships.affiliated_with && actor.relationships.affiliated_with.length > 0 && (
                                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 p-2 rounded">
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
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-2 rounded">
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
                                    <span key={i} className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">
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
                                    <span key={i} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-800">
                                      {mal}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {actor.targetedIndustries && actor.targetedIndustries.length > 0 && (
                             <div className="mt-2">
                               <span className="text-xs font-semibold text-gray-500 uppercase block mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Targeted Industries</span>
                               <div className="flex flex-wrap gap-1.5">
                                 {actor.targetedIndustries.map((ind, i) => (
                                   <span key={i} className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900/40">
                                     {ind}
                                   </span>
                                 ))}
                               </div>
                             </div>
                          )}

                          {idx < result.threatActorDetails!.length - 1 && <hr className="border-gray-200 dark:border-gray-700 my-4" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.geoGeolocation && (
                    <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700/30">
                      <div className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Origin
                      </div>
                      <div className="text-gray-900 dark:text-white font-medium">{result.geoGeolocation}</div>
                    </div>
                  )}
                  {result.technicalDetails.asn && (
                    <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700/30">
                      <div className="text-xs text-gray-500 uppercase mb-1">ASN Organization</div>
                      <div className="text-gray-900 dark:text-white font-medium">{result.technicalDetails.asn}</div>
                    </div>
                  )}
                </div>

                {result.mitigationSteps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
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
              <div className="p-6 bg-gray-50 dark:bg-gray-900/20">
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Technical Indicators
                </h4>
                
                <div className="space-y-4">
                   {result.threatActors && result.threatActors.length > 0 && (
                     <div>
                       <div className="text-xs text-gray-500 mb-1">Potential Actors (Quick Tags)</div>
                       <div className="flex flex-wrap gap-2">
                         {result.threatActors.map(actor => (
                           <span key={actor} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded">
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
                           <span key={malware} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-300 text-xs rounded">
                             {malware}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}

                   <div>
                      <div className="text-xs text-gray-500 mb-1">Raw Metadata</div>
                      <pre className="text-xs text-gray-700 dark:text-gray-400 font-mono bg-white dark:bg-black/50 p-3 rounded border border-gray-200 dark:border-gray-800 overflow-x-auto">
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