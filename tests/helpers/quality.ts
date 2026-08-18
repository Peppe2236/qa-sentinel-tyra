import type { TestDetails } from '@playwright/test';

type Annotation = {
  type: string;
  description: string;
};

function pushValues(
  annotations: Annotation[],
  type: string,
  values?: string | string[]
): void {
  const list = Array.isArray(values) ? values : values ? [values] : [];

  for (const value of list) {
    const description = value.trim();

    if (description) {
      annotations.push({ type, description });
    }
  }
}

/**
 * Playwright annotations consumed by the QA reporter:
 * requirement, acceptance-criterion, critical-flow, flow-scenario,
 * category, quality-dimension, security-area.
 */
export function qualityMeta(input: {
  requirement?: string | string[];
  criteria?: string | string[];
  flow?: string | string[];
  scenario?: string | string[];
  category?: string;
  dimensions?: string | string[];
  securityCheck?: string | string[];
}): Pick<TestDetails, 'annotation'> {
  const annotation: Annotation[] = [];

  pushValues(annotation, 'requirement', input.requirement);
  pushValues(annotation, 'acceptance-criterion', input.criteria);
  pushValues(annotation, 'critical-flow', input.flow);
  pushValues(annotation, 'flow-scenario', input.scenario);
  pushValues(annotation, 'category', input.category);
  pushValues(annotation, 'quality-dimension', input.dimensions);
  pushValues(annotation, 'security-area', input.securityCheck);

  return { annotation };
}
