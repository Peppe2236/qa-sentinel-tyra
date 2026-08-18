import type { SentinelAiLlm, SentinelAiSummary } from '../analyzers/sentinel-ai';
import {
  llmKeyPresent,
} from '../../config/policy';

const LLM_TIMEOUT_MS = 8_000;

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

function llmEndpoint(env: NodeJS.ProcessEnv): string {
  const base =
    env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';
  return `${base.replace(/\/$/, '')}/chat/completions`;
}

function llmKey(env: NodeJS.ProcessEnv): string {
  return (
    env.SENTINEL_LLM_API_KEY?.trim() ||
    env.OPENAI_API_KEY?.trim() ||
    ''
  );
}

export async function maybeEnrichSentinelAi(
  summary: SentinelAiSummary,
  env: NodeJS.ProcessEnv = process.env
): Promise<SentinelAiSummary> {
  const baseline = withLlmStatus(summary, env);

  if (baseline.llm?.status === 'off-no-key') {
    return baseline;
  }

  const key = llmKey(env);

  if (!key) {
    return withLlmStatus(summary, env);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch(llmEndpoint(env), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.SENTINEL_LLM_MODEL?.trim() || 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              'You refine a QA heuristic summary. Do not invent failures. Keep uncertainty. Return a short paragraph only.',
          },
          {
            role: 'user',
            content: [
              baseline.summary,
              baseline.likelyRootCause,
              baseline.recommendation,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ...baseline,
        llm: {
          status: 'error',
          label: `LLM off — HTTP ${response.status}`,
          engine: 'heuristic',
        },
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        ...baseline,
        llm: {
          status: 'error',
          label: 'LLM off — empty response',
          engine: 'heuristic',
        },
      };
    }

    return {
      ...baseline,
      summary: content,
      llm: {
        status: 'enriched',
        label: 'LLM enriched — heuristic still recorded',
        engine: 'openai',
      },
    };
  } catch {
    return {
      ...baseline,
      llm: {
        status: 'error',
        label: 'LLM off — call failed or timed out',
        engine: 'heuristic',
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
