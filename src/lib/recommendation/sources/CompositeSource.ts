import { catalogEnv, catalogFlag } from '../env';
import type { CatalogProduct } from '../types';
import type { ProductSource } from './ProductSource';
import { amazonSource } from './AmazonSource';
import { mockSource } from './MockSource';
import { myntraSource } from './MyntraSource';

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
  if (catalogEnv('AMAZON_CREATORS_API_KEY')) sources.push(amazonSource);
  if (!sources.length) return mockSource;
  return new CompositeSource(sources);
}
