import path from 'node:path';
import type { TestResult } from '@playwright/test/reporter';
import type {
  AttachmentKind,
  DashboardAttachment,
} from '../models/types';

function attachmentKind(
  contentType: string,
  name: string
): AttachmentKind {
  const text = `${contentType} ${name}`.toLowerCase();

  if (text.includes('image')) return 'screenshot';
  if (text.includes('video')) return 'video';
  if (text.includes('trace')) return 'trace';
  if (text.includes('text') || text.includes('log')) return 'log';

  return 'other';
}

export function analyzeAttachments(
  result: TestResult
): DashboardAttachment[] {
  return result.attachments.map(attachment => {
    const absolutePath = attachment.path;
    const relativePath = absolutePath
      ? path.relative(process.cwd(), absolutePath).replaceAll('\\', '/')
      : undefined;

    return {
      name: attachment.name,
      path: absolutePath,
      relativePath,
      contentType: attachment.contentType,
      kind: attachmentKind(attachment.contentType, attachment.name),
    };
  });
}
