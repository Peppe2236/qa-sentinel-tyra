import type { IssueClassification, Severity } from '../models/types';

export type DiscoverySignalKind =
  | 'analytics-csp'
  | 'aborted-media'
  | 'rsc-prefetch'
  | 'missing-route'
  | 'aborted-navigation'
  | 'product-network'
  | 'other';

export interface NetworkSignalInput {
  url?: string;
  error?: string;
  method?: string;
  status?: number;
  pageUrl?: string;
  pageRoute?: string;
  pageStatus?: number;
  title?: string;
  message?: string;
  code?: string;
  category?: string;
  evidence?: string;
}

export interface NetworkSignalClassification {
  kind: DiscoverySignalKind;
  action: 'ignore' | 'keep';
  severity: Severity;
  category: string;
  title: string;
  classification: IssueClassification;
  userImpact: boolean;
  annotation: string;
  requestedUrl?: string;
}

const MEDIA_PATH =
  /\.(mp4|webm|mov|m4v|mkv|mp3|ogg|wav|m3u8)(?:$|[/?#])/i;

const ANALYTICS_HOST_MARKERS = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'clarity.ms',
];

function combinedText(input: NetworkSignalInput): string {
  return [
    input.title,
    input.message,
    input.evidence,
    input.error,
    input.url,
    input.pageUrl,
    input.code,
    input.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function tryUrl(value: string | undefined): URL | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    const match = String(value).match(/https?:\/\/[^\s"'<>]+/i);
    if (!match) {
      return null;
    }

    try {
      return new URL(match[0].replace(/[),.;]+$/, ''));
    } catch {
      return null;
    }
  }
}

function pathnameOf(value: string | undefined): string {
  const parsed = tryUrl(value);
  if (parsed) {
    return parsed.pathname.toLowerCase();
  }

  return String(value ?? '').toLowerCase();
}

export function isAnalyticsOrTelemetryText(value: string | undefined): boolean {
  const text = String(value ?? '').toLowerCase();

  if (!text) {
    return false;
  }

  const mentionsCsp =
    text.includes('content security policy') ||
    text.includes('content-security-policy') ||
    /\bcsp\b/.test(text) ||
    text.includes('csp_blocked');

  const mentionsAnalytics =
    ANALYTICS_HOST_MARKERS.some(marker => text.includes(marker)) ||
    text.includes('google analytics') ||
    text.includes('microsoft clarity') ||
    text.includes('telemetry');

  return mentionsAnalytics && (mentionsCsp || text.includes('analytics'));
}

export function isAnalyticsOrTelemetryIssue(issue: {
  title?: string;
  category?: string;
  evidence?: string;
  description?: string;
  errorMessage?: string;
}): boolean {
  return isAnalyticsOrTelemetryText(
    [
      issue.title,
      issue.category,
      issue.evidence,
      issue.description,
      issue.errorMessage,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export function isAbortedMediaRequest(
  url: string | undefined,
  error: string | undefined
): boolean {
  const failure = String(error ?? '').toLowerCase();
  const path = pathnameOf(url);

  if (!MEDIA_PATH.test(path)) {
    return false;
  }

  return (
    failure.includes('err_aborted') ||
    failure.includes('abort') ||
    failure === 'csp' ||
    failure.length === 0
  );
}

export function isExpectedRscAbort(
  url: string | undefined,
  error: string | undefined
): boolean {
  const failure = String(error ?? '').toLowerCase();
  const href = String(url ?? '').toLowerCase();

  if (!failure.includes('err_aborted') && !failure.includes('abort')) {
    return false;
  }

  return href.includes('_rsc=') || href.includes('_rsc%3d');
}

export function isCheckoutConfirmPath(value: string | undefined): boolean {
  return pathnameOf(value).includes('/checkout/confirm');
}

function requestedUrlFrom(input: NetworkSignalInput): string | undefined {
  return (
    tryUrl(input.url)?.toString() ||
    tryUrl(input.message)?.toString() ||
    tryUrl(input.evidence)?.toString() ||
    input.url ||
    undefined
  );
}

function failureFrom(input: NetworkSignalInput): string {
  if (input.error) {
    return String(input.error);
  }

  const text = `${input.message ?? ''} ${input.evidence ?? ''}`;
  const match = text.match(/net::[a-z0-9_]+/i);
  if (match) {
    return match[0];
  }

  if (/\bcsp\b/i.test(text)) {
    return 'csp';
  }

  return '';
}

export function classifyFailedNetworkSignal(
  input: NetworkSignalInput
): NetworkSignalClassification {
  const text = combinedText(input);
  const requestedUrl = requestedUrlFrom(input);
  const failure = failureFrom(input);
  const method = (input.method ?? 'GET').toUpperCase();
  const pageRoute = input.pageRoute || pathnameOf(input.pageUrl) || '/';
  const checkoutTarget =
    isCheckoutConfirmPath(requestedUrl) ||
    isCheckoutConfirmPath(input.pageUrl) ||
    isCheckoutConfirmPath(input.pageRoute);

  if (isAnalyticsOrTelemetryText(text)) {
    return {
      kind: 'analytics-csp',
      action: 'keep',
      severity: 'low',
      category: 'analytics',
      title: 'Analytics or telemetry blocked by Content Security Policy',
      classification: 'warning',
      userImpact: false,
      annotation:
        'This is a telemetry/CSP configuration mismatch, not evidence that the product flow is broken.',
      requestedUrl,
    };
  }

  if (failure.toLowerCase() === 'csp') {
    return {
      kind: 'other',
      action: 'keep',
      severity: 'low',
      category: 'security',
      title: 'Request blocked by Content Security Policy',
      classification: 'warning',
      userImpact: false,
      annotation:
        'A CSP block was observed. Unless this is a first-party product request, it is a policy mismatch rather than a broken user flow.',
      requestedUrl,
    };
  }

  if (isExpectedRscAbort(requestedUrl, failure) || isExpectedRscAbort(input.message, failure)) {
    return {
      kind: 'rsc-prefetch',
      action: 'ignore',
      severity: 'info',
      category: 'framework',
      title: 'Expected Next.js prefetch cancellation',
      classification: 'none',
      userImpact: false,
      annotation: 'React Server Component prefetch was aborted during navigation.',
      requestedUrl,
    };
  }

  if (
    isAbortedMediaRequest(requestedUrl, failure) ||
    isAbortedMediaRequest(input.message, failure) ||
    isAbortedMediaRequest(input.evidence, failure)
  ) {
    return {
      kind: 'aborted-media',
      action: 'ignore',
      severity: 'info',
      category: 'asset',
      title: 'Aborted media request during discovery',
      classification: 'none',
      userImpact: false,
      annotation:
        'The crawler left the page before the media finished buffering. This is discovery noise, not a product defect.',
      requestedUrl,
    };
  }

  const aborted =
    failure.toLowerCase().includes('err_aborted') ||
    failure.toLowerCase().includes('abort');
  const missing =
    input.status === 404 ||
    input.pageStatus === 404 ||
    text.includes('http 404') ||
    text.includes('returned 404');

  if (checkoutTarget && (aborted || missing || input.pageStatus === 404)) {
    return {
      kind: missing ? 'missing-route' : 'aborted-navigation',
      action: 'keep',
      severity: 'low',
      category: 'network',
      title: missing
        ? '/checkout/confirm was not found during discovery'
        : '/checkout/confirm request aborted during discovery',
      classification: 'warning',
      userImpact: false,
      annotation:
        missing
          ? 'Discovery requested /checkout/confirm but the route returned 404. Treat this as an unverified or absent page unless a first-party test proves the checkout flow exists.'
          : 'Discovery aborted a /checkout/confirm request while changing pages. This is not confirmed checkout-payment failure evidence.',
      requestedUrl,
    };
  }

  if (checkoutTarget && (input.status ?? 0) >= 500) {
    return {
      kind: 'product-network',
      action: 'keep',
      severity: 'high',
      category: 'network',
      title: `/checkout/confirm returned HTTP ${input.status}`,
      classification: 'product-bug',
      userImpact: true,
      annotation:
        `Keep as HIGH: ${method} ${requestedUrl ?? '/checkout/confirm'} failed with HTTP ${input.status} on route ${pageRoute}.`,
      requestedUrl,
    };
  }

  if (checkoutTarget) {
    const statusLabel =
      input.status != null
        ? `HTTP ${input.status}`
        : failure || 'request failure';

    return {
      kind: 'product-network',
      action: 'keep',
      severity: 'high',
      category: 'network',
      title: 'Checkout confirm network request failed',
      classification: 'product-bug',
      userImpact: true,
      annotation:
        `Keep as HIGH: ${method} ${requestedUrl ?? '/checkout/confirm'} failed (${statusLabel}) while browsing ${pageRoute}.`,
      requestedUrl,
    };
  }

  if (missing && MEDIA_PATH.test(pathnameOf(requestedUrl))) {
    return {
      kind: 'missing-route',
      action: 'keep',
      severity: 'low',
      category: 'asset',
      title: 'Media asset returned HTTP 404',
      classification: 'content-bug',
      userImpact: false,
      annotation: 'A media file was missing. This is not a checkout or API outage.',
      requestedUrl,
    };
  }

  return {
    kind: 'product-network',
    action: 'keep',
    severity: 'high',
    category: 'network',
    title: 'Network request failed',
    classification: 'product-bug',
    userImpact: true,
    annotation:
      `${method} ${requestedUrl ?? 'unknown URL'} failed (${failure || input.status || 'unknown error'}) while browsing ${pageRoute}.`,
    requestedUrl,
  };
}
