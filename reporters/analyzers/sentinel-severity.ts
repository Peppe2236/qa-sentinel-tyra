import type { TestCase, TestResult } from '@playwright/test/reporter';
import type { Category, Severity } from '../models/types';

const SEVERITIES: Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
];

function annotationSeverity(
  test: TestCase,
  result: TestResult
): Severity | undefined {
  const annotations = [...test.annotations, ...result.annotations];
  const value = annotations
    .find(annotation => annotation.type === 'severity')
    ?.description?.toLowerCase();

  if (value && SEVERITIES.includes(value as Severity)) {
    return value as Severity;
  }

  return undefined;
}

export function detectSeverity(
  test: TestCase,
  result: TestResult,
  category: Category
): Severity {
  const explicit = annotationSeverity(test, result);

  if (explicit) {
    return explicit;
  }

  if (result.status === 'passed') {
    return 'info';
  }

  if (result.status === 'timedOut') {
    return 'critical';
  }

  if (
    category === 'authentication' ||
    category === 'availability' ||
    category === 'security'
  ) {
    return 'critical';
  }

  if (
    category === 'http' ||
    category === 'api' ||
    category === 'network'
  ) {
    return 'high';
  }

  if (
    category === 'javascript' ||
    category === 'navigation' ||
    category === 'accessibility'
  ) {
    return 'medium';
  }

  if (
    category === 'performance' ||
    category === 'responsive' ||
    category === 'visual'
  ) {
    return 'low';
  }

  return 'medium';
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 100,
  high: 50,
  medium: 20,
  low: 10,
  info: 0,
  none: 0,
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
  none: 5,
};
