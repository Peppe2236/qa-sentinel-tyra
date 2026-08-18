import catalog from '../../config/projects.json';
import type { DashboardProject } from '../models/types';

export interface ProjectCatalogEntry {
  id: string;
  name: string;
  host: string;
  baseURL: string;
  site: string;
}

export interface ProjectCatalog {
  schemaVersion: number;
  scope: string;
  note?: string;
  projects: ProjectCatalogEntry[];
}

export function loadProjectCatalog(): ProjectCatalog {
  return catalog as ProjectCatalog;
}

export function buildProjectOverview(input: {
  siteStatistics?: Record<
    string,
    {
      site?: string;
      total?: number;
      passed?: number;
      failed?: number;
      skipped?: number;
      health?: number;
      passRate?: number;
    }
  >;
}): DashboardProject[] {
  return loadProjectCatalog().projects.map(project => {
    const stats = input.siteStatistics?.[project.site] ?? input.siteStatistics?.[project.id];
    const passed = Number(stats?.passed ?? 0);
    const failed = Number(stats?.failed ?? 0);
    const skipped = Number(stats?.skipped ?? 0);
    const total = Number(stats?.total ?? 0);
    const passRate =
      Number(stats?.passRate) ||
      executedPassRate(passed, failed);

    return {
      id: project.id,
      name: project.name,
      host: project.host,
      site: project.site,
      baseURL: project.baseURL,
      total,
      passed,
      failed,
      skipped,
      health: Number(stats?.health ?? passRate),
      passRate,
    };
  });
}

function executedPassRate(passed: number, failed: number): number {
  const executed = passed + failed;
  if (executed <= 0) {
    return 0;
  }

  return Math.round((passed / executed) * 100);
}
