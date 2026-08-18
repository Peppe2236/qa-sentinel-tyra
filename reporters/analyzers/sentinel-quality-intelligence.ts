import type {
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

import type {
  Category,
  IntelligenceSource,
  QualityDimension,
  QualityDimensionStatistics,
  RequirementDefinition,
} from '../models/types';


export const QUALITY_DIMENSIONS:
  QualityDimension[] = [
    'requirements-functionality',
    'critical-flows',
    'ux-ui',
    'security-performance',
    'compatibility',
    'api-backend',
  ];


const INTELLIGENCE_SOURCES:
  IntelligenceSource[] = [
    'test',
    'discovery',
    'api',
    'backend',
  ];


function unique<T>(
  values: T[]
): T[] {
  return [
    ...new Set(values),
  ];
}


function annotationDescriptions(
  test: TestCase,
  result: TestResult,
  types: string[]
): string[] {
  return [
    ...test.annotations,
    ...result.annotations,
  ]
    .filter(
      annotation =>
        types.includes(
          annotation.type.toLowerCase()
        )
    )
    .map(
      annotation =>
        annotation.description?.trim()
    )
    .filter(
      (
        value
      ): value is string =>
        Boolean(value)
    );
}


function splitValues(
  values: string[]
): string[] {
  return values.flatMap(
    value =>
      value
        .split(/[,;|]/)
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean)
  );
}


function isQualityDimension(
  value: string
): value is QualityDimension {
  return QUALITY_DIMENSIONS.includes(
    value as QualityDimension
  );
}


export function qualityDimensionsForRequirements(
  requirementIds: string[],
  requirements: RequirementDefinition[]
): QualityDimension[] {
  if (
    requirementIds.length === 0 ||
    requirements.length === 0
  ) {
    return [];
  }

  const wanted =
    new Set(
      requirementIds
    );

  const dimensions:
    QualityDimension[] = [];

  for (
    const requirement
    of requirements
  ) {
    if (
      !wanted.has(
        requirement.id
      )
    ) {
      continue;
    }

    for (
      const dimension
      of requirement.qualityDimensions ??
        []
    ) {
      if (
        isQualityDimension(
          dimension
        )
      ) {
        dimensions.push(
          dimension
        );
      }
    }
  }

  return unique(
    dimensions
  );
}


export function qualityDimensionsForCategory(
  category: Category | string
): QualityDimension[] {
  switch (
    String(category)
      .toLowerCase()
  ) {
    case 'authentication':
      return [
        'requirements-functionality',
        'critical-flows',
        'security-performance',
      ];

    case 'availability':
      return [
        'requirements-functionality',
        'critical-flows',
      ];

    case 'navigation':
      return [
        'requirements-functionality',
        'ux-ui',
      ];

    case 'accessibility':
    case 'visual':
    case 'content':
      return [
        'ux-ui',
      ];

    case 'javascript':
      return [
        'requirements-functionality',
        'ux-ui',
      ];

    case 'security':
    case 'performance':
    case 'analytics':
    case 'security-policy':
      return [
        'security-performance',
      ];

    case 'responsive':
      return [
        'compatibility',
        'ux-ui',
      ];

    case 'api':
    case 'http':
    case 'network':
      return [
        'api-backend',
      ];

    case 'other':
    default:
      return [
        'requirements-functionality',
      ];
  }
}


export interface TestQualityContext {
  qualityDimensions:
    QualityDimension[];

  requirementIds:
    string[];

  acceptanceCriteriaIds:
    string[];

  criticalFlow?:
    string;

  criticalFlowIds:
    string[];

  flowScenarioIds:
    string[];
}


export function analyzeTestQualityContext(
  test: TestCase,
  result: TestResult,
  category: Category,
  requirements:
    RequirementDefinition[] = []
): TestQualityContext {
  const explicitDimensions =
    splitValues(
      annotationDescriptions(
        test,
        result,
        [
          'quality-dimension',
          'quality-dimensions',
        ]
      )
    )
      .map(
        value =>
          value.toLowerCase()
      )
      .filter(
        isQualityDimension
      );

  const requirementIds =
    unique(
      splitValues(
        annotationDescriptions(
          test,
          result,
          [
            'requirement',
            'requirement-id',
            'requirements',
          ]
        )
      )
    );

  const acceptanceCriteriaIds =
    unique(
      splitValues(
        annotationDescriptions(
          test,
          result,
          [
            'acceptance-criterion',
            'acceptance-criteria',
            'criterion',
            'criterion-id',
          ]
        )
      )
    );

  const criticalFlowIds =
    unique(
      splitValues(
        annotationDescriptions(
          test,
          result,
          [
            'critical-flow',
            'critical-flow-id',
            'critical-flows',
          ]
        )
      )
    );

  const flowScenarioIds =
    unique(
      splitValues(
        annotationDescriptions(
          test,
          result,
          [
            'flow-scenario',
            'flow-scenario-id',
            'flow-scenarios',
          ]
        )
      )
    );

  const criticalFlow =
    criticalFlowIds[0];

  const dimensions = [
    ...qualityDimensionsForCategory(
      category
    ),
    ...explicitDimensions,
  ];

  if (
    requirementIds.length > 0
  ) {
    dimensions.push(
      'requirements-functionality'
    );
  }

  if (
    criticalFlowIds.length > 0 ||
    flowScenarioIds.length > 0
  ) {
    dimensions.push(
      'critical-flows'
    );
  }

  dimensions.push(
    ...qualityDimensionsForRequirements(
      requirementIds,
      requirements
    )
  );

  return {
    qualityDimensions:
      unique(dimensions),

    requirementIds,

    acceptanceCriteriaIds,

    criticalFlow,

    criticalFlowIds,

    flowScenarioIds,
  };
}


type QualityIssueLike = {
  source?: string;
  category?: string;
  severity?: string;

  qualityDimensions?:
    QualityDimension[];
};


export function buildQualityDimensionStatistics(
  issues: QualityIssueLike[]
): QualityDimensionStatistics {
  const statistics =
    Object.fromEntries(
      QUALITY_DIMENSIONS.map(
        dimension => [
          dimension,
          {
            dimension,

            issueCount: 0,

            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0,

            sourceCounts: {},
          },
        ]
      )
    ) as QualityDimensionStatistics;

  for (const issue of issues) {
    const dimensions =
      issue.qualityDimensions?.length
        ? issue.qualityDimensions
        : qualityDimensionsForCategory(
            issue.category ??
            'other'
          );

    const source =
      INTELLIGENCE_SOURCES.includes(
        issue.source as IntelligenceSource
      )
        ? issue.source as IntelligenceSource
        : undefined;

    const severity =
      String(
        issue.severity ??
        'info'
      ).toLowerCase();

    for (
      const dimension
      of unique(dimensions)
    ) {
      const entry =
        statistics[dimension];

      entry.issueCount += 1;

      if (
        severity === 'critical' ||
        severity === 'high' ||
        severity === 'medium' ||
        severity === 'low' ||
        severity === 'info'
      ) {
        entry[severity] += 1;
      }

      if (source) {
        entry.sourceCounts[source] =
          (
            entry.sourceCounts[source] ??
            0
          ) + 1;
      }
    }
  }

  return statistics;
}
