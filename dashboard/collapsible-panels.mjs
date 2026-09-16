const STORAGE_KEY = 'qa-sentinel-tyra-collapsed-panels-v2';
const selector = ['#dashboard-main > .card', '#dashboard-main > .two-column > .card'].join(',');

const readState = () => {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
};
const collapsed = readState();
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
const slug = value => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'panel';

function titleFor(panel) {
  return panel.querySelector(':scope > .section-heading h2, :scope > [class*="heading"] h2, :scope > h2')
    ?.textContent?.replace(/\s+/g, ' ').trim()
    || panel.querySelector('h2, h3')?.textContent?.replace(/\s+/g, ' ').trim()
    || 'Dashboard panel';
}
function eyebrowFor(panel) {
  return panel.querySelector(':scope > .section-heading .eyebrow, :scope > [class*="heading"] [class*="eyebrow"]')
    ?.textContent?.replace(/\s+/g, ' ').trim() || 'QA INTELLIGENCE';
}
function keyFor(panel, index) { return panel.id || `panel-${index}-${slug(titleFor(panel))}`; }

function setPanel(panel, key, shouldCollapse) {
  panel.classList.toggle('panel-collapsed', shouldCollapse);
  const button = panel.querySelector(':scope > .panel-collapse-toggle');
  if (button) {
    button.setAttribute('aria-expanded', String(!shouldCollapse));
    button.setAttribute('aria-label', `${shouldCollapse ? 'Expand' : 'Collapse'} ${panel.dataset.panelTitle}`);
    button.title = button.getAttribute('aria-label');
    button.querySelector('.panel-toggle-icon').textContent = shouldCollapse ? '＋' : '−';
  }
  shouldCollapse ? collapsed.add(key) : collapsed.delete(key);
}

function attach(panel, index) {
  if (panel.dataset.collapsibleReady) return;
  const title = titleFor(panel);
  const key = keyFor(panel, index);
  panel.dataset.collapsibleReady = 'true';
  panel.dataset.panelTitle = title;
  panel.classList.add('collapsible-panel');

  const summary = document.createElement('div');
  summary.className = 'panel-collapsed-summary';
  summary.setAttribute('aria-hidden', 'true');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'panel-collapsed-eyebrow';
  eyebrow.textContent = eyebrowFor(panel);
  const heading = document.createElement('strong');
  heading.className = 'panel-collapsed-title';
  heading.textContent = title;
  summary.append(eyebrow, heading);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'panel-collapse-toggle';
  button.dataset.panelKey = key;
  button.innerHTML = '<span class="panel-toggle-icon" aria-hidden="true">−</span>';
  button.addEventListener('click', () => {
    setPanel(panel, key, !panel.classList.contains('panel-collapsed'));
    save();
  });
  panel.prepend(summary);
  panel.prepend(button);
  setPanel(panel, key, collapsed.has(key));
}

const panels = () => [...document.querySelectorAll(selector)];
const attachAll = () => panels().forEach(attach);
function setAll(shouldCollapse) {
  panels().forEach((panel, index) => setPanel(panel, keyFor(panel, index), shouldCollapse));
  save();
}

function mountToolbar() {
  const main = document.getElementById('dashboard-main');
  if (!main || document.getElementById('panel-layout-tools')) return;
  const toolbar = document.createElement('nav');
  toolbar.id = 'panel-layout-tools';
  toolbar.className = 'panel-layout-tools';
  toolbar.setAttribute('aria-label', 'Dashboard panel layout');
  toolbar.innerHTML = '<div><span class="panel-layout-eyebrow">DASHBOARD LAYOUT</span><strong>Panel controls</strong></div><div class="panel-layout-actions"><button class="panel-layout-button" type="button" data-action="expand">Expand all panels</button><button class="panel-layout-button" type="button" data-action="collapse">Collapse all panels</button></div>';
  toolbar.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (action) setAll(action === 'collapse');
  });
  main.prepend(toolbar);
}

mountToolbar();
attachAll();
