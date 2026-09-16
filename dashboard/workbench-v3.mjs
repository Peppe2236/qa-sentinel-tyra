const apiRoot = 'http://127.0.0.1:4174/api';
const statusUrl = './data/workbench-status.json';
const reportUrl = 'http://127.0.0.1:9323/';
const historyUrl = './data/history.json';

const main = document.getElementById('dashboard-main');
const shell = document.getElementById('workbench-panel');

if (!main || !shell) {
  throw new Error('QA Sentinel Tyra Workbench shell is missing.');
}

const tr = (key, fallback = '') =>
  window.QaSentinelI18n?.t?.(key, fallback) || fallback || key;

const formatWorkbenchDate = value =>
  window.QaSentinelI18n?.formatDate?.(value) ||
  (value ? new Date(value).toLocaleString() : '--');

const translateWorkbenchStatus = data =>
  window.QaSentinelI18n?.translateStatus?.(data) ||
  data?.message ||
  tr('msgIdle', 'Workbench ready.');

const translatedState = state => {
  const key = String(state || 'ready').toLowerCase();
  const keys = {
    ready: 'ready',
    running: 'running',
    warning: 'warning',
    error: 'error',
    starting: 'starting',
  };
  return tr(keys[key] || 'ready', String(state || 'READY').toUpperCase());
};

const v5Messages = {
  sv: {
    welcome: 'Välkommen till QA Sentinel Tyra!',
    welcomeBody: 'Din automatiserade kvalitetsassistent för säkrare, snabbare och bättre webbplatser.',
    motto: 'Kvalitet idag, en bättre morgondag.',
    project: 'Projekt', mode: 'Körläge', latestRun: 'Senaste körning', version: 'Version', ready: 'Redo',
    totalTests: 'Totala tester', passed: 'Godkända', failed: 'Misslyckade', warnings: 'Varningar',
    recentRuns: 'Senaste körningar', noHistory: 'Ingen körhistorik tillgänglig ännu.',
    quickActions: 'Snabbåtgärder', startFull: 'Starta Full QA', fastChromium: 'Fast Chromium', securityMode: 'Security Modes', openPlaywright: 'Öppna Playwright-rapport',
    systemStatus: 'Systemstatus', dashboard: 'Dashboard', controlApi: 'Control API', playwrightReport: 'Playwright Report', inactive: 'Inaktiv', online: 'Online', startsOnDemand: 'startas vid behov',
    reports: 'Rapporter', projects: 'Projektöversikt', release: 'Release Readiness', quality: 'Quality Intelligence', decision: 'Unified Decisioning', evidence: 'Detaljerad evidens',
    reportHelp: 'Välj den rapportvy du vill arbeta med. Endast den valda vyn visas.',
    theme: 'Färgtema', themeHelp: 'Byt accentfärg utan att påverka Accessibility-inställningarna.',
    themeAzure: 'Tyra Azure', themeEmerald: 'Emerald', themeViolet: 'Amethyst', themeAmber: 'Amber', themeRose: 'Rose', themeIce: 'Arctic',
    appearance: 'Utseende', languageSupport: 'Språk', languageSupportBody: 'Svenska plus sex stora världsspråk. Språkvalet sparas automatiskt.',
    accessibility: 'Accessibility', accessibilityBody: 'Färgblindhet, kontrast, textstorlek och visuella preferenser ligger kvar globalt oavsett färgtema.',
    fullScope: 'Full QA-analys', rootCause: 'Root Cause & Advisory', securityEvidence: 'Säkerhetsevidens',
    releaseStatus: 'Release Status', releaseLive: 'Live status från launcher', buildStage: 'Build', testsStage: 'Tester', analysisStage: 'Analys', reportStage: 'Rapport', decisionStage: 'Release Decision', complete: 'Klar', inProgress: 'Pågår', pending: 'Väntar', notVerified: 'Inte verifierad', target: 'Testmål', bothSites: 'Båda', nationOnly: 'Endast Nation', skillsOnly: 'Endast AI Skills', targetHelp: 'Välj vilka sajter som ska testas. Valet används av snabbåtgärderna och körsidorna.',
  },
  en: {
    welcome: 'Welcome to QA Sentinel Tyra!', welcomeBody: 'Your automated quality assistant for safer, faster and better websites.', motto: 'Quality today, a better tomorrow.',
    project: 'Project', mode: 'Mode', latestRun: 'Latest run', version: 'Version', ready: 'Ready', totalTests: 'Total tests', passed: 'Passed', failed: 'Failed', warnings: 'Warnings',
    recentRuns: 'Recent runs', noHistory: 'No run history is available yet.', quickActions: 'Quick actions', startFull: 'Start Full QA', fastChromium: 'Fast Chromium', securityMode: 'Security Modes', openPlaywright: 'Open Playwright report',
    systemStatus: 'System status', dashboard: 'Dashboard', controlApi: 'Control API', playwrightReport: 'Playwright Report', inactive: 'Inactive', online: 'Online', startsOnDemand: 'starts on demand',
    reports: 'Reports', projects: 'Project overview', release: 'Release Readiness', quality: 'Quality Intelligence', decision: 'Unified Decisioning', evidence: 'Detailed evidence', reportHelp: 'Choose the report view you want to work with. Only the selected view is shown.',
    theme: 'Colour theme', themeHelp: 'Change the accent palette without affecting Accessibility preferences.', themeAzure: 'Tyra Azure', themeEmerald: 'Emerald', themeViolet: 'Amethyst', themeAmber: 'Amber', themeRose: 'Rose', themeIce: 'Arctic',
    appearance: 'Appearance', languageSupport: 'Languages', languageSupportBody: 'Swedish plus six major world languages. Your language choice is saved automatically.', accessibility: 'Accessibility', accessibilityBody: 'Colour-blindness, contrast, text size and visual preferences stay global regardless of theme.',
    fullScope: 'Full QA analysis', rootCause: 'Root Cause & Advisory', securityEvidence: 'Security evidence',
    releaseStatus: 'Release Status', releaseLive: 'Live status from launcher', buildStage: 'Build', testsStage: 'Tests', analysisStage: 'Analysis', reportStage: 'Report', decisionStage: 'Release Decision', complete: 'Complete', inProgress: 'In Progress', pending: 'Pending', notVerified: 'Not verified', target: 'Test target', bothSites: 'Both sites', nationOnly: 'Nation only', skillsOnly: 'AI Skills only', targetHelp: 'Choose which sites to test. The selection is shared by quick actions and run pages.',
  },
  'zh-CN': {
    welcome: '欢迎使用 QA Sentinel Tyra！', welcomeBody: '为更安全、更快速、更优质的网站提供自动化质量辅助。', motto: '今日质量，更好明天。',
    project: '项目', mode: '模式', latestRun: '最近运行', version: '版本', ready: '就绪', totalTests: '测试总数', passed: '通过', failed: '失败', warnings: '警告',
    recentRuns: '最近运行', noHistory: '暂无运行历史。', quickActions: '快捷操作', startFull: '启动完整 QA', fastChromium: '快速 Chromium', securityMode: '安全模式', openPlaywright: '打开 Playwright 报告',
    systemStatus: '系统状态', dashboard: '仪表板', controlApi: '控制 API', playwrightReport: 'Playwright 报告', inactive: '未启动', online: '在线', startsOnDemand: '按需启动',
    reports: '报告', projects: '项目概览', release: '发布就绪', quality: '质量智能', decision: '统一决策', evidence: '详细证据', reportHelp: '选择要查看的报告视图。一次只显示一个视图。',
    theme: '颜色主题', themeHelp: '更换强调色，不影响无障碍设置。', themeAzure: 'Tyra 蓝', themeEmerald: '翡翠绿', themeViolet: '紫晶', themeAmber: '琥珀', themeRose: '玫瑰', themeIce: '极地冰蓝',
    appearance: '外观', languageSupport: '语言', languageSupportBody: '支持瑞典语和六种主要世界语言，选择会自动保存。', accessibility: '无障碍', accessibilityBody: '色觉、对比度、文字大小和视觉偏好在所有主题中始终可用。', fullScope: '完整 QA 分析', rootCause: '根因与建议', securityEvidence: '安全证据',
  },
  hi: {
    welcome: 'QA Sentinel Tyra में आपका स्वागत है!', welcomeBody: 'ज़्यादा सुरक्षित, तेज़ और बेहतर वेबसाइटों के लिए आपका स्वचालित गुणवत्ता सहायक।', motto: 'आज की गुणवत्ता, बेहतर कल।',
    project: 'प्रोजेक्ट', mode: 'मोड', latestRun: 'नवीनतम रन', version: 'संस्करण', ready: 'तैयार', totalTests: 'कुल टेस्ट', passed: 'पास', failed: 'असफल', warnings: 'चेतावनियाँ',
    recentRuns: 'हाल के रन', noHistory: 'अभी कोई रन इतिहास उपलब्ध नहीं है।', quickActions: 'त्वरित क्रियाएँ', startFull: 'Full QA शुरू करें', fastChromium: 'Fast Chromium', securityMode: 'Security Modes', openPlaywright: 'Playwright रिपोर्ट खोलें',
    systemStatus: 'सिस्टम स्थिति', dashboard: 'डैशबोर्ड', controlApi: 'कंट्रोल API', playwrightReport: 'Playwright रिपोर्ट', inactive: 'निष्क्रिय', online: 'ऑनलाइन', startsOnDemand: 'ज़रूरत पर शुरू होता है',
    reports: 'रिपोर्ट्स', projects: 'प्रोजेक्ट अवलोकन', release: 'Release Readiness', quality: 'Quality Intelligence', decision: 'Unified Decisioning', evidence: 'विस्तृत साक्ष्य', reportHelp: 'जिस रिपोर्ट दृश्य पर काम करना है उसे चुनें। केवल चुना हुआ दृश्य दिखेगा।',
    theme: 'रंग थीम', themeHelp: 'Accessibility सेटिंग्स बदले बिना एक्सेंट रंग बदलें।', themeAzure: 'Tyra Azure', themeEmerald: 'Emerald', themeViolet: 'Amethyst', themeAmber: 'Amber', themeRose: 'Rose', themeIce: 'Arctic',
    appearance: 'रूप', languageSupport: 'भाषाएँ', languageSupportBody: 'स्वीडिश के साथ छह प्रमुख विश्व भाषाएँ। भाषा चयन अपने आप सेव होता है।', accessibility: 'Accessibility', accessibilityBody: 'रंग-दृष्टि, कॉन्ट्रास्ट, टेक्स्ट आकार और दृश्य प्राथमिकताएँ हर थीम में उपलब्ध रहती हैं।', fullScope: 'पूर्ण QA विश्लेषण', rootCause: 'Root Cause और Advisory', securityEvidence: 'सुरक्षा साक्ष्य',
  },
  es: {
    welcome: '¡Bienvenido a QA Sentinel Tyra!', welcomeBody: 'Tu asistente de calidad automatizado para sitios más seguros, rápidos y mejores.', motto: 'Calidad hoy, un mañana mejor.',
    project: 'Proyecto', mode: 'Modo', latestRun: 'Última ejecución', version: 'Versión', ready: 'Listo', totalTests: 'Pruebas totales', passed: 'Aprobadas', failed: 'Fallidas', warnings: 'Avisos',
    recentRuns: 'Ejecuciones recientes', noHistory: 'Aún no hay historial de ejecuciones.', quickActions: 'Acciones rápidas', startFull: 'Iniciar Full QA', fastChromium: 'Fast Chromium', securityMode: 'Modos de seguridad', openPlaywright: 'Abrir informe Playwright',
    systemStatus: 'Estado del sistema', dashboard: 'Panel', controlApi: 'API de control', playwrightReport: 'Informe Playwright', inactive: 'Inactivo', online: 'En línea', startsOnDemand: 'se inicia bajo demanda',
    reports: 'Informes', projects: 'Resumen de proyectos', release: 'Preparación de release', quality: 'Inteligencia de calidad', decision: 'Decisión unificada', evidence: 'Evidencia detallada', reportHelp: 'Elige la vista de informe con la que quieres trabajar. Solo se muestra la vista seleccionada.',
    theme: 'Tema de color', themeHelp: 'Cambia el color de acento sin afectar las preferencias de accesibilidad.', themeAzure: 'Tyra Azure', themeEmerald: 'Esmeralda', themeViolet: 'Amatista', themeAmber: 'Ámbar', themeRose: 'Rosa', themeIce: 'Ártico',
    appearance: 'Apariencia', languageSupport: 'Idiomas', languageSupportBody: 'Sueco más seis grandes idiomas del mundo. La selección se guarda automáticamente.', accessibility: 'Accesibilidad', accessibilityBody: 'Daltonismo, contraste, tamaño de texto y preferencias visuales siguen disponibles en todos los temas.', fullScope: 'Análisis Full QA', rootCause: 'Causa raíz y asesoría', securityEvidence: 'Evidencia de seguridad',
  },
  ar: {
    welcome: 'مرحبًا بك في QA Sentinel Tyra!', welcomeBody: 'مساعد جودة آلي لمواقع أكثر أمانًا وسرعة وجودة.', motto: 'جودة اليوم، لغدٍ أفضل.',
    project: 'المشروع', mode: 'الوضع', latestRun: 'آخر تشغيل', version: 'الإصدار', ready: 'جاهز', totalTests: 'إجمالي الاختبارات', passed: 'ناجح', failed: 'فاشل', warnings: 'تحذيرات',
    recentRuns: 'عمليات التشغيل الأخيرة', noHistory: 'لا يوجد سجل تشغيل متاح بعد.', quickActions: 'إجراءات سريعة', startFull: 'تشغيل Full QA', fastChromium: 'Fast Chromium', securityMode: 'أوضاع الأمان', openPlaywright: 'فتح تقرير Playwright',
    systemStatus: 'حالة النظام', dashboard: 'لوحة التحكم', controlApi: 'واجهة التحكم', playwrightReport: 'تقرير Playwright', inactive: 'غير نشط', online: 'متصل', startsOnDemand: 'يبدأ عند الطلب',
    reports: 'التقارير', projects: 'نظرة عامة على المشاريع', release: 'جاهزية الإصدار', quality: 'ذكاء الجودة', decision: 'القرار الموحد', evidence: 'الأدلة التفصيلية', reportHelp: 'اختر عرض التقرير الذي تريد العمل عليه. يظهر العرض المحدد فقط.',
    theme: 'سمة الألوان', themeHelp: 'غيّر لون الواجهة دون التأثير على إعدادات إمكانية الوصول.', themeAzure: 'Tyra Azure', themeEmerald: 'زمردي', themeViolet: 'جمشت', themeAmber: 'كهرماني', themeRose: 'وردي', themeIce: 'قطبي',
    appearance: 'المظهر', languageSupport: 'اللغات', languageSupportBody: 'السويدية مع ست لغات عالمية رئيسية. يتم حفظ الاختيار تلقائيًا.', accessibility: 'إمكانية الوصول', accessibilityBody: 'تظل إعدادات عمى الألوان والتباين وحجم النص والتفضيلات المرئية متاحة مع كل سمة.', fullScope: 'تحليل QA الكامل', rootCause: 'السبب الجذري والاستشارة', securityEvidence: 'أدلة الأمان',
  },
  fr: {
    welcome: 'Bienvenue dans QA Sentinel Tyra !', welcomeBody: 'Votre assistant qualité automatisé pour des sites plus sûrs, plus rapides et meilleurs.', motto: "La qualité aujourd'hui, un meilleur demain.",
    project: 'Projet', mode: 'Mode', latestRun: 'Dernière exécution', version: 'Version', ready: 'Prêt', totalTests: 'Tests totaux', passed: 'Réussis', failed: 'Échoués', warnings: 'Avertissements',
    recentRuns: 'Exécutions récentes', noHistory: "Aucun historique d'exécution disponible.", quickActions: 'Actions rapides', startFull: 'Lancer Full QA', fastChromium: 'Fast Chromium', securityMode: 'Modes de sécurité', openPlaywright: 'Ouvrir le rapport Playwright',
    systemStatus: 'État du système', dashboard: 'Tableau de bord', controlApi: 'API de contrôle', playwrightReport: 'Rapport Playwright', inactive: 'Inactif', online: 'En ligne', startsOnDemand: 'démarre à la demande',
    reports: 'Rapports', projects: 'Vue des projets', release: 'Release Readiness', quality: 'Quality Intelligence', decision: 'Unified Decisioning', evidence: 'Preuves détaillées', reportHelp: 'Choisissez la vue de rapport à utiliser. Seule la vue sélectionnée est affichée.',
    theme: 'Thème de couleur', themeHelp: "Changez la couleur d'accent sans modifier les préférences d'accessibilité.", themeAzure: 'Tyra Azure', themeEmerald: 'Émeraude', themeViolet: 'Améthyste', themeAmber: 'Ambre', themeRose: 'Rose', themeIce: 'Arctique',
    appearance: 'Apparence', languageSupport: 'Langues', languageSupportBody: 'Suédois plus six grandes langues mondiales. Le choix est enregistré automatiquement.', accessibility: 'Accessibilité', accessibilityBody: "Daltonisme, contraste, taille du texte et préférences visuelles restent disponibles quel que soit le thème.", fullScope: 'Analyse Full QA', rootCause: 'Cause racine et conseil', securityEvidence: 'Preuves de sécurité',
  },
};

function locale() {
  return window.QaSentinelI18n?.locale || document.documentElement.lang || 'sv';
}

function v5t(key) {
  const current = v5Messages[locale()] || v5Messages.en;
  return current[key] ?? v5Messages.en[key] ?? key;
}

function make(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/* ---------------------------------------------------------
   V5.1 shell controls
   - Keep the hero clean, matching the target desktop mockup.
   - Accessibility is promoted to its own main-menu view.
   - Language and colour theme live under Settings.
   --------------------------------------------------------- */
const hero = shell.querySelector('.workbench-hero');
const globalTools = shell.querySelector('.workbench-global-tools');
const accessibilityBar = shell.querySelector('.workbench-accessibility-bar');
const accessibilityMount = document.getElementById('accessibility-tools-mount');
const languagePicker = shell.querySelector('.workbench-language-picker');

if (accessibilityBar) accessibilityBar.hidden = true;

const themePicker = make('label', 'workbench-theme-picker');
themePicker.innerHTML = `
  <span class="workbench-theme-dot" aria-hidden="true"></span>
  <span class="workbench-theme-copy">
    <strong data-v5-i18n="theme">Colour theme</strong>
    <small data-v5-i18n="appearance">Appearance</small>
  </span>
  <select id="workbench-theme-select" aria-label="Colour theme">
    <option value="azure">Tyra Azure</option>
    <option value="emerald">Emerald</option>
    <option value="violet">Amethyst</option>
    <option value="amber">Amber</option>
    <option value="rose">Rose</option>
    <option value="ice">Arctic</option>
  </select>
`;

/* ---------------------------------------------------------
   Build one real application workspace. No loose panels below.
   --------------------------------------------------------- */
const workspace = make('div', 'workbench-workspace');
workspace.id = 'workbench-workspace';
shell.insertAdjacentElement('afterend', workspace);

const pageNames = ['dashboard', 'full-qa', 'fast', 'security', 'reports', 'playwright', 'accessibility', 'settings'];
const pages = new Map();

for (const name of pageNames) {
  const page = make('section', 'workbench-page');
  page.dataset.workbenchPage = name;
  page.hidden = name !== 'dashboard';
  page.setAttribute('role', 'tabpanel');
  workspace.appendChild(page);
  pages.set(name, page);
}

/* ---------------------------------------------------------
   Dashboard (the compact image-2 style home screen)
   --------------------------------------------------------- */
pages.get('dashboard').innerHTML = `
  <div class="v5-dashboard-grid">
    <div class="v5-dashboard-main">
      <section class="v5-welcome-card">
        <div class="v5-welcome-copy">
          <h2><span class="v5-live-orb" aria-hidden="true"></span><span data-v5-i18n="welcome">Välkommen till QA Sentinel Tyra!</span></h2>
          <p data-v5-i18n="welcomeBody">Din automatiserade kvalitetsassistent för säkrare, snabbare och bättre webbplatser.</p>
          <p class="v5-motto" data-v5-i18n="motto">Kvalitet idag, en bättre morgondag.</p>
        </div>
        <dl class="v5-project-meta">
          <div><dt data-v5-i18n="project">Projekt</dt><dd id="v5-project-value">nation.dev&nbsp; | &nbsp;ai-skills.nation.dev</dd></div>
          <div><dt data-v5-i18n="mode">Körläge</dt><dd id="v5-mode">—</dd></div>
          <div><dt data-v5-i18n="latestRun">Senaste körning</dt><dd id="v5-latest-run">—</dd></div>
          <div><dt data-v5-i18n="version">Version</dt><dd>v1.0.0</dd></div>
        </dl>
      </section>

      <section class="v5-metrics" aria-label="QA summary">
        <article class="v5-metric-card v5-metric-total"><span data-v5-i18n="totalTests">Totala tester</span><strong id="v5-total-tests">--</strong><small>Nation + AI Skills</small></article>
        <article class="v5-metric-card v5-metric-pass"><span data-v5-i18n="passed">Godkända</span><strong id="v5-passed">--</strong><small id="v5-pass-rate">--%</small></article>
        <article class="v5-metric-card v5-metric-fail"><span data-v5-i18n="failed">Misslyckade</span><strong id="v5-failed">--</strong><small id="v5-fail-rate">--%</small></article>
        <article class="v5-metric-card v5-metric-warning"><span data-v5-i18n="warnings">Varningar</span><strong id="v5-warnings">--</strong><small id="v5-warning-rate">--%</small></article>
      </section>

      <section class="v53-release-card" aria-labelledby="v53-release-title">
        <div class="v53-release-head">
          <div class="v53-release-title"><span class="v53-release-rocket" aria-hidden="true">◆</span><h3 id="v53-release-title" data-v5-i18n="releaseStatus">Release Status</h3></div>
          <span id="v53-release-badge" class="v53-release-badge">READY</span>
        </div>
        <div class="v53-release-track" aria-label="Release status">
          <div class="v53-stage" data-release-stage="build"><span class="v53-stage-node">✓</span><strong data-v5-i18n="buildStage">Build</strong><small data-stage-label data-v5-i18n="complete">Complete</small></div>
          <div class="v53-stage" data-release-stage="tests"><span class="v53-stage-node">2</span><strong data-v5-i18n="testsStage">Tests</strong><small data-stage-label data-v5-i18n="pending">Pending</small></div>
          <div class="v53-stage" data-release-stage="analysis"><span class="v53-stage-node">3</span><strong data-v5-i18n="analysisStage">Analysis</strong><small data-stage-label data-v5-i18n="pending">Pending</small></div>
          <div class="v53-stage" data-release-stage="report"><span class="v53-stage-node">4</span><strong data-v5-i18n="reportStage">Report</strong><small data-stage-label data-v5-i18n="pending">Pending</small></div>
          <div class="v53-stage" data-release-stage="decision"><span class="v53-stage-node">5</span><strong data-v5-i18n="decisionStage">Release Decision</strong><small data-stage-label data-v5-i18n="pending">Pending</small></div>
        </div>
        <div class="v53-release-note"><span aria-hidden="true">ⓘ</span><div><strong id="v53-release-message">Workbench ready.</strong><small><span data-v5-i18n="releaseLive">Live status from launcher</span> · <span id="v53-release-target">Both sites</span></small></div></div>
      </section>

      <section class="v5-recent-card">
        <div class="v5-section-heading"><h3 data-v5-i18n="recentRuns">Senaste körningar</h3></div>
        <div id="v5-recent-runs" class="v5-recent-runs"><p data-v5-i18n="noHistory">Ingen körhistorik tillgänglig ännu.</p></div>
      </section>
    </div>

    <aside class="v5-dashboard-side">
      <section class="v5-side-card">
        <h3 data-v5-i18n="quickActions">Snabbåtgärder</h3>
        <div class="v53-target-box">
          <div class="v53-target-heading"><strong data-v5-i18n="target">Test target</strong><span id="v53-target-label">Both sites</span></div>
          <div class="v53-target-switch" data-target-control role="radiogroup" aria-label="Test target">
            <button type="button" data-target="both" aria-checked="true" role="radio" data-v5-i18n="bothSites">Both sites</button>
            <button type="button" data-target="nation" aria-checked="false" role="radio" data-v5-i18n="nationOnly">Nation only</button>
            <button type="button" data-target="skills" aria-checked="false" role="radio" data-v5-i18n="skillsOnly">AI Skills only</button>
          </div>
        </div>
        <button type="button" class="v5-quick-action v5-quick-primary" data-v5-action="run-full-qa"><span>▶</span><strong data-v5-i18n="startFull">Starta Full QA</strong><b>›</b></button>
        <button type="button" class="v5-quick-action" data-v5-action="fast-chromium"><span>ϟ</span><strong data-v5-i18n="fastChromium">Fast Chromium</strong><b>›</b></button>
        <button type="button" class="v5-quick-action" data-v5-view-link="security"><span>◈</span><strong data-v5-i18n="securityMode">Security Modes</strong><b>›</b></button>
        <button type="button" class="v5-quick-action" data-v5-action="playwright"><span>▣</span><strong data-v5-i18n="openPlaywright">Öppna Playwright-rapport</strong><b>›</b></button>
      </section>

      <section class="v5-side-card">
        <h3 data-v5-i18n="systemStatus">Systemstatus</h3>
        <div class="v5-system-line"><span class="v5-status-dot is-online"></span><span data-v5-i18n="dashboard">Dashboard</span><strong><span data-v5-i18n="online">Online</span> <em>(4173)</em></strong></div>
        <div class="v5-system-line"><span class="v5-status-dot is-online"></span><span data-v5-i18n="controlApi">Control API</span><strong><span data-v5-i18n="online">Online</span> <em>(4174)</em></strong></div>
        <div class="v5-system-line"><span id="v5-report-dot" class="v5-status-dot"></span><span data-v5-i18n="playwrightReport">Playwright Report</span><strong id="v5-report-system">—</strong></div>
      </section>
    </aside>
  </div>
`;

/* ---------------------------------------------------------
   Move the existing action pages into the real workspace.
   --------------------------------------------------------- */
function absorb(wrapperId, targetName) {
  const wrapper = document.getElementById(wrapperId);
  const target = pages.get(targetName);
  if (!wrapper || !target) return;

  while (wrapper.firstChild) target.appendChild(wrapper.firstChild);
  wrapper.remove();
}

absorb('workbench-full-qa-view', 'full-qa');
absorb('workbench-fast-view', 'fast');
absorb('workbench-security-view', 'security');
absorb('workbench-playwright-view', 'playwright');
absorb('workbench-settings-view', 'settings');

function prependTargetPicker(pageName) {
  const page = pages.get(pageName);
  if (!page || page.querySelector('[data-target-control]')) return;
  const picker = make('section', 'v53-page-target');
  picker.innerHTML = `
    <div><p class="eyebrow" data-v5-i18n="target">Test target</p><strong id="v53-${pageName}-target-label">Both sites</strong><small data-v5-i18n="targetHelp">Choose which sites to test. The selection is shared by quick actions and run pages.</small></div>
    <div class="v53-target-switch" data-target-control role="radiogroup" aria-label="Test target">
      <button type="button" data-target="both" aria-checked="true" role="radio" data-v5-i18n="bothSites">Both sites</button>
      <button type="button" data-target="nation" aria-checked="false" role="radio" data-v5-i18n="nationOnly">Nation only</button>
      <button type="button" data-target="skills" aria-checked="false" role="radio" data-v5-i18n="skillsOnly">AI Skills only</button>
    </div>`;
  page.prepend(picker);
}
prependTargetPicker('full-qa');
prependTargetPicker('fast');

/* Accessibility gets a dedicated top-level menu between Playwright and Settings. */
const accessibilityPage = pages.get('accessibility');
accessibilityPage.innerHTML = `
  <section class="v51-accessibility-card">
    <div class="v51-accessibility-heading">
      <div>
        <p class="eyebrow" data-v5-i18n="accessibility">Accessibility</p>
        <h2 data-v5-i18n="accessibility">Accessibility</h2>
        <p>Colour-vision modes, contrast, text size and reduced-motion preferences stay available independently of the selected colour theme.</p>
      </div>
      <span class="v51-accessibility-badge">WCAG / VISUAL</span>
    </div>
    <div id="v51-accessibility-controls" class="v51-accessibility-controls"></div>
    <div class="v51-accessibility-notes">
      <article><strong>Colour vision</strong><span>Default, Protanopia, Deuteranopia, Tritanopia and Achromatopsia support.</span></article>
      <article><strong>Readable UI</strong><span>High contrast and larger text remain available without changing QA evidence.</span></article>
      <article><strong>Motion</strong><span>Reduced-motion preferences keep the Workbench calm and easier to follow.</span></article>
    </div>
  </section>
`;
const accessibilityControlsHost = document.getElementById('v51-accessibility-controls');
if (accessibilityMount && accessibilityControlsHost) accessibilityControlsHost.appendChild(accessibilityMount);

const oldReports = document.getElementById('workbench-reports-view');
if (oldReports) oldReports.remove();

/* Full-QA intelligence is part of the Full QA menu, not loose below. */
const rootCause = document.getElementById('root-cause-panel');
const autonomous = document.getElementById('autonomous-qa-panel');
if (rootCause || autonomous) {
  const heading = make('div', 'v5-page-divider', `<span data-v5-i18n="rootCause">Root Cause & Advisory</span>`);
  pages.get('full-qa').appendChild(heading);
  if (rootCause) pages.get('full-qa').appendChild(rootCause);
  if (autonomous) pages.get('full-qa').appendChild(autonomous);
}

/* Security evidence belongs to Security Modes. */
const securityPerformance = document.getElementById('security-performance-panel');
const pentest = document.getElementById('pentest-panel');
if (securityPerformance || pentest) {
  const heading = make('div', 'v5-page-divider', `<span data-v5-i18n="securityEvidence">Säkerhetsevidens</span>`);
  pages.get('security').appendChild(heading);
  if (securityPerformance) pages.get('security').appendChild(securityPerformance);
  if (pentest) pages.get('security').appendChild(pentest);
}

/* ---------------------------------------------------------
   Reports becomes a menu inside the main menu.
   --------------------------------------------------------- */
const reportsPage = pages.get('reports');
reportsPage.innerHTML = `
  <section class="v5-reports-shell">
    <header class="v5-reports-header">
      <div><p class="eyebrow" data-v5-i18n="reports">Rapporter</p><h2 data-v5-i18n="reports">Rapporter</h2><p data-v5-i18n="reportHelp">Välj den rapportvy du vill arbeta med. Endast den valda vyn visas.</p></div>
      <div class="v5-report-links">
        <a href="/reports/latest-report.html" target="_blank" rel="noreferrer">HTML</a>
        <a href="/reports/executive-report.pdf" target="_blank" rel="noreferrer">PDF</a>
        <a href="/reports/human-review.html" target="_blank" rel="noreferrer">Human Review</a>
      </div>
    </header>
    <nav class="v5-report-nav" aria-label="Report views">
      <button type="button" data-report-view="projects" aria-selected="true" data-v5-i18n="projects">Projektöversikt</button>
      <button type="button" data-report-view="release" aria-selected="false" data-v5-i18n="release">Release Readiness</button>
      <button type="button" data-report-view="quality" aria-selected="false" data-v5-i18n="quality">Quality Intelligence</button>
      <button type="button" data-report-view="decision" aria-selected="false" data-v5-i18n="decision">Unified Decisioning</button>
      <button type="button" data-report-view="evidence" aria-selected="false" data-v5-i18n="evidence">Detaljerad evidens</button>
    </nav>
    <div class="v5-report-panes">
      <div class="v5-report-pane" data-report-pane="projects"></div>
      <div class="v5-report-pane" data-report-pane="release" hidden></div>
      <div class="v5-report-pane" data-report-pane="quality" hidden></div>
      <div class="v5-report-pane" data-report-pane="decision" hidden></div>
      <div class="v5-report-pane" data-report-pane="evidence" hidden></div>
    </div>
  </section>
`;

const reportPanes = new Map(
  Array.from(reportsPage.querySelectorAll('[data-report-pane]')).map(node => [node.dataset.reportPane, node])
);

const moveToReport = (node, pane) => {
  if (node && reportPanes.get(pane)) reportPanes.get(pane).appendChild(node);
};

moveToReport(document.getElementById('site-health-panel'), 'projects');
moveToReport(document.getElementById('release-card'), 'release');
moveToReport(document.getElementById('discovery-release-panel'), 'release');
moveToReport(main.querySelector('.hero-grid'), 'quality');
moveToReport(document.getElementById('sentinel-ai-panel'), 'quality');
moveToReport(document.getElementById('unified-decision-panel'), 'decision');

const detailedIds = [
  'ux-ui-panel',
  'compatibility-panel',
  'api-backend-panel',
  'cross-layer-panel',
];
for (const id of detailedIds) moveToReport(document.getElementById(id), 'evidence');

/* The old Control Center duplicates the new image-2 dashboard, so keep it out of sight. */
const oldControlCenter = main.querySelector('.control-center');
oldControlCenter?.remove();

/* Anything still loose under <main> is evidence. This guarantees a clean app shell. */
for (const child of Array.from(main.children)) {
  if (child === shell || child === workspace) continue;
  moveToReport(child, 'evidence');
}

/* ---------------------------------------------------------
   Settings: language + colour theme live here in V5.1.
   Accessibility has its own dedicated main-menu view.
   --------------------------------------------------------- */
const settingsPage = pages.get('settings');
const themeSection = make('section', 'v5-settings-card');
themeSection.innerHTML = `
  <div class="v5-settings-heading">
    <div>
      <p class="eyebrow" data-v5-i18n="appearance">Appearance</p>
      <h2>Interface preferences</h2>
      <p>Choose the Workbench language and accent palette. These preferences do not change QA evidence or Accessibility modes.</p>
    </div>
  </div>
  <div id="v51-settings-selectors" class="v51-settings-selectors"></div>
  <div class="v5-theme-grid" role="radiogroup" aria-label="Colour theme">
    <button type="button" data-theme-choice="azure"><span class="swatch azure"></span><strong data-v5-i18n="themeAzure">Tyra Azure</strong></button>
    <button type="button" data-theme-choice="emerald"><span class="swatch emerald"></span><strong data-v5-i18n="themeEmerald">Emerald</strong></button>
    <button type="button" data-theme-choice="violet"><span class="swatch violet"></span><strong data-v5-i18n="themeViolet">Amethyst</strong></button>
    <button type="button" data-theme-choice="amber"><span class="swatch amber"></span><strong data-v5-i18n="themeAmber">Amber</strong></button>
    <button type="button" data-theme-choice="rose"><span class="swatch rose"></span><strong data-v5-i18n="themeRose">Rose</strong></button>
    <button type="button" data-theme-choice="ice"><span class="swatch ice"></span><strong data-v5-i18n="themeIce">Arctic</strong></button>
  </div>
`;
settingsPage.prepend(themeSection);

const settingsSelectors = document.getElementById('v51-settings-selectors');
if (settingsSelectors) {
  if (languagePicker) settingsSelectors.appendChild(languagePicker);
  settingsSelectors.appendChild(themePicker);
}

/* ---------------------------------------------------------
   Navigation
   --------------------------------------------------------- */
const navButtons = Array.from(shell.querySelectorAll('[data-workbench-nav]'));

function setView(view, focus = false) {
  if (!pages.has(view)) view = 'dashboard';

  for (const button of navButtons) {
    const selected = button.dataset.workbenchNav === view;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  }

  for (const [name, page] of pages) {
    const active = name === view;
    page.hidden = !active;
    page.classList.toggle('is-active', active);
  }

  try { localStorage.setItem('qa-sentinel-workbench-view', view); } catch { /* optional */ }

  if (focus) workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

for (const button of navButtons) {
  button.addEventListener('click', () => setView(button.dataset.workbenchNav, true));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const index = navButtons.indexOf(button);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = navButtons[(index + delta + navButtons.length) % navButtons.length];
    next.focus();
    setView(next.dataset.workbenchNav, false);
  });
}

for (const button of document.querySelectorAll('[data-v5-view-link]')) {
  button.addEventListener('click', () => setView(button.dataset.v5ViewLink, true));
}

let initialView = 'dashboard';
try {
  const stored = localStorage.getItem('qa-sentinel-workbench-view');
  if (pages.has(stored)) initialView = stored;
} catch { /* optional */ }
setView(initialView, false);

/* Report submenu */
const reportButtons = Array.from(reportsPage.querySelectorAll('[data-report-view]'));
function setReportView(view) {
  if (!reportPanes.has(view)) view = 'projects';
  for (const button of reportButtons) button.setAttribute('aria-selected', String(button.dataset.reportView === view));
  for (const [name, pane] of reportPanes) pane.hidden = name !== view;
  try { localStorage.setItem('qa-sentinel-report-view', view); } catch { /* optional */ }
}
for (const button of reportButtons) button.addEventListener('click', () => setReportView(button.dataset.reportView));
let initialReport = 'projects';
try {
  const stored = localStorage.getItem('qa-sentinel-report-view');
  if (reportPanes.has(stored)) initialReport = stored;
} catch { /* optional */ }
setReportView(initialReport);

/* ---------------------------------------------------------
   Colour themes (independent from Accessibility)
   --------------------------------------------------------- */
const THEME_KEY = 'qa-sentinel-workbench-theme';
const themeSelect = document.getElementById('workbench-theme-select');
const themeChoices = Array.from(document.querySelectorAll('[data-theme-choice]'));
const validThemes = new Set(['azure', 'emerald', 'violet', 'amber', 'rose', 'ice']);

function applyTheme(theme, persist = true) {
  if (!validThemes.has(theme)) theme = 'azure';
  document.documentElement.dataset.wbTheme = theme;
  if (themeSelect && themeSelect.value !== theme) themeSelect.value = theme;
  for (const button of themeChoices) {
    const selected = button.dataset.themeChoice === theme;
    button.setAttribute('aria-checked', String(selected));
    button.classList.toggle('is-selected', selected);
  }
  if (persist) {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* optional */ }
  }
}

let initialTheme = 'azure';
try {
  const stored = localStorage.getItem(THEME_KEY);
  if (validThemes.has(stored)) initialTheme = stored;
} catch { /* optional */ }
applyTheme(initialTheme, false);
themeSelect?.addEventListener('change', () => applyTheme(themeSelect.value));
for (const button of themeChoices) button.addEventListener('click', () => applyTheme(button.dataset.themeChoice));

/* ---------------------------------------------------------
   Test target selector — shared across Dashboard, Full QA and Fast Chromium.
   --------------------------------------------------------- */
const TARGET_KEY = 'qa-sentinel-test-target';
const validTargets = new Set(['both', 'nation', 'skills']);
let selectedTarget = 'both';

function targetDisplay(target = selectedTarget) {
  if (target === 'nation') return v5t('nationOnly');
  if (target === 'skills') return v5t('skillsOnly');
  return v5t('bothSites');
}

function targetProjectDisplay(target = selectedTarget) {
  if (target === 'nation') return 'nation.dev';
  if (target === 'skills') return 'ai-skills.nation.dev';
  return 'nation.dev  |  ai-skills.nation.dev';
}

function applyTarget(target, persist = true) {
  if (!validTargets.has(target)) target = 'both';
  selectedTarget = target;
  for (const control of document.querySelectorAll('[data-target-control]')) {
    for (const button of control.querySelectorAll('[data-target]')) {
      const checked = button.dataset.target === target;
      button.setAttribute('aria-checked', String(checked));
      button.classList.toggle('is-selected', checked);
    }
  }
  const label = document.getElementById('v53-target-label');
  if (label) label.textContent = targetDisplay(target);
  for (const id of ['v53-full-qa-target-label', 'v53-fast-target-label']) {
    const node = document.getElementById(id);
    if (node) node.textContent = targetDisplay(target);
  }
  const project = document.getElementById('v5-project-value');
  if (project) project.textContent = targetProjectDisplay(target);
  const releaseTarget = document.getElementById('v53-release-target');
  if (releaseTarget) releaseTarget.textContent = targetDisplay(target);
  if (persist) {
    try { localStorage.setItem(TARGET_KEY, target); } catch { /* optional */ }
  }
  updateDashboardMetrics();
}

try {
  const storedTarget = localStorage.getItem(TARGET_KEY);
  if (validTargets.has(storedTarget)) selectedTarget = storedTarget;
} catch { /* optional */ }

for (const control of document.querySelectorAll('[data-target-control]')) {
  control.addEventListener('click', event => {
    const button = event.target.closest?.('[data-target]');
    if (button) applyTarget(button.dataset.target);
  });
}
applyTarget(selectedTarget, false);

/* ---------------------------------------------------------
   Launcher state & actions
   --------------------------------------------------------- */
const badge = document.getElementById('workbench-badge');
const phase = document.getElementById('workbench-phase');
const message = document.getElementById('workbench-message');
const updated = document.getElementById('workbench-updated');
const reportStatus = document.getElementById('workbench-playwright-status');
const reportButton = document.getElementById('workbench-playwright-button');
const legacyReportLink = document.getElementById('control-playwright-link');

const actionButtons = [
  ['run-full-qa-button', 'run-full-qa'],
  ['fast-chromium-button', 'fast-chromium'],
  ['security-production-button', 'security-production'],
  ['security-staging-button', 'security-staging'],
  ['security-manual-button', 'security-manual'],
];

async function fetchState() {
  const response = await fetch(`${statusUrl}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Workbench status unavailable.');
  return response.json();
}

function setBusyState(busy, currentAction) {
  for (const [id, action] of actionButtons) {
    const button = document.getElementById(id);
    if (!button) continue;
    button.disabled = busy;
    button.setAttribute('aria-busy', busy && currentAction === action ? 'true' : 'false');
  }
  for (const button of document.querySelectorAll('[data-v5-action]')) {
    if (button.dataset.v5Action !== 'playwright') button.disabled = busy;
  }
}

function updateFromState(data) {
  if (badge) badge.textContent = translatedState(data.overallStatus);
  if (phase) phase.textContent = data.phase || 'idle';
  if (message) message.textContent = translateWorkbenchStatus(data);
  if (updated) updated.textContent = formatWorkbenchDate(data.updatedAt);

  if (reportStatus) {
    reportStatus.textContent = data.reportReady
      ? tr('reportOpen', 'OPEN')
      : data.reportAvailable
        ? tr('reportReady', 'READY TO OPEN')
        : tr('reportRunFirst', 'RUN QA FIRST');
  }

  if (reportButton) reportButton.disabled = !data.reportAvailable && !data.reportReady;
  setBusyState(Boolean(data.busy), data.currentAction || null);

  const mode = document.getElementById('v5-mode');
  const latest = document.getElementById('v5-latest-run');
  if (mode) mode.textContent = data.busy ? translatedState('running') : v5t('ready');
  if (latest) latest.textContent = formatWorkbenchDate(data.updatedAt);

  const reportDot = document.getElementById('v5-report-dot');
  const reportSystem = document.getElementById('v5-report-system');
  if (reportDot) reportDot.classList.toggle('is-online', Boolean(data.reportReady));
  if (reportSystem) {
    reportSystem.textContent = data.reportReady
      ? `${v5t('online')} (9323)`
      : `${v5t('inactive')} · ${v5t('startsOnDemand')}`;
  }
  updateReleaseStatus(data);
}

function releaseDecisionText() {
  const value = document.getElementById('release-status')?.textContent?.trim() || '';
  return value;
}

function setReleaseStage(name, state, label) {
  const stage = document.querySelector(`[data-release-stage="${name}"]`);
  if (!stage) return;
  stage.dataset.state = state;
  const node = stage.querySelector('.v53-stage-node');
  const text = stage.querySelector('[data-stage-label]');
  if (node) node.textContent = state === 'complete' ? '✓' : state === 'active' ? '●' : state === 'warning' ? '!' : String(['build','tests','analysis','report','decision'].indexOf(name) + 1);
  if (text) text.textContent = label;
}

function updateReleaseStatus(data = {}) {
  const qaActions = new Set(['run-full-qa', 'fast-chromium']);
  const runningQa = Boolean(data.busy) && qaActions.has(data.currentAction);
  const hasQaRunThisSession = qaActions.has(data.lastQaAction || data.lastAction);
  const finishedQa = !runningQa && Boolean(data.lastQaCompletedAt) && hasQaRunThisSession;
  const reportFresh = Boolean(data.lastQaReportFresh);
  const decision = reportFresh ? releaseDecisionText() : '';
  const decisionUpper = decision.toUpperCase();
  const decisionReady = reportFresh && decisionUpper.includes('READY') && !decisionUpper.includes('NOT');
  const decisionWarning = reportFresh && Boolean(decision) && (
    decisionUpper.includes('NOT VERIFIED') ||
    decisionUpper.includes('BLOCK') ||
    decisionUpper.includes('CRITICAL') ||
    decisionUpper.includes('WARNING')
  );

  const workbenchReady = Boolean(data.dashboardReady || data.workbenchReady);
  setReleaseStage('build', workbenchReady ? 'complete' : 'active', workbenchReady ? v5t('complete') : v5t('inProgress'));

  if (!hasQaRunThisSession && !runningQa) {
    setReleaseStage('tests', 'idle', v5t('pending'));
    setReleaseStage('analysis', 'idle', v5t('pending'));
    setReleaseStage('report', 'idle', v5t('pending'));
    setReleaseStage('decision', 'idle', v5t('pending'));
  } else if (runningQa) {
    setReleaseStage('tests', 'active', v5t('inProgress'));
    setReleaseStage('analysis', 'pending', v5t('pending'));
    setReleaseStage('report', 'pending', v5t('pending'));
    setReleaseStage('decision', 'pending', v5t('pending'));
  } else if (finishedQa) {
    setReleaseStage('tests', 'complete', v5t('complete'));
    setReleaseStage('analysis', 'complete', v5t('complete'));
    setReleaseStage('report', reportFresh ? 'complete' : 'warning', reportFresh ? v5t('complete') : v5t('notVerified'));

    if (decisionReady) setReleaseStage('decision', 'complete', v5t('complete'));
    else if (decisionWarning) setReleaseStage('decision', 'warning', decision || v5t('notVerified'));
    else setReleaseStage('decision', 'warning', v5t('notVerified'));
  }

  const badge = document.getElementById('v53-release-badge');
  if (badge) {
    if (runningQa) {
      badge.dataset.state = 'active';
      badge.textContent = 'CALCULATING…';
    } else if (!hasQaRunThisSession) {
      badge.dataset.state = 'idle';
      badge.textContent = 'READY';
    } else if (decisionReady) {
      badge.dataset.state = 'complete';
      badge.textContent = decision || 'READY';
    } else {
      badge.dataset.state = 'warning';
      badge.textContent = decision || v5t('notVerified').toUpperCase();
    }
  }

  const releaseMessage = document.getElementById('v53-release-message');
  if (releaseMessage) {
    if (!hasQaRunThisSession && !runningQa) {
      releaseMessage.textContent = document.documentElement.lang === 'sv'
        ? 'Workbench är redo. Ingen QA-körning har startats i den här sessionen.'
        : 'Workbench is ready. No QA run has started in this session.';
    } else {
      releaseMessage.textContent = data.message || 'Workbench ready.';
    }
  }

  const releaseTarget = document.getElementById('v53-release-target');
  if (releaseTarget) {
    releaseTarget.textContent = targetDisplay(
      data.currentTarget || data.lastQaTarget || data.lastTarget || selectedTarget
    );
  }
}
async function refreshStatus() {
  try { updateFromState(await fetchState()); } catch { /* launcher may be starting */ }
}

async function postAction(action) {
  const usesTarget = action === 'run-full-qa' || action === 'fast-chromium';
  const targetQuery = usesTarget ? `?target=${encodeURIComponent(selectedTarget)}` : '';
  const response = await fetch(`${apiRoot}/action/${action}${targetQuery}`, { method: 'POST' });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || tr('actionFailed', 'Action could not start.'));
  await refreshStatus();
  return payload;
}

async function openPlaywrightReport(event) {
  event?.preventDefault();
  const popup = window.open('about:blank', 'qa-sentinel-playwright-report');
  if (!popup) {
    alert(tr('popupBlocked', 'The browser blocked the Playwright report window. Allow pop-ups for the local Sentinel app.'));
    return;
  }

  popup.document.write('<title>QA Sentinel Tyra</title><p style="font-family:Segoe UI,sans-serif;padding:24px">Starting Playwright report…</p>');

  try {
    await postAction('open-playwright-report');
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const data = await fetchState();
      updateFromState(data);
      if (data.reportReady) {
        popup.location.replace(reportUrl);
        return;
      }
    }
    throw new Error(tr('reportTimeout', 'Timed out while starting Playwright report.'));
  } catch (error) {
    popup.close();
    alert(error.message);
  }
}

for (const [id, action] of actionButtons) {
  document.getElementById(id)?.addEventListener('click', async () => {
    try { await postAction(action); } catch (error) { alert(error.message); }
  });
}
reportButton?.addEventListener('click', openPlaywrightReport);
legacyReportLink?.addEventListener('click', openPlaywrightReport);

for (const button of document.querySelectorAll('[data-v5-action]')) {
  button.addEventListener('click', async () => {
    const action = button.dataset.v5Action;
    if (action === 'playwright') {
      await openPlaywrightReport();
      return;
    }
    try { await postAction(action); } catch (error) { alert(error.message); }
  });
}

document.addEventListener('click', event => {
  const link = event.target.closest?.('a[href="http://127.0.0.1:9323"], a[href="http://127.0.0.1:9323/"]');
  if (link && link !== legacyReportLink) openPlaywrightReport(event);
});

/* ---------------------------------------------------------
   Mirror live QA numbers into the compact home screen.
   The canonical data still lives in the existing evidence panels.
   --------------------------------------------------------- */
function numberFrom(id) {
  const raw = document.getElementById(id)?.textContent?.replace(/[^0-9.-]/g, '') || '';
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function updateDashboardMetrics() {
  const nation = {
    total: numberFrom('nation-site-total'),
    passed: numberFrom('nation-site-passed'),
    failed: numberFrom('nation-site-failed'),
    warnings: numberFrom('nation-site-warnings'),
  };
  const skills = {
    total: numberFrom('ai-skills-site-total'),
    passed: numberFrom('ai-skills-site-passed'),
    failed: numberFrom('ai-skills-site-failed'),
    warnings: numberFrom('ai-skills-site-warnings'),
  };

  let totals;
  if (selectedTarget === 'nation') totals = nation;
  else if (selectedTarget === 'skills') totals = skills;
  else {
    const add = (a, b) => a !== null && b !== null ? a + b : null;
    totals = {
      total: add(nation.total, skills.total),
      passed: add(nation.passed, skills.passed),
      failed: add(nation.failed, skills.failed),
      warnings: add(nation.warnings, skills.warnings),
    };

    // Fall back to canonical combined summary when site-level data is unavailable.
    if (totals.passed === null) totals.passed = numberFrom('passed-value');
    if (totals.failed === null) totals.failed = numberFrom('failed-value');
    if (totals.warnings === null) totals.warnings = numberFrom('warnings-value');
    if (totals.total === null && totals.passed !== null && totals.failed !== null) totals.total = totals.passed + totals.failed;
  }

  const set = (id, value) => {
    const node = document.getElementById(id);
    if (node && value !== null && value !== undefined) node.textContent = String(value);
  };

  set('v5-total-tests', totals.total);
  set('v5-passed', totals.passed);
  set('v5-failed', totals.failed);
  set('v5-warnings', totals.warnings);

  const totalCaption = document.querySelector('.v5-metric-total small');
  if (totalCaption) totalCaption.textContent = targetDisplay();

  if (totals.total && totals.total > 0) {
    set('v5-pass-rate', totals.passed !== null ? `${((totals.passed / totals.total) * 100).toFixed(1)}%` : '--%');
    set('v5-fail-rate', totals.failed !== null ? `${((totals.failed / totals.total) * 100).toFixed(1)}%` : '--%');
    set('v5-warning-rate', totals.warnings !== null ? `${((totals.warnings / totals.total) * 100).toFixed(1)}%` : '--%');
  }
}

const metricsObserver = new MutationObserver(updateDashboardMetrics);
for (const id of ['nation-site-total', 'nation-site-passed', 'nation-site-failed', 'nation-site-warnings', 'ai-skills-site-total', 'ai-skills-site-passed', 'ai-skills-site-failed', 'ai-skills-site-warnings', 'passed-value', 'failed-value', 'warnings-value']) {
  const node = document.getElementById(id);
  if (node) metricsObserver.observe(node, { childList: true, characterData: true, subtree: true });
}
updateDashboardMetrics();

function normalizeHistory(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['runs', 'history', 'items', 'entries', 'snapshots', 'results']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function pick(obj, paths) {
  for (const path of paths) {
    let value = obj;
    for (const part of path.split('.')) value = value?.[part];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function deepPick(obj, keys, maxDepth = 6) {
  const wanted = new Set(keys.map(key => key.toLowerCase()));
  const seen = new Set();
  function walk(value, depth) {
    if (!value || typeof value !== 'object' || depth > maxDepth || seen.has(value)) return null;
    seen.add(value);
    if (!Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) {
        if (wanted.has(key.toLowerCase()) && child !== undefined && child !== null && child !== '') return child;
      }
    }
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      const found = walk(child, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  return walk(obj, 0);
}

function historyDate(entry) {
  const direct = pick(entry, [
    'generatedAt', 'timestamp', 'createdAt', 'completedAt', 'startedAt', 'date', 'runAt',
    'run.generatedAt', 'run.startedAt', 'run.completedAt',
    'metadata.generatedAt', 'metadata.timestamp', 'runMetadata.generatedAt', 'runMetadata.startedAt',
    'meta.generatedAt', 'meta.timestamp', 'summary.generatedAt'
  ]);
  const candidate = direct ?? deepPick(entry, ['generatedAt', 'timestamp', 'completedAt', 'startedAt', 'createdAt', 'runAt', 'date']);
  if (candidate !== null && candidate !== undefined) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 1_000_000_000) {
      const ms = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const source = JSON.stringify(entry);
  const iso = source.match(/20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/i)?.[0];
  return iso || null;
}

function normalizeMode(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'QA';
  const lower = raw.toLowerCase();
  if (lower.includes('fast') || lower.includes('chromium')) return 'Fast Chromium';
  if (lower.includes('security') || lower.includes('pentest')) return 'Security Mode';
  if (lower.includes('full') || lower.includes('unattended')) return 'Full QA';
  if (lower === 'qa' || lower.includes('quality')) return 'QA';
  return raw;
}

function normalizeHistoryTarget(value) {
  if (Array.isArray(value)) value = value.join(' ');
  if (value && typeof value === 'object') value = JSON.stringify(value);
  const raw = String(value ?? '').toLowerCase();
  if (!raw) return null;
  const hasNation = raw.includes('nation');
  const hasSkills = raw.includes('skill');
  if (hasNation && hasSkills) return targetDisplay('both');
  if (hasSkills) return targetDisplay('skills');
  if (hasNation) return targetDisplay('nation');
  if (raw.includes('both') || raw.includes('all')) return targetDisplay('both');
  return null;
}

async function loadHistory() {
  const host = document.getElementById('v5-recent-runs');
  if (!host) return;

  try {
    const response = await fetch(`${historyUrl}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('history unavailable');
    const entries = normalizeHistory(await response.json()).slice(-4).reverse();
    if (!entries.length) return;

    host.innerHTML = '';
    for (const entry of entries) {
      const date = historyDate(entry);
      const modeValue = pick(entry, [
        'mode', 'runType', 'trigger', 'action', 'qaMode', 'executionMode', 'testMode',
        'run.mode', 'run.type', 'metadata.mode', 'runMetadata.mode'
      ]) ?? deepPick(entry, ['runType', 'qaMode', 'executionMode', 'testMode', 'trigger', 'action']);
      const mode = normalizeMode(modeValue);

      const targetValue = pick(entry, [
        'target', 'site', 'project', 'scope', 'sites', 'projects',
        'run.target', 'run.site', 'metadata.target', 'runMetadata.target'
      ]) ?? deepPick(entry, ['target', 'site', 'sites', 'project', 'projects', 'scope']);
      const runTarget = normalizeHistoryTarget(targetValue);

      const passed = pick(entry, ['passed', 'summary.passed', 'totals.passed', 'stats.passed', 'results.passed']) ?? deepPick(entry, ['passed']);
      const failed = pick(entry, ['failed', 'summary.failed', 'totals.failed', 'stats.failed', 'results.failed']) ?? deepPick(entry, ['failed']);
      const warnings = pick(entry, ['warnings', 'summary.warnings', 'totals.warnings', 'stats.warnings', 'results.warnings']) ?? deepPick(entry, ['warnings']);

      const row = make('div', 'v5-run-row');
      const targetMarkup = runTarget ? ` <em class="v53-run-target">${String(runTarget)}</em>` : '';
      row.innerHTML = `
        <span class="v5-status-dot ${Number(failed || 0) > 0 ? 'has-findings' : 'is-online'}"></span>
        <time>${date ? formatWorkbenchDate(date) : '—'}</time>
        <strong>${String(mode)}${targetMarkup}</strong>
        <span class="v5-run-result">${passed ?? '—'} passed · ${failed ?? '—'} failed · ${warnings ?? '—'} warnings</span>
      `;
      host.appendChild(row);
    }
  } catch {
    host.innerHTML = `<p data-v5-i18n="noHistory">${v5t('noHistory')}</p>`;
  }
}

/* ---------------------------------------------------------
   V5 translation layer for new UI only.
   Existing V4 language module still translates the original panels.
   --------------------------------------------------------- */
function applyV5Translations() {
  for (const node of document.querySelectorAll('[data-v5-i18n]')) {
    node.textContent = v5t(node.dataset.v5I18n);
  }

  const optionKeys = {
    azure: 'themeAzure', emerald: 'themeEmerald', violet: 'themeViolet', amber: 'themeAmber', rose: 'themeRose', ice: 'themeIce',
  };
  for (const option of themeSelect?.options || []) {
    if (optionKeys[option.value]) option.textContent = v5t(optionKeys[option.value]);
  }

  applyTarget(selectedTarget, false);
  refreshStatus();
}

document.addEventListener('qa-sentinel-language-change', () => {
  applyV5Translations();
  loadHistory();
});

applyV5Translations();
refreshStatus();
loadHistory();
setInterval(refreshStatus, 2000);
setInterval(loadHistory, 15000);
