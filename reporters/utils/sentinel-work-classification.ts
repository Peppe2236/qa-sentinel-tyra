export type SentinelWorkKind =
  | 'advisory'
  | 'remediation'
  | 'human-captcha'
  | 'llm-skipped';

export interface SentinelWorkItemInput {
  bucket?: SentinelWorkKind;
  source?: string;
  classification?: string;
  title?: string;
  captchaKind?: string;
  llmStatus?: string;
}

const REMEDIATION_CLASSIFICATIONS = new Set([
  'product-bug',
  'content-bug',
  'security-issue',
]);

function haystack(item: SentinelWorkItemInput): string {
  return [
    item.source,
    item.classification,
    item.title,
    item.captchaKind,
    item.llmStatus,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function classifySentinelWorkItem(
  item: SentinelWorkItemInput
): SentinelWorkKind {
  if (item.bucket) {
    return item.bucket;
  }

  const text = haystack(item);

  if (
    item.source === 'human-captcha' ||
    item.captchaKind === 'recaptcha' ||
    item.captchaKind === 'hcaptcha' ||
    text.includes('recaptcha') ||
    text.includes('hcaptcha')
  ) {
    return 'human-captcha';
  }

  if (
    item.source === 'llm-skipped' ||
    item.llmStatus === 'off-no-key'
  ) {
    return 'llm-skipped';
  }

  if (
    item.source === 'remediation' ||
    (item.classification &&
      REMEDIATION_CLASSIFICATIONS.has(item.classification)) ||
    text.includes('theme toggle') ||
    text.includes('duplicated') ||
    text.includes('content-security-policy') ||
    text.includes('header gap')
  ) {
    return 'remediation';
  }

  return 'advisory';
}
