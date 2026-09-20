import type { CatalogProduct } from './types';

const TTL_MS = 1000 * 60 * 30;
const store = new Map<string, { at: number; products: CatalogProduct[] }>();

export function normalizeCacheKey(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getCachedProducts(query: string): CatalogProduct[] | null {
  const key = normalizeCacheKey(query);
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  return row.products;
}

export function setCachedProducts(query: string, products: CatalogProduct[]) {
  store.set(normalizeCacheKey(query), { at: Date.now(), products });
}

export function clearProductCache() {
  store.clear();
}
