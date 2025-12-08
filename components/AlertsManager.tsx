import React, { useState, useEffect } from 'react';
import { AlertRule, TriggeredAlert, ThreatLevel } from '../types';
import { dbService } from '../services/dbService';
import { alertService } from '../services/alertService';
import { Bell, ShieldAlert, Plus, Trash2, CheckCircle, Settings, RefreshCw, Eye, Zap, Target, Globe, AlertTriangle } from 'lucide-react';

const RULE_TEMPLATES = [
    {
        label: "Critical Risk Threshold",
        description: "Alert on any IOC with Risk Score > 90",
        icon: Zap,
        color: "text-red-500 bg-red-50 dark:bg-red-900/20",
        data: {
            name: "Critical Risk Detected",
            severity: 'CRITICAL',
            conditions: [{ field: 'riskScore', operator: 'greaterThan', value: 90 }]
        }
    },
    {
        label: "APT Watchlist",
        description: "Detect known Nation-State actors",
        icon: Target,
        color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
        data: {
            name: "APT Activity Detected",
            severity: 'CRITICAL',
            conditions: [{ field: 'threatActor', operator: 'contains', value: 'APT' }]
        }
    },
    {
        label: "Suspicious Domains",
        description: "High risk domains (Score > 75)",
        icon: Globe,
        color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
        data: {
            name: "Suspicious Domain Traffic",
            severity: 'HIGH',
            conditions: [
                { field: 'type', operator: 'equals', value: 'Domain' },
                // Note: Logic currently supports simple AND. A more complex engine would allow multi-field logic easier.
                // For now, users can edit the second condition manually or we overwrite the single condition list.
                { field: 'riskScore', operator: 'greaterThan', value: 75 }
            ]
        }
    },
    {
        label: "Immediate Verdict",
        description: "Any IOC marked CRITICAL",
        icon: AlertTriangle,
        color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
        data: {
            name: "Critical Verdict Issued",
            severity: 'CRITICAL',
            conditions: [{ field: 'verdict', operator: 'equals', value: 'CRITICAL' }]
        }
    }
];

export const AlertsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'inventory'>('alerts');
  const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  
  // Rule Creation State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
      name: '',
      severity: 'HIGH',
      enabled: true,
      conditions: [{ field: 'riskScore', operator: 'greaterThan', value: 75 }],
      actionChannels: ['email']
  });

  // Load Data
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    const loadedAlerts = await dbService.getAlerts();
    const loadedRules = await dbService.getRules();
    setAlerts(loadedAlerts);
    setRules(loadedRules);
  };

  // --- Alert Actions ---
  const handleStatusUpdate = async (alert: TriggeredAlert, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
      await alertService.updateAlertStatus(alert, status);
      loadData();
  };

  // --- Rule Actions ---
  const handleCreateRule = async () => {
      if (!newRule.name) return;
      await alertService.createRule(newRule as any);
      setIsRuleModalOpen(false);
      setNewRule({ name: '', severity: 'HIGH', enabled: true, conditions: [{ field: 'riskScore', operator: 'greaterThan', value: 75 }], actionChannels: ['email'] });
      loadData();
  };

  const handleDeleteRule = async (id: string) => {
      await dbService.deleteRule(id);
      loadData();
  };

  const loadTemplate = (templateData: any) => {
      setNewRule({
          ...newRule,
          ...templateData,
          conditions: [...templateData.conditions] // Deep copy conditions
      });
  };

  const renderAlertsTab = () => (
      <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                 <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex p-1">
                     <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded font-medium">All</button>
                     <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">New</button>
                     <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">Resolved</button>
                 </div>
              </div>
              <button onClick={loadData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-gray-500" />
              </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                          <th className="p-4">Severity</th>
                          <th className="p-4">Rule Name</th>
                          <th className="p-4">Entity (IoC)</th>
                          <th className="p-4">Detected</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {alerts.length === 0 && (
                          <tr><td colSpan={6} className="p-8 text-center text-gray-500">No alerts triggered yet.</td></tr>
                      )}
                      {alerts.map(alert => (
                          <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors group">
                              <td className="p-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                      alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                  }`}>
                                      {alert.severity}
                                  </span>
                              </td>
                              <td className="p-4 font-medium text-gray-900 dark:text-white">{alert.ruleName}</td>
                              <td className="p-4 font-mono text-sm text-gray-600 dark:text-gray-300">{alert.ioc}</td>
                              <td className="p-4 text-sm text-gray-500">{new Date(alert.timestamp).toLocaleString()}</td>
                              <td className="p-4">
                                  <span className={`text-xs font-bold uppercase tracking-wider ${
                                      alert.status === 'NEW' ? 'text-primary animate-pulse' : 'text-gray-400'
                                  }`}>
                                      {alert.status}
                                  </span>
                              </td>
                              <td className="p-4 text-right space-x-2">
                                  {alert.status !== 'RESOLVED' && (
                                      <button 
                                          onClick={() => handleStatusUpdate(alert, 'RESOLVED')}
                                          className="text-gray-400 hover:text-green-500 transition-colors"
                                          title="Mark Resolved"
                                      >
                                          <CheckCircle className="w-5 h-5" />
                                      </button>
                                  )}
                                  <button className="text-gray-400 hover:text-blue-500 transition-colors">
                                      <Eye className="w-5 h-5" />
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderInventoryTab = () => (
      <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center">
              <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detection Rules</h3>
                  <p className="text-sm text-gray-500">Manage custom logic for alerting on sensitive data.</p>
              </div>
              <button 
                  onClick={() => setIsRuleModalOpen(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                  <Plus className="w-4 h-4" /> Create Rule
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map(rule => (
                  <div key={rule.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative">
                      <div className="flex justify-between items-start mb-3">
                           <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                               <ShieldAlert className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                           </div>
                           <button onClick={() => handleDeleteRule(rule.id)} className="text-gray-400 hover:text-red-500">
                               <Trash2 className="w-4 h-4" />
                           </button>
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">{rule.name}</h4>
                      <div className="space-y-2 mb-4">
                          {rule.conditions.map((cond, i) => (
                              <div key={i} className="text-xs bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-700/50 font-mono text-gray-600 dark:text-gray-400">
                                  {cond.field} {cond.operator === 'greaterThan' ? '>' : cond.operator === 'equals' ? '==' : 'contains'} {cond.value}
                              </div>
                          ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 dark:border-gray-700/50 pt-3">
                          <span className={`font-bold ${
                              rule.severity === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'
                          }`}>{rule.severity}</span>
                          <span className={rule.enabled ? 'text-green-500' : 'text-gray-400'}>
                              {rule.enabled ? 'Active' : 'Disabled'}
                          </span>
                      </div>
                  </div>
              ))}
          </div>

          {/* Rule Creator Modal */}
          {isRuleModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Detection Rule</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure logic to trigger incidents.</p>
                      </div>
                      
                      <div className="p-6 space-y-6 overflow-y-auto">
                          
                          {/* Quick Start Templates */}
                          <div>
                              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Zap className="w-3 h-3 text-yellow-500" /> Quick Templates
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  {RULE_TEMPLATES.map((tmpl, idx) => (
                                      <button 
                                          key={idx}
                                          onClick={() => loadTemplate(tmpl.data)}
                                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-left group"
                                      >
                                          <div className={`p-2 rounded-lg ${tmpl.color} group-hover:bg-primary/10 group-hover:text-primary`}>
                                              <tmpl.icon className="w-4 h-4" />
                                          </div>
                                          <div>
                                              <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary">{tmpl.label}</div>
                                              <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{tmpl.description}</div>
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
                                    <input 
                                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="e.g. Critical High Risk IP"
                                        value={newRule.name}
                                        onChange={e => setNewRule({...newRule, name: e.target.value})}
                                    />
                                </div>
                                <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
                                            <select 
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none"
                                                value={newRule.severity}
                                                onChange={e => setNewRule({...newRule, severity: e.target.value as any})}
                                            >
                                                <option value="CRITICAL">Critical</option>
                                                <option value="HIGH">High</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="LOW">Low</option>
                                            </select>
                                        </div>
                                </div>
                                
                                {/* Condition Editor */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <span className="text-xs font-bold text-gray-500 uppercase block mb-3">Condition Logic</span>
                                    {newRule.conditions?.map((cond, idx) => (
                                        <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                                            <select 
                                                className="p-2 text-sm bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 dark:text-white outline-none"
                                                value={cond.field}
                                                onChange={e => {
                                                    const conds = [...(newRule.conditions || [])];
                                                    conds[idx].field = e.target.value as any;
                                                    setNewRule({...newRule, conditions: conds});
                                                }}
                                            >
                                                <option value="riskScore">Risk Score</option>
                                                <option value="verdict">Verdict</option>
                                                <option value="type">Type</option>
                                                <option value="threatActor">Threat Actor</option>
                                                <option value="ioc">IOC Value</option>
                                            </select>
                                            <select 
                                                className="p-2 text-sm bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 dark:text-white outline-none"
                                                value={cond.operator}
                                                onChange={e => {
                                                    const conds = [...(newRule.conditions || [])];
                                                    conds[idx].operator = e.target.value as any;
                                                    setNewRule({...newRule, conditions: conds});
                                                }}
                                            >
                                                <option value="greaterThan">&gt; (Greater Than)</option>
                                                <option value="lessThan">&lt; (Less Than)</option>
                                                <option value="equals">== (Equals)</option>
                                                <option value="contains">Contains</option>
                                            </select>
                                            <input 
                                                className="p-2 text-sm bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 dark:text-white outline-none"
                                                value={cond.value}
                                                onChange={e => {
                                                    const conds = [...(newRule.conditions || [])];
                                                    conds[idx].value = e.target.value;
                                                    setNewRule({...newRule, conditions: conds});
                                                }}
                                            />
                                        </div>
                                    ))}
                                    {newRule.conditions && newRule.conditions.length > 1 && (
                                        <p className="text-[10px] text-gray-400 mt-2 italic">* All conditions must be met (AND logic)</p>
                                    )}
                                </div>
                          </div>
                      </div>

                      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-end gap-3">
                          <button onClick={() => setIsRuleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                          <button onClick={handleCreateRule} className="px-6 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors">Save Rule</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
         <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                 <Bell className="w-8 h-8" />
             </div>
             <div>
                 <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts Manager</h1>
                 <p className="text-gray-500 dark:text-gray-400">Monitor active threats and manage detection logic.</p>
             </div>
         </div>
         
         <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700 mt-8">
             <button 
                onClick={() => setActiveTab('alerts')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'alerts' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'}`}
             >
                 <ShieldAlert className="w-4 h-4" /> Dashboard
                 {alerts.filter(a => a.status === 'NEW').length > 0 && (
                     <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{alerts.filter(a => a.status === 'NEW').length}</span>
                 )}
             </button>
             <button 
                onClick={() => setActiveTab('inventory')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'}`}
             >
                 <Settings className="w-4 h-4" /> Rules Inventory
             </button>
         </div>
      </div>

      {activeTab === 'alerts' && renderAlertsTab()}
      {activeTab === 'inventory' && renderInventoryTab()}
    </div>
  );
};