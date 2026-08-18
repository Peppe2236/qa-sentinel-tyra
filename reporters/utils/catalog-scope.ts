export type CatalogSiteId = 'nation' | 'ai-skills' | 'platform';

export function sitesInScopeFromTests(
  tests: Array<{
    project?: string;
    site?: string;
  }>
): Set<string> {
  const sites = new Set<string>();

  for (const test of tests) {
    const site = String(test.site ?? '')
      .trim()
      .toLowerCase();

    if (site === 'nation' || site === 'ai-skills') {
      sites.add(site);
      continue;
    }

    const project = String(test.project ?? '');

    if (project.startsWith('ai-skills-')) {
      sites.add('ai-skills');
    } else if (project.startsWith('nation-')) {
      sites.add('nation');
    }
  }

  return sites;
}

/**
 * Keep platform catalog items for any run. Hide Nation or Skills items
 * when that site was not in the Playwright project set, so a Nation-only
 * run does not treat untested Skills requirements as release blockers.
 */
export function filterCatalogBySites<T extends { site?: string }>(
  items: T[],
  sitesInScope: Set<string>
): T[] {
  if (sitesInScope.size === 0) {
    return items;
  }

  return items.filter(item => {
    const site = item.site?.trim();

    if (!site || site === 'platform') {
      return true;
    }

    return sitesInScope.has(site);
  });
}
