import type { ProductSource } from './ProductSource.js';
import type { CatalogProduct } from '../types.js';
import { MOCK_CATALOG } from './mockCatalog.js';

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2);
}

function scoreRow(product: CatalogProduct, tokens: string[]) {
  if (!tokens.length) return 0;
  const hay = [
    product.title,
    product.brand ?? '',
    ...(product.attributes ?? []),
  ]
    .join(' ')
    .toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (hay.includes(token)) hits += 1;
  }
  return hits / tokens.length;
}

export class MockSource implements ProductSource {
  async search(query: string): Promise<CatalogProduct[]> {
    const tokens = tokenize(query);
    const ranked = MOCK_CATALOG.map((product) => ({
      product,
      score: scoreRow(product, tokens),
    }))
      .filter((row) => row.score > 0 || tokens.length === 0)
      .sort((a, b) => b.score - a.score);

    const pool = ranked.length ? ranked : MOCK_CATALOG.map((product) => ({ product, score: 0 }));
    return pool.slice(0, 24).map((row) => row.product);
  }
}

export const mockSource = new MockSource();
