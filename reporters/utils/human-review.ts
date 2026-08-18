import fs from 'node:fs';
import path from 'node:path';

import {
  HANDWRITTEN_ROUTES,
  isHandwrittenRoute,
  normalizeRoutePath,
} from '../../config/handwritten-coverage';
import type {
  ApiIntelligenceIssue,
  BackendIntelligenceIssue,
  CaptchaQueueItem,
  DashboardAttachment,
  DashboardTestResult,
  HumanReviewCredentials,
  HumanReviewPack,
  HumanReviewVerdict,
  IssueClassification,
  MachineOwnedItem,
  NeedsHumanItem,
  UntestedRoute,
} from '../models/types';
import type { DashboardDiscoveryIssue } from './discovery-issues';
import {
  attachRootCauseNotesToPack,
} from './root-cause';

export type HumanReviewBucket =
  | 'machine-owned'
  | 'needs-human'
  | 'ignore';

export type {
  HumanReviewCredentials,
  HumanReviewPack,
  HumanReviewVerdict,
  MachineOwnedItem,
  NeedsHumanItem,
  UntestedRoute,
} from '../models/types';

export interface DiscoveredRouteInput {
  site: string;
  pathname: string;
  url: string;
}

export interface BuildHumanReviewOptions {
  credentials?: HumanReviewCredentials;
  discoveredRoutes?: DiscoveredRouteInput[];
  handwrittenRoutes?: Record<string, readonly string[]>;
  now?: string;
  maxHumanItems?: number;
}

const MACHINE_OWNED_CLASSIFICATIONS = new Set<IssueClassification>([
  'product-bug',
  'content-bug',
  'security-issue',
  'accessibility-issue',
  'performance-issue',
]);

const CREDENTIAL_SKIP_RE =
  /NATION_TEST_|AI_SKILLS_TEST_|test account|real login|real Skills login/i;

const MEMBER_UNLOCK_TEXT =
  'Add test account to unlock /home /jobs /profile /assessment';

const SITE_ORIGIN: Record<string, string> = {
  nation: 'https://nation.dev',
  'ai-skills': 'https://aiskills.nation.dev',
};

const DEFAULT_MAX_HUMAN = 7;

export function detectCredentialsFromEnv(
  env: NodeJS.ProcessEnv = process.env
): HumanReviewCredentials {
  return {
    nation: Boolean(
      env.NATION_TEST_EMAIL?.trim() && env.NATION_TEST_PASSWORD?.trim()
    ),
    aiSkills: Boolean(
      env.AI_SKILLS_TEST_EMAIL?.trim() && env.AI_SKILLS_TEST_PASSWORD?.trim()
    ),
  };
}

export function bucketClassification(
  classification: IssueClassification | undefined
): HumanReviewBucket {
  const value = classification ?? 'needs-investigation';

  if (MACHINE_OWNED_CLASSIFICATIONS.has(value)) {
    return 'machine-owned';
  }

  if (classification === 'needs-investigation') {
    return 'needs-human';
  }

  return 'ignore';
}

export function bucketTestResult(
  test: DashboardTestResult
): HumanReviewBucket {
  if (test.status === 'passed' || test.status === 'skipped') {
    return 'ignore';
  }

  return bucketClassification(test.classification);
}

function inferFindingClassification(
  item: {
    classification?: IssueClassification;
    category?: string;
    severity?: string;
  }
): IssueClassification {
  if (item.classification) {
    return item.classification;
  }

  const category = String(item.category ?? '').toLowerCase();

  if (category.includes('accessib')) {
    return 'accessibility-issue';
  }

  if (category.includes('security')) {
    return 'security-issue';
  }

  if (category.includes('content')) {
    return 'content-bug';
  }

  if (category.includes('performance')) {
    return 'performance-issue';
  }

  const severity = String(item.severity ?? '').toLowerCase();

  if (severity === 'critical' || severity === 'high') {
    return 'product-bug';
  }

  return 'needs-investigation';
}

export function inferRoute(test: DashboardTestResult): string {
  const fromTitle = test.title.match(/\/[A-Za-z0-9\-/_]+/);

  if (fromTitle?.[0]) {
    return normalizeRoutePath(fromTitle[0]);
  }

  const fromFile = test.file.toLowerCase();

  if (fromFile.includes('homepage') || fromFile.includes('basic-user')) {
    return test.site === 'ai-skills' ? '/skills' : '/';
  }

  if (
    fromFile.includes('security-headers') ||
    fromFile.includes('accessibility') ||
    fromFile.includes('keyboard-a11y')
  ) {
    return test.site === 'ai-skills' ? '/skills' : '/';
  }

  return '';
}

function attachmentHref(attachment?: DashboardAttachment): string | undefined {
  const relative =
    attachment?.relativePath ||
    (attachment?.path
      ? attachment.path.replaceAll('\\', '/')
      : undefined);

  if (!relative) {
    return undefined;
  }

  if (relative.startsWith('test-results/') || relative.includes('/test-results/')) {
    const trimmed = relative.replace(/^.*?(test-results\/)/, 'test-results/');
    return `../${trimmed}`;
  }

  if (path.isAbsolute(relative)) {
    return relative.replaceAll('\\', '/');
  }

  return `../${relative}`;
}

function pickAttachment(
  attachments: DashboardAttachment[] | undefined,
  kind: DashboardAttachment['kind'],
  nameMatch?: RegExp
): DashboardAttachment | undefined {
  const list = attachments ?? [];

  return list.find(attachment => {
    if (nameMatch && nameMatch.test(attachment.name ?? '')) {
      return true;
    }

    if (kind && attachment.kind === kind) {
      return true;
    }

    if (nameMatch && nameMatch.test(attachment.path ?? '')) {
      return true;
    }

    return false;
  });
}

function siteUrl(site: string, route: string): string {
  const origin = SITE_ORIGIN[site] ?? SITE_ORIGIN.nation;
  const pathname = route || '/';

  if (pathname === '/') {
    return `${origin}/`;
  }

  return `${origin}${pathname}`;
}

function uniqueKey(test: DashboardTestResult): string {
  return [
    test.site,
    test.file.replaceAll('\\', '/'),
    test.title,
    test.classification ?? '',
  ].join('|');
}

function isCredentialSkip(test: DashboardTestResult): boolean {
  if (test.status !== 'skipped') {
    return false;
  }

  const haystack = [
    test.title,
    test.fullTitle,
    ...(test.annotations ?? []).map(item => item.description ?? ''),
  ].join(' ');

  return CREDENTIAL_SKIP_RE.test(haystack);
}

function suggestedCheck(test: DashboardTestResult): string {
  const title = test.title.toLowerCase();

  if (title.includes('sidebar')) {
    return 'Open the page on desktop, click the sidebar control, and note whether the nav expands, collapses, or is only decorative.';
  }

  const route = inferRoute(test);

  if (route) {
    return `Open ${route} in a browser, reproduce the action in the test title, and compare with the screenshot and trace.`;
  }

  return 'Open the failing page, reproduce the last action in the test title, and compare with the screenshot, video and trace.';
}

function whyHuman(test: DashboardTestResult): string {
  if (test.classificationReason) {
    return test.classificationReason;
  }

  return 'The test failed, but the cause could not be classified automatically.';
}

function toMachineOwned(test: DashboardTestResult): MachineOwnedItem {
  return {
    id: test.id,
    classification: test.classification ?? 'product-bug',
    title: test.title,
    site: test.site,
    file: test.file.replaceAll('\\', '/'),
    route: inferRoute(test) || '—',
  };
}

function toNeedsHuman(test: DashboardTestResult): NeedsHumanItem {
  const route = inferRoute(test);
  const attachments = test.attachments ?? [];

  return {
    id: test.id,
    site: test.site,
    url: siteUrl(test.site, route),
    title: test.title,
    whyHuman: whyHuman(test),
    suggestedCheck: suggestedCheck(test),
    screenshot: attachmentHref(
      pickAttachment(attachments, 'screenshot')
    ),
    trace: attachmentHref(pickAttachment(attachments, 'trace')),
    video: attachmentHref(pickAttachment(attachments, 'video')),
    errorContext: attachmentHref(
      pickAttachment(
        attachments,
        'log',
        /error-context|error context/i
      )
    ) ?? test.error?.snippet,
    errorMessage: test.error?.message,
  };
}

function analyzerMachineItem(input: {
  id: string;
  classification: IssueClassification;
  title: string;
  site: string;
  file: string;
  route: string;
}): MachineOwnedItem {
  return input;
}

function analyzerHumanItem(input: {
  id: string;
  site: string;
  url: string;
  title: string;
  whyHuman: string;
}): NeedsHumanItem {
  return {
    ...input,
    suggestedCheck:
      'Open the linked URL, confirm the machine evidence, and decide whether this is a product defect or an analyzer gap.',
  };
}

function absorbAnalyzerFinding(
  uniqueMachine: Map<string, MachineOwnedItem>,
  uniqueHuman: Map<string, NeedsHumanItem>,
  finding: {
    id: string;
    classification?: IssueClassification;
    category?: string;
    severity?: string;
    title: string;
    site: string;
    file: string;
    route: string;
    url?: string;
    whyHuman?: string;
  }
): void {
  const classification = inferFindingClassification(finding);
  const bucket = bucketClassification(classification);
  const key = `${finding.site}|${finding.file}|${finding.title}|${classification}`;

  if (bucket === 'machine-owned' && !uniqueMachine.has(key)) {
    uniqueMachine.set(
      key,
      analyzerMachineItem({
        id: finding.id,
        classification,
        title: finding.title,
        site: finding.site,
        file: finding.file,
        route: finding.route || '—',
      })
    );
  }

  if (bucket === 'needs-human' && !uniqueHuman.has(key)) {
    uniqueHuman.set(
      key,
      analyzerHumanItem({
        id: finding.id,
        site: finding.site,
        url: finding.url || siteUrl(finding.site, finding.route),
        title: finding.title,
        whyHuman:
          finding.whyHuman ||
          'Analyzer finding could not be classified automatically.',
      })
    );
  }
}

function credentialGapItem(): NeedsHumanItem {
  return {
    id: 'gap-test-account',
    site: 'nation + ai-skills',
    url: 'https://nation.dev/home',
    title: MEMBER_UNLOCK_TEXT,
    whyHuman:
      'Member routes cannot be exercised without a real test account. No NATION_TEST_* or AI_SKILLS_TEST_* credentials were present in this run.',
    suggestedCheck:
      'Add a disposable QA account to .env (NATION_TEST_EMAIL/PASSWORD and AI_SKILLS_TEST_EMAIL/PASSWORD), re-run npm run qa:unattended, and confirm /home, /jobs, /profile and /assessment load while signed in.',
  };
}

export function loadDiscoveredRoutesFromDisk(
  cwd: string = process.cwd()
): DiscoveredRouteInput[] {
  const files = [
    ['nation', 'discovered-pages-nation.json'],
    ['ai-skills', 'discovered-pages-ai-skills.json'],
  ] as const;

  const routes: DiscoveredRouteInput[] = [];

  for (const [site, fileName] of files) {
    const filePath = path.resolve(
      cwd,
      'dashboard',
      'data',
      fileName
    );

    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
        pages?: Array<{ pathname?: string; url?: string }>;
      };

      for (const page of parsed.pages ?? []) {
        if (!page?.pathname && !page?.url) {
          continue;
        }

        const pathname = normalizeRoutePath(
          page.pathname || new URL(page.url ?? SITE_ORIGIN[site]).pathname
        );

        routes.push({
          site,
          pathname,
          url: page.url || siteUrl(site, pathname),
        });
      }
    } catch {
      // Discovery inventory is optional; missing or invalid files become a gap later.
    }
  }

  return routes;
}

function untestedRoutesFromDiscovery(
  discovered: DiscoveredRouteInput[],
  handwritten: Record<string, readonly string[]>
): UntestedRoute[] {
  const seen = new Set<string>();
  const untested: UntestedRoute[] = [];

  for (const page of discovered) {
    const pathname = normalizeRoutePath(page.pathname);
    const key = `${page.site}:${pathname}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (isHandwrittenRoute(page.site, pathname, handwritten)) {
      continue;
    }

    untested.push({
      site: page.site,
      pathname,
      url: page.url || siteUrl(page.site, pathname),
    });
  }

  return untested.sort((left, right) =>
    `${left.site}${left.pathname}`.localeCompare(
      `${right.site}${right.pathname}`
    )
  );
}

function threeBullets(input: {
  verdict: HumanReviewVerdict;
  machineOwned: MachineOwnedItem[];
  needsHuman: NeedsHumanItem[];
  untestedRoutes: UntestedRoute[];
  credentials: HumanReviewCredentials;
}): string[] {
  const bullets: string[] = [];
  const product = input.machineOwned.filter(
    item => item.classification === 'product-bug'
  );
  const content = input.machineOwned.filter(
    item => item.classification === 'content-bug'
  );
  const security = input.machineOwned.filter(
    item => item.classification === 'security-issue'
  );
  const a11y = input.machineOwned.filter(
    item => item.classification === 'accessibility-issue'
  );

  if (product.length) {
    bullets.push(
      `${product.length} product bug${product.length === 1 ? '' : 's'} already classified (developer work), including “${product[0].title}”.`
    );
  }

  if (content.length) {
    bullets.push(
      `${content.length} content bug${content.length === 1 ? '' : 's'} already classified, including “${content[0].title}”.`
    );
  }

  if (security.length) {
    bullets.push(
      `${security.length} security-header failure${security.length === 1 ? '' : 's'} recorded honestly.`
    );
  }

  if (a11y.length) {
    bullets.push(
      `${a11y.length} serious/critical accessibility failure${a11y.length === 1 ? '' : 's'} recorded honestly.`
    );
  }

  const performance = input.machineOwned.filter(
    item => item.classification === 'performance-issue'
  );

  if (performance.length) {
    bullets.push(
      `${performance.length} performance finding${performance.length === 1 ? '' : 's'} already classified.`
    );
  }

  if (!input.credentials.nation || !input.credentials.aiSkills) {
    bullets.push(MEMBER_UNLOCK_TEXT);
  }

  const investigation = input.needsHuman.filter(
    item => item.id !== 'gap-test-account'
  );

  if (investigation.length) {
    bullets.push(
      `${investigation.length} item${investigation.length === 1 ? '' : 's'} still need a human because classification is ambiguous.`
    );
  }

  if (input.untestedRoutes.length) {
    bullets.push(
      `${input.untestedRoutes.length} discovered route${input.untestedRoutes.length === 1 ? '' : 's'} have no hand-written E2E.`
    );
  }

  if (bullets.length === 0) {
    bullets.push('No classified product, content, header or accessibility failures.');
    bullets.push('No credential gap and no ambiguous investigation items.');
    bullets.push('Discovered public routes match hand-written coverage.');
  }

  while (bullets.length < 3) {
    if (input.verdict === 'GO') {
      bullets.push('Unattended Chromium run finished without a human queue.');
    } else {
      bullets.push('See the sections below; do not re-explore machine-owned failures.');
    }
  }

  return bullets.slice(0, 3);
}

function decideVerdict(input: {
  machineOwned: MachineOwnedItem[];
  needsHuman: NeedsHumanItem[];
  untestedRoutes: UntestedRoute[];
  releaseStatus?: string;
}): HumanReviewVerdict {
  const blockingMachine = input.machineOwned.some(item =>
    item.classification === 'product-bug' ||
    item.classification === 'security-issue' ||
    item.classification === 'accessibility-issue'
  );

  if (blockingMachine || input.releaseStatus === 'not-ready') {
    return 'NO-GO';
  }

  if (
    input.machineOwned.length > 0 ||
    input.needsHuman.length > 0 ||
    input.untestedRoutes.length > 0 ||
    input.releaseStatus === 'ready-with-warnings'
  ) {
    return 'WARN';
  }

  return 'GO';
}

export function buildHumanReviewPack(
  run: {
    runId: string;
    finishedAt?: string;
    tests: DashboardTestResult[];
    releaseAssessment?: {
      status?: string;
    };
    discoveryIssues?: DashboardDiscoveryIssue[];
    apiIssues?: ApiIntelligenceIssue[];
    backendIssues?: BackendIntelligenceIssue[];
  },
  options: BuildHumanReviewOptions = {}
): HumanReviewPack {
  const credentials =
    options.credentials ?? detectCredentialsFromEnv();
  const handwritten =
    options.handwrittenRoutes ?? HANDWRITTEN_ROUTES;
  const discovered =
    options.discoveredRoutes ?? loadDiscoveredRoutesFromDisk();
  const maxHuman = options.maxHumanItems ?? DEFAULT_MAX_HUMAN;

  const uniqueMachine = new Map<string, MachineOwnedItem>();
  const uniqueHuman = new Map<string, NeedsHumanItem>();

  for (const test of run.tests ?? []) {
    const bucket = bucketTestResult(test);

    if (bucket === 'machine-owned') {
      const key = uniqueKey(test);

      if (!uniqueMachine.has(key)) {
        uniqueMachine.set(key, toMachineOwned(test));
      }
    }

    if (bucket === 'needs-human') {
      const key = uniqueKey(test);

      if (!uniqueHuman.has(key)) {
        uniqueHuman.set(key, toNeedsHuman(test));
      }
    }
  }

  for (const issue of run.discoveryIssues ?? []) {
    absorbAnalyzerFinding(uniqueMachine, uniqueHuman, {
      id: issue.fingerprint,
      classification: issue.classification,
      category: issue.category,
      severity: issue.severity,
      title: issue.title,
      site: issue.site,
      file: issue.sourceArtifact || 'discovery',
      route: issue.route,
      url: issue.requestedUrl,
      whyHuman: issue.description,
    });
  }

  for (const issue of run.apiIssues ?? []) {
    absorbAnalyzerFinding(uniqueMachine, uniqueHuman, {
      id: issue.fingerprint,
      classification: issue.classification,
      category: issue.category,
      severity: issue.severity,
      title: issue.title,
      site: issue.site,
      file: issue.endpoint,
      route: issue.endpoint,
      whyHuman: `API finding ${issue.method ?? ''} ${issue.endpoint}`.trim(),
    });
  }

  for (const issue of run.backendIssues ?? []) {
    absorbAnalyzerFinding(uniqueMachine, uniqueHuman, {
      id: issue.fingerprint,
      classification: issue.classification,
      category: issue.category,
      severity: issue.severity,
      title: issue.title,
      site: issue.site,
      file: issue.service || 'backend',
      route: issue.operation || issue.service || '—',
      whyHuman: issue.title,
    });
  }

  const machineOwned = [...uniqueMachine.values()].sort((left, right) =>
    left.title.localeCompare(right.title)
  );

  const needsHuman: NeedsHumanItem[] = [];

  if (!credentials.nation || !credentials.aiSkills) {
    needsHuman.push(credentialGapItem());
  } else {
    const skippedAuth = (run.tests ?? []).some(isCredentialSkip);

    if (skippedAuth) {
      needsHuman.push(credentialGapItem());
    }
  }

  for (const item of uniqueHuman.values()) {
    if (needsHuman.length >= maxHuman) {
      break;
    }

    needsHuman.push(item);
  }

  const untested = untestedRoutesFromDiscovery(discovered, handwritten);
  const verdict = decideVerdict({
    machineOwned,
    needsHuman,
    untestedRoutes: untested,
    releaseStatus: run.releaseAssessment?.status,
  });

  const pack: HumanReviewPack = {
    verdict,
    bullets: threeBullets({
      verdict,
      machineOwned,
      needsHuman,
      untestedRoutes: untested,
      credentials,
    }),
    generatedAt: options.now ?? run.finishedAt ?? new Date().toISOString(),
    runId: run.runId,
    credentials,
    machineOwned,
    needsHuman,
    untestedRoutes: untested,
  };

  return attachRootCauseNotesToPack(pack, run.tests);
}

function captchaNeedsHuman(item: CaptchaQueueItem): NeedsHumanItem {
  return {
    id: item.id,
    site: item.site,
    url: item.url,
    title: item.title,
    whyHuman: item.whyHuman,
    suggestedCheck:
      'Open the first-party sign-in page, complete the iframe captcha yourself (or set SENTINEL_CAPTCHA_SOLVER_KEY for nation.dev / aiskills.nation.dev only), then re-run auth setup.',
    screenshot: item.screenshot,
  };
}

export function mergeCaptchaQueue(
  pack: HumanReviewPack,
  queue: CaptchaQueueItem[],
  maxHuman = DEFAULT_MAX_HUMAN
): HumanReviewPack {
  if (queue.length === 0) {
    return {
      ...pack,
      captchaQueue: [],
    };
  }

  const first = captchaNeedsHuman(queue[0]);
  const needsHuman = pack.needsHuman.filter(item => item.id !== first.id);
  const insertAt = needsHuman[0]?.id === 'gap-test-account' ? 1 : 0;
  needsHuman.splice(insertAt, 0, first);

  return {
    ...pack,
    needsHuman: needsHuman.slice(0, maxHuman),
    captchaQueue: queue,
  };
}

export function fallbackHumanReviewPack(
  error: unknown,
  runId = 'unknown'
): HumanReviewPack {
  const message =
    error instanceof Error ? error.message : String(error ?? 'unknown error');

  return {
    verdict: 'WARN',
    bullets: [
      'The human review pack could not be fully generated.',
      'Treat this as a reporter gap, not a product fire drill.',
      'Re-run npm run qa:unattended after checking the reporter log.',
    ],
    generatedAt: new Date().toISOString(),
    runId,
    credentials: detectCredentialsFromEnv(),
    machineOwned: [],
    needsHuman: [
      {
        id: 'gap-human-review-pack',
        site: 'qa-sentinel',
        url: '',
        title: 'Human review pack generation failed',
        whyHuman:
          'The reporter hit an unexpected error while building the human pack. Unknown acceptance criteria and similar catalog gaps must not crash the run.',
        suggestedCheck: `Read the reporter log, then re-run unit tests. Error: ${message}`,
      },
    ],
    untestedRoutes: [],
  };
}
