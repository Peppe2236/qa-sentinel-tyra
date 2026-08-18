import fs from 'node:fs';
import path from 'node:path';

import { CAPTCHA_QUEUE_DIRECTORY } from '../../config/first-party';
import type { CaptchaQueueItem } from '../models/types';

export function captchaQueueDirectory(
  cwd: string = process.cwd()
): string {
  return path.resolve(cwd, CAPTCHA_QUEUE_DIRECTORY);
}

export function recordCaptchaQueueItem(
  item: CaptchaQueueItem,
  cwd: string = process.cwd()
): string {
  const directory = captchaQueueDirectory(cwd);
  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${item.id}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(item, null, 2)}\n`, 'utf8');
  return filePath;
}

export function loadCaptchaQueue(
  cwd: string = process.cwd()
): CaptchaQueueItem[] {
  const directory = captchaQueueDirectory(cwd);

  if (!fs.existsSync(directory)) {
    return [];
  }

  const items: CaptchaQueueItem[] = [];

  for (const name of fs.readdirSync(directory)) {
    if (!name.endsWith('.json')) {
      continue;
    }

    try {
      const parsed = JSON.parse(
        fs.readFileSync(path.join(directory, name), 'utf8')
      ) as CaptchaQueueItem;

      if (parsed?.id && parsed?.kind) {
        items.push(parsed);
      }
    } catch {
      // Ignore a corrupt queue file; the pack still builds.
    }
  }

  return items.sort((left, right) =>
    left.id.localeCompare(right.id)
  );
}
