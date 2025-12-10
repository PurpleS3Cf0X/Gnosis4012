
import React from 'react';

export enum ThreatLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  SAFE = 'SAFE'
}

export enum IndicatorType {
  IP = 'IP Address',
  DOMAIN = 'Domain',
  HASH = 'File Hash',
  URL = 'URL'
}

export interface ExternalIntel {
  source: string;
  score?: number;
  maxScore?: number;
  tags?: string[];
  lastSeen?: string;
  details?: string;
  error?: string;
}

export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
}

export interface ThreatActorProfile {
  name: string;
  aliases?: string[];
  firstSeen?: string;
  notabilityScore?: number; // 1-10 impact score
  ttps: string[];
  preferredMalware: string[];
  origin?: string;
  description?: string;
  targetedIndustries?: string[];
  motivation?: string;
  notableAttacks?: string[]; 
  tools?: string[];
  sample_iocs?: string[]; // Example IPs, Domains, Hashes
  relationships?: {
    affiliated_with: string[];
    rival_of: string[];
  };
  timeline?: TimelineEvent[];
  images?: string[]; // URLs for logos, attack diagrams, or screenshots
  lastUpdated?: string; // Timestamp of last enrichment
  references?: string[]; // URLs of sources used for enrichment
}

export interface VulnerabilityProfile {
  id: string; // CVE ID or Malware Name
  type: 'CVE' | 'MALWARE';
  title: string;
  description: string;
  cvssScore?: number; // 0-10
  severity: ThreatLevel;
  affectedSystems: string[];
  exploitationStatus: 'Active' | 'PoC Available' | 'None' | 'Unknown';
  technicalAnalysis: string; // Deep dive explanation
  mitigationSteps: string[];
  detectionRules?: {
    type: 'YARA' | 'SIGMA' | 'SNORT';
    content: string;
    description: string;
  }[];
  publishedDate?: string;
  references: string[];
}

export interface AnalysisResult {
  id?: string; // Database ID
  ioc: string;
  type: IndicatorType;
  riskScore: number; // 0-100
  verdict: ThreatLevel;
  threatActors?: string[];
  threatActorDetails?: ThreatActorProfile[];
  malwareFamilies?: string[];
  geoGeolocation?: string;
  description: string;
  mitigationSteps: string[];
  technicalDetails: {
    asn?: string;
    registrar?: string;
    openPorts?: number[];
    lastSeen?: string;
  };
  externalIntel?: ExternalIntel[]; // New field for integrations
  groundingUrls?: string[]; // New field for Google Search citations
  timestamp: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

export interface IntegrationField {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  category: 'Intel Provider' | 'SIEM' | 'Notification' | 'Scanner';
  description: string;
  enabled: boolean;
  iconName: string;
  fields: IntegrationField[];
  docUrl?: string;
  detailsUrl?: string;
  helpText?: string;
  status?: 'operational' | 'degraded' | 'maintenance' | 'unknown';
  lastSync?: string; // Timestamp of last successful connection test
}

// --- Alerting & Reporting Types ---

export interface AlertCondition {
  id: string;
  field: 'riskScore' | 'verdict' | 'type' | 'ioc' | 'threatActor' | 'malwareFamilies';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string | number;
}

export interface AlertGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: AlertCondition[];
}

export interface AlertRule {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  logic: 'AND' | 'OR';
  groups: AlertGroup[];
  enabled: boolean;
  actionChannels: string[]; // e.g., ['slack', 'email']
  created: string;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  ioc: string;
  analysisId?: string;
  timestamp: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  details: string;
}

export interface ReportConfig {
  id: string;
  title: string;
  type: 'WEEKLY_SUMMARY' | 'INCIDENT_REPORT' | 'THREAT_LANDSCAPE';
  generatedAt: string;
  status: 'READY' | 'GENERATING';
  summary?: string;
}

// --- AI Settings ---

export interface AISettingsConfig {
  activeModel: 'gemini-2.5-flash' | 'gemini-3-pro-preview';
  temperature: number; // 0.0 to 1.0
  topP: number; // 0.0 to 1.0
  topK: number; // Integer
  maxOutputTokens: number;
  thinkingBudget: number; // 0 to 24576 (for 2.5 Flash)
  language: string;
  detailLevel: 'brief' | 'detailed' | 'comprehensive';
  riskTolerance: 'conservative' | 'balanced' | 'aggressive'; 
  maxContextItems: number; 
  customInstructions: string;
}
