import type {
  HumanReviewPack,
  IssueCluster,
} from '../models/types';
import {
  completeLlmChat,
  llmStatusFromEnv,
  type FetchLike,
} from './llm';

export type ReportLanguage = 'en' | 'sv';

const SWEDISH_HINT =
  /[åäöÅÄÖ]|\b(och|för|inte|fel|testkonto|rubrik|tema)\b/i;

export function detectReportLanguage(
  pack: Pick<HumanReviewPack, 'bullets' | 'machineOwned' | 'needsHuman'>
): ReportLanguage {
  const sample = [
    ...(pack.bullets ?? []),
    ...(pack.machineOwned ?? []).map(item => item.title),
    ...(pack.needsHuman ?? []).map(item => item.title),
  ].join(' ');

  return SWEDISH_HINT.test(sample) ? 'sv' : 'en';
}

export function clusterHumanReviewIssues(
  pack: HumanReviewPack
): IssueCluster[] {
  const groups = new Map<string, string[]>();

  const add = (label: string, title: string): void => {
    const existing = groups.get(label) ?? [];
    existing.push(title);
    groups.set(label, existing);
  };

  for (const item of pack.machineOwned) {
    add(item.classification, item.title);
  }

  for (const item of pack.needsHuman) {
    add('needs-human', item.title);
  }

  for (const item of pack.untestedRoutes) {
    add('untested-route', item.pathname);
  }

  return [...groups.entries()].map(([label, titles]) => ({
    label,
    count: titles.length,
    titles: titles.slice(0, 8),
  }));
}

export function heuristicRemediationOneLiners(
  pack: HumanReviewPack
): string[] {
  const lines: string[] = [];

  for (const item of pack.machineOwned) {
    if (item.title.toLowerCase().includes('theme toggle')) {
      lines.push(
        'Theme toggle: persist and apply a visible dark/light class on <html> when the control is clicked.'
      );
      continue;
    }

    if (
      item.title.toLowerCase().includes('duplicated') ||
      item.classification === 'content-bug'
    ) {
      lines.push(
        `Copy: remove the duplicated homepage sentence around “${item.title}”.`
      );
      continue;
    }

    if (item.classification === 'security-issue') {
      lines.push(
        `Headers: add the missing document security header for ${item.site} ${item.route}.`
      );
    }
  }

  if (!pack.credentials.nation || !pack.credentials.aiSkills) {
    lines.push(
      'Auth: add a disposable QA account so /home /jobs /profile /assessment can be measured.'
    );
  }

  return [...new Set(lines)].slice(0, 6);
}

function parseEnrichmentJson(content: string): {
  bullets?: string[];
  remediationOneLiners?: string[];
  language?: string;
} | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');

  if (start < 0 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(content.slice(start, end + 1)) as {
      bullets?: string[];
      remediationOneLiners?: string[];
      language?: string;
    };
  } catch {
    return null;
  }
}

export async function maybeEnrichHumanReviewPack(
  pack: HumanReviewPack,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: FetchLike
): Promise<HumanReviewPack> {
  const language = detectReportLanguage(pack);
  const clusters = clusterHumanReviewIssues(pack);
  const heuristicLines = heuristicRemediationOneLiners(pack);
  const llm = llmStatusFromEnv(env);

  const baseline: HumanReviewPack = {
    ...pack,
    llm: {
      status: llm.status,
      label: llm.label,
      engine: llm.engine,
      language,
    },
    issueClusters: clusters,
    remediationOneLiners: heuristicLines,
  };

  if (llm.status === 'off-no-key') {
    return {
      ...baseline,
      llm: {
        status: 'off-no-key',
        label: 'LLM off — no key',
        engine: 'heuristic',
        language,
      },
    };
  }

  const result = await completeLlmChat({
    system:
      `You enrich a QA human-review pack. Reply JSON only with keys bullets (exactly 3 strings), remediationOneLiners (max 6 short strings), language ("${language}"). Do not invent failures. Do not include secrets, emails, or passwords. Write in ${language === 'sv' ? 'Swedish' : 'English'}.`,
    user: JSON.stringify({
      verdict: pack.verdict,
      bullets: pack.bullets,
      clusters,
      machineOwned: pack.machineOwned.map(item => ({
        classification: item.classification,
        title: item.title,
        site: item.site,
        file: item.file,
      })),
      needsHuman: pack.needsHuman.map(item => item.title),
      untestedRoutes: pack.untestedRoutes.map(item => item.pathname),
    }),
    maxTokens: 400,
    env,
    fetchImpl,
  });

  if (!result.ok) {
    return {
      ...baseline,
      llm: {
        status: result.label === 'LLM off — no key' ? 'off-no-key' : 'error',
        label: result.label,
        engine: 'heuristic',
        language,
      },
    };
  }

  const parsed = parseEnrichmentJson(result.content);
  const bullets = parsed?.bullets?.filter(Boolean).slice(0, 3);
  const oneLiners = parsed?.remediationOneLiners
    ?.filter(Boolean)
    .slice(0, 6);

  return {
    ...baseline,
    bullets: bullets?.length === 3 ? bullets : pack.bullets,
    remediationOneLiners: oneLiners?.length ? oneLiners : heuristicLines,
    llm: {
      status: 'enriched',
      label: 'LLM enriched — heuristic still recorded',
      engine: 'openai',
      language,
    },
  };
}
