import { ExternalIntel, IndicatorType, IntegrationConfig, AnalysisResult, ThreatLevel } from '../types';
import { dbService } from './dbService';
import { alertService } from './alertService';

/**
 * INTEGRATION LAYER
 * 
 * Manages connections to external tools.
 * Stores configuration in localStorage to persist user API keys/settings across sessions.
 */

const STORAGE_KEY = 'gnosis_integrations_v1';

// Default configuration with supported integrations
// NOTE: All defaults are now DISABLED to force user configuration and validation.
const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  // --- EXISTING API INTEGRATIONS ---
  { 
    id: 'vt', 
    name: 'VirusTotal', 
    category: 'Intel Provider', 
    description: 'The standard for file, URL, IP, and domain analysis.', 
    enabled: false, 
    iconName: 'Zap',
    docUrl: 'https://developers.virustotal.com/reference/overview',
    detailsUrl: 'https://support.virustotal.com/hc/en-us/articles/115002126889-How-to-get-an-API-key',
    helpText: 'Sign up for a free VirusTotal account to get an API Key.',
    fields: [{ key: 'apiKey', label: 'API Key', value: '', type: 'password', placeholder: 'Enter VT API Key' }],
    status: 'unknown',
    lastSync: 'Never'
  },
  { 
    id: 'otx', 
    name: 'AlienVault OTX', 
    category: 'Intel Provider', 
    description: 'Crowd-sourced threat data via Open Threat Exchange.', 
    enabled: false, 
    iconName: 'Globe',
    docUrl: 'https://otx.alienvault.com/api',
    detailsUrl: 'https://otx.alienvault.com/api',
    helpText: 'OTX keys are free for researchers.',
    fields: [{ key: 'apiKey', label: 'OTX Key', value: '', type: 'password', placeholder: 'Enter OTX Key' }],
    status: 'unknown',
    lastSync: 'Never' 
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
    status: 'unknown',
    lastSync: 'Never'
  },

  // --- NEW OPEN SOURCE FEEDS ---
  { 
    id: 'stix', 
    name: 'MITRE ATT&CK (STIX)', 
    category: 'Intel Provider', 
    description: 'Ingest raw STIX 2.1 JSON bundles. Default: MITRE Mobile ATT&CK.', 
    enabled: false, 
    iconName: 'Share2',
    docUrl: 'https://oasis-open.github.io/cti-documentation/',
    detailsUrl: 'https://github.com/mitre/cti',
    helpText: 'Enter a URL to a raw .json file containing a STIX Bundle object.',
    fields: [
      { 
        key: 'feedUrl', 
        label: 'Feed URL', 
        value: 'https://raw.githubusercontent.com/mitre/cti/master/mobile-attack/mobile-attack.json', 
        type: 'url', 
        placeholder: 'https://example.com/feed.json' 
      }
    ],
    status: 'unknown',
    lastSync: 'Never'
  },
  {
      id: 'firehol',
      name: 'FireHOL IP Lists',
      category: 'Intel Provider', 
      description: 'Aggregated blocklist of IPs attacking, scanning, or hosting C2s.',
      enabled: false, 
      iconName: 'Shield',
      docUrl: 'https://github.com/firehol/blocklist-ipsets',
      fields: [{ key: 'feedUrl', label: 'Feed URL', value: 'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset', type: 'url' }],
      status: 'unknown',
      lastSync: 'Never'
  },
  {
      id: 'cins',
      name: 'CINS Army List',
      category: 'Intel Provider',
      description: 'Subset of CINS Active Threat Intelligence ruleset for poor reputation IPs.',
      enabled: false,
      iconName: 'Shield',
      docUrl: 'http://cinsscore.com/',
      fields: [{ key: 'feedUrl', label: 'Feed URL', value: 'http://cinsscore.com/list/ci-badguys.txt', type: 'url' }],
      status: 'unknown',
      lastSync: 'Never'
  },
  {
      id: 'greensnow',
      name: 'GreenSnow.co',
      category: 'Intel Provider',
      description: 'IPs harvested from worldwide honeypots (Brute force, Scans).',
      enabled: false,
      iconName: 'Shield',
      docUrl: 'https://greensnow.co/',
      fields: [{ key: 'feedUrl', label: 'Feed URL', value: 'https://blocklist.greensnow.co/greensnow.txt', type: 'url' }],
      status: 'unknown',
      lastSync: 'Never'
  },
  {
      id: 'ipsum',
      name: 'IPsum (Level 3)',
      category: 'Intel Provider',
      description: 'Daily feed of bad IPs appearing on 3+ different public blacklists.',
      enabled: false,
      iconName: 'Shield',
      docUrl: 'https://github.com/stamparm/ipsum',
      fields: [{ key: 'feedUrl', label: 'Feed URL', value: 'https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt', type: 'url' }],
      status: 'unknown',
      lastSync: 'Never'
  },
  {
      id: 'urlhaus',
      name: 'URLhaus (Abuse.ch)',
      category: 'Intel Provider',
      description: 'Malicious URLs used for malware distribution.',
      enabled: false,
      iconName: 'Globe',
      docUrl: 'https://urlhaus.abuse.ch/',
      fields: [{ key: 'feedUrl', label: 'Feed URL', value: 'https://urlhaus.abuse.ch/downloads/urlhaus_text/', type: 'url' }],
      status: 'unknown',
      lastSync: 'Never'
  },
  {
      id: 'feodo',
      name: 'Feodo Tracker',
      category: 'Intel Provider',
      description: 'Botnet Command & Control servers (Emotet, Dridex, TrickBot).',
      enabled: false,
      iconName: 'Server',
      docUrl: 'https://feodotracker.abuse.ch/',
      fields: [{ key: 'feedUrl', label: 'Feed URL', value: 'https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt', type: 'url' }],
      status: 'unknown',
      lastSync: 'Never'
  },
  {
      id: 'digitalside',
      name: 'DigitalSide Threat-Intel',
      category: 'Intel Provider',
      description: 'Malicious URLs and IPs collected from honeypots and OSINT.',
      enabled: false,
      iconName: 'Activity',
      docUrl: 'https://github.com/davidonzo/Threat-Intel',
      fields: [{ key: 'feedUrl', label: 'Feed URL', value: 'https://raw.githubusercontent.com/davidonzo/Threat-Intel/master/lists/latestips.txt', type: 'url' }],
      status: 'unknown',
      lastSync: 'Never'
  },
  {
      id: 'openphish',
      name: 'OpenPhish',
      category: 'Intel Provider',
      description: 'Phishing URLs identified in the last few hours.',
      enabled: false,
      iconName: 'AlertTriangle',
      docUrl: 'https://openphish.com/',
      fields: [{ key: 'feedUrl', label: 'Feed URL', value: 'https://openphish.com/feed.txt', type: 'url' }],
      status: 'unknown',
      lastSync: 'Never'
  },
  
  // --- OPERATIONS ---
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
    // Merge stored integrations with defaults to ensure new feeds appear for existing users
    const parsed = JSON.parse(stored);
    const merged = [...DEFAULT_INTEGRATIONS];
    
    parsed.forEach((p: IntegrationConfig) => {
        const index = merged.findIndex(m => m.id === p.id);
        if (index !== -1) {
            merged[index] = p;
        } else {
            // User custom integrations
            merged.push(p);
        }
    });
    return merged;
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

export const addIntegration = (config: IntegrationConfig) => {
  const current = getIntegrations();
  current.push(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
};

export const deleteIntegration = (id: string) => {
  let current = getIntegrations();
  current = current.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
};

// Test Connection
export const testIntegrationConnection = async (config: IntegrationConfig): Promise<{ success: boolean; message: string }> => {
  
  // Real Network Test for Feeds
  const feedUrl = config.fields.find(f => f.key === 'feedUrl' || f.key === 'discoveryUrl')?.value;
  if (feedUrl) {
       try {
          const response = await fetch(feedUrl, { method: 'HEAD' }).catch(() => fetch(feedUrl));
          if (response.ok) {
              return { success: true, message: `Feed Accessible (${response.status} OK)` };
          } else {
              return { success: false, message: `Feed Error: ${response.status} ${response.statusText}` };
          }
      } catch (e: any) {
          return { success: false, message: `Network Error: ${e.message}. (CORS likely blocked this browser request. You may still enable it, but auto-pull might fail.)` };
      }
  }

  // Real Network Test for VirusTotal
  if (config.id === 'vt') {
      const key = config.fields.find(f => f.key === 'apiKey')?.value;
      if (!key) return { success: false, message: 'Missing API Key.' };
      // Lightweight call to check key validity (comment endpoint usually lighter)
      try {
        const response = await fetch('https://www.virustotal.com/api/v3/users/current_user', {
            method: 'GET',
            headers: { 'x-apikey': key }
        });
        if (response.ok) return { success: true, message: 'VirusTotal API: Connected (200 OK)' };
        if (response.status === 401) return { success: false, message: 'Invalid API Key (401)' };
        return { success: false, message: `Error: ${response.status}` };
      } catch (e) {
         return { success: false, message: "Network Error (CORS likely blocked)" };
      }
  }

  // OTX
  if (config.id === 'otx') {
      const key = config.fields.find(f => f.key === 'apiKey')?.value;
      if (!key) return { success: false, message: 'Missing OTX Key.' };
      try {
          const response = await fetch('https://otx.alienvault.com/api/v1/user/me', {
              headers: { 'X-OTX-API-KEY': key }
          });
          if (response.ok) return { success: true, message: 'AlienVault OTX: Connected (200 OK)' };
          return { success: false, message: `Error: ${response.status}` };
      } catch (e) {
          return { success: false, message: "Network Error (CORS likely blocked)" };
      }
  }

  // AbuseIPDB
  if (config.id === 'abuseip') {
      const key = config.fields.find(f => f.key === 'apiKey')?.value;
      if (!key) return { success: false, message: 'Missing API Key.' };
      try {
          // Check a google DNS IP just to validate key
          const response = await fetch('https://api.abuseipdb.com/api/v2/check?ipAddress=8.8.8.8', {
              headers: { 'Key': key, 'Accept': 'application/json' }
          });
          if (response.ok) return { success: true, message: 'AbuseIPDB: Connected (200 OK)' };
          return { success: false, message: `Error: ${response.status}` };
      } catch (e) {
          return { success: false, message: "Network Error (CORS likely blocked)" };
      }
  }

  // Shodan
  if (config.id === 'shodan') {
      const key = config.fields.find(f => f.key === 'apiKey')?.value;
      if (!key) return { success: false, message: 'Missing API Key.' };
      try {
          const response = await fetch(`https://api.shodan.io/api-info?key=${key}`);
          if (response.ok) return { success: true, message: 'Shodan: Connected (200 OK)' };
          return { success: false, message: `Error: ${response.status}` };
      } catch (e) {
          return { success: false, message: "Network Error (CORS likely blocked)" };
      }
  }

  // Generic Checks for others
  let hasError = false;
  let errorMsg = '';
  config.fields.forEach(f => {
       if (f.type === 'url' && f.value && !f.value.startsWith('http')) {
           hasError = true;
           errorMsg = `Invalid URL for field: ${f.label}`;
       }
       if (!f.value && f.label !== 'Username' && f.label !== 'Password') {
           if (f.label.toLowerCase().includes('key') || f.label.toLowerCase().includes('token') || f.label.toLowerCase().includes('url')) {
               hasError = true;
               errorMsg = `Missing required value: ${f.label}`;
           }
       }
  });

  if (hasError) return { success: false, message: errorMsg || 'Invalid configuration.' };
  return { success: true, message: 'Configuration Validated Locally (Remote test unavailable)' };
};

// Helper for Real API Calls
const fetchJson = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

export const enrichIndicator = async (ioc: string, type: IndicatorType): Promise<ExternalIntel[]> => {
  const integrations = getIntegrations();
  const intelligence: ExternalIntel[] = [];
  
  // Array of promises to run in parallel
  const tasks: Promise<void>[] = [];

  // 1. VirusTotal (Real API)
  const vt = integrations.find(i => i.id === 'vt');
  if (vt && vt.enabled) {
      tasks.push((async () => {
          const apiKey = vt.fields.find(f => f.key === 'apiKey')?.value;
          if (!apiKey) return;
          try {
             // Depending on type, the endpoint changes in v3
             let endpoint = '';
             if (type === IndicatorType.IP) endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${ioc}`;
             else if (type === IndicatorType.DOMAIN) endpoint = `https://www.virustotal.com/api/v3/domains/${ioc}`;
             else if (type === IndicatorType.HASH) endpoint = `https://www.virustotal.com/api/v3/files/${ioc}`;
             else return; // URLs require encoding, skipping for brevity in this snippet

             const data = await fetchJson(endpoint, { headers: { 'x-apikey': apiKey } });
             const stats = data.data?.attributes?.last_analysis_stats;
             const malicious = stats?.malicious || 0;
             
             intelligence.push({
                source: "VirusTotal",
                score: malicious > 0 ? (malicious * 10) : 0,
                maxScore: 100,
                tags: malicious > 0 ? ["malicious"] : ["clean"],
                details: `Detections: ${malicious} / ${stats?.total || 0}`
             });
          } catch (e: any) {
             intelligence.push({ source: "VirusTotal", error: `API Error: ${e.message} (Check CORS/Key)` });
          }
      })());
  }

  // 2. AlienVault OTX (Real API)
  const otx = integrations.find(i => i.id === 'otx');
  if (otx && otx.enabled) {
      tasks.push((async () => {
          const apiKey = otx.fields.find(f => f.key === 'apiKey')?.value;
          if (!apiKey) return;
          try {
             // General endpoint for OTX
             const endpoint = `https://otx.alienvault.com/api/v1/indicators/${type === IndicatorType.IP ? 'IPv4' : 'domain'}/${ioc}/general`;
             const data = await fetchJson(endpoint, { headers: { 'X-OTX-API-KEY': apiKey } });
             const pulseCount = data.pulse_info?.count || 0;
             
             if (pulseCount > 0) {
                 intelligence.push({
                    source: "AlienVault OTX",
                    details: `Found in ${pulseCount} pulses.`,
                    tags: ["threat_intel"]
                 });
             }
          } catch (e: any) {
             intelligence.push({ source: "AlienVault OTX", error: `API Error: ${e.message}` });
          }
      })());
  }

  // 3. STIX 2.1 Feed (Real Fetch) - Only if simple JSON check
  const stix = integrations.find(i => i.id === 'stix');
  if (stix && stix.enabled) {
      tasks.push((async () => {
          // This is a heavy check, usually skip unless necessary. 
          // For demo, we might skip enrichment here to avoid 5MB downloads per IOC check.
      })());
  }

  // 4. AbuseIPDB (Real API)
  const abuse = integrations.find(i => i.id === 'abuseip');
  if (abuse && abuse.enabled && type === IndicatorType.IP) {
      tasks.push((async () => {
          const apiKey = abuse.fields.find(f => f.key === 'apiKey')?.value;
          if (!apiKey) return;
          try {
             const data = await fetchJson(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ioc}`, {
                 headers: { 'Key': apiKey, 'Accept': 'application/json' }
             });
             const score = data.data?.abuseConfidenceScore || 0;
             intelligence.push({
                source: "AbuseIPDB",
                score: score,
                maxScore: 100,
                details: `Confidence Score: ${score}%`,
                lastSeen: data.data?.lastReportedAt
             });
          } catch (e: any) {
             intelligence.push({ source: "AbuseIPDB", error: `API Error: ${e.message}` });
          }
      })());
  }

  // 5. Shodan (Real API)
  const shodan = integrations.find(i => i.id === 'shodan');
  if (shodan && shodan.enabled && type === IndicatorType.IP) {
      tasks.push((async () => {
          const apiKey = shodan.fields.find(f => f.key === 'apiKey')?.value;
          if (!apiKey) return;
          try {
              const data = await fetchJson(`https://api.shodan.io/api-info?key=${apiKey}`);
              const ports = data.ports || [];
              intelligence.push({
                  source: "Shodan",
                  details: `Open Ports: ${ports.join(', ')}`,
                  tags: data.vulns ? ["vulnerabilities_detected"] : []
              });
          } catch (e: any) {
              intelligence.push({ source: "Shodan", error: `API Error: ${e.message}` });
          }
      })());
  }

  // Run all tasks
  await Promise.all(tasks.map(p => p.catch(e => console.error(e))));

  return intelligence;
};

/**
 * Execute a specific integration task (e.g., Pull Feed)
 */
export const runIntegration = async (config: IntegrationConfig): Promise<{ success: boolean; message: string; count?: number }> => {
    
    // Check for Generic Feed URL
    const url = config.fields.find(f => f.key === 'feedUrl')?.value;

    if (config.id === 'stix') {
      if (!url) return { success: false, message: "No feed URL configured" };
  
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bundle = await res.json();
        
        if (!bundle.objects) throw new Error("Invalid STIX Bundle");
  
        const threats = bundle.objects.filter((o: any) => (o.type === 'malware' || o.type === 'intrusion-set') && !o.revoked).slice(0, 50); // Limit 50
  
        if (threats.length === 0) return { success: true, message: "No new relevant objects found in feed.", count: 0 };
  
        let count = 0;
        for (const threat of threats) {
          const analysis: AnalysisResult = {
             id: crypto.randomUUID(),
             ioc: threat.name,
             type: IndicatorType.HASH, 
             riskScore: 90,
             verdict: ThreatLevel.CRITICAL,
             timestamp: new Date().toISOString(),
             description: threat.description || "Ingested from STIX 2.1 Threat Feed.",
             mitigationSteps: ["Isolate systems", "Update definitions"],
             technicalDetails: {
                 lastSeen: threat.modified || threat.created,
                 asn: 'Feed-Ingested'
             },
             threatActors: threat.type === 'intrusion-set' ? [threat.name] : [],
             externalIntel: [{ source: 'STIX Feed', details: `Imported ${threat.type}`, tags: threat.labels || ['stix_import'] }]
          };
  
          await dbService.saveAnalysis(analysis);
          await alertService.evaluateRules(analysis);
          count++;
        }
        return { success: true, message: `Ingested ${count} STIX objects.`, count };
  
      } catch (e: any) {
        return { success: false, message: `Ingestion failed: ${e.message}` };
      }
    }
    
    // Generic Text/CSV Ingestion
    if (url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            
            // INCREASED LIMIT: Process up to 5000 lines to handle headers
            const lines = text.split('\n').slice(0, 5000); 
            let count = 0;

            for (const line of lines) {
                // Skip empty lines or comments
                if (!line || line.startsWith('#') || line.trim().length === 0) continue;
                
                // Enhanced parsing strategy: 
                // 1. Try to find a valid IP or Domain first using regex
                // 2. Fallback to token splitting
                
                const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
                const domainRegex = /\b([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}\b/i;
                
                let ioc = line.match(ipRegex)?.[0] || line.match(domainRegex)?.[0];
                
                if (!ioc) {
                    const tokens = line.split(/[\s,;]+/);
                    ioc = tokens.find(t => t.includes('.') && t.length > 4); 
                }

                if (ioc) {
                     const type = ioc.match(ipRegex) ? IndicatorType.IP : IndicatorType.DOMAIN;
                     
                     const analysis: AnalysisResult = {
                        id: crypto.randomUUID(),
                        ioc: ioc,
                        type: type,
                        riskScore: 85,
                        verdict: ThreatLevel.HIGH,
                        timestamp: new Date().toISOString(),
                        description: `Automatically ingested from ${config.name} feed.`,
                        mitigationSteps: ["Block at firewall/proxy", "Investigate recent traffic"],
                        technicalDetails: {
                            lastSeen: new Date().toISOString(),
                            registrar: 'Feed Ingested'
                        },
                        externalIntel: [{ source: config.name, details: 'Listed in blocklist', tags: ['feed_import', 'blocklist'] }]
                     };

                     await dbService.saveAnalysis(analysis);
                     await alertService.evaluateRules(analysis);
                     count++;
                }
                
                // Demo safety break: Max 100 successful imports per run to avoid flooding DB
                if (count >= 100) break;
            }
            
            if (count === 0) {
                return { success: true, message: `Connected to feed, but found 0 extracted indicators in first 5000 lines. Check feed format.` };
            }
            
            return { success: true, message: `Ingested ${count} indicators from ${config.name}. (Limited to first 100 detections for demo performance)`, count };

        } catch (e: any) {
            return { success: false, message: `Ingestion failed: ${e.message}. (Note: Many public feeds block CORS. You may need a proxy.)` };
        }
    }

    return { success: false, message: "Ingestion not supported for this integration type." };
  };