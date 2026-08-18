export type AxeImpact =
  | 'minor'
  | 'moderate'
  | 'serious'
  | 'critical';

export interface AxeViolationLike {
  id: string;
  impact?: string | null;
  help?: string;
  description?: string;
  nodes?: Array<{
    target?: unknown;
    failureSummary?: string;
  }>;
}

export interface ClassifiedAxeViolations {
  failing: AxeViolationLike[];
  warnings: AxeViolationLike[];
  ignored: AxeViolationLike[];
}

const NOISY_WARNING_RULES = new Set([
  'color-contrast',
  'color-contrast-enhanced',
]);

function impactOf(
  violation: AxeViolationLike
): AxeImpact | 'unknown' {
  const value = String(violation.impact ?? '')
    .trim()
    .toLowerCase();

  if (
    value === 'minor' ||
    value === 'moderate' ||
    value === 'serious' ||
    value === 'critical'
  ) {
    return value;
  }

  return 'unknown';
}

export function classifyAxeViolations(
  violations: AxeViolationLike[] = []
): ClassifiedAxeViolations {
  const failing: AxeViolationLike[] = [];
  const warnings: AxeViolationLike[] = [];
  const ignored: AxeViolationLike[] = [];

  for (const violation of violations) {
    const impact = impactOf(violation);
    const ruleId = String(violation.id ?? '').toLowerCase();

    if (NOISY_WARNING_RULES.has(ruleId)) {
      warnings.push(violation);
      continue;
    }

    if (impact === 'critical' || impact === 'serious') {
      failing.push(violation);
      continue;
    }

    if (impact === 'moderate') {
      warnings.push(violation);
      continue;
    }

    ignored.push(violation);
  }

  return {
    failing,
    warnings,
    ignored,
  };
}

export function worstAxeImpact(
  violations: AxeViolationLike[]
): AxeImpact | undefined {
  const order: AxeImpact[] = [
    'critical',
    'serious',
    'moderate',
    'minor',
  ];

  for (const impact of order) {
    if (
      violations.some(violation => impactOf(violation) === impact)
    ) {
      return impact;
    }
  }

  return undefined;
}

export function formatAxeViolations(
  violations: AxeViolationLike[],
  label: string
): string {
  if (violations.length === 0) {
    return `${label}: none`;
  }

  const lines = violations.map(violation => {
    const impact = impactOf(violation);
    const help = violation.help ?? violation.description ?? '';
    const targets = (violation.nodes ?? [])
      .slice(0, 3)
      .map(node => {
        if (Array.isArray(node.target)) {
          return node.target.map(String).join(' ');
        }

        return node.target ? String(node.target) : '';
      })
      .filter(Boolean);

    const targetText =
      targets.length > 0
        ? ` [${targets.join('; ')}]`
        : '';

    return `- ${violation.id} (${impact}): ${help}${targetText}`;
  });

  return `${label} (${violations.length}):\n${lines.join('\n')}`;
}

export function axeFailSeverity(
  failing: AxeViolationLike[]
): 'high' | 'medium' {
  return worstAxeImpact(failing) === 'critical'
    ? 'high'
    : 'medium';
}
