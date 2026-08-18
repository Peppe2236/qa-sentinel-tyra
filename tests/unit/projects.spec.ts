import { expect, test } from '@playwright/test';

import {
  buildProjectOverview,
  loadProjectCatalog,
} from '../../reporters/utils/projects';

test.describe('multi-project dashboard catalog', () => {
  test('lists Nation and AI Skills as two projects in one dashboard', () => {
    const catalog = loadProjectCatalog();

    expect(catalog.projects).toHaveLength(2);
    expect(catalog.projects.map(project => project.id)).toEqual([
      'nation',
      'ai-skills',
    ]);
    expect(catalog.scope).toContain('two-sites');
  });

  test('side-by-side overview uses pass rate and failure counts per site', () => {
    const projects = buildProjectOverview({
      siteStatistics: {
        nation: {
          site: 'nation',
          total: 10,
          passed: 8,
          failed: 2,
          skipped: 0,
          health: 80,
          passRate: 80,
        },
        'ai-skills': {
          site: 'ai-skills',
          total: 6,
          passed: 5,
          failed: 1,
          skipped: 0,
          health: 83,
          passRate: 83,
        },
      },
    });

    expect(projects[0]?.name).toBe('Nation');
    expect(projects[0]?.failed).toBe(2);
    expect(projects[0]?.passRate).toBe(80);
    expect(projects[1]?.name).toBe('AI Skills');
    expect(projects[1]?.failed).toBe(1);
  });
});
