import type {
  DashboardDiscoveryIssue,
} from '../utils/discovery-issues';

export type IssueClassification =
  | 'product-bug'
  | 'content-bug'
  | 'automation-issue'
  | 'accessibility-issue'
  | 'performance-issue'
  | 'security-issue'
  | 'needs-investigation'
  | 'warning'
  | 'none';

export type Severity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info'
  | 'none';

export type Category = string;

export type QualityDimension =
  | 'requirements-functionality'
  | 'critical-flows'
  | 'ux-ui'
  | 'security-performance'
  | 'compatibility'
  | 'api-backend';

export type IntelligenceSource =
  | 'test'
  | 'discovery'
  | 'api'
  | 'backend';

export type IntelligencePriority =
  | 'P0'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4';

export type RequirementStatus =
  | 'pass'
  | 'fail'
  | 'partially-verified'
  | 'not-tested';


export interface RequirementAcceptanceCriterion {
  id: string;
  title: string;

  critical?: boolean;
}


export interface RequirementDefinition {
  id: string;
  title: string;

  description?: string;

  site?: string;

  acceptanceCriteria?:
    RequirementAcceptanceCriterion[];

  qualityDimensions?:
    QualityDimension[];

  critical?: boolean;
}


export type RequirementEvidenceStatus =
  | 'passed'
  | 'failed'
  | 'unknown';


export interface RequirementEvidence {
  source:
    IntelligenceSource;

  evidenceId: string;

  requirementId: string;

  acceptanceCriteriaIds?:
    string[];

  status:
    RequirementEvidenceStatus;

  title?: string;

  issueFingerprint?: string;
}


export interface RequirementCriterionCoverage {
  criterionId: string;
  title: string;

  critical: boolean;

  status:
    RequirementStatus;

  evidenceCount: number;

  passedEvidenceCount: number;
  failedEvidenceCount: number;
}


export interface RequirementCoverage {
  requirementId: string;
  title: string;

  critical: boolean;

  status:
    RequirementStatus;

  reason: string;

  evidenceCount: number;

  passedEvidenceCount: number;
  failedEvidenceCount: number;

  coveredBySources:
    IntelligenceSource[];

  issueFingerprints:
    string[];

  criteria:
    RequirementCriterionCoverage[];
}



export type CriticalFlowStatus =
  | 'pass'
  | 'fail'
  | 'degraded'
  | 'not-tested';


export type CriticalFlowScenarioType =
  | 'happy-path'
  | 'edge-case'
  | 'error-handling'
  | 'recovery';


export interface CriticalFlowScenario {
  id: string;

  title: string;

  type:
    CriticalFlowScenarioType;

  critical?: boolean;

  requirementIds?:
    string[];
}


export interface CriticalFlowDefinition {
  id: string;

  title: string;

  description?: string;

  site?: string;

  critical?: boolean;

  requirementIds?:
    string[];

  scenarios:
    CriticalFlowScenario[];
}


export interface CriticalFlowEvidence {
  source:
    IntelligenceSource;

  evidenceId: string;

  flowId: string;

  scenarioIds?:
    string[];

  status:
    RequirementEvidenceStatus;

  title?: string;

  issueFingerprint?: string;
}


export interface CriticalFlowScenarioCoverage {
  scenarioId: string;

  title: string;

  type:
    CriticalFlowScenarioType;

  critical: boolean;

  status:
    CriticalFlowStatus;

  evidenceCount: number;

  passedEvidenceCount: number;

  failedEvidenceCount: number;
}


export interface CriticalFlowCoverage {
  flowId: string;

  title: string;

  critical: boolean;

  status:
    CriticalFlowStatus;

  reason: string;

  evidenceCount: number;

  passedEvidenceCount: number;

  failedEvidenceCount: number;

  coveredBySources:
    IntelligenceSource[];

  issueFingerprints:
    string[];

  scenarios:
    CriticalFlowScenarioCoverage[];
}


export type UxUiStatus =
  | 'healthy'
  | 'degraded'
  | 'poor'
  | 'not-verified';


export type UxUiArea =
  | 'usability'
  | 'navigation'
  | 'interaction'
  | 'forms-validation'
  | 'accessibility'
  | 'visual-stability'
  | 'responsive-usability'
  | 'content-clarity';


export interface UxUiAreaAssessment {
  area:
    UxUiArea;

  status:
    UxUiStatus;

  score?: number;

  evidenceCount: number;

  issueCount: number;

  critical: number;
  high: number;
  medium: number;
  low: number;

  affectedBrowsers:
    string[];

  affectedProfiles:
    string[];

  evidenceSources: IntelligenceSource[];
}


export interface UxUiAssessment {
  status:
    UxUiStatus;

  score?: number;

  evidenceCount: number;

  issueCount: number;

  verifiedAreas:
    UxUiArea[];

  unverifiedAreas:
    UxUiArea[];

  areas:
    UxUiAreaAssessment[];

  sourceCoverage: IntelligenceSource[];
  affectedBrowsers: string[];
  affectedProfiles: string[];
}


export type UnifiedDecisionUnitKind =
  | 'cross-layer-incident'
  | 'standalone-issue';


export type UnifiedDecisionDisposition =
  | 'block'
  | 'warn';


export type UnifiedDecisionState =
  | 'ready'
  | 'ready-with-warnings'
  | 'not-ready'
  | 'not-verified';


export type UnifiedScoreBasis =
  | 'decision-units'
  | 'blocking-gate'
  | 'verification-gaps'
  | 'verified-clean'
  | 'not-verified';


export type UnifiedDecisionEvidenceState =
  | 'confirmed'
  | 'uncertain'
  | 'automation';


export interface UnifiedDecisionUnit {
  id:
    string;

  kind:
    UnifiedDecisionUnitKind;

  disposition:
    UnifiedDecisionDisposition;

  sources:
    IntelligenceSource[];

  issueFingerprints:
    string[];

  priority:
    IntelligencePriority;

  priorityScore:
    number;

  severity:
    Severity;

  blocking:
    boolean;

  evidenceState:
    UnifiedDecisionEvidenceState;

  riskEligible:
    boolean;

  confidence:
    number | null;

  rootCauseLayer?:
    CrossLayerRootCauseLayer;

  rootCause?:
    string;

  userImpact?:
    string;

  recommendation?:
    string;

  qualityDimensions:
    QualityDimension[];

  requirementIds:
    string[];

  criticalFlowIds:
    string[];

  flowScenarioIds:
    string[];
}


export interface UnifiedDecisionGateSummary {
  complete:
    boolean;

  blockingRequirements:
    number;

  requirementGaps:
    number;

  blockingFlows:
    number;

  flowGaps:
    number;

  blockingUxAreas:
    number;

  uxUiGaps:
    number;

  blockingSecurityAreas:
    number;

  blockingPerformanceAreas:
    number;

  securityGaps:
    number;

  performanceGaps:
    number;

  blockingCompatibilityRegressions:
    number;

  compatibilityGaps:
    number;

  blockingApiIssues:
    number;

  blockingBackendIssues:
    number;

  apiIntelligenceGaps:
    number;

  backendIntelligenceGaps:
    number;
}


export interface UnifiedDecisionAssessment {
  state:
    UnifiedDecisionState;

  scoreBasis:
    UnifiedScoreBasis;

  rawIssueCount:
    number;

  decisionUnitCount:
    number;

  incidentUnits:
    number;

  standaloneUnits:
    number;

  blockingUnits:
    number;

  warningUnits:
    number;

  correlatedEvidenceCount:
    number;

  correlationSavings:
    number;

  unresolvedStandaloneFingerprints:
    string[];

  riskScore:
    number | null;

  qualityScore:
    number | null;

  confidence:
    number | null;

  highestPriority:
    IntelligencePriority | null;

  highestSeverity:
    Severity | null;

  gateSummary:
    UnifiedDecisionGateSummary;

  blockingGateDimensions:
    string[];

  verificationGapDimensions:
    string[];

  decisionUnits:
    UnifiedDecisionUnit[];
}


export type AutonomousQaAuthority =
  | 'advisory-only';

export type AutonomousQaCapabilityStatus =
  | 'foundation-only'
  | 'test-selection-advisory'
  | 'execution-planning-advisory'
  | 'failure-reproduction-advisory'
  | 'verification-planning-advisory'
  | 'change-impact-advisory'
  | 'quality-drift-advisory'
  | 'not-verified';

export type AutonomousQaActionKind =
  | 'test-selection'
  | 'execution-planning'
  | 'failure-reproduction'
  | 'verification'
  | 'change-impact'
  | 'quality-drift'
  | 'investigation';

export type AutonomousQaActionState =
  | 'candidate';

export type AutonomousQaTestSelectionReason =
  | 'unified-decision-link'
  | 'failed-current-run'
  | 'requirement-link'
  | 'critical-flow-link'
  | 'flow-scenario-link';

export interface AutonomousQaTestVariant {
  testId: string;
  project: string;
  browserFamily: string;
  profile: string;
  status: string;
}

export interface AutonomousQaTestSelectionCandidate {
  id: string;
  logicalTestKey: string;

  title: string;
  fullTitle: string;
  file: string;
  site: string;

  priority:
    IntelligencePriority | null;

  disposition:
    UnifiedDecisionDisposition | null;

  evidenceState:
    UnifiedDecisionEvidenceState | null;

  riskEligible: boolean;

  confidence:
    number | null;

  reasons:
    AutonomousQaTestSelectionReason[];

  variants:
    AutonomousQaTestVariant[];

  provenance:
    AutonomousQaEvidenceProvenance;
}

export type AutonomousQaTestSelectionStatus =
  | 'available'
  | 'no-candidates'
  | 'not-verified';

export interface AutonomousQaTestSelectionAssessment {
  status:
    AutonomousQaTestSelectionStatus;

  candidateCount: number;
  selectedTestCount: number;

  candidates:
    AutonomousQaTestSelectionCandidate[];
}

export type AutonomousQaExecutionPhase =
  | 'release-blocking'
  | 'risk-eligible'
  | 'uncertainty-verification'
  | 'evidence-follow-up';

export type AutonomousQaExecutionPlanStatus =
  | 'available'
  | 'no-candidates'
  | 'not-verified';

export interface AutonomousQaExecutionPlanStep {
  id: string;
  order: number;

  phase:
    AutonomousQaExecutionPhase;

  testSelectionCandidateId:
    string;

  title: string;
  file: string;
  site: string;

  projects:
    string[];

  testIds:
    string[];

  priority:
    IntelligencePriority | null;

  disposition:
    UnifiedDecisionDisposition | null;

  evidenceState:
    UnifiedDecisionEvidenceState | null;

  riskEligible:
    boolean;

  executable:
    false;

  rationale:
    string;

  provenance:
    AutonomousQaEvidenceProvenance;
}

export interface AutonomousQaExecutionPlanAssessment {
  status:
    AutonomousQaExecutionPlanStatus;

  stepCount: number;
  plannedTestCount: number;

  phases:
    AutonomousQaExecutionPhase[];

  steps:
    AutonomousQaExecutionPlanStep[];
}

export type AutonomousQaFailureReproductionStatus =
  | 'available'
  | 'no-failures'
  | 'not-verified';

export interface AutonomousQaFailureEvidence {
  testId: string;
  title: string;
  fullTitle: string;

  file: string;
  line: number;
  column: number;

  project: string;
  site: string;
  browserFamily: string;
  profile: string;

  status: string;
  expectedStatus: string;

  duration: number;
  retry: number;
  startedAt?: string;

  error?: DashboardError;
  attachments:
    DashboardAttachment[];

  classification?:
    IssueClassification;

  classificationReason?: string;
  recommendation?: string;
  rootCause?: string;
  confidence?: number;
  userImpact?: string;
}

export interface AutonomousQaFailureReproductionRecipe {
  id: string;
  order: number;

  executionPlanStepId: string;
  testSelectionCandidateId: string;

  phase:
    AutonomousQaExecutionPhase;

  title: string;
  file: string;
  site: string;

  projects: string[];
  testIds: string[];

  evidenceCount: number;
  attachmentCount: number;

  confidence:
    number | null;

  instructions: string[];

  evidence:
    AutonomousQaFailureEvidence[];

  provenance:
    AutonomousQaEvidenceProvenance;

  executable: false;
}

export interface AutonomousQaFailureReproductionAssessment {
  status:
    AutonomousQaFailureReproductionStatus;

  recipeCount: number;
  failedTestCount: number;
  attachmentCount: number;

  recipes:
    AutonomousQaFailureReproductionRecipe[];
}

export type AutonomousQaVerificationPlanStatus =
  | 'available'
  | 'no-failures'
  | 'not-verified';

export type AutonomousQaVerificationState =
  | 'awaiting-new-evidence';

export interface AutonomousQaVerificationExpectation {
  testId: string;

  project: string;
  site: string;
  browserFamily: string;
  profile: string;

  previousStatus: string;
  expectedStatus: string;

  evidenceRequirements:
    string[];
}

export interface AutonomousQaVerificationPlan {
  id: string;
  order: number;

  failureReproductionRecipeId:
    string;

  executionPlanStepId: string;
  testSelectionCandidateId: string;

  phase:
    AutonomousQaExecutionPhase;

  title: string;
  file: string;
  site: string;

  projects: string[];
  testIds: string[];

  verificationState:
    AutonomousQaVerificationState;

  requiresNewEvidence: true;
  verified: false;

  criteria: string[];

  expectations:
    AutonomousQaVerificationExpectation[];

  provenance:
    AutonomousQaEvidenceProvenance;

  releaseDecisionUpdateAllowed:
    false;

  executable: false;
}

export interface AutonomousQaVerificationAssessment {
  status:
    AutonomousQaVerificationPlanStatus;

  planCount: number;
  targetTestCount: number;
  awaitingEvidenceCount: number;
  verifiedPlanCount: number;

  plans:
    AutonomousQaVerificationPlan[];
}

export type AutonomousQaChangeImpactStatus =
  | 'available'
  | 'no-targets'
  | 'not-verified';

export type AutonomousQaChangeImpactState =
  | 'potential-impact';

export interface AutonomousQaChangeImpactScope {
  sites: string[];
  projects: string[];

  intelligenceSources:
    IntelligenceSource[];

  qualityDimensions:
    QualityDimension[];

  unifiedDecisionUnitIds:
    string[];

  issueFingerprints:
    string[];

  requirementIds:
    string[];

  criticalFlowIds:
    string[];

  flowScenarioIds:
    string[];
}

export interface AutonomousQaChangeImpactCandidate {
  id: string;
  order: number;

  verificationPlanId: string;
  failureReproductionRecipeId: string;
  executionPlanStepId: string;
  testSelectionCandidateId: string;

  phase:
    AutonomousQaExecutionPhase;

  title: string;
  file: string;

  testIds: string[];

  priority:
    IntelligencePriority | null;

  disposition:
    UnifiedDecisionDisposition | null;

  evidenceState:
    UnifiedDecisionEvidenceState | null;

  riskEligible: boolean;

  confidence:
    number | null;

  state:
    AutonomousQaChangeImpactState;

  scope:
    AutonomousQaChangeImpactScope;

  rationale: string[];
  reviewChecklist: string[];

  changeEvidenceAvailable: false;
  impactConfirmed: false;
  requiresHumanReview: true;

  provenance:
    AutonomousQaEvidenceProvenance;

  releaseDecisionUpdateAllowed:
    false;

  executable: false;
}

export interface AutonomousQaChangeImpactAssessment {
  status:
    AutonomousQaChangeImpactStatus;

  candidateCount: number;
  targetTestCount: number;
  affectedSiteCount: number;
  affectedProjectCount: number;
  confirmedImpactCount: number;

  candidates:
    AutonomousQaChangeImpactCandidate[];
}

export type AutonomousQaQualityDriftStatus =
  | 'available'
  | 'no-baseline'
  | 'not-verified';

export type AutonomousQaQualityDriftDirection =
  | 'potential-regression'
  | 'potential-improvement'
  | 'changed'
  | 'stable';

export type AutonomousQaQualityDriftSignalKind =
  | 'decision-state'
  | 'blocking-units'
  | 'risk-eligible-units'
  | 'verification-gaps'
  | 'issue-fingerprints';

export interface AutonomousQaQualityDriftSignal {
  id: string;

  kind:
    AutonomousQaQualityDriftSignalKind;

  direction:
    AutonomousQaQualityDriftDirection;

  baselineRunId: string;
  baselineFinishedAt: string;

  baselineValue: string;
  currentValue: string;

  addedIds: string[];
  removedIds: string[];

  summary: string;

  confidence:
    number | null;

  historicalEvidenceAvailable: true;
  driftConfirmed: false;
  requiresHumanReview: true;

  provenance:
    AutonomousQaEvidenceProvenance;

  releaseDecisionUpdateAllowed:
    false;

  executable: false;
}

export interface AutonomousQaQualityDriftAssessment {
  status:
    AutonomousQaQualityDriftStatus;

  baselineRunId:
    string | null;

  baselineFinishedAt:
    string | null;

  comparedRunCount: number;

  signalCount: number;
  potentialRegressionCount: number;
  potentialImprovementCount: number;
  changedSignalCount: number;
  stableSignalCount: number;

  trendClaimed: false;
  confirmedDriftCount: number;

  signals:
    AutonomousQaQualityDriftSignal[];
}

export interface AutonomousQaEvidenceProvenance {
  intelligenceSources:
    IntelligenceSource[];

  qualityDimensions:
    QualityDimension[];

  unifiedDecisionUnitIds:
    string[];

  issueFingerprints:
    string[];

  requirementIds:
    string[];

  criticalFlowIds:
    string[];

  flowScenarioIds:
    string[];
}

export interface AutonomousQaActionCandidate {
  id:
    string;

  kind:
    AutonomousQaActionKind;

  state:
    AutonomousQaActionState;

  title:
    string;

  rationale:
    string;

  authority:
    AutonomousQaAuthority;

  executable:
    false;

  confidence:
    number | null;

  provenance:
    AutonomousQaEvidenceProvenance;

  testSelectionCandidateId?:
    string;

  executionPlanStepId?:
    string;

  failureReproductionRecipeId?:
    string;

  verificationPlanId?:
    string;

  changeImpactCandidateId?:
    string;

  qualityDriftSignalId?:
    string;
}

export interface AutonomousQaAssessment {
  authority:
    AutonomousQaAuthority;

  capabilityStatus:
    AutonomousQaCapabilityStatus;

  executionEnabled:
    false;

  releaseDecisionSource:
    ReleaseDecisionSource | null;

  unifiedDecisionState:
    UnifiedDecisionState | null;

  linkedDecisionUnitCount:
    number;

  provenance:
    AutonomousQaEvidenceProvenance;

  candidateActions:
    AutonomousQaActionCandidate[];

  testSelection?:
    AutonomousQaTestSelectionAssessment;

  executionPlan?:
    AutonomousQaExecutionPlanAssessment;

  failureReproduction?:
    AutonomousQaFailureReproductionAssessment;

  verification?:
    AutonomousQaVerificationAssessment;

  changeImpact?:
    AutonomousQaChangeImpactAssessment;

  qualityDrift?:
    AutonomousQaQualityDriftAssessment;

  reason:
    string;
}

export type CrossLayerCorrelationState =
  | 'correlated'
  | 'partial'
  | 'standalone-only'
  | 'no-evidence';


export type CrossLayerRootCauseLayer =
  | 'frontend'
  | 'api'
  | 'backend'
  | 'dependency'
  | 'cross-layer'
  | 'unknown';


export type CrossLayerConfidenceBand =
  | 'high'
  | 'medium'
  | 'low';


export type CrossLayerCorrelationReason =
  | 'origin-fingerprint'
  | 'endpoint'
  | 'service'
  | 'requirement'
  | 'critical-flow'
  | 'route'
  | 'site'
  | 'status-code'
  | 'root-cause-similarity';


export interface CrossLayerEvidenceNode {
  issueFingerprint:
    string;

  originFingerprint?:
    string;

  source:
    IntelligenceSource;

  title:
    string;

  site:
    string;

  endpoint?:
    string;

  service?:
    string;

  statusCode?:
    number;

  rootCause?:
    string;

  confidence?:
    number;

  priority?:
    IntelligencePriority;

  severity?:
    Severity;

  requirementIds:
    string[];

  criticalFlowIds:
    string[];

  flowScenarioIds:
    string[];
}


export interface CrossLayerIncident {
  id:
    string;

  title:
    string;

  sources:
    IntelligenceSource[];

  issueFingerprints:
    string[];

  originFingerprints:
    string[];

  evidenceChain:
    CrossLayerEvidenceNode[];

  correlationScore:
    number;

  confidence:
    number;

  confidenceBand:
    CrossLayerConfidenceBand;

  reasons:
    CrossLayerCorrelationReason[];

  rootCauseLayer:
    CrossLayerRootCauseLayer;

  rootCause?:
    string;

  userImpact?:
    string;

  recommendation?:
    string;

  priority:
    IntelligencePriority;

  severity:
    Severity;

  blocking:
    boolean;

  requirementIds:
    string[];

  criticalFlowIds:
    string[];

  flowScenarioIds:
    string[];

  endpoints:
    string[];

  services:
    string[];

  routes:
    string[];

  sites:
    string[];

  statusCodes:
    number[];
}


export interface CrossLayerAssessment {
  state:
    CrossLayerCorrelationState;

  issueCount:
    number;

  correlatedIssueCount:
    number;

  standaloneIssueCount:
    number;

  incidentCount:
    number;

  blockingIncidents:
    number;

  sourceCoverage:
    IntelligenceSource[];

  incidents:
    CrossLayerIncident[];

  standaloneIssueFingerprints:
    string[];
}


export type ApiBackendStatus =
  | 'healthy'
  | 'degraded'
  | 'poor'
  | 'critical'
  | 'not-verified';


export interface ApiIntelligenceAssessment {
  status: ApiBackendStatus;

  issueCount: number;
  blockingIssues: number;

  endpointCount: number;
  unresolvedEndpointCount: number;

  serverErrors: number;
  authFailures: number;
  notFoundResponses: number;
  timeouts: number;

  affectedEndpoints: string[];

  sourceCoverage:
    IntelligenceSource[];

  originSources:
    IntelligenceSource[];
}


export interface BackendIntelligenceAssessment {
  status: ApiBackendStatus;

  issueCount: number;
  blockingIssues: number;

  serviceCount: number;
  unresolvedServiceCount: number;

  serverErrors: number;
  timeouts: number;

  dependencyFailures: number;
  infrastructureFailures: number;

  affectedServices: string[];

  sourceCoverage:
    IntelligenceSource[];

  originSources:
    IntelligenceSource[];
}


export interface ApiBackendAssessment {
  status: ApiBackendStatus;

  api:
    ApiIntelligenceAssessment;

  backend:
    BackendIntelligenceAssessment;

  promotedApiIssues: number;
  promotedBackendIssues: number;

  sourceCoverage:
    IntelligenceSource[];

  originSources:
    IntelligenceSource[];
}


export type CompatibilityStatus =
  | 'healthy'
  | 'degraded'
  | 'poor'
  | 'critical'
  | 'not-verified';


export type CompatibilityEnvironmentKind =
  | 'browser'
  | 'profile'
  | 'project';


export type CompatibilityCorrelationPattern =
  | 'consistent-pass'
  | 'universal-failure'
  | 'browser-specific'
  | 'profile-specific'
  | 'mobile-specific'
  | 'isolated-environment'
  | 'mixed-regression'
  | 'uncertain'
  | 'not-comparable';


export interface CompatibilityExpectedCoverage {
  browsers?: string[];
  profiles?: string[];
  projects?: string[];
}


export interface CompatibilityEnvironmentAssessment {
  kind:
    CompatibilityEnvironmentKind;

  environment:
    string;

  status:
    CompatibilityStatus;

  evidenceCount:
    number;

  totalTests:
    number;

  passed:
    number;

  compatibilityFailures:
    number;

  uncertainFailures:
    number;

  issueCount:
    number;

  evidenceSources:
    IntelligenceSource[];
}


export interface CompatibilityCorrelation {
  key:
    string;

  title:
    string;

  file:
    string;

  site:
    string;

  status:
    CompatibilityStatus;

  pattern:
    CompatibilityCorrelationPattern;

  totalEnvironments:
    number;

  passingEnvironments:
    string[];

  failingEnvironments:
    string[];

  uncertainEnvironments:
    string[];

  browsers:
    string[];

  profiles:
    string[];
}


export interface CompatibilityAssessment {
  status:
    CompatibilityStatus;

  evidenceCount:
    number;

  comparableTests:
    number;

  regressions:
    number;

  browserAssessments:
    CompatibilityEnvironmentAssessment[];

  profileAssessments:
    CompatibilityEnvironmentAssessment[];

  projectAssessments:
    CompatibilityEnvironmentAssessment[];

  correlations:
    CompatibilityCorrelation[];

  sourceCoverage:
    IntelligenceSource[];

  missingBrowsers:
    string[];

  missingProfiles:
    string[];

  missingProjects:
    string[];
}


export type SecurityPerformanceStatus =
  | 'healthy'
  | 'degraded'
  | 'poor'
  | 'critical'
  | 'not-verified';


export type SecurityArea =
  | 'authentication'
  | 'authorization'
  | 'content-security-policy'
  | 'security-headers'
  | 'session-cookies'
  | 'data-exposure'
  | 'transport'
  | 'dependency-security';


export type PerformanceArea =
  | 'test-duration'
  | 'page-load'
  | 'api-latency'
  | 'backend-latency'
  | 'timeout-resilience'
  | 'regression';


export interface SecurityAreaAssessment {
  area:
    SecurityArea;

  status:
    SecurityPerformanceStatus;

  evidenceCount:
    number;

  issueCount:
    number;

  critical:
    number;

  high:
    number;

  medium:
    number;

  low:
    number;

  evidenceSources:
    IntelligenceSource[];
}


export interface SecurityAssessment {
  status:
    SecurityPerformanceStatus;

  evidenceCount:
    number;

  issueCount:
    number;

  verifiedAreas:
    SecurityArea[];

  unverifiedAreas:
    SecurityArea[];

  areas:
    SecurityAreaAssessment[];

  sourceCoverage:
    IntelligenceSource[];
}


export interface PerformanceObservedMetrics {
  totalDuration?:
    number;

  wallClockDuration?:
    number;

  averageDuration?:
    number;

  medianDuration?:
    number;

  p95Duration?:
    number;
}


export interface PerformanceAreaAssessment {
  area:
    PerformanceArea;

  status:
    SecurityPerformanceStatus;

  evidenceCount:
    number;

  issueCount:
    number;

  observedValueMs?:
    number;

  thresholdMs?:
    number;

  thresholdConfigured:
    boolean;

  evidenceSources:
    IntelligenceSource[];
}


export interface PerformanceAssessment {
  status:
    SecurityPerformanceStatus;

  evidenceCount:
    number;

  issueCount:
    number;

  thresholdsConfigured:
    boolean;

  observed:
    PerformanceObservedMetrics;

  verifiedAreas:
    PerformanceArea[];

  unverifiedAreas:
    PerformanceArea[];

  areas:
    PerformanceAreaAssessment[];

  sourceCoverage:
    IntelligenceSource[];
}


export interface SecurityPerformanceAssessment {
  status:
    SecurityPerformanceStatus;

  security:
    SecurityAssessment;

  performance:
    PerformanceAssessment;

  sourceCoverage:
    IntelligenceSource[];
}


export interface QualityDimensionStats {
  dimension:
    QualityDimension;

  issueCount: number;

  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;

  sourceCounts:
    Partial<
      Record<
        IntelligenceSource,
        number
      >
    >;
}

export type QualityDimensionStatistics =
  Record<
    QualityDimension,
    QualityDimensionStats
  >;


export type AttachmentKind =
  | 'screenshot'
  | 'video'
  | 'trace'
  | 'log'
  | 'other';

export type ReleaseReadiness =
  | 'ready'
  | 'ready-with-warnings'
  | 'not-ready'
  | 'not-verified';

export type ReleaseDecisionSource =
  | 'legacy-v4'
  | 'unified-v5';


export type RiskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface DashboardAnnotation {
  type: string;
  description?: string;
}

export interface DashboardError {
  message?: string;
  stack?: string;
  snippet?: string;
}

export interface DashboardAttachment {
  name: string;
  contentType: string;
  path?: string;
  kind?: AttachmentKind;
}

export interface DashboardTestResult {
  id: string;
  title: string;
  fullTitle: string;

  file: string;
  line: number;
  column: number;

  project: string;
  site: string;
  browserFamily: string;
  profile: string;

  status: string;
  expectedStatus: string;

  duration: number;
  retry: number;

  severity: Severity;
  category: Category;
  vitalRank: number;

  qualityDimensions?:
    QualityDimension[];

  requirementIds?:
    string[];

  acceptanceCriteriaIds?:
    string[];

  criticalFlow?:
    string;

  criticalFlowIds?:
    string[];

  flowScenarioIds?:
    string[];
  tags: string[];
  annotations: DashboardAnnotation[];

  error?: DashboardError;
  attachments: DashboardAttachment[];

  startedAt?: string;

  classification?: IssueClassification;
  classificationReason?: string;
  recommendation?: string;

  rootCause?: string;
  confidence?: number;
  estimatedFixMinutes?: number;
  userImpact?: string;
}

export interface ApiIntelligenceIssue {
  source: 'api';

  fingerprint: string;

  title: string;
  site: string;

  category: Category;
  severity: Severity;

  classification?:
    IssueClassification;

  qualityDimensions:
    QualityDimension[];

  priority:
    IntelligencePriority;

  priorityScore?: number;

  endpoint: string;
  method?: string;

  expectedStatus?:
    number | string;

  statusCode?: number;

  latencyMs?: number;

  occurrences: number;

  affectedEndpoints?:
    string[];

  requirementIds?:
    string[];

  acceptanceCriteriaIds?:
    string[];

  evidence?: string;

  rootCause?: string;
  userImpact?: string;
  recommendation?: string;

  confidence?: number;

  criticalFlowIds?:
    string[];

  flowScenarioIds?:
    string[];

  originSource?: IntelligenceSource;
  originFingerprint?: string;
  endpointResolved?: boolean;
}

export interface BackendIntelligenceIssue {
  source: 'backend';

  fingerprint: string;

  title: string;
  site: string;

  category: Category;
  severity: Severity;

  classification?:
    IssueClassification;

  qualityDimensions:
    QualityDimension[];

  priority:
    IntelligencePriority;

  priorityScore?: number;

  service?: string;
  operation?: string;
  dependency?: string;

  occurrences: number;

  affectedServices?:
    string[];

  affectedEndpoints?:
    string[];

  requirementIds?:
    string[];

  acceptanceCriteriaIds?:
    string[];

  evidence?: string;

  rootCause?: string;
  userImpact?: string;
  recommendation?: string;

  confidence?: number;

  criticalFlowIds?:
    string[];

  flowScenarioIds?:
    string[];

  originSource?: IntelligenceSource;
  originFingerprint?: string;
  statusCode?: number;
  latencyMs?: number;
  serviceResolved?: boolean;
  infrastructureSignal?: boolean;
}


export interface PerformanceTestSummary {
  id?: string;
  title: string;
  duration: number;
  project: string;
  file?: string;
}

export interface PerformanceStats {
  totalDuration: number;
  wallClockDuration: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;

  fastestTest?: PerformanceTestSummary;
  slowestTest?: PerformanceTestSummary;

  slowestTests?: PerformanceTestSummary[];
}

export interface BrowserStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;

  averageDuration: number;
  health: number;
}

export interface CategoryStats {
  total: number;
  passed: number;
  failed: number;

  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  none?: number;

  health: number;
}

export type BrowserStatistics =
  Record<string, BrowserStats>;

export type CategoryStatistics =
  Record<string, CategoryStats>;

export interface ClassificationSummary {
  productBugs: number;
  contentBugs: number;
  automationIssues: number;
  accessibilityIssues: number;
  performanceIssues: number;
  securityIssues: number;
  needsInvestigation: number;
  warnings: number;
}

export interface ReleaseAssessment {
  status: ReleaseReadiness;
  risk: RiskLevel;
  confidence: number;

  blockingIssues: number;
  nonBlockingIssues: number;

  blockingRequirements?:
    number;

  requirementGaps?:
    number;

  blockingFlows?:
    number;

  flowGaps?:
    number;


  verdict: string;
  recommendedAction: string;

  blockingUxAreas?: number;
  uxUiGaps?: number;

  blockingSecurityAreas?: number;
  blockingPerformanceAreas?: number;
  securityGaps?: number;
  performanceGaps?: number;

  blockingCompatibilityRegressions?: number;
  compatibilityGaps?: number;

  blockingApiIssues?: number;
  blockingBackendIssues?: number;
  apiIntelligenceGaps?: number;
  backendIntelligenceGaps?: number;
}

export interface RunMetadata {
  build?: string;
  branch?: string;
  commit?: string;
  runNumber?: string;
}

export interface DashboardRun {
  schemaVersion: number;
  runId: string;

  environment: 'local' | 'CI';
  baseURL?: string;

  startedAt: string;
  finishedAt: string;

  status: string;
  totalTests: number;

  health: number;

  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  flaky: number;

  warnings: number;

  criticalBugs: number;
  highBugs: number;
  mediumBugs: number;
  lowBugs: number;

  performance: PerformanceStats;

  browserStatistics: BrowserStatistics;
  categoryStatistics: CategoryStatistics;
  profileStatistics: BrowserStatistics;
  
  siteStatistics?: Record<string, {
  site: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  flaky: number;
  warnings: number;
  averageDuration: number;
  health: number;
}>;

  classificationSummary?: ClassificationSummary;
releaseAssessment?: ReleaseAssessment;

legacyReleaseAssessment?:
  ReleaseAssessment;

releaseDecisionSource?:
  ReleaseDecisionSource;


metadata?: RunMetadata;

qualityDimensionStatistics?:
  QualityDimensionStatistics;

  uxUiAssessment?:
    UxUiAssessment;


  requirements?:
    RequirementDefinition[];

requirementCoverage?:
  RequirementCoverage[];

  criticalFlows?:
    CriticalFlowDefinition[];

  criticalFlowCoverage?:
    CriticalFlowCoverage[];


apiIssues?:
  ApiIntelligenceIssue[];

backendIssues?:
  BackendIntelligenceIssue[];
prioritizedIssues: DashboardTestResult[];

discoveryIssues:
  DashboardDiscoveryIssue[];

tests: DashboardTestResult[];

  securityPerformanceAssessment?:
    SecurityPerformanceAssessment;


  compatibilityAssessment?:
    CompatibilityAssessment;


  apiBackendAssessment?:
    ApiBackendAssessment;


  crossLayerAssessment?:
    CrossLayerAssessment;


  unifiedDecisionAssessment?:
    UnifiedDecisionAssessment;

  autonomousQaAssessment?:
    AutonomousQaAssessment;

}