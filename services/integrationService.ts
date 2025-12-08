import { ExternalIntel, IndicatorType, IntegrationConfig } from '../types';

/**
 * INTEGRATION LAYER
 * 
 * Manages connections to external tools.
 * Stores configuration in localStorage to persist user API keys/settings across sessions.
 */

const STORAGE_KEY = 'gnosis_integrations_v1';

// Default configuration with supported integrations
const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  { 
    id: 'vt', 
    name: 'VirusTotal', 
    category: 'Intel Provider', 
    description: 'The standard for file, URL, IP, and domain analysis.', 
    enabled: true, 
    iconName: 'Zap',
    docUrl: 'https://developers.virustotal.com/reference/overview',
    detailsUrl: 'https://support.virustotal.com/hc/en-us/articles/115002126889-How-to-get-an-API-key',
    helpText: 'Sign up for a free VirusTotal account to get an API Key.',
    fields: [{ key: 'apiKey', label: 'API Key', value: '', type: 'password', placeholder: 'Enter VT API Key' }],
    status: 'operational',
    lastSync: '2 mins ago'
  },
  { 
    id: 'otx', 
    name: 'AlienVault OTX', 
    category: 'Intel Provider', 
    description: 'Crowd-sourced threat data via Open Threat Exchange.', 
    enabled: true, 
    iconName: 'Globe',
    docUrl: 'https://otx.alienvault.com/api',
    detailsUrl: 'https://otx.alienvault.com/api',
    helpText: 'OTX keys are free for researchers.',
    fields: [{ key: 'apiKey', label: 'OTX Key', value: '', type: 'password', placeholder: 'Enter OTX Key' }],
    status: 'operational',
    lastSync: '45 secs ago' 
  },
  { 
    id: 'abuseip', 
    name: 'AbuseIPDB', 
    category: 'Intel Provider', 
    description: 'Crowd-sourced IP abuse reports and confidence scores.', 
    enabled: false, 
    iconName: 'Shield',
    docUrl: 'https://www.abuseipdb.com/api',
    detailsUrl: 'https://www.abuseipdb.com/pricing',
    helpText: 'Requires a free account on AbuseIPDB.',
    fields: [{ key: 'apiKey', label: 'API Key', value: '', type: 'password', placeholder: 'Enter AbuseIPDB Key' }],
    status: 'unknown',
    lastSync: 'Never'
  },
  { 
    id: 'shodan', 
    name: 'Shodan', 
    category: 'Scanner', 
    description: 'Search engine for Internet-connected devices.', 
    enabled: false, 
    iconName: 'Search',
    docUrl: 'https://developer.shodan.io/',
    detailsUrl: 'https://help.shodan.io/the-basics/on-demand-scanning',
    fields: [{ key: 'apiKey', label: 'API Key', value: '', type: 'password', placeholder: 'Enter Shodan API Key' }],
    status: 'maintenance',
    lastSync: '1 hour ago'
  },
  { 
    id: 'splunk', 
    name: 'Splunk', 
    category: 'SIEM', 
    description: 'Forward alerts directly to Splunk via HEC.', 
    enabled: false, 
    iconName: 'Database',
    docUrl: 'https://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector',
    detailsUrl: 'https://dev.splunk.com/enterprise/docs/devtools/hec/',
    helpText: 'Ensure your HEC token has permission to write to the desired index.',
    fields: [
      { key: 'hecToken', label: 'HEC Token', value: '', type: 'password', placeholder: '00000000-0000-0000-0000-000000000000' },
      { key: 'endpoint', label: 'Splunk Endpoint', value: '', type: 'url', placeholder: 'https://splunk-instance:8088' }
    ],
    status: 'unknown',
    lastSync: 'Never' 
  },
  { 
    id: 'slack', 
    name: 'Slack', 
    category: 'Notification', 
    description: 'Send critical threat alerts to a channel.', 
    enabled: false, 
    iconName: 'MessageSquare',
    docUrl: 'https://api.slack.com/messaging/webhooks',
    detailsUrl: 'https://slack.com/help/articles/115005265063-Incoming-webhooks-for-Slack',
    helpText: 'Create an Incoming Webhook in your Slack App settings.',
    fields: [{ key: 'webhook', label: 'Webhook URL', value: '', type: 'url', placeholder: 'https://hooks.slack.com/services/...' }],
    status: 'unknown',
    lastSync: 'Never' 
  },
];

// Load integrations from storage or defaults
export const getIntegrations = (): IntegrationConfig[] => {
  if (typeof window === 'undefined') return DEFAULT_INTEGRATIONS;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INTEGRATIONS));
    return DEFAULT_INTEGRATIONS;
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_INTEGRATIONS;
  }
};

// Save a single integration config
export const saveIntegration = (config: IntegrationConfig) => {
  const current = getIntegrations();
  const index = current.findIndex(c => c.id === config.id);
  if (index !== -1) {
    current[index] = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }
};

// Simulating API latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const enrichIndicator = async (ioc: string, type: IndicatorType): Promise<ExternalIntel[]> => {
  await delay(800); // Simulate network round-trip

  const integrations = getIntegrations();
  const intelligence: ExternalIntel[] = [];
  const randomSeed = ioc.length; // Deterministic simulation based on IOC length

  // 1. VirusTotal Simulation
  const vt = integrations.find(i => i.id === 'vt');
  if (vt && vt.enabled) {
      const apiKey = vt.fields.find(f => f.key === 'apiKey')?.value;
      if (!apiKey) {
          intelligence.push({ source: "VirusTotal", error: "Configuration Error: API Key missing." });
      } else {
          try {
             // Simulate Logic
             const vtScore = (randomSeed * 7) % 75; // Deterministic fake score
             intelligence.push({
                source: "VirusTotal",
                score: vtScore,
                maxScore: 90, // Vendors
                tags: vtScore > 50 ? ["malware", "phishing"] : ["clean"],
                details: `${vtScore}/90 security vendors flagged this as malicious.`
             });
          } catch (e) {
             intelligence.push({ source: "VirusTotal", error: "Connection Timeout (504)" });
          }
      }
  }

  // 2. AlienVault OTX Simulation
  const otx = integrations.find(i => i.id === 'otx');
  if (otx && otx.enabled && (type === IndicatorType.IP || type === IndicatorType.DOMAIN)) {
    const apiKey = otx.fields.find(f => f.key === 'apiKey')?.value;
    if (!apiKey) {
        intelligence.push({ source: "AlienVault OTX", error: "Configuration Error: Key missing." });
    } else {
        const pulseCount = (randomSeed * 3) % 20;
        if (pulseCount > 0) {
          intelligence.push({
            source: "AlienVault OTX",
            details: `Appears in ${pulseCount} known threat pulses.`,
            tags: ["adversary_infrastructure", "c2_server"]
          });
        }
    }
  }

  // 3. AbuseIPDB Simulation (IP Only)
  const abuse = integrations.find(i => i.id === 'abuseip');
  if (abuse && abuse.enabled && type === IndicatorType.IP) {
    const apiKey = abuse.fields.find(f => f.key === 'apiKey')?.value;
    if (!apiKey) {
         intelligence.push({ source: "AbuseIPDB", error: "API Key missing." });
    } else {
        const confidence = (randomSeed * 11) % 100;
        intelligence.push({
          source: "AbuseIPDB",
          score: confidence,
          maxScore: 100,
          details: `Abuse Confidence Score: ${confidence}%`,
          lastSeen: new Date().toISOString().split('T')[0]
        });
    }
  }

  // 4. Shodan Simulation (IP Only)
  const shodan = integrations.find(i => i.id === 'shodan');
  if (shodan && shodan.enabled && type === IndicatorType.IP) {
      const apiKey = shodan.fields.find(f => f.key === 'apiKey')?.value;
      if (!apiKey) {
          intelligence.push({ source: "Shodan", error: "API Key missing." });
      } else {
          intelligence.push({
              source: "Shodan",
              details: "Open ports detected: 80, 443, 8080. Vulnerability CVE-2023-1234 potentially present."
          });
      }
  }

  // NOTE: Splunk/Slack would be handled in a 'notify' service, but we'll acknowledge them here if we were doing alerts.

  return intelligence;
};