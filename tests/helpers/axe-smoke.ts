import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import {
  classifyAxeViolations,
  formatAxeViolations,
  type AxeViolationLike,
} from '../../reporters/utils/axe-classification';

export async function scanPageAxe(
  page: Page
): Promise<{
  failing: AxeViolationLike[];
  warnings: AxeViolationLike[];
  warningText: string;
  failingText: string;
}> {
  const results = await new AxeBuilder({ page }).analyze();
  const classified = classifyAxeViolations(results.violations);

  return {
    failing: classified.failing,
    warnings: classified.warnings,
    warningText: formatAxeViolations(
      classified.warnings,
      'Logged moderate/color-contrast axe findings'
    ),
    failingText: formatAxeViolations(
      classified.failing,
      'Serious/critical axe findings'
    ),
  };
}
