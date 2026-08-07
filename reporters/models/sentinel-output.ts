import type {
  DashboardRun,
} from './types';

import type {
  SentinelAiSummary,
} from '../analyzers/sentinel-ai';

export type SentinelOutput =
  DashboardRun & {
    sentinelAi: SentinelAiSummary;
  };