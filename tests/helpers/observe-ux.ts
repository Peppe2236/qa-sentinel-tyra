import type { Page, TestInfo } from '@playwright/test';

export const UX_OBSERVATION_TYPE = 'ux-observation';

export interface ObservedUxChrome {
  navLandmark: boolean;
  visibleLinkCount: number;
  headingCount: number;
  formControlCount: number;
  viewportWidth: number | null;
  viewportHeight: number | null;
}

export interface ObservedLayoutShift {
  cls: number | null;
  sampleCount: number;
  source: 'layout-shift' | 'not-observed';
}

export async function observeUxChrome(
  page: Page
): Promise<ObservedUxChrome> {
  const viewport = page.viewportSize();

  const chrome = await page.evaluate(() => {
    const nav = document.querySelector(
      'nav, [role="navigation"], header, [data-sidebar], [data-slot="sidebar"]'
    );

    const visible = (element: Element): boolean => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width + rect.height > 0
      );
    };

    const links = [...document.querySelectorAll('a')].filter(visible);
    const headings = [...document.querySelectorAll(
      'h1, h2, h3, [role="heading"]'
    )].filter(visible);
    const forms = [...document.querySelectorAll(
      'form, input, textarea, select, [role="form"]'
    )].filter(visible);

    return {
      navLandmark: Boolean(nav),
      visibleLinkCount: links.length,
      headingCount: headings.length,
      formControlCount: forms.length,
    };
  });

  return {
    ...chrome,
    viewportWidth: viewport?.width ?? null,
    viewportHeight: viewport?.height ?? null,
  };
}

export async function installLayoutShiftObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = {
      cls: 0,
      sampleCount: 0,
      supported: false,
    };

    (globalThis as { __qaLayoutShift?: typeof state }).__qaLayoutShift = state;

    try {
      const observer = new PerformanceObserver(list => {
        state.supported = true;

        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };

          if (shift.hadRecentInput) {
            continue;
          }

          if (typeof shift.value === 'number') {
            state.cls += shift.value;
            state.sampleCount += 1;
          }
        }
      });

      observer.observe({
        type: 'layout-shift',
        buffered: true,
      });
    } catch {
      // Firefox/WebKit may not expose LayoutShift. Absence is not-observed.
    }
  });
}

export async function readLayoutShift(
  page: Page
): Promise<ObservedLayoutShift> {
  const observed = await page.evaluate(() => {
    const state = (globalThis as {
      __qaLayoutShift?: {
        cls: number;
        sampleCount: number;
        supported: boolean;
      };
    }).__qaLayoutShift;

    if (!state || (!state.supported && state.sampleCount === 0)) {
      return {
        cls: null as number | null,
        sampleCount: 0,
        supported: false,
      };
    }

    return {
      cls: state.cls,
      sampleCount: state.sampleCount,
      supported: true,
    };
  });

  if (!observed.supported) {
    return {
      cls: null,
      sampleCount: 0,
      source: 'not-observed',
    };
  }

  return {
    cls: Number((observed.cls ?? 0).toFixed(4)),
    sampleCount: observed.sampleCount,
    source: 'layout-shift',
  };
}

export function annotateUxObservation(
  info: TestInfo,
  payload: Record<string, unknown>
): void {
  info.annotations.push({
    type: UX_OBSERVATION_TYPE,
    description: JSON.stringify(payload),
  });
}
