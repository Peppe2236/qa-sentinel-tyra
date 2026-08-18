import type { Page } from '@playwright/test';

import { isFirstPartyUrl } from '../../config/first-party';

const POLL_MS = 5_000;
const MAX_WAIT_MS = 45_000;

function solverKey(env: NodeJS.ProcessEnv = process.env): string {
  return env.SENTINEL_CAPTCHA_SOLVER_KEY?.trim() || '';
}

function solverProvider(
  env: NodeJS.ProcessEnv = process.env
): '2captcha' | 'capsolver' {
  const explicit = env.SENTINEL_CAPTCHA_SOLVER?.trim().toLowerCase();

  if (explicit === 'capsolver') {
    return 'capsolver';
  }

  return '2captcha';
}

async function siteKeyFromPage(page: Page): Promise<string> {
  return page.evaluate(() => {
    const node = document.querySelector<HTMLElement>(
      '[data-sitekey], .g-recaptcha, .h-captcha'
    );
    return (
      node?.getAttribute('data-sitekey') ||
      node?.dataset.sitekey ||
      ''
    );
  });
}

async function injectToken(page: Page, token: string): Promise<void> {
  await page.evaluate(value => {
    const selectors = [
      '#g-recaptcha-response',
      'textarea[name="g-recaptcha-response"]',
      'textarea[name="h-captcha-response"]',
      '#h-captcha-response',
    ];

    for (const selector of selectors) {
      const field = document.querySelector<HTMLTextAreaElement>(selector);

      if (field) {
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, token);
}

async function solve2Captcha(input: {
  apiKey: string;
  siteKey: string;
  pageUrl: string;
}): Promise<string | null> {
  const submit = await fetch('https://2captcha.com/in.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      key: input.apiKey,
      method: 'userrecaptcha',
      googlekey: input.siteKey,
      pageurl: input.pageUrl,
      json: '1',
    }),
  });

  const submitted = (await submit.json()) as {
    status?: number;
    request?: string;
  };

  if (submitted.status !== 1 || !submitted.request) {
    return null;
  }

  const started = Date.now();

  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise(resolve => setTimeout(resolve, POLL_MS));

    const poll = await fetch(
      `https://2captcha.com/res.php?key=${encodeURIComponent(input.apiKey)}&action=get&id=${encodeURIComponent(submitted.request)}&json=1`
    );
    const payload = (await poll.json()) as {
      status?: number;
      request?: string;
    };

    if (payload.status === 1 && payload.request) {
      return payload.request;
    }
  }

  return null;
}

async function solveCapsolver(input: {
  apiKey: string;
  siteKey: string;
  pageUrl: string;
}): Promise<string | null> {
  const created = await fetch('https://api.capsolver.com/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: input.apiKey,
      task: {
        type: 'ReCaptchaV2TaskProxyLess',
        websiteURL: input.pageUrl,
        websiteKey: input.siteKey,
      },
    }),
  });

  const createdPayload = (await created.json()) as {
    errorId?: number;
    taskId?: string;
  };

  if (createdPayload.errorId || !createdPayload.taskId) {
    return null;
  }

  const started = Date.now();

  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise(resolve => setTimeout(resolve, POLL_MS));

    const poll = await fetch('https://api.capsolver.com/getTaskResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: input.apiKey,
        taskId: createdPayload.taskId,
      }),
    });
    const payload = (await poll.json()) as {
      status?: string;
      solution?: { gRecaptchaResponse?: string };
    };

    if (payload.status === 'ready' && payload.solution?.gRecaptchaResponse) {
      return payload.solution.gRecaptchaResponse;
    }
  }

  return null;
}

export async function trySolveFirstPartyCaptcha(
  page: Page,
  _kind: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const url = page.url();

  if (!isFirstPartyUrl(url)) {
    return false;
  }

  const apiKey = solverKey(env);

  if (!apiKey) {
    return false;
  }

  const siteKey = await siteKeyFromPage(page);

  if (!siteKey) {
    return false;
  }

  try {
    const token =
      solverProvider(env) === 'capsolver'
        ? await solveCapsolver({ apiKey, siteKey, pageUrl: url })
        : await solve2Captcha({ apiKey, siteKey, pageUrl: url });

    if (!token) {
      return false;
    }

    await injectToken(page, token);
    return true;
  } catch {
    return false;
  }
}
