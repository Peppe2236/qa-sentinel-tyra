import fs from 'node:fs';
import path from 'node:path';

import type {
  CriticalFlowDefinition,
} from '../models/types';


interface CriticalFlowFile {
  schemaVersion: number;

  flows:
    CriticalFlowDefinition[];
}


function validateFlows(
  flows:
    CriticalFlowDefinition[]
): void {
  const flowIds =
    new Set<string>();

  for (const flow of flows) {
    if (!flow.id?.trim()) {
      throw new Error(
        'Critical Flow is missing an id.'
      );
    }

    if (!flow.title?.trim()) {
      throw new Error(
        `Critical Flow ${flow.id} is missing a title.`
      );
    }

    if (flowIds.has(flow.id)) {
      throw new Error(
        `Duplicate Critical Flow id: ${flow.id}`
      );
    }

    flowIds.add(flow.id);

    const scenarioIds =
      new Set<string>();

    for (
      const scenario
      of flow.scenarios ?? []
    ) {
      if (!scenario.id?.trim()) {
        throw new Error(
          `Critical Flow ${flow.id} contains a scenario without an id.`
        );
      }

      if (!scenario.title?.trim()) {
        throw new Error(
          `Scenario ${scenario.id} in ${flow.id} is missing a title.`
        );
      }

      if (
        scenarioIds.has(
          scenario.id
        )
      ) {
        throw new Error(
          `Duplicate scenario ${scenario.id} in ${flow.id}.`
        );
      }

      scenarioIds.add(
        scenario.id
      );
    }
  }
}


export function loadCriticalFlows(
  filePath =
    path.resolve(
      process.cwd(),
      'flows',
      'critical-flows.json'
    )
): CriticalFlowDefinition[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw =
    fs.readFileSync(
      filePath,
      'utf8'
    );

  const parsed =
    JSON.parse(
      raw
    ) as CriticalFlowFile;

  if (
    parsed.schemaVersion !== 1
  ) {
    throw new Error(
      `Unsupported Critical Flow schemaVersion: ${parsed.schemaVersion}`
    );
  }

  if (
    !Array.isArray(
      parsed.flows
    )
  ) {
    throw new Error(
      'critical-flows.json must contain a flows array.'
    );
  }

  validateFlows(
    parsed.flows
  );

  return parsed.flows;
}
