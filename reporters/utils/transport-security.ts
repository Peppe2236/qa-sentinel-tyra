import type {
  SecurityArea,
  Severity,
} from '../models/types';

export interface TransportFinding {
  id:
    | 'mixed-content'
    | 'https-links';
  passed: boolean;
  severity: Severity;
  securityAreas: SecurityArea[];
  message: string;
}

const SKIP_HREF_PREFIXES = [
  'mailto:',
  'tel:',
  'javascript:',
  'data:',
  'blob:',
];

export function isInsecureHttpUrl(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  try {
    return new URL(trimmed).protocol === 'http:';
  } catch {
    return /^http:\/\//i.test(trimmed);
  }
}

export function uniqueUrls(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

export function mixedContentFinding(
  pageLabel: string,
  requestUrls: string[]
): TransportFinding {
  const insecure = uniqueUrls(requestUrls).filter(isInsecureHttpUrl);

  if (insecure.length === 0) {
    return {
      id: 'mixed-content',
      passed: true,
      severity: 'info',
      securityAreas: ['transport'],
      message: `${pageLabel}: no http: subresource requests were observed on this HTTPS page.`,
    };
  }

  const preview = insecure.slice(0, 5).join('; ');
  const extra =
    insecure.length > 5 ? ` (+${insecure.length - 5} more)` : '';

  return {
    id: 'mixed-content',
    passed: false,
    severity: 'medium',
    securityAreas: ['transport'],
    message: `${pageLabel}: mixed content — ${insecure.length} http: request(s) on an HTTPS page: ${preview}${extra}.`,
  };
}

export function isAllowedHomepageHref(href: string): boolean {
  const trimmed = href.trim();

  if (!trimmed) {
    return true;
  }

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('?') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return true;
  }

  const lower = trimmed.toLowerCase();

  if (SKIP_HREF_PREFIXES.some(prefix => lower.startsWith(prefix))) {
    return true;
  }

  if (lower.startsWith('https://')) {
    return true;
  }

  if (lower.startsWith('http://')) {
    return false;
  }

  return true;
}

export function httpsLinkFinding(
  pageLabel: string,
  hrefs: string[]
): TransportFinding {
  const insecure = uniqueUrls(hrefs).filter(
    href => !isAllowedHomepageHref(href)
  );

  if (insecure.length === 0) {
    return {
      id: 'https-links',
      passed: true,
      severity: 'info',
      securityAreas: ['transport'],
      message: `${pageLabel}: homepage links are relative, https, or non-web (mailto/tel). No http: hrefs were observed.`,
    };
  }

  const preview = insecure.slice(0, 5).join('; ');
  const extra =
    insecure.length > 5 ? ` (+${insecure.length - 5} more)` : '';

  return {
    id: 'https-links',
    passed: false,
    severity: 'medium',
    securityAreas: ['transport'],
    message: `${pageLabel}: ${insecure.length} http: link(s) on the homepage: ${preview}${extra}.`,
  };
}

export function findingForTransport(
  findings: TransportFinding[],
  id: TransportFinding['id']
): TransportFinding {
  const finding = findings.find(item => item.id === id);

  if (!finding) {
    throw new Error(`Missing transport finding: ${id}`);
  }

  return finding;
}
