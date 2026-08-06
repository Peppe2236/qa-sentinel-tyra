import type { TestCase, TestResult } from '@playwright/test/reporter';
import type { Category } from '../models/types';

const CATEGORIES: Category[] = [
  'authentication',
  'availability',
  'security',
  'http',
  'api',
  'network',
  'javascript',
  'navigation',
  'accessibility',
  'performance',
  'responsive',
  'visual',
  'content',
  'other',
];

function annotationValue(
  test: TestCase,
  result: TestResult,
  type: string
): string | undefined {
  const annotations = [...test.annotations, ...result.annotations];
  return annotations.find(annotation => annotation.type === type)?.description;
}

function searchableText(test: TestCase): string {
  return [
    test.title,
    test.titlePath().join(' '),
    test.location.file,
    ...test.tags,
    ...test.annotations.map(annotation =>
      `${annotation.type} ${annotation.description ?? ''}`
    ),
  ]
    .join(' ')
    .toLowerCase();
}

export function detectCategory(
  test: TestCase,
  result: TestResult
): Category {
  const explicit = annotationValue(test, result, 'category')?.toLowerCase();

  if (explicit && CATEGORIES.includes(explicit as Category)) {
    return explicit as Category;
  }

  const text = searchableText(test);

  if (/login|sign[- ]?in|logout|password|credential|session|auth/.test(text)) {
    return 'authentication';
  }

  if (/security|xss|csrf|https|cookie|token|permission|authorization/.test(text)) {
    return 'security';
  }

  if (/availability|health|uptime|page loads|load successfully/.test(text)) {
    return 'availability';
  }

  if (/http|404|500|status code|response status/.test(text)) {
    return 'http';
  }

  if (/api|endpoint|graphql|rest/.test(text)) {
    return 'api';
  }

  if (/request|network|dns|connection/.test(text)) {
    return 'network';
  }

  if (/javascript|console|page error|uncaught/.test(text)) {
    return 'javascript';
  }

  if (/accessibility|axe|aria|keyboard|contrast|screen reader/.test(text)) {
    return 'accessibility';
  }

  if (/performance|response time|duration|slow|lighthouse/.test(text)) {
    return 'performance';
  }

  if (/navigation|link|menu|route|redirect/.test(text)) {
    return 'navigation';
  }

  if (/responsive|mobile|tablet|viewport/.test(text)) {
    return 'responsive';
  }

  if (/visual|screenshot|layout|pixel|snapshot/.test(text)) {
    return 'visual';
  }

  if (/content|title|text|spelling|grammar/.test(text)) {
    return 'content';
  }

  return 'other';
}

export const VITAL_RANK: Record<Category, number> = {
  authentication: 1,
  availability: 2,
  security: 3,
  http: 4,
  api: 5,
  network: 6,
  javascript: 7,
  navigation: 8,
  accessibility: 9,
  performance: 10,
  responsive: 11,
  visual: 12,
  content: 13,
  other: 14,
};
