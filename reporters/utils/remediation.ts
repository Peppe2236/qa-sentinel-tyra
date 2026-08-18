import fs from 'node:fs';
import path from 'node:path';

import {
  createGithubIssuesEnabled,
  githubToken,
  remediationReportsEnabled,
} from '../../config/policy';
import type {
  DashboardRun,
  HumanReviewPack,
  ReleaseUpdate,
  RemediationKind,
  RemediationReport,
  RemediationSuggestion,
} from '../models/types';
import { writeJson } from './json-store';

function classifyRemediationKind(
  title: string,
  classification?: string
): RemediationKind {
  const text = title.toLowerCase();

  if (text.includes('theme toggle')) {
    return 'theme-toggle';
  }

  if (text.includes('duplicated') || classification === 'content-bug') {
    return 'copy-bug';
  }

  if (
    classification === 'security-issue' ||
    text.includes('content-security-policy') ||
    text.includes('header')
  ) {
    return 'header-gap';
  }

  return 'other';
}

function suggestedFix(item: {
  kind: RemediationKind;
  title: string;
  site: string;
  route: string;
}): string {
  switch (item.kind) {
    case 'theme-toggle':
      return 'On click, toggle a `dark` class (or equivalent token) on `document.documentElement`, persist it, and make background/text change visibly.';
    case 'copy-bug':
      return `Remove or rewrite the duplicated/malformed homepage sentence. Quote from the failing test: “${item.title}”.`;
    case 'header-gap':
      return `Send the missing document security header on ${item.site} ${item.route} (CSP and related headers measured by the security-headers specs).`;
    default:
      return 'Fix the classified developer-owned failure, then re-run the affected Playwright spec.';
  }
}

export function buildRemediationSuggestions(
  pack: HumanReviewPack | undefined
): RemediationSuggestion[] {
  if (!pack) {
    return [];
  }

  return pack.machineOwned
    .filter(item =>
      item.classification === 'product-bug' ||
      item.classification === 'content-bug' ||
      item.classification === 'security-issue'
    )
    .map(item => {
      const kind = classifyRemediationKind(
        item.title,
        item.classification
      );

      return {
        id: `remediation-${item.id}`,
        kind,
        title: item.title,
        site: item.site,
        file: item.file,
        route: item.route,
        quote: item.title,
        suggestedFix: suggestedFix({
          kind,
          title: item.title,
          site: item.site,
          route: item.route,
        }),
        owner: 'developer' as const,
        workKind: 'remediation' as const,
      };
    });
}

export function buildReleaseUpdate(
  run: Pick<DashboardRun, 'runId' | 'finishedAt' | 'releaseAssessment' | 'humanReview' | 'health' | 'failed'>,
  previous?: Pick<DashboardRun, 'runId' | 'releaseAssessment' | 'health' | 'failed' | 'finishedAt'>
): Omit<ReleaseUpdate, 'artifactPath' | 'jsonPath'> {
  const status = run.releaseAssessment?.status ?? 'not-verified';
  const previousStatus = previous?.releaseAssessment?.status ?? null;
  const changed: string[] = [];

  if (previousStatus && previousStatus !== status) {
    changed.push(
      `Release status ${previousStatus} → ${status}`
    );
  }

  if (previous && previous.health !== run.health) {
    changed.push(`Health ${previous.health}% → ${run.health}%`);
  }

  if (previous && previous.failed !== run.failed) {
    changed.push(`Failed tests ${previous.failed} → ${run.failed}`);
  }

  if (!previous) {
    changed.push('No prior history.json entry; this is the baseline for the next run.');
  }

  if (changed.length === 0) {
    changed.push('No status/health/fail-count change versus the last history.json entry.');
  }

  const verdict =
    run.humanReview?.verdict ??
    (status === 'ready'
      ? 'GO'
      : status === 'not-ready'
        ? 'NO-GO'
        : 'WARN');

  const recommendedNextAction =
    run.releaseAssessment?.recommendedAction ??
    (verdict === 'NO-GO'
      ? 'Fix developer-owned theme, copy, and header gaps, then re-run npm run qa:unattended.'
      : 'Review the human pack and local remediation.md before any product release.');

  return {
    generatedAt: run.finishedAt,
    runId: run.runId,
    previousRunId: previous?.runId ?? null,
    verdict: String(verdict),
    status,
    previousStatus,
    changed,
    recommendedNextAction,
    humanReviewRequired: true,
  };
}

function remediationMarkdown(
  report: RemediationReport
): string {
  const rows = report.items.length
    ? report.items
        .map(
          item =>
            [
              `### ${item.title}`,
              '',
              `- Kind: ${item.kind}`,
              `- Owner: developer`,
              `- Site: ${item.site}`,
              `- File: \`${item.file}\``,
              `- Route: ${item.route}`,
              item.quote ? `- Quote: ${item.quote}` : '',
              `- Suggested fix: ${item.suggestedFix}`,
              '',
            ]
              .filter(Boolean)
              .join('\n')
        )
        .join('\n')
    : '_No developer-owned copy, theme, or header remediations in this run._';

  return [
    '# Local remediation suggestions',
    '',
    `Run \`${report.runId}\` · ${report.generatedAt}`,
    '',
    'These are **repo artifacts only**. Sentinel does not write to nation.dev or aiskills.nation.dev.',
    '',
    `GitHub issues: ${report.githubIssues}. Production writes: ${report.productionWrites}.`,
    '',
    rows,
    '',
  ].join('\n');
}

function releaseUpdateMarkdown(update: ReleaseUpdate): string {
  return [
    '# Release update (local, human review)',
    '',
    `Run \`${update.runId}\` · ${update.generatedAt}`,
    '',
    `- Verdict: **${update.verdict}**`,
    `- Current unified status: ${update.status}`,
    `- Previous history.json status: ${update.previousStatus ?? 'none'}`,
    `- Previous run: ${update.previousRunId ?? 'none'}`,
    '',
    '## What changed',
    '',
    ...update.changed.map(item => `- ${item}`),
    '',
    '## Recommended next action',
    '',
    update.recommendedNextAction,
    '',
    'This file does not deploy the product. A human still owns the release decision.',
    '',
  ].join('\n');
}

async function maybeCreateGithubIssues(
  items: RemediationSuggestion[],
  env: NodeJS.ProcessEnv
): Promise<RemediationReport['githubIssues']> {
  if (!createGithubIssuesEnabled(env)) {
    return 'disabled';
  }

  const token = githubToken(env);
  const repo =
    env.GITHUB_REPOSITORY?.trim() || 'Peppe2236/qa-sentinel-tyra';

  if (repo !== 'Peppe2236/qa-sentinel-tyra') {
    return 'disabled';
  }

  if (items.length === 0) {
    return 'skipped';
  }

  try {
    for (const item of items.slice(0, 5)) {
      const response = await fetch(
        `https://api.github.com/repos/${repo}/issues`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'qa-sentinel-tyra',
          },
          body: JSON.stringify({
            title: `[QA Sentinel] ${item.title}`,
            body: [
              'Local Sentinel remediation suggestion. Not applied to production.',
              '',
              `- Site: ${item.site}`,
              `- File: \`${item.file}\``,
              `- Route: ${item.route}`,
              `- Suggested fix: ${item.suggestedFix}`,
            ].join('\n'),
          }),
        }
      );

      if (!response.ok) {
        return 'error';
      }
    }

    return 'created';
  } catch {
    return 'error';
  }
}

export async function writeRemediationAndRelease(input: {
  run: DashboardRun;
  previous?: DashboardRun;
  reportsDirectory: string;
  dataDirectory: string;
  env?: NodeJS.ProcessEnv;
}): Promise<{
  remediation?: RemediationReport;
  releaseUpdate?: ReleaseUpdate;
}> {
  const env = input.env ?? process.env;

  if (!remediationReportsEnabled(env)) {
    return {};
  }

  fs.mkdirSync(input.reportsDirectory, { recursive: true });
  fs.mkdirSync(input.dataDirectory, { recursive: true });

  const items = buildRemediationSuggestions(input.run.humanReview);
  const githubIssues = await maybeCreateGithubIssues(items, env);
  const markdownPath = path.join(input.reportsDirectory, 'remediation.md');

  const remediation: RemediationReport = {
    generatedAt: input.run.finishedAt,
    runId: input.run.runId,
    productionWrites: 'disabled-by-policy',
    githubIssues,
    itemCount: items.length,
    items,
    markdownPath: 'reports/remediation.md',
  };

  fs.writeFileSync(markdownPath, remediationMarkdown(remediation), 'utf8');
  writeJson(
    path.join(input.dataDirectory, 'remediation.json'),
    remediation
  );

  const releaseCore = buildReleaseUpdate(input.run, input.previous);
  const releaseUpdate: ReleaseUpdate = {
    ...releaseCore,
    artifactPath: 'reports/release-update.md',
    jsonPath: 'reports/release-status.json',
  };

  fs.writeFileSync(
    path.join(input.reportsDirectory, 'release-update.md'),
    releaseUpdateMarkdown(releaseUpdate),
    'utf8'
  );
  writeJson(
    path.join(input.reportsDirectory, 'release-status.json'),
    releaseUpdate
  );
  writeJson(
    path.join(input.dataDirectory, 'release-status.json'),
    releaseUpdate
  );

  return { remediation, releaseUpdate };
}
