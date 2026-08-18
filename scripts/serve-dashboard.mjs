import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

const projectRoot = path.resolve(
  scriptDirectory,
  '..'
);

const dashboardRoot = path.join(
  projectRoot,
  'dashboard'
);

const reportsRoot = path.join(
  projectRoot,
  'reports'
);

const port = Number(
  process.env.QA_DASHBOARD_PORT ?? 4173
);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip',
};

function isInsideRoot(
  filePath,
  rootDirectory
) {
  const relativePath = path.relative(
    rootDirectory,
    filePath
  );

  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  );
}

function sendText(
  response,
  statusCode,
  message
) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });

  response.end(message);
}

function resolveRequestedFile(requestUrl) {
  const pathname = decodeURIComponent(
    (requestUrl ?? '/').split('?')[0]
  );

  if (
    pathname === '/reports' ||
    pathname === '/reports/'
  ) {
    return {
      root: reportsRoot,
      filePath: path.join(
        reportsRoot,
        'latest-report.md'
      ),
    };
  }

  if (pathname.startsWith('/reports/')) {
    const relativePath = pathname
      .slice('/reports/'.length);

    return {
      root: reportsRoot,
      filePath: path.resolve(
        reportsRoot,
        relativePath
      ),
    };
  }

  if (pathname.startsWith('/test-results/')) {
    const relativePath = pathname
      .slice('/test-results/'.length);

    return {
      root: path.join(projectRoot, 'test-results'),
      filePath: path.resolve(
        projectRoot,
        'test-results',
        relativePath
      ),
    };
  }

  const relativePath =
    pathname === '/'
      ? 'index.html'
      : pathname.replace(/^\/+/, '');

  return {
    root: dashboardRoot,
    filePath: path.resolve(
      dashboardRoot,
      relativePath
    ),
  };
}

const server = http.createServer(
  (request, response) => {
    const {
      root,
      filePath,
    } = resolveRequestedFile(
      request.url
    );

    const isRootFile =
      filePath === root;

    if (
      isRootFile ||
      !isInsideRoot(filePath, root)
    ) {
      sendText(
        response,
        403,
        'Forbidden'
      );

      return;
    }

    fs.stat(filePath, (error, stat) => {
      if (
        error ||
        !stat.isFile()
      ) {
        const message =
          filePath.endsWith(
            'latest-report.md'
          )
            ? 'Markdown report not found. Run the Playwright tests first.'
            : 'File not found.';

        sendText(
          response,
          404,
          message
        );

        return;
      }

      const extension = path
        .extname(filePath)
        .toLowerCase();

      response.writeHead(200, {
        'Content-Type':
          mimeTypes[extension] ??
          'application/octet-stream',

        'Cache-Control':
          'no-store, no-cache, must-revalidate',

        'X-Content-Type-Options':
          'nosniff',
      });

      const stream =
        fs.createReadStream(filePath);

      stream.on('error', () => {
        if (!response.headersSent) {
          sendText(
            response,
            500,
            'Could not read file.'
          );
        } else {
          response.destroy();
        }
      });

      stream.pipe(response);
    });
  }
);

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use.`
    );

    console.error(
      `Open http://127.0.0.1:${port} or stop the existing dashboard process.`
    );

    process.exitCode = 1;
    return;
  }

  console.error(
    'Dashboard server error:',
    error
  );

  process.exitCode = 1;
});

server.listen(
  port,
  '127.0.0.1',
  () => {
    console.log('');
    console.log(
      `QA Dashboard: http://127.0.0.1:${port}`
    );

    console.log(
      `Latest Markdown report: http://127.0.0.1:${port}/reports/latest-report.md`
    );

    console.log(
      `Human review pack: http://127.0.0.1:${port}/reports/human-review.html`
    );

    console.log(
      'Press Ctrl+C to stop.'
    );
  }
);