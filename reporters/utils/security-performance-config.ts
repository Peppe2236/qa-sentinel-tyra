import fs from 'node:fs';
import path from 'node:path';

import type {
  SecurityArea,
} from '../models/types';


export const SECURITY_AREAS:
  SecurityArea[] = [
    'authentication',
    'authorization',
    'content-security-policy',
    'security-headers',
    'session-cookies',
    'data-exposure',
    'transport',
    'dependency-security',
  ];


export function isSecurityArea(
  value: string
): value is SecurityArea {
  return SECURITY_AREAS.includes(
    value as SecurityArea
  );
}


export function requiredSecurityAreas(
  config: SecurityPerformanceConfig
): SecurityArea[] {
  return [
    ...new Set(
      config.security.requiredChecks.filter(
        isSecurityArea
      )
    ),
  ];
}


export interface SecurityPerformanceConfig {
  schemaVersion:
    number;

  security:
    {
      requiredChecks:
        SecurityArea[];
    };

  performance:
    {
      thresholds:
        {
          averageDurationMs?:
            number;

          medianDurationMs?:
            number;

          p95DurationMs?:
            number;

          pageLoadMs?:
            number;

          apiLatencyMs?:
            number;

          backendLatencyMs?:
            number;

          timeoutMs?:
            number;
        };
    };
}


function validatePositiveNumber(
  value:
    unknown,

  field:
    string
): void {

  if (
    value === undefined
  ) {
    return;
  }

  if (
    typeof value !==
      'number' ||
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    throw new Error(
      `${field} must be a positive number.`
    );
  }
}


export function loadSecurityPerformanceConfig(
  filePath =
    path.resolve(
      process.cwd(),
      'config',
      'security-performance.json'
    )
): SecurityPerformanceConfig {

  if (
    !fs.existsSync(
      filePath
    )
  ) {
    return {
      schemaVersion:
        1,

      security:
        {
          requiredChecks:
            [],
        },

      performance:
        {
          thresholds:
            {},
        },
    };
  }


  const parsed =
    JSON.parse(
      fs.readFileSync(
        filePath,
        'utf8'
      )
    ) as
      SecurityPerformanceConfig;


  if (
    parsed.schemaVersion !==
      1
  ) {
    throw new Error(
      `Unsupported Security/Performance schemaVersion: ${parsed.schemaVersion}`
    );
  }


  if (
    !parsed.security ||
    !Array.isArray(
      parsed.security
        .requiredChecks
    )
  ) {
    throw new Error(
      'security.requiredChecks must be an array.'
    );
  }


  for (
    const check
    of parsed.security
      .requiredChecks
  ) {
    if (
      typeof check !==
        'string' ||
      !isSecurityArea(
        check
      )
    ) {
      throw new Error(
        `Unknown security.requiredChecks value: ${String(check)}`
      );
    }
  }


  if (
    !parsed.performance ||
    typeof parsed.performance
      .thresholds !==
      'object' ||
    parsed.performance
      .thresholds ===
      null
  ) {
    throw new Error(
      'performance.thresholds must be an object.'
    );
  }


  const thresholds =
    parsed.performance
      .thresholds;


  validatePositiveNumber(
    thresholds
      .averageDurationMs,
    'averageDurationMs'
  );

  validatePositiveNumber(
    thresholds
      .medianDurationMs,
    'medianDurationMs'
  );

  validatePositiveNumber(
    thresholds
      .p95DurationMs,
    'p95DurationMs'
  );

  validatePositiveNumber(
    thresholds
      .pageLoadMs,
    'pageLoadMs'
  );

  validatePositiveNumber(
    thresholds
      .apiLatencyMs,
    'apiLatencyMs'
  );

  validatePositiveNumber(
    thresholds
      .backendLatencyMs,
    'backendLatencyMs'
  );

  validatePositiveNumber(
    thresholds
      .timeoutMs,
    'timeoutMs'
  );


  return parsed;
}
