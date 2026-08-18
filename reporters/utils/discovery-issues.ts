import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type {
  ApiBackendEvidence,
  DiscoveryEvidenceOrigin,
  IssueClassification,
  QualityDimension,
} from '../models/types';

import {
  classifyFailedNetworkSignal,
  isAnalyticsOrTelemetryIssue,
} from './signal-classification';

import {
  qualityDimensionsForCategory,
} from '../analyzers/sentinel-quality-intelligence';



export type DiscoveryPriority =
  | 'P0'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4';


export interface DashboardDiscoveryIssue {
  source: 'discovery';

  site: string;
  route: string;

  category: string;
  severity: string;

  qualityDimensions?:
    QualityDimension[];

  requirementIds?:
    string[];

  acceptanceCriteriaIds?:
    string[];
  title: string;
  description: string;
  evidence?: string;

  userImpact: string;
  recommendation: string;

  classification?:
    IssueClassification;

  annotation?: string;

  requestedUrl?: string;

  priorityScore: number;
  priority: DiscoveryPriority;

  occurrences: number;
  affectedRoutes: string[];

  fingerprint: string;

  criticalFlowIds?:
    string[];

  flowScenarioIds?:
    string[];

  evidenceOrigin?:
    DiscoveryEvidenceOrigin;

  sourceArtifact?: string;
  observedAt?: string;
}


interface DiscoveryReport {
  generatedAt?: string;

  prioritizedFindings?:
    DashboardDiscoveryIssue[];

  apiBackendEvidence?:
    ApiBackendEvidence[];
}


interface SmartScanFinding {
  severity?: string;
  category?: string;
  code?: string;
  title?: string;
  message?: string;
  userImpact?: boolean;
}


interface SmartScanPage {
  url?: string;
  finalUrl?: string;
  pathname?: string;
  status?: number;
  healthStatus?: string;
  findings?: SmartScanFinding[];
}


interface SmartScanReport {
  siteId?: string;
  origin?: string;
  scannedAt?: string;
  coverageLimited?: boolean;
  remainingQueue?: number;
  pages?: SmartScanPage[];
}


function sourceArtifact(
  filePath: string
): string {
  return path
    .relative(
      process.cwd(),
      filePath
    )
    .split(path.sep)
    .join('/');
}


function sanitizedEvidenceUrl(
  value: string | undefined
): string | null {
  if (!value) {
    return null;
  }

  try {
    const url =
      new URL(value);

    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';

    return url.toString();
  } catch {
    return null;
  }
}


function smartScanSeverity(
  value: string | undefined
): string {
  switch (
    String(value ?? '')
      .toLowerCase()
  ) {
    case 'critical':
      return 'critical';

    case 'error':
      return 'high';

    case 'warning':
      return 'medium';

    default:
      return 'info';
  }
}


function smartScanPriority(
  value: string | undefined
): DiscoveryPriority {
  switch (
    String(value ?? '')
      .toLowerCase()
  ) {
    case 'critical':
      return 'P0';

    case 'error':
      return 'P1';

    case 'warning':
      return 'P3';

    default:
      return 'P4';
  }
}


function smartScanPriorityScore(
  value: string | undefined
): number {
  switch (
    String(value ?? '')
      .toLowerCase()
  ) {
    case 'critical':
      return 100;

    case 'error':
      return 85;

    case 'warning':
      return 45;

    default:
      return 10;
  }
}


function smartScanFingerprint(
  value: string
): string {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .slice(0, 16);
}


function readSmartScanFile(
  filePath: string,
  expectedSite: string,
  expectedOrigin: string
): DashboardDiscoveryIssue[] {
  if (
    !fs.existsSync(
      filePath
    )
  ) {
    return [];
  }

  try {
    const report =
      JSON.parse(
        fs.readFileSync(
          filePath,
          'utf8'
        )
      ) as SmartScanReport;

    if (
      report.siteId !== expectedSite ||
      report.origin !== expectedOrigin
    ) {
      return [];
    }

    const artifact =
      sourceArtifact(filePath);
    const observedAt =
      report.scannedAt;

    if (
      !observedAt ||
      Number.isNaN(
        Date.parse(observedAt)
      )
    ) {
      return [];
    }

    const issues =
      new Map<
        string,
        DashboardDiscoveryIssue
      >();

    if (report.coverageLimited) {
      const title =
        'Smart Scan coverage was limited';
      const fingerprint =
        smartScanFingerprint([
          'smart-scan',
          expectedSite,
          'SMART_SCAN_COVERAGE_LIMITED',
        ].join('|'));

      issues.set(
        fingerprint,
        {
          source:
            'discovery',
          site:
            expectedSite,
          route:
            '/',
          category:
            'coverage',
          severity:
            'medium',
          qualityDimensions:
            qualityDimensionsForCategory(
              'coverage'
            ),
          title,
          description:
            'Smart Scan stopped at its configured page limit before the discovery queue was empty.',
          evidence:
            `SMART_SCAN_COVERAGE_LIMITED; remaining queue: ${report.remainingQueue ?? 'unknown'}`,
          userImpact:
            'Unscanned routes remain unverified; no defect is inferred from the gap alone.',
          recommendation:
            'Increase the scan page limit or narrow the target scope, then rerun Smart Scan before release review.',
          priorityScore:
            60,
          priority:
            'P2',
          occurrences:
            1,
          affectedRoutes:
            [],
          fingerprint,
          evidenceOrigin:
            'smart-scan',
          sourceArtifact:
            artifact,
          observedAt,
        }
      );
    }

    for (
      const page
      of report.pages ?? []
    ) {
      const safeUrl =
        sanitizedEvidenceUrl(
          page.finalUrl ??
          page.url
        );
      const route =
        page.pathname ??
        (
          safeUrl
            ? new URL(safeUrl).pathname
            : '/'
        );

      for (
        const finding
        of page.findings ?? []
      ) {
        const rawSeverity =
          String(
            finding.severity ??
            'info'
          ).toLowerCase();

        if (rawSeverity === 'info') {
          continue;
        }

        const code =
          finding.code ??
          'SMART_SCAN_FINDING';
        const title =
          finding.title ??
          'Smart Scan finding';
        const classified =
          classifyFailedNetworkSignal({
            code,
            category:
              finding.category,
            title,
            message:
              finding.message,
            url:
              safeUrl ??
              route,
            pageUrl:
              safeUrl ??
              undefined,
            pageRoute:
              route,
            pageStatus:
              page.status,
            evidence:
              finding.message ??
              `${code} at ${safeUrl ?? route}`,
          });

        if (
          classified.action ===
            'ignore' ||
          classified.severity ===
            'info'
        ) {
          continue;
        }

        const key = [
          'smart-scan',
          expectedSite,
          classified.kind,
          classified.category,
          classified.kind ===
            'product-network'
            ? (
                classified.requestedUrl ??
                code
              )
            : code,
          classified.title,
        ].join('|');
        const fingerprint =
          smartScanFingerprint(key);
        const existing =
          issues.get(fingerprint);

        if (existing) {
          existing.occurrences += 1;

          if (
            !existing.affectedRoutes
              .includes(route)
          ) {
            existing.affectedRoutes.push(
              route
            );
          }

          continue;
        }

        issues.set(
          fingerprint,
          {
            source:
              'discovery',
            site:
              expectedSite,
            route,
            category:
              classified.category ||
              finding.category ||
              'other',
            severity:
              classified.severity,
            classification:
              classified.classification,
            annotation:
              classified.annotation,
            requestedUrl:
              classified.requestedUrl,
            qualityDimensions:
              qualityDimensionsForCategory(
                classified.category ||
                finding.category ||
                'other'
              ),
            title:
              classified.title ||
              title,
            description:
              classified.annotation ||
              `${title} was recorded by Smart Scan.`,
            evidence:
              finding.message ??
              `${code} at ${safeUrl ?? route}`,
            userImpact:
              classified.userImpact
                ? classified.annotation ||
                  'The finding may affect a user-visible route or interaction.'
                : classified.annotation ||
                  'No direct user impact is confirmed; human review is still required.',
            recommendation:
              classified.kind ===
                'analytics-csp'
                ? 'Align Content Security Policy connect-src/script-src with the analytics domains actually used, or remove the unused integration. This is not a product-flow failure.'
                : classified.kind ===
                    'product-network'
                  ? 'Inspect the failed request URL, status and the page route below, then rerun the scan and affected route tests.'
                  : 'Review whether the warning is expected, document the decision and rerun Smart Scan after changes.',
            priorityScore:
              classified.severity ===
                'high' ||
              classified.severity ===
                'critical'
                ? smartScanPriorityScore(
                    'error'
                  )
                : classified.severity ===
                    'medium'
                  ? smartScanPriorityScore(
                      'warning'
                    )
                  : 30,
            priority:
              classified.severity ===
                'critical'
                ? 'P0'
                : classified.severity ===
                    'high'
                  ? 'P1'
                  : classified.severity ===
                      'medium'
                    ? 'P3'
                    : 'P4',
            occurrences:
              1,
            affectedRoutes:
              [route],
            fingerprint,
            evidenceOrigin:
              'smart-scan',
            sourceArtifact:
              artifact,
            observedAt,
          }
        );
      }
    }

    return [
      ...issues.values(),
    ];
  } catch {
    return [];
  }
}


export function loadSmartScanDiscoveryIssues(
  siteIds: string[]
):
  DashboardDiscoveryIssue[] {
  const directory =
    path.resolve(
      process.cwd(),
      'dashboard',
      'data'
    );

  const requestedSites =
    new Set(siteIds);

  return [
    ...(
      requestedSites.has('nation')
        ? readSmartScanFile(
            path.join(
              directory,
              'discovered-pages-nation.json'
            ),
            'nation',
            'https://nation.dev'
          )
        : []
    ),
    ...(
      requestedSites.has('ai-skills')
        ? readSmartScanFile(
            path.join(
              directory,
              'discovered-pages-ai-skills.json'
            ),
            'ai-skills',
            'https://aiskills.nation.dev'
          )
        : []
    ),
  ].sort(
    (a, b) =>
      b.priorityScore -
      a.priorityScore
  );
}


function readDiscoveryFile(
  filePath: string
): DashboardDiscoveryIssue[] {
  if (
    !fs.existsSync(
      filePath
    )
  ) {
    return [];
  }

  try {
    const raw =
      fs.readFileSync(
        filePath,
        'utf8'
      );

    const report =
      JSON.parse(
        raw
      ) as DiscoveryReport;

    return (
      report.prioritizedFindings ??
      []
    ).map(
      finding => ({
        ...finding,

        source:
          'discovery' as const,

        qualityDimensions:
          finding.qualityDimensions?.length
            ? finding.qualityDimensions
            : qualityDimensionsForCategory(
                finding.category
              ),

        evidenceOrigin:
          finding.evidenceOrigin ??
          'deep-discovery',

        sourceArtifact:
          finding.sourceArtifact ??
          sourceArtifact(filePath),

        observedAt:
          finding.observedAt ??
          report.generatedAt,
      })
    );
  } catch {
    return [];
  }
}


function readApiBackendEvidence(
  filePath: string
): ApiBackendEvidence[] {
  if (
    !fs.existsSync(
      filePath
    )
  ) {
    return [];
  }

  try {
    const report =
      JSON.parse(
        fs.readFileSync(
          filePath,
          'utf8'
        )
      ) as DiscoveryReport;

    return (
      report.apiBackendEvidence ??
      []
    )
      .map(
        evidence => ({
          ...evidence,

          evidenceOrigin:
            evidence.evidenceOrigin ??
            'deep-discovery' as const,

          sourceArtifact:
            evidence.sourceArtifact ??
            sourceArtifact(filePath),
        })
      )
      .filter(
      evidence =>
        (
          evidence.kind ===
            'api-endpoint' ||
          evidence.kind ===
            'backend-service'
        ) &&
        evidence.statusCode >= 200 &&
        evidence.statusCode < 400 &&
        Boolean(evidence.url) &&
        Boolean(evidence.site)
    );
  } catch {
    return [];
  }
}


function telemetryFamily(
  issue: DashboardDiscoveryIssue
): string | null {
  if (
    !isAnalyticsOrTelemetryIssue(
      issue
    ) &&
    issue.category !==
      'analytics'
  ) {
    return null;
  }

  const text =
    `${issue.title} ${issue.evidence ?? ''}`.toLowerCase();

  if (
    text.includes(
      'clarity'
    )
  ) {
    return 'clarity';
  }

  if (
    text.includes(
      'google'
    ) ||
    text.includes(
      'analytics'
    )
  ) {
    return 'ga';
  }

  return 'telemetry';
}


export function refineDiscoveryIssues(
  issues: DashboardDiscoveryIssue[]
): DashboardDiscoveryIssue[] {
  const kept:
    DashboardDiscoveryIssue[] =
      [];

  for (
    const issue of
    issues
  ) {
    const classified =
      classifyFailedNetworkSignal({
        title:
          issue.title,
        category:
          issue.category,
        evidence:
          issue.evidence,
        message:
          issue.evidence,
        url:
          issue.requestedUrl ??
          issue.route,
        pageRoute:
          issue.route,
      });

    if (
      classified.action ===
        'ignore' ||
      classified.severity ===
        'info'
    ) {
      continue;
    }

    kept.push({
      ...issue,
      category:
        classified.category ||
        issue.category,
      severity:
        classified.severity,
      classification:
        classified.classification,
      annotation:
        classified.annotation ??
        issue.annotation,
      requestedUrl:
        classified.requestedUrl ??
        issue.requestedUrl,
      qualityDimensions:
        qualityDimensionsForCategory(
          classified.category ||
          issue.category
        ),
      description:
        issue.description,
      userImpact:
        classified.userImpact
          ? issue.userImpact
          : classified.annotation ||
            issue.userImpact,
      recommendation:
        classified.kind ===
          'analytics-csp'
          ? 'Align Content Security Policy with the analytics/telemetry domains actually used, or remove the unused integration. This does not mean the product flow is broken.'
          : issue.recommendation,
    });
  }

  const collapsed =
    new Map<
      string,
      DashboardDiscoveryIssue
    >();

  for (
    const issue of
    kept
  ) {
    const family =
      telemetryFamily(
        issue
      );

    if (!family) {
      collapsed.set(
        `unique:${issue.fingerprint}`,
        issue
      );
      continue;
    }

    const key =
      `telemetry:${issue.site}:${family}`;
    const existing =
      collapsed.get(
        key
      );

    if (!existing) {
      collapsed.set(
        key,
        {
          ...issue,
          fingerprint:
            smartScanFingerprint(
              key
            ),
        }
      );
      continue;
    }

    const longerEvidence =
      String(
        issue.evidence ??
        ''
      ).length >
      String(
        existing.evidence ??
        ''
      ).length
        ? issue
        : existing;

    collapsed.set(
      key,
      {
        ...longerEvidence,
        fingerprint:
          existing.fingerprint,
        occurrences:
          existing.occurrences +
          issue.occurrences,
        affectedRoutes:
          [
            ...new Set([
              ...existing.affectedRoutes,
              ...issue.affectedRoutes,
            ]),
          ],
      }
    );
  }

  return [
    ...collapsed.values(),
  ].sort(
    (a, b) =>
      b.priorityScore -
      a.priorityScore
  );
}


export function loadDiscoveryIssues():
  DashboardDiscoveryIssue[] {
  const directory =
    path.resolve(
      process.cwd(),
      'reports',
      'discovery'
    );

  const nation =
    readDiscoveryFile(
      path.join(
        directory,
        'nation.json'
      )
    );

  const aiSkills =
    readDiscoveryFile(
      path.join(
        directory,
        'ai-skills.json'
      )
    );

  return [
    ...nation,
    ...aiSkills,
  ].sort(
    (a, b) =>
      b.priorityScore -
      a.priorityScore
  );
}


export function loadApiBackendEvidence():
  ApiBackendEvidence[] {
  const directory =
    path.resolve(
      process.cwd(),
      'reports',
      'discovery'
    );

  const evidence = [
    ...readApiBackendEvidence(
      path.join(
        directory,
        'nation.json'
      )
    ),
    ...readApiBackendEvidence(
      path.join(
        directory,
        'ai-skills.json'
      )
    ),
  ];

  return [
    ...new Map(
      evidence.map(
        item => [
          [
            item.kind,
            item.site,
            item.method,
            item.url,
            item.statusCode,
          ].join('|'),
          item,
        ] as const
      )
    ).values(),
  ];
}
