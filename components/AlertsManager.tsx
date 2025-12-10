
import React, { useState, useEffect, useMemo } from 'react';
import { AlertRule, TriggeredAlert, AlertCondition } from '../types';
import { dbService } from '../services/dbService';
import { alertService } from '../services/alertService';
import { 
    Bell, Plus, Trash2, CheckCircle, Zap, 
    Target, Globe, Filter, Check, AlertOctagon, 
    Microscope, FileSearch, ListFilter, Activity, X,
    ShieldAlert, Lock, Skull, Eye, Network, AlertTriangle, Coins, Edit3, Save, RotateCcw
} from 'lucide-react';

const RULE_TEMPLATES = [
    {
        label: "Critical Risk Enforcement",
        description: "Auto-alert on any indicator with a risk score above 90.",
        icon: ShieldAlert,
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
        description: "Flag any indicator attributed to known APT groups.",
        icon: Target,
        data: {
            name: "APT Activity Watchlist",
            severity: 'HIGH',
            logic: 'OR',
            groups: [{
                id: 'g1',
                logic: 'OR',
                conditions: [
                    { id: 'c1', field: 'threatActor', operator: 'contains', value: 'APT' },
                    { id: 'c2', field: 'threatActor', operator: 'contains', value: 'Lazarus' },
                    { id: 'c3', field: 'threatActor', operator: 'contains', value: 'Bear' }
                ]
            }]
        }
    },
    {
        label: "Ransomware Monitor",
        description: "Detect indicators associated with ransomware campaigns.",
        icon: Lock,
        data: {
            name: "Possible Ransomware",
            severity: 'HIGH',
            logic: 'AND',
            groups: [{
                id: 'g1',
                logic: 'AND',
                conditions: [
                    { id: 'c1', field: 'verdict', operator: 'equals', value: 'CRITICAL' },
                    { id: 'c2', field: 'threatActor', operator: 'contains', value: 'LockBit' }
                ]
            }]
        }
    }
];

export const AlertsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'triage' | 'rules'>('triage');
  const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Triage Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'RESOLVED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Rules Filters
  const [ruleSearch, setRuleSearch] = useState('');

  // Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
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
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status } : a));
  };

  const handleToggleRule = async (rule: AlertRule) => {
      const updatedRule = { ...rule, enabled: !rule.enabled };
      await dbService.saveRule(updatedRule);
      setRules(prev => prev.map(r => r.id === rule.id ? updatedRule : r));
  };

  const handleDeleteRule = async (id: string) => {
      if (confirm('Delete this processing rule? This cannot be undone.')) {
          await dbService.deleteRule(id);
          setRules(prev => prev.filter(r => r.id !== id));
      }
  };

  const handleSaveRule = async () => {
      if (!newRule.name) {
          alert("Rule name is required");
          return;
      }
      
      const ruleData = newRule as AlertRule;
      
      if (editingRuleId) {
          // Update existing
          await dbService.saveRule({ ...ruleData, id: editingRuleId });
      } else {
          // Create new
          await alertService.createRule(ruleData);
      }
      
      setIsRuleModalOpen(false);
      setEditingRuleId(null);
      resetNewRule();
      loadData();
  };

  const openEditModal = (rule: AlertRule) => {
      setNewRule({ ...rule });
      setEditingRuleId(rule.id);
      setIsRuleModalOpen(true);
  };

  const openCreateModal = () => {
      resetNewRule();
      setEditingRuleId(null);
      setIsRuleModalOpen(true);
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

  const addCondition = (groupId: string) => {
      setNewRule(prev => ({
          ...prev,
          groups: prev.groups?.map(g => {
              if (g.id === groupId) {
                  return {
                      ...g,
                      conditions: [...g.conditions, { id: crypto.randomUUID(), field: 'ioc', operator: 'contains', value: '' }]
                  };
              }
              return g;
          })
      }));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
      setNewRule(prev => ({
          ...prev,
          groups: prev.groups?.map(g => {
              if (g.id === groupId) {
                  return {
                      ...g,
                      conditions: g.conditions.filter(c => c.id !== conditionId)
                  };
              }
              return g;
          })
      }));
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

  const stats = useMemo(() => {
      return {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length,
          pending: alerts.filter(a => a.status === 'NEW').length,
          processed: alerts.filter(a => a.status === 'RESOLVED').length
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

  const filteredRules = useMemo(() => {
      return rules.filter(r => ruleSearch === '' || r.name.toLowerCase().includes(ruleSearch.toLowerCase()));
  }, [rules, ruleSearch]);

  const SeverityBadge = ({ severity }: { severity: string }) => {
      const colors = {
          CRITICAL: 'bg-red-100/50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-900/50',
          HIGH: 'bg-orange-100/50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-900/50',
          MEDIUM: 'bg-yellow-100/50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50',
          LOW: 'bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
      };
      return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border backdrop-blur-sm ${colors[severity as keyof typeof colors] || colors.LOW}`}>
              {severity}
          </span>
      );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="flex items-center gap-4">
             <div className="p-3 bg-rose-100/50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400 backdrop-blur-sm shadow-sm">
                 <Bell className="w-8 h-8" />
             </div>
             <div>
                 <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">Intel Alerts & Processing</h1>
                 <p className="text-gray-500 dark:text-gray-300">Triage high-priority indicators and configure automated enrichment logic.</p>
             </div>
         </div>
         <div className="flex bg-white/40 dark:bg-black/20 p-1.5 rounded-xl backdrop-blur-sm border border-white/20 dark:border-white/5">
             <button 
                onClick={() => setActiveTab('triage')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'triage' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
             >
                <Microscope className="w-4 h-4" /> Intel Triage
             </button>
             <button 
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'rules' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
             >
                <ListFilter className="w-4 h-4" /> Processing Rules
             </button>
         </div>
      </div>

      {/* Tab: Intel Triage */}
      {activeTab === 'triage' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
              
              {/* Heads Up Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="glass-card p-4 rounded-xl flex flex-col">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Critical Priority</span>
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertOctagon className="w-6 h-6" />
                          <span className="text-3xl font-mono font-bold">{stats.critical}</span>
                      </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl flex flex-col">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pending Triage</span>
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <Activity className="w-6 h-6" />
                          <span className="text-3xl font-mono font-bold">{stats.pending}</span>
                      </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl flex flex-col">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Processed</span>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-6 h-6" />
                          <span className="text-3xl font-mono font-bold">{stats.processed}</span>
                      </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl flex flex-col">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Hits</span>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <FileSearch className="w-6 h-6" />
                          <span className="text-3xl font-mono font-bold">{stats.total}</span>
                      </div>
                  </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                      <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          type="text"
                          placeholder="Search matches by Rule, Actor, or IOC..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white"
                      />
                  </div>
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-black/30 backdrop-blur-sm p-1 rounded-xl border border-gray-200/50 dark:border-white/10">
                      <Filter className="w-4 h-4 text-gray-400 ml-2 mr-1" />
                      <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1 text-xs font-bold rounded-lg ${statusFilter === 'ALL' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}>All</button>
                      <button onClick={() => setStatusFilter('NEW')} className={`px-3 py-1 text-xs font-bold rounded-lg ${statusFilter === 'NEW' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Pending</button>
                      <button onClick={() => setStatusFilter('RESOLVED')} className={`px-3 py-1 text-xs font-bold rounded-lg ${statusFilter === 'RESOLVED' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-500'}`}>Processed</button>
                  </div>
              </div>

              {/* Alerts List */}
              <div className="glass-panel rounded-xl overflow-hidden">
                  {filteredAlerts.length === 0 ? (
                      <div className="p-12 text-center flex flex-col items-center">
                          <CheckCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Clear</h3>
                          <p className="text-gray-500 dark:text-gray-400">No pending intelligence alerts match your criteria.</p>
                      </div>
                  ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200/50 dark:border-white/5 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                                    <th className="p-4">Severity</th>
                                    <th className="p-4">Matched Rule</th>
                                    <th className="p-4">Indicator (IOC)</th>
                                    <th className="p-4">Detected At</th>
                                    <th className="p-4">Triage Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100/50 dark:divide-white/5">
                                {filteredAlerts.map(alert => (
                                    <tr key={alert.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4"><SeverityBadge severity={alert.severity} /></td>
                                        <td className="p-4 font-medium text-gray-900 dark:text-white">{alert.ruleName}</td>
                                        <td className="p-4 font-mono text-sm text-gray-600 dark:text-gray-300">{alert.ioc}</td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(alert.timestamp).toLocaleDateString()} <span className="text-xs opacity-70">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                                                alert.status === 'NEW' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                                            }`}>
                                                {alert.status === 'NEW' ? <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> : <Check className="w-3 h-3" />}
                                                {alert.status === 'NEW' ? 'Needs Review' : 'Processed'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {alert.status === 'NEW' && (
                                                <button 
                                                    onClick={() => handleStatusUpdate(alert, 'RESOLVED')}
                                                    className="flex items-center gap-1 text-xs font-bold bg-green-50/50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors ml-auto border border-green-200/50 dark:border-green-900/30"
                                                >
                                                    <Check className="w-3 h-3" /> Resolve
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

      {/* Tab: Rules Management */}
      {activeTab === 'rules' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
              
              {/* Rules Toolbar */}
              <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                      <ListFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                          type="text"
                          placeholder="Search rules by name..."
                          value={ruleSearch}
                          onChange={(e) => setRuleSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white"
                      />
                  </div>
                  <button 
                      onClick={openCreateModal}
                      className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 font-bold transition-all transform hover:scale-105"
                  >
                      <Plus className="w-5 h-5" /> Create Detection Rule
                  </button>
              </div>

              {/* Rules Table */}
              <div className="glass-panel rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200/50 dark:border-white/5 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                                  <th className="p-4">Rule Name</th>
                                  <th className="p-4">Severity</th>
                                  <th className="p-4">Logic</th>
                                  <th className="p-4">Detection Criteria</th>
                                  <th className="p-4">Status</th>
                                  <th className="p-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100/50 dark:divide-white/5">
                              {filteredRules.length === 0 && (
                                  <tr>
                                      <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400">
                                          <div className="flex flex-col items-center gap-3">
                                              <ListFilter className="w-10 h-10 opacity-20" />
                                              <p>No detection rules found. Create one to start monitoring.</p>
                                          </div>
                                      </td>
                                  </tr>
                              )}
                              {filteredRules.map(rule => (
                                  <tr key={rule.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                                      <td className="p-4 font-bold text-gray-900 dark:text-white">{rule.name}</td>
                                      <td className="p-4"><SeverityBadge severity={rule.severity} /></td>
                                      <td className="p-4">
                                          <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                              {rule.logic}
                                          </span>
                                      </td>
                                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                          {rule.groups.map((g, i) => (
                                              <div key={i} className="flex gap-2 flex-wrap">
                                                  {g.conditions.map((c, j) => (
                                                      <span key={j} className="bg-white/60 dark:bg-white/10 px-2 py-0.5 rounded text-xs border border-gray-200/50 dark:border-white/5 truncate max-w-[200px]">
                                                          {c.field} {c.operator === 'greaterThan' ? '>' : c.operator === 'lessThan' ? '<' : c.operator} {c.value}
                                                      </span>
                                                  ))}
                                              </div>
                                          ))}
                                      </td>
                                      <td className="p-4">
                                          <button 
                                              onClick={() => handleToggleRule(rule)}
                                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${rule.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'}`}
                                          >
                                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                          </button>
                                      </td>
                                      <td className="p-4 text-right">
                                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button onClick={() => openEditModal(rule)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><Edit3 className="w-4 h-4" /></button>
                                              <button onClick={() => handleDeleteRule(rule.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* Rule Configuration Modal */}
      {isRuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="glass-panel w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] !p-0">
                  <div className="p-6 border-b border-gray-200/50 dark:border-white/5 flex justify-between items-center bg-white/40 dark:bg-white/5">
                      <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {editingRuleId ? 'Edit Detection Rule' : 'Create New Detection Rule'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Define logic to automatically flag threats.</p>
                      </div>
                      <button onClick={() => setIsRuleModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                      
                      {!editingRuleId && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              {RULE_TEMPLATES.map((tmpl, idx) => (
                                  <button 
                                    key={idx}
                                    onClick={() => loadTemplate(tmpl.data)}
                                    className="p-4 rounded-xl border border-gray-200/50 dark:border-white/10 hover:border-primary dark:hover:border-primary bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-all text-left group"
                                  >
                                      <div className="flex items-center gap-2 mb-2">
                                          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:text-primary transition-colors">
                                              <tmpl.icon className="w-4 h-4" />
                                          </div>
                                          <span className="font-bold text-sm text-gray-900 dark:text-white">{tmpl.label}</span>
                                      </div>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{tmpl.description}</p>
                                  </button>
                              ))}
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
                              <input 
                                  value={newRule.name}
                                  onChange={e => setNewRule({...newRule, name: e.target.value})}
                                  placeholder="e.g. Critical Ransomware Detection"
                                  className="w-full p-2.5 bg-white/50 dark:bg-black/30 border border-gray-200/50 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity Level</label>
                              <select 
                                  value={newRule.severity}
                                  onChange={e => setNewRule({...newRule, severity: e.target.value as any})}
                                  className="w-full p-2.5 bg-white/50 dark:bg-black/30 border border-gray-200/50 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                              >
                                  <option value="CRITICAL">Critical</option>
                                  <option value="HIGH">High</option>
                                  <option value="MEDIUM">Medium</option>
                                  <option value="LOW">Low</option>
                              </select>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <h4 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Logic Builder</h4>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Group Logic:</span>
                                  <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-0.5">
                                      <button 
                                          onClick={() => setNewRule({...newRule, logic: 'AND'})}
                                          className={`px-2 py-0.5 text-xs font-bold rounded ${newRule.logic === 'AND' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-400'}`}
                                      >AND</button>
                                      <button 
                                          onClick={() => setNewRule({...newRule, logic: 'OR'})}
                                          className={`px-2 py-0.5 text-xs font-bold rounded ${newRule.logic === 'OR' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-400'}`}
                                      >OR</button>
                                  </div>
                              </div>
                          </div>

                          {newRule.groups?.map((group, gIdx) => (
                              <div key={group.id} className="p-4 bg-gray-50/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-xl relative">
                                  <div className="absolute top-4 right-4 text-xs font-mono text-gray-400">Group {gIdx + 1}</div>
                                  
                                  <div className="space-y-3">
                                      {group.conditions.map((condition, cIdx) => (
                                          <div key={condition.id} className="flex gap-2 items-center">
                                              {cIdx > 0 && (
                                                  <span className="text-xs font-bold text-gray-400 uppercase w-8 text-center">{group.logic}</span>
                                              )}
                                              {cIdx === 0 && <span className="w-8"></span>}
                                              
                                              <select 
                                                  value={condition.field}
                                                  onChange={e => updateCondition(group.id, condition.id, 'field', e.target.value)}
                                                  className="flex-1 p-2 bg-white/50 dark:bg-black/30 border border-gray-200/50 dark:border-white/10 rounded text-sm text-gray-900 dark:text-white"
                                              >
                                                  <option value="riskScore">Risk Score</option>
                                                  <option value="verdict">Verdict</option>
                                                  <option value="type">Indicator Type</option>
                                                  <option value="ioc">IOC Value</option>
                                                  <option value="threatActor">Threat Actor</option>
                                                  <option value="malwareFamilies">Malware Family</option>
                                              </select>

                                              <select 
                                                  value={condition.operator}
                                                  onChange={e => updateCondition(group.id, condition.id, 'operator', e.target.value)}
                                                  className="w-32 p-2 bg-white/50 dark:bg-black/30 border border-gray-200/50 dark:border-white/10 rounded text-sm text-gray-900 dark:text-white"
                                              >
                                                  <option value="equals">Equals</option>
                                                  <option value="contains">Contains</option>
                                                  <option value="greaterThan">Greater Than</option>
                                                  <option value="lessThan">Less Than</option>
                                              </select>

                                              <input 
                                                  value={condition.value}
                                                  onChange={e => updateCondition(group.id, condition.id, 'value', e.target.value)}
                                                  placeholder="Value"
                                                  className="flex-1 p-2 bg-white/50 dark:bg-black/30 border border-gray-200/50 dark:border-white/10 rounded text-sm text-gray-900 dark:text-white"
                                              />

                                              <button onClick={() => removeCondition(group.id, condition.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          </div>
                                      ))}
                                      
                                      <div className="pl-10 pt-2">
                                          <button onClick={() => addCondition(group.id)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                              <Plus className="w-3 h-3" /> Add Condition
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="p-6 border-t border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3 backdrop-blur-sm">
                      <button onClick={() => setIsRuleModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                      <button onClick={handleSaveRule} className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2">
                          <Save className="w-4 h-4" /> Save Rule
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
