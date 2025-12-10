
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { ThreatActorProfile } from '../types';
import { lookupThreatActor, enrichThreatActor } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { Search, Users, Globe, BookOpen, LayoutGrid, ShieldAlert, Loader2, ArrowLeft, Calendar, GitBranch, Target, Crosshair, Zap, Network, Swords, Fingerprint, Save, CheckCircle, Sparkles, FileSearch, RefreshCw, Clock, ExternalLink, Image as ImageIcon, Filter, ChevronDown, RotateCcw } from 'lucide-react';

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
    const [enriching, setEnriching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [isAiGenerated, setIsAiGenerated] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Filter States for Grid
    const [filterOrigin, setFilterOrigin] = useState<string>('ALL');
    const [filterMotivation, setFilterMotivation] = useState<string>('ALL');
    const [filterIndustry, setFilterIndustry] = useState<string>('ALL');

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
        let results = combinedCatalog;
        
        // Text Search
        if (query) {
            const q = query.toLowerCase();
            results = results.filter(a => 
                a.name.toLowerCase().includes(q) || 
                a.aliases?.some(alias => alias.toLowerCase().includes(q))
            );
        }

        // Origin Filter
        if (filterOrigin !== 'ALL') {
            results = results.filter(a => a.origin?.includes(filterOrigin));
        }

        // Motivation Filter
        if (filterMotivation !== 'ALL') {
            results = results.filter(a => a.motivation?.includes(filterMotivation));
        }

        return results;
    }, [query, combinedCatalog, filterOrigin, filterMotivation, filterIndustry]);

    // Extract unique filter options
    const origins = useMemo(() => Array.from(new Set(combinedCatalog.map(c => c.origin?.split(' ')[0] || 'Unknown').filter(Boolean))), [combinedCatalog]);
    const motivations = useMemo(() => Array.from(new Set(combinedCatalog.flatMap(c => c.motivation?.split(',').map(m => m.trim()) || []).filter(Boolean))), [combinedCatalog]);

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
        setHasUnsavedChanges(false);

        // 1. Check Local Catalog First (Instant)
        const localMatch = combinedCatalog.find(a => 
            a.name.toLowerCase() === target.toLowerCase() || 
            a.aliases?.some(alias => alias.toLowerCase() === target.toLowerCase())
        );

        if (localMatch) {
            setProfile(localMatch);
            // Check if specifically in DB to set saved state
            const inDb = savedActors.some(a => a.name.toLowerCase() === localMatch.name.toLowerCase());
            setIsSaved(inDb);
            
            addToHistory(localMatch.name);
            return;
        }
    };

    const handleAiLookup = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await lookupThreatActor(query);
            setProfile(result);
            setIsAiGenerated(true);
            setIsSaved(false);
            setHasUnsavedChanges(true);
            addToHistory(result.name);
        } catch (e: any) {
            setError(e.message || "Failed to retrieve profile via AI.");
        } finally {
            setLoading(false);
        }
    };

    const handleEnrich = async () => {
        if (!profile) return;
        setEnriching(true);
        setError(null);
        try {
            const enrichedProfile = await enrichThreatActor(profile.name);
            setProfile(enrichedProfile);
            setHasUnsavedChanges(true);
            // Automatically save if it was already a saved actor
            if (isSaved) {
                await dbService.saveActor(enrichedProfile);
                await loadSavedActors();
                setHasUnsavedChanges(false);
            }
        } catch (e: any) {
            setError("Enrichment failed: " + e.message);
        } finally {
            setEnriching(false);
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
            setHasUnsavedChanges(false);
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
        setHasUnsavedChanges(false);
    };

    const resetFilters = () => {
        setFilterOrigin('ALL');
        setFilterMotivation('ALL');
        setQuery('');
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

                {/* Filters Row - Only visible when not viewing a profile */}
                {!profile && !loading && (
                    <div className="flex flex-wrap gap-3 mt-4">
                        <div className="relative">
                            <select 
                                value={filterOrigin}
                                onChange={(e) => setFilterOrigin(e.target.value)}
                                className="pl-3 pr-8 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white appearance-none cursor-pointer"
                            >
                                <option value="ALL">All Origins</option>
                                {origins.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select 
                                value={filterMotivation}
                                onChange={(e) => setFilterMotivation(e.target.value)}
                                className="pl-3 pr-8 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white appearance-none cursor-pointer"
                            >
                                <option value="ALL">All Motivations</option>
                                {motivations.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-