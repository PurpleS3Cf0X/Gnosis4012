import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ThreatActorProfile } from '../types';
import { lookupThreatActor } from '../services/geminiService';
import { Search, Users, Globe, BookOpen, LayoutGrid, ShieldAlert, Loader2, ArrowLeft, Calendar, GitBranch, Target, Crosshair, Zap, Network, Swords } from 'lucide-react';

interface ThreatActorKBProps {
  initialQuery?: string;
}

// Comprehensive initial dataset for the catalog view
const ACTOR_CATALOG = [
    { name: "APT29", aliases: ["Cozy Bear", "Midnight Blizzard", "The Dukes"], origin: "Russia", motivation: "Espionage", target: "Gov, Diplomatic, Think Tanks", type: "Nation-State" },
    { name: "Lazarus Group", aliases: ["Hidden Cobra", "Guardians of Peace"], origin: "North Korea", motivation: "Financial, Sabotage", target: "Banks, Crypto, Media", type: "Nation-State" },
    { name: "APT28", aliases: ["Fancy Bear", "Strontium", "Sofacy"], origin: "Russia", motivation: "Espionage, Influence", target: "Gov, Military, Elections", type: "Nation-State" },
    { name: "Sandworm", aliases: ["Voodoo Bear", "Telebots"], origin: "Russia", motivation: "Sabotage", target: "Critical Infra, Energy", type: "Nation-State" },
    { name: "APT41", aliases: ["Double Dragon", "Wicked Panda"], origin: "China", motivation: "Espionage, Financial", target: "Tech, Telecom, Healthcare", type: "Nation-State" },
    { name: "Wizard Spider", aliases: ["Grim Spider", "Trickbot Group"], origin: "Russia (Cybercrime)", motivation: "Financial", target: "Global Enterprise", type: "Cybercrime" },
    { name: "Equation Group", aliases: [], origin: "USA (Suspected)", motivation: "Espionage", target: "Gov, Telecom, Crypto", type: "Nation-State" },
    { name: "Turla", aliases: ["Venomous Bear", "Waterbug"], origin: "Russia", motivation: "Espionage", target: "Gov, Military, Diplo", type: "Nation-State" },
    { name: "FIN7", aliases: ["Carbanak"], origin: "Eastern Europe", motivation: "Financial", target: "Retail, Hospitality", type: "Cybercrime" },
    { name: "LockBit", aliases: ["LockBit 3.0"], origin: "Global (RaaS)", motivation: "Financial", target: "Global Enterprise", type: "Cybercrime" },
    { name: "REvil", aliases: ["Sodinokibi"], origin: "Russia", motivation: "Financial", target: "MSP, Gov, Enterprise", type: "Cybercrime" },
    { name: "Charming Kitten", aliases: ["APT35", "Phosphorus"], origin: "Iran", motivation: "Espionage", target: "Gov, Activists, Media", type: "Nation-State" },
    { name: "OceanLotus", aliases: ["APT32"], origin: "Vietnam", motivation: "Espionage", target: "Foreign Corps, Dissidents", type: "Nation-State" },
    { name: "Deep Panda", aliases: ["APT19"], origin: "China", motivation: "Espionage", target: "Defense, Gov", type: "Nation-State" },
    { name: "OilRig", aliases: ["APT34", "Helix Kitten"], origin: "Iran", motivation: "Espionage", target: "Financial, Energy, Gov", type: "Nation-State" },
    { name: "Gamaredon", aliases: ["Primitive Bear"], origin: "Russia", motivation: "Espionage", target: "Ukraine Gov/Military", type: "Nation-State" },
    { name: "Kimsuky", aliases: ["Velvet Chollima"], origin: "North Korea", motivation: "Espionage", target: "Think Tanks, Nuclear", type: "Nation-State" },
    { name: "MuddyWater", aliases: ["Static Kitten"], origin: "Iran", motivation: "Espionage", target: "Middle East Telecom/Gov", type: "Nation-State" },
    { name: "Silence", aliases: [], origin: "Eastern Europe", motivation: "Financial", target: "Banks", type: "Cybercrime" },
    { name: "DarkSide", aliases: [], origin: "Eastern Europe", motivation: "Financial", target: "Infra, Enterprise", type: "Cybercrime" },
    { name: "APT1", aliases: ["Comment Crew"], origin: "China", motivation: "Espionage", target: "US Defense, Tech", type: "Nation-State" },
    { name: "TA505", aliases: ["Evil Corp (Affiliated)"], origin: "Russia", motivation: "Financial", target: "Global Finance", type: "Cybercrime" },
    { name: "Anonymous", aliases: [], origin: "Global", motivation: "Hacktivism", target: "Gov, Corps", type: "Hacktivist" },
    { name: "Killnet", aliases: [], origin: "Russia", motivation: "Hacktivism", target: "NATO Countries", type: "Hacktivist" }
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
        <div ref={containerRef} className="w-full h-[400px] bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative shadow-inner">
             <div className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs space-y-2 shadow-lg">
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    useEffect(() => {
        if (initialQuery) {
            setQuery(initialQuery);
            handleSearch(initialQuery);
        }
    }, [initialQuery]);

    const handleSearch = async (target: string = query) => {
        if (!target.trim()) return;
        setLoading(true);
        setError(null);
        setProfile(null);
        try {
            const result = await lookupThreatActor(target);
            setProfile(result);
            if (!searchHistory.includes(result.name)) {
                setSearchHistory(prev => [result.name, ...prev].slice(0, 5));
            }
        } catch (e: any) {
            setError(e.message || "Failed to retrieve profile.");
        } finally {
            setLoading(false);
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
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header / Search Area */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Threat Actor Knowledgebase</h1>
                            <p className="text-gray-500 dark:text-gray-400">Deep-dive profiles on APT groups, cybercrime gangs, and hacktivists.</p>
                        </div>
                    </div>
                </div>

                <div className="relative max-w-2xl">
                    <div className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search actor by name or alias (e.g., 'Cozy Bear', 'Lazarus')..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                        />
                        <Search className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                        <button 
                            onClick={() => handleSearch()}
                            className="absolute right-2 top-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lookup"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Catalog Grid View (Default) */}
            {!profile && !loading && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider px-2">
                        <LayoutGrid className="w-4 h-4" /> Notable Adversaries
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {ACTOR_CATALOG.map((actor, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleCatalogClick(actor.name)}
                                className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:shadow-lg transition-all text-left group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <Users className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-primary" />
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                        actor.type === 'Nation-State' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                        actor.type === 'Cybercrime' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                        {actor.type}
                                    </span>
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 group-hover:text-primary transition-colors">{actor.name}</h3>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                                    {actor.aliases.join(", ")}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                    <Globe className="w-3 h-3" /> {actor.origin}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Profile View */}
            {profile && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Catalog
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Main Info Card */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
                                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.name}</h2>
                                            {profile.origin && (
                                                <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase rounded-full flex items-center gap-1">
                                                    <Globe className="w-3 h-3" /> {profile.origin}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.aliases?.map(alias => (
                                                <span key={alias} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                                    AKA: {alias}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {profile.motivation && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3 max-w-xs">
                                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1 flex items-center gap-1">
                                                <Crosshair className="w-3 h-3" /> Motivation
                                            </div>
                                            <div className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-tight">
                                                {profile.motivation}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                                    {profile.description}
                                </div>
                            </div>

                            {/* Timeline */}
                            {profile.timeline && profile.timeline.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
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
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm h-full">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <GitBranch className="w-4 h-4" /> Tactics & Techniques
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.ttps?.map((ttp, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 rounded-lg text-xs font-medium">
                                                {ttp}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm h-full">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Zap className="w-4 h-4" /> Toolset & Malware
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.preferredMalware?.map((mw, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-medium">
                                                {mw}
                                            </span>
                                        ))}
                                        {profile.tools?.map((tool, i) => (
                                             <span key={`tool-${i}`} className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900/30 rounded-lg text-xs font-medium">
                                                {tool}
                                             </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="space-y-6">
                            
                            {/* Relationships Graph */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-lg">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Network className="w-4 h-4 text-blue-500" /> Actor Connections
                                </h3>
                                <RelationshipGraph profile={profile} onNodeClick={handleCatalogClick} />
                                
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded border border-green-100 dark:border-green-900/30">
                                        <div className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase flex items-center gap-1 mb-1">
                                            <Network className="w-3 h-3" /> Affiliates
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-300">
                                            {profile.relationships?.affiliated_with?.length 
                                                ? profile.relationships.affiliated_with.join(", ") 
                                                : "None identified"}
                                        </div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/30">
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
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Typical Targets
                                </h3>
                                <ul className="space-y-2">
                                    {profile.targetedIndustries?.map((ind, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            {ind}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Key Stats / Meta */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Dossier Metadata</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">First Observed</div>
                                        <div className="font-mono text-sm font-medium">{profile.firstSeen || "Unknown"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Last Validated</div>
                                        <div className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                            {new Date().toLocaleDateString()}
                                        </div>
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