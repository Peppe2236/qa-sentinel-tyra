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
