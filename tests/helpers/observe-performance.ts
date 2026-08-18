import {
  expect,
  type Page,
  type Request,
  type TestInfo,
} from '@playwright/test';

import {
  classifyLatencySamples,
  PERFORMANCE_OBSERVATION_TYPE,
  type PerformanceObservationPayload,
} from '../../reporters/utils/performance-metrics';
import {
  loadSecurityPerformanceConfig,
} from '../../reporters/utils/security-performance-config';

export interface ObservedPagePerformance {
  url: string;
  status: number;
  playwrightLoadMs: number;
  navigationDurationMs: number | null;
  durationMs: number;
  source: 'navigation-timing' | 'playwright-load';
  apiSamplesMs: number[];
}

function sameOrigin(left: string, right: string): boolean {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

function isFirstPartyXhrOrFetch(
  request: Request,
  pageUrl: string
): boolean {
  const type = request.resourceType();

  if (type !== 'xhr' && type !== 'fetch') {
    return false;
  }

  return sameOrigin(pageUrl, request.url());
}

function requestDurationMs(request: Request): number | undefined {
  const timing = request.timing();

  if (timing.responseEnd < 0) {
    return undefined;
  }

  return Math.round(timing.responseEnd);
}

export async function observePagePerformance(
  page: Page,
  url: string
): Promise<ObservedPagePerformance> {
  const apiSamplesMs: number[] = [];
  const targetOrigin = new URL(url).origin;

  const onRequestFinished = (request: Request): void => {
    if (!isFirstPartyXhrOrFetch(request, url)) {
      return;
    }

    const duration = requestDurationMs(request);

    if (typeof duration === 'number' && duration >= 0) {
      apiSamplesMs.push(duration);
    }
  };

  page.on('requestfinished', onRequestFinished);

  const started = Date.now();
  let response;

  try {
    response = await page.goto(url, {
      waitUntil: 'load',
    });

    await page.waitForLoadState('networkidle', {
      timeout: 2_000,
    }).catch(() => undefined);
  } finally {
    page.off('requestfinished', onRequestFinished);
  }

  const playwrightLoadMs = Date.now() - started;

  if (!response) {
    throw new Error(`${url} returned no document response`);
  }

  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming | undefined;

    if (!entry) {
      return { durationMs: null as number | null };
    }

    const duration =
      entry.duration > 0
        ? entry.duration
        : entry.loadEventEnd > 0
          ? entry.loadEventEnd
          : null;

    return { durationMs: duration };
  });

  const resourceApi = await page.evaluate(origin => {
    return performance
      .getEntriesByType('resource')
      .filter(entry => {
        const resource = entry as PerformanceResourceTiming;

        if (
          resource.initiatorType !== 'fetch' &&
          resource.initiatorType !== 'xmlhttprequest'
        ) {
          return false;
        }

        try {
          return new URL(resource.name).origin === origin;
        } catch {
          return false;
        }
      })
      .map(entry => Math.round(entry.duration));
  }, targetOrigin);

  for (const duration of resourceApi) {
    if (duration >= 0) {
      apiSamplesMs.push(duration);
    }
  }

  const navigationDurationMs =
    navigation.durationMs != null && navigation.durationMs > 0
      ? Math.round(navigation.durationMs)
      : null;

  return {
    url: page.url(),
    status: response.status(),
    playwrightLoadMs,
    navigationDurationMs,
    durationMs: navigationDurationMs ?? playwrightLoadMs,
    source:
      navigationDurationMs != null
        ? 'navigation-timing'
        : 'playwright-load',
    apiSamplesMs,
  };
}

function pushObservation(
  info: TestInfo,
  payload: PerformanceObservationPayload
): void {
  info.annotations.push({
    type: PERFORMANCE_OBSERVATION_TYPE,
    description: JSON.stringify(payload),
  });
}

export function assertMeasuredPagePerformance(
  info: TestInfo,
  pageLabel: string,
  observed: ObservedPagePerformance
): void {
  const thresholds = loadSecurityPerformanceConfig().performance.thresholds;
  const pageLoadThreshold = thresholds.pageLoadMs;
  const apiThreshold = thresholds.apiLatencyMs;
  const apiClassification = classifyLatencySamples(
    observed.apiSamplesMs,
    apiThreshold
  );

  pushObservation(info, {
    area: 'page-load',
    page: pageLabel,
    durationMs: observed.durationMs,
    sampleCount: 1,
    source: observed.source,
  });

  if (apiClassification.status === 'not-observed') {
    pushObservation(info, {
      area: 'api-latency',
      page: pageLabel,
      observation: 'not-observed',
      sampleCount: 0,
      source: 'xhr-fetch',
    });
  } else {
    pushObservation(info, {
      area: 'api-latency',
      page: pageLabel,
      durationMs: apiClassification.p95,
      p50Ms: apiClassification.p50,
      p95Ms: apiClassification.p95,
      sampleCount: apiClassification.sampleCount,
      source: 'xhr-fetch',
    });
  }

  expect(
    observed.status,
    `${pageLabel} returned HTTP ${observed.status}`
  ).toBeLessThan(400);

  if (typeof pageLoadThreshold === 'number') {
    expect(
      observed.durationMs,
      `${pageLabel} page load was ${observed.durationMs} ms (${observed.source}); threshold is ${pageLoadThreshold} ms`
    ).toBeLessThanOrEqual(pageLoadThreshold);
  }

  if (
    apiClassification.status === 'poor' &&
    typeof apiThreshold === 'number' &&
    typeof apiClassification.p95 === 'number'
  ) {
    expect(
      apiClassification.p95,
      `${pageLabel} first-party XHR/fetch p95 was ${apiClassification.p95} ms across ${apiClassification.sampleCount} sample(s); threshold is ${apiThreshold} ms`
    ).toBeLessThanOrEqual(apiThreshold);
  }
}
