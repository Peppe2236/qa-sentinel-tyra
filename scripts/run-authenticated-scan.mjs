import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [
  startUrl,
  siteId,
  storageStateArgument,
  ...seedRoutes
] = process.argv.slice(2);

if (!startUrl || !siteId || !storageStateArgument) {
  console.error(
    'Usage: node scripts/run-authenticated-scan.mjs ' +
    '<url> <site-id> <storage-state> [seed routes...]'
  );
  process.exit(1);
}

const storageState = path.resolve(
  process.cwd(),
  storageStateArgument
);

const outputFile = path.resolve(
  process.cwd(),
  'dashboard/data',
  `discovered-pages-${siteId}-authenticated.json`
);

function hasAuthData(file) {
  if (!fs.existsSync(file)) {
    return false;
  }

  try {
    const state = JSON.parse(
      fs.readFileSync(file, 'utf8')
    );

    return (
      (Array.isArray(state.cookies) &&
        state.cookies.length > 0) ||
      (Array.isArray(state.origins) &&
        state.origins.length > 0)
    );
  } catch {
    return false;
  }
}

if (!hasAuthData(storageState)) {
  fs.rmSync(outputFile, { force: true });

  console.log('');
  console.log(
    `Authenticated discovery skipped for ${siteId}.`
  );
  console.log(
    `No usable storageState: ${storageStateArgument}`
  );
  console.log(
    'Anonymous discovery remains available.'
  );
  console.log('');

  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [
    'scripts/scan-site.mjs',
    startUrl,
    siteId,
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      QA_SCAN_VARIANT: 'authenticated',
      QA_STORAGE_STATE: storageStateArgument,
      QA_SCAN_SEEDS: seedRoutes.join(','),
    },
  }
);

if (result.error) {
  throw result.error;
}

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

if (
  fs.existsSync(outputFile) &&
  seedRoutes.length > 0
) {
  const report =
    JSON.parse(
      fs.readFileSync(
        outputFile,
        'utf8'
      )
    );

  const probeResults =
    seedRoutes.map(seedRoute => {
      const requestedPathname =
        new URL(
          seedRoute,
          startUrl
        ).pathname;

      const page =
        (report.pages ?? []).find(
          item => {
            try {
              return (
                new URL(
                  item.url
                ).pathname ===
                requestedPathname
              );
            } catch {
              return false;
            }
          }
        );

      const finalPathname =
        page
          ? (
              page.finalPathname ??
              new URL(
                page.finalUrl
              ).pathname
            )
          : null;

      const redirectedToSignin =
        finalPathname === '/signin';

      return {
        requestedPathname,
        observed:
          Boolean(page),
        finalPathname,
        redirectedToSignin,
        verified:
          Boolean(page) &&
          !redirectedToSignin,
      };
    });

  const authSessionVerified =
    probeResults.every(
      probe =>
        probe.verified
    );

  report.authSessionVerified =
    authSessionVerified;

  report.authProbeRoutes =
    seedRoutes;

  report.authProbeResults =
    probeResults;

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      report,
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log('');
  console.log(
    '===== AUTH SESSION VERIFICATION ====='
  );

  for (
    const probe
    of probeResults
  ) {
    console.log(
      `${probe.requestedPathname} -> ` +
      `${probe.finalPathname ?? 'NOT OBSERVED'} ` +
      `${
        probe.verified
          ? '[VERIFIED]'
          : '[NOT VERIFIED]'
      }`
    );
  }

  console.log(
    `Authenticated session: ${
      authSessionVerified
        ? 'VERIFIED'
        : 'NOT VERIFIED'
    }`
  );

  console.log('');
}

process.exit(0);
