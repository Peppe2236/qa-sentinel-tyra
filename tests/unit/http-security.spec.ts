import { expect, test } from '@playwright/test';

import { classifyIssue } from '../../reporters/analyzers/sentinel-classifier';
import { analyzeSecurityPerformance } from '../../reporters/analyzers/sentinel-security-performance';
import type { DashboardTestResult } from '../../reporters/models/types';
import {
  assessDocumentSecurity,
  assessStoredSessionCookies,
  findingFor,
  headerFindings,
  parseSetCookie,
} from '../../reporters/utils/http-security';
import { loadSecurityPerformanceConfig } from '../../reporters/utils/security-performance-config';

function sampleTest(
  overrides: Partial<DashboardTestResult>
): DashboardTestResult {
  return {
    id: 'sec-1',
    title: 'sample',
    fullTitle: 'sample',
    status: 'passed',
    duration: 100,
    retries: 0,
    project: 'nation-chromium',
    file: 'tests/nation/security-headers.spec.ts',
    line: 1,
    tags: [],
    annotations: [],
    errors: [],
    attachments: [],
    qualityDimensions: ['security-performance'],
    ...overrides,
  } as DashboardTestResult;
}

test.describe('HTTP security header classification', () => {
  test('does not invent missing CSP, HSTS or clickjacking headers', () => {
    const assessment = assessDocumentSecurity({}, []);
    const findings = headerFindings('homepage', {}, []);

    expect(assessment.csp.present).toBe(false);
    expect(assessment.hsts.present).toBe(false);
    expect(assessment.xContentTypeOptions.present).toBe(false);
    expect(assessment.clickjackingProtected).toBe(false);
    expect(findingFor(findings, 'csp').passed).toBe(false);
    expect(findingFor(findings, 'hsts').passed).toBe(false);
    expect(findingFor(findings, 'clickjacking').passed).toBe(false);
    expect(findingFor(findings, 'csp').message).toMatch(/not invented/i);
  });

  test('records present headers honestly including CSP frame-ancestors without X-Frame-Options', () => {
    const headers = {
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
      'strict-transport-security': 'max-age=31536000',
      'x-content-type-options': 'nosniff',
    };
    const assessment = assessDocumentSecurity(headers, []);
    const findings = headerFindings('sign-in', headers, []);

    expect(assessment.csp.present).toBe(true);
    expect(assessment.cspHasFrameAncestors).toBe(true);
    expect(assessment.xFrameOptions.present).toBe(false);
    expect(assessment.clickjackingProtected).toBe(true);
    expect(findingFor(findings, 'csp').passed).toBe(true);
    expect(findingFor(findings, 'hsts').passed).toBe(true);
    expect(findingFor(findings, 'x-content-type-options').passed).toBe(true);
    expect(findingFor(findings, 'clickjacking').passed).toBe(true);
    expect(findingFor(findings, 'clickjacking').message).toMatch(
      /frame-ancestors/i
    );
  });

  test('treats X-Content-Type-Options without nosniff as a failure', () => {
    const findings = headerFindings(
      'homepage',
      { 'x-content-type-options': 'nosniff, something-else' },
      []
    );

    expect(findingFor(findings, 'x-content-type-options').passed).toBe(false);
  });

  test('no Set-Cookie is not-observed rather than poor', () => {
    const assessment = assessDocumentSecurity(
      { 'strict-transport-security': 'max-age=1' },
      []
    );
    const finding = findingFor(
      headerFindings('homepage', {}, []),
      'cookies'
    );

    expect(assessment.cookieObservation).toBe('not-observed');
    expect(finding.passed).toBe(true);
    expect(finding.message).toMatch(/not-observed, not poor/i);
  });

  test('Set-Cookie missing Secure HttpOnly or SameSite fails honestly', () => {
    const parsed = parseSetCookie('session=abc; Path=/');
    const assessment = assessDocumentSecurity({}, ['session=abc; Path=/']);
    const finding = findingFor(
      headerFindings('sign-in', {}, ['session=abc; Path=/']),
      'cookies'
    );

    expect(parsed.missingFlags).toEqual(['Secure', 'HttpOnly', 'SameSite']);
    expect(assessment.cookieObservation).toBe('flags-missing');
    expect(finding.passed).toBe(false);
    expect(finding.message).toMatch(/Secure/i);
  });

  test('complete cookie flags pass', () => {
    const raw =
      'sid=xyz; Path=/; Secure; HttpOnly; SameSite=Lax';
    const parsed = parseSetCookie(raw);
    const finding = findingFor(
      headerFindings('sign-in', {}, [raw]),
      'cookies'
    );

    expect(parsed.missingFlags).toEqual([]);
    expect(finding.passed).toBe(true);
  });

  test('stored session cookies missing flags fail without printing values', () => {
    const finding = assessStoredSessionCookies('Nation session', [
      {
        name: 'sid',
        secure: false,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    expect(finding.passed).toBe(false);
    expect(finding.message).toMatch(/sid missing Secure/i);
    expect(finding.message).not.toMatch(/=/);
  });

  test('stored session cookies with complete flags pass', () => {
    const finding = assessStoredSessionCookies('Nation session', [
      {
        name: 'sid',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    expect(finding.passed).toBe(true);
  });

  test('analytics cookies are not treated as the only session evidence', () => {
    const finding = assessStoredSessionCookies('Nation session', [
      {
        name: '_ga',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
      },
    ]);

    expect(finding.passed).toBe(false);
    expect(finding.message).toMatch(/no session cookie was observed/i);
  });

  test('session-cookies without Set-Cookie stay not-observed, not poor', () => {
    const assessment = analyzeSecurityPerformance(
      [
        sampleTest({
          id: 'cookie-home',
          category: 'security',
          annotations: [
            { type: 'security-area', description: 'session-cookies' },
            { type: 'security-observation', description: 'not-observed' },
          ],
        }),
      ],
      [],
      {},
      loadSecurityPerformanceConfig()
    );
    const cookies = assessment.security.areas.find(
      area => area.area === 'session-cookies'
    );

    expect(cookies?.status).toBe('not-observed');
    expect(cookies?.issueCount).toBe(0);
    expect(assessment.security.status).not.toBe('poor');
    expect(assessment.status).not.toBe('poor');
  });

  test('missing CSP evidence degrades that area instead of inventing a pass', () => {
    const assessment = analyzeSecurityPerformance(
      [],
      [
        {
          source: 'test',
          category: 'security',
          severity: 'medium',
          classification: 'security-issue',
          title: 'homepage document includes Content-Security-Policy',
          evidence:
            'Content-Security-Policy was not present. Absence is recorded as a finding; the header was not invented.',
        },
      ],
      {},
      loadSecurityPerformanceConfig()
    );
    const csp = assessment.security.areas.find(
      area => area.area === 'content-security-policy'
    );

    expect(csp?.status).toBe('degraded');
    expect(csp?.issueCount).toBe(1);
    expect(csp?.status).not.toBe('healthy');
  });

  test('classifies missing security header failures as security-issue', () => {
    const classified = classifyIssue(
      sampleTest({
        title: 'homepage document includes Content-Security-Policy',
        status: 'failed',
        category: 'security',
        error: {
          message:
            'homepage: Content-Security-Policy was not present. Absence is recorded as a finding; the header was not invented.',
        },
      })
    );

    expect(classified.classification).toBe('security-issue');
  });
});
