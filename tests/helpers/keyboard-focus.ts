import type { Page } from '@playwright/test';

export const KEYBOARD_TAB_LIMIT = 12;

export interface FocusSnapshot {
  index: number;
  tag: string;
  role: string;
  name: string;
  id: string;
  href: string;
}

export function focusKey(snapshot: FocusSnapshot): string {
  return [
    snapshot.tag,
    snapshot.id,
    snapshot.role,
    snapshot.name,
    snapshot.href,
  ]
    .join('|')
    .toLowerCase();
}

/**
 * Three consecutive Tabs landing on the same in-page control is a trap.
 * Body / HTML focus means Tab left the document, which is not a trap.
 */
export function detectKeyboardTrap(
  sequence: FocusSnapshot[]
): { trapped: boolean; label?: string } {
  if (sequence.length < 3) {
    return { trapped: false };
  }

  for (let index = 2; index < sequence.length; index += 1) {
    const first = sequence[index - 2];
    const second = sequence[index - 1];
    const third = sequence[index];
    const key = focusKey(first);

    if (
      key === focusKey(second) &&
      key === focusKey(third) &&
      first.tag !== 'BODY' &&
      first.tag !== 'HTML'
    ) {
      return {
        trapped: true,
        label: first.name || first.id || first.tag,
      };
    }
  }

  return { trapped: false };
}

export async function countFocusable(page: Page): Promise<number> {
  return page.evaluate(() => {
    const candidates = [
      ...document.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ];

    return candidates.filter(element => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width + rect.height > 0
      );
    }).length;
  });
}

export async function readActiveFocus(
  page: Page,
  index: number
): Promise<FocusSnapshot> {
  return page.evaluate(tabIndex => {
    const active = document.activeElement;

    if (!(active instanceof HTMLElement)) {
      return {
        index: tabIndex,
        tag: 'BODY',
        role: '',
        name: '',
        id: '',
        href: '',
      };
    }

    const name =
      active.getAttribute('aria-label') ||
      active.getAttribute('title') ||
      (active.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);

    return {
      index: tabIndex,
      tag: active.tagName,
      role: active.getAttribute('role') ?? '',
      name,
      id: active.id,
      href: active.getAttribute('href') ?? '',
    };
  }, index);
}

export async function tabFocusSequence(
  page: Page,
  limit: number = KEYBOARD_TAB_LIMIT
): Promise<FocusSnapshot[]> {
  await page.evaluate(() => {
    const root = document.body;

    if (root && !root.hasAttribute('tabindex')) {
      root.setAttribute('tabindex', '-1');
    }

    root?.focus();
  });

  const sequence: FocusSnapshot[] = [];

  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press('Tab');
    sequence.push(await readActiveFocus(page, index));
  }

  return sequence;
}
