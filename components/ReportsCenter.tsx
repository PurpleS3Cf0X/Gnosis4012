
import React, { useState, useEffect, useMemo } from 'react';
import { ReportConfig } from '../types';
import { dbService } from '../services/dbService';
import { generateExecutiveSummary } from '../services/geminiService';
import { FileText, Download, Search, Filter, RefreshCw, ChevronDown, RotateCcw } from 'lucide-react';

export const ReportsCenter: React.FC = () => {
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedReports = await dbService.getReports();
    setReports(loadedReports);
  };

  const generateReport = async (type: ReportConfig['type']) => {
      const id = crypto.randomUUID();
      const newReport: ReportConfig = {
          id,
          title: `${type === 'WEEKLY_SUMMARY' ? 'Weekly Threat' : 'Incident'} Report - ${new Date().toLocaleDateString()}`,
          type,
          generatedAt: new Date().toISOString(),
          status: 'GENERATING'
      };
      
      // Optimistic update
      setReports(prev => [newReport, ...prev]);

      try {
          const history = await dbService.getHistory();
          // Mocking report content generation using the summary service
          const summary = await generateExecutiveSummary(history.slice(0, 10));
          
          const completedReport: ReportConfig = {
              ...newReport,
              status: 'READY',
              summary: summary
          };
          await dbService.saveReport(completedReport);
          loadData();
      } catch (e) {
          console.error("Report gen failed", e);
      }
  };

  const filteredReports = useMemo(() => {
      return reports.filter(r => {
          const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                (r.summary || '').toLowerCase().includes(searchQuery.toLowerCase());
          const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
          return matchesSearch && matchesType;
      });
  }, [reports, searchQuery, typeFilter]);

  const resetFilters = () => {
      setSearchQuery('');
      setTypeFilter('ALL');
  };

  return (
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-12">
          <div className="glass-panel p-8 rounded-2xl">
             <div className="flex items-center gap-4 mb-4">
                 <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 backdrop-blur-sm">
                     <FileText className="w-8 h-8" />
                 </div>
                 <div>
                     <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reporting Center</h1>
                     <p className="text-gray-500 dark:text-gray-400">Generate compliance and activity reports powered by AI.</p>
                 </div>
             </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
              
              {/* Toolbar */}
              <div className="flex flex-1 gap-3 w-full md:w-auto">
                  <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          type="text"
                          placeholder="Search reports..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white"
                      />
                  </div>
                  
                  <div className="relative w-48">
                      <select 
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white appearance-none cursor-pointer"
                      >
                          <option value="ALL">All Report Types</option>
                          <option value="WEEKLY_SUMMARY">Weekly Summary</option>
                          <option value="INCIDENT_REPORT">Incident Report</option>
                          <option value="THREAT_LANDSCAPE">Threat Landscape</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>

                  {(searchQuery || typeFilter !== 'ALL') && (
                      <button onClick={resetFilters} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Reset Filters">
                          <RotateCcw className="w-4 h-4" />
                      </button>
                  )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full md:w-auto justify-end">
                  <button onClick={() => generateReport('INCIDENT_REPORT')} className="px-4 py-2 border border-gray-200/50 dark:border-gray-700 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 backdrop-blur-sm transition-colors whitespace-nowrap">
                      Incident Summary
                  </button>
                  <button onClick={() => generateReport('WEEKLY_SUMMARY')} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg shadow-primary/20 transition-all whitespace-nowrap">
                      <FileText className="w-4 h-4" /> Generate Report
                  </button>
              </div>
          </div>

          <div className="space-y-4">
              {filteredReports.map(report => (
                  <div key={report.id} className="glass-card p-6 rounded-xl flex items-start gap-4 animate-in slide-in-from-bottom-2">
                      <div className="p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg backdrop-blur-sm">
                          <FileText className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-start">
                               <div>
                                   <h4 className="font-bold text-gray-900 dark:text-white text-lg">{report.title}</h4>
                                   <p className="text-xs text-gray-500 mt-1 mb-3">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
                               </div>
                               <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase backdrop-blur-sm border ${
                                   report.status === 'READY' 
                                   ? 'bg-green-50/50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900/50' 
                                   : 'bg-yellow-50/50 text-yellow-700 border-yellow-200 animate-pulse'
                               }`}>
                                   {report.status}
                               </span>
                          </div>
                          
                          {report.summary && (
                              <div className="bg-gray-50/50 dark:bg-black/20 p-4 rounded-lg border border-gray-100/50 dark:border-white/5 text-sm text-gray-700 dark:text-gray-300 mb-4 backdrop-blur-sm leading-relaxed">
                                  {report.summary}
                              </div>
                          )}

                          {report.status === 'READY' && (
                              <div className="flex gap-3">
                                  <button className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary-dark transition-colors bg-primary/10 px-3 py-1.5 rounded-lg">
                                      <Download className="w-3.5 h-3.5" /> PDF
                                  </button>
                                  <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                                      <Download className="w-3.5 h-3.5" /> CSV
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              ))}
              
              {filteredReports.length === 0 && (
                  <div className="text-center py-16 text-gray-500 dark:text-gray-400 glass-panel rounded-xl flex flex-col items-center">
                      <FileText className="w-12 h-12 opacity-20 mb-3" />
                      <p>No reports found.</p>
                  </div>
              )}
          </div>
      </div>
  );
};
