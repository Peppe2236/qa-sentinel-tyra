import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const reportRoot = path.join(projectRoot, 'playwright-report');
const host = '127.0.0.1';
const port = Number(process.env.QA_PLAYWRIGHT_REPORT_PORT ?? 9323);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.zip': 'application/zip',
  '.trace': 'application/octet-stream',
};

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(message);
}

function isInsideRoot(filePath) {
  const relative = path.relative(reportRoot, filePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
  let relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.resolve(reportRoot, relative);

  if (!isInsideRoot(filePath)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (!error && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.stat(filePath, (finalError, finalStat) => {
      if (finalError || !finalStat.isFile()) {
        sendText(response, 404, 'Playwright report file not found.');
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      response.writeHead(200, {
        'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      });

      const stream = fs.createReadStream(filePath);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    });
  });
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
    process.exitCode = 1;
    return;
  }
  console.error('Playwright report server error:', error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`[QA Sentinel] Playwright report server ready: http://${host}:${port}/`);
  console.log('[QA Sentinel] Browser opening is disabled; use Workbench to open the report.');
});
