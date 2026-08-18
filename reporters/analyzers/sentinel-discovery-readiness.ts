import fs from 'node:fs';
import path from 'node:path';

import type {
  DashboardDiscoveryIssue,
} from '../utils/discovery-issues';
import type {
  ApiBackendEvidence,
  DashboardTestResult,
  DiscoveryReadiness,
} from '../models/types';

interface DiscoveryFileShape {
  generatedAt?: string;
  sites?: Record<string, { site?: string; routes?: string[] }>;
  apiBackendEvidence?: Array<{ site?: string }>;
}

interface ScanPageShape {
  pathname?: string;
  healthStatus?: string;
  healthy?: boolean;
}

interface ScanFileShape {
  siteId?: string;
  scannedAt?: string;
  totalPages?: number;
  passedPages?: number;
  pages?: ScanPageShape[];
}

export interface DiscoveryInventory {
  sites: string[];
  routes: Array<{ site: string; pathname: string }>;
  scanPassed: number;
  scanObserved: number;
  apiPositive: number;
  sourceArtifacts: string[];
  generatedAt?: string;
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function isDiscoveredRouteTest(test: DashboardTestResult): boolean {
  const file = test.file.replaceAll('\\', '/').toLowerCase();
  const title = `${test.title} ${test.fullTitle}`.toLowerCase();

  return (
    file.includes('generated/discovered-pages') ||
    title.includes('automatically discovered pages')
  );
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

export function loadDiscoveryInventory(cwd = process.cwd()): DiscoveryInventory {
  const discoveryDirectory = path.resolve(cwd, 'reports', 'discovery');
  const scanDirectory = path.resolve(cwd, 'dashboard', 'data');

  const discoveryFiles = [
    path.join(discoveryDirectory, 'nation.json'),
    path.join(discoveryDirectory, 'ai-skills.json'),
  ];
  const scanFiles = [
    path.join(scanDirectory, 'discovered-pages-nation.json'),
    path.join(scanDirectory, 'discovered-pages-ai-skills.json'),
  ];

  const routes: Array<{ site: string; pathname: string }> = [];
  const sites: string[] = [];
  const artifacts: string[] = [];
  let apiPositive = 0;
  let generatedAt: string | undefined;
  let scanPassed = 0;
  let scanObserved = 0;

  for (const filePath of discoveryFiles) {
    const report = readJsonFile<DiscoveryFileShape>(filePath);
    if (!report) {
      continue;
    }

    artifacts.push(path.relative(cwd, filePath).split(path.sep).join('/'));
    generatedAt = generatedAt ?? report.generatedAt;
    apiPositive += report.apiBackendEvidence?.length ?? 0;

    for (const [siteId, site] of Object.entries(report.sites ?? {})) {
      sites.push(site.site ?? siteId);
      for (const pathname of site.routes ?? []) {
        routes.push({ site: site.site ?? siteId, pathname });
      }
    }
  }

  for (const filePath of scanFiles) {
    const report = readJsonFile<ScanFileShape>(filePath);
    if (!report) {
      continue;
    }

    artifacts.push(path.relative(cwd, filePath).split(path.sep).join('/'));
    generatedAt = generatedAt ?? report.scannedAt;
    if (report.siteId) {
      sites.push(report.siteId);
    }

    const pages = report.pages ?? [];
    scanObserved += report.totalPages ?? pages.length;
    scanPassed +=
      report.passedPages ??
      pages.filter(
        page =>
          page.healthy === true ||
          String(page.healthStatus ?? '').startsWith('passed')
      ).length;

    for (const page of pages) {
      if (page.pathname && report.siteId) {
        routes.push({ site: report.siteId, pathname: page.pathname });
      }
    }
  }

  return {
    sites: unique(sites),
    routes,
    scanPassed,
    scanObserved,
    apiPositive,
    sourceArtifacts: unique(artifacts),
    generatedAt,
  };
}

export function buildDiscoveryReadiness(input: {
  tests?: DashboardTestResult[];
  discoveryIssues?: DashboardDiscoveryIssue[];
  apiEvidence?: ApiBackendEvidence[];
  cwd?: string;
  inventory?: DiscoveryInventory;
}): DiscoveryReadiness {
  const inventory =
    input.inventory ?? loadDiscoveryInventory(input.cwd ?? process.cwd());
  const tests = input.tests ?? [];
  const findings = input.discoveryIssues ?? [];
  const apiEvidence = input.apiEvidence ?? [];

  const routeTests = tests.filter(isDiscoveredRouteTest);
  const routePassed = routeTests.filter(test => test.status === 'passed').length;
  const routeFailed = routeTests.filter(test => test.status !== 'passed').length;

  const negativeFindings = findings.filter(finding => {
    const severity = String(finding.severity ?? '').toLowerCase();
    const priority = String(finding.priority ?? '').toUpperCase();
    return (
      severity === 'critical' ||
      severity === 'high' ||
      priority === 'P0' ||
      priority === 'P1'
    );
  });
  const warningFindings = findings.filter(
    finding => !negativeFindings.includes(finding)
  );

  const uniqueRouteCount = unique(
    inventory.routes.map(route => `${route.site}:${route.pathname}`)
  ).length;
  const routePositive = Math.max(routePassed, inventory.scanPassed, uniqueRouteCount);
  const routeObserved = Math.max(
    routeTests.length,
    inventory.scanObserved,
    uniqueRouteCount
  );
  const apiPositive = Math.max(apiEvidence.length, inventory.apiPositive);
  const sites = unique([
    ...inventory.sites,
    ...routeTests.map(test => test.site),
    ...findings.map(finding => finding.site),
    ...apiEvidence.map(evidence => evidence.site),
  ]);

  const hasEvidence =
    routePositive > 0 ||
    apiPositive > 0 ||
    findings.length > 0 ||
    routeObserved > 0;

  let status: DiscoveryReadiness['status'] = 'verified';
  if (!hasEvidence) {
    status = 'not-verified';
  } else if (routeFailed > 0 || negativeFindings.length > 0) {
    status = 'degraded';
  } else if (warningFindings.length > 0) {
    status = 'verified-with-warnings';
  }

  return {
    status,
    sites,
    routePositive,
    routeObserved,
    apiPositive,
    negativeCount: routeFailed + negativeFindings.length,
    warningCount: warningFindings.length,
    findingCount: findings.length,
    sourceArtifacts: inventory.sourceArtifacts,
    generatedAt: inventory.generatedAt,
  };
}
