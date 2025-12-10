
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { ThreatActorProfile } from '../types';
import { lookupThreatActor } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { Search, Users, Globe, BookOpen, LayoutGrid, ShieldAlert, Loader2, ArrowLeft, Calendar, GitBranch, Target, Crosshair, Zap, Network, Swords, Fingerprint, Save, CheckCircle, Sparkles, FileSearch } from 'lucide-react';

interface ThreatActorKBProps {
  initialQuery?: string;
}

// Comprehensive initial dataset for the catalog view
const STATIC_CATALOG: ThreatActorProfile[] = [
    { name: "APT29", aliases: ["Cozy Bear", "Midnight Blizzard", "The Dukes"], origin: "Russia", motivation: "Espionage", targetedIndustries: ["Gov", "Diplomatic", "Think Tanks"], ttps: [], preferredMalware: [], notabilityScore: 10 },
    { name: "Lazarus Group", aliases: ["Hidden Cobra", "Guardians of Peace"], origin: "North Korea", motivation: "Financial, Sabotage", targetedIndustries: ["Banks", "Crypto", "Media"], ttps: [], preferredMalware: [], notabilityScore: 10 },
    { name: "APT28", aliases: ["Fancy Bear", "Strontium", "Sofacy"], origin: "Russia", motivation: "Espionage, Influence", targetedIndustries: ["Gov", "Military", "Elections"], ttps: [], preferredMalware: [], notabilityScore: 10 },
    { name: "Sandworm", aliases: ["Voodoo Bear", "Telebots"], origin: "Russia", motivation: "Sabotage", targetedIndustries: ["Critical Infra", "Energy"], ttps: [], preferredMalware: [], notabilityScore: 9 },
    { name: "APT41", aliases: ["Double Dragon", "Wicked Panda"], origin: "China", motivation: "Espionage, Financial", targetedIndustries: ["Tech", "Telecom", "Healthcare"], ttps: [], preferredMalware: [], notabilityScore: 9 },
    { name: "Wizard Spider", aliases: ["Grim Spider", "Trickbot Group"], origin: "Russia (Cybercrime)", motivation: "Financial", targetedIndustries: ["Global Enterprise"], ttps: [], preferredMalware: [], notabilityScore: 9 },
    { name: "Equation Group", aliases: [], origin: "USA (Suspected)", motivation: "Espionage", targetedIndustries: ["Gov", "Telecom", "Crypto"], ttps: [], preferredMalware: [], notabilityScore: 8 },
    { name: "Turla", aliases: ["Venomous Bear", "Waterbug"], origin: "Russia", motivation: "Espionage", targetedIndustries: ["Gov", "Military", "Diplo"], ttps: [], preferredMalware: [], notabilityScore: 8 },
    { name: "FIN7", aliases: ["Carbanak"], origin: "Eastern Europe", motivation: "Financial", targetedIndustries: ["Retail", "Hospitality"], ttps: [], preferredMalware: [], notabilityScore: 8 },
    { name: "LockBit", aliases: ["LockBit 3.0"], origin: "Global (RaaS)", motivation: "Financial", targetedIndustries: ["Global Enterprise"], ttps: [], preferredMalware: [], notabilityScore: 10 },
    { name: "REvil", aliases: ["Sodinokibi"], origin: "Russia", motivation: "Financial", targetedIndustries: ["MSP", "Gov", "Enterprise"], ttps: [], preferredMalware: [], notabilityScore: 9 },
    { name: "Charming Kitten", aliases: ["APT35", "Phosphorus"], origin: "Iran", motivation: "Espionage", targetedIndustries: ["Gov", "Activists", "Media"], ttps: [], preferredMalware: [], notabilityScore: 7 },
    { name: "OceanLotus", aliases: ["APT32"], origin: "Vietnam", motivation: "Espionage", targetedIndustries: ["Foreign Corps", "Dissidents"], ttps: [], preferredMalware: [], notabilityScore: 7 },
    { name: "Deep Panda", aliases: ["APT19"], origin: "China", motivation: "Espionage", targetedIndustries: ["Defense", "Gov"], ttps: [], preferredMalware: [], notabilityScore: 7 },
    { name: "OilRig", aliases: ["APT34", "Helix Kitten"], origin: "Iran", motivation: "Espionage", targetedIndustries: ["Financial", "Energy", "Gov"], ttps: [], preferredMalware: [], notabilityScore: 7 },
    { name: "Gamaredon", aliases: ["Primitive Bear"], origin: "Russia", motivation: "Espionage", targetedIndustries: ["Ukraine Gov/Military"], ttps: [], preferredMalware: [], notabilityScore: 6 },
    { name: "Kimsuky", aliases: ["Velvet Chollima"], origin: "North Korea", motivation: "Espionage", targetedIndustries: ["Think Tanks", "Nuclear"], ttps: [], preferredMalware: [], notabilityScore: 6 },
    { name: "MuddyWater", aliases: ["Static Kitten"], origin: "Iran", motivation: "Espionage", targetedIndustries: ["Middle East Telecom/Gov"], ttps: [], preferredMalware: [], notabilityScore: 6 },
    { name: "Silence", aliases: [], origin: "Eastern Europe", motivation: "Financial", targetedIndustries: ["Banks"], ttps: [], preferredMalware: [], notabilityScore: 5 },
    { name: "DarkSide", aliases: [], origin: "Eastern Europe", motivation: "Financial", targetedIndustries: ["Infra", "Enterprise"], ttps: [], preferredMalware: [], notabilityScore: 8 },
    { name: "APT1", aliases: ["Comment Crew"], origin: "China", motivation: "Espionage", targetedIndustries: ["US Defense", "Tech"], ttps: [], preferredMalware: [], notabilityScore: 8 },
    { name: "TA505", aliases: ["Evil Corp (Affiliated)"], origin: "Russia", motivation: "Financial", targetedIndustries: ["Global Finance"], ttps: [], preferredMalware: [], notabilityScore: 8 },
    { name: "Anonymous", aliases: [], origin: "Global", motivation: "Hacktivism", targetedIndustries: ["Gov", "Corps"], ttps: [], preferredMalware: [], notabilityScore: 7 },
    { name: "Killnet", aliases: [], origin: "Russia", motivation: "Hacktivism", targetedIndustries: ["NATO Countries"], ttps: [], preferredMalware: [], notabilityScore: 6 }
];

interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    group: 'center' | 'ally' | 'rival';
    r: number;
    color: string;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    source: string | GraphNode;
    target: string | GraphNode;
    type: 'ally' | 'rival';
}

const RelationshipGraph = ({ profile, onNodeClick }: { profile: ThreatActorProfile, onNodeClick: (name: string) => void }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!profile || !svgRef.current || !containerRef.current) return;

        // Clear previous render
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const { width, height } = containerRef.current.getBoundingClientRect();
        
        // 1. Prepare Data
        const nodes: GraphNode[] = [{ id: profile.name, group: 'center', r: 30, color: '#3b82f6', x: width / 2, y: height / 2 }];
        const links: GraphLink[] = [];
        const existingNodeIds = new Set([profile.name]);

        // Helper to add node if not exists
        const addNode = (name: string, group: 'ally' | 'rival') => {
            if (existingNodeIds.has(name)) return;
            existingNodeIds.add(name);
            nodes.push({
                id: name,
                group,
                r: 18,
                color: group === 'ally' ? '#10b981' : '#ef4444'
            });
        };

        profile.relationships?.affiliated_with?.forEach(name => {
            addNode(name, 'ally');
            links.push({ source: profile.name, target: name, type: 'ally' });
        });

        profile.relationships?.rival_of?.forEach(name => {
            addNode(name, 'rival');
            links.push({ source: profile.name, target: name, type: 'rival' });
        });

        // 2. Setup SVG and Zoom
        // Define arrow markers
        const defs = svg.append("defs");
        
        const createMarker = (id: string, color: string) => {
             defs.append("marker")
                .attr("id", id)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 28) // Offset to not overlap node (radius + buffer)
                .attr("refY", 0)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("fill", color);
        };
        createMarker("arrow-ally", "#10b981");
        createMarker("arrow-rival", "#ef4444");

        const g = svg.append("g");
        
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => g.attr("transform", event.transform));

        svg.call(zoom).on("dblclick.zoom", null);

        // 3. Force Simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius((d: any) => d.r + 20));

        // 4. Draw Elements
        const link = g.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", 2)
            .attr("stroke", d => d.type === 'ally' ? '#10b981' : '#ef4444')
            .attr("stroke-opacity", 0.6)
            .attr("marker-end", d => `url(#arrow-${d.type})`);

        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("cursor", "pointer")
            .on("click", (event, d) => {
                if (d.id !== profile.name) onNodeClick(d.id);
            });

        // Node Circles
        node.append("circle")
            .attr("r", d => d.r)
            .attr("fill", d => d.color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .attr("class", "shadow-lg filter drop-shadow-md");

        // Node Labels
        node.append("text")
            .text(d => d.id)
            .attr("x", 0)
            .attr("y", d => d.r + 15)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .attr("fill", "currentColor")
            .attr("class", "text-gray-800 dark:text-gray-200 pointer-events-none select-none");

        // Icon for Center Node (Simple Text Star)
        node.filter(d => d.group === 'center')
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("fill", "white")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text("★");

        // 5. Drag Behavior
        node.call(d3.drag<any, any>()
            .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }));

        // 6. Tick Update
        simulation.on("tick", () => {
            link
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        // Cleanup
        return () => {
            simulation.stop();
        };
    }, [profile, onNodeClick]);

    return (
        <div ref={containerRef} className="w-full h-[400px] bg-white/40 dark:bg-black/20 rounded-xl overflow-hidden border border-gray-200/50 dark:border-white/5 relative shadow-inner backdrop-blur-sm">
             <div className="absolute top-4 right-4 z-10 bg-white/80 dark:bg-black/60 backdrop-blur-md p-3 rounded-lg border border-gray-200/50 dark:border-white/10 text-xs space-y-2 shadow-lg">
                 <div className="font-semibold text-gray-500 dark:text-gray-400 mb-1">Relationship Map</div>
                 <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span>
                     <span className="text-gray-700 dark:text-gray-300 font-medium">Selected Actor</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span>
                     <span className="text-gray-700 dark:text-gray-300">Affiliate / Ally</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span>
                     <span className="text-gray-700 dark:text-gray-300">Rival / Adversary</span>
                 </div>
                 <div className="text-[10px] text-gray-400 mt-2 border-t border-gray-200 dark:border-gray-700 pt-2 italic">
                     Scroll to zoom • Drag to pin
                 </div>
             </div>
             <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none"></svg>
        </div>
    );
};

export const ThreatActorKB: React.FC<ThreatActorKBProps> = ({ initialQuery }) => {
    const [query, setQuery] = useState('');
    const [profile, setProfile] = useState<ThreatActorProfile | null>(null);
    const [savedActors, setSavedActors] = useState<ThreatActorProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [isAiGenerated, setIsAiGenerated] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Combine static catalog with saved user actors
    const combinedCatalog = useMemo(() => {
        // Create a map by name to avoid duplicates, preferring savedActors (newer)
        const map = new Map<string, ThreatActorProfile>();
        STATIC_CATALOG.forEach(a => map.set(a.name.toLowerCase(), a));
        savedActors.forEach(a => map.set(a.name.toLowerCase(), a));
        return Array.from(map.values()).sort((a, b) => b.notabilityScore! - a.notabilityScore!);
    }, [savedActors]);

    // Filtered list for the Grid View
    const filteredCatalog = useMemo(() => {
        if (!query) return combinedCatalog;
        const q = query.toLowerCase();
        return combinedCatalog.filter(a => 
            a.name.toLowerCase().includes(q) || 
            a.aliases?.some(alias => alias.toLowerCase().includes(q))
        );
    }, [query, combinedCatalog]);

    useEffect(() => {
        loadSavedActors();
    }, []);

    useEffect(() => {
        if (initialQuery) {
            setQuery(initialQuery);
            handleSearch(initialQuery);
        }
    }, [initialQuery]);

    const loadSavedActors = async () => {
        const actors = await dbService.getAllActors();
        setSavedActors(actors);
    };

    const handleSearch = async (target: string = query) => {
        if (!target.trim()) return;
        
        setError(null);
        setProfile(null);
        setIsAiGenerated(false);
        setIsSaved(false);

        // 1. Check Local Catalog First (Instant)
        const localMatch = combinedCatalog.find(a => 
            a.name.toLowerCase() === target.toLowerCase() || 
            a.aliases?.some(alias => alias.toLowerCase() === target.toLowerCase())
        );

        if (localMatch) {
            setProfile(localMatch);
            // Check if it's already in DB to set save state (Static ones aren't "saved" in DB usually unless modified, but let's assume static are valid)
            // Actually, simply show it. We only allow saving "New" AI generated ones to DB.
            addToHistory(localMatch.name);
            return;
        }

        // 2. If not found, we simply allow the user to trigger AI manually via UI (we don't auto-trigger to save tokens/unwanted calls)
        // This is handled by the render logic showing the "Not Found" card.
    };

    const handleAiLookup = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await lookupThreatActor(query);
            setProfile(result);
            setIsAiGenerated(true);
            addToHistory(result.name);
        } catch (e: any) {
            setError(e.message || "Failed to retrieve profile via AI.");
        } finally {
            setLoading(false);
        }
    };

    const addToHistory = (name: string) => {
        if (!searchHistory.includes(name)) {
            setSearchHistory(prev => [name, ...prev].slice(0, 5));
        }
    };

    const handleSaveActor = async () => {
        if (profile) {
            await dbService.saveActor(profile);
            await loadSavedActors();
            setIsSaved(true);
            setIsAiGenerated(false); // It's now a saved actor
        }
    };

    const handleCatalogClick = (name: string) => {
        setQuery(name);
        handleSearch(name);
    };

    const handleReset = () => {
        setProfile(null);
        setQuery('');
        setError(null);
        setIsAiGenerated(false);
    };

    const getScoreColor = (score: number) => {
        if (score >= 9) return 'text-red-500';
        if (score >= 7) return 'text-orange-500';
        if (score >= 5) return 'text-yellow-500';
        return 'text-blue-500';
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header / Search Area */}
            <div className="glass-panel p-8 rounded-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100/50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400 backdrop-blur-sm shadow-sm">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">Threat Actor Knowledgebase</h1>
                            <p className="text-gray-500 dark:text-gray-400">Deep-dive profiles on APT groups, cybercrime gangs, and hacktivists.</p>
                        </div>
                    </div>
                </div>

                <div className="relative max-w-2xl">
                    <div className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                // If user clears input, go back to catalog
                                if (e.target.value === '' && profile) handleReset();
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search actor by name or alias (e.g., 'Cozy Bear', 'Lazarus')..."
                            className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm"
                        />
                        <Search className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                        <button 
                            onClick={() => handleSearch()}
                            className="absolute right-2 top-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20"
                        >
                            Find
                        </button>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="glass-panel p-4 rounded-xl border-red-200/50 dark:border-red-800/50 text-red-600 dark:text-red-300 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Empty Search Result / Not Found State -> AI Prompt */}
            {!profile && !loading && query && filteredCatalog.length === 0 && (
                 <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center animate-in zoom-in-95">
                     <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                         <FileSearch className="w-8 h-8 text-gray-400" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Local Profile Found</h3>
                     <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                         "{query}" does not exist in your local library. Would you like to use AI to generate a threat intelligence profile based on live open-source data?
                     </p>
                     <button 
                        onClick={handleAiLookup}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 font-bold transition-transform hover:scale-105"
                     >
                         <Sparkles className="w-5 h-5" /> Generate Intelligence Profile
                     </button>
                 </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="text-center py-20 flex flex-col items-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Analyzing Threat Landscape...</h3>
                    <p className="text-gray-500 dark:text-gray-400">Synthesizing OSINT data with AI reasoning engine.</p>
                </div>
            )}

            {/* Catalog Grid View (Default when no profile selected and search matches exist) */}
            {!profile && !loading && filteredCatalog.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
                        <LayoutGrid className="w-4 h-4" /> Notable Adversaries
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredCatalog.map((actor, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleCatalogClick(actor.name)}
                                className="glass-card p-5 rounded-xl hover:border-primary dark:hover:border-primary hover:shadow-lg hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all text-left group relative"
                            >
                                <div className="absolute top-4 right-4">
                                     <div className={`flex items-center gap-1 text-xs font-bold ${getScoreColor(actor.notabilityScore || 5)} bg-white/50 dark:bg-black/30 px-2 py-1 rounded-md border border-gray-100/50 dark:border-white/10 backdrop-blur-sm`}>
                                         <Zap className="w-3 h-3" /> {(actor.notabilityScore || 0)}/10
                                     </div>
                                </div>

                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 bg-gray-100/50 dark:bg-white/5 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <Users className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary" />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-sm border border-transparent bg-gray-100/50 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200/50 dark:border-gray-600/30">
                                        {actor.origin || "Unknown"}
                                    </span>
                                </div>

                                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 group-hover:text-primary transition-colors truncate pr-14">{actor.name}</h3>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                                    {actor.aliases?.join(", ")}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100/50 dark:border-white/5">
                                    <Globe className="w-3 h-3" /> {actor.origin || "Unknown Origin"}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Profile View */}
            {profile && !loading && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <button 
                            onClick={handleReset}
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Catalog
                        </button>
                        
                        {/* Save Button for AI Generated Profiles */}
                        {isAiGenerated && !isSaved && (
                            <button 
                                onClick={handleSaveActor}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition-all animate-in fade-in"
                            >
                                <Save className="w-4 h-4" /> Save to Knowledgebase
                            </button>
                        )}
                        {isSaved && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold border border-gray-200 dark:border-gray-700">
                                <CheckCircle className="w-4 h-4" /> Saved
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Main Info Card */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="glass-panel rounded-xl overflow-hidden">
                                <div className="p-6 border-b border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.name}</h2>
                                            {profile.origin && (
                                                <span className="px-3 py-1 bg-gray-200/50 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase rounded-full flex items-center gap-1 backdrop-blur-sm">
                                                    <Globe className="w-3 h-3" /> {profile.origin}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.aliases?.map(alias => (
                                                <span key={alias} className="text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 px-2 py-1 rounded border border-gray-200/50 dark:border-white/10">
                                                    AKA: {alias}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-2 items-end">
                                        {profile.notabilityScore !== undefined && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-sm ${
                                                profile.notabilityScore >= 9 ? 'bg-red-50/50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400' :
                                                profile.notabilityScore >= 7 ? 'bg-orange-50/50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/30 text-orange-700 dark:text-orange-400' :
                                                'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400'
                                            }`}>
                                                <Zap className="w-4 h-4" />
                                                <span className="font-bold">Impact Score: {profile.notabilityScore}/10</span>
                                            </div>
                                        )}

                                        {profile.motivation && (
                                            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-lg p-2 max-w-xs text-right backdrop-blur-sm">
                                                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1 justify-end">
                                                    Motivation <Crosshair className="w-3 h-3" />
                                                </div>
                                                <div className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-tight">
                                                    {profile.motivation}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 text-gray-600 dark:text-gray-300 leading-relaxed text-lg bg-white/20 dark:bg-white/5 backdrop-blur-sm">
                                    {profile.description}
                                </div>
                            </div>

                            {/* Timeline */}
                            {profile.timeline && profile.timeline.length > 0 && (
                                <div className="glass-panel p-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-primary" /> Operational Timeline
                                    </h3>
                                    <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8">
                                        {profile.timeline.map((event, i) => (
                                            <div key={i} className="relative pl-8">
                                                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-primary"></div>
                                                <div className="text-xs font-bold text-primary mb-1">{event.date}</div>
                                                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">{event.title}</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{event.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TTPs & Malware */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass-panel p-6 h-full">
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <GitBranch className="w-4 h-4" /> Tactics & Techniques
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.ttps?.length ? profile.ttps.map((ttp, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-purple-50/50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-100/50 dark:border-purple-900/30 rounded-lg text-xs font-medium backdrop-blur-sm">
                                                {ttp}
                                            </span>
                                        )) : <span className="text-xs text-gray-400">No specific TTPs identified.</span>}
                                    </div>
                                </div>
                                <div className="glass-panel p-6 h-full">
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Zap className="w-4 h-4" /> Toolset & Malware
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.preferredMalware?.map((mw, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-red-50/50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100/50 dark:border-red-900/30 rounded-lg text-xs font-medium backdrop-blur-sm">
                                                {mw}
                                            </span>
                                        ))}
                                        {profile.tools?.map((tool, i) => (
                                             <span key={`tool-${i}`} className="px-3 py-1.5 bg-orange-50/50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-100/50 dark:border-orange-900/30 rounded-lg text-xs font-medium backdrop-blur-sm">
                                                {tool}
                                             </span>
                                        ))}
                                        {(!profile.preferredMalware?.length && !profile.tools?.length) && (
                                            <span className="text-xs text-gray-400">No specific malware identified.</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* IOCs Section */}
                            {profile.sample_iocs && profile.sample_iocs.length > 0 && (
                                <div className="glass-panel p-6">
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Fingerprint className="w-4 h-4 text-indigo-500" /> Sample Indicators of Compromise (IOCs)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {profile.sample_iocs.map((ioc, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 bg-gray-50/50 dark:bg-white/5 rounded border border-gray-100/50 dark:border-white/10 font-mono text-xs text-gray-600 dark:text-gray-300 break-all hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-copy group backdrop-blur-sm" title="Copy IOC">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></div>
                                                {ioc}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Right Sidebar */}
                        <div className="space-y-6">
                            
                            {/* Relationships Graph */}
                            <div className="glass-panel p-4">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Network className="w-4 h-4 text-blue-500" /> Actor Connections
                                </h3>
                                <RelationshipGraph profile={profile} onNodeClick={handleCatalogClick} />
                                
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <div className="bg-green-50/50 dark:bg-green-900/10 p-2 rounded border border-green-100/50 dark:border-green-900/30 backdrop-blur-sm">
                                        <div className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase flex items-center gap-1 mb-1">
                                            <Network className="w-3 h-3" /> Affiliates
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-300">
                                            {profile.relationships?.affiliated_with?.length 
                                                ? profile.relationships.affiliated_with.join(", ") 
                                                : "None identified"}
                                        </div>
                                    </div>
                                    <div className="bg-red-50/50 dark:bg-red-900/10 p-2 rounded border border-red-100/50 dark:border-red-900/30 backdrop-blur-sm">
                                        <div className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase flex items-center gap-1 mb-1">
                                            <Swords className="w-3 h-3" /> Rivals
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-300">
                                            {profile.relationships?.rival_of?.length 
                                                ? profile.relationships.rival_of.join(", ") 
                                                : "None identified"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Targeted Industries */}
                            <div className="glass-panel p-6">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Typical Targets
                                </h3>
                                <ul className="space-y-2">
                                    {profile.targetedIndustries?.map((ind, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            {ind}
                                        </li>
                                    ))}
                                    {!profile.targetedIndustries?.length && <li className="text-xs text-gray-400">No targets specified.</li>}
                                </ul>
                            </div>

                            {/* Key Stats / Meta */}
                            <div className="bg-white/30 dark:bg-black/20 rounded-xl border border-gray-200/50 dark:border-white/5 p-6 backdrop-blur-sm">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Dossier Metadata</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">First Observed</div>
                                        <div className="font-mono text-sm font-medium dark:text-gray-200">{profile.firstSeen || "Unknown"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Last Validated</div>
                                        <div className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                            {new Date().toLocaleDateString()}
                                        </div>
                                    </div>
                                    {isAiGenerated && (
                                        <div className="pt-2 border-t border-gray-100/50 dark:border-white/5">
                                            <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/10 p-2 rounded">
                                                <Sparkles className="w-3 h-3" /> AI Generated Profile
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
