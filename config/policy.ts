export type PolicyToggle = 'enabled' | 'disabled-by-policy';

export type LlmPolicyStatus = 'off-no-key' | 'key-present';

export interface QaPolicySnapshot {
  analysis: 'enabled';
  autonomousExecution: 'disabled-by-policy';
  productionWrites: 'disabled-by-policy';
  captchaClick: 'disabled-by-policy';
  llm: LlmPolicyStatus;
  flags: {
    QA_AUTONOMOUS_EXECUTION: boolean;
    QA_PRODUCTION_WRITES: boolean;
    QA_CLICK_CAPTCHA: boolean;
    SENTINEL_LLM_API_KEY: boolean;
    OPENAI_API_KEY: boolean;
  };
  notes: string[];
}

export const AUTONOMOUS_EXECUTION_FLAG = 'QA_AUTONOMOUS_EXECUTION';

export function llmKeyPresent(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return Boolean(
    env.SENTINEL_LLM_API_KEY?.trim() || env.OPENAI_API_KEY?.trim()
  );
}

export function snapshotQaPolicy(
  env: NodeJS.ProcessEnv = process.env
): QaPolicySnapshot {
  const llm = llmKeyPresent(env) ? 'key-present' : 'off-no-key';
  const wantsExecution = env.QA_AUTONOMOUS_EXECUTION === 'true';

  return {
    analysis: 'enabled',
    autonomousExecution: 'disabled-by-policy',
    productionWrites: 'disabled-by-policy',
    captchaClick: 'disabled-by-policy',
    llm,
    flags: {
      QA_AUTONOMOUS_EXECUTION: wantsExecution,
      QA_PRODUCTION_WRITES: false,
      QA_CLICK_CAPTCHA: false,
      SENTINEL_LLM_API_KEY: Boolean(env.SENTINEL_LLM_API_KEY?.trim()),
      OPENAI_API_KEY: Boolean(env.OPENAI_API_KEY?.trim()),
    },
    notes: [
      'Read-only analyzers default ON and run in the reporter onEnd.',
      wantsExecution
        ? `${AUTONOMOUS_EXECUTION_FLAG} is set, but production writes, captcha clicks and autonomous execution remain unimplemented and blocked by policy.`
        : `Autonomous execution is disabled by policy (${AUTONOMOUS_EXECUTION_FLAG}). Production writes and captcha clicks stay off.`,
      llm === 'off-no-key'
        ? 'LLM off — no key. Heuristic Sentinel AI still runs.'
        : 'LLM key present. Enrichment is best-effort; heuristic Sentinel AI stays the authority if the call is skipped or fails.',
    ],
  };
}

export function autonomousPolicySummary(
  policy: QaPolicySnapshot = snapshotQaPolicy()
): string {
  return policy.notes[1] ?? policy.notes[0];
}
