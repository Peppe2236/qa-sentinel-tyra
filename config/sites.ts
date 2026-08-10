export interface SentinelSite {
  id: string;
  name: string;
  baseURL: string;
}

export const SENTINEL_SITES: SentinelSite[] = [
  {
    id: 'nation',
    name: 'Nation',
    baseURL: 'https://nation.dev/home',
  },
  {
    id: 'ai-skills',
    name: 'AI Skills',
    baseURL: 'https://aiskills.nation.dev/',
  },
];

export function getSentinelSite(
  id: string
): SentinelSite | undefined {
  return SENTINEL_SITES.find(
    site => site.id === id
  );
}