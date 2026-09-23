const URL =
  './data/security-posture.json';

function esc(value) {
  return String(
    value ?? ''
  )
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function tone(status) {
  if (
    status === 'complete'
  ) {
    return 'ok';
  }

  if (
    status === 'degraded' ||
    status === 'partial'
  ) {
    return 'warn';
  }

  return 'bad';
}

function ensurePanel() {
  let panel =
    document.getElementById(
      'security-posture-panel'
    );

  if (panel) {
    return panel;
  }

  panel =
    document.createElement(
      'section'
    );

  panel.id =
    'security-posture-panel';

  panel.className =
    'security-posture-panel';

  const existing =
    document.getElementById(
      'pentest-authorization'
    );

  const section =
    existing?.closest(
      'section'
    );

  if (section) {
    section.insertAdjacentElement(
      'afterend',
      panel
    );
  } else {
    document.querySelector(
      'main'
    )?.append(panel);
  }

  return panel;
}

function render(data) {
  const panel =
    ensurePanel();

  if (!panel) {
    return;
  }

  const engines =
    Object.entries(
      data.coverage?.engines ??
      {}
    );

  const findings =
    data.findings ??
    [];

  panel.innerHTML = `
    <div class="security-posture-heading">
      <div>
        <span class="security-posture-eyebrow">
          M8.2 • SECURITY & PENTEST INTELLIGENCE
        </span>
        <h2>Security Posture</h2>
        <p>
          Combined dynamic, dependency, source-code,
          secret and configuration security evidence.
        </p>
      </div>

      <strong class="security-posture-badge ${tone(data.postureStatus)}">
        ${esc(data.postureStatus?.toUpperCase() ?? 'NOT RUN')}
      </strong>
    </div>

    <div class="security-posture-summary">
      <div>
        <span>Critical</span>
        <strong>${data.summary?.critical ?? 0}</strong>
      </div>
      <div>
        <span>High</span>
        <strong>${data.summary?.high ?? 0}</strong>
      </div>
      <div>
        <span>Medium</span>
        <strong>${data.summary?.medium ?? 0}</strong>
      </div>
      <div>
        <span>Low</span>
        <strong>${data.summary?.low ?? 0}</strong>
      </div>
      <div>
        <span>Unique findings</span>
        <strong>${data.summary?.uniqueFindings ?? 0}</strong>
      </div>
      <div>
        <span>Observations</span>
        <strong>${data.summary?.totalObservations ?? 0}</strong>
      </div>
    </div>

    <h3>Security engines</h3>

    <div class="security-engine-grid">
      ${engines.map(
        ([name, value]) => `
          <div class="security-engine-card">
            <span>${esc(name)}</span>
            <strong class="${tone(value.status)}">
              ${esc(value.status)}
            </strong>
          </div>
        `
      ).join('')}
    </div>

    <h3>Highest-priority findings</h3>

    <div class="security-findings">
      ${
        findings.length
          ? findings.slice(0, 12).map(
              item => `
                <article>
                  <strong>
                    ${esc(item.severity.toUpperCase())}
                    ·
                    ${esc(item.title)}
                  </strong>
                  <span>
                    ${esc(item.source)}
                    ·
                    ${esc(item.category)}
                  </span>
                  <small>
                    ${esc(item.target ?? 'No target')}
                    · ${item.occurrences} observation(s)
                  </small>
                </article>
              `
            ).join('')
          : '<p>No findings reported by completed engines.</p>'
      }
    </div>

    <p class="security-posture-note">
      ${esc(data.note)}
    </p>
  `;
}

async function refresh() {
  try {
    const response =
      await fetch(
        `${URL}?t=${Date.now()}`,
        {
          cache: 'no-store',
        }
      );

    if (!response.ok) {
      return;
    }

    render(
      await response.json()
    );
  } catch {}
}

refresh();

setInterval(
  refresh,
  5000
);
