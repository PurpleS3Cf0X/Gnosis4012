import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { AnalysisResult, ThreatLevel } from '../types';
import { ShieldAlert, ShieldCheck, Activity, Globe } from 'lucide-react';

interface DashboardProps {
  history: AnalysisResult[];
}

export const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  
  const stats = useMemo(() => {
    const total = history.length;
    const critical = history.filter(h => h.verdict === ThreatLevel.CRITICAL || h.verdict === ThreatLevel.HIGH).length;
    const avgScore = total > 0 ? Math.round(history.reduce((acc, curr) => acc + curr.riskScore, 0) / total) : 0;
    const safe = history.filter(h => h.verdict === ThreatLevel.SAFE || h.verdict === ThreatLevel.LOW).length;
    return { total, critical, avgScore, safe };
  }, [history]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => {
      counts[h.type] = (counts[h.type] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [history]);

  const riskTrend = useMemo(() => {
    // Reverse to show oldest to newest left to right if history is prepended
    return [...history].reverse().map((h, i) => ({
      name: `Anal ${i+1}`,
      score: h.riskScore
    }));
  }, [history]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Global Threat Status</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Analyzed" 
          value={stats.total} 
          icon={<Activity className="text-blue-400" />} 
          subtext="Indicators processed"
        />
        <StatCard 
          title="High/Critical" 
          value={stats.critical} 
          icon={<ShieldAlert className="text-red-500" />} 
          subtext="Immediate action req"
          borderColor="border-red-200 dark:border-red-900/50"
        />
        <StatCard 
          title="Avg Risk Score" 
          value={stats.avgScore} 
          icon={<Globe className="text-purple-400" />} 
          subtext="Across all entities"
        />
        <StatCard 
          title="Verifed Safe" 
          value={stats.safe} 
          icon={<ShieldCheck className="text-emerald-400" />} 
          subtext="Clean indicators"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg transition-colors">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-200">Risk Score Trend</h3>
          <div className="h-64">
             {history.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={riskTrend}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                   <XAxis dataKey="name" hide />
                   <YAxis domain={[0, 100]} stroke="#9ca3af" />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                     itemStyle={{ color: '#10b981' }}
                   />
                   <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{fill: '#10b981'}} />
                 </LineChart>
               </ResponsiveContainer>
             ) : (
               <EmptyState />
             )}
          </div>
        </div>

        {/* Indicator Types */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg transition-colors">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-200">Indicator Distribution</h3>
          <div className="h-64">
            {history.length > 0 ? (
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, subtext, borderColor = 'border-gray-200 dark:border-gray-700' }: any) => (
  <div className={`bg-white dark:bg-gray-800 p-5 rounded-xl border ${borderColor} shadow-lg relative overflow-hidden group transition-colors`}>
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform scale-150">
      {icon}
    </div>
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">{icon}</div>
      <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">{title}</span>
    </div>
    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 font-mono">{value}</div>
    <div className="text-xs text-gray-500">{subtext}</div>
  </div>
);

const EmptyState = () => (
  <div className="h-full flex flex-col items-center justify-center text-gray-500">
    <Activity className="w-8 h-8 mb-2 opacity-50" />
    <span className="text-sm">No data available</span>
  </div>
);