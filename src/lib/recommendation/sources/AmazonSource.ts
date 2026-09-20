import { catalogEnv } from '../env';
import { deriveAttributes } from '../../catalog/deriveAttributes';
import type { CatalogProduct } from '../types';
import type { ProductSource } from './ProductSource';

type AmazonItem = {
  asin?: string;
  title?: string;
  detailPageURL?: string;
  imageURL?: string;
  price?: { amount?: number; currency?: string };
  brand?: string;
};

function mapItem(item: AmazonItem): CatalogProduct | null {
  const title = item.title?.trim();
  const imageUrl = item.imageURL?.trim();
  const productUrl = item.detailPageURL?.trim();
  const asin = item.asin?.trim();
  if (!title || !imageUrl || !productUrl || !asin) return null;

  const blob = title;
  const tag = catalogEnv('AMAZON_ASSOCIATE_TAG');
  const affiliateUrl = tag
    ? productUrl.includes('?')
      ? `${productUrl}&tag=${encodeURIComponent(tag)}`
      : `${productUrl}?tag=${encodeURIComponent(tag)}`
    : productUrl;

  return {
    id: `amazon-${asin}`,
    merchant: 'amazon',
    merchantProductId: asin,
    title,
    brand: item.brand,
    price: item.price?.amount,
    currency: item.price?.currency ?? 'USD',
    imageUrl,
    productUrl,
    affiliateUrl,
    category: 'fashion',
    availability: true,
    attributes: title.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 3),
    attributeScores: deriveAttributes(blob),
  };
}

function parseAmazonBody(body: unknown): CatalogProduct[] {
  if (!body || typeof body !== 'object') return [];
  const root = body as Record<string, unknown>;
  const items =
    (Array.isArray(root.items) && root.items) ||
    (Array.isArray(root.products) && root.products) ||
    (Array.isArray(root.results) && root.results) ||
    [];

  return items
    .map((item) => mapItem(item as AmazonItem))
    .filter((item): item is CatalogProduct => Boolean(item));
}

export class AmazonSource implements ProductSource {
  async search(query: string): Promise<CatalogProduct[]> {
    const key = catalogEnv('AMAZON_CREATORS_API_KEY');
    const endpoint =
      catalogEnv('AMAZON_CREATORS_API_ENDPOINT') ||
      'https://creators-api.amazon.com/catalog/v1/search';
    if (!key) return [];

    const partnerTag = catalogEnv('AMAZON_ASSOCIATE_TAG');
    const url = new URL(endpoint);
    url.searchParams.set('keywords', query);
    url.searchParams.set('searchIndex', 'Fashion');
    url.searchParams.set('itemCount', '24');
    if (partnerTag) url.searchParams.set('partnerTag', partnerTag);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as unknown;
    return parseAmazonBody(body);
  }
}

export const amazonSource = new AmazonSource();
