const AUTH_API =
  'http://127.0.0.1:43174';

const authSites = [
  {
    id: 'nation',
    label: 'Nation',
    probe: '/home',
    coverage:
      './data/discovery-coverage-nation.json',
    status:
      './data/auth-manager-nation.json',
  },
  {
    id: 'ai-skills',
    label: 'AI Skills',
    probe: '/my-pathway',
    coverage:
      './data/discovery-coverage-ai-skills.json',
    status:
      './data/auth-manager-ai-skills.json',
  },
];

async function loadJson(
  path,
  fallback = null
) {
  try {
    const response =
      await fetch(
        `${path}?t=${Date.now()}`,
        {
          cache: 'no-store',
        }
      );

    if (!response.ok) {
      return fallback;
    }

    return await response.json();
  } catch {
    return fallback;
  }
}

function ensureAuthPanel() {
  let panel =
    document.getElementById(
      'v53-auth-manager'
    );

  if (panel) {
    return panel;
  }

  const main =
    document.querySelector(
      '.v5-dashboard-main'
    );

  if (!main) {
    return null;
  }

  panel =
    document.createElement(
      'section'
    );

  panel.id =
    'v53-auth-manager';

  panel.className =
    'v5-recent-card v53-auth-manager';

  panel.innerHTML = `
    <div class="v53-auth-head">
      <div>
        <span class="v53-auth-eyebrow">
          AUTHENTICATION MANAGER
        </span>

        <h3>
          Authenticated QA Sessions
        </h3>

        <p>
          Tyra verifies protected routes and only
          opens real Chrome when a login must be renewed.
        </p>
      </div>

      <span
        id="v53-auth-overall"
        class="v53-auth-overall"
      >
        CHECKING
      </span>
    </div>

    <div
      id="v53-auth-sites"
      class="v53-auth-sites"
    ></div>

    <div class="v53-auth-note">
      Google login stays manual in real Chrome.
      QA Sentinel Tyra never reads or stores your password.
    </div>
  `;

  const discovery =
    document.getElementById(
      'v53-discovery-coverage'
    );

  if (discovery) {
    discovery.insertAdjacentElement(
      'afterend',
      panel
    );
  } else {
    main.appendChild(panel);
  }

  panel.addEventListener(
    'click',
    event => {
      const button =
        event.target.closest(
          '[data-auth-refresh]'
        );

      if (!button) {
        return;
      }

      refreshLogin(
        button.dataset.authRefresh,
        button
      );
    }
  );

  return panel;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function activeState(status) {
  return [
    'checking',
    'waiting-login',
    'capturing',
    'verifying',
  ].includes(
    status?.state
  );
}

function stateLabel(
  coverage,
  status
) {
  if (
    activeState(status)
  ) {
    if (
      status.state ===
      'waiting-login'
    ) {
      return 'LOGIN WINDOW OPEN';
    }

    if (
      status.state ===
      'verifying'
    ) {
      return 'VERIFYING';
    }

    return 'WORKING';
  }

  if (
    status?.state ===
    'error'
  ) {
    return 'NEEDS ATTENTION';
  }

  if (
    coverage
      ?.authenticatedVerified ===
    true
  ) {
    return 'VERIFIED';
  }

  return 'LOGIN REQUIRED';
}

async function refreshLogin(
  site,
  button
) {
  button.disabled = true;

  const oldText =
    button.textContent;

  button.textContent =
    'Starting...';

  try {
    const response =
      await fetch(
        `${AUTH_API}/refresh/${site}`,
        {
          method: 'POST',
          headers: {
            'X-QA-Sentinel':
              'workbench',
          },
        }
      );

    const data =
      await response.json()
        .catch(() => ({}));

    if (
      !response.ok &&
      response.status !== 409
    ) {
      throw new Error(
        data.error ??
        'Authentication service rejected the request.'
      );
    }

    button.textContent =
      'Working...';

    await refreshAuthPanel();
  } catch (error) {
    window.alert(
      'QA Sentinel Authentication Manager could not start.\n\n' +
      (
        error instanceof Error
          ? error.message
          : String(error)
      ) +
      '\n\nRestart the dashboard/QA Sentinel and try again.'
    );

    button.textContent =
      oldText;

    button.disabled = false;
  }
}

async function refreshAuthPanel() {
  const panel =
    ensureAuthPanel();

  if (!panel) {
    return;
  }

  const results =
    await Promise.all(
      authSites.map(
        async site => ({
          site,
          coverage:
            await loadJson(
              site.coverage
            ),
          status:
            await loadJson(
              site.status
            ),
        })
      )
    );

  const container =
    document.getElementById(
      'v53-auth-sites'
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    results.map(
      ({
        site,
        coverage,
        status,
      }) => {
        const verified =
          coverage
            ?.authenticatedVerified ===
          true;

        const busy =
          activeState(status);

        const label =
          stateLabel(
            coverage,
            status
          );

        const state =
          busy
            ? 'working'
            : verified
              ? 'verified'
              : status?.state ===
                  'error'
                ? 'error'
                : 'required';

        const message =
          busy
            ? status?.message
            : status?.state ===
                'error'
              ? status.message
              : verified
                ? `Protected route ${site.probe} verified.`
                : `Protected route ${site.probe} requires a valid session.`;

        return `
          <article
            class="v53-auth-site"
            data-state="${state}"
          >
            <div class="v53-auth-site-copy">
              <strong>
                ${escapeHtml(site.label)}
              </strong>

              <span>
                ${escapeHtml(message)}
              </span>
            </div>

            <span
              class="v53-auth-site-status"
            >
              ${escapeHtml(label)}
            </span>

            <button
              type="button"
              data-auth-refresh="${escapeHtml(site.id)}"
              ${busy ? 'disabled' : ''}
            >
              ${
                busy
                  ? 'Working...'
                  : verified
                    ? 'Refresh session'
                    : 'Sign in / refresh'
              }
            </button>
          </article>
        `;
      }
    ).join('');

  const allVerified =
    results.every(
      item =>
        item.coverage
          ?.authenticatedVerified ===
        true
    );

  const anyBusy =
    results.some(
      item =>
        activeState(item.status)
    );

  const overall =
    document.getElementById(
      'v53-auth-overall'
    );

  if (overall) {
    overall.textContent =
      anyBusy
        ? 'WORKING'
        : allVerified
          ? 'COMPLETE AUTH'
          : 'ACTION REQUIRED';

    overall.dataset.state =
      anyBusy
        ? 'working'
        : allVerified
          ? 'verified'
          : 'required';
  }
}

ensureAuthPanel();
refreshAuthPanel();

setInterval(
  refreshAuthPanel,
  2500
);
