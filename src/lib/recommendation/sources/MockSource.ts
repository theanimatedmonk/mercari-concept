import { catalogTextMatchesToken } from '../dressFilter.js';
import type { CatalogProduct } from '../types.js';
import { MOCK_CATALOG } from './mockCatalog.js';
import type { ProductSource } from './ProductSource.js';

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2);
}

function haystack(product: CatalogProduct) {
  return [product.title, product.brand ?? '', ...(product.attributes ?? [])]
    .join(' ')
    .toLowerCase();
}

function scoreRow(product: CatalogProduct, tokens: string[]) {
  if (!tokens.length) return 0;
  const hay = haystack(product);
  let hits = 0;
  for (const token of tokens) {
    if (catalogTextMatchesToken(hay, token)) hits += 1;
  }
  return hits / tokens.length;
}

export class MockSource implements ProductSource {
  async search(query: string): Promise<CatalogProduct[]> {
    const tokens = tokenize(query);
    const ranked = MOCK_CATALOG.map((product) => ({
      product,
      score: scoreRow(product, tokens),
    })).sort((a, b) => b.score - a.score);

    const matched = tokens.length
      ? ranked.filter((row) => row.score > 0).map((row) => row.product)
      : ranked.map((row) => row.product);
    const seen = new Set(matched.map((item) => item.id));
    const rest = MOCK_CATALOG.filter((item) => !seen.has(item.id));
    return [...matched, ...rest].slice(0, 24);
  }
}

export const mockSource = new MockSource();
