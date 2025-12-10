
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { AnalysisResult, ThreatLevel, IndicatorType } from '../types';
import { 
  ShieldAlert, ShieldCheck, Activity, Globe, Skull, Target, 
  Zap, MapPin, Hash, Server, FileCode, AlertTriangle, TrendingUp 
} from 'lucide-react';

interface DashboardProps {
  history: AnalysisResult[];
}

const COLORS = {
  critical: '#ef4444', // Red 500
  high: '#f97316',     // Orange 500
  medium: '#eab308',   // Yellow 500
  low: '#3b82f6',      // Blue 500
  safe: '#10b981',     // Emerald 500
  primary: '#8b5cf6',  // Violet 500
  slate: '#64748b'     // Slate 500
};

export const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  
  // --- Analytics Aggregation ---

  const stats = useMemo(() => {
    const total = history.length;
    const critical = history.filter(h => h.verdict === ThreatLevel.CRITICAL).length;
    const high = history.filter(h => h.verdict === ThreatLevel.HIGH).length;
    // Calculate Average Risk only for non-safe items to get a better "Threat" metric? 
    // Or just global average. Let's do global.
    const avgScore = total > 0 ? Math.round(history.reduce((acc, curr) => acc + curr.riskScore, 0) / total) : 0;
    
    // Unique Threat Actors
    const uniqueActors = new Set(history.flatMap(h => h.threatActors || []));
    
    return { total, critical, high, avgScore, activeActors: uniqueActors.size };
  }, [history]);

  // 1. Threat Velocity (Timeline)
  const timelineData = useMemo(() => {
    // Group by Date (Last 7 Days or all?) - Let's do dynamic based on data range
    const groups: Record<string, { date: string, critical: number, high: number, other: number }> = {};
    
    // Sort history by date first
    const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    sorted.forEach(h => {
        const date = new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!groups[date]) groups[date] = { date, critical: 0, high: 0, other: 0 };
        
        if (h.verdict === ThreatLevel.CRITICAL) groups[date].critical++;
        else if (h.verdict === ThreatLevel.HIGH) groups[date].high++;
        else groups[date].other++;
    });

    return Object.values(groups).slice(-14); // Last 14 days/entries
  }, [history]);

  // 2. Top Threat Actors
  const actorData = useMemo(() => {
    const counts: Record<string, number> = {};
    history.flatMap(h => h.threatActors || []).forEach(a => {
        counts[a] = (counts[a] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
  }, [history]);

  // 3. Top Malware Families
  const malwareData = useMemo(() => {
    const counts: Record<string, number> = {};
    history.flatMap(h => h.malwareFamilies || []).forEach(m => {
        counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
  }, [history]);

  // 4. Indicator Types
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => {
        counts[h.type] = (counts[h.type] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [history]);

  // 5. Geo Origins (Simplistic parsing)
  const geoData = useMemo(() => {
      const counts: Record<string, number> = {};
      history.forEach(h => {
          if (h.geoGeolocation) {
              // Try to extract Country (last part after comma usually, or just the string)
              const parts = h.geoGeolocation.split(',');
              const country = parts[parts.length - 1].trim();
              counts[country] = (counts[country] || 0) + 1;
          }
      });
      return Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }));
  }, [history]);

  const PIE_COLORS = [COLORS.primary, COLORS.low, COLORS.high, COLORS.critical];

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold text-white mb-1">{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} style={{ color: p.color }} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
              {p.name}: <span className="font-mono">{p.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (history.length === 0) {
      return <EmptyDashboardState />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Threat Score (Avg)" 
          value={stats.avgScore.toString()} 
          icon={<Activity className="text-purple-400" />} 
          trend={stats.avgScore > 50 ? "Elevated" : "Normal"}
          trendColor={stats.avgScore > 50 ? "text-orange-400" : "text-emerald-400"}
        />
        <StatCard 
          title="Critical Incidents" 
          value={stats.critical.toString()} 
          icon={<ShieldAlert className="text-red-500" />} 
          trend={`${Math.round((stats.critical / stats.total) * 100)}% of total`}
          trendColor="text-red-400"
          borderColor="border-red-500/30"
        />
        <StatCard 
          title="Active Adversaries" 
          value={stats.activeActors.toString()} 
          icon={<Skull className="text-orange-500" />} 
          trend="Distinct Actors"
          trendColor="text-gray-400"
        />
        <StatCard 
          title="Total Indicators" 
          value={stats.total.toString()} 
          icon={<DatabaseIcon type={IndicatorType.IP} className="text-blue-400" />} 
          trend="Processed"
          trendColor="text-blue-400"
        />
      </div>

      {/* Main Row: Velocity & Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-500" /> Threat Velocity
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Volume of Critical vs High severity alerts over time</p>
                  </div>
              </div>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={COLORS.critical} stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor={COLORS.critical} stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={COLORS.high} stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor={COLORS.high} stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.1} vertical={false} />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" />
                          <Area type="monotone" dataKey="critical" stroke={COLORS.critical} fillOpacity={1} fill="url(#colorCritical)" name="Critical" />
                          <Area type="monotone" dataKey="high" stroke={COLORS.high} fillOpacity={1} fill="url(#colorHigh)" name="High Risk" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" /> Indicator Mix
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Distribution by IoC type</p>
              <div className="h-[250px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={typeData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {typeData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                              ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</span>
                      <span className="text-xs text-gray-500 uppercase">Total</span>
                  </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {typeData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                          {entry.name}
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* Secondary Row: Actors, Malware, Geo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Top Actors */}
          <div className="glass-panel p-6 rounded-2xl">
               <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                   <Skull className="w-4 h-4" /> Top Adversaries
               </h3>
               <div className="h-[200px] w-full">
                  {actorData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={actorData} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={80} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                            <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                        <Skull className="w-8 h-8 mb-2 opacity-20" />
                        No attributed actors yet
                    </div>
                  )}
               </div>
          </div>

          {/* Top Malware */}
          <div className="glass-panel p-6 rounded-2xl">
               <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                   <Zap className="w-4 h-4" /> Prevalent Malware
               </h3>
               <div className="h-[200px] w-full">
                  {malwareData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={malwareData} margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={80} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                            <Bar dataKey="value" fill={COLORS.critical} radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                        <Zap className="w-8 h-8 mb-2 opacity-20" />
                        No malware families detected
                    </div>
                  )}
               </div>
          </div>

          {/* Top Origins */}
          <div className="glass-panel p-6 rounded-2xl">
               <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                   <Globe className="w-4 h-4" /> Origin Hotspots
               </h3>
               <div className="space-y-3">
                   {geoData.length > 0 ? geoData.map((item, idx) => (
                       <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/40 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                           <div className="flex items-center gap-2">
                               <MapPin className="w-3 h-3 text-gray-400" />
                               <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.name}</span>
                           </div>
                           <span className="text-xs font-mono font-bold bg-white/50 dark:bg-black/30 px-2 py-0.5 rounded text-gray-500">
                               {item.value}
                           </span>
                       </div>
                   )) : (
                     <div className="flex flex-col items-center justify-center h-[200px] text-gray-400 text-xs">
                        <Globe className="w-8 h-8 mb-2 opacity-20" />
                        No location data available
                     </div>
                   )}
               </div>
          </div>
      </div>

    </div>
  );
};

// --- Subcomponents ---

const StatCard = ({ title, value, icon, trend, trendColor, borderColor }: any) => (
  <div className={`glass-panel p-5 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border ${borderColor || 'border-white/40 dark:border-white/10'}`}>
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 rotate-12">
      {icon}
    </div>
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2.5 bg-white/50 dark:bg-black/20 rounded-xl backdrop-blur-sm ring-1 ring-black/5 dark:ring-white/10 shadow-sm">{icon}</div>
      <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">{title}</span>
    </div>
    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-mono tracking-tight">{value}</div>
    <div className={`text-xs font-medium flex items-center gap-1 ${trendColor}`}>
        {trend === 'Elevated' || trend === 'Normal' ? (
            <Activity className="w-3 h-3" />
        ) : null}
        {trend}
    </div>
  </div>
);

const DatabaseIcon = ({ type, className }: { type: IndicatorType, className?: string }) => {
    switch (type) {
        case IndicatorType.IP: return <Server className={className} />;
        case IndicatorType.DOMAIN: return <Globe className={className} />;
        case IndicatorType.HASH: return <Hash className={className} />;
        default: return <FileCode className={className} />;
    }
};

const EmptyDashboardState = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in duration-700">
        <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
            <Activity className="w-24 h-24 text-gray-300 dark:text-gray-700 relative z-10 opacity-50" />
        </div>
        <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Awaiting Intelligence</h2>
            <p className="text-gray-500 dark:text-gray-400">
                The threat landscape is currently empty. Start by analyzing indicators in the 
                <span className="font-bold text-primary"> Analyzer</span> or configure 
                <span className="font-bold text-primary"> Integrations</span> to ingest feeds.
            </p>
        </div>
        <div className="flex gap-4">
             {/* This empty state just guides the user, no actions hooked up here directly */}
        </div>
    </div>
);
