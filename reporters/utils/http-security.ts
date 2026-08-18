import type {
  SecurityArea,
  Severity,
} from '../models/types';

export type CookieFlagName =
  | 'Secure'
  | 'HttpOnly'
  | 'SameSite';

export interface ParsedSetCookie {
  raw: string;
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  missingFlags: CookieFlagName[];
}

export interface HeaderPresence {
  header: string;
  present: boolean;
  value?: string;
}

export interface SecurityHeaderAssessment {
  csp: HeaderPresence;
  hsts: HeaderPresence;
  xContentTypeOptions: HeaderPresence;
  xFrameOptions: HeaderPresence;
  cspHasFrameAncestors: boolean;
  clickjackingProtected: boolean;
  cookies: ParsedSetCookie[];
  cookieObservation:
    | 'not-observed'
    | 'flags-ok'
    | 'flags-missing';
}

export interface HeaderFinding {
  id:
    | 'csp'
    | 'hsts'
    | 'x-content-type-options'
    | 'clickjacking'
    | 'cookies';
  passed: boolean;
  severity: Severity;
  securityAreas: SecurityArea[];
  message: string;
}

function headerValue(
  headers: Record<string, string>,
  name: string
): string | undefined {
  const wanted = name.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== wanted) {
      continue;
    }

    const trimmed = String(value ?? '').trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function presence(
  headers: Record<string, string>,
  name: string
): HeaderPresence {
  const value = headerValue(headers, name);

  return value
    ? {
        header: name,
        present: true,
        value,
      }
    : {
        header: name,
        present: false,
      };
}

export function parseSetCookie(
  raw: string
): ParsedSetCookie {
  const parts = raw
    .split(';')
    .map(part => part.trim())
    .filter(Boolean);

  const [nameValue = ''] = parts;
  const separator = nameValue.indexOf('=');
  const name =
    separator === -1
      ? nameValue
      : nameValue.slice(0, separator).trim();

  let secure = false;
  let httpOnly = false;
  let sameSite: string | undefined;

  for (const part of parts.slice(1)) {
    const flagSeparator = part.indexOf('=');
    const flagName = (
      flagSeparator === -1
        ? part
        : part.slice(0, flagSeparator)
    )
      .trim()
      .toLowerCase();
    const flagValue =
      flagSeparator === -1
        ? ''
        : part.slice(flagSeparator + 1).trim();

    if (flagName === 'secure') {
      secure = true;
    } else if (flagName === 'httponly') {
      httpOnly = true;
    } else if (flagName === 'samesite' && flagValue) {
      sameSite = flagValue;
    }
  }

  const missingFlags: CookieFlagName[] = [];

  if (!secure) {
    missingFlags.push('Secure');
  }

  if (!httpOnly) {
    missingFlags.push('HttpOnly');
  }

  if (!sameSite) {
    missingFlags.push('SameSite');
  }

  return {
    raw,
    name: name || '(unnamed)',
    secure,
    httpOnly,
    sameSite,
    missingFlags,
  };
}

export function cspHasFrameAncestors(
  csp: string | undefined
): boolean {
  if (!csp) {
    return false;
  }

  return /(?:^|;)\s*frame-ancestors\b/i.test(csp);
}

export function xContentTypeOptionsIsNosniff(
  value: string | undefined
): boolean {
  return String(value ?? '')
    .trim()
    .toLowerCase() === 'nosniff';
}

export function assessDocumentSecurity(
  headers: Record<string, string>,
  setCookies: string[] = []
): SecurityHeaderAssessment {
  const csp = presence(headers, 'content-security-policy');
  const hsts = presence(headers, 'strict-transport-security');
  const xContentTypeOptions = presence(
    headers,
    'x-content-type-options'
  );
  const xFrameOptions = presence(headers, 'x-frame-options');
  const frameAncestors = cspHasFrameAncestors(csp.value);
  const cookies = setCookies
    .map(value => value.trim())
    .filter(Boolean)
    .map(parseSetCookie);

  let cookieObservation: SecurityHeaderAssessment['cookieObservation'];

  if (cookies.length === 0) {
    cookieObservation = 'not-observed';
  } else if (cookies.every(cookie => cookie.missingFlags.length === 0)) {
    cookieObservation = 'flags-ok';
  } else {
    cookieObservation = 'flags-missing';
  }

  return {
    csp,
    hsts,
    xContentTypeOptions,
    xFrameOptions,
    cspHasFrameAncestors: frameAncestors,
    clickjackingProtected:
      xFrameOptions.present || frameAncestors,
    cookies,
    cookieObservation,
  };
}

function observedNames(
  headers: Record<string, string>
): string {
  const names = Object.keys(headers)
    .map(name => name.toLowerCase())
    .sort();

  return names.length > 0
    ? names.join(', ')
    : '(none)';
}

export function headerFindings(
  pageLabel: string,
  headers: Record<string, string>,
  setCookies: string[] = []
): HeaderFinding[] {
  const assessment = assessDocumentSecurity(headers, setCookies);
  const headerList = observedNames(headers);

  const cspPassed = assessment.csp.present;
  const hstsPassed = assessment.hsts.present;
  const xctoPassed = xContentTypeOptionsIsNosniff(
    assessment.xContentTypeOptions.value
  );
  const clickjackingPassed = assessment.clickjackingProtected;

  const findings: HeaderFinding[] = [
    {
      id: 'csp',
      passed: cspPassed,
      severity: 'medium',
      securityAreas: ['content-security-policy'],
      message: cspPassed
        ? `${pageLabel}: Content-Security-Policy is present.`
        : `${pageLabel}: Content-Security-Policy was not present. Observed headers: ${headerList}. Absence is recorded as a finding; the header was not invented.`,
    },
    {
      id: 'hsts',
      passed: hstsPassed,
      severity: 'medium',
      securityAreas: ['security-headers'],
      message: hstsPassed
        ? `${pageLabel}: Strict-Transport-Security is present.`
        : `${pageLabel}: Strict-Transport-Security was not present. Observed headers: ${headerList}. Absence is recorded as a finding; the header was not invented.`,
    },
    {
      id: 'x-content-type-options',
      passed: xctoPassed,
      severity: 'medium',
      securityAreas: ['security-headers'],
      message: xctoPassed
        ? `${pageLabel}: X-Content-Type-Options is nosniff.`
        : assessment.xContentTypeOptions.present
          ? `${pageLabel}: X-Content-Type-Options was present but not nosniff (value: ${assessment.xContentTypeOptions.value}).`
          : `${pageLabel}: X-Content-Type-Options was not present. Observed headers: ${headerList}. Absence is recorded as a finding; the header was not invented.`,
    },
    {
      id: 'clickjacking',
      passed: clickjackingPassed,
      severity: 'medium',
      securityAreas: ['security-headers'],
      message: clickjackingPassed
        ? assessment.xFrameOptions.present
          ? `${pageLabel}: X-Frame-Options is present.`
          : `${pageLabel}: CSP frame-ancestors is present.`
        : `${pageLabel}: neither X-Frame-Options nor CSP frame-ancestors was present. Observed headers: ${headerList}. Absence is recorded as a finding; the headers were not invented.`,
    },
  ];

  if (assessment.cookieObservation === 'not-observed') {
    findings.push({
      id: 'cookies',
      passed: true,
      severity: 'info',
      securityAreas: ['session-cookies'],
      message: `${pageLabel}: no Set-Cookie was observed. Cookie flags are not-observed, not poor.`,
    });
  } else if (assessment.cookieObservation === 'flags-ok') {
    findings.push({
      id: 'cookies',
      passed: true,
      severity: 'info',
      securityAreas: ['session-cookies'],
      message: `${pageLabel}: observed Set-Cookie headers include Secure, HttpOnly and SameSite.`,
    });
  } else {
    const details = assessment.cookies
      .filter(cookie => cookie.missingFlags.length > 0)
      .map(
        cookie =>
          `${cookie.name} missing ${cookie.missingFlags.join(', ')}`
      )
      .join('; ');

    findings.push({
      id: 'cookies',
      passed: false,
      severity: 'medium',
      securityAreas: ['session-cookies'],
      message: `${pageLabel}: Set-Cookie flags are incomplete (${details}).`,
    });
  }

  return findings;
}

export function findingFor(
  findings: HeaderFinding[],
  id: HeaderFinding['id']
): HeaderFinding {
  const finding = findings.find(item => item.id === id);

  if (!finding) {
    throw new Error(`Missing security finding: ${id}`);
  }

  return finding;
}
