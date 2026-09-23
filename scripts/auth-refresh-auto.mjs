import {
  spawnSync,
} from 'node:child_process';

import process from 'node:process';


const site =
  process.argv[2];


const configs = {
  nation: {
    label:
      'Nation',

    setupFile:
      'tests/auth/nation.setup.ts',

    project:
      'nation-auth-setup',
  },

  'ai-skills': {
    label:
      'AI Skills',

    setupFile:
      'tests/auth/ai-skills.setup.ts',

    project:
      'ai-skills-auth-setup',
  },
};


const config =
  configs[site];


if (!config) {
  console.error(
    'Usage: node scripts/auth-refresh-auto.mjs <nation|ai-skills>'
  );

  process.exit(2);
}


function run(
  command,
  args
) {
  const result =
    spawnSync(
      command,
      args,
      {
        cwd:
          process.cwd(),

        env:
          process.env,

        stdio:
          'inherit',

        shell:
          false,
      }
    );

  if (result.error) {
    console.error(
      `[Auth] ${result.error.message}`
    );

    return 1;
  }

  return (
    result.status ??
    1
  );
}


const npx =
  process.platform ===
  'win32'
    ? 'npx.cmd'
    : 'npx';


console.log('');
console.log(
  '============================================================'
);

console.log(
  `QA SENTINEL TYRA — ${config.label.toUpperCase()} AUTH REFRESH`
);

console.log(
  '============================================================'
);

console.log(
  'Strategy: existing session -> automatic login -> manual fallback'
);

console.log('');


/*
 * First run the existing Playwright auth setup.
 *
 * The setup already uses:
 *   readOptionalCredentials(...)
 *   completeConfiguredLogin(...)
 *
 * and writes the normal storageState.
 */
console.log(
  `[Auth] Attempting automatic ${config.label} login...`
);

console.log('');


const automaticResult =
  run(
    npx,
    [
      'playwright',
      'test',

      config.setupFile,

      '--project',
      config.project,

      '--workers=1',

      '--headed',
    ]
  );


if (
  automaticResult ===
  0
) {
  console.log('');
  console.log(
    `[Auth] Automatic ${config.label} login succeeded.`
  );

  console.log(
    '[Auth] Running normal session verification and authenticated discovery...'
  );

  console.log('');

  const verificationResult =
    run(
      process.execPath,
      [
        'scripts/auth-refresh.mjs',
        site,
      ]
    );

  process.exit(
    verificationResult
  );
}


/*
 * Auto-login may legitimately fail because Google asks
 * for MFA, captcha, device verification, etc.
 *
 * In that case retain the existing real-Chrome capture
 * as the human fallback.
 */
console.log('');
console.log(
  `[Auth] Automatic ${config.label} login did not complete.`
);

console.log(
  '[Auth] Falling back to real Chrome for manual authentication.'
);

console.log('');


const fallbackResult =
  run(
    process.execPath,
    [
      'scripts/auth-refresh.mjs',
      site,
    ]
  );


process.exit(
  fallbackResult
);
