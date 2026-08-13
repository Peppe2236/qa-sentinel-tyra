import fs from 'node:fs';
import path from 'node:path';

import type {
  RequirementDefinition,
} from '../models/types';


interface RequirementFile {
  schemaVersion: number;

  requirements:
    RequirementDefinition[];
}


function validateRequirements(
  requirements:
    RequirementDefinition[]
): void {
  const requirementIds =
    new Set<string>();

  for (const requirement of requirements) {
    if (!requirement.id?.trim()) {
      throw new Error(
        'Requirement is missing an id.'
      );
    }

    if (!requirement.title?.trim()) {
      throw new Error(
        `Requirement ${requirement.id} is missing a title.`
      );
    }

    if (
      requirementIds.has(
        requirement.id
      )
    ) {
      throw new Error(
        `Duplicate requirement id: ${requirement.id}`
      );
    }

    requirementIds.add(
      requirement.id
    );

    const criterionIds =
      new Set<string>();

    for (
      const criterion
      of requirement.acceptanceCriteria ??
      []
    ) {
      if (!criterion.id?.trim()) {
        throw new Error(
          `Requirement ${requirement.id} contains an acceptance criterion without an id.`
        );
      }

      if (!criterion.title?.trim()) {
        throw new Error(
          `Acceptance criterion ${criterion.id} in ${requirement.id} is missing a title.`
        );
      }

      if (
        criterionIds.has(
          criterion.id
        )
      ) {
        throw new Error(
          `Duplicate acceptance criterion ${criterion.id} in ${requirement.id}.`
        );
      }

      criterionIds.add(
        criterion.id
      );
    }
  }
}


export function loadRequirements(
  filePath =
    path.resolve(
      process.cwd(),
      'requirements',
      'requirements.json'
    )
): RequirementDefinition[] {
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
    ) as RequirementFile;

  if (
    parsed.schemaVersion !== 1
  ) {
    throw new Error(
      `Unsupported requirements schemaVersion: ${parsed.schemaVersion}`
    );
  }

  if (
    !Array.isArray(
      parsed.requirements
    )
  ) {
    throw new Error(
      'requirements.json must contain a requirements array.'
    );
  }

  validateRequirements(
    parsed.requirements
  );

  return parsed.requirements;
}
