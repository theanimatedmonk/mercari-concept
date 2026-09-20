import type { CatalogProduct } from './types.js';

const TTL_MS = 1000 * 60 * 45;
const store = new Map<string, { at: number; products: CatalogProduct[] }>();

export function normalizeServerCacheKey(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getServerCachedProducts(query: string): CatalogProduct[] | null {
  const key = normalizeServerCacheKey(query);
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  return row.products;
}

export function setServerCachedProducts(query: string, products: CatalogProduct[]) {
  store.set(normalizeServerCacheKey(query), { at: Date.now(), products });
}
