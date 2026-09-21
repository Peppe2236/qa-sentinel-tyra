import { spawn } from 'node:child_process';

const children = [];
let stopping = false;

function start(
  label,
  script
) {
  const child =
    spawn(
      process.execPath,
      [script],
      {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: process.env,
      }
    );

  children.push(child);

  child.once(
    'error',
    error => {
      console.error(
        `[QA Sentinel] ${label} failed: ` +
        error.message
      );
      stop(1);
    }
  );

  child.once(
    'exit',
    code => {
      if (!stopping && code) {
        console.error(
          `[QA Sentinel] ${label} exited ` +
          `with code ${code}.`
        );
        stop(code);
      }
    }
  );
}

function stop(code = 0) {
  if (stopping) {
    return;
  }

  stopping = true;

  for (const child of children) {
    if (
      child.exitCode === null
    ) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(
    () => process.exit(code),
    100
  ).unref();
}

process.once(
  'SIGINT',
  () => stop(0)
);

process.once(
  'SIGTERM',
  () => stop(0)
);

start(
  'Dashboard',
  'scripts/serve-dashboard.mjs'
);

start(
  'Authentication Manager',
  'scripts/auth-manager-server.mjs'
);
