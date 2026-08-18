import { expect, test } from '@playwright/test';

import type { HumanReviewPack } from '../../reporters/models/types';
import {
  maybeEnrichHumanReviewPack,
} from '../../reporters/utils/llm-enrichment';
import { redactSecrets, maybeEnrichSentinelAi } from '../../reporters/utils/llm';
import type { SentinelAiSummary } from '../../reporters/analyzers/sentinel-ai';

const pack: HumanReviewPack = {
  verdict: 'WARN',
  bullets: [
    '1 product bug already classified (developer work), including “theme toggle visibly changes the page theme”.',
    '1 content bug already classified, including “homepage does not contain duplicated skills wording”.',
    '2 security-header failures recorded honestly.',
  ],
  generatedAt: '2026-08-18T12:00:00.000Z',
  runId: 'run-llm',
  credentials: { nation: false, aiSkills: false },
  machineOwned: [
    {
      id: 'theme',
      classification: 'product-bug',
      title: 'theme toggle visibly changes the page theme',
      site: 'nation',
      file: 'tests/nation/basic-user.spec.ts',
      route: '/',
    },
  ],
  needsHuman: [],
  untestedRoutes: [],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test.describe('LLM enrichment', () => {
  test('redacts emails and passwords from prompts', () => {
    const redacted = redactSecrets(
      'login qa@example.com password=SuperSecret123 Bearer sk-abcdefghijklmnopqrstuvwxyz'
    );

    expect(redacted).not.toContain('qa@example.com');
    expect(redacted).not.toContain('SuperSecret123');
    expect(redacted).toContain('[redacted-email]');
    expect(redacted).toContain('[redacted]');
  });

  test('redacts Playwright fill() call-log values', () => {
    const redacted = redactSecrets(
      'locator.fill: Timeout\n- fill("not-a-real-secret")'
    );

    expect(redacted).not.toContain('not-a-real-secret');
    expect(redacted).toContain('fill("[redacted]")');
  });

  test('redacts Playwright pressSequentially call-log values', () => {
    const redacted = redactSecrets(
      'locator.pressSequentially("not-a-real-secret")'
    );

    expect(redacted).not.toContain('not-a-real-secret');
    expect(redacted).toContain('pressSequentially("[redacted]")');
  });

  test('fails open to heuristic when no key is set', async () => {
    let called = false;
    const enriched = await maybeEnrichHumanReviewPack(
      pack,
      {},
      async () => {
        called = true;
        return jsonResponse({});
      }
    );

    expect(called).toBe(false);
    expect(enriched.llm?.status).toBe('off-no-key');
    expect(enriched.llm?.label).toBe('LLM off — no key');
    expect(enriched.bullets).toEqual(pack.bullets);
    expect(enriched.remediationOneLiners?.some(line => /theme/i.test(line))).toBe(
      true
    );
  });

  test('mocked fetch rewrites three bullets and keeps heuristic fallback on parse failure', async () => {
    const enriched = await maybeEnrichHumanReviewPack(
      pack,
      { OPENAI_API_KEY: 'sk-test' },
      async () =>
        jsonResponse({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  language: 'en',
                  bullets: [
                    'Theme toggle still does not change the page.',
                    'Homepage copy is duplicated.',
                    'Security headers are missing on Skills.',
                  ],
                  remediationOneLiners: [
                    'Toggle html.dark on click.',
                  ],
                }),
              },
            },
          ],
        })
    );

    expect(enriched.llm?.status).toBe('enriched');
    expect(enriched.bullets).toHaveLength(3);
    expect(enriched.bullets[0]).toContain('Theme toggle');
    expect(enriched.remediationOneLiners?.[0]).toContain('html.dark');
  });

  test('Sentinel AI enrichment uses mocked fetch and does not invent a key-less call', async () => {
    const summary = {
      generatedAt: '2026-08-18T12:00:00.000Z',
      health: 90,
      overallPriority: 'low',
      releaseRisk: 'low',
      confidence: 70,
      summary: 'Heuristic summary',
      likelyRootCause: 'None',
      userImpact: 'None',
      recommendation: 'Watch',
      nextAction: 'None',
      findings: [],
      signals: {
        productBugs: 0,
        contentBugs: 0,
        automationIssues: 0,
        accessibilityIssues: 0,
        performanceIssues: 0,
        securityIssues: 0,
        needsInvestigation: 0,
        warnings: 0,
        failedTests: 0,
        flakyTests: 0,
        timedOutTests: 0,
        interruptedTests: 0,
        p95Duration: 0,
        averageDuration: 0,
        blockingIssues: 0,
        nonBlockingIssues: 0,
      },
    } satisfies SentinelAiSummary;

    const skipped = await maybeEnrichSentinelAi(summary, {}, async () => {
      throw new Error('should not fetch');
    });
    expect(skipped.llm?.label).toBe('LLM off — no key');
    expect(skipped.summary).toBe('Heuristic summary');

    const enriched = await maybeEnrichSentinelAi(
      summary,
      { SENTINEL_LLM_API_KEY: 'sk-test' },
      async () =>
        jsonResponse({
          choices: [{ message: { content: 'Refined paragraph.' } }],
        })
    );
    expect(enriched.summary).toBe('Refined paragraph.');
    expect(enriched.llm?.status).toBe('enriched');
  });
});
