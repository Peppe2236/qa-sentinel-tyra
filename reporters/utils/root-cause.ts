import type {
  DashboardTestResult,
  HumanReviewPack,
  IssueClassification,
  MachineOwnedItem,
  NeedsHumanItem,
  RootCauseNote,
  RootCauseTheme,
} from '../models/types';
import {
  completeLlmChat,
  type FetchLike,
} from './llm';

export function classifyRootCauseTheme(
  title: string,
  classification?: IssueClassification
): RootCauseTheme {
  const text = title.toLowerCase();

  if (/\btheme\b/.test(text)) {
    return 'theme';
  }

  if (
    classification === 'content-bug' ||
    /duplicat|wording|copy|malformed|sentence/.test(text)
  ) {
    return 'copy';
  }

  if (
    classification === 'security-issue' ||
    /header|content-security-policy|content.security.policy|\bcsp\b|hsts|x-frame|x-content-type|clickjack/.test(
      text
    )
  ) {
    return 'headers';
  }

  if (
    classification === 'accessibility-issue' ||
    /\baxe\b|accessib/.test(text)
  ) {
    return 'accessibility';
  }

  if (classification === 'performance-issue') {
    return 'performance';
  }

  if (/sign-?in|password|credential|auth|test account/.test(text)) {
    return 'auth';
  }

  return 'other';
}

export function heuristicRootCauseSummary(input: {
  title: string;
  classification?: IssueClassification;
  errorMessage?: string;
  classificationReason?: string;
}): string {
  const theme = classifyRootCauseTheme(
    input.title,
    input.classification
  );

  switch (theme) {
    case 'theme':
      return 'Theme toggle click does not persist or apply a visible dark/light class on <html>.';
    case 'copy':
      return 'Visible homepage copy is duplicated or malformed (including skills wording).';
    case 'headers':
      return 'A required document security header is missing or incomplete.';
    case 'accessibility':
      return 'axe-core recorded a serious or critical accessibility finding on a public page.';
    case 'performance':
      return 'Measured page-load or first-party API timing exceeded the configured budget.';
    case 'auth':
      return 'Sign-in or member-route evidence is incomplete (locator, credentials, or session).';
    default:
      break;
  }

  if (input.classificationReason) {
    return input.classificationReason;
  }

  switch (input.classification) {
    case 'product-bug':
      return 'The application accepted the user interaction, but the expected functional state was not produced.';
    case 'automation-issue':
      return 'The Playwright expectation or locator no longer matches the current page.';
    case 'needs-investigation':
      return 'Automated evidence is not enough to confirm product vs automation vs environment.';
    case 'warning':
      return 'A non-blocking condition was detected without confirmed user impact.';
    default:
      return input.errorMessage
        ? truncateEvidence(input.errorMessage)
        : 'The failing test does not yet have a confirmed root cause.';
  }
}

export function heuristicRootCauseRecommendation(
  theme: RootCauseTheme
): string {
  switch (theme) {
    case 'theme':
      return 'Persist the selected theme and toggle a visible class on <html> when the control is clicked.';
    case 'copy':
      return 'Remove the duplicated or malformed homepage sentence; do not re-explore as a new bug.';
    case 'headers':
      return 'Add the missing document security header on the failing first-party HTML response.';
    case 'accessibility':
      return 'Fix the serious/critical axe finding (name, label, or contrast) on the public page.';
    case 'performance':
      return 'Investigate first-party page-load or API timing against config/security-performance.json.';
    case 'auth':
      return 'Use a visible password field, or add NATION_TEST_* / AI_SKILLS_TEST_* for member routes.';
    default:
      return 'Reproduce from the screenshot, trace and video before changing production.';
  }
}

function truncateEvidence(value: string, max = 220): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

function noteId(site: string, title: string, theme: RootCauseTheme): string {
  return `${site}:${theme}:${title}`.toLowerCase().slice(0, 120);
}

export function heuristicRootCauseNote(input: {
  id?: string;
  testId?: string;
  title: string;
  site: string;
  file: string;
  route: string;
  classification?: IssueClassification;
  errorMessage?: string;
  classificationReason?: string;
}): RootCauseNote {
  const theme = classifyRootCauseTheme(input.title, input.classification);
  const summary = heuristicRootCauseSummary(input);

  return {
    id: input.id ?? noteId(input.site, input.title, theme),
    testId: input.testId,
    title: input.title,
    site: input.site,
    file: input.file.replaceAll('\\', '/'),
    route: input.route || '—',
    theme,
    classification: input.classification,
    engine: 'heuristic',
    summary,
    evidence: truncateEvidence(
      input.classificationReason || input.errorMessage || input.title
    ),
    recommendation: heuristicRootCauseRecommendation(theme),
    confidence:
      theme === 'theme' || theme === 'copy' || theme === 'headers'
        ? 'high'
        : theme === 'other'
          ? 'low'
          : 'medium',
  };
}

export function buildHeuristicRootCauseNotes(input: {
  tests?: DashboardTestResult[];
  machineOwned?: MachineOwnedItem[];
  needsHuman?: NeedsHumanItem[];
}): RootCauseNote[] {
  const notes = new Map<string, RootCauseNote>();

  const add = (note: RootCauseNote): void => {
    const key = `${note.site}|${note.theme}|${note.title}`;
    if (!notes.has(key)) {
      notes.set(key, note);
    }
  };

  for (const test of input.tests ?? []) {
    if (test.status === 'passed' || test.status === 'skipped') {
      continue;
    }

    add(
      heuristicRootCauseNote({
        testId: test.id,
        title: test.title,
        site: test.site,
        file: test.file,
        route: inferLooseRoute(test),
        classification: test.classification,
        errorMessage: test.error?.message,
        classificationReason: test.classificationReason,
      })
    );
  }

  for (const item of input.machineOwned ?? []) {
    add(
      heuristicRootCauseNote({
        id: item.id,
        title: item.title,
        site: item.site,
        file: item.file,
        route: item.route,
        classification: item.classification,
        classificationReason: item.rootCause,
      })
    );
  }

  for (const item of input.needsHuman ?? []) {
    add(
      heuristicRootCauseNote({
        id: item.id,
        title: item.title,
        site: item.site,
        file: item.url,
        route: item.url,
        classification: 'needs-investigation',
        errorMessage: item.errorMessage,
        classificationReason: item.whyHuman,
      })
    );
  }

  const ranked = [...notes.values()].sort((left, right) => {
    const rank = (theme: RootCauseTheme): number => {
      switch (theme) {
        case 'theme':
          return 0;
        case 'copy':
          return 1;
        case 'headers':
          return 2;
        case 'accessibility':
          return 3;
        case 'auth':
          return 4;
        case 'performance':
          return 5;
        default:
          return 6;
      }
    };

    return rank(left.theme) - rank(right.theme) || left.title.localeCompare(right.title);
  });

  return ranked.slice(0, 12);
}

function inferLooseRoute(test: DashboardTestResult): string {
  const fromTitle = test.title.match(/\/[A-Za-z0-9\-/_]+/);
  if (fromTitle?.[0]) {
    return fromTitle[0];
  }

  const file = test.file.toLowerCase();
  if (file.includes('homepage') || file.includes('basic-user')) {
    return test.site === 'ai-skills' ? '/skills' : '/';
  }

  return '—';
}

export function attachRootCauseToMachineOwned(
  items: MachineOwnedItem[],
  notes: RootCauseNote[]
): MachineOwnedItem[] {
  return items.map(item => {
    const note =
      notes.find(
        candidate =>
          candidate.title === item.title && candidate.site === item.site
      ) ??
      heuristicRootCauseNote({
        title: item.title,
        site: item.site,
        file: item.file,
        route: item.route,
        classification: item.classification,
      });

    return {
      ...item,
      rootCause: item.rootCause ?? note.summary,
      rootCauseTheme: item.rootCauseTheme ?? note.theme,
    };
  });
}

function parseRootCauseJson(content: string): Array<{
  id?: string;
  summary?: string;
  recommendation?: string;
}> {
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');

  if (start < 0 || end <= start) {
    return [];
  }

  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as unknown;
    return Array.isArray(parsed)
      ? (parsed as Array<{ id?: string; summary?: string; recommendation?: string }>)
      : [];
  } catch {
    return [];
  }
}

export async function maybeEnrichRootCauseNotes(
  notes: RootCauseNote[],
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: FetchLike
): Promise<RootCauseNote[]> {
  if (notes.length === 0) {
    return notes;
  }

  const result = await completeLlmChat({
    system:
      'You refine QA root-cause notes. Reply JSON only: an array of objects with id, summary, recommendation. Do not invent failures. Keep uncertainty. No secrets.',
    user: JSON.stringify(
      notes.slice(0, 8).map(note => ({
        id: note.id,
        theme: note.theme,
        title: note.title,
        site: note.site,
        summary: note.summary,
        evidence: note.evidence,
      }))
    ),
    maxTokens: 500,
    env,
    fetchImpl,
  });

  if (!result.ok) {
    return notes;
  }

  const parsed = parseRootCauseJson(result.content);
  if (parsed.length === 0) {
    return notes;
  }

  return notes.map(note => {
    const match = parsed.find(item => item.id === note.id);
    if (!match?.summary) {
      return note;
    }

    return {
      ...note,
      engine: 'openai',
      summary: match.summary,
      recommendation: match.recommendation || note.recommendation,
    };
  });
}

export function attachRootCauseNotesToPack(
  pack: HumanReviewPack,
  tests?: DashboardTestResult[]
): HumanReviewPack {
  const notes = buildHeuristicRootCauseNotes({
    tests,
    machineOwned: pack.machineOwned,
    needsHuman: pack.needsHuman,
  });

  return {
    ...pack,
    machineOwned: attachRootCauseToMachineOwned(pack.machineOwned, notes),
    rootCauseNotes: notes,
  };
}
