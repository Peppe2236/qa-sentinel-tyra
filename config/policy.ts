export type PolicyToggle = 'enabled' | 'disabled-by-policy';

export type CaptchaPolicy =
  | 'first-party-consent'
  | 'solver-opt-in'
  | 'disabled-by-policy';

export type LlmPolicyStatus = 'off-no-key' | 'key-present';

export type RemediationReportsPolicy = 'enabled' | 'disabled-by-policy';

export type GithubIssuesPolicy = 'opt-in' | 'disabled-by-policy';

export interface QaPolicySnapshot {
  analysis: 'enabled';
  autonomousExecution: 'disabled-by-policy';
  productionWrites: 'disabled-by-policy';
  captchaClick: CaptchaPolicy;
  autonomousRemediationReports: RemediationReportsPolicy;
  githubIssues: GithubIssuesPolicy;
  llm: LlmPolicyStatus;
  flags: {
    QA_AUTONOMOUS_EXECUTION: boolean;
    QA_PRODUCTION_WRITES: boolean;
    QA_CLICK_CAPTCHA: boolean;
    QA_FIRST_PARTY_CONSENT: boolean;
    QA_AUTONOMOUS_REMEDIATION: boolean;
    QA_CREATE_ISSUES: boolean;
    SENTINEL_LLM_API_KEY: boolean;
    OPENAI_API_KEY: boolean;
    SENTINEL_CAPTCHA_SOLVER_KEY: boolean;
  };
  notes: string[];
}

export const AUTONOMOUS_EXECUTION_FLAG = 'QA_AUTONOMOUS_EXECUTION';

function envFlagOn(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(
    (value ?? '').trim().toLowerCase()
  );
}

function envFlagOff(value: string | undefined): boolean {
  return ['0', 'false', 'no', 'off'].includes(
    (value ?? '').trim().toLowerCase()
  );
}

export function llmKeyPresent(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return Boolean(
    env.SENTINEL_LLM_API_KEY?.trim() || env.OPENAI_API_KEY?.trim()
  );
}

export function captchaSolverKeyPresent(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return Boolean(env.SENTINEL_CAPTCHA_SOLVER_KEY?.trim());
}

export function githubToken(
  env: NodeJS.ProcessEnv = process.env
): string {
  return env.GH_TOKEN?.trim() || env.GITHUB_TOKEN?.trim() || '';
}

export function remediationReportsEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (envFlagOff(env.QA_AUTONOMOUS_REMEDIATION)) {
    return false;
  }

  return true;
}

export function createGithubIssuesEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return envFlagOn(env.QA_CREATE_ISSUES) && Boolean(githubToken(env));
}

export function snapshotQaPolicy(
  env: NodeJS.ProcessEnv = process.env
): QaPolicySnapshot {
  const llm = llmKeyPresent(env) ? 'key-present' : 'off-no-key';
  const wantsExecution = envFlagOn(env.QA_AUTONOMOUS_EXECUTION);
  const solverKey = captchaSolverKeyPresent(env);
  const reportsOn = remediationReportsEnabled(env);
  const issuesOn = createGithubIssuesEnabled(env);

  return {
    analysis: 'enabled',
    autonomousExecution: 'disabled-by-policy',
    productionWrites: 'disabled-by-policy',
    captchaClick: solverKey ? 'solver-opt-in' : 'first-party-consent',
    autonomousRemediationReports: reportsOn
      ? 'enabled'
      : 'disabled-by-policy',
    githubIssues: issuesOn ? 'opt-in' : 'disabled-by-policy',
    llm,
    flags: {
      QA_AUTONOMOUS_EXECUTION: wantsExecution,
      QA_PRODUCTION_WRITES: false,
      QA_CLICK_CAPTCHA: solverKey,
      QA_FIRST_PARTY_CONSENT: true,
      QA_AUTONOMOUS_REMEDIATION: reportsOn,
      QA_CREATE_ISSUES: issuesOn,
      SENTINEL_LLM_API_KEY: Boolean(env.SENTINEL_LLM_API_KEY?.trim()),
      OPENAI_API_KEY: Boolean(env.OPENAI_API_KEY?.trim()),
      SENTINEL_CAPTCHA_SOLVER_KEY: solverKey,
    },
    notes: [
      'Advisory analysis and local remediation/release reports default ON and run in the reporter onEnd.',
      wantsExecution
        ? `${AUTONOMOUS_EXECUTION_FLAG} is set, but production writes against nation.dev stay blocked. Local reports still write. Captcha solver stays off unless SENTINEL_CAPTCHA_SOLVER_KEY is set.`
        : `Autonomous execution is disabled by policy (${AUTONOMOUS_EXECUTION_FLAG}). Production writes stay off. First-party cookie/consent clicks are on; paid captcha solver stays off unless SENTINEL_CAPTCHA_SOLVER_KEY is set.`,
      llm === 'off-no-key'
        ? 'LLM off — no key. Heuristic Sentinel AI and advisory still run.'
        : 'LLM key present. Enrichment is best-effort; heuristic Sentinel AI stays the authority if the call is skipped or fails.',
      reportsOn
        ? 'Local remediation reports are on (QA_AUTONOMOUS_REMEDIATION). They never mutate nation.dev.'
        : 'Local remediation reports are off (QA_AUTONOMOUS_REMEDIATION=0).',
      issuesOn
        ? 'GitHub issue creation is opt-in for Peppe2236/qa-sentinel-tyra only.'
        : 'GitHub issue creation is off unless QA_CREATE_ISSUES=1 and GH_TOKEN/GITHUB_TOKEN are set.',
    ],
  };
}

export function autonomousPolicySummary(
  policy: QaPolicySnapshot = snapshotQaPolicy()
): string {
  return policy.notes[1] ?? policy.notes[0];
}
