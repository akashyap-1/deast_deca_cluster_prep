// The DECA clusters the app covers. Each cluster's question bank is data/clusters/<id>.json,
// written by `npm run parse`, and is loaded only when that cluster is opened.

export interface ClusterInfo {
  id: string;
  name: string;
  short: string;
}

export const CLUSTERS: ClusterInfo[] = [
  { id: 'finance', name: 'Finance', short: 'Finance' },
  { id: 'marketing', name: 'Marketing', short: 'Marketing' },
  { id: 'business-admin', name: 'Business Management & Administration', short: 'Business Admin' },
  { id: 'hospitality', name: 'Hospitality & Tourism', short: 'Hospitality' },
  { id: 'entrepreneurship', name: 'Entrepreneurship', short: 'Entrepreneurship' },
  { id: 'principles', name: 'Principles of Business Administration', short: 'Principles' },
  { id: 'pfl', name: 'Personal Financial Literacy', short: 'Personal Finance' },
];

const loaders = import.meta.glob<string>('../../data/clusters/*.json', { query: '?raw', import: 'default' });

function loaderFor(id: string) {
  return loaders[`../../data/clusters/${id}.json`];
}

/** True when a question bank has been built for this cluster. */
export function hasBank(id: string): boolean {
  return !!loaderFor(id);
}

export const DEFAULT_CLUSTER = 'finance';

export function clusterById(id: string): ClusterInfo {
  return CLUSTERS.find((c) => c.id === id) ?? CLUSTERS[0];
}

/** Fetches a cluster's bank as raw JSON text. */
export async function fetchBank(id: string): Promise<string> {
  const load = loaderFor(id);
  if (!load) throw new Error(`No question bank for ${id} yet.`);
  return load();
}
