const DATA_URL =
  './data/run-integrity.json';

const PANEL_ID =
  'qa-run-integrity-panel';

function esc(value) {
  return String(
    value ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    );
}

function labelStatus(
  value
) {
  const map = {
    READY: 'Ready',
    VERIFIED: 'Verified',
    VALID: 'Valid',
    DEGRADED: 'Degraded',
    PARTIAL: 'Partial',
    INVALID: 'Invalid',
    BLOCKED: 'Blocked',
    NOT_VERIFIED:
      'Not verified',
    NOT_AVAILABLE:
      'Not available',
  };

  return (
    map[value] ??
    value ??
    'Unknown'
  );
}

function tone(
  value
) {
  if (
    [
      'READY',
      'VERIFIED',
      'VALID',
    ].includes(value)
  ) {
    return 'ok';
  }

  if (
    [
      'DEGRADED',
      'PARTIAL',
      'NOT_VERIFIED',
      'NOT_AVAILABLE',
    ].includes(value)
  ) {
    return 'warn';
  }

  return 'bad';
}

function browserStatus(
  data,
  name
) {
  return (
    data?.checks
      ?.browsers
      ?.find(
        item =>
          item.name === name
      )
      ?.status ??
    'NOT_VERIFIED'
  );
}

function targetSummary(
  data
) {
  const items =
    data?.checks
      ?.targets ??
    [];

  if (!items.length) {
    return 'Not verified';
  }

  const ready =
    items.filter(
      item =>
        item.status ===
        'READY'
    ).length;

  return `${ready}/${items.length} ready`;
}

function authSummary(
  data
) {
  const items =
    data?.checks
      ?.authentication ??
    [];

  if (!items.length) {
    return 'Not verified';
  }

  const verified =
    items.filter(
      item =>
        item.verified
    ).length;

  return `${verified}/${items.length} verified`;
}

function findAnchor() {
  return (
    document.querySelector(
      '.v5-metrics'
    ) ||
    document.querySelector(
      '.v53-release-note'
    ) ||
    document.querySelector(
      'main'
    )
  );
}

function ensurePanel() {
  let panel =
    document.getElementById(
      PANEL_ID
    );

  if (panel) {
    return panel;
  }

  const anchor =
    findAnchor();

  if (!anchor) {
    return null;
  }

  panel =
    document.createElement(
      'section'
    );

  panel.id =
    PANEL_ID;

  panel.className =
    'qa-run-integrity';

  if (
    anchor.matches(
      '.v5-metrics'
    )
  ) {
    anchor.insertAdjacentElement(
      'afterend',
      panel
    );
  } else if (
    anchor.matches(
      '.v53-release-note'
    )
  ) {
    anchor.insertAdjacentElement(
      'beforebegin',
      panel
    );
  } else {
    anchor.prepend(
      panel
    );
  }

  return panel;
}

function metric(
  label,
  value,
  status
) {
  return `
    <div class="qa-ri-metric">
      <span>${esc(label)}</span>
      <strong class="qa-ri-${tone(status)}">
        ${esc(value)}
      </strong>
    </div>
  `;
}

function render(
  data
) {
  const panel =
    ensurePanel();

  if (!panel) {
    return;
  }

  const status =
    data?.status ??
    'NOT_VERIFIED';

  const execution =
    data?.execution ??
    {};

  const infra =
    data?.infrastructure ??
    {};

  const projectText =
    execution.observedProjectCount !=
      null
      ? `${execution.observedProjectCount}/${execution.expectedProjectCount ?? '?'}`
      : (
          data?.checks
            ?.scope
            ?.expectedProjectCount !=
          null
            ? `Expected ${data.checks.scope.expectedProjectCount}`
            : 'Not measured'
        );

  const executionText =
    execution.actualExecutions !=
      null
      ? `${execution.actualExecutions}/${execution.expectedExecutions || '?'}`
      : (
          data?.checks
            ?.scope
            ?.expectedExecutions !=
          null
            ? `Expected ${data.checks.scope.expectedExecutions}`
            : 'Not measured'
        );

  const blockers =
    data?.blockers ??
    [];

  const warnings =
    data?.warnings ??
    [];

  panel.dataset.status =
    status;

  panel.innerHTML = `
    <div class="qa-ri-heading">
      <div>
        <span class="qa-ri-eyebrow">
          M8.1 • QA TRUST & RUN INTEGRITY
        </span>
        <h2>Run Integrity</h2>
        <p>
          Validates the test environment and execution scope
          before QA evidence can be trusted.
        </p>
      </div>

      <span class="qa-ri-badge qa-ri-${tone(status)}">
        ${esc(labelStatus(status))}
      </span>
    </div>

    <div class="qa-ri-grid">
      ${metric(
        'Chromium',
        labelStatus(
          browserStatus(
            data,
            'Chromium'
          )
        ),
        browserStatus(
          data,
          'Chromium'
        )
      )}

      ${metric(
        'Firefox',
        labelStatus(
          browserStatus(
            data,
            'Firefox'
          )
        ),
        browserStatus(
          data,
          'Firefox'
        )
      )}

      ${metric(
        'WebKit',
        labelStatus(
          browserStatus(
            data,
            'WebKit'
          )
        ),
        browserStatus(
          data,
          'WebKit'
        )
      )}

      ${metric(
        'Targets',
        targetSummary(
          data
        ),
        (
          data?.checks
            ?.targets ??
          []
        ).every(
          item =>
            item.status ===
            'READY'
        )
          ? 'READY'
          : 'BLOCKED'
      )}

      ${metric(
        'Authentication',
        authSummary(
          data
        ),
        (
          data?.checks
            ?.authentication ??
          []
        ).length >= 2 &&
        (
          data?.checks
            ?.authentication ??
          []
        ).every(
          item =>
            item.verified
        )
          ? 'VERIFIED'
          : 'NOT_VERIFIED'
      )}

      ${metric(
        'Projects',
        projectText,
        (
          execution.expectedProjectCount &&
          execution.observedProjectCount ===
            execution.expectedProjectCount
        )
          ? 'VALID'
          : (
              execution.observedProjectCount ==
              null
                ? status
                : 'PARTIAL'
            )
      )}

      ${metric(
        'Executions',
        executionText,
        execution.completenessPercent ===
          100
          ? 'VALID'
          : (
              execution.completenessPercent ==
              null
                ? status
                : 'PARTIAL'
            )
      )}

      ${metric(
        'Infrastructure',
        `${infra.affectedExecutions ?? 0} affected`,
        (
          infra.affectedExecutions ??
          0
        ) === 0
          ? 'VALID'
          : 'INVALID'
      )}

      ${metric(
        'Release authority',
        labelStatus(
          data?.releaseAuthority ??
          'NOT_VERIFIED'
        ),
        data?.releaseAuthority ===
          'VERIFIED'
          ? 'VALID'
          : 'NOT_VERIFIED'
      )}
    </div>

    ${
      blockers.length ||
      warnings.length
        ? `
          <div class="qa-ri-alerts">
            ${blockers.map(
              item =>
                `<div class="qa-ri-alert qa-ri-alert-bad">${esc(item)}</div>`
            ).join('')}

            ${warnings.map(
              item =>
                `<div class="qa-ri-alert qa-ri-alert-warn">${esc(item)}</div>`
            ).join('')}
          </div>
        `
        : ''
    }
  `;

  const releaseMessage =
    document.getElementById(
      'v53-release-message'
    );

  if (
    releaseMessage &&
    [
      'INVALID',
      'BLOCKED',
      'PARTIAL',
    ].includes(
      status
    )
  ) {
    releaseMessage.textContent =
      status === 'PARTIAL'
        ? 'QA evidence is partial — release not verified.'
        : 'QA evidence is invalid — release not verified.';
  }
}

async function refresh() {
  try {
    const response =
      await fetch(
        `${DATA_URL}?t=${Date.now()}`,
        {
          cache: 'no-store',
        }
      );

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    render(data);
  } catch {
    // Dashboard remains usable even before first preflight.
  }
}

refresh();

setInterval(
  refresh,
  2500
);
