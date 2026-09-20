import type { RetrievedProduct } from './types.js';
import type { ProductSource } from './sources/ProductSource.js';
import { createServerCatalogSource } from './sources/CompositeSource.js';
import { getServerCachedProducts, setServerCachedProducts } from './serverCache.js';
import { attachVisualScores } from './visualSimilarity.js';

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

async function searchQuery(query: string, source: ProductSource): Promise<RetrievedProduct[]> {
  const cached = getServerCachedProducts(query);
  const products = cached ?? (await source.search(query));
  if (!cached) setServerCachedProducts(query, products);
  return products.map((product) => ({ ...product, matchedQueries: [query] }));
}

export async function serverRetrieveCatalog(
  queries: string[],
  inspirationImageUrl?: string,
  source: ProductSource = createServerCatalogSource(),
): Promise<RetrievedProduct[]> {
  const usable = queries.map((q) => q.trim()).filter(Boolean);
  const searchQueries = usable.length ? usable : ['evening dress'];
  const batches = await Promise.all(searchQueries.map((query) => searchQuery(query, source)));
  let products = mergeProducts(batches.flat());
  if (inspirationImageUrl) {
    products = await attachVisualScores(products, inspirationImageUrl);
  }
  return products;
}
