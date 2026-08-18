import type {
  DashboardTestResult,
  PerformanceArea,
  SecurityPerformanceStatus,
} from '../models/types';

export const PERFORMANCE_OBSERVATION_TYPE =
  'performance-observation';

export const PERFORMANCE_AREA_ANNOTATION_TYPES = [
  'performance-area',
  'performance-check',
] as const;

export type PerformanceObservationArea =
  | 'page-load'
  | 'api-latency'
  | 'largest-contentful-paint';

export interface PerformanceObservationPayload {
  area:
    PerformanceObservationArea;

  page:
    string;

  observation?:
    'not-observed';

  durationMs?:
    number;

  p50Ms?:
    number;

  p95Ms?:
    number;

  sampleCount?:
    number;

  source?:
    string;

  fcpMs?:
    number;
}

export function percentile(
  values: number[],
  percentage: number
): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentage / 100) * sorted.length) - 1;

  return sorted[Math.max(0, index)];
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

export function classifyAgainstThreshold(
  observedMs: number,
  thresholdMs: number
): Extract<SecurityPerformanceStatus, 'healthy' | 'poor'> {
  return observedMs <= thresholdMs ? 'healthy' : 'poor';
}

export function classifyLatencySamples(
  samplesMs: number[],
  thresholdMs?: number
): {
  status:
    Extract<
      SecurityPerformanceStatus,
      'healthy' | 'poor' | 'not-observed'
    >;
  p50?: number;
  p95?: number;
  sampleCount: number;
} {
  if (samplesMs.length === 0) {
    return {
      status: 'not-observed',
      sampleCount: 0,
    };
  }

  const p50 = median(samplesMs);
  const p95 = percentile(samplesMs, 95);

  if (typeof thresholdMs === 'number') {
    return {
      status: classifyAgainstThreshold(p95, thresholdMs),
      p50,
      p95,
      sampleCount: samplesMs.length,
    };
  }

  return {
    status: 'healthy',
    p50,
    p95,
    sampleCount: samplesMs.length,
  };
}

export function parsePerformanceObservation(
  description: string | undefined
): PerformanceObservationPayload | undefined {
  const raw = String(description ?? '').trim();

  if (!raw.startsWith('{')) {
    if (raw.toLowerCase() === 'not-observed') {
      return {
        area: 'api-latency',
        page: 'unknown',
        observation: 'not-observed',
        sampleCount: 0,
      };
    }

    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as PerformanceObservationPayload;
    const area = String(parsed.area ?? '').toLowerCase();

    if (
      area !== 'page-load' &&
      area !== 'api-latency' &&
      area !== 'largest-contentful-paint'
    ) {
      return undefined;
    }

    return {
      ...parsed,
      area,
      page: String(parsed.page ?? 'unknown'),
    };
  } catch {
    return undefined;
  }
}

export function performanceObservationsFromTests(
  tests: DashboardTestResult[]
): PerformanceObservationPayload[] {
  const observations: PerformanceObservationPayload[] = [];

  for (const test of tests) {
    for (const annotation of test.annotations ?? []) {
      if (
        String(annotation.type ?? '').toLowerCase() !==
        PERFORMANCE_OBSERVATION_TYPE
      ) {
        continue;
      }

      const parsed = parsePerformanceObservation(annotation.description);

      if (parsed) {
        observations.push(parsed);
      }
    }
  }

  return observations;
}

export function isPerformanceArea(
  value: string
): value is PerformanceArea {
  return [
    'test-duration',
    'page-load',
    'api-latency',
    'backend-latency',
    'timeout-resilience',
    'regression',
    'largest-contentful-paint',
  ].includes(value);
}

export function timedOutTests(
  tests: DashboardTestResult[]
): DashboardTestResult[] {
  return tests.filter(test => test.status === 'timedOut');
}

export function finishedTests(
  tests: DashboardTestResult[]
): DashboardTestResult[] {
  return tests.filter(
    test =>
      test.status === 'passed' ||
      test.status === 'failed' ||
      test.status === 'timedOut' ||
      test.status === 'interrupted'
  );
}

export function classifyTimeoutResilience(
  tests: DashboardTestResult[],
  thresholdMs?: number
): {
  status: SecurityPerformanceStatus;
  observedMs?: number;
  slowCount: number;
  timedOutCount: number;
  sampleCount: number;
} {
  const measured = finishedTests(tests);
  const timedOut = timedOutTests(tests);
  const durations = measured
    .map(test => test.duration)
    .filter(duration => Number.isFinite(duration) && duration >= 0);

  if (measured.length === 0) {
    return {
      status: 'not-verified',
      slowCount: 0,
      timedOutCount: 0,
      sampleCount: 0,
    };
  }

  const observedMs = percentile(durations, 95);
  const slowCount =
    typeof thresholdMs === 'number'
      ? durations.filter(duration => duration > thresholdMs).length
      : 0;

  if (timedOut.length > 0) {
    return {
      status: 'poor',
      observedMs,
      slowCount,
      timedOutCount: timedOut.length,
      sampleCount: measured.length,
    };
  }

  if (typeof thresholdMs === 'number' && observedMs > thresholdMs) {
    return {
      status: 'poor',
      observedMs,
      slowCount,
      timedOutCount: 0,
      sampleCount: measured.length,
    };
  }

  if (slowCount > 0) {
    return {
      status: 'degraded',
      observedMs,
      slowCount,
      timedOutCount: 0,
      sampleCount: measured.length,
    };
  }

  return {
    status: 'healthy',
    observedMs,
    slowCount: 0,
    timedOutCount: 0,
    sampleCount: measured.length,
  };
}
