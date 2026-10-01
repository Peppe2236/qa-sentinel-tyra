import { test, expect } from '@playwright/test';
import { assessCoverage, requiredSessionsVerified } from '../../scripts/lib/qa-coverage.mjs';
const scope = {
  expectedProjects: ['ai-skills-auth-setup', 'ai-skills-chromium', 'dev-nation-chromium'],
  expectedExecutions: 5,
  projectDetails: [
    { name: 'ai-skills-auth-setup', expectedExecutions: 1, dependencies: [] },
    { name: 'ai-skills-chromium', expectedExecutions: 3, dependencies: ['ai-skills-auth-setup'] },
    { name: 'dev-nation-chromium', expectedExecutions: 1, dependencies: [] },
  ],
};
const auth = [{ name: 'AI Skills session', statePath: 'playwright/.auth/ai-skills.json', status: 'NOT_VERIFIED', verified: false }];

test('failed setup links blocked project to real dependency; skipped rows do not count', () => {
  const result = assessCoverage(scope, [
    { id: 'setup', project: 'ai-skills-auth-setup', status: 'failed' },
    ...['a','b','c'].map(id => ({ id, project: 'ai-skills-chromium', status: 'skipped' })),
    { id: 'dev', project: 'dev-nation-chromium', status: 'passed' },
  ], auth);
  expect(result.actualExecutions).toBe(2);
  expect(result.missingExecutions).toBe(3);
  expect(result.missingProjects).toEqual(['ai-skills-chromium']);
  expect(result.incompleteProjects[0]).toMatchObject({ status: 'BLOCKED', missingExecutions: 3, skippedExecutions: 3 });
  expect(result.incompleteProjects[0].cause).toContain('ai-skills-auth-setup');
});

test('retries never fill another missing planned execution', () => {
  const result = assessCoverage(scope, [
    { id: 'a', project: 'ai-skills-chromium', status: 'failed', retry: 0 },
    { id: 'a', project: 'ai-skills-chromium', status: 'passed', retry: 1 },
  ]);
  expect(result.actualExecutions).toBe(1);
  expect(result.retryAttempts).toBe(1);
  expect(result.incompleteProjects.find(p => p.project === 'ai-skills-chromium').missingExecutions).toBe(2);
});

test('unverified preflight alone gives a possible cause, not a confirmed blocked dependency', () => {
  const result = assessCoverage(scope, [], auth);
  const skills = result.incompleteProjects.find(p => p.project === 'ai-skills-chromium');
  expect(skills.status).toBe('NOT_EXECUTED');
  expect(skills.cause).toContain('Possible cause');
  expect(result.incompleteProjects.find(p => p.project === 'dev-nation-chromium').cause).not.toContain('AI Skills');
});

test('product failures remain executed evidence', () => {
  const results = scope.projectDetails.flatMap(p => Array.from({ length: p.expectedExecutions }, (_, i) => ({
    id: `${p.name}-${i}`, project: p.name, status: 'failed',
  })));
  const result = assessCoverage(scope, results);
  expect(result.actualExecutions).toBe(5);
  expect(result.incompleteProjects).toEqual([]);
  expect(result.missingProjects).toEqual([]);
});

test('coverage follows actual configured names and transitive dependencies', () => {
  const result = assessCoverage({ expectedExecutions: 8, expectedProjects: ['custom-mobile'], projectDetails: [
    { name: 'custom-mobile', dependencies: ['intermediate'], expectedExecutions: 8 },
    { name: 'intermediate', dependencies: ['ai-skills-auth-setup'], expectedExecutions: 1 },
  ] }, [], auth);
  expect(result.incompleteProjects[0].dependencies).toContain('ai-skills-auth-setup');
  expect(result.incompleteProjects[0].action).toContain('auth:skills:refresh:manual');
});

test('repeated planned executions are distinct while unrelated projects cannot fill gaps', () => {
  const result = assessCoverage(scope, [
    { id: 'a', project: 'ai-skills-chromium', repeatEachIndex: 0, status: 'passed' },
    { id: 'a', project: 'ai-skills-chromium', repeatEachIndex: 1, status: 'passed' },
    { id: 'unexpected', project: 'not-in-this-scope', status: 'passed' },
  ]);
  expect(result.actualExecutions).toBe(2);
  expect(result.missingExecutions).toBe(3);
});

test('Nation Dev gaps recommend its own refresh command', () => {
  const result = assessCoverage({ expectedProjects: ['nation-dev-mobile'], expectedExecutions: 2,
    projectDetails: [{ name: 'nation-dev-mobile', dependencies: ['nation-dev-auth-setup'], expectedExecutions: 2 }] }, [],
    [{ siteId: 'nation-dev', name: 'Nation Dev session', status: 'NOT_VERIFIED', verified: false }]);
  expect(result.incompleteProjects[0].action).toContain('node scripts/auth-refresh.mjs nation-dev');
  expect(result.incompleteProjects[0].action).not.toContain('auth:skills');
});

test('all three exact required sessions must be verified', () => {
  const targets = ['https://nation.dev/home', 'https://aiskills.nation.dev/my-pathway', 'https://dev.nation.dev/profile'];
  const checks = targets.map(target => ({ target, status: 'VERIFIED', verified: true }));
  expect(requiredSessionsVerified(checks, targets)).toBe(true);
  expect(requiredSessionsVerified(checks.slice(0, 2), targets)).toBe(false);
  expect(requiredSessionsVerified([...checks.slice(0, 2), { ...checks[2], verified: false }], targets)).toBe(false);
  expect(requiredSessionsVerified([...checks.slice(0, 2), checks[0]], targets)).toBe(false);
});
