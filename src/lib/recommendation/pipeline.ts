import { getCachedProducts, setCachedProducts } from './cache';
import type { CatalogProduct, RetrievedProduct } from './types';
import type { ProductSource } from './sources/ProductSource';
import { mockSource } from './sources/MockSource';

function mergeProducts(rows: RetrievedProduct[]) {
  const map = new Map<string, RetrievedProduct>();
  for (const row of rows) {
    const existing = map.get(row.id);
    if (!existing) {
      map.set(row.id, row);
      continue;
    }
    const queries = new Set([...existing.matchedQueries, ...row.matchedQueries]);
    map.set(row.id, { ...existing, matchedQueries: [...queries] });
  }
  return [...map.values()];
}

async function searchQuery(
  query: string,
  source: ProductSource,
): Promise<RetrievedProduct[]> {
  const cached = getCachedProducts(query);
  const products = cached ?? (await source.search(query));
  if (!cached) setCachedProducts(query, products);
  return products.map((product) => ({ ...product, matchedQueries: [query] }));
}

export async function retrieveFromQueries(
  queries: string[],
  source: ProductSource = mockSource,
): Promise<RetrievedProduct[]> {
  const usable = queries.map((q) => q.trim()).filter(Boolean);
  if (!usable.length) {
    const fallback = await source.search('evening dress');
    return fallback.map((product) => ({ ...product, matchedQueries: ['evening dress'] }));
  }

  const batches = await Promise.all(usable.map((query) => searchQuery(query, source)));
  return mergeProducts(batches.flat());
}

export type CatalogSearchRequest = {
  queries: string[];
  inspirationImageUrl?: string;
};

export async function fetchCatalogFromApi(
  payload: CatalogSearchRequest,
): Promise<RetrievedProduct[]> {
  const res = await fetch('/api/catalog/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Catalog search ${res.status}`);
  const body = (await res.json()) as { products?: RetrievedProduct[] };
  return body.products ?? [];
}

export async function retrieveProducts(
  queries: string[],
  inspirationImageUrl?: string,
): Promise<RetrievedProduct[]> {
  try {
    return await fetchCatalogFromApi({ queries, inspirationImageUrl });
  } catch {
    return retrieveFromQueries(queries, mockSource);
  }
}

export function attachCatalogScores(
  products: CatalogProduct[],
  query: string,
): RetrievedProduct[] {
  return products.map((product) => ({ ...product, matchedQueries: [query] }));
}
