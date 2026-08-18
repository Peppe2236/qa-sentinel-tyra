/**
 * Hand-written E2E routes (tests/nation and tests/skills).
 * Generated discovered-page HTTP smoke does not count as coverage here.
 */
export const HANDWRITTEN_ROUTES: Record<string, readonly string[]> = {
  nation: [
    '/',
    '/signin',
    '/signup',
    '/forgot-password',
    '/manifesto',
    '/made-with-sweden',
    '/partner-join',
    '/privacy',
    '/terms',
    '/home',
    '/jobs',
    '/profile',
    '/benchmarks',
  ],
  'ai-skills': [
    '/',
    '/skills',
    '/signin',
    '/assessment',
    '/path',
    '/practice',
    '/skills/gamma',
    '/skills/claude',
    '/skills/notebooklm',
  ],
};

export function normalizeRoutePath(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  const trimmed = pathname.split('?')[0]?.split('#')[0] ?? '/';

  if (trimmed === '/') {
    return '/';
  }

  return trimmed.replace(/\/+$/, '') || '/';
}

export function isHandwrittenRoute(
  site: string,
  pathname: string,
  routes: Record<string, readonly string[]> = HANDWRITTEN_ROUTES
): boolean {
  const covered = routes[site] ?? [];
  const normalized = normalizeRoutePath(pathname);

  return covered.some(
    route => normalizeRoutePath(route) === normalized
  );
}
