import type { Page } from '@playwright/test';

export type Diagnostics = {
  consoleErrors: string[];
  failedRequests: string[];
  httpErrors: string[];
};

export function attachDiagnostics(page: Page): Diagnostics {
  const result: Diagnostics = {
    consoleErrors: [],
    failedRequests: [],
    httpErrors: [],
  };

  page.on('console', message => {
    if (message.type() === 'error') {
      result.consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', error => {
    result.consoleErrors.push(`Uncaught page error: ${error.message}`);
  });

  page.on('requestfailed', request => {
    const url = request.url();
    const errorText = request.failure()?.errorText ?? 'Unknown network error';

    const expectedNextJsAbort =
      errorText.includes('ERR_ABORTED') && url.includes('_rsc=');

    if (!expectedNextJsAbort) {
      result.failedRequests.push(`${request.method()} ${url} - ${errorText}`);
    }
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      result.httpErrors.push(
        `${response.status()} ${response.request().method()} ${response.url()}`
      );
    }
  });

  return result;
}

export function formatDiagnostics(title: string, entries: string[]): string {
  return entries.length === 0
    ? `${title}: none`
    : `${title}:\n${entries.map(entry => `- ${entry}`).join('\n')}`;
}
