async function loadJson(filePath, fallback) {
  try {
    const response = await fetch(`${filePath}?timestamp=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Could not load ${filePath}`, error);
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function byId(id) {
  return document.getElementById(id);
}

async function renderSettings() {
  const catalog = await loadJson('./settings-catalog.json', {
    readOnly: true,
    summary:
      'Read-only view of repo configuration. There is no settings product.',
    maxPagesEnv: 'QA_MAX_PAGES',
    maxPagesDefault: 20,
    sites: [],
    catalogs: [],
  });
  const run = await loadJson('./data/latest-run.json', null);

  const summary = byId('settings-summary');

  if (summary) {
    summary.textContent =
      catalog.summary ??
      'Read-only view of repo configuration. There is no settings product.';
  }

  const env = byId('settings-max-pages-env');
  const maxPages = byId('settings-max-pages');

  if (env) {
    env.textContent = catalog.maxPagesEnv ?? 'QA_MAX_PAGES';
  }

  if (maxPages) {
    maxPages.textContent = String(catalog.maxPagesDefault ?? 20);
  }

  const siteStats = run?.siteStatistics ?? {};
  const siteContainer = byId('settings-sites');

  if (siteContainer) {
    const sites = Array.isArray(catalog.sites) ? catalog.sites : [];

    siteContainer.innerHTML = sites.length
      ? sites
          .map(site => {
            const stats = siteStats[site.id];
            const live = stats
              ? `${stats.total} tests in latest run · ${stats.health}% health`
              : 'Not in the latest run yet';

            return `
              <article class="settings-item">
                <strong>${escapeHtml(site.name)}</strong>
                <small>${escapeHtml(site.url)}</small>
                <span>${escapeHtml(live)}</span>
              </article>
            `;
          })
          .join('')
      : '<p class="muted">No sites are configured in this catalog file.</p>';
  }

  const catalogContainer = byId('settings-catalogs');

  if (catalogContainer) {
    const catalogs = Array.isArray(catalog.catalogs) ? catalog.catalogs : [];

    catalogContainer.innerHTML = catalogs.length
      ? catalogs
          .map(
            item => `
              <article class="settings-item">
                <strong>${escapeHtml(item.name)}</strong>
                <small>${escapeHtml(item.path)}</small>
              </article>
            `
          )
          .join('')
      : '<p class="muted">No catalogs listed.</p>';
  }

  const policyContainer = byId('settings-policy');

  if (policyContainer) {
    const policy = run?.policy ?? {
      analysis: 'enabled',
      autonomousExecution: 'disabled-by-policy',
      productionWrites: 'disabled-by-policy',
      captchaClick: 'disabled-by-policy',
      llm: 'off-no-key',
      notes: [
        'Read-only analyzers default ON.',
        'Autonomous execution is disabled by policy (QA_AUTONOMOUS_EXECUTION).',
        'LLM off — no key. Heuristic Sentinel AI still runs.',
      ],
    };

    const rows = [
      ['Read-only analysis', policy.analysis ?? 'enabled'],
      ['Autonomous execution', policy.autonomousExecution ?? 'disabled-by-policy'],
      ['Production writes', policy.productionWrites ?? 'disabled-by-policy'],
      ['Captcha clicking', policy.captchaClick ?? 'disabled-by-policy'],
      ['LLM', policy.llm === 'off-no-key' ? 'LLM off — no key' : String(policy.llm ?? 'off-no-key')],
      [
        'Daily everything command',
        'npm run qa:unattended (scan + 18-project matrix)',
      ],
      ['Fast Chromium alias', 'npm run qa:sites'],
    ];

    policyContainer.innerHTML = `
      ${rows
        .map(
          ([name, value]) => `
            <article class="settings-item">
              <strong>${escapeHtml(name)}</strong>
              <span>${escapeHtml(value)}</span>
            </article>
          `
        )
        .join('')}
      ${(Array.isArray(policy.notes) ? policy.notes : [])
        .map(
          note => `
            <article class="settings-item">
              <small>${escapeHtml(note)}</small>
            </article>
          `
        )
        .join('')}
    `;
  }
}

renderSettings();
