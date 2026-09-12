import { LISTING_PRODUCT_ID } from '../../data/listing';
import { products as fallbackProducts } from '../../data/products';
import type { Product } from '../../types';
import { deriveAttributes } from './deriveAttributes';
import {
  catalogId,
  FASHION_CATEGORIES,
  type DummyJsonList,
  type DummyJsonProduct,
} from './types';

function handleFromBrand(brand?: string, category?: string) {
  const raw = (brand || category || 'marketplace').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return raw ? `@${raw.slice(0, 18)}` : '@marketplace';
}

export function mapDummyProduct(item: DummyJsonProduct): Product {
  const blob = [item.title, item.description, ...(item.tags ?? [])].join(' ');
  return {
    id: catalogId(item.id),
    name: item.title,
    price: `$${Math.round(item.price)}`,
    condition: 'Like new',
    seller: handleFromBrand(item.brand, item.category),
    image: item.thumbnail,
    attributes: deriveAttributes(blob),
    cluster: 'visual-match',
  };
}

async function fetchCategory(category: string): Promise<DummyJsonProduct[]> {
  const res = await fetch(
    `https://dummyjson.com/products/category/${encodeURIComponent(category)}?limit=20`,
  );
  if (!res.ok) throw new Error(`DummyJSON ${category}: ${res.status}`);
  const data = (await res.json()) as DummyJsonList;
  return data.products ?? [];
}

export function withHeroListing(live: Product[]): Product[] {
  const hero = fallbackProducts.find((item) => item.id === LISTING_PRODUCT_ID);
  if (!hero) return live;
  if (live.some((item) => item.id === LISTING_PRODUCT_ID)) return live;
  return [hero, ...live];
}

export async function fetchFashionCatalog(): Promise<Product[]> {
  const batches = await Promise.all(FASHION_CATEGORIES.map((category) => fetchCategory(category)));
  const seen = new Set<string>();
  const mapped: Product[] = [];
  for (const item of batches.flat()) {
    const product = mapDummyProduct(item);
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    mapped.push(product);
  }
  return mapped;
}
