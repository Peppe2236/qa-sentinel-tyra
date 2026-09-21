const $ = id => document.getElementById(id);

async function loadJson(file) {
  try {
    const response = await fetch(
      `${file}?t=${Date.now()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const DISCOVERY_TARGET_KEY =
  'qa-sentinel-discovery-target-v1';

let selectedDiscoveryTarget =
  localStorage.getItem(
    DISCOVERY_TARGET_KEY
  ) ?? 'all';


function targetFromText(value) {
  const normalized =
    String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  if (
    normalized.includes(
      'ai skills only'
    ) ||
    normalized.includes(
      'endast ai skills'
    )
  ) {
    return 'ai-skills';
  }

  if (
    normalized.includes(
      'nation only'
    ) ||
    normalized.includes(
      'endast nation'
    )
  ) {
    return 'nation';
  }

  if (
    normalized.includes(
      'both sites'
    ) ||
    normalized === 'båda'
  ) {
    return 'all';
  }

  return null;
}


function setDiscoveryTarget(target) {
  if (
    ![
      'all',
      'nation',
      'ai-skills',
    ].includes(target)
  ) {
    return;
  }

  selectedDiscoveryTarget =
    target;

  localStorage.setItem(
    DISCOVERY_TARGET_KEY,
    target
  );

  refreshDiscovery();
}


function currentTarget() {
  return selectedDiscoveryTarget;
}

function targetLabel(target) {
  if (target === 'nation') {
    return 'Nation';
  }

  if (target === 'ai-skills') {
    return 'AI Skills';
  }

  return 'Both sites';
}

function coverageFile(target) {
  return target === 'all'
    ? './data/discovery-coverage-all.json'
    : `./data/discovery-coverage-${target}.json`;
}

function ensurePanel() {
  const main =
    document.querySelector('.v5-dashboard-main');

  if (!main) {
    return null;
  }

  let panel =
    $('v53-discovery-coverage');

  if (panel) {
    return panel;
  }

  panel =
    document.createElement('section');

  panel.id =
    'v53-discovery-coverage';

  panel.className =
    'v5-recent-card v53-discovery-card';

  panel.innerHTML = `
    <div class="v53-discovery-head">
      <div>
        <span class="v53-discovery-eyebrow">
          AUTONOMOUS DISCOVERY
        </span>

        <h3>
          Discovery Coverage
          <small id="v53-discovery-scope">
            Both sites
          </small>
        </h3>

        <p>
          Route, interaction and authenticated
          discovery evidence.
        </p>
      </div>

      <span
        id="v53-discovery-status"
        class="v53-discovery-status"
      >
        LOADING
      </span>
    </div>

    <div class="v53-discovery-metrics">
      <article>
        <span>Observed pages</span>
        <strong id="v53-d-pages">—</strong>
      </article>

      <article>
        <span>Unique routes</span>
        <strong id="v53-d-routes">—</strong>
      </article>

      <article>
        <span>Effective routes</span>
        <strong id="v53-d-effective">—</strong>
      </article>

      <article>
        <span>Verified auth routes</span>
        <strong id="v53-d-auth">—</strong>
      </article>

      <article>
        <span>Dynamic content</span>
        <strong id="v53-d-dynamic">—</strong>
      </article>

      <article>
        <span>Safe interactions</span>
        <strong id="v53-d-clicks">—</strong>
      </article>

      <article>
        <span>Current findings</span>
        <strong id="v53-d-findings">—</strong>
      </article>
    </div>

    <div class="v53-discovery-state">
      <span id="v53-d-anon-state">
        Anonymous: —
      </span>

      <span id="v53-d-auth-state">
        Authenticated: —
      </span>
    </div>

    <div class="v53-discovery-bars">
      <article>
        <span>
          Shared
          <strong id="v53-d-shared">—</strong>
        </span>
        <div>
          <i id="v53-d-shared-bar"></i>
        </div>
      </article>

      <article>
        <span>
          Auth-only
          <strong id="v53-d-auth-only">—</strong>
        </span>
        <div>
          <i id="v53-d-auth-bar"></i>
        </div>
      </article>

      <article>
        <span>
          Anonymous-only
          <strong id="v53-d-anon-only">—</strong>
        </span>
        <div>
          <i id="v53-d-anon-bar"></i>
        </div>
      </article>
    </div>

    <details>
      <summary>
        <span>Authenticated-only routes</span>
        <strong id="v53-d-route-count">0</strong>
      </summary>

      <div
        id="v53-d-route-list"
        class="v53-discovery-list"
      ></div>
    </details>

    <details>
      <summary>
        <span>Current user-impacting findings</span>
        <strong id="v53-d-current-count">0</strong>
      </summary>

      <div
        id="v53-d-current-list"
        class="v53-discovery-list"
      ></div>
    </details>

    <details>
      <summary>
        <span>Historical / intermittent findings</span>
        <strong id="v53-d-history-count">0</strong>
      </summary>

      <div
        id="v53-d-history-list"
        class="v53-discovery-list"
      ></div>
    </details>
  `;

  const old =
    $('v52-discovery-coverage');

  if (old) {
    old.insertAdjacentElement(
      'afterend',
      panel
    );
  } else {
    const recent =
      main.querySelector('.v5-recent-card');

    if (recent) {
      recent.insertAdjacentElement(
        'afterend',
        panel
      );
    } else {
      main.appendChild(panel);
    }
  }

  document.body.classList.add(
    'discovery-v2-ready'
  );

  return panel;
}

function setText(id, value) {
  const node = $(id);

  if (node) {
    node.textContent =
      String(value ?? '—');
  }
}

function setBar(id, value, total) {
  const node = $(id);

  if (!node) {
    return;
  }

  const numerator =
    Number(value ?? 0);

  const denominator =
    Number(total ?? 0);

  const percent =
    denominator > 0
      ? Math.min(
          100,
          Math.max(
            0,
            numerator / denominator * 100
          )
        )
      : 0;

  node.style.width =
    `${percent.toFixed(1)}%`;
}

function renderList(
  id,
  entries,
  renderer,
  emptyText
) {
  const node = $(id);

  if (!node) {
    return;
  }

  node.innerHTML =
    entries.length
      ? entries.map(renderer).join('')
      : `<span>${escapeHtml(emptyText)}</span>`;
}

async function refreshDiscovery() {
  const panel =
    ensurePanel();

  if (!panel) {
    return;
  }

  const target =
    currentTarget();

  setText(
    'v53-discovery-scope',
    targetLabel(target)
  );

  const data =
    await loadJson(
      coverageFile(target)
    );

  if (!data) {
    panel.dataset.status =
      'not-verified';

    setText(
      'v53-discovery-status',
      'NOT VERIFIED'
    );

    return;
  }

  const coverage =
    data.coverage ?? {};

  const interactions =
    data.interactions ?? {};

  const findings =
    data.findings ?? {};

  const allSites =
    target === 'all';

  const authComplete =
    allSites
      ? data.authStatus === 'complete'
      : data.authenticatedVerified === true;

  const authPartial =
    allSites &&
    data.authStatus === 'partial';

  const limited =
    Boolean(
      coverage.coverageLimited ||
      coverage.anonymousCoverageLimited ||
      coverage.authenticatedCoverageLimited === true
    );

  if (limited) {
    panel.dataset.status =
      'limited';

    setText(
      'v53-discovery-status',
      'LIMITED'
    );
  } else if (authComplete) {
    panel.dataset.status =
      'complete';

    setText(
      'v53-discovery-status',
      'CRAWL COMPLETE'
    );
  } else if (authPartial) {
    panel.dataset.status =
      'partial';

    setText(
      'v53-discovery-status',
      'PARTIAL AUTH'
    );
  } else {
    panel.dataset.status =
      'anonymous';

    setText(
      'v53-discovery-status',
      'ANON COMPLETE'
    );
  }

  setText(
    'v53-d-pages',
    coverage.pageObservations ?? 0
  );

  setText(
    'v53-d-routes',
    coverage.uniqueRoutes ?? 0
  );

  setText(
    'v53-d-effective',
    coverage.effectiveRoutes ?? 0
  );

  setText(
    'v53-d-auth',
    authComplete || authPartial
      ? coverage.authenticatedRoutes ?? 0
      : '—'
  );

  setText(
    'v53-d-dynamic',
    coverage.dynamicContentRoutes ?? 0
  );

  setText(
    'v53-d-clicks',
    interactions.totalClicks ?? 0
  );

  setText(
    'v53-d-findings',
    findings.currentCount ?? 0
  );

  setText(
    'v53-d-anon-state',
    'Anonymous: CRAWL COMPLETE'
  );

  setText(
    'v53-d-auth-state',
    authComplete
      ? 'Authenticated: VERIFIED'
      : authPartial
        ? 'Authenticated: PARTIAL'
        : 'Authenticated: NOT VERIFIED'
  );

  const denominator =
    coverage.uniqueRoutes ?? 0;

  setText(
    'v53-d-shared',
    coverage.sharedRoutes ?? '—'
  );

  setText(
    'v53-d-auth-only',
    coverage.authenticatedOnlyRoutes ?? '—'
  );

  setText(
    'v53-d-anon-only',
    coverage.anonymousOnlyRoutes ?? '—'
  );

  setBar(
    'v53-d-shared-bar',
    coverage.sharedRoutes ?? 0,
    denominator
  );

  setBar(
    'v53-d-auth-bar',
    coverage.authenticatedOnlyRoutes ?? 0,
    denominator
  );

  setBar(
    'v53-d-anon-bar',
    coverage.anonymousOnlyRoutes ?? 0,
    denominator
  );

  const routes =
    data.routes?.authenticatedOnly ?? [];

  setText(
    'v53-d-route-count',
    routes.length
  );

  renderList(
    'v53-d-route-list',
    routes,
    route => `
      <code>${escapeHtml(route)}</code>
    `,
    'No authenticated-only routes recorded.'
  );

  const current =
    findings.current ?? [];

  setText(
    'v53-d-current-count',
    current.length
  );

  renderList(
    'v53-d-current-list',
    current,
    item => `
      <article
        data-severity="${escapeHtml(item.severity)}"
      >
        <strong>
          ${escapeHtml(item.title)}
        </strong>

        <span>
          ${
            item.siteLabel
              ? `${escapeHtml(item.siteLabel)} · `
              : ''
          }
          ${escapeHtml(item.pathname)}
        </span>

        <small>
          ${escapeHtml(item.code)}
          ·
          ${escapeHtml(item.mode)}
        </small>
      </article>
    `,
    'No current user-impacting findings.'
  );

  const historical =
    findings.historical ?? [];

  setText(
    'v53-d-history-count',
    historical.length
  );

  renderList(
    'v53-d-history-list',
    historical,
    item => `
      <article
        data-severity="${escapeHtml(item.severity)}"
      >
        <strong>
          ${escapeHtml(item.title)}
        </strong>

        <span>
          ${
            item.siteLabel
              ? `${escapeHtml(item.siteLabel)} · `
              : ''
          }
          ${escapeHtml(item.pathname)}
        </span>

        <small>
          ${escapeHtml(
            String(item.state ?? '')
              .toUpperCase()
          )}
          ·
          ${escapeHtml(item.occurrences ?? 0)}
          /
          ${escapeHtml(item.observations ?? 0)}
          observations
          ·
          ${
            item.currentPresent
              ? 'present now'
              : 'not observed current scan'
          }
        </small>
      </article>
    `,
    'No historical findings recorded yet.'
  );
}

let targetObserver = null;

function bindTargetObserver() {
  if (targetObserver) {
    return;
  }

  targetObserver = true;

  document.addEventListener(
    'click',
    event => {
      const control =
        event.target.closest(
          'button,[role="button"],label'
        );

      if (!control) {
        return;
      }

      const target =
        targetFromText(
          control.textContent
        );

      if (!target) {
        return;
      }

      setDiscoveryTarget(
        target
      );
    },
    true
  );

  document.addEventListener(
    'change',
    event => {
      const control =
        event.target;

      const text =
        control?.selectedOptions?.[0]
          ?.textContent ??
        control?.value ??
        '';

      const target =
        targetFromText(text);

      if (!target) {
        return;
      }

      setDiscoveryTarget(
        target
      );
    },
    true
  );
}

function boot() {
  ensurePanel();
  bindTargetObserver();
  refreshDiscovery();
}

boot();

setInterval(
  () => {
    bindTargetObserver();
    refreshDiscovery();
  },
  10000
);
