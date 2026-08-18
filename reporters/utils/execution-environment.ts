export type SentinelProfile = 'Desktop' | 'Tablet' | 'Mobile';

export interface ExecutionEnvironmentMetadata {
  browserFamily?: string;
  profile?: string;
}

const KNOWN_PROFILES: SentinelProfile[] = ['Desktop', 'Tablet', 'Mobile'];

export function resolveBrowserFamily(
  projectName: string,
  configuredBrowserName?: string,
  metadataBrowserFamily?: string
): string {
  if (metadataBrowserFamily) {
    return metadataBrowserFamily;
  }

  const browser = configuredBrowserName?.toLowerCase();

  if (browser === 'chromium') {
    return 'Chromium';
  }

  if (browser === 'firefox') {
    return 'Firefox';
  }

  if (browser === 'webkit') {
    return 'WebKit';
  }

  const normalized = projectName.toLowerCase();

  if (normalized.includes('firefox')) {
    return 'Firefox';
  }

  if (normalized.includes('webkit') || normalized.includes('safari')) {
    return 'WebKit';
  }

  if (normalized.includes('chromium') || normalized.includes('chrome')) {
    return 'Chromium';
  }

  return 'Unknown';
}

export function resolveProfile(
  projectName: string,
  metadataProfile?: string
): SentinelProfile {
  if (
    metadataProfile &&
    KNOWN_PROFILES.includes(metadataProfile as SentinelProfile)
  ) {
    return metadataProfile as SentinelProfile;
  }

  const normalized = projectName.toLowerCase();

  if (normalized.includes('tablet')) {
    return 'Tablet';
  }

  if (normalized.includes('mobile')) {
    return 'Mobile';
  }

  return 'Desktop';
}
