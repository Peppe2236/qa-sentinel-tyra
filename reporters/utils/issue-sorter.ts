import type { DashboardTestResult } from '../models/types';
import { SEVERITY_ORDER } from '../analyzers/sentinel-severity';

export function sortIssues(
  tests: DashboardTestResult[]
): DashboardTestResult[] {
  return tests
    .filter(test =>
      ['failed', 'timedOut', 'interrupted'].includes(test.status)
    )
    .sort((a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.vitalRank - b.vitalRank ||
      b.duration - a.duration
    );
}
