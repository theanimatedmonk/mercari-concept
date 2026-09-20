import { catalogEnv } from '../env.js';
import { parseProductFeed } from '../feedParse.js';
import type { CatalogProduct } from '../types.js';
import type { ProductSource } from './ProductSource.js';

const FEED_TTL_MS = 1000 * 60 * 30;
let cachedFeed: { at: number; products: CatalogProduct[] } | null = null;

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2);
}

function scoreProduct(product: CatalogProduct, tokens: string[]) {
  if (!tokens.length) return 0;
  const hay = [product.title, product.brand ?? '', ...(product.attributes ?? [])]
    .join(' ')
    .toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (hay.includes(token)) hits += 1;
  }
  return hits / tokens.length;
}

async function loadFeed(): Promise<CatalogProduct[]> {
  const url = catalogEnv('MYNTRA_AFFILIATE_FEED_URL');
  if (!url) return [];

  if (cachedFeed && Date.now() - cachedFeed.at < FEED_TTL_MS) {
    return cachedFeed.products;
  }

  const res = await fetch(url, { headers: { Accept: 'text/csv, application/json' } });
  if (!res.ok) throw new Error(`Myntra feed ${res.status}`);
  const text = await res.text();
  const products = parseProductFeed(text, 'myntra');
  cachedFeed = { at: Date.now(), products };
  return products;
}

export class MyntraSource implements ProductSource {
  async search(query: string): Promise<CatalogProduct[]> {
    try {
      const feed = await loadFeed();
      if (!feed.length) return [];
      const tokens = tokenize(query);
      return feed
        .map((product) => ({ product, score: scoreProduct(product, tokens) }))
        .filter((row) => row.score > 0 || tokens.length === 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 24)
        .map((row) => row.product);
    } catch {
      return [];
    }
  }
}

export const myntraSource = new MyntraSource();
