import React, { useState, useEffect, useMemo } from 'react';
import { IntegrationConfig, IntegrationField } from '../types';
import { getIntegrations, saveIntegration, addIntegration, deleteIntegration, testIntegrationConnection, runIntegration } from '../services/integrationService';
import { Zap, Globe, Shield, Search, Database, MessageSquare, Settings, ExternalLink, CheckCircle, AlertCircle, Save, X, Book, Activity, Clock, Share2, Plus, Trash2, LayoutGrid, Key, Link2, Lock, Edit3, Loader2, DownloadCloud, Server, AlertTriangle, Signal, Filter, MoreHorizontal } from 'lucide-react';

type IntegrationMethod = 'API_KEY' | 'WEBHOOK' | 'BASIC' | 'CUSTOM';

interface IntegrationsProps {
    onIntegrationComplete?: () => void;
}

export const Integrations: React.FC<IntegrationsProps> = ({ onIntegrationComplete }) => {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null); 
  
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [newIntegration, setNewIntegration] = useState<Partial<IntegrationConfig>>({
      name: '',
      description: '',
      category: 'Intel Provider',
      iconName: 'Settings',
      fields: [],
      enabled: true
  });
  const [integrationMethod, setIntegrationMethod] = useState<IntegrationMethod>('API_KEY');

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = () => {
    const loaded = getIntegrations();
    // Default sorting by name
    const sorted = [...loaded].sort((a, b) => a.name.localeCompare(b.name));
    setIntegrations(sorted);
  };

  const filteredIntegrations = useMemo(() => {
      return integrations.filter(item => {
          const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                item.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
          return matchesSearch && matchesCategory;
      });
  }, [integrations, searchQuery, categoryFilter]);

  const stats = useMemo(() => {
      return {
          total: integrations.length,
          active: integrations.filter(i => i.enabled).length,
          disabled: integrations.filter(i => !i.enabled).length,
          operational: integrations.filter(i => i.enabled && i.status === 'operational').length,
          issues: integrations.filter(i => i.enabled && (i.status === 'degraded' || i.status === 'maintenance' || i.status === 'unknown')).length
      };
  }, [integrations]);

  const getIcon = (name: string) => {
    switch(name) {
      case 'Zap': return <Zap className="w-5 h-5" />;
      case 'Globe': return <Globe className="w-5 h-5" />;
      case 'Shield': return <Shield className="w-5 h-5" />;
      case 'Search': return <Search className="w-5 h-5" />;
      case 'Database': return <Database className="w-5 h-5" />;
      case 'MessageSquare': return <MessageSquare className="w-5 h-5" />;
      case 'Share2': return <Share2 className="w-5 h-5" />;
      case 'Key': return <Key className="w-5 h-5" />;
      case 'Link': return <Link2 className="w-5 h-5" />;
      case 'Lock': return <Lock className="w-5 h-5" />;
      case 'Server': return <Server className="w-5 h-5" />;
      case 'AlertTriangle': return <AlertTriangle className="w-5 h-5" />;
      case 'Activity': return <Activity className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status?: string) => {
      switch(status) {
          case 'operational': return 'bg-emerald-500 animate-pulse';
          case 'degraded': return 'bg-red-500';
          case 'maintenance': return 'bg-orange-500';
          case 'unknown': return 'bg-gray-400';
          default: return 'bg-gray-400';
      }
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
        if (currentState) {
            const updated = integrations.map(int => 
                int.id === id ? { ...int, enabled: false, status: 'unknown' as const } : int
            );
            setIntegrations(updated);
            const target = updated.find(i => i.id === id);
            if (target) saveIntegration(target);
            return;
        }

        const integration = integrations.find(i => i.id === id);
        if (!integration) return;

        const requiredFields = integration.fields.filter(f => f.label !== 'Username' && f.label !== 'Password'); 
        const hasCredentials = requiredFields.every(f => f.value && f.value.trim().length > 0);

        if (!hasCredentials) {
            alert(`Cannot enable ${integration.name}: Please configure credentials first.`);
            openConfig(integration); 
            return;
        }

        setTestingId(id);
        
        let tempIntegrations = integrations.map(int => 
            int.id === id ? { ...int, enabled: true, status: 'unknown' as const } : int
        );
        setIntegrations(tempIntegrations);

        const result = await testIntegrationConnection(integration);
        
        if (result.success) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            tempIntegrations = tempIntegrations.map(int => 
                int.id === id ? { 
                    ...int, 
                    enabled: true, 
                    status: 'operational' as const,
                    lastSync: timeString
                } : int
            );
        } else {
            const forceEnable = window.confirm(
                `Connection Test Failed: ${result.message}\n\nDo you want to enable this integration anyway? (It may show as degraded)`
            );

            if (forceEnable) {
                tempIntegrations = tempIntegrations.map(int => 
                    int.id === id ? { ...int, enabled: true, status: 'degraded' as const } : int
                );
            } else {
                tempIntegrations = tempIntegrations.map(int => 
                    int.id === id ? { ...int, enabled: false, status: 'unknown' as const } : int
                );
            }
        }

        setIntegrations(tempIntegrations);
        const finalState = tempIntegrations.find(i => i.id === id);
        if (finalState) saveIntegration(finalState);

    } catch (e) {
         console.error("Toggle error:", e);
         alert("An unexpected error occurred while toggling the integration.");
         setIntegrations(prev => prev.map(int => int.id === id ? { ...int, enabled: currentState } : int));
    } finally {
        setTestingId(null);
    }
  };

  const handleRunIntegration = async (integration: IntegrationConfig) => {
    if (!integration.enabled) {
        alert("Please enable the integration first.");
        return;
    }
    
    setTestingId(integration.id);
    
    try {
        const result = await runIntegration(integration);
        alert(result.message);
        if (result.success && result.count && result.count > 0 && onIntegrationComplete) {
            onIntegrationComplete();
        }
    } catch (e) {
        alert("Execution failed.");
    } finally {
        setTestingId(null);
    }
  };

  const handleManualTest = async (integration: IntegrationConfig) => {
    setTestingId(integration.id);
    try {
        const result = await testIntegrationConnection(integration);
        
        const updateState = (status: 'operational' | 'degraded', lastSync?: string) => {
             const updated = integrations.map(i => i.id === integration.id ? { 
                ...i, 
                status,
                lastSync: lastSync || i.lastSync
            } : i);
            setIntegrations(updated);
            const target = updated.find(i => i.id === integration.id);
            if(target) saveIntegration(target);
        };

        if (result.success) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            updateState('operational', timeString);
            alert(`Connection Successful: ${result.message}`);
        } else {
            updateState('degraded');
            alert(`Connection Failed: ${result.message}`);
        }
    } catch (e) {
        alert("Error testing connection.");
    } finally {
        setTestingId(null);
    }
  };

  const handleDeleteIntegrationDirect = (id: string, name: string) => {
      if (window.confirm(`Are you sure you want to delete ${name}?`)) {
          deleteIntegration(id);
          loadIntegrations();
      }
  };

  const openConfig = (integration: IntegrationConfig) => {
    setSelectedIntegration({ ...integration });
    setTestStatus('idle');
    setTestMessage('');
    setValidationErrors({});
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = () => {
    if (selectedIntegration) {
      const errors: Record<string, string> = {};
      let isValid = true;

      selectedIntegration.fields.forEach((field) => {
        if (field.label !== 'Username' && field.label !== 'Password') { 
             if (!field.value || !field.value.trim()) {
                errors[field.key] = `${field.label} is required.`;
                isValid = false;
             }
        }
      });

      if (!isValid) {
          setValidationErrors(errors);
          return;
      }

      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const updatedConfig = {
          ...selectedIntegration,
          lastSync: timeString
      };

      saveIntegration(updatedConfig);
      loadIntegrations();
      setIsConfigModalOpen(false);
    }
  };

  const handleFieldChange = (idx: number, val: string) => {
    if (selectedIntegration) {
      const newFields = [...selectedIntegration.fields];
      newFields[idx].value = val;
      
      if (validationErrors[newFields[idx].key]) {
          setValidationErrors(prev => {
              const next = { ...prev };
              delete next[newFields[idx].key];
              return next;
          });
      }
      setSelectedIntegration({ ...selectedIntegration, fields: newFields });
    }
  };

  const handleTestConnectionInModal = async () => {
    if (!selectedIntegration) return;

    setTestStatus('testing');
    setTestMessage('');

    try {
        const result = await testIntegrationConnection(selectedIntegration);
        
        setTestStatus(result.success ? 'success' : 'error');
        setTestMessage(result.message);

        if (result.success) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const updatedConfig = {
                ...selectedIntegration,
                status: 'operational' as const,
                lastSync: timeString
            };
            saveIntegration(updatedConfig);
            setSelectedIntegration(updatedConfig);
            setIntegrations(prev => prev.map(i => i.id === updatedConfig.id ? updatedConfig : i));
        }
    } catch (e) {
        setTestStatus('error');
        setTestMessage('Unexpected error during test.');
    }
  };

  const openAddModal = () => {
      setNewIntegration({
          name: '',
          description: '',
          category: 'Intel Provider',
          iconName: 'Settings',
          fields: [],
          enabled: true
      });
      setIntegrationMethod('API_KEY');
      updateMethodFields('API_KEY'); 
      setIsAddModalOpen(true);
  };

  const updateMethodFields = (method: IntegrationMethod) => {
      setIntegrationMethod(method);
      let fields: IntegrationField[] = [];
      let icon = 'Settings';

      switch(method) {
          case 'API_KEY':
              fields = [{ key: 'apiKey', label: 'API Key', type: 'password', value: '', placeholder: 'Enter API Key' }];
              icon = 'Key';
              break;
          case 'WEBHOOK':
              fields = [{ key: 'webhookUrl', label: 'Webhook URL', type: 'url', value: '', placeholder: 'https://...' }];
              icon = 'Link';
              break;
          case 'BASIC':
              fields = [
                  { key: 'username', label: 'Username', type: 'text', value: '', placeholder: 'Username' },
                  { key: 'password', label: 'Password', type: 'password', value: '', placeholder: 'Password' }
              ];
              icon = 'Lock';
              break;
          case 'CUSTOM':
              fields = [];
              icon = 'Settings';
              break;
      }
      setNewIntegration(prev => ({ ...prev, fields, iconName: icon }));
  };

  const handleCreateIntegration = () => {
      if (!newIntegration.name) {
          alert("Please provide an integration name.");
          return;
      }

      const config: IntegrationConfig = {
          id: crypto.randomUUID(),
          name: newIntegration.name!,
          category: newIntegration.category as any,
          description: newIntegration.description || 'Custom integration added by user.',
          enabled: false, 
          iconName: newIntegration.iconName || 'Settings',
          fields: newIntegration.fields || [],
          status: 'unknown',
          lastSync: 'Never'
      };

      addIntegration(config);
      loadIntegrations();
      setIsAddModalOpen(false);
  };

  const addCustomField = () => {
      setNewIntegration(prev => ({
          ...prev,
          fields: [...(prev.fields || []), { key: `field_${Date.now()}`, label: 'New Field', type: 'text', value: '', placeholder: '' }]
      }));
  };

  const updateCustomField = (idx: number, key: keyof IntegrationField, val: string) => {
      const fields = [...(newIntegration.fields || [])];
      (fields[idx] as any)[key] = val;
      setNewIntegration(prev => ({ ...prev, fields }));
  };

  const removeCustomField = (idx: number) => {
      const fields = [...(newIntegration.fields || [])];
      fields.splice(idx, 1);
      setNewIntegration(prev => ({ ...prev, fields }));
  };

  const updateNewIntegrationFieldValue = (idx: number, val: string) => {
      const fields = [...(newIntegration.fields || [])];
      fields[idx].value = val;
      setNewIntegration(prev => ({ ...prev, fields }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header & Analytics */}
      <div className="space-y-6">
          <div className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 backdrop-blur-sm">
                     <Settings className="w-8 h-8" />
                 </div>
                 <div>
                     <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">Integration Hub</h1>
                     <p className="text-gray-500 dark:text-gray-400">Manage connections to external threat intelligence feeds, SIEMs, and notification channels.</p>
                 </div>
             </div>
          </div>

          {/* Analytics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg text-gray-500 dark:text-gray-300">
                      <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Integrations</div>
                  </div>
              </div>
              <div className="glass-card p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Active</div>
                  </div>
              </div>
              <div className="glass-card p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                      <Activity className="w-5 h-5" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.operational}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Operational</div>
                  </div>
              </div>
              <div className="glass-card p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-orange-100/50 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                      <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.issues}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Issues/Degraded</div>
                  </div>
              </div>
          </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text"
                  placeholder="Search integrations by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white"
              />
          </div>
          <div className="flex gap-3">
              <div className="relative">
                  <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="pl-4 pr-10 py-2.5 bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary dark:text-white appearance-none cursor-pointer"
                  >
                      <option value="ALL">All Categories</option>
                      <option value="Intel Provider">Intel Provider</option>
                      <option value="SIEM">SIEM</option>
                      <option value="Notification">Notification</option>
                      <option value="Scanner">Scanner</option>
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
              <button 
                  onClick={openAddModal}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 font-bold transition-all transform hover:scale-105"
              >
                  <Plus className="w-5 h-5" /> Add New
              </button>
          </div>
      </div>

      {/* Table View */}
      <div className="glass-panel rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200/50 dark:border-white/5 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                          <th className="p-4">Status</th>
                          <th className="p-4">Integration Name</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Configuration State</th>
                          <th className="p-4 text-center">Enable</th>
                          <th className="p-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50 dark:divide-white/5">
                      {filteredIntegrations.length === 0 && (
                          <tr>
                              <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400">
                                  <div className="flex flex-col items-center gap-3">
                                      <LayoutGrid className="w-10 h-10 opacity-20" />
                                      <p>No integrations found matching your criteria.</p>
                                  </div>
                              </td>
                          </tr>
                      )}
                      {filteredIntegrations.map((item) => (
                          <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                              <td className="p-4">
                                  <div className="flex flex-col items-start gap-1">
                                      <div className={`flex items-center gap-2 text-xs font-bold uppercase ${item.enabled ? (item.status === 'operational' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500') : 'text-gray-400'}`}>
                                          <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(item.enabled ? item.status : 'unknown')}`}></div>
                                          {item.enabled ? (item.status || 'Unknown') : 'Disabled'}
                                      </div>
                                      {item.enabled && item.lastSync && (
                                          <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                              <Clock className="w-3 h-3" /> {item.lastSync}
                                          </div>
                                      )}
                                  </div>
                              </td>
                              <td className="p-4">
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${item.enabled ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                          {getIcon(item.iconName)}
                                      </div>
                                      <div>
                                          <div className="font-bold text-gray-900 dark:text-white">{item.name}</div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[250px] truncate" title={item.description}>
                                              {item.description}
                                          </div>
                                      </div>
                                  </div>
                              </td>
                              <td className="p-4">
                                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-xs font-medium border border-gray-200 dark:border-gray-700">
                                      {item.category}
                                  </span>
                              </td>
                              <td className="p-4">
                                  <div className="flex items-center gap-2">
                                      {item.fields.some(f => !f.value && (f.label.includes('Key') || f.label.includes('URL'))) ? (
                                          <span className="text-xs text-orange-500 flex items-center gap-1 font-medium">
                                              <AlertCircle className="w-3 h-3" /> Incomplete
                                          </span>
                                      ) : (
                                          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                              <CheckCircle className="w-3 h-3" /> Configured
                                          </span>
                                      )}
                                  </div>
                              </td>
                              <td className="p-4 text-center">
                                  <div className={`relative inline-flex items-center cursor-pointer ${testingId === item.id ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => handleToggle(item.id, item.enabled)}>
                                      <div className={`w-10 h-6 rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent ${
                                          item.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                                      }`}>
                                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out mt-0.5 ml-0.5 ${
                                              item.enabled ? 'translate-x-4' : 'translate-x-0'
                                          } flex items-center justify-center`}>
                                              {testingId === item.id && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                                          </div>
                                      </div>
                                  </div>
                              </td>
                              <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      {item.enabled && item.category === 'Intel Provider' && item.fields.some(f => f.key === 'feedUrl' || f.key === 'discoveryUrl') && (
                                          <button 
                                              onClick={() => handleManualTest(item)}
                                              disabled={testingId === item.id}
                                              className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                              title="Test Connection"
                                          >
                                              <Signal className={`w-4 h-4 ${testingId === item.id ? 'animate-pulse' : ''}`} />
                                          </button>
                                      )}
                                      
                                      {item.fields.some(f => f.key === 'feedUrl') && (
                                          <button 
                                              onClick={() => handleRunIntegration(item)}
                                              className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                              title="Run Integration"
                                          >
                                              <DownloadCloud className="w-4 h-4" />
                                          </button>
                                      )}

                                      <button 
                                          onClick={() => openConfig(item)}
                                          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                          title="Configure"
                                      >
                                          <Settings className="w-4 h-4" />
                                      </button>

                                      <button 
                                          onClick={() => handleDeleteIntegrationDirect(item.id, item.name)}
                                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                                          title="Delete"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Add Integration Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="glass-panel w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] !p-0">
                  
                  <div className="p-6 border-b border-gray-200/50 dark:border-white/5 flex justify-between items-center bg-white/40 dark:bg-white/5">
                      <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                             <Plus className="w-5 h-5" /> Add New Integration
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Connect a new tool or custom feed.</p>
                      </div>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                              <input 
                                  className="w-full p-2.5 bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white placeholder-gray-400"
                                  placeholder="e.g. My Custom SIEM"
                                  value={newIntegration.name}
                                  onChange={e => setNewIntegration({...newIntegration, name: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                              <select 
                                  className="w-full p-2.5 bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
                                  value={newIntegration.category}
                                  onChange={e => setNewIntegration({...newIntegration, category: e.target.value as any})}
                              >
                                  <option value="Intel Provider">Intel Provider</option>
                                  <option value="SIEM">SIEM</option>
                                  <option value="Notification">Notification</option>
                                  <option value="Scanner">Scanner</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                          <textarea 
                              className="w-full p-2.5 bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white placeholder-gray-400 h-20 resize-none"
                              placeholder="Describe what this integration does..."
                              value={newIntegration.description}
                              onChange={e => setNewIntegration({...newIntegration, description: e.target.value})}
                          />
                      </div>

                      <div className="border-t border-gray-200/50 dark:border-white/5 pt-6">
                          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Integration Method</h4>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                              {(['API_KEY', 'WEBHOOK', 'BASIC', 'CUSTOM'] as IntegrationMethod[]).map(method => (
                                  <button
                                      key={method}
                                      onClick={() => updateMethodFields(method)}
                                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all backdrop-blur-sm ${
                                          integrationMethod === method 
                                          ? 'border-primary bg-primary/10 text-primary' 
                                          : 'border-gray-200/50 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white/20 dark:bg-white/5'
                                      }`}
                                  >
                                      {method === 'API_KEY' && <Key className="w-5 h-5" />}
                                      {method === 'WEBHOOK' && <Link2 className="w-5 h-5" />}
                                      {method === 'BASIC' && <Lock className="w-5 h-5" />}
                                      {method === 'CUSTOM' && <Edit3 className="w-5 h-5" />}
                                      <span className="text-xs font-bold">{method.replace('_', ' ')}</span>
                                  </button>
                              ))}
                          </div>

                          <div className="space-y-3 bg-gray-50/50 dark:bg-white/5 p-4 rounded-xl border border-gray-200/50 dark:border-white/5 backdrop-blur-sm">
                               {newIntegration.fields?.map((field, idx) => (
                                   <div key={idx} className="flex gap-2 items-end animate-in slide-in-from-left-2">
                                       {integrationMethod === 'CUSTOM' ? (
                                           <>
                                             <div className="flex-1">
                                                 <label className="text-xs text-gray-500 mb-1 block">Field Label</label>
                                                 <input 
                                                     value={field.label}
                                                     onChange={e => updateCustomField(idx, 'label', e.target.value)}
                                                     className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                 />
                                             </div>
                                             <div className="w-28">
                                                 <label className="text-xs text-gray-500 mb-1 block">Type</label>
                                                 <select 
                                                      value={field.type}
                                                      onChange={e => updateCustomField(idx, 'type', e.target.value)}
                                                      className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                 >
                                                     <option value="text">Text</option>
                                                     <option value="password">Password</option>
                                                     <option value="url">URL</option>
                                                 </select>
                                             </div>
                                             <button onClick={() => removeCustomField(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                                 <Trash2 className="w-4 h-4" />
                                             </button>
                                           </>
                                       ) : (
                                           <div className="w-full">
                                               <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{field.label}</label>
                                               <input 
                                                   type={field.type}
                                                   value={field.value}
                                                   onChange={e => updateNewIntegrationFieldValue(idx, e.target.value)}
                                                   placeholder={field.placeholder}
                                                   className="w-full p-2.5 bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none placeholder-gray-400"
                                               />
                                           </div>
                                       )}
                                   </div>
                               ))}
                               
                               {integrationMethod === 'CUSTOM' && (
                                   <button onClick={addCustomField} className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex justify-center items-center gap-2 text-sm font-bold">
                                       <Plus className="w-4 h-4" /> Add Configuration Field
                                   </button>
                               )}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3 backdrop-blur-sm">
                      <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                      <button onClick={handleCreateIntegration} className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20">
                          Create Integration
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Configuration Modal */}
      {isConfigModalOpen && selectedIntegration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="glass-panel w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] !p-0">
                  
                  <div className="p-6 border-b border-gray-200/50 dark:border-white/5 flex justify-between items-center bg-white/40 dark:bg-white/5">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {getIcon(selectedIntegration.iconName)} Configure {selectedIntegration.name}
                      </h3>
                      <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                      
                      {/* Help Text */}
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100/50 dark:border-blue-900/30 backdrop-blur-sm">
                          <div className="flex gap-3">
                              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                                  <p>{selectedIntegration.helpText || "Configure API credentials to enable this integration."}</p>
                                  <div className="flex gap-4">
                                    {selectedIntegration.docUrl && (
                                        <a href={selectedIntegration.docUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium">
                                            API Docs <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    {selectedIntegration.detailsUrl && (
                                        <a href={selectedIntegration.detailsUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium">
                                            Setup Guide <Book className="w-3 h-3" />
                                        </a>
                                    )}
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Fields */}
                      <div className="space-y-4">
                          {selectedIntegration.fields.map((field, idx) => (
                              <div key={field.key}>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      {field.label}
                                  </label>
                                  <input 
                                      type={field.type}
                                      value={field.value}
                                      onChange={(e) => handleFieldChange(idx, e.target.value)}
                                      placeholder={field.placeholder}
                                      className={`w-full p-2.5 bg-white/50 dark:bg-black/30 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm dark:text-white transition-colors backdrop-blur-sm ${validationErrors[field.key] ? 'border-red-500 focus:ring-red-500' : 'border-gray-200/50 dark:border-white/10'}`}
                                  />
                                  {validationErrors[field.key] && (
                                    <p className="text-red-500 text-xs mt-1 animate-in slide-in-from-top-1 font-medium flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {validationErrors[field.key]}
                                    </p>
                                  )}
                              </div>
                          ))}
                      </div>

                      {/* Test Status/Result Area */}
                      {(testStatus === 'success' || testStatus === 'error') && testMessage && (
                          <div className={`text-sm flex items-center gap-2 p-3 rounded border backdrop-blur-sm ${
                              testStatus === 'success' 
                              ? 'text-green-700 dark:text-green-300 bg-green-50/50 dark:bg-green-900/20 border-green-200/50 dark:border-green-900/30' 
                              : 'text-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-900/20 border-red-200/50 dark:border-red-900/30'
                          }`}>
                              {testStatus === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                              <span>{testMessage}</span>
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-between items-center backdrop-blur-sm">
                      <div className="flex gap-3 justify-end w-full">
                          <button 
                              onClick={handleTestConnectionInModal}
                              disabled={testStatus === 'testing'}
                              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                          >
                              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                          </button>
                          <button 
                              onClick={handleSaveConfig}
                              className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                          >
                              <Save className="w-4 h-4" /> Save Configuration
                          </button>
                      </div>
                  </div>

              </div>
          </div>
      )}

    </div>
  );
};