import React, { useState, useEffect } from 'react';
import { ReportConfig } from '../types';
import { dbService } from '../services/dbService';
import { generateExecutiveSummary } from '../services/geminiService';
import { FileText, Download } from 'lucide-react';

export const ReportsCenter: React.FC = () => {
  const [reports, setReports] = useState<ReportConfig[]>([]);

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

  return (
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
             <div className="flex items-center gap-4 mb-4">
                 <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                     <FileText className="w-8 h-8" />
                 </div>
                 <div>
                     <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reporting Center</h1>
                     <p className="text-gray-500 dark:text-gray-400">Generate compliance and activity reports powered by AI.</p>
                 </div>
             </div>
          </div>

          <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generated Reports</h3>
              <div className="flex gap-2">
                  <button onClick={() => generateReport('INCIDENT_REPORT')} className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">
                      Incident Summary
                  </button>
                  <button onClick={() => generateReport('WEEKLY_SUMMARY')} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 text-sm font-medium">
                      <FileText className="w-4 h-4" /> Generate Report
                  </button>
              </div>
          </div>

          <div className="space-y-4">
              {reports.map(report => (
                  <div key={report.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-start gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <FileText className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between">
                               <h4 className="font-bold text-gray-900 dark:text-white text-lg">{report.title}</h4>
                               <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                                   report.status === 'READY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 animate-pulse'
                               }`}>
                                   {report.status}
                               </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 mb-3">Generated: {new Date(report.generatedAt).toLocaleString()}</p>
                          
                          {report.summary && (
                              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50 text-sm text-gray-700 dark:text-gray-300 mb-4">
                                  {report.summary}
                              </div>
                          )}

                          {report.status === 'READY' && (
                              <div className="flex gap-3">
                                  <button className="flex items-center gap-2 text-sm text-primary hover:underline">
                                      <Download className="w-4 h-4" /> Download PDF
                                  </button>
                                  <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                      <Download className="w-4 h-4" /> Export CSV
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              ))}
              {reports.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      No reports generated yet.
                  </div>
              )}
          </div>
      </div>
  );
};