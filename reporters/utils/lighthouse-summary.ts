import fs from 'node:fs';
import path from 'node:path';

import type {
  PerformanceAreaAssessment,
  SecurityPerformanceAssessment,
} from '../models/types';

export interface LighthousePageSummary {
  page: string;
  url: string;
  fetchTime?: string;
  performanceScore?: number;
  accessibilityScore?: number;
  bestPracticesScore?: number;
  seoScore?: number;
  lcpMs?: number;
  fcpMs?: number;
  cls?: number;
  sourceFile: string;
}

function scorePercent(value: unknown): number | undefined {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return Math.round(numeric * 100);
}

function auditMs(audits: Record<string, unknown> | undefined, id: string): number | undefined {
  const audit = audits?.[id] as { numericValue?: unknown } | undefined;
  const numeric = Number(audit?.numericValue);

  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return Math.round(numeric);
}

function pageLabel(url: string, sourceFile: string): string {
  const lower = url.toLowerCase();

  if (lower.includes('aiskills') || sourceFile.includes('skills')) {
    return 'skills-catalog';
  }

  if (lower.includes('nation.dev') || sourceFile.includes('nation')) {
    return 'nation-home';
  }

  return path.basename(sourceFile, '.json');
}

export function parseLighthouseJson(
  raw: unknown,
  sourceFile: string
): LighthousePageSummary | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const root = raw as Record<string, unknown>;
  const lhr = (
    root.lhr && typeof root.lhr === 'object'
      ? root.lhr
      : root
  ) as Record<string, unknown>;

  const categories = (lhr.categories ?? {}) as Record<
    string,
    { score?: unknown }
  >;
  const audits = (lhr.audits ?? {}) as Record<string, unknown>;
  const url = String(lhr.finalRequestedUrl ?? lhr.requestedUrl ?? lhr.finalUrl ?? '');

  if (!categories.performance && !audits['largest-contentful-paint'] && !url) {
    return undefined;
  }

  const clsAudit = audits['cumulative-layout-shift'] as
    | { numericValue?: unknown }
    | undefined;
  const cls = Number(clsAudit?.numericValue);

  return {
    page: pageLabel(url, sourceFile),
    url,
    fetchTime: typeof lhr.fetchTime === 'string' ? lhr.fetchTime : undefined,
    performanceScore: scorePercent(categories.performance?.score),
    accessibilityScore: scorePercent(categories.accessibility?.score),
    bestPracticesScore: scorePercent(categories['best-practices']?.score),
    seoScore: scorePercent(categories.seo?.score),
    lcpMs: auditMs(audits, 'largest-contentful-paint'),
    fcpMs: auditMs(audits, 'first-contentful-paint'),
    cls: Number.isFinite(cls) ? cls : undefined,
    sourceFile,
  };
}

export function loadLighthouseSummaries(
  reportsDirectory: string
): LighthousePageSummary[] {
  if (!fs.existsSync(reportsDirectory)) {
    return [];
  }

  const names = fs
    .readdirSync(reportsDirectory)
    .filter(name => /^lighthouse-.*\.json$/i.test(name));

  const summaries: LighthousePageSummary[] = [];

  for (const name of names) {
    const filePath = path.join(reportsDirectory, name);

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
      const summary = parseLighthouseJson(parsed, name);

      if (summary) {
        summaries.push(summary);
      }
    } catch {
      // Ignore unreadable leftover files; Playwright evidence stays canonical.
    }
  }

  return summaries;
}

export function lighthouseNotes(summaries: LighthousePageSummary[]): string[] {
  return summaries.map(summary => {
    const parts = [
      `Lighthouse ${summary.page}`,
      summary.performanceScore !== undefined
        ? `performance ${summary.performanceScore}`
        : undefined,
      summary.accessibilityScore !== undefined
        ? `accessibility ${summary.accessibilityScore}`
        : undefined,
      summary.lcpMs !== undefined ? `LCP ${summary.lcpMs}ms` : undefined,
      summary.fcpMs !== undefined ? `FCP ${summary.fcpMs}ms` : undefined,
    ].filter(Boolean);

    return parts.join(' · ');
  });
}

function withNotes(
  area: PerformanceAreaAssessment,
  extra: string[]
): PerformanceAreaAssessment {
  if (extra.length === 0) {
    return area;
  }

  return {
    ...area,
    notes: [...(area.notes ?? []), ...extra],
  };
}

/**
 * Attach Lighthouse CLI summaries as notes. Does not change area status so a
 * leftover reports/lighthouse-*.json cannot flip release readiness.
 */
export function applyLighthouseSummaries(
  assessment: SecurityPerformanceAssessment,
  summaries: LighthousePageSummary[]
): SecurityPerformanceAssessment {
  if (summaries.length === 0) {
    return assessment;
  }

  const notes = lighthouseNotes(summaries);
  const lcpNotes = summaries
    .filter(item => item.lcpMs !== undefined)
    .map(item => `${item.page} Lighthouse LCP ${item.lcpMs}ms`);

  return {
    ...assessment,
    performance: {
      ...assessment.performance,
      areas: assessment.performance.areas.map(area => {
        if (area.area === 'page-load') {
          return withNotes(area, notes);
        }

        if (area.area === 'largest-contentful-paint') {
          return withNotes(area, lcpNotes.length > 0 ? lcpNotes : notes);
        }

        return area;
      }),
    },
  };
}
