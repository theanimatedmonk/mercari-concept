import { LISTING_PRODUCT_ID } from '../../data/listing';
import { products as fallbackProducts } from '../../data/products';
import type { Product } from '../../types';
import { isDressListing } from '../recommendation/dressFilter';
import { deriveAttributes } from './deriveAttributes';
import {
  catalogId,
  FASHION_CATEGORIES,
  FASHION_CATEGORY_SET,
  type DummyJsonList,
  type DummyJsonProduct,
} from './types';

type PillHint = { id: string; label: string };

function handleFromBrand(brand?: string, category?: string) {
  const raw = (brand || category || 'marketplace').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return raw ? `@${raw.slice(0, 18)}` : '@marketplace';
}

export function mapDummyProduct(item: DummyJsonProduct, pills?: PillHint[]): Product {
  const blob = [item.title, item.description, ...(item.tags ?? [])].join(' ');
  return {
    id: catalogId(item.id),
    name: item.title,
    price: `$${Math.round(item.price)}`,
    condition: 'Like new',
    seller: handleFromBrand(item.brand, item.category),
    image: item.thumbnail,
    attributes: deriveAttributes(blob, pills),
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

function uniqueProducts(items: Product[]): Product[] {
  const seen = new Set<string>();
  const mapped: Product[] = [];
  for (const product of items) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    mapped.push(product);
  }
  return mapped;
}

export async function fetchFashionCatalog(pills?: PillHint[]): Promise<Product[]> {
  const batches = await Promise.allSettled(
    FASHION_CATEGORIES.map((category) => fetchCategory(category)),
  );
  const items = batches.flatMap((batch) => (batch.status === 'fulfilled' ? batch.value : []));
  return uniqueProducts(
    items
      .map((item) => mapDummyProduct(item, pills))
      .filter((item) => isDressListing(item.name, 'womens-dresses', item.image)),
  );
}

export async function searchFashionCatalog(
  query: string,
  pills?: PillHint[],
): Promise<Product[]> {
  const q = query.trim();
  if (!q) return fetchFashionCatalog(pills);
  const res = await fetch(
    `https://dummyjson.com/products/search?q=${encodeURIComponent(q)}&limit=24`,
  );
  if (!res.ok) throw new Error(`DummyJSON search: ${res.status}`);
  const data = (await res.json()) as DummyJsonList;
  const fashion = (data.products ?? []).filter((item) =>
    FASHION_CATEGORY_SET.has(item.category),
  );
  if (fashion.length === 0) return fetchFashionCatalog(pills);
  return uniqueProducts(
    fashion
      .filter((item) => isDressListing(item.title, item.category, item.thumbnail))
      .map((item) => mapDummyProduct(item, pills)),
  );
}
