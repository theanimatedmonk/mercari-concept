import { catalogEnv } from '../env.js';
import { deriveAttributes } from '../../catalog/deriveAttributes.js';
import { amazonLocale, amazonPaapiConfigured, searchPaapi } from '../amazonPaapi.js';
import { isDressListing } from '../dressFilter.js';
import type { CatalogProduct } from '../types.js';
import type { ProductSource } from './ProductSource.js';

type AmazonItem = {
  asin?: string;
  title?: string;
  detailPageURL?: string;
  imageURL?: string;
  price?: { amount?: number; currency?: string };
  brand?: string;
};

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function withAssociateTag(url: string) {
  const tag = catalogEnv('AMAZON_ASSOCIATE_TAG');
  if (!tag || !url) return url;
  if (/[?&]tag=/.test(url)) return url;
  return url.includes('?')
    ? `${url}&tag=${encodeURIComponent(tag)}`
    : `${url}?tag=${encodeURIComponent(tag)}`;
}

function fromPaapiItem(raw: unknown): AmazonItem | null {
  const item = asRecord(raw);
  const asin = asString(item.ASIN);
  const info = asRecord(item.ItemInfo);
  const title = asString(asRecord(info.Title).DisplayValue);
  const brand = asString(asRecord(asRecord(info.ByLineInfo).Brand).DisplayValue);
  const images = asRecord(asRecord(asRecord(item.Images).Primary).Large);
  const listings = Array.isArray(asRecord(item.Offers).Listings)
    ? (asRecord(item.Offers).Listings as unknown[])
    : [];
  const price = asRecord(asRecord(listings[0]).Price);
  if (!asin || !title) return null;
  return {
    asin,
    title,
    brand: brand || undefined,
    detailPageURL: asString(item.DetailPageURL),
    imageURL: asString(images.URL),
    price: {
      amount: asNumber(price.Amount),
      currency: asString(price.Currency) || amazonLocale().currency,
    },
  };
}

function fromCreatorsItem(raw: unknown): AmazonItem | null {
  const item = asRecord(raw);
  const asin = asString(item.asin) || asString(item.ASIN);
  const title = asString(item.title) || asString(asRecord(item.itemInfo).title);
  const imageURL =
    asString(item.imageURL) ||
    asString(item.imageUrl) ||
    asString(asRecord(item.image).url);
  const detailPageURL =
    asString(item.detailPageURL) ||
    asString(item.detailPageUrl) ||
    asString(item.url);
  if (!asin || !title || !imageURL || !detailPageURL) return null;
  const price = asRecord(item.price);
  return {
    asin,
    title,
    brand: asString(item.brand) || undefined,
    imageURL,
    detailPageURL,
    price: {
      amount: asNumber(price.amount) ?? asNumber(item.price),
      currency: asString(price.currency) || amazonLocale().currency,
    },
  };
}

function mapItem(item: AmazonItem): CatalogProduct | null {
  const title = item.title?.trim();
  const imageUrl = item.imageURL?.trim();
  const productUrl = item.detailPageURL?.trim();
  const asin = item.asin?.trim();
  if (!title || !imageUrl || !productUrl || !asin) return null;

  const mapped = {
    id: `amazon-${asin}`,
    merchant: 'amazon' as const,
    merchantProductId: asin,
    title,
    brand: item.brand,
    price: item.price?.amount,
    currency: item.price?.currency || amazonLocale().currency,
    imageUrl,
    productUrl,
    affiliateUrl: withAssociateTag(productUrl),
    category: 'fashion',
    availability: true,
    attributes: title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((part) => part.length > 3),
    attributeScores: deriveAttributes(title),
  };
  return isDressListing(mapped.title, mapped.category, mapped.imageUrl) ? mapped : null;
}

function collectItems(body: unknown): unknown[] {
  const root = asRecord(body);
  const search = asRecord(root.SearchResult);
  if (Array.isArray(search.Items)) return search.Items;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.products)) return root.products;
  if (Array.isArray(root.results)) return root.results;
  return [];
}

function parseAmazonBody(body: unknown): CatalogProduct[] {
  return collectItems(body)
    .map((item) => fromPaapiItem(item) ?? fromCreatorsItem(item))
    .map((item) => (item ? mapItem(item) : null))
    .filter((item): item is CatalogProduct => Boolean(item));
}

async function searchCreators(query: string): Promise<CatalogProduct[]> {
  const key = catalogEnv('AMAZON_CREATORS_API_KEY');
  if (!key) return [];
  const endpoint =
    catalogEnv('AMAZON_CREATORS_API_ENDPOINT') ||
    'https://creators-api.amazon.com/catalog/v1/search';
  const partnerTag = catalogEnv('AMAZON_ASSOCIATE_TAG');
  const url = new URL(endpoint);
  url.searchParams.set('keywords', query);
  url.searchParams.set('searchIndex', catalogEnv('AMAZON_SEARCH_INDEX') || 'Fashion');
  url.searchParams.set('itemCount', '10');
  if (partnerTag) url.searchParams.set('partnerTag', partnerTag);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return [];
  return parseAmazonBody(await res.json());
}

export function amazonConfigured() {
  return amazonPaapiConfigured() || Boolean(catalogEnv('AMAZON_CREATORS_API_KEY'));
}

export class AmazonSource implements ProductSource {
  async search(query: string): Promise<CatalogProduct[]> {
    try {
      if (amazonPaapiConfigured()) {
        const body = await searchPaapi(query);
        const products = parseAmazonBody(body);
        if (products.length) return products;
      }
      return await searchCreators(query);
    } catch {
      return [];
    }
  }
}

export const amazonSource = new AmazonSource();
