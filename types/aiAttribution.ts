// AI Attribution Types for VerseIQ

export type AttributionType = 'AI-Generated' | 'AI-Assisted' | 'Human-Only' | 'Derivative' | 'Unknown';
export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export interface AIAttributionSummary {
  attributionType: AttributionType;
  provenanceCompleteness: number; // 0-100
  riskLevel: RiskLevel;
}

export interface AIInvolvement {
  detectedModels: string[];
  humanContribution: number; // percent
  aiContribution: number; // percent
  confidenceScore: number; // 0-100
  missingDeclarations: string[];
}

export interface DerivativeLineage {
  sourceWorks: string[];
  similarityIndicators: string[];
  derivativeRelationships: string[];
  jurisdictionRelevance: string[];
}

export interface RegistrationAlignment {
  cmoSupport: boolean;
  conflicts: string[];
  requiredCorrections: string[];
}

export interface AttributionMatrixCell {
  nameOrModel: string;
  contributionPercent: number;
  confidence: number;
  source: 'manual' | 'inferred' | 'external';
}

export interface AttributionMatrix {
  human: AttributionMatrixCell[];
  ai: AttributionMatrixCell[];
  hybrid: AttributionMatrixCell[];
}

export interface ProvenanceEvent {
  timestamp: string;
  event: string;
  details?: string;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  missingMetadata: string[];
  jurisdictionRequirements: string[];
  recommendations: string[];
}