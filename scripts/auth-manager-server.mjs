import http from 'node:http';
import { spawn } from 'node:child_process';

const host = '127.0.0.1';
const port = Number(
  process.env.QA_AUTH_MANAGER_PORT ??
  43174
);

const jobs = new Map();

function originAllowed(value) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    const hostAllowed = [
      '127.0.0.1',
      'localhost',
      '[::1]',
      '::1',
    ].includes(url.hostname);

    return (
      hostAllowed &&
      url.port === '4173'
    );
  } catch {
    return false;
  }
}

function json(
  response,
  status,
  body,
  origin
) {
  response.writeHead(
    status,
    {
      'Content-Type':
        'application/json; charset=utf-8',
      'Cache-Control':
        'no-store',
      'Access-Control-Allow-Origin':
        origin || 'http://127.0.0.1:4173',
      'Access-Control-Allow-Methods':
        'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-QA-Sentinel',
      'Vary':
        'Origin',
    }
  );

  response.end(
    JSON.stringify(body)
  );
}

const server =
  http.createServer(
    (request, response) => {
      const origin =
        request.headers.origin ?? '';

      if (!originAllowed(origin)) {
        json(
          response,
          403,
          {
            ok: false,
            error:
              'Origin not allowed.',
          },
          'http://127.0.0.1:4173'
        );
        return;
      }

      if (
        request.method ===
        'OPTIONS'
      ) {
        json(
          response,
          204,
          {},
          origin
        );
        return;
      }

      let pathname;

      try {
        pathname =
          new URL(
            request.url ?? '/',
            `http://${host}:${port}`
          ).pathname;
      } catch {
        json(
          response,
          400,
          {
            ok: false,
            error:
              'Bad request.',
          },
          origin
        );
        return;
      }

      if (
        request.method === 'GET' &&
        pathname === '/health'
      ) {
        json(
          response,
          200,
          {
            ok: true,
            service:
              'QA Sentinel Tyra Authentication Manager',
          },
          origin
        );
        return;
      }

      const match =
        pathname.match(
          /^\/refresh\/(nation|ai-skills)$/
        );

      if (
        request.method === 'POST' &&
        match
      ) {
        const site =
          match[1];

        const existing =
          jobs.get(site);

        if (
          existing &&
          existing.exitCode === null
        ) {
          json(
            response,
            409,
            {
              ok: false,
              site,
              error:
                'Authentication refresh is already running.',
            },
            origin
          );
          return;
        }

        const child =
          spawn(
            process.execPath,
            [
              'scripts/auth-refresh.mjs',
              site,
            ],
            {
              cwd:
                process.cwd(),
              stdio:
                'inherit',
              env:
                process.env,
            }
          );

        jobs.set(
          site,
          child
        );

        child.once(
          'exit',
          () => {
            setTimeout(
              () => {
                if (
                  jobs.get(site) === child
                ) {
                  jobs.delete(site);
                }
              },
              5000
            );
          }
        );

        json(
          response,
          202,
          {
            ok: true,
            site,
            state:
              'started',
          },
          origin
        );

        return;
      }

      json(
        response,
        404,
        {
          ok: false,
          error:
            'Not found.',
        },
        origin
      );
    }
  );

server.listen(
  port,
  host,
  () => {
    console.log(
      `[QA Sentinel] Authentication Manager: ` +
      `http://${host}:${port}`
    );
  }
);

function stop() {
  server.close(
    () => process.exit(0)
  );
}

process.once(
  'SIGINT',
  stop
);

process.once(
  'SIGTERM',
  stop
);
