export const FIRST_PARTY_HOSTS = [
  'nation.dev',
  'www.nation.dev',
  'aiskills.nation.dev',
] as const;

export const CAPTCHA_QUEUE_DIRECTORY = 'reports/captcha-queue';

export type CaptchaChallengeKind =
  | 'none'
  | 'consent'
  | 'native-checkbox'
  | 'recaptcha'
  | 'hcaptcha'
  | 'third-party-blocked';

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isFirstPartyHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();

  if (!host) {
    return false;
  }

  return FIRST_PARTY_HOSTS.includes(
    host as (typeof FIRST_PARTY_HOSTS)[number]
  );
}

export function isFirstPartyUrl(url: string): boolean {
  return isFirstPartyHost(hostnameFromUrl(url));
}

export function classifyCaptchaEvidence(input: {
  url: string;
  iframeSrcs?: string[];
  hasNativeCheckbox?: boolean;
  hasConsentButton?: boolean;
}): CaptchaChallengeKind {
  if (!isFirstPartyUrl(input.url)) {
    return 'third-party-blocked';
  }

  const iframes = (input.iframeSrcs ?? []).map(src => src.toLowerCase());

  if (iframes.some(src => src.includes('recaptcha'))) {
    return 'recaptcha';
  }

  if (iframes.some(src => src.includes('hcaptcha'))) {
    return 'hcaptcha';
  }

  if (input.hasNativeCheckbox) {
    return 'native-checkbox';
  }

  if (input.hasConsentButton) {
    return 'consent';
  }

  return 'none';
}
