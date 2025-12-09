import React, { useState, useEffect } from 'react';
import { AlertRule, TriggeredAlert, AlertGroup, AlertCondition } from '../types';
import { dbService } from '../services/dbService';
import { alertService } from '../services/alertService';
import { Bell, ShieldAlert, Plus, Trash2, CheckCircle, Settings, RefreshCw, Eye, Zap, Target, Globe, AlertTriangle, Server, FileWarning, Layers, Copy, Edit3 } from 'lucide-react';

const RULE_TEMPLATES = [
    {
        label: "Critical Risk Threshold",
        description: "Alert on any IOC with Risk Score > 90",
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
        description: "Detect known Nation-State actors",
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
        label: "Suspicious Domains",
        description: "Domains with High Risk (>75)",
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
    },
    {
        label: "Complex Threat Combo",
        description: "Ransomware OR (Critical Risk AND IP)",
        icon: Layers,
        color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20",
        data: {
            name: "Complex Threat Pattern",
            severity: 'CRITICAL',
            logic: 'OR',
            groups: [
                {
                    id: 'g1',
                    logic: 'AND',
                    conditions: [{ id: 'c1', field: 'threatActor', operator: 'contains', value: 'Ransomware' }]
                },
                {
                    id: 'g2',
                    logic: 'AND',
                    conditions: [
                         { id: 'c2', field: 'type', operator: 'equals', value: 'IP Address' },
                         { id: 'c3', field: 'riskScore', operator: 'greaterThan', value: 90 }
                    ]
                }
            ]
        }
    },
    {
        label: "Immediate Verdict",
        description: "Any IOC marked CRITICAL",
        icon: AlertTriangle,
        color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
        data: {
            name: "Critical Verdict Issued",
            severity: 'CRITICAL',
            logic: 'AND',
            groups: [{
                id: 'g1',
                logic: 'AND',
                conditions: [{ id: 'c1', field: 'verdict', operator: 'equals', value: 'CRITICAL' }]
            }]
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
      logic: 'AND',
      groups: [{
          id: crypto.randomUUID(),
          logic: 'AND',
          conditions: [{ id: crypto.randomUUID(), field: 'riskScore', operator: 'greaterThan', value: 75 }]
      }],
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

  const handleDeleteRule = async (id: string) => {
      await dbService.deleteRule(id);
      loadData();
  };

  const loadTemplate = (templateData: any) => {
      // Deep copy to prevent reference issues
      const groups = templateData.groups.map((g: any) => ({
          ...g,
          id: crypto.randomUUID(),
          conditions: g.conditions.map((c: any) => ({ ...c, id: crypto.randomUUID() }))
      }));
      
      setNewRule({
          ...newRule,
          ...templateData,
          groups
      });
  };

  // --- Group & Condition Management ---
  const addGroup = () => {
      setNewRule(prev => ({
          ...prev,
          groups: [
              ...(prev.groups || []),
              {
                  id: crypto.randomUUID(),
                  logic: 'AND',
                  conditions: [{ id: crypto.randomUUID(), field: 'riskScore', operator: 'greaterThan', value: 50 }]
              }
          ]
      }));
  };

  const removeGroup = (groupId: string) => {
      setNewRule(prev => ({
          ...prev,
          groups: prev.groups?.filter(g => g.id !== groupId)
      }));
  };

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
      setNewRule(prev => ({
          ...prev,
          groups: prev.groups?.map(g => g.id === groupId ? { ...g, logic } : g)
      }));
  };

  const addCondition = (groupId: string) => {
      setNewRule(prev => ({
          ...prev,
          groups: prev.groups?.map(g => {
              if (g.id === groupId) {
                  return {
                      ...g,
                      conditions: [
                          ...g.conditions,
                          { id: crypto.randomUUID(), field: 'riskScore', operator: 'greaterThan', value: 50 }
                      ]
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
      <div className="space-y-8 animate-in fade-in">
          {/* Header */}
          <div className="flex justify-between items-center">
              <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detection Rules</h3>
                  <p className="text-sm text-gray-500">Manage custom logic for alerting on sensitive data.</p>
              </div>
              <button 
                  onClick={() => {
                      resetNewRule();
                      setIsRuleModalOpen(true);
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                  <Plus className="w-4 h-4" /> Create Custom Rule
              </button>
          </div>

          {/* Templates Table Section */}
          <div className="space-y-4">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-600 dark:text-yellow-400">
                      <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">Rule Templates</h4>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead>
                              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                  <th className="p-4">Template Name</th>
                                  <th className="p-4">Description</th>
                                  <th className="p-4">Severity</th>
                                  <th className="p-4">Logic</th>
                                  <th className="p-4 text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {RULE_TEMPLATES.map((tmpl, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                      <td className="p-4 font-medium text-gray-900 dark:text-white">
                                          <div className="flex items-center gap-3">
                                              <div className={`p-2 rounded-lg ${tmpl.color}`}>
                                                  <tmpl.icon className="w-4 h-4" />
                                              </div>
                                              {tmpl.label}
                                          </div>
                                      </td>
                                      <td className="p-4 text-gray-500 dark:text-gray-400">{tmpl.description}</td>
                                      <td className="p-4">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${
                                              tmpl.data.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                              tmpl.data.severity === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                          }`}>
                                              {tmpl.data.severity}
                                          </span>
                                      </td>
                                      <td className="p-4">
                                          <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-400 font-mono">
                                              {tmpl.data.logic}
                                          </code>
                                      </td>
                                      <td className="p-4 text-right">
                                          <button 
                                              onClick={() => {
                                                  loadTemplate(tmpl.data);
                                                  setIsRuleModalOpen(true);
                                              }}
                                              className="text-primary hover:text-primary-dark font-medium text-sm inline-flex items-center gap-1"
                                          >
                                              Use Template <Edit3 className="w-3 h-3" />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Active Rules Section */}
          <div className="space-y-4">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                      <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">Active Rules Inventory</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rules.map(rule => (
                      <div key={rule.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  <ShieldAlert className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              </div>
                              <button onClick={() => handleDeleteRule(rule.id)} className="text-gray-400 hover:text-red-500">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                          <h4 className="font-bold text-gray-900 dark:text-white mb-2">{rule.name}</h4>
                          
                          {/* Condensed Logic View */}
                          <div className="flex-1 space-y-2 mb-4 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800 text-xs">
                              <div className="font-mono text-gray-500 flex items-center gap-2">
                                  LOGIC: <span className="font-bold text-primary bg-primary/10 px-1 rounded">{rule.logic || 'AND'}</span>
                              </div>
                              <div className="space-y-1">
                                    {rule.groups?.map((g, i) => (
                                        <div key={i} className="pl-2 border-l-2 border-gray-300 dark:border-gray-600">
                                            <div className="text-[10px] text-gray-400 mb-0.5">
                                                Group {i+1} ({g.logic})
                                            </div>
                                            {g.conditions.map((c, j) => (
                                                <div key={j} className="font-mono text-gray-700 dark:text-gray-300 truncate">
                                                    {c.field} {c.operator === 'greaterThan' ? '>' : c.operator} {c.value}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    {(!rule.groups || rule.groups.length === 0) && (
                                        <div className="text-gray-400 italic">Legacy Rule Format</div>
                                    )}
                              </div>
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
          </div>

          {/* Rule Creator Modal */}
          {isRuleModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Detection Rule</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure logic to trigger incidents.</p>
                          </div>
                          <button onClick={() => setIsRuleModalOpen(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                              <Trash2 className="w-5 h-5 rotate-45" /> 
                          </button>
                      </div>
                      
                      <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                          
                          {/* Quick Start Templates */}
                          <div>
                              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                  <Zap className="w-3 h-3 text-yellow-500" /> Quick Templates
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
                                        <input 
                                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                            placeholder="e.g. Critical High Risk IP"
                                            value={newRule.name}
                                            onChange={e => setNewRule({...newRule, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
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
                                
                                {/* Complex Condition Editor */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Trigger when</span>
                                            <select
                                                className="text-xs font-bold uppercase bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-primary focus:ring-2 focus:ring-primary outline-none"
                                                value={newRule.logic}
                                                onChange={e => setNewRule({...newRule, logic: e.target.value as 'AND' | 'OR'})}
                                            >
                                                <option value="AND">ALL (AND)</option>
                                                <option value="OR">ANY (OR)</option>
                                            </select>
                                            <span className="text-xs font-bold text-gray-500 uppercase">of the following groups match:</span>
                                        </div>
                                        <button 
                                            onClick={addGroup}
                                            className="text-xs flex items-center gap-1 text-primary hover:text-primary-dark font-medium"
                                        >
                                            <Plus className="w-3 h-3" /> Add Group
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {newRule.groups?.map((group, gIdx) => (
                                            <div key={group.id} className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-3 relative group-hover-target">
                                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-700/50">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Group {gIdx + 1} Logic:</span>
                                                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-0.5">
                                                            <button 
                                                                onClick={() => updateGroupLogic(group.id, 'AND')}
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${group.logic === 'AND' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-500'}`}
                                                            >
                                                                AND
                                                            </button>
                                                            <button 
                                                                onClick={() => updateGroupLogic(group.id, 'OR')}
                                                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${group.logic === 'OR' ? 'bg-white dark:bg-gray-600 shadow text-primary' : 'text-gray-500'}`}
                                                            >
                                                                OR
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeGroup(group.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Remove Group">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <div className="space-y-2">
                                                    {group.conditions.map((cond, cIdx) => (
                                                        <div key={cond.id} className="flex gap-2 items-center">
                                                            <select 
                                                                className="flex-1 p-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none dark:text-white"
                                                                value={cond.field}
                                                                onChange={e => updateCondition(group.id, cond.id, 'field', e.target.value)}
                                                            >
                                                                <option value="riskScore">Risk Score</option>
                                                                <option value="verdict">Verdict</option>
                                                                <option value="type">Type</option>
                                                                <option value="threatActor">Threat Actor</option>
                                                                <option value="ioc">IOC Value</option>
                                                            </select>
                                                            <select 
                                                                className="w-24 p-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none dark:text-white"
                                                                value={cond.operator}
                                                                onChange={e => updateCondition(group.id, cond.id, 'operator', e.target.value)}
                                                            >
                                                                <option value="greaterThan">&gt;</option>
                                                                <option value="lessThan">&lt;</option>
                                                                <option value="equals">==</option>
                                                                <option value="contains">Has</option>
                                                            </select>
                                                            <input 
                                                                className="flex-1 p-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none dark:text-white"
                                                                value={cond.value}
                                                                onChange={e => updateCondition(group.id, cond.id, 'value', e.target.value)}
                                                                placeholder="Value"
                                                            />
                                                            <button onClick={() => removeCondition(group.id, cond.id)} className="p-2 text-gray-400 hover:text-red-500">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        onClick={() => addCondition(group.id)}
                                                        className="w-full py-1.5 mt-2 text-xs border border-dashed border-gray-300 dark:border-gray-600 rounded text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex justify-center items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Add Condition
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
};