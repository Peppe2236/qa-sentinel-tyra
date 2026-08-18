import { defineDiscoveredPageTests } from './discovered-pages.shared';

defineDiscoveredPageTests({
  siteId: 'ai-skills',
  siteName: 'AI Skills',
  expectedOrigin: 'https://aiskills.nation.dev',
  reportFile: 'discovered-pages-ai-skills.json',
  scanCommand: 'npm run scan:skills',
});
