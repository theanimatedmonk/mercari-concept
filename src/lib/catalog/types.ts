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

export const FASHION_CATEGORIES = ['womens-dresses'] as const;

export const FASHION_CATEGORY_SET = new Set<string>(FASHION_CATEGORIES);

export const CATALOG_ID_PREFIX = 'dj-';

export function catalogId(id: number) {
  return `${CATALOG_ID_PREFIX}${id}`;
}
