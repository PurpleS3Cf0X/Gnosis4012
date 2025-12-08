import React, { useState, useEffect } from 'react';
import { IntegrationConfig } from '../types';
import { getIntegrations, saveIntegration } from '../services/integrationService';
import { Zap, Globe, Shield, Search, Database, MessageSquare, Settings, ExternalLink, CheckCircle, AlertCircle, Save, X, Book, Activity, Clock } from 'lucide-react';

export const Integrations: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loaded = getIntegrations();
    // Sort by Category then Name
    const sorted = [...loaded].sort((a, b) => {
      const categoryComparison = a.category.localeCompare(b.category);
      if (categoryComparison !== 0) return categoryComparison;
      return a.name.localeCompare(b.name);
    });
    setIntegrations(sorted);
  }, []);

  const getIcon = (name: string) => {
    switch(name) {
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Globe': return <Globe className="w-6 h-6" />;
      case 'Shield': return <Shield className="w-6 h-6" />;
      case 'Search': return <Search className="w-6 h-6" />;
      case 'Database': return <Database className="w-6 h-6" />;
      case 'MessageSquare': return <MessageSquare className="w-6 h-6" />;
      default: return <Settings className="w-6 h-6" />;
    }
  };

  const getStatusColor = (status?: string) => {
      switch(status) {
          case 'operational': return 'bg-emerald-500 animate-pulse';
          case 'degraded': return 'bg-yellow-500';
          case 'maintenance': return 'bg-orange-500';
          default: return 'bg-gray-400';
      }
  };

  const handleToggle = (id: string, currentState: boolean) => {
    const updated = integrations.map(int => {
      if (int.id === id) {
        const newItem = { 
            ...int, 
            enabled: !currentState,
            // Mock status update on toggle
            status: !currentState ? 'operational' : 'unknown' as any
        };
        saveIntegration(newItem);
        return newItem;
      }
      return int;
    });
    setIntegrations(updated);
  };

  const openConfig = (integration: IntegrationConfig) => {
    setSelectedIntegration({ ...integration }); // Clone to avoid direct mutation
    setTestStatus('idle');
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const handleSaveConfig = () => {
    if (selectedIntegration) {
      const errors: Record<string, string> = {};
      let isValid = true;

      // Check for empty fields
      selectedIntegration.fields.forEach((field) => {
        if (!field.value || !field.value.trim()) {
            errors[field.key] = `${field.label} is required.`;
            isValid = false;
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
          lastSync: `Updated at ${timeString}`
      };

      saveIntegration(updatedConfig);
      
      // Update local state list
      const updated = integrations.map(i => i.id === updatedConfig.id ? updatedConfig : i);
      setIntegrations(updated);
      
      setIsModalOpen(false);
    }
  };

  const handleFieldChange = (idx: number, val: string) => {
    if (selectedIntegration) {
      const newFields = [...selectedIntegration.fields];
      newFields[idx].value = val;
      
      // Clear error if user starts typing
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

  const handleTestConnection = () => {
    // Basic pre-flight check for test
    if (selectedIntegration) {
        const errors: Record<string, string> = {};
        let isValid = true;
        selectedIntegration.fields.forEach((field) => {
            if (!field.value || !field.value.trim()) {
                errors[field.key] = `${field.label} is required to test.`;
                isValid = false;
            }
        });
        if (!isValid) {
            setValidationErrors(errors);
            return;
        }
    }

    setTestStatus('testing');
    setTimeout(() => {
        // Mock success
        setTestStatus('success');

        if (selectedIntegration) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const updatedConfig = {
                ...selectedIntegration,
                status: 'operational' as const,
                lastSync: `Verified at ${timeString}`
            };

            saveIntegration(updatedConfig);

            // Update local state
            const updated = integrations.map(i => i.id === updatedConfig.id ? updatedConfig : i);
            setIntegrations(updated);
            setSelectedIntegration(updatedConfig);
        }
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
         <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                 <Settings className="w-8 h-8" />
             </div>
             <div>
                 <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integration Hub</h1>
                 <p className="text-gray-500 dark:text-gray-400">Manage connections to external threat intelligence feeds, SIEMs, and notification channels.</p>
             </div>
         </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {integrations.map((item) => (
              <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 shadow-lg hover:shadow-xl relative overflow-hidden ${item.enabled ? 'border-primary/50 dark:border-primary/30' : 'border-gray-200 dark:border-gray-700'}`}>
                  {/* Status Banner */}
                  {item.enabled && (
                      <div className="absolute top-0 right-0 bg-primary/10 text-primary px-3 py-1 rounded-bl-xl text-xs font-bold uppercase flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Active
                      </div>
                  )}

                  <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-lg ${item.enabled ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                              {getIcon(item.iconName)}
                          </div>
                          <div className="relative inline-flex items-center cursor-pointer" onClick={() => handleToggle(item.id, item.enabled)}>
                            <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${item.enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out mt-1 ml-1 ${item.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.name}</h3>
                      <div className="text-xs font-semibold uppercase text-gray-400 mb-3">{item.category}</div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 h-10 line-clamp-2">
                          {item.description}
                      </p>

                      {/* Health Status Indicator */}
                      <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg flex justify-between items-center border border-gray-100 dark:border-gray-700/50">
                          <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(item.enabled ? item.status : 'unknown')}`}></span>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">
                                  {item.enabled ? (item.status || 'Unknown') : 'Disabled'}
                              </span>
                          </div>
                          {item.enabled && item.lastSync && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{item.lastSync}</span>
                              </div>
                          )}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => openConfig(item)}
                          className="flex-1 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <Settings className="w-4 h-4" /> Configure
                        </button>
                        
                        {item.detailsUrl && (
                            <a 
                                href={item.detailsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center"
                                title="View Setup Guide"
                            >
                                <Book className="w-4 h-4" />
                            </a>
                        )}
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {/* Configuration Modal */}
      {isModalOpen && selectedIntegration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {getIcon(selectedIntegration.iconName)} Configure {selectedIntegration.name}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
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

                      {/* Status */}
                      {testStatus === 'success' && (
                          <div className="text-green-600 dark:text-green-400 text-sm flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                              <CheckCircle className="w-4 h-4" /> Connection Successful
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-between">
                      <button 
                          onClick={handleTestConnection}
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
      )}

    </div>
  );
};