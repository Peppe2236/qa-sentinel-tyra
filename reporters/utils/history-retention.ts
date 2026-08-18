export const HISTORY_RETENTION_LIMIT = 50;

export function historyRetentionLimit(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env.QA_HISTORY_LIMIT?.trim();

  if (!raw) {
    return HISTORY_RETENTION_LIMIT;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return HISTORY_RETENTION_LIMIT;
  }

  return Math.floor(parsed);
}

/**
 * Keep the newest N dashboard runs. Older entries are dropped so
 * history.json cannot grow without bound.
 */
export function capHistory<T>(
  history: T[],
  limit: number = HISTORY_RETENTION_LIMIT
): T[] {
  const safeLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : HISTORY_RETENTION_LIMIT;

  if (history.length <= safeLimit) {
    return [...history];
  }

  return history.slice(-safeLimit);
}
