
import { AnalysisResult, ThreatActorProfile, AlertRule, TriggeredAlert, ReportConfig, VulnerabilityProfile, ThreatLevel } from '../types';

const DB_NAME = 'Gnosis4012_DB';
const DB_VERSION = 3; // Incremented version for Vuln Repo
const STORE_ANALYSIS = 'analyses';
const STORE_ACTORS = 'actors';
const STORE_RULES = 'rules';
const STORE_ALERTS = 'alerts';
const STORE_REPORTS = 'reports';
const STORE_VULN_REPO = 'vuln_repo';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for Analysis History
      if (!db.objectStoreNames.contains(STORE_ANALYSIS)) {
        const store = db.createObjectStore(STORE_ANALYSIS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('ioc', 'ioc', { unique: false });
      }

      // Store for Threat Actor Profiles (Cache)
      if (!db.objectStoreNames.contains(STORE_ACTORS)) {
        db.createObjectStore(STORE_ACTORS, { keyPath: 'name' });
      }

      // Store for Alert Rules
      if (!db.objectStoreNames.contains(STORE_RULES)) {
        db.createObjectStore(STORE_RULES, { keyPath: 'id' });
      }

      // Store for Triggered Alerts
      if (!db.objectStoreNames.contains(STORE_ALERTS)) {
        const store = db.createObjectStore(STORE_ALERTS, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Store for Reports
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: 'id' });
      }

      // Store for Vulnerability & Malware Repo
      if (!db.objectStoreNames.contains(STORE_VULN_REPO)) {
        const store = db.createObjectStore(STORE_VULN_REPO, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('severity', 'severity', { unique: false });
      }
    };
  });
};

export const dbService = {
  
  // Initialize Default Data (Seeding)
  async initializeDefaults(): Promise<void> {
    const db = await openDB();
    
    // 1. Seed Rules
    const rulesTx = db.transaction([STORE_RULES], 'readwrite');
    const rulesStore = rulesTx.objectStore(STORE_RULES);
    const rulesCountReq = rulesStore.count();
    
    rulesCountReq.onsuccess = () => {
        if (rulesCountReq.result === 0) {
            const defaults: AlertRule[] = [
                {
                    id: 'rule_default_1',
                    name: 'Critical Risk Detected',
                    severity: 'CRITICAL',
                    logic: 'AND',
                    enabled: true,
                    actionChannels: ['email'],
                    created: new Date().toISOString(),
                    groups: [{
                        id: 'g1',
                        logic: 'AND',
                        conditions: [{ id: 'c1', field: 'riskScore', operator: 'greaterThan', value: 90 }]
                    }]
                },
                {
                    id: 'rule_default_2',
                    name: 'Ransomware Indicators',
                    severity: 'HIGH',
                    logic: 'OR',
                    enabled: true,
                    actionChannels: ['slack'],
                    created: new Date().toISOString(),
                    groups: [{
                        id: 'g2',
                        logic: 'OR',
                        conditions: [
                            { id: 'c2a', field: 'threatActor', operator: 'contains', value: 'LockBit' },
                            { id: 'c2b', field: 'threatActor', operator: 'contains', value: 'BlackCat' },
                            { id: 'c2c', field: 'threatActor', operator: 'contains', value: 'Play' },
                            { id: 'c2d', field: 'malwareFamilies', operator: 'contains', value: 'Ransom' }
                        ]
                    }]
                },
                {
                    id: 'rule_default_3',
                    name: 'APT Activity (Nation-State)',
                    severity: 'HIGH',
                    logic: 'OR',
                    enabled: true,
                    actionChannels: ['email', 'slack'],
                    created: new Date().toISOString(),
                    groups: [{
                        id: 'g3',
                        logic: 'OR',
                        conditions: [
                            { id: 'c3a', field: 'threatActor', operator: 'contains', value: 'APT' },
                            { id: 'c3b', field: 'threatActor', operator: 'contains', value: 'Lazarus' },
                            { id: 'c3c', field: 'threatActor', operator: 'contains', value: 'Bear' },
                            { id: 'c3d', field: 'threatActor', operator: 'contains', value: 'Panda' },
                            { id: 'c3e', field: 'threatActor', operator: 'contains', value: 'Chollima' }
                        ]
                    }]
                }
            ];
            defaults.forEach(rule => rulesStore.put(rule));
            console.log("Seeded default detection rules.");
        }
    };

    // 2. Seed Vulnerability Vault (Factual Data)
    const vulnTx = db.transaction([STORE_VULN_REPO], 'readwrite');
    const vulnStore = vulnTx.objectStore(STORE_VULN_REPO);
    const vulnCountReq = vulnStore.count();

    vulnCountReq.onsuccess = () => {
        if (vulnCountReq.result === 0) {
            const defaults: VulnerabilityProfile[] = [
                // --- HIGH PROFILE CVES ---
                {
                    id: "CVE-2024-3094",
                    type: "CVE",
                    title: "XZ Utils Backdoor",
                    description: "Malicious code injected into XZ Utils versions 5.6.0 and 5.6.1 via a supply chain attack. Allows unauthorized remote access.",
                    cvssScore: 10.0,
                    severity: ThreatLevel.CRITICAL,
                    affectedSystems: ["Linux (Fedora, Debian, Kali, OpenSUSE)", "XZ Utils 5.6.0", "XZ Utils 5.6.1"],
                    exploitationStatus: "PoC Available",
                    technicalAnalysis: "The backdoor intercepts RSA public key decryption during SSH login. It was introduced by a compromised maintainer account over several months. Detection requires checking liblzma versions.",
                    mitigationSteps: ["Downgrade XZ Utils to 5.4.x", "Check system logs for SSH anomalies", "Rebuild compromised systems"],
                    publishedDate: "2024-03-29",
                    references: ["https://nvd.nist.gov/vuln/detail/CVE-2024-3094", "https://www.openwall.com/lists/oss-security/2024/03/29/4"],
                    confidenceScore: 100,
                    lastEnriched: new Date().toISOString()
                },
                {
                    id: "CVE-2021-44228",
                    type: "CVE",
                    title: "Log4Shell (Apache Log4j)",
                    description: "Remote Code Execution (RCE) vulnerability in Apache Log4j 2.x via JNDI injection.",
                    cvssScore: 10.0,
                    severity: ThreatLevel.CRITICAL,
                    affectedSystems: ["Apache Log4j 2.0-beta9 to 2.14.1", "VMware", "Cisco", "Elasticsearch", "Many Java Apps"],
                    exploitationStatus: "Active",
                    technicalAnalysis: "Attacker sends a specially crafted string (e.g., ${jndi:ldap://...}) which Log4j interprets, forcing the server to connect to a malicious LDAP server and execute payload.",
                    mitigationSteps: ["Upgrade to Log4j 2.17.1+", "Set log4j2.formatMsgNoLookups=true", "Deploy WAF rules for JNDI strings"],
                    publishedDate: "2021-12-10",
                    references: ["https://logging.apache.org/log4j/2.x/security.html", "https://www.cisa.gov/uscert/apache-log4j-vulnerability-guidance"],
                    confidenceScore: 100,
                    lastEnriched: new Date().toISOString()
                },
                {
                    id: "CVE-2023-34362",
                    type: "CVE",
                    title: "MOVEit Transfer SQLi",
                    description: "SQL injection vulnerability in Progress MOVEit Transfer enabling unauthenticated RCE and data exfiltration.",
                    cvssScore: 9.8,
                    severity: ThreatLevel.CRITICAL,
                    affectedSystems: ["Progress MOVEit Transfer before 2023.0.1"],
                    exploitationStatus: "Active",
                    technicalAnalysis: "Used extensively by the Cl0p ransomware gang. The flaw allows manipulation of the database via the web interface to inject a webshell (human2.aspx).",
                    mitigationSteps: ["Apply vendor patches immediately", "Disable HTTP/HTTPS traffic to MOVEit Transfer", "Check for 'human2.aspx'"],
                    publishedDate: "2023-05-31",
                    references: ["https://community.progress.com/s/article/MOVEit-Transfer-Critical-Vulnerability-31May2023"],
                    confidenceScore: 100,
                    lastEnriched: new Date().toISOString()
                },
                {
                    id: "CVE-2017-0144",
                    type: "CVE",
                    title: "EternalBlue (MS17-010)",
                    description: "RCE vulnerability in Microsoft SMBv1 server. Used in WannaCry and NotPetya ransomware attacks.",
                    cvssScore: 9.3,
                    severity: ThreatLevel.HIGH,
                    affectedSystems: ["Windows 7", "Windows Server 2008", "Windows XP", "Unpatched Windows 10"],
                    exploitationStatus: "Active",
                    technicalAnalysis: "Exploits a buffer overflow in the handling of specially crafted packets by the Srv.sys driver. Allows execution of arbitrary code with SYSTEM privileges.",
                    mitigationSteps: ["Apply MS17-010 patch", "Disable SMBv1", "Block port 445 at firewall"],
                    publishedDate: "2017-03-14",
                    references: ["https://learn.microsoft.com/en-us/security-updates/securitybulletins/2017/ms17-010"],
                    confidenceScore: 100,
                    lastEnriched: new Date().toISOString()
                },

                // --- HIGH PROFILE MALWARE ---
                {
                    id: "LockBit 3.0",
                    type: "MALWARE",
                    title: "LockBit 3.0 (LockBit Black)",
                    description: "The most prolific Ransomware-as-a-Service (RaaS) operation globally. Known for double extortion tactics.",
                    severity: ThreatLevel.CRITICAL,
                    affectedSystems: ["Windows", "Linux (ESXi)", "Enterprise Networks"],
                    exploitationStatus: "Active",
                    technicalAnalysis: "Features self-spreading capabilities via SMB (T1021.002). Uses ChaCha20 + RSA-4096 for encryption. Often deletes Volume Shadow Copies to prevent recovery.",
                    mitigationSteps: ["Offline Backups", "EDR Deployment", "Disable Administrative Shares", "Patch External Facing VPNs"],
                    publishedDate: "2022-06-01",
                    references: ["https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-165a", "https://www.trendmicro.com/vinfo/us/security/news/ransomware-spotlight/ransomware-spotlight-lockbit"],
                    confidenceScore: 100,
                    lastEnriched: new Date().toISOString()
                },
                {
                    id: "Cobalt Strike",
                    type: "MALWARE",
                    title: "Cobalt Strike Beacon",
                    description: "Legitimate adversary simulation software heavily abused by threat actors for C2 and lateral movement.",
                    severity: ThreatLevel.HIGH,
                    affectedSystems: ["Windows Networks"],
                    exploitationStatus: "Active",
                    technicalAnalysis: "Uses 'Beacons' for C2 communication via HTTP/HTTPS/DNS. Often deployed after initial access (phishing or exploit). Supports reflective DLL injection.",
                    mitigationSteps: ["Scan for default Cobalt Strike certificates", "Monitor for high-frequency DNS requests", "Process memory scanning"],
                    publishedDate: "2012-01-01",
                    references: ["https://attack.mitre.org/software/S0154/"],
                    confidenceScore: 95,
                    lastEnriched: new Date().toISOString()
                },
                {
                    id: "Emotet",
                    type: "MALWARE",
                    title: "Emotet Botnet",
                    description: "Modular banking trojan that evolved into a distributor for other malware (e.g., Ryuk, TrickBot).",
                    severity: ThreatLevel.HIGH,
                    affectedSystems: ["Windows Endpoints"],
                    exploitationStatus: "Active",
                    technicalAnalysis: "Spreads via spam emails containing malicious Word documents (VBA macros). Establishes persistence via Registry Run keys. Downloads additional payloads.",
                    mitigationSteps: ["Disable Office Macros", "Email Sandboxing", "Network Segmentation"],
                    publishedDate: "2014-06-01",
                    references: ["https://www.cisa.gov/uscert/ncas/alerts/aa20-280a"],
                    confidenceScore: 90,
                    lastEnriched: new Date().toISOString()
                },
                {
                    id: "BlackCat",
                    type: "MALWARE",
                    title: "ALPHV / BlackCat",
                    description: "Sophisticated RaaS written in Rust, allowing cross-platform targeting (Windows & Linux ESXi).",
                    severity: ThreatLevel.CRITICAL,
                    affectedSystems: ["Windows", "Linux", "VMware ESXi"],
                    exploitationStatus: "Active",
                    technicalAnalysis: "Highly customizable configuration. Exfiltrates data before encryption. Uses AES for file encryption. Terminates security processes/services before execution.",
                    mitigationSteps: ["MFA enforcement", "Network Segmentation", "Monitor data exfiltration channels"],
                    publishedDate: "2021-11-01",
                    references: ["https://www.varonis.com/blog/blackcat-ransomware"],
                    confidenceScore: 95,
                    lastEnriched: new Date().toISOString()
                }
            ];
            
            defaults.forEach(item => vulnStore.put(item));
            console.log("Seeded Vulnerability & Malware Vault.");
        }
    };
  },

  // --- Analysis ---
  async saveAnalysis(result: AnalysisResult): Promise<string> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ANALYSIS, 'readwrite');
      const store = tx.objectStore(STORE_ANALYSIS);
      const record = { ...result, id: result.id || crypto.randomUUID() };
      const request = store.put(record);
      request.onsuccess = () => resolve(record.id);
      request.onerror = () => reject(request.error);
    });
  },

  async getHistory(): Promise<AnalysisResult[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ANALYSIS, 'readonly');
      const store = tx.objectStore(STORE_ANALYSIS);
      const index = store.index('timestamp');
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result.reverse());
      request.onerror = () => reject(request.error);
    });
  },

  async deleteAnalysis(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ANALYSIS, 'readwrite');
      const store = tx.objectStore(STORE_ANALYSIS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- Vulnerability Repo ---
  async saveVulnerability(profile: VulnerabilityProfile): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VULN_REPO, 'readwrite');
      const store = tx.objectStore(STORE_VULN_REPO);
      const request = store.put(profile);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getVulnerabilities(): Promise<VulnerabilityProfile[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VULN_REPO, 'readonly');
      const store = tx.objectStore(STORE_VULN_REPO);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteVulnerability(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VULN_REPO, 'readwrite');
      const store = tx.objectStore(STORE_VULN_REPO);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- Actors ---
  async getAllActors(): Promise<ThreatActorProfile[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ACTORS, 'readonly');
      const store = tx.objectStore(STORE_ACTORS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveActor(profile: ThreatActorProfile): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ACTORS, 'readwrite');
      const store = tx.objectStore(STORE_ACTORS);
      const request = store.put(profile);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getActor(name: string): Promise<ThreatActorProfile | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ACTORS, 'readonly');
      const store = tx.objectStore(STORE_ACTORS);
      const request = store.get(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // --- Alert Rules ---
  async getRules(): Promise<AlertRule[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RULES, 'readonly');
      const store = tx.objectStore(STORE_RULES);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveRule(rule: AlertRule): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RULES, 'readwrite');
      const store = tx.objectStore(STORE_RULES);
      const request = store.put(rule);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteRule(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RULES, 'readwrite');
      const store = tx.objectStore(STORE_RULES);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- Triggered Alerts ---
  async getAlerts(): Promise<TriggeredAlert[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ALERTS, 'readonly');
      const store = tx.objectStore(STORE_ALERTS);
      const index = store.index('timestamp');
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result.reverse());
      request.onerror = () => reject(request.error);
    });
  },

  async saveTriggeredAlert(alert: TriggeredAlert): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ALERTS, 'readwrite');
      const store = tx.objectStore(STORE_ALERTS);
      const request = store.put(alert);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // --- Reports ---
  async getReports(): Promise<ReportConfig[]> {
     const db = await openDB();
     return new Promise((resolve, reject) => {
       const tx = db.transaction(STORE_REPORTS, 'readonly');
       const store = tx.objectStore(STORE_REPORTS);
       const request = store.getAll();
       request.onsuccess = () => resolve(request.result.reverse());
       request.onerror = () => reject(request.error);
     });
  },

  async saveReport(report: ReportConfig): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_REPORTS, 'readwrite');
      const store = tx.objectStore(STORE_REPORTS);
      const request = store.put(report);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
