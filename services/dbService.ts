import { AnalysisResult, ThreatActorProfile, AlertRule, TriggeredAlert, ReportConfig } from '../types';

const DB_NAME = 'Gnosis4012_DB';
const DB_VERSION = 2; // Incremented version
const STORE_ANALYSIS = 'analyses';
const STORE_ACTORS = 'actors';
const STORE_RULES = 'rules';
const STORE_ALERTS = 'alerts';
const STORE_REPORTS = 'reports';

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
    };
  });
};

export const dbService = {
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

  // --- Actors ---
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