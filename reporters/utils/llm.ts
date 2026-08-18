import type { SentinelAiLlm, SentinelAiSummary } from '../analyzers/sentinel-ai';
import {
  llmKeyPresent,
} from '../../config/policy';

export const LLM_TIMEOUT_MS = 8_000;
export const LLM_MAX_TOKENS = 400;

export type FetchLike = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

export function llmStatusFromEnv(
  env: NodeJS.ProcessEnv = process.env
): SentinelAiLlm {
  if (!llmKeyPresent(env)) {
    return {
      status: 'off-no-key',
      label: 'LLM off — no key',
      engine: 'heuristic',
    };
  }

  return {
    status: 'key-present',
    label: 'LLM key present — heuristic still authoritative',
    engine: 'heuristic',
  };
}

export function withLlmStatus(
  summary: SentinelAiSummary,
  env: NodeJS.ProcessEnv = process.env
): SentinelAiSummary {
  return {
    ...summary,
    llm: summary.llm ?? llmStatusFromEnv(env),
  };
}

export function llmEndpoint(env: NodeJS.ProcessEnv = process.env): string {
  const base =
    env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';
  return `${base.replace(/\/$/, '')}/chat/completions`;
}

export function llmKey(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.SENTINEL_LLM_API_KEY?.trim() ||
    env.OPENAI_API_KEY?.trim() ||
    ''
  );
}

export function redactSecrets(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/(password|passwd|pwd|secret)\s*[=:]\s*\S+/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9]{10,}\b/g, '[redacted-key]')
    .replace(/\b(NATION_TEST_PASSWORD|AI_SKILLS_TEST_PASSWORD|OPENAI_API_KEY|SENTINEL_LLM_API_KEY|SENTINEL_CAPTCHA_SOLVER_KEY|GH_TOKEN|GITHUB_TOKEN)\b[^\n]*/gi, '$1=[redacted]');
}

export type LlmChatResult =
  | { ok: true; content: string }
  | { ok: false; label: string };

export async function completeLlmChat(input: {
  system: string;
  user: string;
  maxTokens?: number;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<LlmChatResult> {
  const env = input.env ?? process.env;
  const key = llmKey(env);

  if (!key) {
    return {
      ok: false,
      label: 'LLM off — no key',
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? LLM_TIMEOUT_MS
  );

  try {
    const response = await fetchImpl(llmEndpoint(env), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.SENTINEL_LLM_MODEL?.trim() || 'gpt-4o-mini',
        temperature: 0,
        max_tokens: input.maxTokens ?? LLM_MAX_TOKENS,
        messages: [
          {
            role: 'system',
            content: redactSecrets(input.system),
          },
          {
            role: 'user',
            content: redactSecrets(input.user),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        label: `LLM off — HTTP ${response.status}`,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        ok: false,
        label: 'LLM off — empty response',
      };
    }

    return { ok: true, content };
  } catch {
    return {
      ok: false,
      label: 'LLM off — call failed or timed out',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function maybeEnrichSentinelAi(
  summary: SentinelAiSummary,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: FetchLike
): Promise<SentinelAiSummary> {
  const baseline = withLlmStatus(summary, env);

  if (baseline.llm?.status === 'off-no-key') {
    return baseline;
  }

  const result = await completeLlmChat({
    system:
      'You refine a QA heuristic summary. Do not invent failures. Keep uncertainty. Return a short paragraph only.',
    user: [
      baseline.summary,
      baseline.likelyRootCause,
      baseline.recommendation,
    ]
      .filter(Boolean)
      .join('\n'),
    maxTokens: 220,
    env,
    fetchImpl,
  });

  if (!result.ok) {
    return {
      ...baseline,
      llm: {
        status: result.label === 'LLM off — no key' ? 'off-no-key' : 'error',
        label: result.label,
        engine: 'heuristic',
      },
    };
  }

  return {
    ...baseline,
    summary: result.content,
    llm: {
      status: 'enriched',
      label: 'LLM enriched — heuristic still recorded',
      engine: 'openai',
    },
  };
}
