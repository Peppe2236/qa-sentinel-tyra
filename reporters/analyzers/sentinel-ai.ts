import type {
  ClassificationSummary,
  DashboardRun,
  DashboardTestResult,
  ReleaseAssessment,
  RiskLevel,
  Severity,
} from '../models/types';

export type SentinelPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

export interface SentinelAiFinding {
  id: string;
  title: string;

  priority: SentinelPriority;
  confidence: number;

  likelyRootCause: string;
  userImpact: string;
  recommendation: string;
  nextAction: string;

  relatedTests: string[];
  relatedFiles: string[];

  classification?: string;
  severity?: Severity;
}

export interface SentinelAiSignals {
  productBugs: number;
  contentBugs: number;
  automationIssues: number;
  accessibilityIssues: number;
  performanceIssues: number;
  securityIssues: number;
  needsInvestigation: number;
  warnings: number;

  failedTests: number;
  flakyTests: number;
  timedOutTests: number;
  interruptedTests: number;

  p95Duration: number;
  averageDuration: number;

  blockingIssues: number;
  nonBlockingIssues: number;
}

export interface SentinelAiLlm {
  status: 'off-no-key' | 'key-present' | 'enriched' | 'error';
  label: string;
  engine: 'heuristic' | 'openai';
}

export interface SentinelAiSummary {
  generatedAt: string;

  health: number;

  overallPriority: SentinelPriority;
  releaseRisk: RiskLevel;

  confidence: number;

  summary: string;

  likelyRootCause: string;
  userImpact: string;

  recommendation: string;
  nextAction: string;

  findings: SentinelAiFinding[];

  signals: SentinelAiSignals;

  llm?: SentinelAiLlm;
}

const PRIORITY_WEIGHT: Record<
  SentinelPriority,
  number
> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export class SentinelAI {
  analyze(
    run: DashboardRun
  ): SentinelAiSummary {
    const counts =
      this.classificationCounts(run);

    const releaseRisk =
      this.releaseRiskFromRun(run);

    const sourceIssues =
      this.getSourceIssues(run);

    const findings =
      sourceIssues
        .map(issue =>
          this.buildFinding(issue)
        )
        .sort(
          (first, second) =>
            PRIORITY_WEIGHT[
              second.priority
            ] -
            PRIORITY_WEIGHT[
              first.priority
            ]
        );

    const primary =
      this.topFinding(findings);

    const confidence =
      this.calculateOverallConfidence(
        findings,
        run.releaseAssessment
      );

    return {
      generatedAt:
        new Date().toISOString(),

      health:
        run.health,

      overallPriority:
        this.overallPriority(
          findings,
          releaseRisk
        ),

      releaseRisk,

      confidence,

      summary:
        this.buildSummary(
          run,
          counts,
          releaseRisk
        ),

      likelyRootCause:
        primary?.likelyRootCause ??
        'No dominant failure pattern was detected in the current run.',

      userImpact:
        primary?.userImpact ??
        'No confirmed user-impacting issue was identified.',

      recommendation:
        run.releaseAssessment
          ?.recommendedAction ??
        primary?.recommendation ??
        'Continue monitoring quality trends and investigate new failures.',

      nextAction:
        primary?.nextAction ??
        run.releaseAssessment
          ?.recommendedAction ??
        'No immediate corrective action is required.',

      findings,

      signals:
        this.buildSignals(
          run,
          counts
        ),
    };
  }

  summarize(
    run: DashboardRun
  ): string {
    const result =
      this.analyze(run);

    return result.summary;
  }

  detectPatterns(
    run: DashboardRun
  ): SentinelAiFinding[] {
    return this.getSourceIssues(run)
      .map(issue =>
        this.buildFinding(issue)
      )
      .sort(
        (first, second) =>
          PRIORITY_WEIGHT[
            second.priority
          ] -
          PRIORITY_WEIGHT[
            first.priority
          ]
      );
  }

  recommend(
    run: DashboardRun
  ): string {
    return (
      this.analyze(run)
        .recommendation
    );
  }

  predictRisk(
    run: DashboardRun
  ): RiskLevel {
    return this.releaseRiskFromRun(
      run
    );
  }

  private clamp(
    value: number,
    minimum = 0,
    maximum = 100
  ): number {
    return Math.max(
      minimum,
      Math.min(
        maximum,
        Number(value) || 0
      )
    );
  }

  private unique(
    values: Array<
      string | undefined
    >
  ): string[] {
    return [
      ...new Set(
        values.filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
      ),
    ];
  }

  private severityWeight(
    severity?: Severity
  ): number {
    switch (severity) {
      case 'critical':
        return 100;

      case 'high':
        return 80;

      case 'medium':
        return 60;

      case 'low':
        return 40;

      case 'info':
        return 20;

      default:
        return 0;
    }
  }

  private priorityFromScore(
    score: number
  ): SentinelPriority {
    if (score >= 90) {
      return 'critical';
    }

    if (score >= 70) {
      return 'high';
    }

    if (score >= 40) {
      return 'medium';
    }

    return 'low';
  }

  private getSourceIssues(
    run: DashboardRun
  ): DashboardTestResult[] {
    if (
      run.prioritizedIssues
        ?.length
    ) {
      return run.prioritizedIssues;
    }

    return run.tests.filter(
      test =>
        Boolean(
          test.classification
        ) &&
        test.classification !==
          'none'
    );
  }

  private releaseRiskFromRun(
    run: DashboardRun
  ): RiskLevel {
    return (
      run.releaseAssessment
        ?.risk ??
      this.inferRiskFromRun(
        run
      )
    );
  }

  private inferRiskFromRun(
    run: DashboardRun
  ): RiskLevel {
    const summary =
      run.classificationSummary;

    const productBugs =
      summary?.productBugs ?? 0;

    const securityIssues =
      summary?.securityIssues ??
      0;

    if (
      securityIssues > 0 ||
      run.criticalBugs > 0
    ) {
      return 'critical';
    }

    if (
      productBugs > 1 ||
      run.highBugs > 0 ||
      run.failed >= 5
    ) {
      return 'high';
    }

    if (
      productBugs > 0 ||
      run.failed > 0 ||
      run.warnings > 0
    ) {
      return 'medium';
    }

    return 'low';
  }

  private classificationCounts(
    run: DashboardRun
  ): ClassificationSummary {
    if (
      run.classificationSummary
    ) {
      return (
        run.classificationSummary
      );
    }

    const summary: ClassificationSummary =
      {
        productBugs: 0,
        contentBugs: 0,
        automationIssues: 0,
        accessibilityIssues: 0,
        performanceIssues: 0,
        securityIssues: 0,
        needsInvestigation: 0,
        warnings: 0,
      };

    for (
      const test of
      run.tests ?? []
    ) {
      switch (
        test.classification
      ) {
        case 'product-bug':
          summary.productBugs +=
            1;
          break;

        case 'content-bug':
          summary.contentBugs +=
            1;
          break;

        case 'automation-issue':
          summary.automationIssues +=
            1;
          break;

        case 'accessibility-issue':
          summary.accessibilityIssues +=
            1;
          break;

        case 'performance-issue':
          summary.performanceIssues +=
            1;
          break;

        case 'security-issue':
          summary.securityIssues +=
            1;
          break;

        case 'needs-investigation':
          summary.needsInvestigation +=
            1;
          break;

        case 'warning':
          summary.warnings +=
            1;
          break;
      }
    }

    return summary;
  }

  private issueScore(
    issue: DashboardTestResult
  ): number {
    let score =
      this.severityWeight(
        issue.severity
      );

    switch (
      issue.classification
    ) {
      case 'security-issue':
        score += 35;
        break;

      case 'product-bug':
        score += 30;
        break;

      case 'needs-investigation':
        score += 20;
        break;

      case 'performance-issue':
        score += 18;
        break;

      case 'accessibility-issue':
        score += 16;
        break;

      case 'automation-issue':
        score += 12;
        break;

      case 'content-bug':
        score += 10;
        break;

      case 'warning':
        score += 5;
        break;
    }

    if (
      issue.status !==
      issue.expectedStatus
    ) {
      score += 10;
    }

    if (
      (issue.retry ?? 0) > 0
    ) {
      score += 8;
    }

    if (
      (issue.duration ?? 0) >
      5000
    ) {
      score += 8;
    }

    return this.clamp(
      score
    );
  }

  private buildFinding(
    issue: DashboardTestResult
  ): SentinelAiFinding {
    const score =
      this.issueScore(issue);

    const confidence =
      this.clamp(
        issue.confidence ??
          (
            issue.classification ===
            'needs-investigation'
              ? 55
              : 82
          )
      );

    const recommendation =
      this.inferRecommendation(
        issue
      );

    return {
      id: issue.id,

      title:
        issue.fullTitle ||
        issue.title,

      priority:
        this.priorityFromScore(
          score
        ),

      confidence,

      likelyRootCause:
        this.inferRootCause(
          issue
        ),

      userImpact:
        this.inferUserImpact(
          issue
        ),

      recommendation,

      nextAction:
        recommendation,

      relatedTests:
        this.unique([
          issue.fullTitle,
          issue.title,
        ]),

      relatedFiles:
        this.unique([
          issue.file,
        ]),

      classification:
        issue.classification,

      severity:
        issue.severity,
    };
  }

  private topFinding(
    findings:
      SentinelAiFinding[]
  ):
    | SentinelAiFinding
    | undefined {
    return [...findings]
      .sort(
        (first, second) => {
          const difference =
            PRIORITY_WEIGHT[
              second.priority
            ] -
            PRIORITY_WEIGHT[
              first.priority
            ];

          if (
            difference !== 0
          ) {
            return difference;
          }

          return (
            second.confidence -
            first.confidence
          );
        }
      )[0];
  }

  private calculateOverallConfidence(
    findings:
      SentinelAiFinding[],
    releaseAssessment?:
      ReleaseAssessment
  ): number {
    if (
      findings.length === 0
    ) {
      return (
        releaseAssessment
          ?.confidence ??
        95
      );
    }

    const average =
      findings.reduce(
        (
          sum,
          finding
        ) =>
          sum +
          finding.confidence,
        0
      ) /
      findings.length;

    const releaseConfidence =
      releaseAssessment
        ?.confidence;

    if (
      releaseConfidence == null
    ) {
      return this.clamp(
        Math.round(
          average
        )
      );
    }

    return this.clamp(
      Math.round(
        average * 0.7 +
        releaseConfidence *
          0.3
      )
    );
  }

  private overallPriority(
    findings:
      SentinelAiFinding[],
    risk: RiskLevel
  ): SentinelPriority {
    if (
      risk === 'critical'
    ) {
      return 'critical';
    }

    if (
      risk === 'high'
    ) {
      return 'high';
    }

    const best =
      this.topFinding(
        findings
      );

    if (best) {
      return best.priority;
    }

    return risk === 'medium'
      ? 'medium'
      : 'low';
  }

  private inferRootCause(
    issue: DashboardTestResult
  ): string {
    if (issue.rootCause) {
      return issue.rootCause;
    }

    if (
      issue.classificationReason
    ) {
      return (
        issue.classificationReason
      );
    }

    switch (
      issue.classification
    ) {
      case 'product-bug':
        return (
          'The observed application behaviour differs from the expected functional flow.'
        );

      case 'content-bug':
        return (
          'Visible content or presentation differs from the expected product state.'
        );

      case 'automation-issue':
        return (
          'The failure is likely caused by test automation, timing, selector stability, or environment behaviour rather than a confirmed product defect.'
        );

      case 'accessibility-issue':
        return (
          'The tested interface appears to violate an accessibility expectation or semantic interaction requirement.'
        );

      case 'performance-issue':
        return (
          'The affected flow is slower than the expected performance threshold.'
        );

      case 'security-issue':
        return (
          'The tested behaviour indicates a potential security-sensitive failure that requires immediate review.'
        );

      case 'needs-investigation':
        return (
          'The available test evidence is insufficient to confidently classify the underlying cause.'
        );

      case 'warning':
        return (
          'The test completed with a non-blocking condition that deserves review.'
        );

      default:
        return (
          'The available evidence does not identify a single dominant root cause.'
        );
    }
  }

  private inferUserImpact(
    issue: DashboardTestResult
  ): string {
    if (
      issue.userImpact
    ) {
      return issue.userImpact;
    }

    switch (
      issue.classification
    ) {
      case 'product-bug':
        return (
          'Users may be unable to complete the affected workflow or may receive incorrect application behaviour.'
        );

      case 'content-bug':
        return (
          'Users may see incorrect, missing, or misleading content.'
        );

      case 'automation-issue':
        return (
          'Direct user impact is not confirmed, but unreliable automation can reduce release confidence.'
        );

      case 'accessibility-issue':
        return (
          'Users relying on assistive technologies may have difficulty completing the affected interaction.'
        );

      case 'performance-issue':
        return (
          'Users may experience increased latency or a slower interaction.'
        );

      case 'security-issue':
        return (
          'The issue may affect confidentiality, integrity, access control, or another security-sensitive behaviour.'
        );

      case 'needs-investigation':
        return (
          'User impact cannot yet be determined with sufficient confidence.'
        );

      case 'warning':
        return (
          'The current finding appears non-blocking but may indicate degraded quality.'
        );

      default:
        return (
          'No confirmed user impact was identified.'
        );
    }
  }

  private inferRecommendation(
    issue: DashboardTestResult
  ): string {
    if (
      issue.recommendation
    ) {
      return (
        issue.recommendation
      );
    }

    switch (
      issue.classification
    ) {
      case 'product-bug':
        return (
          'Review the affected application flow, reproduce the behaviour manually, and correct the underlying product logic before release.'
        );

      case 'content-bug':
        return (
          'Review the expected copy or visual state and correct the affected content.'
        );

      case 'automation-issue':
        return (
          'Review selectors, waits, timing assumptions, fixtures, and environment dependencies before treating this as a product regression.'
        );

      case 'accessibility-issue':
        return (
          'Review semantic markup, keyboard interaction, labels, roles, and focus behaviour.'
        );

      case 'performance-issue':
        return (
          'Profile the affected flow and investigate slow network requests, rendering work, or application logic.'
        );

      case 'security-issue':
        return (
          'Escalate for security review and avoid release until the finding has been assessed.'
        );

      case 'needs-investigation':
        return (
          'Collect additional traces, screenshots, logs, and reproduction evidence before assigning a final classification.'
        );

      case 'warning':
        return (
          'Review the warning and confirm that it is acceptable for the target release.'
        );

      default:
        return (
          'Review the test evidence and confirm expected behaviour.'
        );
    }
  }

  private buildSummary(
    run: DashboardRun,
    counts:
      ClassificationSummary,
    risk: RiskLevel
  ): string {
    const parts: string[] =
      [];

    parts.push(
      `${run.passed} of ${run.totalTests} tests passed (test pass rate ${run.health}%). This is not a release GO by itself.`
    );

    const release =
      run.releaseAssessment;

    if (
      release?.status
    ) {
      parts.push(
        `Canonical release state is ${String(
          release.status
        ).replaceAll('-', ' ')} with ${String(
          release.risk ?? 'unknown'
        )} risk.`
      );
    }

    const discoveryCount =
      run.discoveryIssues?.length ??
      0;

    if (
      discoveryCount > 0
    ) {
      parts.push(
        `${discoveryCount} discovery finding${
          discoveryCount === 1
            ? ''
            : 's'
        } remain for review.`
      );
    }

    const gaps =
      run.unifiedDecisionAssessment
        ?.verificationGapDimensions ??
      [];

    if (
      gaps.length > 0
    ) {
      parts.push(
        `Verification is incomplete for: ${gaps.join(', ')}.`
      );
    }

    if (
      counts.productBugs > 0
    ) {
      parts.push(
        `${counts.productBugs} confirmed product bug${
          counts.productBugs ===
          1
            ? ''
            : 's'
        } were detected.`
      );
    }

    if (
      counts.securityIssues >
      0
    ) {
      parts.push(
        `${counts.securityIssues} security-sensitive finding${
          counts.securityIssues ===
          1
            ? ''
            : 's'
        } require immediate review.`
      );
    }

    if (
      counts.automationIssues >
      0
    ) {
      parts.push(
        `${counts.automationIssues} automation issue${
          counts.automationIssues ===
          1
            ? ''
            : 's'
        } reduce test reliability.`
      );
    }

    if (
      run.performance
        .p95Duration > 5000
    ) {
      parts.push(
        `P95 test duration is ${Math.round(
          run.performance
            .p95Duration
        )} ms, indicating slower execution paths worth reviewing.`
      );
    }

    parts.push(
      `Overall release risk is ${risk.toUpperCase()}.`
    );

    return parts.join(' ');
  }

  private buildSignals(
    run: DashboardRun,
    counts:
      ClassificationSummary
  ): SentinelAiSignals {
    const release =
      run.releaseAssessment;

    return {
      productBugs:
        counts.productBugs,

      contentBugs:
        counts.contentBugs,

      automationIssues:
        counts.automationIssues,

      accessibilityIssues:
        counts.accessibilityIssues,

      performanceIssues:
        counts.performanceIssues,

      securityIssues:
        counts.securityIssues,

      needsInvestigation:
        counts.needsInvestigation,

      warnings:
        counts.warnings,

      failedTests:
        run.failed,

      flakyTests:
        run.flaky,

      timedOutTests:
        run.timedOut,

      interruptedTests:
        run.interrupted,

      p95Duration:
        run.performance
          .p95Duration,

      averageDuration:
        run.performance
          .averageDuration,

      blockingIssues:
        release
          ?.blockingIssues ??
        0,

      nonBlockingIssues:
        release
          ?.nonBlockingIssues ??
        0,
    };
  }
}

export const sentinelAI =
  new SentinelAI();

export function analyzeSentinelAi(
  run: DashboardRun
): SentinelAiSummary {
  return sentinelAI.analyze(
    run
  );
}

export default sentinelAI;