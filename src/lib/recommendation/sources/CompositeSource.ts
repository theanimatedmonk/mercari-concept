import { catalogEnv } from '../env.js';
import type { CatalogProduct } from '../types.js';
import type { ProductSource } from './ProductSource.js';
import { amazonConfigured, amazonSource } from './AmazonSource.js';
import { aliexpressConfigured, aliexpressSource } from './AliExpressSource.js';
import { luxuryClosetConfigured, luxuryClosetSource } from './LuxuryClosetSource.js';
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
    return dedupe(batches.flat()).slice(0, 36);
  }
}

export function createServerCatalogSource(): ProductSource {
  const sources: ProductSource[] = [];
  if (catalogEnv('MYNTRA_AFFILIATE_FEED_URL')) sources.push(myntraSource);
  if (luxuryClosetConfigured()) sources.push(luxuryClosetSource);
  else if (aliexpressConfigured()) sources.push(aliexpressSource);
  if (amazonConfigured()) sources.push(amazonSource);
  if (!sources.length) return mockSource;
  return new CompositeSource(sources);
}
