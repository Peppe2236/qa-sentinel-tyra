import type {
  DashboardTestResult,
  PerformanceStats,
} from '../models/types';

function percentile(values: number[], percentage: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentage / 100) * sorted.length) - 1;

  return sorted[Math.max(0, index)];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

export function analyzePerformance(
  tests: DashboardTestResult[],
  wallClockDuration: number
): PerformanceStats {
  const durations = tests.map(test => test.duration);
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);

  const fastest = [...tests].sort((a, b) => a.duration - b.duration)[0];
  const slowest = [...tests].sort((a, b) => b.duration - a.duration)[0];

  return {
    totalDuration,
    wallClockDuration,
    averageDuration:
      tests.length > 0 ? Math.round(totalDuration / tests.length) : 0,
    medianDuration: median(durations),
    p95Duration: percentile(durations, 95),
    fastestTest: fastest
      ? {
          title: fastest.fullTitle,
          duration: fastest.duration,
          project: fastest.project,
        }
      : undefined,
    slowestTest: slowest
      ? {
          title: slowest.fullTitle,
          duration: slowest.duration,
          project: slowest.project,
        }
      : undefined,
  };
}
