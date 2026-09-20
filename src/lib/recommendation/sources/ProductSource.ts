import type { CatalogProduct } from '../types.js';

export interface ProductSource {
  search(query: string): Promise<CatalogProduct[]>;
}
