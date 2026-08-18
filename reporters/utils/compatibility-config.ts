import fs from 'node:fs';
import path from 'node:path';

import type {
  CompatibilityExpectedCoverage,
} from '../models/types';

export interface CompatibilityConfig {
  schemaVersion: number;
  browsers: string[];
  profiles: string[];
}

const DEFAULT_CONFIG: CompatibilityConfig = {
  schemaVersion: 1,
  browsers: ['Chromium', 'Firefox', 'WebKit'],
  profiles: ['Desktop', 'Tablet', 'Mobile'],
};

function uniqueStrings(values: unknown, field: string): string[] {
  if (!Array.isArray(values)) {
    throw new Error(`${field} must be an array of strings.`);
  }

  const names = values.map(value => {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${field} must contain non-empty strings.`);
    }

    return value.trim();
  });

  return [...new Set(names)];
}

export function loadCompatibilityConfig(
  filePath = path.resolve(
    process.cwd(),
    'config',
    'compatibility.json'
  )
): CompatibilityConfig {
  if (!fs.existsSync(filePath)) {
    return DEFAULT_CONFIG;
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CompatibilityConfig;

  if (parsed.schemaVersion !== 1) {
    throw new Error(
      `Unsupported Compatibility schemaVersion: ${parsed.schemaVersion}`
    );
  }

  return {
    schemaVersion: 1,
    browsers: uniqueStrings(parsed.browsers, 'browsers'),
    profiles: uniqueStrings(parsed.profiles, 'profiles'),
  };
}

export function expectedCompatibilityCoverage(
  config: CompatibilityConfig = loadCompatibilityConfig()
): CompatibilityExpectedCoverage {
  return {
    browsers: config.browsers,
    profiles: config.profiles,
  };
}
