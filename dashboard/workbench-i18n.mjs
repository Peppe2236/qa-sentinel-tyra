const STORAGE_KEY = 'qa-sentinel-language';
const DEFAULT_LOCALE = 'en';
const DEFAULT_MIGRATION_KEY = 'qa-sentinel-language-default-v51';

const locales = {
  sv: { name: 'Svenska', dir: 'ltr', intl: 'sv-SE' },
  en: { name: 'English', dir: 'ltr', intl: 'en-US' },
  'zh-CN': { name: '中文（简体）', dir: 'ltr', intl: 'zh-CN' },
  hi: { name: 'हिन्दी', dir: 'ltr', intl: 'hi-IN' },
  es: { name: 'Español', dir: 'ltr', intl: 'es-ES' },
  ar: { name: 'العربية', dir: 'rtl', intl: 'ar' },
  fr: { name: 'Français', dir: 'ltr', intl: 'fr-FR' },
};

const messages = {
  en: {
    language: 'Language', languageHelp: 'Interface language', chooseLanguage: 'Choose language',
    appName: 'QA Sentinel Tyra Workbench',
    appAccessibility: 'Accessibility controls stay available globally for colour, contrast, text and visual preferences.',
    accessibilityAria: 'Accessibility display controls', workbenchAria: 'QA Sentinel Tyra Workbench navigation', sectionsAria: 'Workbench sections',
    navDashboard: 'Dashboard', navFullQa: 'Run Full QA', navFast: 'Fast Chromium', navSecurity: 'Security Modes', navReports: 'Reports', navPlaywright: 'Playwright', navSettings: 'Settings',
    state: 'State', status: 'Status', updated: 'Updated',
    fullEyebrow: 'FULL QUALITY RUN', fullTitle: 'Run Full QA', fullDesc: 'Runs discovery, the complete configured browser/device matrix, analyzers and the human-review evidence pack while Workbench stays open.', fullButton: '▶ Run Full QA', fullSideTitle: 'What this run covers', fullSideDesc: 'Deep Discovery, functional QA, accessibility, UX/UI, compatibility, API/backend evidence, diagnostics and Unified Decisioning.',
    fastEyebrow: 'FAST FEEDBACK', fastTitle: 'Fast Chromium', fastDesc: 'Runs the fast Chromium path across the configured Nation and AI Skills projects for quick feedback without the full compatibility matrix.', fastButton: 'ϟ Start Fast Chromium', fastSideTitle: 'Use when', fastSideDesc: 'You want a quick development check. Full cross-browser release evidence still requires the full QA path.',
    securityEyebrow: 'AUTHORIZED SECURITY', securityTitle: 'Security Modes', securityDesc: 'Security execution remains explicitly separated from normal QA and keeps its existing authorization guardrails.', prodTitle: 'Production Safe', prodDesc: 'Authorized, non-destructive security checks for production-safe assessment.', prodButton: 'Run Production Safe', stagingTitle: 'Staging Active', stagingDesc: 'Active checks only for allowlisted non-production staging targets with required opt-ins.', stagingButton: 'Run Staging Active', manualTitle: 'Manual Validation', manualDesc: 'OWASP-oriented checklist/report workflow. No network requests are made in this mode.', manualButton: 'Open Manual Validation',
    reportsEyebrow: 'EVIDENCE & REPORTING', reportsTitle: 'Reports', reportsDesc: 'Open the generated Sentinel evidence without leaving the Workbench workflow.', executiveHtml: 'Executive HTML', executivePdf: 'Executive PDF', humanReview: 'Human Review', markdownReport: 'Markdown Report', traceability: 'Traceability', pentestReport: 'Pentest Report',
    playwrightEyebrow: 'NATIVE TEST EVIDENCE', playwrightTitle: 'Playwright Report', playwrightDesc: 'The Playwright report server stays off until you explicitly request it here.', playwrightButton: 'Open Playwright Report', playwrightSideTitle: 'On demand only', playwrightSideDesc: 'No Playwright tab is opened automatically when QA Sentinel Tyra starts.',
    settingsEyebrow: 'WORKBENCH CONFIGURATION', settingsTitle: 'Settings', settingsDesc: 'Open the existing Sentinel settings page for sites, scan limits, catalogs and policy configuration.', settingsButton: 'Open Settings', settingsSideTitle: 'Accessibility is global', settingsSideDesc: 'The accessibility controls remain at the top of every Workbench view so display preferences are always reachable.',
    ready: 'READY', running: 'RUNNING', warning: 'WARNING', error: 'ERROR', starting: 'STARTING', idle: 'Idle',
    reportOpen: 'OPEN', reportReady: 'READY TO OPEN', reportRunFirst: 'RUN QA FIRST',
    msgStarting: 'Preparing the launcher.', msgDashboardStarting: 'Starting dashboard service.', msgDashboardReady: 'Workbench is ready.', msgIdle: 'Workbench is ready.', msgFullRunning: 'Full QA is running in the background.', msgFullDone: 'Full QA finished. Review the refreshed dashboard and reports.', msgFullFindings: 'Full QA completed with findings. Review the generated evidence.', msgFastRunning: 'Fast Chromium is running in the background.', msgFastDone: 'Fast Chromium finished. Latest data has been refreshed.', msgFastFindings: 'Fast Chromium finished with findings.', msgProdRunning: 'Production Safe security mode is running.', msgProdDone: 'Production Safe security evidence has been refreshed.', msgStagingRunning: 'Staging Active is running with its authorization guardrails.', msgStagingDone: 'Staging Active security evidence has been refreshed.', msgManualRunning: 'Manual Validation checklist generation is running.', msgManualDone: 'Manual Validation guidance has been refreshed.', msgReportStarting: 'Starting Playwright report on demand.', msgReportReady: 'Playwright report is ready.',
    popupBlocked: 'The browser blocked the Playwright report window. Allow pop-ups for the local Sentinel app.', actionFailed: 'Action could not start.', reportTimeout: 'Timed out while starting Playwright report.', workbenchUnavailable: 'Workbench control API is not available.',
    accessibility: 'Accessibility', highContrast: 'High contrast', largerText: 'Larger text', reducedMotion: 'Reduced motion', reset: 'Reset', colorVision: 'Colour vision', normalVision: 'Default colours', protanopia: 'Protanopia', deuteranopia: 'Deuteranopia', tritanopia: 'Tritanopia', achromatopsia: 'Achromatopsia',
    qualityHealth: 'Quality Health', passed: 'Passed', failed: 'Failed', warnings: 'Warnings', productBugs: 'Product bugs', contentBugs: 'Content bugs', automationIssues: 'Automation issues', averageDuration: 'Average duration', releaseReadiness: 'Release Readiness', confidence: 'Confidence', blockingIssues: 'Blocking issues', history: 'History', qualityTrend: 'Quality trend', automatedSummary: 'Automated Summary', qaAssessment: 'QA assessment', refresh: 'Refresh', live: 'LIVE',
  },
  sv: {
    language: 'Språk', languageHelp: 'Gränssnittsspråk', chooseLanguage: 'Välj språk', appName: 'QA Sentinel Tyra Workbench', appAccessibility: 'Tillgänglighetskontrollerna är alltid åtkomliga för färg, kontrast, text och visuella inställningar.', accessibilityAria: 'Tillgänglighetskontroller för visning', workbenchAria: 'Navigering för QA Sentinel Tyra Workbench', sectionsAria: 'Workbench-sektioner',
    navDashboard: 'Översikt', navFullQa: 'Kör Full QA', navFast: 'Snabb Chromium', navSecurity: 'Säkerhetslägen', navReports: 'Rapporter', navPlaywright: 'Playwright', navSettings: 'Inställningar', state: 'Läge', status: 'Status', updated: 'Uppdaterad',
    fullEyebrow: 'FULL KVALITETSKÖRNING', fullTitle: 'Kör Full QA', fullDesc: 'Kör Discovery, hela den konfigurerade webbläsar-/enhetsmatrisen, analysmotorerna och granskningspaketet medan Workbench förblir öppet.', fullButton: '▶ Kör Full QA', fullSideTitle: 'Det här ingår', fullSideDesc: 'Deep Discovery, funktionell QA, tillgänglighet, UX/UI, kompatibilitet, API/backend-evidens, diagnostik och Unified Decisioning.',
    fastEyebrow: 'SNABB ÅTERKOPPLING', fastTitle: 'Snabb Chromium', fastDesc: 'Kör den snabba Chromium-vägen för Nation och AI Skills för snabb återkoppling utan hela kompatibilitetsmatrisen.', fastButton: 'ϟ Starta Snabb Chromium', fastSideTitle: 'Använd när', fastSideDesc: 'Du vill göra en snabb utvecklingskontroll. Full webbläsaröverskridande release-evidens kräver fortfarande Full QA.',
    securityEyebrow: 'AUKTORISERAD SÄKERHET', securityTitle: 'Säkerhetslägen', securityDesc: 'Säkerhetskörningar hålls uttryckligen separerade från normal QA och behåller sina auktoriseringsskydd.', prodTitle: 'Production Safe', prodDesc: 'Auktoriserade, icke-destruktiva säkerhetskontroller för produktionssäker bedömning.', prodButton: 'Kör Production Safe', stagingTitle: 'Staging Active', stagingDesc: 'Aktiva kontroller endast mot tillåtna icke-produktionsmiljöer med obligatoriska opt-ins.', stagingButton: 'Kör Staging Active', manualTitle: 'Manuell validering', manualDesc: 'OWASP-inriktat checkliste-/rapportflöde. Inga nätverksanrop görs i detta läge.', manualButton: 'Öppna manuell validering',
    reportsEyebrow: 'EVIDENS & RAPPORTERING', reportsTitle: 'Rapporter', reportsDesc: 'Öppna genererad Sentinel-evidens utan att lämna Workbench-flödet.', executiveHtml: 'Executive HTML', executivePdf: 'Executive PDF', humanReview: 'Mänsklig granskning', markdownReport: 'Markdown-rapport', traceability: 'Spårbarhet', pentestReport: 'Pentest-rapport',
    playwrightEyebrow: 'NATIV TESTEVIDENS', playwrightTitle: 'Playwright-rapport', playwrightDesc: 'Playwright-rapportservern förblir avstängd tills du uttryckligen begär den här.', playwrightButton: 'Öppna Playwright-rapport', playwrightSideTitle: 'Endast vid behov', playwrightSideDesc: 'Ingen Playwright-flik öppnas automatiskt när QA Sentinel Tyra startar.',
    settingsEyebrow: 'WORKBENCH-KONFIGURATION', settingsTitle: 'Inställningar', settingsDesc: 'Öppna Sentinels inställningssida för sajter, skanningsgränser, kataloger och policy.', settingsButton: 'Öppna inställningar', settingsSideTitle: 'Tillgänglighet är global', settingsSideDesc: 'Tillgänglighetskontrollerna ligger högst upp i varje Workbench-vy så de alltid går att nå.',
    ready: 'REDO', running: 'KÖR', warning: 'VARNING', error: 'FEL', starting: 'STARTAR', idle: 'Redo', reportOpen: 'ÖPPEN', reportReady: 'REDO ATT ÖPPNA', reportRunFirst: 'KÖR QA FÖRST', msgStarting: 'Förbereder startprogrammet.', msgDashboardStarting: 'Startar dashboard-tjänsten.', msgDashboardReady: 'Workbench är redo.', msgIdle: 'Workbench är redo.', msgFullRunning: 'Full QA körs i bakgrunden.', msgFullDone: 'Full QA är klar. Granska den uppdaterade dashboarden och rapporterna.', msgFullFindings: 'Full QA slutfördes med fynd. Granska den genererade evidensen.', msgFastRunning: 'Snabb Chromium körs i bakgrunden.', msgFastDone: 'Snabb Chromium är klar. Senaste data har uppdaterats.', msgFastFindings: 'Snabb Chromium avslutades med fynd.', msgProdRunning: 'Production Safe-säkerhetsläget körs.', msgProdDone: 'Production Safe-evidensen har uppdaterats.', msgStagingRunning: 'Staging Active körs med sina auktoriseringsskydd.', msgStagingDone: 'Staging Active-evidensen har uppdaterats.', msgManualRunning: 'Genererar checklistan för manuell validering.', msgManualDone: 'Vägledningen för manuell validering har uppdaterats.', msgReportStarting: 'Startar Playwright-rapporten vid behov.', msgReportReady: 'Playwright-rapporten är redo.', popupBlocked: 'Webbläsaren blockerade Playwright-rapportfönstret. Tillåt popup-fönster för den lokala Sentinel-appen.', actionFailed: 'Åtgärden kunde inte startas.', reportTimeout: 'Tidsgränsen nåddes när Playwright-rapporten startades.', workbenchUnavailable: 'Workbench kontroll-API är inte tillgängligt.',
    accessibility: 'Tillgänglighet', highContrast: 'Hög kontrast', largerText: 'Större text', reducedMotion: 'Minskad rörelse', reset: 'Återställ', colorVision: 'Färgseende', normalVision: 'Standardfärger', protanopia: 'Protanopi', deuteranopia: 'Deuteranopi', tritanopia: 'Tritanopi', achromatopsia: 'Akromatopsi', qualityHealth: 'Kvalitetshälsa', passed: 'Godkända', failed: 'Misslyckade', warnings: 'Varningar', productBugs: 'Produktfel', contentBugs: 'Innehållsfel', automationIssues: 'Automationsproblem', averageDuration: 'Genomsnittlig tid', releaseReadiness: 'Releaseberedskap', confidence: 'Konfidens', blockingIssues: 'Blockerande problem', history: 'Historik', qualityTrend: 'Kvalitetstrend', automatedSummary: 'Automatisk sammanfattning', qaAssessment: 'QA-bedömning', refresh: 'Uppdatera', live: 'LIVE',
  },
  es: {
    language: 'Idioma', languageHelp: 'Idioma de la interfaz', chooseLanguage: 'Elegir idioma', appName: 'QA Sentinel Tyra Workbench', appAccessibility: 'Los controles de accesibilidad permanecen disponibles globalmente para color, contraste, texto y preferencias visuales.', accessibilityAria: 'Controles de accesibilidad de pantalla', workbenchAria: 'Navegación de QA Sentinel Tyra Workbench', sectionsAria: 'Secciones del Workbench', navDashboard: 'Panel', navFullQa: 'Ejecutar QA completo', navFast: 'Chromium rápido', navSecurity: 'Modos de seguridad', navReports: 'Informes', navPlaywright: 'Playwright', navSettings: 'Ajustes', state: 'Estado', status: 'Estado', updated: 'Actualizado',
    fullEyebrow: 'EJECUCIÓN DE CALIDAD COMPLETA', fullTitle: 'Ejecutar QA completo', fullDesc: 'Ejecuta Discovery, la matriz completa de navegadores/dispositivos, los analizadores y el paquete de revisión humana mientras Workbench permanece abierto.', fullButton: '▶ Ejecutar QA completo', fullSideTitle: 'Qué cubre esta ejecución', fullSideDesc: 'Deep Discovery, QA funcional, accesibilidad, UX/UI, compatibilidad, evidencia API/backend, diagnósticos y Unified Decisioning.', fastEyebrow: 'RESPUESTA RÁPIDA', fastTitle: 'Chromium rápido', fastDesc: 'Ejecuta la ruta rápida de Chromium en Nation y AI Skills para obtener resultados rápidos sin la matriz completa de compatibilidad.', fastButton: 'ϟ Iniciar Chromium rápido', fastSideTitle: 'Úsalo cuando', fastSideDesc: 'Necesites una comprobación rápida de desarrollo. La evidencia completa entre navegadores sigue requiriendo QA completo.',
    securityEyebrow: 'SEGURIDAD AUTORIZADA', securityTitle: 'Modos de seguridad', securityDesc: 'La ejecución de seguridad se mantiene separada del QA normal y conserva sus controles de autorización.', prodTitle: 'Producción segura', prodDesc: 'Comprobaciones autorizadas y no destructivas para una evaluación segura de producción.', prodButton: 'Ejecutar Producción segura', stagingTitle: 'Staging activo', stagingDesc: 'Comprobaciones activas solo en destinos de staging no productivos permitidos y con las autorizaciones requeridas.', stagingButton: 'Ejecutar Staging activo', manualTitle: 'Validación manual', manualDesc: 'Flujo de lista de comprobación/informe orientado a OWASP. No realiza solicitudes de red.', manualButton: 'Abrir validación manual', reportsEyebrow: 'EVIDENCIA E INFORMES', reportsTitle: 'Informes', reportsDesc: 'Abre la evidencia generada por Sentinel sin salir del flujo de Workbench.', executiveHtml: 'HTML ejecutivo', executivePdf: 'PDF ejecutivo', humanReview: 'Revisión humana', markdownReport: 'Informe Markdown', traceability: 'Trazabilidad', pentestReport: 'Informe de pentest', playwrightEyebrow: 'EVIDENCIA NATIVA DE PRUEBAS', playwrightTitle: 'Informe de Playwright', playwrightDesc: 'El servidor de informes de Playwright permanece apagado hasta que lo solicites aquí.', playwrightButton: 'Abrir informe de Playwright', playwrightSideTitle: 'Solo bajo demanda', playwrightSideDesc: 'No se abre ninguna pestaña de Playwright automáticamente al iniciar QA Sentinel Tyra.', settingsEyebrow: 'CONFIGURACIÓN DE WORKBENCH', settingsTitle: 'Ajustes', settingsDesc: 'Abre la página de ajustes de Sentinel para sitios, límites de escaneo, catálogos y políticas.', settingsButton: 'Abrir ajustes', settingsSideTitle: 'La accesibilidad es global', settingsSideDesc: 'Los controles de accesibilidad permanecen arriba en todas las vistas de Workbench.', ready: 'LISTO', running: 'EJECUTANDO', warning: 'ADVERTENCIA', error: 'ERROR', starting: 'INICIANDO', idle: 'Listo', reportOpen: 'ABIERTO', reportReady: 'LISTO PARA ABRIR', reportRunFirst: 'EJECUTA QA PRIMERO', msgStarting: 'Preparando el iniciador.', msgDashboardStarting: 'Iniciando el servicio del panel.', msgDashboardReady: 'Workbench está listo.', msgIdle: 'Workbench está listo.', msgFullRunning: 'QA completo se ejecuta en segundo plano.', msgFullDone: 'QA completo terminó. Revisa el panel y los informes actualizados.', msgFullFindings: 'QA completo terminó con hallazgos. Revisa la evidencia generada.', msgFastRunning: 'Chromium rápido se ejecuta en segundo plano.', msgFastDone: 'Chromium rápido terminó. Los datos se actualizaron.', msgFastFindings: 'Chromium rápido terminó con hallazgos.', msgProdRunning: 'El modo Producción segura está en ejecución.', msgProdDone: 'La evidencia de Producción segura se actualizó.', msgStagingRunning: 'Staging activo se ejecuta con sus controles de autorización.', msgStagingDone: 'La evidencia de Staging activo se actualizó.', msgManualRunning: 'Generando la lista de validación manual.', msgManualDone: 'La guía de validación manual se actualizó.', msgReportStarting: 'Iniciando el informe de Playwright bajo demanda.', msgReportReady: 'El informe de Playwright está listo.', popupBlocked: 'El navegador bloqueó la ventana del informe de Playwright. Permite ventanas emergentes para la aplicación local de Sentinel.', actionFailed: 'La acción no pudo iniciarse.', reportTimeout: 'Se agotó el tiempo al iniciar el informe de Playwright.', workbenchUnavailable: 'La API de control de Workbench no está disponible.', accessibility: 'Accesibilidad', highContrast: 'Alto contraste', largerText: 'Texto más grande', reducedMotion: 'Movimiento reducido', reset: 'Restablecer', colorVision: 'Visión del color', normalVision: 'Colores predeterminados', protanopia: 'Protanopía', deuteranopia: 'Deuteranopía', tritanopia: 'Tritanopía', achromatopsia: 'Acromatopsia', qualityHealth: 'Salud de calidad', passed: 'Aprobadas', failed: 'Fallidas', warnings: 'Advertencias', productBugs: 'Errores de producto', contentBugs: 'Errores de contenido', automationIssues: 'Problemas de automatización', averageDuration: 'Duración media', releaseReadiness: 'Preparación de release', confidence: 'Confianza', blockingIssues: 'Problemas bloqueantes', history: 'Historial', qualityTrend: 'Tendencia de calidad', automatedSummary: 'Resumen automatizado', qaAssessment: 'Evaluación QA', refresh: 'Actualizar', live: 'EN VIVO',
  },
  fr: {
    language: 'Langue', languageHelp: "Langue de l’interface", chooseLanguage: 'Choisir la langue', appName: 'QA Sentinel Tyra Workbench', appAccessibility: "Les contrôles d’accessibilité restent disponibles partout pour la couleur, le contraste, le texte et les préférences visuelles.", accessibilityAria: "Contrôles d’accessibilité de l’affichage", workbenchAria: 'Navigation QA Sentinel Tyra Workbench', sectionsAria: 'Sections du Workbench', navDashboard: 'Tableau de bord', navFullQa: 'Lancer QA complet', navFast: 'Chromium rapide', navSecurity: 'Modes sécurité', navReports: 'Rapports', navPlaywright: 'Playwright', navSettings: 'Paramètres', state: 'État', status: 'Statut', updated: 'Mis à jour',
    fullEyebrow: 'EXÉCUTION QUALITÉ COMPLÈTE', fullTitle: 'Lancer QA complet', fullDesc: "Exécute Discovery, la matrice complète navigateurs/appareils, les analyseurs et le pack de revue humaine tout en gardant Workbench ouvert.", fullButton: '▶ Lancer QA complet', fullSideTitle: 'Couverture de cette exécution', fullSideDesc: 'Deep Discovery, QA fonctionnelle, accessibilité, UX/UI, compatibilité, preuves API/backend, diagnostics et Unified Decisioning.', fastEyebrow: 'RETOUR RAPIDE', fastTitle: 'Chromium rapide', fastDesc: 'Exécute le parcours Chromium rapide sur Nation et AI Skills sans la matrice complète de compatibilité.', fastButton: 'ϟ Démarrer Chromium rapide', fastSideTitle: 'À utiliser quand', fastSideDesc: "Vous voulez une vérification de développement rapide. Les preuves complètes multi-navigateurs nécessitent toujours QA complet.", securityEyebrow: 'SÉCURITÉ AUTORISÉE', securityTitle: 'Modes sécurité', securityDesc: "L’exécution sécurité reste séparée du QA normal et conserve ses garde-fous d’autorisation.", prodTitle: 'Production Safe', prodDesc: 'Contrôles de sécurité autorisés et non destructifs pour une évaluation sûre en production.', prodButton: 'Lancer Production Safe', stagingTitle: 'Staging Active', stagingDesc: 'Contrôles actifs uniquement sur des cibles de staging hors production autorisées avec opt-ins requis.', stagingButton: 'Lancer Staging Active', manualTitle: 'Validation manuelle', manualDesc: "Workflow de checklist/rapport orienté OWASP. Aucune requête réseau n’est effectuée dans ce mode.", manualButton: 'Ouvrir la validation manuelle', reportsEyebrow: 'PREUVES & RAPPORTS', reportsTitle: 'Rapports', reportsDesc: 'Ouvrez les preuves Sentinel générées sans quitter le workflow Workbench.', executiveHtml: 'HTML exécutif', executivePdf: 'PDF exécutif', humanReview: 'Revue humaine', markdownReport: 'Rapport Markdown', traceability: 'Traçabilité', pentestReport: 'Rapport pentest', playwrightEyebrow: 'PREUVES DE TEST NATIVES', playwrightTitle: 'Rapport Playwright', playwrightDesc: "Le serveur de rapport Playwright reste arrêté jusqu’à ce que vous le demandiez ici.", playwrightButton: 'Ouvrir le rapport Playwright', playwrightSideTitle: 'Uniquement à la demande', playwrightSideDesc: "Aucun onglet Playwright ne s’ouvre automatiquement au démarrage de QA Sentinel Tyra.", settingsEyebrow: 'CONFIGURATION WORKBENCH', settingsTitle: 'Paramètres', settingsDesc: 'Ouvrez la page de paramètres Sentinel pour les sites, limites de scan, catalogues et politiques.', settingsButton: 'Ouvrir les paramètres', settingsSideTitle: "L’accessibilité est globale", settingsSideDesc: "Les contrôles d’accessibilité restent en haut de chaque vue Workbench.", ready: 'PRÊT', running: 'EN COURS', warning: 'AVERTISSEMENT', error: 'ERREUR', starting: 'DÉMARRAGE', idle: 'Prêt', reportOpen: 'OUVERT', reportReady: 'PRÊT À OUVRIR', reportRunFirst: "LANCEZ D’ABORD QA", msgStarting: 'Préparation du lanceur.', msgDashboardStarting: 'Démarrage du service tableau de bord.', msgDashboardReady: 'Workbench est prêt.', msgIdle: 'Workbench est prêt.', msgFullRunning: 'QA complet s’exécute en arrière-plan.', msgFullDone: 'QA complet est terminé. Consultez le tableau de bord et les rapports actualisés.', msgFullFindings: 'QA complet est terminé avec des résultats à examiner.', msgFastRunning: 'Chromium rapide s’exécute en arrière-plan.', msgFastDone: 'Chromium rapide est terminé. Les dernières données ont été actualisées.', msgFastFindings: 'Chromium rapide est terminé avec des résultats à examiner.', msgProdRunning: 'Le mode Production Safe est en cours.', msgProdDone: 'Les preuves Production Safe ont été actualisées.', msgStagingRunning: 'Staging Active s’exécute avec ses garde-fous d’autorisation.', msgStagingDone: 'Les preuves Staging Active ont été actualisées.', msgManualRunning: 'Génération de la checklist de validation manuelle.', msgManualDone: 'Le guide de validation manuelle a été actualisé.', msgReportStarting: 'Démarrage du rapport Playwright à la demande.', msgReportReady: 'Le rapport Playwright est prêt.', popupBlocked: "Le navigateur a bloqué la fenêtre du rapport Playwright. Autorisez les pop-ups pour l’application Sentinel locale.", actionFailed: "L’action n’a pas pu démarrer.", reportTimeout: 'Délai dépassé lors du démarrage du rapport Playwright.', workbenchUnavailable: "L’API de contrôle Workbench n’est pas disponible.", accessibility: 'Accessibilité', highContrast: 'Contraste élevé', largerText: 'Texte agrandi', reducedMotion: 'Mouvements réduits', reset: 'Réinitialiser', colorVision: 'Vision des couleurs', normalVision: 'Couleurs par défaut', protanopia: 'Protanopie', deuteranopia: 'Deutéranopie', tritanopia: 'Tritanopie', achromatopsia: 'Achromatopsie', qualityHealth: 'Santé qualité', passed: 'Réussis', failed: 'Échoués', warnings: 'Avertissements', productBugs: 'Bugs produit', contentBugs: 'Bugs contenu', automationIssues: "Problèmes d’automatisation", averageDuration: 'Durée moyenne', releaseReadiness: 'Préparation release', confidence: 'Confiance', blockingIssues: 'Problèmes bloquants', history: 'Historique', qualityTrend: 'Tendance qualité', automatedSummary: 'Résumé automatisé', qaAssessment: 'Évaluation QA', refresh: 'Actualiser', live: 'EN DIRECT',
  },
  'zh-CN': {
    language: '语言', languageHelp: '界面语言', chooseLanguage: '选择语言', appName: 'QA Sentinel Tyra 工作台', appAccessibility: '无障碍控制始终可用，可调整颜色、对比度、文字和视觉偏好。', accessibilityAria: '无障碍显示控制', workbenchAria: 'QA Sentinel Tyra 工作台导航', sectionsAria: '工作台区域', navDashboard: '仪表板', navFullQa: '运行完整 QA', navFast: '快速 Chromium', navSecurity: '安全模式', navReports: '报告', navPlaywright: 'Playwright', navSettings: '设置', state: '状态', status: '状态信息', updated: '更新时间',
    fullEyebrow: '完整质量运行', fullTitle: '运行完整 QA', fullDesc: '在保持工作台打开的同时，运行 Discovery、完整浏览器/设备矩阵、分析器和人工审查证据包。', fullButton: '▶ 运行完整 QA', fullSideTitle: '本次运行覆盖', fullSideDesc: 'Deep Discovery、功能 QA、无障碍、UX/UI、兼容性、API/后端证据、诊断和 Unified Decisioning。', fastEyebrow: '快速反馈', fastTitle: '快速 Chromium', fastDesc: '在 Nation 和 AI Skills 项目中运行快速 Chromium 路径，无需完整兼容性矩阵即可快速获得反馈。', fastButton: 'ϟ 启动快速 Chromium', fastSideTitle: '适用场景', fastSideDesc: '用于快速开发检查。完整的跨浏览器发布证据仍需运行完整 QA。', securityEyebrow: '已授权安全测试', securityTitle: '安全模式', securityDesc: '安全执行与常规 QA 明确分离，并保留现有授权保护措施。', prodTitle: '生产安全模式', prodDesc: '用于生产安全评估的已授权、非破坏性安全检查。', prodButton: '运行生产安全模式', stagingTitle: '活跃预发布模式', stagingDesc: '仅对允许列表中的非生产预发布目标执行主动检查，并要求明确授权。', stagingButton: '运行活跃预发布模式', manualTitle: '人工验证', manualDesc: '面向 OWASP 的检查表/报告流程。此模式不会发起网络请求。', manualButton: '打开人工验证', reportsEyebrow: '证据与报告', reportsTitle: '报告', reportsDesc: '无需离开工作台流程即可打开 Sentinel 生成的证据。', executiveHtml: '执行摘要 HTML', executivePdf: '执行摘要 PDF', humanReview: '人工审查', markdownReport: 'Markdown 报告', traceability: '可追溯性', pentestReport: '渗透测试报告', playwrightEyebrow: '原生测试证据', playwrightTitle: 'Playwright 报告', playwrightDesc: 'Playwright 报告服务器保持关闭，直到您在此明确请求。', playwrightButton: '打开 Playwright 报告', playwrightSideTitle: '仅按需启动', playwrightSideDesc: 'QA Sentinel Tyra 启动时不会自动打开 Playwright 标签页。', settingsEyebrow: '工作台配置', settingsTitle: '设置', settingsDesc: '打开 Sentinel 设置页面以配置站点、扫描限制、目录和策略。', settingsButton: '打开设置', settingsSideTitle: '全局无障碍', settingsSideDesc: '无障碍控制始终位于每个工作台视图顶部，便于随时访问。', ready: '就绪', running: '运行中', warning: '警告', error: '错误', starting: '启动中', idle: '就绪', reportOpen: '已打开', reportReady: '可打开', reportRunFirst: '请先运行 QA', msgStarting: '正在准备启动器。', msgDashboardStarting: '正在启动仪表板服务。', msgDashboardReady: '工作台已就绪。', msgIdle: '工作台已就绪。', msgFullRunning: '完整 QA 正在后台运行。', msgFullDone: '完整 QA 已完成。请查看更新后的仪表板和报告。', msgFullFindings: '完整 QA 已完成并发现需要审查的结果。', msgFastRunning: '快速 Chromium 正在后台运行。', msgFastDone: '快速 Chromium 已完成，最新数据已刷新。', msgFastFindings: '快速 Chromium 已完成并发现需要审查的结果。', msgProdRunning: '生产安全模式正在运行。', msgProdDone: '生产安全证据已刷新。', msgStagingRunning: '活跃预发布模式正在按授权保护措施运行。', msgStagingDone: '活跃预发布安全证据已刷新。', msgManualRunning: '正在生成人工验证检查表。', msgManualDone: '人工验证指南已刷新。', msgReportStarting: '正在按需启动 Playwright 报告。', msgReportReady: 'Playwright 报告已就绪。', popupBlocked: '浏览器阻止了 Playwright 报告窗口。请允许本地 Sentinel 应用弹出窗口。', actionFailed: '操作无法启动。', reportTimeout: '启动 Playwright 报告超时。', workbenchUnavailable: '工作台控制 API 不可用。', accessibility: '无障碍', highContrast: '高对比度', largerText: '更大文字', reducedMotion: '减少动态效果', reset: '重置', colorVision: '色觉', normalVision: '默认颜色', protanopia: '红色盲', deuteranopia: '绿色盲', tritanopia: '蓝色盲', achromatopsia: '全色盲', qualityHealth: '质量健康度', passed: '通过', failed: '失败', warnings: '警告', productBugs: '产品缺陷', contentBugs: '内容缺陷', automationIssues: '自动化问题', averageDuration: '平均耗时', releaseReadiness: '发布准备度', confidence: '置信度', blockingIssues: '阻塞问题', history: '历史', qualityTrend: '质量趋势', automatedSummary: '自动摘要', qaAssessment: 'QA 评估', refresh: '刷新', live: '实时',
  },
  hi: {
    language: 'भाषा', languageHelp: 'इंटरफ़ेस भाषा', chooseLanguage: 'भाषा चुनें', appName: 'QA Sentinel Tyra वर्कबेंच', appAccessibility: 'रंग, कॉन्ट्रास्ट, टेक्स्ट और दृश्य प्राथमिकताओं के लिए एक्सेसिबिलिटी नियंत्रण हमेशा उपलब्ध रहते हैं।', accessibilityAria: 'एक्सेसिबिलिटी डिस्प्ले नियंत्रण', workbenchAria: 'QA Sentinel Tyra वर्कबेंच नेविगेशन', sectionsAria: 'वर्कबेंच अनुभाग', navDashboard: 'डैशबोर्ड', navFullQa: 'पूर्ण QA चलाएँ', navFast: 'तेज़ Chromium', navSecurity: 'सुरक्षा मोड', navReports: 'रिपोर्ट', navPlaywright: 'Playwright', navSettings: 'सेटिंग्स', state: 'स्थिति', status: 'स्टेटस', updated: 'अपडेट', fullEyebrow: 'पूर्ण गुणवत्ता रन', fullTitle: 'पूर्ण QA चलाएँ', fullDesc: 'वर्कबेंच खुला रखते हुए Discovery, पूरा ब्राउज़र/डिवाइस मैट्रिक्स, विश्लेषक और मानव-समीक्षा एविडेंस पैक चलाता है।', fullButton: '▶ पूर्ण QA चलाएँ', fullSideTitle: 'इस रन में क्या शामिल है', fullSideDesc: 'Deep Discovery, फ़ंक्शनल QA, एक्सेसिबिलिटी, UX/UI, कम्पैटिबिलिटी, API/backend एविडेंस, डायग्नॉस्टिक्स और Unified Decisioning।', fastEyebrow: 'तेज़ फीडबैक', fastTitle: 'तेज़ Chromium', fastDesc: 'पूर्ण कम्पैटिबिलिटी मैट्रिक्स के बिना त्वरित फीडबैक के लिए Nation और AI Skills पर तेज़ Chromium पथ चलाता है।', fastButton: 'ϟ तेज़ Chromium शुरू करें', fastSideTitle: 'कब उपयोग करें', fastSideDesc: 'जब तेज़ डेवलपमेंट जाँच चाहिए। पूर्ण क्रॉस-ब्राउज़र रिलीज़ एविडेंस के लिए अभी भी पूर्ण QA आवश्यक है।', securityEyebrow: 'अधिकृत सुरक्षा', securityTitle: 'सुरक्षा मोड', securityDesc: 'सुरक्षा निष्पादन सामान्य QA से अलग रहता है और मौजूदा प्राधिकरण सुरक्षा सीमाएँ बनाए रखता है।', prodTitle: 'Production Safe', prodDesc: 'प्रोडक्शन-सुरक्षित आकलन के लिए अधिकृत, गैर-विनाशकारी सुरक्षा जाँच।', prodButton: 'Production Safe चलाएँ', stagingTitle: 'Staging Active', stagingDesc: 'केवल अनुमत non-production staging लक्ष्यों पर आवश्यक opt-in के साथ सक्रिय जाँच।', stagingButton: 'Staging Active चलाएँ', manualTitle: 'मैन्युअल वैलिडेशन', manualDesc: 'OWASP-उन्मुख चेकलिस्ट/रिपोर्ट वर्कफ़्लो। इस मोड में कोई नेटवर्क अनुरोध नहीं होता।', manualButton: 'मैन्युअल वैलिडेशन खोलें', reportsEyebrow: 'एविडेंस और रिपोर्टिंग', reportsTitle: 'रिपोर्ट', reportsDesc: 'वर्कबेंच छोड़े बिना जनरेट की गई Sentinel एविडेंस खोलें।', executiveHtml: 'Executive HTML', executivePdf: 'Executive PDF', humanReview: 'मानव समीक्षा', markdownReport: 'Markdown रिपोर्ट', traceability: 'ट्रेसबिलिटी', pentestReport: 'Pentest रिपोर्ट', playwrightEyebrow: 'मूल टेस्ट एविडेंस', playwrightTitle: 'Playwright रिपोर्ट', playwrightDesc: 'Playwright रिपोर्ट सर्वर तब तक बंद रहता है जब तक आप इसे यहाँ स्पष्ट रूप से नहीं खोलते।', playwrightButton: 'Playwright रिपोर्ट खोलें', playwrightSideTitle: 'केवल आवश्यकता पर', playwrightSideDesc: 'QA Sentinel Tyra शुरू होने पर कोई Playwright टैब अपने-आप नहीं खुलता।', settingsEyebrow: 'वर्कबेंच कॉन्फ़िगरेशन', settingsTitle: 'सेटिंग्स', settingsDesc: 'साइट, स्कैन सीमा, कैटलॉग और नीति के लिए Sentinel सेटिंग्स पेज खोलें।', settingsButton: 'सेटिंग्स खोलें', settingsSideTitle: 'एक्सेसिबिलिटी वैश्विक है', settingsSideDesc: 'एक्सेसिबिलिटी नियंत्रण हर वर्कबेंच दृश्य के शीर्ष पर उपलब्ध रहते हैं।', ready: 'तैयार', running: 'चल रहा है', warning: 'चेतावनी', error: 'त्रुटि', starting: 'शुरू हो रहा है', idle: 'तैयार', reportOpen: 'खुला', reportReady: 'खोलने के लिए तैयार', reportRunFirst: 'पहले QA चलाएँ', msgStarting: 'लॉन्चर तैयार हो रहा है।', msgDashboardStarting: 'डैशबोर्ड सेवा शुरू हो रही है।', msgDashboardReady: 'वर्कबेंच तैयार है।', msgIdle: 'वर्कबेंच तैयार है।', msgFullRunning: 'पूर्ण QA बैकग्राउंड में चल रहा है।', msgFullDone: 'पूर्ण QA पूरा हुआ। अपडेटेड डैशबोर्ड और रिपोर्ट देखें।', msgFullFindings: 'पूर्ण QA निष्कर्षों के साथ पूरा हुआ। जनरेट की गई एविडेंस देखें।', msgFastRunning: 'तेज़ Chromium बैकग्राउंड में चल रहा है।', msgFastDone: 'तेज़ Chromium पूरा हुआ। नवीनतम डेटा अपडेट हो गया है।', msgFastFindings: 'तेज़ Chromium निष्कर्षों के साथ पूरा हुआ।', msgProdRunning: 'Production Safe सुरक्षा मोड चल रहा है।', msgProdDone: 'Production Safe एविडेंस अपडेट हो गई है।', msgStagingRunning: 'Staging Active प्राधिकरण सुरक्षा के साथ चल रहा है।', msgStagingDone: 'Staging Active सुरक्षा एविडेंस अपडेट हो गई है।', msgManualRunning: 'मैन्युअल वैलिडेशन चेकलिस्ट बन रही है।', msgManualDone: 'मैन्युअल वैलिडेशन मार्गदर्शन अपडेट हो गया है।', msgReportStarting: 'Playwright रिपोर्ट आवश्यकता पर शुरू हो रही है।', msgReportReady: 'Playwright रिपोर्ट तैयार है।', popupBlocked: 'ब्राउज़र ने Playwright रिपोर्ट विंडो ब्लॉक कर दी। स्थानीय Sentinel ऐप के लिए पॉप-अप अनुमति दें।', actionFailed: 'कार्रवाई शुरू नहीं हो सकी।', reportTimeout: 'Playwright रिपोर्ट शुरू करते समय समय सीमा समाप्त हो गई।', workbenchUnavailable: 'वर्कबेंच कंट्रोल API उपलब्ध नहीं है।', accessibility: 'एक्सेसिबिलिटी', highContrast: 'उच्च कॉन्ट्रास्ट', largerText: 'बड़ा टेक्स्ट', reducedMotion: 'कम मोशन', reset: 'रीसेट', colorVision: 'रंग दृष्टि', normalVision: 'डिफ़ॉल्ट रंग', protanopia: 'प्रोटानोपिया', deuteranopia: 'ड्यूटेरानोपिया', tritanopia: 'ट्राइटानोपिया', achromatopsia: 'अक्रोमैटोप्सिया', qualityHealth: 'गुणवत्ता स्वास्थ्य', passed: 'पास', failed: 'फेल', warnings: 'चेतावनियाँ', productBugs: 'प्रोडक्ट बग', contentBugs: 'कंटेंट बग', automationIssues: 'ऑटोमेशन समस्याएँ', averageDuration: 'औसत अवधि', releaseReadiness: 'रिलीज़ तैयारी', confidence: 'विश्वास', blockingIssues: 'ब्लॉकिंग समस्याएँ', history: 'इतिहास', qualityTrend: 'गुणवत्ता ट्रेंड', automatedSummary: 'स्वचालित सारांश', qaAssessment: 'QA आकलन', refresh: 'रीफ़्रेश', live: 'लाइव',
  },
  ar: {
    language: 'اللغة', languageHelp: 'لغة الواجهة', chooseLanguage: 'اختر اللغة', appName: 'منصة QA Sentinel Tyra', appAccessibility: 'تبقى أدوات إمكانية الوصول متاحة دائماً للألوان والتباين والنص والتفضيلات البصرية.', accessibilityAria: 'عناصر التحكم في إمكانية الوصول للعرض', workbenchAria: 'تنقل منصة QA Sentinel Tyra', sectionsAria: 'أقسام منصة العمل', navDashboard: 'لوحة المعلومات', navFullQa: 'تشغيل QA الكامل', navFast: 'Chromium سريع', navSecurity: 'أوضاع الأمان', navReports: 'التقارير', navPlaywright: 'Playwright', navSettings: 'الإعدادات', state: 'الحالة', status: 'الوضع', updated: 'آخر تحديث', fullEyebrow: 'تشغيل الجودة الكامل', fullTitle: 'تشغيل QA الكامل', fullDesc: 'يشغّل Discovery ومصفوفة المتصفحات/الأجهزة الكاملة وأدوات التحليل وحزمة المراجعة البشرية مع إبقاء منصة العمل مفتوحة.', fullButton: '▶ تشغيل QA الكامل', fullSideTitle: 'ما الذي يغطيه هذا التشغيل', fullSideDesc: 'Deep Discovery وQA الوظيفي وإمكانية الوصول وUX/UI والتوافق وأدلة API/backend والتشخيص وUnified Decisioning.', fastEyebrow: 'ملاحظات سريعة', fastTitle: 'Chromium سريع', fastDesc: 'يشغّل مسار Chromium السريع على مشروعي Nation وAI Skills للحصول على نتائج سريعة دون مصفوفة التوافق الكاملة.', fastButton: 'ϟ بدء Chromium السريع', fastSideTitle: 'استخدمه عندما', fastSideDesc: 'تحتاج إلى فحص تطوير سريع. أدلة الإصدار الكاملة عبر المتصفحات لا تزال تتطلب QA الكامل.', securityEyebrow: 'أمان مُصرّح به', securityTitle: 'أوضاع الأمان', securityDesc: 'يظل تنفيذ الأمان منفصلاً بوضوح عن QA العادي مع الحفاظ على ضوابط التفويض الحالية.', prodTitle: 'Production Safe', prodDesc: 'فحوصات أمان مُصرّح بها وغير مدمرة لتقييم آمن للإنتاج.', prodButton: 'تشغيل Production Safe', stagingTitle: 'Staging Active', stagingDesc: 'فحوصات نشطة فقط على أهداف staging غير الإنتاجية المدرجة في قائمة السماح مع الموافقات المطلوبة.', stagingButton: 'تشغيل Staging Active', manualTitle: 'التحقق اليدوي', manualDesc: 'سير عمل لقائمة تحقق/تقرير مستند إلى OWASP. لا تُجرى طلبات شبكة في هذا الوضع.', manualButton: 'فتح التحقق اليدوي', reportsEyebrow: 'الأدلة والتقارير', reportsTitle: 'التقارير', reportsDesc: 'افتح أدلة Sentinel المولدة دون مغادرة سير عمل المنصة.', executiveHtml: 'HTML تنفيذي', executivePdf: 'PDF تنفيذي', humanReview: 'مراجعة بشرية', markdownReport: 'تقرير Markdown', traceability: 'التتبّع', pentestReport: 'تقرير اختبار الاختراق', playwrightEyebrow: 'أدلة الاختبار الأصلية', playwrightTitle: 'تقرير Playwright', playwrightDesc: 'يبقى خادم تقرير Playwright متوقفاً حتى تطلبه صراحةً من هنا.', playwrightButton: 'فتح تقرير Playwright', playwrightSideTitle: 'عند الطلب فقط', playwrightSideDesc: 'لا يتم فتح أي علامة تبويب Playwright تلقائياً عند بدء QA Sentinel Tyra.', settingsEyebrow: 'إعداد منصة العمل', settingsTitle: 'الإعدادات', settingsDesc: 'افتح صفحة إعدادات Sentinel للمواقع وحدود الفحص والكتالوجات والسياسات.', settingsButton: 'فتح الإعدادات', settingsSideTitle: 'إمكانية الوصول عامة', settingsSideDesc: 'تبقى عناصر إمكانية الوصول في أعلى كل عرض لتكون متاحة دائماً.', ready: 'جاهز', running: 'قيد التشغيل', warning: 'تحذير', error: 'خطأ', starting: 'يبدأ', idle: 'جاهز', reportOpen: 'مفتوح', reportReady: 'جاهز للفتح', reportRunFirst: 'شغّل QA أولاً', msgStarting: 'جارٍ تجهيز المشغّل.', msgDashboardStarting: 'جارٍ بدء خدمة لوحة المعلومات.', msgDashboardReady: 'منصة العمل جاهزة.', msgIdle: 'منصة العمل جاهزة.', msgFullRunning: 'QA الكامل يعمل في الخلفية.', msgFullDone: 'اكتمل QA الكامل. راجع لوحة المعلومات والتقارير المحدّثة.', msgFullFindings: 'اكتمل QA الكامل مع نتائج تحتاج إلى المراجعة.', msgFastRunning: 'Chromium السريع يعمل في الخلفية.', msgFastDone: 'اكتمل Chromium السريع وتم تحديث أحدث البيانات.', msgFastFindings: 'اكتمل Chromium السريع مع نتائج تحتاج إلى المراجعة.', msgProdRunning: 'وضع Production Safe قيد التشغيل.', msgProdDone: 'تم تحديث أدلة Production Safe.', msgStagingRunning: 'Staging Active يعمل مع ضوابط التفويض.', msgStagingDone: 'تم تحديث أدلة Staging Active.', msgManualRunning: 'جارٍ إنشاء قائمة التحقق اليدوي.', msgManualDone: 'تم تحديث إرشادات التحقق اليدوي.', msgReportStarting: 'جارٍ تشغيل تقرير Playwright عند الطلب.', msgReportReady: 'تقرير Playwright جاهز.', popupBlocked: 'حظر المتصفح نافذة تقرير Playwright. اسمح بالنوافذ المنبثقة لتطبيق Sentinel المحلي.', actionFailed: 'تعذر بدء الإجراء.', reportTimeout: 'انتهت مهلة بدء تقرير Playwright.', workbenchUnavailable: 'واجهة التحكم في Workbench غير متاحة.', accessibility: 'إمكانية الوصول', highContrast: 'تباين عالٍ', largerText: 'نص أكبر', reducedMotion: 'تقليل الحركة', reset: 'إعادة ضبط', colorVision: 'رؤية الألوان', normalVision: 'الألوان الافتراضية', protanopia: 'عمى الأحمر', deuteranopia: 'عمى الأخضر', tritanopia: 'عمى الأزرق', achromatopsia: 'عمى الألوان الكامل', qualityHealth: 'صحة الجودة', passed: 'ناجح', failed: 'فاشل', warnings: 'تحذيرات', productBugs: 'أخطاء المنتج', contentBugs: 'أخطاء المحتوى', automationIssues: 'مشكلات الأتمتة', averageDuration: 'متوسط المدة', releaseReadiness: 'جاهزية الإصدار', confidence: 'الثقة', blockingIssues: 'مشكلات مانعة', history: 'السجل', qualityTrend: 'اتجاه الجودة', automatedSummary: 'ملخص آلي', qaAssessment: 'تقييم QA', refresh: 'تحديث', live: 'مباشر',
  },
};

const selectors = [
  ['#workbench-panel', 'workbenchAria', 'aria-label'],
  ['.workbench-accessibility-copy strong', 'appName'],
  ['.workbench-accessibility-copy small', 'appAccessibility'],
  ['#accessibility-tools-mount', 'accessibilityAria', 'aria-label'],
  ['.workbench-nav', 'sectionsAria', 'aria-label'],
  ['[data-workbench-nav="dashboard"] span:last-child', 'navDashboard'],
  ['[data-workbench-nav="full-qa"] span:last-child', 'navFullQa'],
  ['[data-workbench-nav="fast"] span:last-child', 'navFast'],
  ['[data-workbench-nav="security"] span:last-child', 'navSecurity'],
  ['[data-workbench-nav="reports"] span:last-child', 'navReports'],
  ['[data-workbench-nav="playwright"] span:last-child', 'navPlaywright'],
  ['[data-workbench-nav="settings"] span:last-child', 'navSettings'],
  ['.workbench-statusbar .workbench-status-item:nth-child(1) span', 'state'],
  ['.workbench-statusbar .workbench-status-item:nth-child(2) span', 'status'],
  ['.workbench-statusbar .workbench-status-item:nth-child(3) span', 'updated'],
  ['#workbench-full-qa-view .eyebrow', 'fullEyebrow'],
  ['#workbench-full-qa-view h2', 'fullTitle'],
  ['#workbench-full-qa-view .workbench-action-main > p:not(.eyebrow)', 'fullDesc'],
  ['#run-full-qa-button', 'fullButton'],
  ['#workbench-full-qa-view .workbench-action-side strong', 'fullSideTitle'],
  ['#workbench-full-qa-view .workbench-action-side p', 'fullSideDesc'],
  ['#workbench-fast-view .eyebrow', 'fastEyebrow'],
  ['#workbench-fast-view h2', 'fastTitle'],
  ['#workbench-fast-view .workbench-action-main > p:not(.eyebrow)', 'fastDesc'],
  ['#fast-chromium-button', 'fastButton'],
  ['#workbench-fast-view .workbench-action-side strong', 'fastSideTitle'],
  ['#workbench-fast-view .workbench-action-side p', 'fastSideDesc'],
  ['#workbench-security-view > .eyebrow', 'securityEyebrow'],
  ['#workbench-security-view > h2', 'securityTitle'],
  ['#workbench-security-view > .muted', 'securityDesc'],
  ['#workbench-security-view .workbench-security-option:nth-child(1) strong', 'prodTitle'],
  ['#workbench-security-view .workbench-security-option:nth-child(1) p', 'prodDesc'],
  ['#security-production-button', 'prodButton'],
  ['#workbench-security-view .workbench-security-option:nth-child(2) strong', 'stagingTitle'],
  ['#workbench-security-view .workbench-security-option:nth-child(2) p', 'stagingDesc'],
  ['#security-staging-button', 'stagingButton'],
  ['#workbench-security-view .workbench-security-option:nth-child(3) strong', 'manualTitle'],
  ['#workbench-security-view .workbench-security-option:nth-child(3) p', 'manualDesc'],
  ['#security-manual-button', 'manualButton'],
  ['#workbench-reports-view > .eyebrow', 'reportsEyebrow'],
  ['#workbench-reports-view > h2', 'reportsTitle'],
  ['#workbench-reports-view > .muted', 'reportsDesc'],
  ['#workbench-reports-view .workbench-report-links a:nth-child(1)', 'executiveHtml'],
  ['#workbench-reports-view .workbench-report-links a:nth-child(2)', 'executivePdf'],
  ['#workbench-reports-view .workbench-report-links a:nth-child(3)', 'humanReview'],
  ['#workbench-reports-view .workbench-report-links a:nth-child(4)', 'markdownReport'],
  ['#workbench-reports-view .workbench-report-links a:nth-child(5)', 'traceability'],
  ['#workbench-reports-view .workbench-report-links a:nth-child(6)', 'pentestReport'],
  ['#workbench-playwright-view .eyebrow', 'playwrightEyebrow'],
  ['#workbench-playwright-view h2', 'playwrightTitle'],
  ['#workbench-playwright-view .workbench-action-main > p:not(.eyebrow)', 'playwrightDesc'],
  ['#workbench-playwright-button', 'playwrightButton'],
  ['#workbench-playwright-view .workbench-action-side strong', 'playwrightSideTitle'],
  ['#workbench-playwright-view .workbench-action-side p', 'playwrightSideDesc'],
  ['#workbench-settings-view .eyebrow', 'settingsEyebrow'],
  ['#workbench-settings-view h2', 'settingsTitle'],
  ['#workbench-settings-view .workbench-action-main > p:not(.eyebrow)', 'settingsDesc'],
  ['#workbench-settings-view .workbench-primary-button', 'settingsButton'],
  ['#workbench-settings-view .workbench-action-side strong', 'settingsSideTitle'],
  ['#workbench-settings-view .workbench-action-side p', 'settingsSideDesc'],
];

const sourceTextToKey = new Map(Object.entries({
  Accessibility: 'accessibility',
  'High contrast': 'highContrast',
  'Larger text': 'largerText',
  'Reduced motion': 'reducedMotion',
  Reset: 'reset',
  'Colour vision': 'colorVision',
  'Color vision': 'colorVision',
  'Default colours': 'normalVision',
  'Default colors': 'normalVision',
  Protanopia: 'protanopia', Deuteranopia: 'deuteranopia', Tritanopia: 'tritanopia', Achromatopsia: 'achromatopsia',
  'Quality Health': 'qualityHealth', Passed: 'passed', Failed: 'failed', Warnings: 'warnings', 'Product bugs': 'productBugs', 'Product Bugs': 'productBugs', 'Content bugs': 'contentBugs', 'Content Bugs': 'contentBugs', 'Automation issues': 'automationIssues', 'Automation Issues': 'automationIssues', 'Average duration': 'averageDuration', 'Average Duration': 'averageDuration', 'Release Readiness': 'releaseReadiness', Confidence: 'confidence', 'Blocking issues': 'blockingIssues', 'Blocking Issues': 'blockingIssues', History: 'history', 'Quality trend': 'qualityTrend', 'Automated Summary': 'automatedSummary', 'QA assessment': 'qaAssessment', Refresh: 'refresh', LIVE: 'live',
}));

const textNodeKeys = new WeakMap();
let currentLocale = DEFAULT_LOCALE;
let applying = false;

function t(key, fallback = '') {
  return messages[currentLocale]?.[key] ?? messages.en[key] ?? fallback ?? key;
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat(locales[currentLocale].intl, {
    dateStyle: 'short', timeStyle: 'medium',
  }).format(date);
}

function translateStatus(data) {
  const phase = String(data?.phase || '');
  const action = String(data?.currentAction || data?.lastAction || '');
  const running = Boolean(data?.busy);

  if (phase === 'starting-dashboard') return t('msgDashboardStarting');
  if (phase === 'dashboard-ready' || phase === 'idle' || phase === 'check-only') return t('msgDashboardReady');
  if (phase === 'open-playwright-report' || phase === 'playwright-report-starting') return t('msgReportStarting');
  if (phase.includes('playwright') && data?.reportReady) return t('msgReportReady');

  if (action === 'run-full-qa') return running ? t('msgFullRunning') : (data?.lastExitCode ? t('msgFullFindings') : t('msgFullDone'));
  if (action === 'fast-chromium') return running ? t('msgFastRunning') : (data?.lastExitCode ? t('msgFastFindings') : t('msgFastDone'));
  if (action === 'security-production') return running ? t('msgProdRunning') : t('msgProdDone');
  if (action === 'security-staging') return running ? t('msgStagingRunning') : t('msgStagingDone');
  if (action === 'security-manual') return running ? t('msgManualRunning') : t('msgManualDone');

  if (String(data?.overallStatus || '').toLowerCase() === 'starting') return t('msgStarting');
  return data?.message || t('msgIdle');
}

function translateTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const raw = node.nodeValue || '';
  const trimmed = raw.trim();
  if (!trimmed) return;

  let key = textNodeKeys.get(node);
  if (!key && sourceTextToKey.has(trimmed)) {
    key = sourceTextToKey.get(trimmed);
    textNodeKeys.set(node, key);
  }
  if (!key) return;

  const translated = t(key, trimmed);
  const prefix = raw.match(/^\s*/)?.[0] || '';
  const suffix = raw.match(/\s*$/)?.[0] || '';
  const next = `${prefix}${translated}${suffix}`;
  if (node.nodeValue !== next) node.nodeValue = next;
}

function scanTextNodes(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) translateTextNode(node);
}

function applyStaticTranslations() {
  for (const [selector, key, attribute] of selectors) {
    const element = document.querySelector(selector);
    if (!element) continue;
    if (attribute) element.setAttribute(attribute, t(key));
    else element.textContent = t(key);
  }

  const label = document.getElementById('workbench-language-label');
  const help = document.getElementById('workbench-language-help');
  const select = document.getElementById('workbench-language-select');
  if (label) label.textContent = t('language');
  if (help) help.textContent = t('languageHelp');
  if (select) select.setAttribute('aria-label', t('chooseLanguage'));

  scanTextNodes(document.body);
}

function applyLocale(locale, { persist = true } = {}) {
  if (!locales[locale]) locale = DEFAULT_LOCALE;
  currentLocale = locale;
  document.documentElement.lang = locale;
  document.documentElement.dir = locales[locale].dir;
  document.body?.classList.toggle('workbench-rtl', locales[locale].dir === 'rtl');

  const select = document.getElementById('workbench-language-select');
  if (select && select.value !== locale) select.value = locale;

  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* optional */ }
  }

  applying = true;
  try { applyStaticTranslations(); }
  finally { applying = false; }

  document.dispatchEvent(new CustomEvent('qa-sentinel-language-change', {
    detail: { locale, dir: locales[locale].dir },
  }));
}

function loadLocale() {
  try {
    const migrated = localStorage.getItem(DEFAULT_MIGRATION_KEY);
    if (!migrated) {
      localStorage.setItem(DEFAULT_MIGRATION_KEY, '1');
      localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE);
      return DEFAULT_LOCALE;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && locales[stored]) return stored;
  } catch { /* optional */ }
  return DEFAULT_LOCALE;
}

window.QaSentinelI18n = {
  t,
  applyLocale,
  formatDate,
  translateStatus,
  get locale() { return currentLocale; },
  get dir() { return locales[currentLocale].dir; },
  supported: Object.keys(locales),
};

const select = document.getElementById('workbench-language-select');
select?.addEventListener('change', () => applyLocale(select.value));

const observer = new MutationObserver(mutations => {
  if (applying) return;
  applying = true;
  try {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateTextNode(mutation.target);
      for (const node of mutation.addedNodes || []) {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        else if (node.nodeType === Node.ELEMENT_NODE) scanTextNodes(node);
      }
    }
  } finally {
    applying = false;
  }
});

if (document.body) {
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
}

applyLocale(loadLocale(), { persist: false });
