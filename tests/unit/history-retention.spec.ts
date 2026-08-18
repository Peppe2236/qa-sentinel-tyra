import { expect, test } from '@playwright/test';

import {
  capHistory,
  HISTORY_RETENTION_LIMIT,
  historyRetentionLimit,
} from '../../reporters/utils/history-retention';

test.describe('history retention', () => {
  test('default cap is 50', () => {
    expect(HISTORY_RETENTION_LIMIT).toBe(50);
    expect(historyRetentionLimit({})).toBe(50);
  });

  test('QA_HISTORY_LIMIT overrides when positive', () => {
    expect(historyRetentionLimit({ QA_HISTORY_LIMIT: '12' })).toBe(12);
    expect(historyRetentionLimit({ QA_HISTORY_LIMIT: '0' })).toBe(50);
    expect(historyRetentionLimit({ QA_HISTORY_LIMIT: 'nope' })).toBe(50);
  });

  test('keeps the newest N runs', () => {
    const history = Array.from({ length: 60 }, (_, index) => ({
      runId: `run-${index + 1}`,
    }));

    const capped = capHistory(history, 50);

    expect(capped).toHaveLength(50);
    expect(capped[0].runId).toBe('run-11');
    expect(capped[49].runId).toBe('run-60');
  });

  test('does not copy-truncate short history', () => {
    const history = [{ runId: 'a' }, { runId: 'b' }];

    expect(capHistory(history, 50)).toEqual(history);
    expect(capHistory(history, 50)).not.toBe(history);
  });
});
