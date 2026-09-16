const svg = path => `<svg class="v52-nav-svg" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;

const navConfig = {
  dashboard: {
    icon: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>',
    subtitle: { en:'Overview & status', sv:'Översikt & status', es:'Resumen y estado', fr:'Vue et état', hi:'अवलोकन व स्थिति', ar:'نظرة عامة وحالة', 'zh-CN':'概览与状态' }
  },
  'full-qa': {
    icon: '<circle cx="12" cy="12" r="8.5"/><path d="m10 8 6 4-6 4Z"/>',
    subtitle: { en:'Run all tests', sv:'Kör alla tester', es:'Ejecutar todo', fr:'Tout exécuter', hi:'सभी टेस्ट चलाएँ', ar:'تشغيل كل الاختبارات', 'zh-CN':'运行全部测试' }
  },
  fast: {
    icon: '<path d="M13 2 6.5 13h5L10.5 22 18 10h-5Z"/>',
    subtitle: { en:'Quick local run', sv:'Snabb testkörning', es:'Ejecución rápida', fr:'Exécution rapide', hi:'त्वरित रन', ar:'تشغيل سريع', 'zh-CN':'快速运行' }
  },
  security: {
    icon: '<path d="M12 3 20 6v5c0 5.2-3.5 8.3-8 10-4.5-1.7-8-4.8-8-10V6Z"/><path d="m8.5 12 2.1 2.1 4.8-5"/>',
    subtitle: { en:'Security tests', sv:'Säkerhetstester', es:'Pruebas de seguridad', fr:'Tests de sécurité', hi:'सुरक्षा टेस्ट', ar:'اختبارات الأمان', 'zh-CN':'安全测试' }
  },
  reports: {
    icon: '<path d="M5 20V11"/><path d="M10 20V6"/><path d="M15 20V9"/><path d="M20 20V3"/>',
    subtitle: { en:'Results & analysis', sv:'Resultat & analyser', es:'Resultados y análisis', fr:'Résultats et analyses', hi:'परिणाम व विश्लेषण', ar:'النتائج والتحليل', 'zh-CN':'结果与分析' }
  },
  playwright: {
    icon: '<path d="M6 3h9l4 4v14H6Z"/><path d="M15 3v5h5"/><path d="M9 12h6M9 16h6"/>',
    subtitle: { en:'Test report', sv:'Testrapport', es:'Informe de pruebas', fr:'Rapport de test', hi:'टेस्ट रिपोर्ट', ar:'تقرير الاختبار', 'zh-CN':'测试报告' }
  },
  accessibility: {
    icon: '<circle cx="12" cy="5" r="2"/><path d="M4 8h16M12 7v14M8 21l4-7 4 7M7 8l2 5M17 8l-2 5"/>',
    subtitle: { en:'Vision & display', sv:'Syn & visning', es:'Visión y pantalla', fr:'Vision et affichage', hi:'दृष्टि व डिस्प्ले', ar:'الرؤية والعرض', 'zh-CN':'视觉与显示' }
  },
  settings: {
    icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21h-4v-.1a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1H3v-4h.1a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1L7 4l.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 3V3h4v.1a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1L20 7l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1h.1v4h-.1a1.8 1.8 0 0 0-1.7.9Z"/>',
    subtitle: { en:'Preferences', sv:'Inställningar', es:'Preferencias', fr:'Préférences', hi:'प्राथमिकताएँ', ar:'التفضيلات', 'zh-CN':'偏好设置' }
  }
};

function locale() {
  return window.QaSentinelI18n?.locale || document.documentElement.lang || 'en';
}

function decorateNav() {
  for (const [key, config] of Object.entries(navConfig)) {
    const button = document.querySelector(`[data-workbench-nav="${key}"]`);
    if (!button) continue;
    const label = button.querySelector('span:last-child')?.textContent?.trim() || key;
    const labelI18n = button.querySelector('span:last-child')?.getAttribute('data-v5-i18n');
    button.innerHTML = `${svg(config.icon)}<small class="v52-nav-subtitle"></small><span${labelI18n ? ` data-v5-i18n="${labelI18n}"` : ''}>${label}</span>`;
  }
  updateNavSubtitles();
}

function updateNavSubtitles() {
  const lang = locale();
  for (const [key, config] of Object.entries(navConfig)) {
    const subtitle = document.querySelector(`[data-workbench-nav="${key}"] .v52-nav-subtitle`);
    if (subtitle) subtitle.textContent = config.subtitle[lang] || config.subtitle.en;
  }
}

const metricDecorations = {
  'v5-total-tests': {
    icon:'<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M9 5V3h6v2M9 10h6M9 14h6"/>',
    spark:'M2 25 10 18 18 21 27 11 36 16 45 9 56 5'
  },
  'v5-passed': {
    icon:'<circle cx="12" cy="12" r="8"/><path d="m8 12 2.7 2.7L16.5 9"/>',
    spark:'M2 24 9 19 16 20 23 14 30 13 38 9 46 11 56 4'
  },
  'v5-failed': {
    icon:'<path d="m7 7 10 10M17 7 7 17"/><circle cx="12" cy="12" r="8"/>',
    spark:'M2 25 10 24 18 20 27 16 36 12 45 13 56 7'
  },
  'v5-warnings': {
    icon:'<path d="m12 4 8 15H4Z"/><path d="M12 9v4M12 16h.01"/>',
    spark:'M2 25 10 18 18 20 27 13 36 15 45 8 56 4'
  }
};

function decorateMetrics() {
  for (const [id, item] of Object.entries(metricDecorations)) {
    const value = document.getElementById(id);
    const card = value?.closest('.v5-metric-card');
    if (!card || card.querySelector('.v52-metric-icon')) continue;
    card.insertAdjacentHTML('afterbegin', `<span class="v52-metric-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${item.icon}</svg></span>`);
    card.insertAdjacentHTML('beforeend', `<svg class="v52-sparkline" viewBox="0 0 58 28" preserveAspectRatio="none" aria-hidden="true"><path d="${item.spark}"/></svg>`);
  }
}

const quickSubtitles = {
  'run-full-qa': { en:'Run QA for selected target', sv:'Kör QA för valt testmål' },
  'fast-chromium': { en:'Quick check for selected target', sv:'Snabbtest för valt testmål' },
  'security': { en:'Open authorized security tests', sv:'Öppna auktoriserade säkerhetstester' },
  'playwright': { en:'View the latest native test result', sv:'Visa senaste testresultat' }
};

function decorateQuickActions() {
  const buttons = document.querySelectorAll('.v5-quick-action');
  for (const button of buttons) {
    if (button.querySelector('.v52-quick-copy')) continue;
    const strong = button.querySelector('strong');
    if (!strong) continue;
    const key = button.dataset.v5Action || button.dataset.v5ViewLink || '';
    const subtitle = quickSubtitles[key]?.[locale()] || quickSubtitles[key]?.en || '';
    const copy = document.createElement('span');
    copy.className = 'v52-quick-copy';
    strong.replaceWith(copy);
    copy.appendChild(strong);
    const small = document.createElement('small');
    small.textContent = subtitle;
    copy.appendChild(small);
  }
}

function updateQuickSubtitles() {
  for (const button of document.querySelectorAll('.v5-quick-action')) {
    const key = button.dataset.v5Action || button.dataset.v5ViewLink || '';
    const small = button.querySelector('.v52-quick-copy small');
    if (small) small.textContent = quickSubtitles[key]?.[locale()] || quickSubtitles[key]?.en || '';
  }
}

function decorateFooter() {
  const footer = document.querySelector('body > footer');
  if (!footer) return;
  footer.innerHTML = `
    <span class="v52-footer-left"><img src="./assets/qa-sentinel-tyra-icon.png" alt=""><span>QA Sentinel Tyra&nbsp;&nbsp;|&nbsp;&nbsp;Enterprise Quality Intelligence Platform&nbsp;&nbsp;|&nbsp;&nbsp;v1.0.0</span></span>
    <span class="v52-footer-right">♥&nbsp; By Petter — for Tyra&nbsp; ♡</span>
  `;
}

function addSystemVersionRows() {
  const systemCard = [...document.querySelectorAll('.v5-side-card')].find(card => card.querySelector('#v5-report-system'));
  if (!systemCard || systemCard.querySelector('[data-v52-system="node"]')) return;
  systemCard.insertAdjacentHTML('beforeend', `
    <div class="v5-system-line" data-v52-system="node"><span class="v5-status-dot is-online"></span><span>Node.js</span><strong class="v52-system-version" id="v52-node-version">—</strong></div>
    <div class="v5-system-line" data-v52-system="playwright"><span class="v5-status-dot is-online"></span><span>Playwright</span><strong class="v52-system-version" id="v52-playwright-version">—</strong></div>
  `);
}

async function refreshRuntimeVersions() {
  try {
    const response = await fetch(`./data/workbench-status.json?t=${Date.now()}`, { cache:'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const node = document.getElementById('v52-node-version');
    const pw = document.getElementById('v52-playwright-version');
    if (node) node.textContent = data.nodeVersion || 'Node 20+';
    if (pw) pw.textContent = data.playwrightVersion || 'Installed';
  } catch { /* launcher can still be starting */ }
}

document.title = 'QA Sentinel Tyra';
document.body.classList.add('v52-app');
decorateNav();
decorateMetrics();
decorateQuickActions();
decorateFooter();
addSystemVersionRows();
refreshRuntimeVersions();

// Keep enhancements intact if history/live content refreshes.
const observer = new MutationObserver(() => {
  decorateMetrics();
  decorateQuickActions();
});
observer.observe(document.getElementById('workbench-workspace') || document.body, { childList:true, subtree:true });

document.addEventListener('qa-sentinel-language-change', () => {
  queueMicrotask(() => {
    updateNavSubtitles();
    updateQuickSubtitles();
  });
});

setInterval(refreshRuntimeVersions, 5000);
