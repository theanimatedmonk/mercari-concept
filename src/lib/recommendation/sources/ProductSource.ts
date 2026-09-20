import type { CatalogProduct } from '../types';

export interface ProductSource {
  search(query: string): Promise<CatalogProduct[]>;
}
