import type { Page, Request } from '@playwright/test';

import { dismissFirstPartyChallenges } from './first-party-challenges';

export interface ObservedTransportSecurity {
  url: string;
  status: number;
  requestUrls: string[];
  hrefs: string[];
}

export async function observeTransportSecurity(
  page: Page,
  url: string
): Promise<ObservedTransportSecurity> {
  const requestUrls: string[] = [];

  const onRequest = (request: Request): void => {
    requestUrls.push(request.url());
  };

  page.on('request', onRequest);

  let response;

  try {
    response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
    });

    await dismissFirstPartyChallenges(page);
    await page.waitForLoadState('networkidle', {
      timeout: 2_000,
    }).catch(() => undefined);
  } finally {
    page.off('request', onRequest);
  }

  if (!response) {
    throw new Error(`${url} returned no document response`);
  }

  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')]
      .map(anchor => anchor.getAttribute('href') ?? '')
      .filter(Boolean)
  );

  return {
    url: page.url(),
    status: response.status(),
    requestUrls,
    hrefs,
  };
}
