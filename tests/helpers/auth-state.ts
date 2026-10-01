import fs from 'node:fs';
import path from 'node:path';

export const NATION_AUTH_STATE = path.resolve(
  process.cwd(),
  'playwright/.auth/nation.json'
);

export const AI_SKILLS_AUTH_STATE = path.resolve(
  process.cwd(),
  'playwright/.auth/ai-skills.json'
);

export const NATION_DEV_AUTH_STATE = path.resolve(
  process.cwd(),
  'playwright/.auth/nation-dev.json'
);

export const EMPTY_STORAGE_STATE = {
  cookies: [] as never[],
  origins: [] as never[],
};

export function ensureAuthDirectory(): void {
  fs.mkdirSync(path.dirname(NATION_AUTH_STATE), { recursive: true });
}

export function writeEmptyAuthState(filePath: string): void {
  ensureAuthDirectory();
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(EMPTY_STORAGE_STATE, null, 2)}\n`,
    'utf8'
  );
}

export function authStateExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

type StoredAuthState = {
  cookies?: unknown[];
  origins?: unknown[];
};

export function authStateHasData(filePath: string): boolean {
  if (!authStateExists(filePath)) {
    return false;
  }

  try {
    const state = JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    ) as StoredAuthState;

    const cookies = Array.isArray(state.cookies)
      ? state.cookies.length
      : 0;
    const origins = Array.isArray(state.origins)
      ? state.origins.length
      : 0;

    return cookies + origins > 0;
  } catch {
    return false;
  }
}


export function authStateHasUsableCookie(
  filePath: string,
  cookieNamePrefixes: string[],
  minValiditySeconds = 300
): boolean {
  if (!authStateExists(filePath)) {
    return false;
  }

  try {
    const state = JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    ) as {
      cookies?: Array<{
        name?: unknown;
        expires?: unknown;
      }>;
    };

    if (!Array.isArray(state.cookies)) {
      return false;
    }

    const nowSeconds =
      Date.now() / 1000;

    return state.cookies.some(cookie => {
      if (
        !cookie ||
        typeof cookie.name !== 'string'
      ) {
        return false;
      }

      const matches =
        cookieNamePrefixes.some(prefix =>
          cookie.name === prefix ||
          authCookieNameStartsWith(cookie.name, 
            `${prefix}.`
          )
        );

      if (!matches) {
        return false;
      }

      /*
       * Playwright represents session cookies
       * with a negative expiry.
       */
      if (
        typeof cookie.expires !== 'number' ||
        cookie.expires < 0
      ) {
        return true;
      }

      return (
        cookie.expires >
        nowSeconds + minValiditySeconds
      );
    });
  } catch {
    return false;
  }
}

function authCookieNameStartsWith(
  value: unknown, prefix: string, position?: number
): boolean {
  return typeof value === 'string' && value.startsWith(prefix, position);
}
