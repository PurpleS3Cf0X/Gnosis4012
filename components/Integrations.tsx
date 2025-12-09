import React, { useState, useEffect, useMemo } from 'react';
import { IntegrationConfig, IntegrationField } from '../types';
import { getIntegrations, saveIntegration, addIntegration, deleteIntegration, testIntegrationConnection, runIntegration } from '../services/integrationService';
import { Zap, Globe, Shield, Search, Database, MessageSquare, Settings, ExternalLink, CheckCircle, AlertCircle, Save, X, Book, Activity, Clock, Share2, Plus, Trash2, LayoutGrid, Key, Link2, Lock, Edit3, Loader2, DownloadCloud, Server, AlertTriangle, Signal } from 'lucide-react';

type IntegrationMethod = 'API_KEY' | 'WEBHOOK' | 'BASIC' | 'CUSTOM';

interface IntegrationsProps {
    onIntegrationComplete?: () => void;
}

export const Integrations: React.FC<IntegrationsProps> = ({ onIntegrationComplete }) => {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null); // Track which toggle is being tested
  
  // UI States
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Test/Validation States for Modal
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // New Integration State
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
    
    // Custom sort order for categories
    const categoryOrder: Record<string, number> = {
        'Intel Provider': 1,
        'SIEM': 2,
        'Notification': 3,
        'Scanner': 4
    };

    const sorted = [...loaded].sort((a, b) => {
      // 1. Sort by Category Priority
      const catA = categoryOrder[a.category] || 99;
      const catB = categoryOrder[b.category] || 99;
      
      if (catA !== catB) {
          return catA - catB;
      }

      // 2. Sort Alphabetically by Name within Category
      return a.name.localeCompare(b.name);
    });

    setIntegrations(sorted);
  };

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
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Globe': return <Globe className="w-6 h-6" />;
      case 'Shield': return <Shield className="w-6 h-6" />;
      case 'Search': return <Search className="w-6 h-6" />;
      case 'Database': return <Database className="w-6 h-6" />;
      case 'MessageSquare': return <MessageSquare className="w-6 h-6" />;
      case 'Share2': return <Share2 className="w-6 h-6" />;
      case 'Key': return <Key className="w-6 h-6" />;
      case 'Link': return <Link2 className="w-6 h-6" />;
      case 'Lock': return <Lock className="w-6 h-6" />;
      case 'Server': return <Server className="w-6 h-6" />;
      case 'AlertTriangle': return <AlertTriangle className="w-6 h-6" />;
      case 'Activity': return <Activity className="w-6 h-6" />;
      default: return <Settings className="w-6 h-6" />;
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
        // 1. If disabling, just turn it off
        if (currentState) {
            const updated = integrations.map(int => 
                int.id === id ? { ...int, enabled: false, status: 'unknown' as const } : int
            );
            setIntegrations(updated);
            const target = updated.find(i => i.id === id);
            if (target) saveIntegration(target);
            return;
        }

        // 2. If Enabling: VALIDATE CREDENTIALS FIRST
        const integration = integrations.find(i => i.id === id);
        if (!integration) return;

        // Check for non-empty fields (basic check)
        const requiredFields = integration.fields.filter(f => f.label !== 'Username' && f.label !== 'Password'); 
        const hasCredentials = requiredFields.every(f => f.value && f.value.trim().length > 0);

        if (!hasCredentials) {
            alert(`Cannot enable ${integration.name}: Please configure credentials first.`);
            openConfig(integration); 
            return;
        }

        // 3. Run Connection Test
        setTestingId(id);
        
        // Optimistic UI update
        let tempIntegrations = integrations.map(int => 
            int.id === id ? { ...int, enabled: true, status: 'unknown' as const } : int
        );
        setIntegrations(tempIntegrations);

        const result = await testIntegrationConnection(integration);
        
        if (result.success) {
            // SUCCESS
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
            // FAILURE - Offer Force Enable
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
         // Revert on error
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
        
        // Helper to update state
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

  // --- Configuration Logic ---

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
      
      // If we save valid config, we don't automatically enable, but we update status text
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
            // Don't close modal, let user see success
            // But update local state so if they save/exit it's correct
            setSelectedIntegration(updatedConfig);
            // Also update main list in background
            setIntegrations(prev => prev.map(i => i.id === updatedConfig.id ? updatedConfig : i));
        }
    } catch (e) {
        setTestStatus('error');
        setTestMessage('Unexpected error during test.');
    }
  };

  const handleDeleteIntegration = () => {
      if (selectedIntegration && window.confirm(`Are you sure you want to delete ${selectedIntegration.name}?`)) {
          deleteIntegration(selectedIntegration.id);
          loadIntegrations();
          setIsConfigModalOpen(false);
      }
  };

  // --- Add Integration Logic ---

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
          enabled: false, // Default to false when creating until they toggle it
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
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                     <Settings className="w-8 h-8" />
                 </div>
                 <div>
                     <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integration Hub</h1>
                     <p className="text-gray-500 dark:text-gray-400">Manage connections to external threat intelligence feeds, SIEMs, and notification channels.</p>
                 </div>
             </div>
             <button 
                onClick={openAddModal}
                className="px-5 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 font-bold transition-all transform hover:scale-105"
             >
                <Plus className="w-5 h-5" /> Add Integration
             </button>
          </div>

          {/* Analytics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-300">
                      <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Integrations</div>
                  </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Active</div>
                  </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                      <Activity className="w-5 h-5" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.operational}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Operational</div>
                  </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                      <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.issues}</div>
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Issues/Degraded</div>
                  </div>
              </div>
          </div>
      </div>

      {/* List View */}
      <div className="space-y-4">
          {integrations.map((item) => (
              <div 
                key={item.id} 
                className={`group bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 p-5 flex flex-col lg:flex-row items-center gap-6 relative overflow-hidden ${
                    item.enabled 
                    ? 'border-primary/50 dark:border-primary/40 shadow-lg shadow-primary/5' 
                    : 'border-gray-200 dark:border-gray-700 shadow-sm hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                  {/* Active Indicator Strip */}
                  {item.enabled && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                  )}

                  {/* Icon & Basic Info */}
                  <div className="flex items-center gap-5 w-full lg:w-[30%]">
                      <div className={`p-3.5 rounded-xl flex-shrink-0 transition-colors ${
                          item.enabled 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                      }`}>
                          {getIcon(item.iconName)}
                      </div>
                      <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                {item.category}
                             </span>
                          </div>
                      </div>
                  </div>

                  {/* Description (Desktop) */}
                  <div className="hidden lg:block flex-1 px-4 border-l border-gray-100 dark:border-gray-700/50">
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {item.description}
                      </p>
                  </div>
                  
                  {/* Mobile Description */}
                  <p className="lg:hidden text-sm text-gray-500 dark:text-gray-400 w-full text-center">{item.description}</p>

                  {/* Controls & Status */}
                  <div className="flex items-center justify-between w-full lg:w-auto gap-8 pl-4 lg:border-l border-gray-100 dark:border-gray-700/50">
                      
                      {/* Status Text (Hidden on small mobile) */}
                      <div className="hidden sm:block text-right min-w-[150px]">
                         <div className="flex items-center justify-end gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(item.enabled ? item.status : 'unknown')}`}></span>
                            <span className={`text-xs font-bold uppercase ${item.enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                              {item.enabled ? (item.status || 'Unknown') : 'Disabled'}
                            </span>
                         </div>
                         {item.enabled && item.lastSync && (
                             <div className="flex items-center justify-end gap-1.5 text-[10px] text-gray-400">
                                 <Clock className="w-3 h-3" /> 
                                 <span>Verified: {item.lastSync}</span>
                             </div>
                         )}
                      </div>

                      <div className="flex items-center gap-3">
                         {/* Toggle Switch */}
                         <div className={`relative inline-flex items-center cursor-pointer ${testingId === item.id ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => handleToggle(item.id, item.enabled)}>
                            <div className={`w-12 h-7 rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent ${
                                item.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                            }`}>
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out mt-0.5 ml-0.5 ${
                                    item.enabled ? 'translate-x-5' : 'translate-x-0'
                                } flex items-center justify-center`}>
                                    {testingId === item.id && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                                </div>
                            </div>
                         </div>
                         
                         <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                         <button 
                            onClick={() => openConfig(item)}
                            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Configure Integration"
                         >
                            <Settings className="w-5 h-5" />
                         </button>

                         {/* Test Connection Button for Feeds */}
                         {item.enabled && item.category === 'Intel Provider' && item.fields.some(f => f.key === 'feedUrl' || f.key === 'discoveryUrl') && (
                             <button 
                                onClick={() => handleManualTest(item)}
                                disabled={testingId === item.id}
                                className="p-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                title="Test Feed Connection"
                             >
                                <Signal className={`w-5 h-5 ${testingId === item.id ? 'animate-pulse' : ''}`} />
                             </button>
                         )}

                         {/* Generic Pull Feed Button for any feedUrl */}
                         {item.fields.some(f => f.key === 'feedUrl') && (
                             <button 
                                onClick={() => handleRunIntegration(item)}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Pull Feed & Ingest"
                             >
                                <DownloadCloud className="w-5 h-5" />
                             </button>
                         )}
                         
                         {item.detailsUrl && (
                             <a 
                                href={item.detailsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Read Documentation"
                             >
                                <Book className="w-5 h-5" />
                             </a>
                         )}
                      </div>
                  </div>

              </div>
          ))}
      </div>

      {/* Add Integration Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                  
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
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
                                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
                                  placeholder="e.g. My Custom SIEM"
                                  value={newIntegration.name}
                                  onChange={e => setNewIntegration({...newIntegration, name: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                              <select 
                                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white"
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
                              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none text-gray-900 dark:text-white h-20 resize-none"
                              placeholder="Describe what this integration does..."
                              value={newIntegration.description}
                              onChange={e => setNewIntegration({...newIntegration, description: e.target.value})}
                          />
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Integration Method</h4>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                              {(['API_KEY', 'WEBHOOK', 'BASIC', 'CUSTOM'] as IntegrationMethod[]).map(method => (
                                  <button
                                      key={method}
                                      onClick={() => updateMethodFields(method)}
                                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                          integrationMethod === method 
                                          ? 'border-primary bg-primary/5 text-primary' 
                                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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

                          <div className="space-y-3 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
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
                                               <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{field.label}</label>
                                               <input 
                                                   type={field.type}
                                                   value={field.value}
                                                   onChange={e => updateNewIntegrationFieldValue(idx, e.target.value)}
                                                   placeholder={field.placeholder}
                                                   className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
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

                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-end gap-3">
                      <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                      <button onClick={handleCreateIntegration} className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20">
                          Create Integration
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Configuration Modal */}
      {isConfigModalOpen && selectedIntegration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {getIcon(selectedIntegration.iconName)} Configure {selectedIntegration.name}
                      </h3>
                      <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="p-6 space-y-6">
                      
                      {/* Help Text */}
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
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
                                      className={`w-full p-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm dark:text-white transition-colors ${validationErrors[field.key] ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700'}`}
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
                          <div className={`text-sm flex items-center gap-2 p-3 rounded border ${
                              testStatus === 'success' 
                              ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30' 
                              : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30'
                          }`}>
                              {testStatus === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                              <span>{testMessage}</span>
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-between items-center">
                      <button 
                         onClick={handleDeleteIntegration}
                         className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                         title="Delete Integration"
                      >
                         <Trash2 className="w-5 h-5" />
                      </button>

                      <div className="flex gap-3">
                          <button 
                              onClick={handleTestConnectionInModal}
                              disabled={testStatus === 'testing'}
                              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                          >
                              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                          </button>
                          <button 
                              onClick={handleSaveConfig}
                              className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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