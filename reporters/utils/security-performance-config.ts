import fs from 'node:fs';
import path from 'node:path';


export interface SecurityPerformanceConfig {
  schemaVersion:
    number;

  security:
    {
      requiredChecks:
        string[];
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


  return parsed;
}
