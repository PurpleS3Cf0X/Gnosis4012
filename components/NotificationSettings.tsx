import React from 'react';
import { Mail, MessageSquare, Bell } from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  return (
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
          <div className="glass-panel p-8 rounded-2xl">
             <div className="flex items-center gap-4 mb-4">
                 <div className="p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400 backdrop-blur-sm">
                     <Bell className="w-8 h-8" />
                 </div>
                 <div>
                     <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Channels</h1>
                     <p className="text-gray-500 dark:text-gray-400">Configure where alerts are sent when rules trigger.</p>
                 </div>
             </div>
          </div>

          <div className="max-w-2xl space-y-4">
              <div className="glass-card p-6 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg backdrop-blur-sm">
                          <Mail className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">Email Notifications</h4>
                          <p className="text-sm text-gray-500">Send alerts to security@organization.com</p>
                      </div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                        <div className="w-11 h-6 bg-primary rounded-full shadow-inner">
                            <div className="w-4 h-4 bg-white rounded-full shadow transform translate-x-6 mt-1 ml-1" />
                        </div>
                  </div>
              </div>

              <div className="glass-card p-6 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-50/50 dark:bg-purple-900/20 rounded-lg backdrop-blur-sm">
                          <MessageSquare className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">Slack Webhook</h4>
                          <p className="text-sm text-gray-500">Post to #security-alerts via Integration Config</p>
                      </div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full shadow-inner">
                            <div className="w-4 h-4 bg-white rounded-full shadow transform translate-x-1 mt-1 ml-1" />
                        </div>
                  </div>
              </div>
          </div>
      </div>
  );
};