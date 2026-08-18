import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  autonomousPolicySummary,
  snapshotQaPolicy,
} from '../../config/policy';
import { llmStatusFromEnv, withLlmStatus } from '../../reporters/utils/llm';
import type { SentinelAiSummary } from '../../reporters/analyzers/sentinel-ai';

test.describe('QA policy snapshot', () => {
  test('read-only analysis is on and production writes stay disabled by policy', () => {
    const policy = snapshotQaPolicy({
      QA_AUTONOMOUS_EXECUTION: 'true',
      QA_PRODUCTION_WRITES: 'true',
      QA_CLICK_CAPTCHA: 'true',
    });

    expect(policy.analysis).toBe('enabled');
    expect(policy.autonomousExecution).toBe('disabled-by-policy');
    expect(policy.productionWrites).toBe('disabled-by-policy');
    expect(policy.captchaClick).toBe('first-party-consent');
    expect(policy.autonomousRemediationReports).toBe('enabled');
    expect(policy.githubIssues).toBe('disabled-by-policy');
    expect(policy.flags.QA_PRODUCTION_WRITES).toBe(false);
    expect(policy.flags.QA_CLICK_CAPTCHA).toBe(false);
    expect(policy.flags.QA_FIRST_PARTY_CONSENT).toBe(true);
    expect(policy.flags.QA_AUTONOMOUS_REMEDIATION).toBe(true);
    expect(policy.llm).toBe('off-no-key');
    expect(autonomousPolicySummary(policy)).toMatch(/production writes/i);
  });

  test('LLM off — no key when neither env key is set', () => {
    const llm = llmStatusFromEnv({});

    expect(llm.status).toBe('off-no-key');
    expect(llm.label).toBe('LLM off — no key');
    expect(llm.engine).toBe('heuristic');
  });

  test('heuristic summary keeps LLM off — no key without calling a model', () => {
    const summary = withLlmStatus(
      {
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
      } satisfies SentinelAiSummary,
      {}
    );

    expect(summary.llm?.label).toBe('LLM off — no key');
    expect(summary.summary).toBe('Heuristic summary');
  });
});

test.describe('unattended matrix wiring', () => {
  test('qa:unattended scans both sites and lists all 18 Playwright projects', () => {
    const script = fs.readFileSync(
      path.resolve(process.cwd(), 'scripts/qa-unattended.mjs'),
      'utf8'
    );
    const cli = fs.readFileSync(
      path.resolve(process.cwd(), 'scripts/qa-cli.mjs'),
      'utf8'
    );

    expect(cli).toContain('nation-firefox-desktop');
    expect(cli).toContain('nation-webkit-mobile');
    expect(cli).toContain('ai-skills-chromium-tablet');
    expect(script).toContain('scanNation');
    expect(script).toContain('scanSkills');
    expect(script).toContain('MATRIX_PROJECTS');
    expect(script).not.toContain('tests/nation');
    expect(script).toContain('chromium firefox webkit');
  });

  test('qa:sites stays Chromium-only and points to qa:unattended for the matrix', () => {
    const script = fs.readFileSync(
      path.resolve(process.cwd(), 'scripts/qa-sites.mjs'),
      'utf8'
    );

    expect(script).toContain('DAILY_CHROMIUM_PROJECTS');
    expect(script).toContain('qa:unattended');
    expect(script).not.toContain('nation-firefox-desktop');
  });
});
