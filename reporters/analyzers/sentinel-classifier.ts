import type {
  DashboardTestResult,
  IssueClassification,
} from '../models/types';

export interface ClassifiedIssue {
  classification: IssueClassification;
  reason: string;
  recommendation?: string;
}

function includesAny(
  value: string,
  patterns: string[]
): boolean {
  return patterns.some(pattern => value.includes(pattern));
}

export function classifyIssue(
  result: DashboardTestResult
): ClassifiedIssue {
  const warning = result.annotations.find(
    annotation => annotation.type === 'warning'
  );

  if (result.status === 'passed') {
    return warning
      ? {
          classification: 'warning',
          reason:
            warning.description ??
            'The test passed with a warning.',
        }
      : {
          classification: 'none',
          reason: 'The test passed.',
        };
  }

  const title = result.title.toLowerCase();
  const message =
    result.error?.message?.toLowerCase() ?? '';

  if (
    title.includes(
      'sign-in page loads and contains a usable form'
    ) &&
    includesAny(message, [
      'heading',
      'locator',
      'tobevisible',
      'waiting for',
      'element(s) not found',
    ])
  ) {
    return {
      classification: 'automation-issue',
      reason:
        'The sign-in form appears usable, but the expected heading locator no longer matches the current page.',
      recommendation:
        'Update the Playwright heading locator to match the current sign-in page content.',
    };
  }

  if (
    includesAny(message, [
      'strict mode violation',
      'resolved to 2 elements',
      'resolved to multiple elements',
    ])
  ) {
    return {
      classification: 'automation-issue',
      reason:
        'The test locator matched multiple elements.',
      recommendation:
        'Use a more specific locator or add a stable data-testid.',
    };
  }

  if (
    title.includes('duplicated skills wording') ||
    includesAny(message, [
      'duplicated or malformed',
      'malformed homepage sentence',
    ])
  ) {
    return {
      classification: 'content-bug',
      reason:
        'Visible website text contains malformed or duplicated wording.',
      recommendation:
        'Review and correct the affected website copy.',
    };
  }

  if (
    title.includes('theme toggle') &&
    message.includes(
      'no visible or stored theme state changed'
    )
  ) {
    return {
      classification: 'product-bug',
      reason:
        'The theme button was clicked, but the page theme did not change.',
      recommendation:
        'Check the theme toggle handler and theme provider.',
    };
  }

  if (
    title.includes('sidebar') &&
    (
      message.includes(
        'sidebar state did not change'
      ) ||
      warning?.description
        ?.toLowerCase()
        .includes('no visible state change')
    )
  ) {
    return {
      classification: 'needs-investigation',
      reason:
        'The sidebar button was clicked without an observable UI change.',
      recommendation:
        'Verify the intended desktop behaviour manually.',
    };
  }

  if (
    includesAny(message, [
      'typeerror',
      'referenceerror',
      'syntaxerror',
      'internal server error',
      'http 500',
      'status 500',
    ])
  ) {
    return {
      classification: 'product-bug',
      reason:
        'A runtime or server error was detected.',
      recommendation:
        'Inspect the application logs and failing request or stack trace.',
    };
  }

  if (
    includesAny(message, [
      'content security policy',
      'google analytics',
      'clarity',
    ]) &&
    !includesAny(`${title} ${message}`, [
      'was not present',
      'header was not invented',
    ])
  ) {
    return {
      classification: 'warning',
      reason:
        'A third-party service was blocked without confirmed user impact.',
      recommendation:
        'Review the CSP configuration and third-party integration.',
    };
  }

  if (
    result.category === 'accessibility' ||
    title.includes('axe-core') ||
    title.includes('axe ') ||
    includesAny(message, [
      'axe findings',
      'serious/critical axe',
    ])
  ) {
    return {
      classification: 'accessibility-issue',
      reason:
        'axe-core reported serious or critical accessibility findings.',
      recommendation:
        'Fix the listed axe violations. Moderate and color-contrast noise is logged as a warning, not a suite failure.',
    };
  }

  if (
    result.category === 'security' ||
    includesAny(`${title} ${message}`, [
      'content-security-policy',
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
      'frame-ancestors',
      'set-cookie',
      'security header',
    ])
  ) {
    return {
      classification: 'security-issue',
      reason:
        'A measured security header or cookie-flag check failed.',
      recommendation:
        'Record the missing or weak header honestly and fix it on the site. Do not treat absence as a pass.',
    };
  }

  return {
    classification: 'needs-investigation',
    reason:
      'The test failed, but the cause could not be classified automatically.',
    recommendation:
      'Review the error, screenshot and trace manually.',
  };
}