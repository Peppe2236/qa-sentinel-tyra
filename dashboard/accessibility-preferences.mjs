const STORAGE_KEY = 'qa-sentinel-tyra-accessibility';

export const DEFAULT_ACCESSIBILITY_PREFERENCES = Object.freeze({
  visionMode: 'default',
  textSize: 'normal',
  reduceMotion: false,
  emphasizeLinks: false,
});

export const VISION_MODES = Object.freeze([
  'default',
  'high-contrast',
  'red-green',
  'blue-yellow',
  'monochrome',
]);

export const TEXT_SIZES = Object.freeze([
  'normal',
  'large',
  'extra-large',
]);

export function normalizeAccessibilityPreferences(value = {}) {
  const candidate = value && typeof value === 'object' ? value : {};

  return {
    visionMode: VISION_MODES.includes(candidate.visionMode)
      ? candidate.visionMode
      : DEFAULT_ACCESSIBILITY_PREFERENCES.visionMode,
    textSize: TEXT_SIZES.includes(candidate.textSize)
      ? candidate.textSize
      : DEFAULT_ACCESSIBILITY_PREFERENCES.textSize,
    reduceMotion: candidate.reduceMotion === true,
    emphasizeLinks: candidate.emphasizeLinks === true,
  };
}

function readPreferences(storage = globalThis.localStorage) {
  try {
    const stored = storage?.getItem(STORAGE_KEY);
    return normalizeAccessibilityPreferences(
      stored ? JSON.parse(stored) : undefined
    );
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  }
}

function writePreferences(preferences, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Local preferences are optional. The controls still work for this session.
  }
}

export function applyAccessibilityPreferences(
  preferences,
  root = globalThis.document?.documentElement
) {
  if (!root) {
    return;
  }

  const normalized = normalizeAccessibilityPreferences(preferences);

  root.dataset.visionMode = normalized.visionMode;
  root.dataset.textSize = normalized.textSize;
  root.dataset.reduceMotion = String(normalized.reduceMotion);
  root.dataset.emphasizeLinks = String(normalized.emphasizeLinks);
}

function preferenceSummary(preferences) {
  const vision = {
    default: 'default colours',
    'high-contrast': 'high contrast',
    'red-green': 'red-green colour support',
    'blue-yellow': 'blue-yellow colour support',
    monochrome: 'monochrome',
  }[preferences.visionMode];

  const size = {
    normal: 'normal text',
    large: 'large text',
    'extra-large': 'extra-large text',
  }[preferences.textSize];

  return `${vision}, ${size}${preferences.reduceMotion ? ', reduced motion' : ''}${preferences.emphasizeLinks ? ', emphasized links' : ''}`;
}

function createAccessibilityControls() {
  const wrapper = document.createElement('div');
  wrapper.className = 'accessibility-tools';
  wrapper.innerHTML = `
    <button
      id="accessibility-toggle"
      class="accessibility-toggle"
      type="button"
      aria-expanded="false"
      aria-controls="accessibility-panel"
    >
      <span aria-hidden="true">◐</span>
      Accessibility
    </button>

    <section
      id="accessibility-panel"
      class="accessibility-panel"
      aria-labelledby="accessibility-panel-title"
      hidden
    >
      <div class="accessibility-panel-heading">
        <div>
          <p class="eyebrow">DISPLAY SUPPORT</p>
          <h2 id="accessibility-panel-title">Accessibility</h2>
        </div>
        <button
          id="accessibility-close"
          class="accessibility-close"
          type="button"
          aria-label="Close accessibility settings"
        >×</button>
      </div>

      <label class="accessibility-field" for="vision-mode-select">
        <span>Colour and contrast</span>
        <select id="vision-mode-select">
          <option value="default">Default</option>
          <option value="high-contrast">High contrast</option>
          <option value="red-green">Red-green colour support</option>
          <option value="blue-yellow">Blue-yellow colour support</option>
          <option value="monochrome">Monochrome</option>
        </select>
      </label>

      <label class="accessibility-field" for="text-size-select">
        <span>Text size</span>
        <select id="text-size-select">
          <option value="normal">Normal</option>
          <option value="large">Large</option>
          <option value="extra-large">Extra large</option>
        </select>
      </label>

      <label class="accessibility-check" for="reduce-motion-toggle">
        <input id="reduce-motion-toggle" type="checkbox" />
        <span>Reduce animation and movement</span>
      </label>

      <label class="accessibility-check" for="emphasize-links-toggle">
        <input id="emphasize-links-toggle" type="checkbox" />
        <span>Underline and emphasize links</span>
      </label>

      <button id="accessibility-reset" type="button">
        Reset display settings
      </button>

      <p
        id="accessibility-status"
        class="visually-hidden"
        role="status"
        aria-live="polite"
      ></p>
    </section>
  `;

  let mount = document.getElementById('accessibility-tools-mount');

  if (!mount) {
    const runMetadata = document.querySelector('.topbar .run-metadata');

    if (runMetadata) {
      mount = document.createElement('div');
      mount.id = 'accessibility-tools-mount';
      mount.className = 'accessibility-tools-mount';
      mount.setAttribute('aria-label', 'Accessibility display controls');
      runMetadata.insertAdjacentElement('afterend', mount);
    }
  }

  if (mount) {
    mount.append(wrapper);
  } else {
    document.body.append(wrapper);
  }
}

function initializeAccessibilityControls() {
  if (!document.body || document.getElementById('accessibility-toggle')) {
    return;
  }

  createAccessibilityControls();

  const toggle = document.getElementById('accessibility-toggle');
  const panel = document.getElementById('accessibility-panel');
  const close = document.getElementById('accessibility-close');
  const reset = document.getElementById('accessibility-reset');
  const vision = document.getElementById('vision-mode-select');
  const textSize = document.getElementById('text-size-select');
  const reduceMotion = document.getElementById('reduce-motion-toggle');
  const emphasizeLinks = document.getElementById('emphasize-links-toggle');
  const status = document.getElementById('accessibility-status');

  let preferences = readPreferences();

  function syncControls() {
    vision.value = preferences.visionMode;
    textSize.value = preferences.textSize;
    reduceMotion.checked = preferences.reduceMotion;
    emphasizeLinks.checked = preferences.emphasizeLinks;
  }

  function commit(nextPreferences, announce = true) {
    preferences = normalizeAccessibilityPreferences(nextPreferences);
    applyAccessibilityPreferences(preferences);
    writePreferences(preferences);
    syncControls();

    if (announce) {
      status.textContent = `Display settings updated: ${preferenceSummary(preferences)}.`;
    }
  }

  function setPanelOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));

    if (open) {
      vision.focus();
    } else {
      toggle.focus();
    }
  }

  toggle.addEventListener('click', () => setPanelOpen(panel.hidden));
  close.addEventListener('click', () => setPanelOpen(false));

  vision.addEventListener('change', () => {
    commit({ ...preferences, visionMode: vision.value });
  });

  textSize.addEventListener('change', () => {
    commit({ ...preferences, textSize: textSize.value });
  });

  reduceMotion.addEventListener('change', () => {
    commit({ ...preferences, reduceMotion: reduceMotion.checked });
  });

  emphasizeLinks.addEventListener('change', () => {
    commit({ ...preferences, emphasizeLinks: emphasizeLinks.checked });
  });

  reset.addEventListener('click', () => {
    commit(DEFAULT_ACCESSIBILITY_PREFERENCES);
  });

  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      setPanelOpen(false);
    }
  });

  commit(preferences, false);
}

if (typeof document !== 'undefined') {
  applyAccessibilityPreferences(readPreferences());

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initializeAccessibilityControls,
      { once: true }
    );
  } else {
    initializeAccessibilityControls();
  }
}
