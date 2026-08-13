import fs from 'node:fs';
import path from 'node:path';

import type {
  QualityDimension,
} from '../models/types';

import {
  qualityDimensionsForCategory,
} from '../analyzers/sentinel-quality-intelligence';



export type DiscoveryPriority =
  | 'P0'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4';


export interface DashboardDiscoveryIssue {
  source: 'discovery';

  site: string;
  route: string;

  category: string;
  severity: string;

  qualityDimensions?:
    QualityDimension[];

  requirementIds?:
    string[];

  acceptanceCriteriaIds?:
    string[];
  title: string;
  description: string;
  evidence?: string;

  userImpact: string;
  recommendation: string;

  priorityScore: number;
  priority: DiscoveryPriority;

  occurrences: number;
  affectedRoutes: string[];

  fingerprint: string;

  criticalFlowIds?:
    string[];

  flowScenarioIds?:
    string[];
}


interface DiscoveryReport {
  prioritizedFindings?:
    DashboardDiscoveryIssue[];
}


function readDiscoveryFile(
  filePath: string
): DashboardDiscoveryIssue[] {
  if (
    !fs.existsSync(
      filePath
    )
  ) {
    return [];
  }

  try {
    const raw =
      fs.readFileSync(
        filePath,
        'utf8'
      );

    const report =
      JSON.parse(
        raw
      ) as DiscoveryReport;

    return (
      report.prioritizedFindings ??
      []
    ).map(
      finding => ({
        ...finding,

        source:
          'discovery' as const,

        qualityDimensions:
          finding.qualityDimensions?.length
            ? finding.qualityDimensions
            : qualityDimensionsForCategory(
                finding.category
              ),
      })
    );
  } catch {
    return [];
  }
}


export function loadDiscoveryIssues():
  DashboardDiscoveryIssue[] {
  const directory =
    path.resolve(
      process.cwd(),
      'reports',
      'discovery'
    );

  const nation =
    readDiscoveryFile(
      path.join(
        directory,
        'nation.json'
      )
    );

  const aiSkills =
    readDiscoveryFile(
      path.join(
        directory,
        'ai-skills.json'
      )
    );

  return [
    ...nation,
    ...aiSkills,
  ].sort(
    (a, b) =>
      b.priorityScore -
      a.priorityScore
  );
}