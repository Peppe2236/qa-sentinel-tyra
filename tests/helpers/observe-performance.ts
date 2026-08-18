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
  fcpMs: number | null;
  lcpMs: number | null;
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

  await page.addInitScript(() => {
    const state = {
      fcp: null as number | null,
      lcp: null as number | null,
    };

    (globalThis as { __qaWebVitals?: typeof state }).__qaWebVitals = state;

    try {
      const paintObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            state.fcp = entry.startTime;
          }
        }
      });

      paintObserver.observe({
        type: 'paint',
        buffered: true,
      });
    } catch {
      // Paint timing is optional.
    }

    try {
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];

        if (last) {
          state.lcp = last.startTime;
        }
      });

      lcpObserver.observe({
        type: 'largest-contentful-paint',
        buffered: true,
      });
    } catch {
      // LCP is Chromium-first. Absence is not-observed, not poor.
    }
  });

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

    await page.waitForTimeout(400);
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

  const vitals = await page.evaluate(() => {
    const state = (globalThis as {
      __qaWebVitals?: {
        fcp: number | null;
        lcp: number | null;
      };
    }).__qaWebVitals;

    const paints = performance.getEntriesByType('paint');
    const fcpEntry = paints.find(
      entry => entry.name === 'first-contentful-paint'
    );

    const fcpMs =
      fcpEntry && fcpEntry.startTime > 0
        ? Math.round(fcpEntry.startTime)
        : state?.fcp != null && state.fcp > 0
          ? Math.round(state.fcp)
          : null;

    const lcpMs =
      state?.lcp != null && state.lcp > 0
        ? Math.round(state.lcp)
        : null;

    return { fcpMs, lcpMs };
  });

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
    fcpMs: vitals.fcpMs,
    lcpMs: vitals.lcpMs,
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

  if (observed.lcpMs == null) {
    pushObservation(info, {
      area: 'largest-contentful-paint',
      page: pageLabel,
      observation: 'not-observed',
      sampleCount: 0,
      source: 'performance-observer',
      fcpMs: observed.fcpMs ?? undefined,
    });
  } else {
    pushObservation(info, {
      area: 'largest-contentful-paint',
      page: pageLabel,
      durationMs: observed.lcpMs,
      sampleCount: 1,
      source: 'performance-observer',
      fcpMs: observed.fcpMs ?? undefined,
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

  if (
    typeof observed.lcpMs === 'number' &&
    typeof pageLoadThreshold === 'number'
  ) {
    expect(
      observed.lcpMs,
      `${pageLabel} LCP was ${observed.lcpMs} ms (FCP ${observed.fcpMs ?? 'not-observed'}); threshold is ${pageLoadThreshold} ms. Not-observed LCP is not scored as poor.`
    ).toBeLessThanOrEqual(pageLoadThreshold);
  }
}
