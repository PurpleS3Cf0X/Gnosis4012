import React, { useState, useEffect, useMemo } from 'react';
import { AlertRule, TriggeredAlert, AlertCondition } from '../types';
import { dbService } from '../services/dbService';
import { alertService } from '../services/alertService';
import { 
    Bell, ShieldAlert, Plus, Trash2, CheckCircle, RefreshCw, Eye, Zap, 
    Target, Globe, AlertTriangle, Layers, Search, X, 
    Clock, Activity, ArrowRight, Shield, Filter, Check, AlertOctagon, Play
} from 'lucide-react';

const RULE_TEMPLATES = [
    {
        label: "Critical Risk Threshold",
        description: "Trigger when any indicator has a Risk Score > 90.",
        icon: Zap,
        color: "text-red-500 bg-red-50 dark:bg-red-900/20",
        data: {
            name: "Critical Risk Detected",
            severity: 'CRITICAL',
            logic: 'AND',
            groups: [{
                id: 'g1',
                logic: 'AND',
                conditions: [{ id: 'c1', field: 'riskScore', operator: 'greaterThan', value: 90 }]
            }]
        }
    },
    {
        label: "APT Watchlist",
        description: "Detect known Nation-State actor attribution.",
        icon: Target,
        color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
        data: {
            name: "APT Activity Detected",
            severity: 'CRITICAL',
            logic: 'AND',
            groups: [{
                id: 'g1',
                logic: 'AND',
                conditions: [{ id: 'c1', field: 'threatActor', operator: 'contains', value: 'APT' }]
            }]
        }
    },
    {
        label: "Suspicious Domain",
        description: "High risk domains (>75 score).",
        icon: Globe,
        color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
        data: {
            name: "Suspicious Domain Traffic",
            severity: 'HIGH',
            logic: 'AND',
            groups: [{
                id: 'g1',
                logic: 'AND',
                conditions: [
                    { id: 'c1', field: 'type', operator: 'equals', value: 'Domain' },
                    { id: 'c2', field: 'riskScore', operator: 'greaterThan', value: 75 }
                ]
            }]
        }
    }
];

export const AlertsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'incidents' | 'rules'>('incidents');
  const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtering
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'RESOLVED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
      name: '',
      severity: 'HIGH',
      enabled: true,
      logic: 'AND',
      groups: [{
          id: crypto.randomUUID(),
          logic: 'AND',
          conditions: [{ id: crypto.randomUUID(), field: 'riskScore', operator: 'greaterThan', value: 75 }]
      }],
      actionChannels: ['email']
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
        const [loadedAlerts, loadedRules] = await Promise.all([
            dbService.getAlerts(),
            dbService.getRules()
        ]);
        setAlerts(loadedAlerts);
        setRules(loadedRules);
    } finally {
        setLoading(false);
    }
  };

  const handleStatusUpdate = async (alert: TriggeredAlert, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
      await alertService.updateAlertStatus(alert, status);
      // Optimistic update
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status } : a));
  };

  const handleToggleRule = async (rule: AlertRule) => {
      const updatedRule = { ...rule, enabled: !rule.enabled };
      await dbService.saveRule(updatedRule);
      setRules(prev => prev.map(r => r.id === rule.id ? updatedRule : r));
  };

  const handleDeleteRule = async (id: string) => {
      if (confirm('Delete this detection rule? This cannot be undone.')) {
          await dbService.deleteRule(id);
          setRules(prev => prev.filter(r => r.id !== id));
      }
  };

  // Rule Builder Logic
  const handleCreateRule = async () => {
      if (!newRule.name) {
          alert("Rule name is required");
          return;
      }
      await alertService.createRule(newRule as any);
      setIsRuleModalOpen(false);
      resetNewRule();
      loadData();
  };

  const resetNewRule = () => {
      setNewRule({ 
          name: '', 
          severity: 'HIGH', 
          enabled: true, 
          logic: 'AND',
          groups: [{
              id: crypto.randomUUID(),
              logic: 'AND',
              conditions: [{ id: crypto.randomUUID(), field: 'riskScore', operator: 'greaterThan', value: 75 }]
          }],
          actionChannels: ['email'] 
      });
  };

  const loadTemplate = (templateData: any) => {
      const groups = templateData.groups.map((g: any) => ({
          ...g,
          id: crypto.randomUUID(),
          conditions: g.conditions.map((c: any) => ({ ...c, id: crypto.randomUUID() }))
      }));
      setNewRule({ ...newRule, ...templateData, groups });
  };

  const updateCondition = (groupId: string, conditionId: string, field: keyof AlertCondition, value: any) => {
      setNewRule(prev => ({
          ...prev,
          groups: prev.groups?.map(g => {
              if (g.id === groupId) {
                  return {
                      ...g,
                      conditions: g.conditions.map(c => c.id === conditionId ? { ...c, [field]: value } : c)
                  };
              }
              return g;
          })
      }));
  };

  // Stats
  const stats = useMemo(() => {
      return {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length,
          open: alerts.filter(a => a.status === 'NEW').length,
          resolved: alerts.filter(a => a.status === 'RESOLVED').length
      };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
      return alerts.filter(a => {
          const matchesStatus = statusFilter === 'ALL' ? true : a.status === statusFilter;
          const matchesSearch = searchTerm 
            ? a.ioc.toLowerCase().includes(searchTerm.toLowerCase()) || a.ruleName.toLowerCase().includes(searchTerm.toLowerCase())
            : true;
          return matchesStatus && matchesSearch;
      });
  }, [alerts, statusFilter, searchTerm]);

  // Sub-components for cleaner rendering
  const SeverityBadge = ({ severity }: { severity: string }) => {
      const colors = {
          CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-900/50',
          HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-900/50',
          MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50',
          LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
      };
      return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colors[severity as keyof typeof colors] || colors.LOW}`}>
              {severity}
          </span>
      );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="flex items-center gap-4">
             <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
                 <Bell className="w-8 h-8" />
             </div>
             <div>
                 <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts & Detections</h1>
                 <p className="text-gray-500 dark:text-gray-400">Monitor active incidents and configure detection logic.</p>
             </div>
         </div>
         <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
             <button 
                onClick={() => setActiveTab('incidents')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'incidents' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
             >
                Incident Response
             </button>
             <button 
                onClick={() => setActiveTab('rules')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'rules' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
             >
                Detection Rules
             </button>
         </div>
      </div>

      {/* Tab: Incident Response */}
      {activeTab === 'incidents' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
              
              {/* Heads Up Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Critical Open</span>
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertOctagon className="w-6 h-6" />
                          <span className="text-3xl font-mono font-bold">{stats.critical}</span>
                      </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Incidents</span>
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <Activity className="w-6 h-6" />
                          <span className="text-3xl font-mono font-bold">{stats.open}</span>
                      </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Resolved</span>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-6 h-6" />
                          <span className="text-3xl font-mono font-bold">{stats.resolved}</span>
                      </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Events</span>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Layers className="w-6 h-6" />
                          <span className="text-3xl font-mono font-bold">{stats.total}</span>
                      </div>
                  </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          type="text"
                          placeholder="Search incidents by rule or IOC..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white"
                      />
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Filter className="w-4 h-4 text-gray-400 ml-2 mr-1" />
                      <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1 text-xs font-bold rounded ${statusFilter === 'ALL' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500'}`}>All</button>
                      <button onClick={() => setStatusFilter('NEW')} className={`px-3 py-1 text-xs font-bold rounded ${statusFilter === 'NEW' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>New</button>
                      <button onClick={() => setStatusFilter('RESOLVED')} className={`px-3 py-1 text-xs font-bold rounded ${statusFilter === 'RESOLVED' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'text-gray-500'}`}>Resolved</button>
                  </div>
              </div>

              {/* Alerts List */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  {filteredAlerts.length === 0 ? (
                      <div className="p-12 text-center flex flex-col items-center">
                          <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Incidents Found</h3>
                          <p className="text-gray-500">Your environment appears secure, or no alerts match your filters.</p>
                      </div>
                  ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <th className="p-4">Severity</th>
                                    <th className="p-4">Rule Name</th>
                                    <th className="p-4">Entity (IOC)</th>
                                    <th className="p-4">Detected At</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredAlerts.map(alert => (
                                    <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                        <td className="p-4"><SeverityBadge severity={alert.severity} /></td>
                                        <td className="p-4 font-medium text-gray-900 dark:text-white">{alert.ruleName}</td>
                                        <td className="p-4 font-mono text-sm text-gray-600 dark:text-gray-300">{alert.ioc}</td>
                                        <td className="p-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(alert.timestamp).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                                                alert.status === 'NEW' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                                            }`}>
                                                {alert.status === 'NEW' ? <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> : <Check className="w-3 h-3" />}
                                                {alert.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {alert.status === 'NEW' && (
                                                <button 
                                                    onClick={() => handleStatusUpdate(alert, 'RESOLVED')}
                                                    className="text-gray-400 hover:text-green-500 transition-colors p-1"
                                                    title="Mark Resolved"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Tab: Detection Rules */}
      {activeTab === 'rules' && (
          <div className="space-y-6 animate-in slide-in-from-left-4">
              <div className="flex justify-between items-center">
                  <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Active Detection Rules</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Manage the logic used to identify threats in your data.</p>
                  </div>
                  <button 
                      onClick={() => { resetNewRule(); setIsRuleModalOpen(true); }}
                      className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all"
                  >
                      <Plus className="w-4 h-4" /> New Rule
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rules.map(rule => (
                      <div key={rule.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-5 shadow-sm transition-all relative overflow-hidden group ${rule.enabled ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
                          {/* Severity Strip */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                              rule.severity === 'CRITICAL' ? 'bg-red-500' : rule.severity === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'
                          }`} />

                          <div className="flex justify-between items-start mb-3 pl-2">
                              <SeverityBadge severity={rule.severity} />
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleDeleteRule(rule.id)} className="text-gray-400 hover:text-red-500 p-1">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>

                          <h4 className="font-bold text-gray-900 dark:text-white mb-2 pl-2 text-lg">{rule.name}</h4>
                          
                          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-4 ml-2 border border-gray-100 dark:border-gray-800">
                               <div className="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1">
                                   <Zap className="w-3 h-3" /> Logic Preview
                               </div>
                               <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                                   {rule.logic} (
                                       {rule.groups.map(g => g.conditions.length).reduce((a,b) => a+b, 0)} conditions
                                   )
                               </div>
                          </div>

                          <div className="flex items-center justify-between pl-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                              <span className={`text-xs font-bold ${rule.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                  {rule.enabled ? 'Active Monitoring' : 'Disabled'}
                              </span>
                              
                              {/* Toggle Switch */}
                              <button 
                                  onClick={() => handleToggleRule(rule)}
                                  className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${rule.enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                              >
                                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${rule.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                          </div>
                      </div>
                  ))}
                  
                  {/* Empty State Rule Card */}
                  <button 
                      onClick={() => { resetNewRule(); setIsRuleModalOpen(true); }}
                      className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors h-full min-h-[180px]"
                  >
                      <Plus className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold">Add Custom Rule</span>
                  </button>
              </div>
          </div>
      )}

      {/* Rule Creator Modal */}
      {isRuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
              <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Detection Rule</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Define logic to flag suspicious activity.</p>
                      </div>
                      <button onClick={() => setIsRuleModalOpen(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                      
                      {/* Templates */}
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Quick Start Templates</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {RULE_TEMPLATES.map((t, idx) => (
                                  <button 
                                      key={idx} 
                                      onClick={() => loadTemplate(t.data)}
                                      className="flex flex-col items-start p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-left"
                                  >
                                      <div className={`p-2 rounded-lg ${t.color} mb-2`}>
                                          <t.icon className="w-4 h-4" />
                                      </div>
                                      <span className="font-bold text-gray-900 dark:text-white text-sm">{t.label}</span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.description}</span>
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Rule Config */}
                      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
                                  <input 
                                      value={newRule.name} 
                                      onChange={e => setNewRule({...newRule, name: e.target.value})}
                                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary"
                                      placeholder="e.g. Excessive Login Failures"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                                  <select 
                                      value={newRule.severity}
                                      onChange={e => setNewRule({...newRule, severity: e.target.value as any})}
                                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary"
                                  >
                                      <option value="CRITICAL">Critical</option>
                                      <option value="HIGH">High</option>
                                      <option value="MEDIUM">Medium</option>
                                      <option value="LOW">Low</option>
                                  </select>
                              </div>
                          </div>

                          {/* Simplified Logic Builder (Single Group Support for UI simplicity) */}
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                               <div className="flex items-center justify-between mb-4">
                                   <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                       <Activity className="w-4 h-4 text-primary" /> Detection Logic
                                   </label>
                               </div>
                               
                               {newRule.groups?.[0]?.conditions.map((cond, idx) => (
                                   <div key={cond.id} className="flex gap-3 mb-2 items-center animate-in fade-in">
                                       <div className="text-xs font-mono text-gray-400 w-8 text-right">{idx === 0 ? 'IF' : 'AND'}</div>
                                       <select 
                                          className="flex-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded outline-none dark:text-white"
                                          value={cond.field}
                                          onChange={e => updateCondition(newRule.groups![0].id, cond.id, 'field', e.target.value)}
                                       >
                                           <option value="riskScore">Risk Score</option>
                                           <option value="verdict">Verdict</option>
                                           <option value="type">Type</option>
                                           <option value="ioc">IOC Value</option>
                                           <option value="threatActor">Threat Actor</option>
                                       </select>
                                       <select 
                                          className="w-24 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded outline-none dark:text-white"
                                          value={cond.operator}
                                          onChange={e => updateCondition(newRule.groups![0].id, cond.id, 'operator', e.target.value)}
                                       >
                                           <option value="greaterThan">&gt;</option>
                                           <option value="lessThan">&lt;</option>
                                           <option value="equals">==</option>
                                           <option value="contains">Has</option>
                                       </select>
                                       <input 
                                          className="flex-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded outline-none dark:text-white"
                                          value={cond.value}
                                          onChange={e => updateCondition(newRule.groups![0].id, cond.id, 'value', e.target.value)}
                                          placeholder="Value"
                                       />
                                       <button 
                                          onClick={() => {
                                              // Remove condition logic
                                              setNewRule(prev => ({
                                                  ...prev,
                                                  groups: prev.groups?.map(g => ({
                                                      ...g,
                                                      conditions: g.conditions.filter(c => c.id !== cond.id)
                                                  }))
                                              }));
                                          }}
                                          className="p-2 text-gray-400 hover:text-red-500"
                                       >
                                           <Trash2 className="w-4 h-4" />
                                       </button>
                                   </div>
                               ))}

                               <button 
                                  onClick={() => {
                                      // Add condition logic
                                      setNewRule(prev => ({
                                          ...prev,
                                          groups: prev.groups?.map(g => ({
                                              ...g,
                                              conditions: [...g.conditions, { id: crypto.randomUUID(), field: 'riskScore', operator: 'greaterThan', value: 50 }]
                                          }))
                                      }));
                                  }}
                                  className="ml-11 mt-2 text-xs text-primary font-bold hover:underline flex items-center gap-1"
                               >
                                   <Plus className="w-3 h-3" /> Add Condition
                               </button>
                          </div>
                      </div>

                  </div>

                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-end gap-3">
                      <button onClick={() => setIsRuleModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                      <button onClick={handleCreateRule} className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20">Save Rule</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};