export interface SiteCredentials {
  email: string;
  password: string;
}

function readPair(
  emailKey: string,
  passwordKey: string
): SiteCredentials | null {
  const email = process.env[emailKey]?.trim() ?? '';
  const password = process.env[passwordKey]?.trim() ?? '';

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export function readOptionalCredentials(
  site: 'nation' | 'ai-skills'
): SiteCredentials | null {
  if (site === 'nation') {
    return readPair('NATION_TEST_EMAIL', 'NATION_TEST_PASSWORD');
  }

  return readPair('AI_SKILLS_TEST_EMAIL', 'AI_SKILLS_TEST_PASSWORD');
}
