import {
  captchaSolverKeyPresent,
  snapshotQaPolicy,
} from '../../config/policy';
import { enrichAutonomousQaFromLatestRun } from '../analyzers/sentinel-autonomous-advisory';
import type { DashboardRun } from '../models/types';
import { loadCaptchaQueue } from './captcha-queue';
import { maybeEnrichHumanReviewPack } from './llm-enrichment';
import { writeRemediationAndRelease } from './remediation';
import { mergeCaptchaQueue } from './human-review';
import type { FetchLike } from './llm';

export async function runAutonomousOnEndHooks(input: {
  run: DashboardRun;
  previous?: DashboardRun;
  reportsDirectory: string;
  dataDirectory: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<DashboardRun> {
  const env = input.env ?? process.env;
  const policy = snapshotQaPolicy(env);
  const captchaQueue = loadCaptchaQueue();

  let humanReview = input.run.humanReview;

  if (humanReview) {
    humanReview = mergeCaptchaQueue(humanReview, captchaQueue);
    humanReview = await maybeEnrichHumanReviewPack(
      humanReview,
      env,
      input.fetchImpl
    );
  }

  const run: DashboardRun = {
    ...input.run,
    humanReview,
    policy,
  };

  run.autonomousQaAssessment = enrichAutonomousQaFromLatestRun(
    run.autonomousQaAssessment ?? {
      authority: 'advisory-only',
      capabilityStatus: 'not-verified',
      executionEnabled: false,
      releaseDecisionSource: run.releaseDecisionSource ?? null,
      unifiedDecisionState: run.unifiedDecisionAssessment?.state ?? null,
      linkedDecisionUnitCount:
        run.unifiedDecisionAssessment?.decisionUnits.length ?? 0,
      provenance: {
        intelligenceSources: [],
        qualityDimensions: [],
        unifiedDecisionUnitIds: [],
        issueFingerprints: [],
        requirementIds: [],
        criticalFlowIds: [],
        flowScenarioIds: [],
      },
      candidateActions: [],
      reason: 'Autonomous QA assessment missing; current-run advisory still runs.',
    },
    run,
    captchaQueue
  );

  const artifacts = await writeRemediationAndRelease({
    run,
    previous: input.previous,
    reportsDirectory: input.reportsDirectory,
    dataDirectory: input.dataDirectory,
    env,
  });

  if (run.autonomousQaAssessment && artifacts.remediation) {
    run.remediation = artifacts.remediation;
    run.autonomousQaAssessment = {
      ...run.autonomousQaAssessment,
      remediationReports: {
        status:
          artifacts.remediation.itemCount > 0 ? 'available' : 'empty',
        itemCount: artifacts.remediation.itemCount,
        markdownPath: artifacts.remediation.markdownPath,
        productionWrites: 'disabled-by-policy',
        items: artifacts.remediation.items,
      },
    };
  }

  if (run.autonomousQaAssessment && artifacts.releaseUpdate) {
    run.releaseUpdate = artifacts.releaseUpdate;
    run.autonomousQaAssessment = {
      ...run.autonomousQaAssessment,
      releaseUpdate: {
        status: artifacts.releaseUpdate.previousRunId
          ? 'available'
          : 'no-baseline',
        verdict: artifacts.releaseUpdate.verdict,
        previousStatus: artifacts.releaseUpdate.previousStatus,
        changedCount: artifacts.releaseUpdate.changed.length,
        nextAction: artifacts.releaseUpdate.recommendedNextAction,
        jsonPath: artifacts.releaseUpdate.jsonPath,
        changed: artifacts.releaseUpdate.changed,
      },
    };
  }

  if (run.autonomousQaAssessment) {
    run.autonomousQaAssessment = {
      ...run.autonomousQaAssessment,
      captcha: {
        status: captchaSolverKeyPresent(env)
          ? 'solver-opt-in'
          : captchaQueue.length > 0
            ? 'queued'
            : 'clear',
        queuedCount: captchaQueue.length,
        solver: captchaSolverKeyPresent(env) ? 'opt-in' : 'off',
        firstPartyConsent: true,
      },
      llm: humanReview?.llm ?? {
        status: 'off-no-key',
        label: 'LLM off — no key',
        engine: 'heuristic',
      },
    };
  }

  return {
    ...run,
    humanReview,
    rootCauseNotes: humanReview?.rootCauseNotes ?? run.rootCauseNotes,
  };
}
