import { catalogEnv, catalogFlag } from '../env.js';
import type { CatalogProduct } from '../types.js';
import type { ProductSource } from './ProductSource.js';
import { amazonConfigured, amazonSource } from './AmazonSource.js';
import { mockSource } from './MockSource.js';
import { myntraSource } from './MyntraSource.js';

function dedupe(products: CatalogProduct[]) {
  const map = new Map<string, CatalogProduct>();
  for (const product of products) {
    const key = `${product.merchant}:${product.merchantProductId ?? product.id}`;
    if (!map.has(key)) map.set(key, product);
  }
  return [...map.values()];
}

export class CompositeSource implements ProductSource {
  sources: ProductSource[];

  constructor(sources: ProductSource[]) {
    this.sources = sources;
  }

  async search(query: string): Promise<CatalogProduct[]> {
    const batches = await Promise.all(this.sources.map((source) => source.search(query)));
    const merged = dedupe(batches.flat());
    if (merged.length) return merged.slice(0, 36);
    if (!catalogFlag('CATALOG_USE_MOCK_FALLBACK', true)) return [];
    return mockSource.search(query);
  }
}

export function createServerCatalogSource(): ProductSource {
  const sources: ProductSource[] = [];
  if (catalogEnv('MYNTRA_AFFILIATE_FEED_URL')) sources.push(myntraSource);
  if (amazonConfigured()) sources.push(amazonSource);
  if (!sources.length) return mockSource;
  return new CompositeSource(sources);
}
