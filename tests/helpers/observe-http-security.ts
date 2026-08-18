import type {
  Page,
  Response,
} from '@playwright/test';

export interface ObservedDocumentSecurity {
  url: string;
  status: number;
  headers: Record<string, string>;
  setCookies: string[];
}

function sameOrigin(
  pageUrl: string,
  responseUrl: string
): boolean {
  try {
    return new URL(pageUrl).origin === new URL(responseUrl).origin;
  } catch {
    return false;
  }
}

async function collectSetCookie(
  response: Response,
  bucket: string[]
): Promise<void> {
  const headers = await response.headersArray();

  for (const header of headers) {
    if (header.name.toLowerCase() !== 'set-cookie') {
      continue;
    }

    const value = header.value.trim();

    if (value && !bucket.includes(value)) {
      bucket.push(value);
    }
  }
}

export async function observeDocumentSecurity(
  page: Page,
  url: string
): Promise<ObservedDocumentSecurity> {
  const setCookies: string[] = [];
  const cookieJobs: Array<Promise<void>> = [];
  const targetOrigin = new URL(url).origin;

  const onResponse = (response: Response): void => {
    if (!sameOrigin(targetOrigin, response.url())) {
      return;
    }

    cookieJobs.push(collectSetCookie(response, setCookies));
  };

  page.on('response', onResponse);

  let response: Response | null;

  try {
    response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
    });
  } finally {
    page.off('response', onResponse);
  }

  if (!response) {
    throw new Error(`${url} returned no document response`);
  }

  cookieJobs.push(collectSetCookie(response, setCookies));
  await Promise.all(cookieJobs);

  return {
    url: page.url(),
    status: response.status(),
    headers: response.headers(),
    setCookies,
  };
}
