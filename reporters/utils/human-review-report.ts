import fs from 'node:fs';
import path from 'node:path';

import type {
  HumanReviewPack,
  MachineOwnedItem,
  NeedsHumanItem,
  RootCauseNote,
  UntestedRoute,
} from '../models/types';

function escapeHtml(value?: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stripAnsi(value: string): string {
  return value.replace(
    // eslint-disable-next-line no-control-regex
    /\u001B\[[0-?]*[ -/]*[@-~]/g,
    ''
  );
}

function classificationLabel(value: string): string {
  const labels: Record<string, string> = {
    'product-bug': 'Product bug',
    'content-bug': 'Content bug',
    'security-issue': 'Security header',
    'accessibility-issue': 'Accessibility',
    'performance-issue': 'Performance',
  };

  return labels[value] ?? value;
}

function evidenceLinks(item: NeedsHumanItem): string {
  const links = [
    item.screenshot
      ? `<a href="${escapeHtml(item.screenshot)}">Screenshot</a>`
      : '',
    item.trace ? `<a href="${escapeHtml(item.trace)}">Trace</a>` : '',
    item.video ? `<a href="${escapeHtml(item.video)}">Video</a>` : '',
    item.errorContext
      ? item.errorContext.startsWith('.') || item.errorContext.startsWith('/')
        ? `<a href="${escapeHtml(item.errorContext)}">Error context</a>`
        : `<pre>${escapeHtml(stripAnsi(item.errorContext))}</pre>`
      : '',
  ].filter(Boolean);

  return links.length ? links.join(' · ') : '<span class="muted">No capture</span>';
}

function machineRows(items: MachineOwnedItem[]): string {
  if (!items.length) {
    return '<p class="muted">Nothing in this bucket.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Kind</th>
          <th>Site</th>
          <th>File / route</th>
          <th>Title</th>
          <th>Root cause</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            item => `
              <tr>
                <td>${escapeHtml(classificationLabel(item.classification))}</td>
                <td>${escapeHtml(item.site)}</td>
                <td>
                  <code>${escapeHtml(item.file)}</code>
                  <span class="muted">${escapeHtml(item.route)}</span>
                </td>
                <td>${escapeHtml(item.title)}</td>
                <td>${escapeHtml(item.rootCause ?? 'Heuristic note in the Root cause block.')}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function humanCards(items: NeedsHumanItem[]): string {
  if (!items.length) {
    return '<p class="muted">No human queue. The unattended run closed every gap it could.</p>';
  }

  return items
    .map(
      item => `
        <article class="human-card">
          <p class="eyebrow">${escapeHtml(item.site)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          <p>
            <a href="${escapeHtml(item.url)}">${escapeHtml(item.url)}</a>
          </p>
          <p><strong>Why a human:</strong> ${escapeHtml(item.whyHuman)}</p>
          <p><strong>5-minute check:</strong> ${escapeHtml(item.suggestedCheck)}</p>
          <p class="evidence">${evidenceLinks(item)}</p>
          ${
            item.errorMessage
              ? `<pre>${escapeHtml(stripAnsi(item.errorMessage))}</pre>`
              : ''
          }
        </article>
      `
    )
    .join('');
}

function untestedList(items: UntestedRoute[]): string {
  if (!items.length) {
    return '<p class="muted">Every crawled route has a hand-written E2E spec.</p>';
  }

  return `
    <ul class="untested">
      ${items
        .map(
          item => `
            <li>
              <strong>${escapeHtml(item.site)}</strong>
              <a href="${escapeHtml(item.url)}">${escapeHtml(item.pathname)}</a>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function rootCauseCards(notes: RootCauseNote[] | undefined): string {
  if (!notes?.length) {
    return '<p class="muted">No failing-test root-cause notes. Heuristic Sentinel AI still ran.</p>';
  }

  return notes
    .map(
      note => `
        <article class="root-cause-card">
          <p class="eyebrow">${escapeHtml(note.theme)} · ${escapeHtml(note.engine)} · ${escapeHtml(note.site)}</p>
          <h3>${escapeHtml(note.title)}</h3>
          <p><strong>Root cause:</strong> ${escapeHtml(note.summary)}</p>
          <p class="muted">${escapeHtml(note.recommendation)}</p>
        </article>
      `
    )
    .join('');
}

export function buildHumanReviewHtml(pack: HumanReviewPack): string {
  const verdictClass =
    pack.verdict === 'GO'
      ? 'go'
      : pack.verdict === 'NO-GO'
        ? 'nogo'
        : 'warn';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Human review pack — ${escapeHtml(pack.verdict)}</title>
  <style>
    :root {
      --bg: #071018;
      --card: #101b27;
      --text: #e8eef6;
      --muted: #8ea0b5;
      --line: rgba(142, 160, 181, 0.22);
      --go: #3bd68b;
      --warn: #f1b94e;
      --nogo: #ff5f79;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 16px/1.5 "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    main { max-width: 920px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    .verdict {
      padding: 1.25rem 1.4rem;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: var(--card);
    }
    .verdict.go { border-color: rgba(59, 214, 139, 0.45); }
    .verdict.warn { border-color: rgba(241, 185, 78, 0.45); }
    .verdict.nogo { border-color: rgba(255, 95, 121, 0.5); }
    .stamp {
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      margin: 0 0 0.4rem;
    }
    .verdict.go .stamp { color: var(--go); }
    .verdict.warn .stamp { color: var(--warn); }
    .verdict.nogo .stamp { color: var(--nogo); }
    .muted { color: var(--muted); }
    .eyebrow {
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    ul.why { margin: 0.6rem 0 0; padding-left: 1.2rem; }
    section { margin-top: 2rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      text-align: left;
      padding: 0.55rem 0.4rem;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    code, pre {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.82rem;
    }
    pre {
      white-space: pre-wrap;
      background: #0a141e;
      padding: 0.7rem;
      border-radius: 10px;
      overflow: auto;
    }
    .human-card {
      padding: 1rem 1.1rem;
      margin: 0.8rem 0;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--card);
    }
    .human-card h3 { margin: 0 0 0.4rem; }
    .root-cause-card {
      padding: 1rem 1.1rem;
      margin: 0.8rem 0;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--card);
    }
    .root-cause-card h3 { margin: 0 0 0.4rem; }
    a { color: #8ec5ff; }
    .untested { padding-left: 1.1rem; }
    .untested li { margin: 0.35rem 0; }
    footer { margin-top: 2.5rem; color: var(--muted); font-size: 0.85rem; }
  </style>
</head>
<body>
  <main>
    <header class="verdict ${verdictClass}">
      <p class="eyebrow">30-second verdict</p>
      <p class="stamp">${escapeHtml(pack.verdict)}</p>
      <p class="muted">Run ${escapeHtml(pack.runId)} · ${escapeHtml(pack.generatedAt)}</p>
      <p class="muted">LLM: ${escapeHtml(pack.llm?.label ?? 'LLM off — no key')}</p>
      <ul class="why">
        ${pack.bullets.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}
      </ul>
    </header>

    <section>
      <p class="eyebrow">Root cause</p>
      <h2>Heuristic notes for failing tests (LLM enriches when a key is set)</h2>
      <p class="muted">Theme, copy and header failures stay machine-owned. This block exists even without an LLM key.</p>
      ${rootCauseCards(pack.rootCauseNotes)}
    </section>

    <section>
      <p class="eyebrow">Do not touch</p>
      <h2>Already classified — machine-owned</h2>
      <p class="muted">Product bugs, content bugs, header failures and serious accessibility. Developer work. Do not re-explore.</p>
      ${machineRows(pack.machineOwned)}
    </section>

    <section>
      <p class="eyebrow">Needs a human</p>
      <h2>Only gaps that still need judgment or credentials (${pack.needsHuman.length})</h2>
      ${humanCards(pack.needsHuman)}
    </section>

    <section>
      <p class="eyebrow">Untested routes</p>
      <h2>Crawled, no hand-written E2E</h2>
      <p class="muted">Generated HTTP smoke does not count as coverage here.</p>
      ${untestedList(pack.untestedRoutes)}
    </section>

    <footer>
      QA Sentinel Tyra human review pack · unattended run · CSP analytics warnings are not a human fire drill.
    </footer>
  </main>
</body>
</html>
`;
}

export function buildHumanReviewMarkdown(pack: HumanReviewPack): string {
  const machine = pack.machineOwned.length
    ? pack.machineOwned
        .map(
          item =>
            `- **${classificationLabel(item.classification)}** · ${item.site} · \`${item.file}\` · ${item.route} · ${item.title}${item.rootCause ? ` — ${item.rootCause}` : ''}`
        )
        .join('\n')
    : '_Nothing in this bucket._';

  const human = pack.needsHuman.length
    ? pack.needsHuman
        .map(item => {
          const evidence = [
            item.screenshot ? `[screenshot](${item.screenshot})` : '',
            item.trace ? `[trace](${item.trace})` : '',
            item.video ? `[video](${item.video})` : '',
            item.errorContext &&
            (item.errorContext.startsWith('.') || item.errorContext.startsWith('/'))
              ? `[error context](${item.errorContext})`
              : '',
          ]
            .filter(Boolean)
            .join(' · ');

          return [
            `### ${item.title}`,
            '',
            `- Site: ${item.site}`,
            `- URL: ${item.url}`,
            `- Why a human: ${item.whyHuman}`,
            `- 5-minute check: ${item.suggestedCheck}`,
            evidence ? `- Evidence: ${evidence}` : '- Evidence: none captured',
            item.errorMessage
              ? `- Playwright error:\n\n\`\`\`\n${stripAnsi(item.errorMessage)}\n\`\`\``
              : '',
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n')
    : '_No human queue._';

  const untested = pack.untestedRoutes.length
    ? pack.untestedRoutes
        .map(item => `- ${item.site} · [${item.pathname}](${item.url})`)
        .join('\n')
    : '_Every crawled route has a hand-written E2E spec._';

  return [
    `# Human review pack — ${pack.verdict}`,
    '',
    `Run \`${pack.runId}\` · ${pack.generatedAt}`,
    '',
    `LLM: ${pack.llm?.label ?? 'LLM off — no key'}`,
    '',
    '## 30-second verdict',
    '',
    ...pack.bullets.map(bullet => `- ${bullet}`),
    '',
    '## Root cause',
    '',
    pack.rootCauseNotes?.length
      ? pack.rootCauseNotes
          .map(
            note =>
              `- **${note.theme}** · ${note.site} · ${note.title} — ${note.summary}`
          )
          .join('\n')
      : '_No failing-test root-cause notes._',
    '',
    '## Do not touch',
    '',
    'Already classified, machine-owned. Product bugs, content bugs, header failures, serious accessibility.',
    '',
    machine,
    '',
    `## Needs a human (${pack.needsHuman.length})`,
    '',
    human,
    '',
    '## Untested routes',
    '',
    'Crawled by discovery, no hand-written E2E. Generated HTTP smoke does not count.',
    '',
    untested,
    '',
  ].join('\n');
}

export function writeHumanReviewReports(
  pack: HumanReviewPack,
  outputDirectory: string
): { html: string; markdown: string } {
  fs.mkdirSync(outputDirectory, { recursive: true });

  const html = buildHumanReviewHtml(pack);
  const markdown = buildHumanReviewMarkdown(pack);
  const htmlFile = path.join(outputDirectory, 'human-review.html');
  const markdownFile = path.join(outputDirectory, 'human-review.md');

  fs.writeFileSync(htmlFile, html, 'utf8');
  fs.writeFileSync(markdownFile, markdown, 'utf8');

  return { html: htmlFile, markdown: markdownFile };
}
