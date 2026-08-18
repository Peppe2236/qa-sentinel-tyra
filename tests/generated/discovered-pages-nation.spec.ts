import { defineDiscoveredPageTests } from './discovered-pages.shared';

defineDiscoveredPageTests({
  siteId: 'nation',
  siteName: 'Nation',
  expectedOrigin: 'https://nation.dev',
  reportFile: 'discovered-pages-nation.json',
  scanCommand: 'npm run scan:nation',
});
