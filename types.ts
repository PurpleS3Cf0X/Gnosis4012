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
  ttps: string[];
  preferredMalware: string[];
  origin?: string;
  description?: string;
  targetedIndustries?: string[];
  motivation?: string;
  notableAttacks?: string[]; 
  tools?: string[];
  relationships?: {
    affiliated_with: string[];
    rival_of: string[];
  };
  timeline?: TimelineEvent[];
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
  lastSync?: string;
}

// --- Alerting & Reporting Types ---

export interface AlertCondition {
  field: 'riskScore' | 'verdict' | 'type' | 'ioc' | 'threatActor';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string | number;
}

export interface AlertRule {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  conditions: AlertCondition[];
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