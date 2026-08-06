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

export type AttachmentKind =
  | 'screenshot'
  | 'video'
  | 'trace'
  | 'log'
  | 'other';

export type ReleaseReadiness =
  | 'ready'
  | 'ready-with-warnings'
  | 'not-ready';

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
  browserFamily: string;

  status: string;
  expectedStatus: string;

  duration: number;
  retry: number;

  severity: Severity;
  category: Category;
  vitalRank: number;

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

  verdict: string;
  recommendedAction: string;
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

  classificationSummary?: ClassificationSummary;
  releaseAssessment?: ReleaseAssessment;
  metadata?: RunMetadata;

  prioritizedIssues: DashboardTestResult[];
  tests: DashboardTestResult[];
}