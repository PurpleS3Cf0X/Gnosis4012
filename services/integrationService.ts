
import { ExternalIntel, IndicatorType, IntegrationConfig, AnalysisResult, ThreatLevel, VulnerabilityProfile } from '../types';
import { dbService } from './dbService';
import { alertService } from './alertService';

/**
 * INTEGRATION LAYER
 * 
 * Manages connections to external tools.
 * Stores configuration in localStorage to persist user API keys/settings across sessions.
 */

const STORAGE_KEY = 'gnosis_integrations_v2';

// Default configuration with supported integrations
// NOTE: These are high-reliability, industry standard feeds.
const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  // --- HIGH RELIABILITY FEEDS ---
  { 
    id: 'cisa_kev', 
    name: 'CISA KEV', 
    category: 'Intel Provider', 
    description: 'Known Exploited Vulnerabilities Catalog by CISA. Automatically populates the Vulnerability Vault with active threats.', 
    enabled: true, 
    iconName: 'Shield',
    docUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    detailsUrl: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    helpText: 'Pulls JSON feed from CISA. Populates both the Intel Feed and the Vulnerability Vault.',
    fields: [
        { key: 'feedUrl', label: 'Feed URL', value: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', type: 'url', placeholder: 'https://...' }
    ],
    status: 'unknown',
    lastSync: 'Never',
    pullInterval: 60 // Default 1 hour
  },
  {
      id: 'malware_bazaar',
      name: 'MalwareBazaar',
      category: 'Intel Provider',
      description: 'Collects and shares malware samples (SHA256 hashes) to help the community combat cyber threats.',
      enabled: true,
      iconName: 'Bug',
      docUrl: 'https://bazaar.abuse.ch/',
      helpText: 'Ingests recent malware hashes directly into the Intel Analyzer history.',
      fields: [
          { key: 'feedUrl', label: 'Feed URL (Text)', value: 'https://bazaar.abuse.ch/export/txt/sha256/recent/', type: 'url' }
      ],
      status: 'unknown',
      lastSync: 'Never',
      pullInterval: 30
  },
  {
      id: 'urlhaus',
      name: 'URLhaus (Abuse.ch)',
      category: 'Intel Provider',
      description: 'High-quality feed of malicious URLs used for malware distribution.',
      enabled: true,
      iconName: 'Globe',
      docUrl: 'https://urlhaus.abuse.ch/',
      fields: [
          { key: 'feedUrl', label: 'Feed URL', value: 'https://urlhaus.abuse.ch/downloads/text_recent/', type: 'url' }
      ],
      status: 'unknown',
      lastSync: 'Never',
      pullInterval: 30 // Default 30 mins
  },
  {
      id: 'threatfox',
      name: 'ThreatFox',
      category: 'Intel Provider',
      description: 'Sharing platform for detailed indicators of compromise (IOCs) associated with malware.',
      enabled: false,
      iconName: 'Activity',
      docUrl: 'https://threatfox.abuse.ch/',
      helpText: 'Pulls recent IOCs including IP:Port combinations and malware signatures.',
      fields: [
          { key: 'feedUrl', label: 'Feed URL (JSON)', value: 'https://threatfox.abuse.ch/export/json/recent/', type: 'url' }
      ],
      status: 'unknown',
      lastSync: 'Never',
      pullInterval: 60
  },
  {
      id: 'feodo',
      name: 'Feodo Tracker',
      category: 'Intel Provider',
      description: 'Tracks Botnet Command & Control servers (C2) associated with Emotet, Dridex, and TrickBot.',
      enabled: false,
      iconName: 'Server',
      docUrl: 'https://feodotracker.abuse.ch/',
      fields: [{ key: 'feedUrl', label: 'Feed URL', value: 'https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt', type: 'url' }],
      status: 'unknown',
      lastSync: 'Never',
      pullInterval: 120
  },

  // --- API INTEGRATIONS ---
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
  
  // --- OPERATIONS ---
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
            // Preserve user settings but accept code updates for fields if needed
            merged[index] = { ...merged[index], ...p };
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

  // AbuseIPDB
  if (config.id === 'abuseip') {
      const key = config.fields.find(f => f.key === 'apiKey')?.value;
      if (!key) return { success: false, message: 'Missing API Key.' };
      try {
          const response = await fetch('https://api.abuseipdb.com/api/v2/check?ipAddress=8.8.8.8', {
              headers: { 'Key': key, 'Accept': 'application/json' }
          });
          if (response.ok) return { success: true, message: 'AbuseIPDB: Connected (200 OK)' };
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

  // 1. VirusTotal
  const vt = integrations.find(i => i.id === 'vt');
  if (vt && vt.enabled) {
      tasks.push((async () => {
          const apiKey = vt.fields.find(f => f.key === 'apiKey')?.value;
          if (!apiKey) return;
          try {
             let endpoint = '';
             if (type === IndicatorType.IP) endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${ioc}`;
             else if (type === IndicatorType.DOMAIN) endpoint = `https://www.virustotal.com/api/v3/domains/${ioc}`;
             else if (type === IndicatorType.HASH) endpoint = `https://www.virustotal.com/api/v3/files/${ioc}`;
             else return;

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
             intelligence.push({ source: "VirusTotal", error: `API Error: ${e.message}` });
          }
      })());
  }

  // 2. AbuseIPDB
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

  await Promise.all(tasks.map(p => p.catch(e => console.error(e))));
  return intelligence;
};

/**
 * Execute a specific integration task (Pull Feed)
 */
export const runIntegration = async (config: IntegrationConfig): Promise<{ success: boolean; message: string; count?: number }> => {
    
    const url = config.fields.find(f => f.key === 'feedUrl')?.value;
    if (!url) return { success: false, message: "No feed URL configured" };

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        let count = 0;

        // --- CISA KEV JSON Handling ---
        if (config.id === 'cisa_kev') {
            const data = await res.json();
            const vulns = data.vulnerabilities || [];
            
            // Limit for demo perf
            for (const v of vulns.slice(0, 50)) {
                
                // 1. Create Vulnerability Profile for the Vault
                const vulnProfile: VulnerabilityProfile = {
                    id: v.cveID,
                    type: 'CVE',
                    title: v.vulnerabilityName,
                    description: v.shortDescription,
                    cvssScore: 0, // CISA feed doesn't always have CVSS, defaults
                    severity: ThreatLevel.HIGH,
                    affectedSystems: [v.vendorProject + ' ' + v.product],
                    exploitationStatus: 'Active',
                    technicalAnalysis: `[CISA KEV] ${v.shortDescription}\n\nRequired Action: ${v.requiredAction}`,
                    mitigationSteps: [v.requiredAction],
                    publishedDate: v.dateAdded,
                    references: ['https://www.cisa.gov/known-exploited-vulnerabilities-catalog'],
                    confidenceScore: 100,
                    lastEnriched: new Date().toISOString()
                };
                await dbService.saveVulnerability(vulnProfile);

                // 2. Also create an Analysis Result for the Live Feed
                const analysis: AnalysisResult = {
                    id: crypto.randomUUID(),
                    ioc: v.cveID,
                    type: IndicatorType.HASH, // Abuse type for CVE display
                    riskScore: 95,
                    verdict: ThreatLevel.CRITICAL,
                    timestamp: new Date().toISOString(),
                    description: `[CISA KEV] ${v.vulnerabilityName}`,
                    mitigationSteps: [v.requiredAction || "Patch immediately"],
                    technicalDetails: {
                        lastSeen: v.dateAdded,
                        registrar: v.vendorProject
                    },
                    threatActors: [],
                    malwareFamilies: [],
                    externalIntel: [{ source: 'CISA KEV', details: 'Confirmed Exploited', tags: ['exploited', 'cisa'] }]
                };
                await dbService.saveAnalysis(analysis);
                await alertService.evaluateRules(analysis);
                count++;
            }
            updateLastSync(config);
            return { success: true, message: `Synced ${count} vulnerabilities to Vault & Feed.`, count };
        }

        // --- ThreatFox JSON Handling ---
        if (config.id === 'threatfox') {
            const data = await res.json();
            const list = Array.isArray(data) ? data : Object.values(data);

            for (const ioc of list.slice(0, 30) as any[]) {
                if (!ioc.ioc_value) continue;
                
                let type = IndicatorType.URL;
                if (ioc.ioc_type === 'ip:port') type = IndicatorType.IP;
                else if (ioc.ioc_type === 'domain') type = IndicatorType.DOMAIN;
                else if (ioc.ioc_type?.includes('hash')) type = IndicatorType.HASH;

                const analysis: AnalysisResult = {
                    id: crypto.randomUUID(),
                    ioc: ioc.ioc_value,
                    type,
                    riskScore: 90,
                    verdict: ThreatLevel.HIGH,
                    timestamp: new Date().toISOString(),
                    description: `[ThreatFox] IOC associated with ${ioc.malware_printable || 'Malware'}`,
                    mitigationSteps: ["Block traffic", "Scan endpoints"],
                    technicalDetails: {
                        lastSeen: ioc.last_seen_utc,
                        asn: ioc.malware_printable
                    },
                    malwareFamilies: ioc.malware_printable ? [ioc.malware_printable] : [],
                    externalIntel: [{ source: 'ThreatFox', details: `Confidence: ${ioc.confidence_level}`, tags: ioc.tags || [] }]
                };
                await dbService.saveAnalysis(analysis);
                await alertService.evaluateRules(analysis);
                count++;
            }
            updateLastSync(config);
            return { success: true, message: `Ingested ${count} IOCs from ThreatFox.`, count };
        }

        // --- Generic Text/CSV Line-by-Line Handling (URLhaus, Feodo, MalwareBazaar, etc) ---
        const text = await res.text();
        const lines = text.split('\n').slice(0, 5000); 

        for (const line of lines) {
            if (!line || line.startsWith('#') || line.trim().length === 0) continue;
            
            const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
            const domainRegex = /\b([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}\b/i;
            const hashRegex = /^[a-fA-F0-9]{64}$/; // SHA256 usually from MalwareBazaar
            
            let ioc = line.match(ipRegex)?.[0] || line.match(domainRegex)?.[0] || line.match(hashRegex)?.[0];
            
            // If regex fail, try simplistic CSV split (common in abuse.ch feeds)
            if (!ioc) {
                const tokens = line.split(/[\s,;]+/);
                ioc = tokens.find(t => (t.includes('.') && t.length > 4) || (t.length === 64 && /^[a-f0-9]+$/i.test(t))); 
            }

            if (ioc) {
                    let type = IndicatorType.DOMAIN;
                    if (ioc.match(ipRegex)) type = IndicatorType.IP;
                    else if (ioc.match(hashRegex) || ioc.length === 64) type = IndicatorType.HASH;
                    
                    const analysis: AnalysisResult = {
                        id: crypto.randomUUID(),
                        ioc: ioc,
                        type: type,
                        riskScore: 85,
                        verdict: ThreatLevel.HIGH,
                        timestamp: new Date().toISOString(),
                        description: `Automatically ingested from ${config.name} feed.`,
                        mitigationSteps: ["Block at firewall/proxy", "Investigate recent traffic", "Quarantine file if found"],
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
            
            if (count >= 50) break; // Limit for demo
        }
        
        updateLastSync(config);
        return { success: true, message: `Ingested ${count} indicators from ${config.name}.`, count };

    } catch (e: any) {
        return { success: false, message: `Ingestion failed: ${e.message}. (CORS may block direct browser access)` };
    }
};

// Helper to update the last sync time in storage
const updateLastSync = (config: IntegrationConfig) => {
    const now = new Date();
    const updated = { 
        ...config, 
        lastSync: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'operational' as const
    };
    saveIntegration(updated);
};

// --- AUTOMATED SYNC LOGIC ---

// Tracks when we last checked auto-sync to avoid spamming in React Effect
let lastCheckTime = 0;

export const checkAndRunAutoSync = async () => {
    const now = Date.now();
    // Only check once every 30 seconds max
    if (now - lastCheckTime < 30000) return;
    lastCheckTime = now;

    const integrations = getIntegrations();
    
    for (const config of integrations) {
        // Only run if enabled, is a Provider, and has an interval set
        if (config.enabled && config.category === 'Intel Provider' && config.pullInterval && config.pullInterval > 0) {
            
            // Check if we need to run
            const lastSyncStr = config.lastSync;
            let shouldRun = false;

            if (!lastSyncStr || lastSyncStr === 'Never') {
                shouldRun = true;
            } else {
                // Determine if interval passed. 
                // For this demo, we'll assume random chance acts as timer or if it's explicitly 'Never'
                // Real app would parse ISO timestamp
                if (Math.random() > 0.95) shouldRun = true; 
            }

            if (shouldRun) {
                console.log(`[Auto-Sync] Triggering ${config.name}...`);
                await runIntegration(config);
            }
        }
    }
};
