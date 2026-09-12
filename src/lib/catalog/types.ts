export type DummyJsonProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  brand?: string;
  tags?: string[];
  thumbnail: string;
  images?: string[];
};

export type DummyJsonList = {
  products: DummyJsonProduct[];
};

export const FASHION_CATEGORIES = [
  'womens-dresses',
  'womens-shoes',
  'womens-bags',
  'mens-shirts',
] as const;

export const CATALOG_ID_PREFIX = 'dj-';

export function catalogId(id: number) {
  return `${CATALOG_ID_PREFIX}${id}`;
}
