import type { Product } from '../../types.js';
import type { CatalogProduct, RankedCatalogProduct } from './types.js';

function formatPrice(product: CatalogProduct) {
  if (product.price == null) return '';
  const symbol =
    product.currency === 'INR'
      ? '₹'
      : product.currency === 'EUR'
        ? '€'
        : product.currency === 'AED'
          ? 'AED '
          : '$';
  return `${symbol}${Math.round(product.price)}`;
}

export function normalizeCatalogImage(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^http:\/\/(?!localhost|127\.0\.0\.1)/i.test(trimmed)) {
    return `https://${trimmed.slice('http://'.length)}`;
  }
  return trimmed;
}

export function catalogToProduct(product: CatalogProduct): Product {
  return {
    id: product.merchantProductId ?? product.id,
    name: product.title,
    price: formatPrice(product),
    condition:
      product.merchant === 'luxurycloset'
        ? 'Pre-owned'
        : product.availability === false
          ? 'Unavailable'
          : 'New',
    seller: product.brand ? `@${product.brand.replace(/\s+/g, '').toLowerCase()}` : `@${product.merchant}`,
    image: normalizeCatalogImage(product.imageUrl),
    attributes: product.attributeScores ?? {},
    cluster: 'style-match',
    merchant: product.merchant,
    productUrl: product.affiliateUrl ?? product.productUrl,
  };
}

export function merchantLabel(merchant: Product['merchant']) {
  if (merchant === 'myntra') return 'Myntra';
  if (merchant === 'amazon') return 'Amazon';
  if (merchant === 'aliexpress') return 'AliExpress';
  if (merchant === 'luxurycloset') return 'The Luxury Closet';
  if (merchant === 'mock') return 'Marketplace';
  return undefined;
}

export function merchantShopUrl(product: Product) {
  const raw = product.productUrl?.trim();
  if (!raw) return undefined;
  if (raw.startsWith('/api/catalog/out')) return raw;
  return `/api/catalog/out?target=${encodeURIComponent(raw)}`;
}

export function explanationFromRank(
  ranked: RankedCatalogProduct,
  attributes: { id: string; label: string; state: string; weight: number }[],
) {
  const matches: string[] = [];
  const less: string[] = [];
  for (const attr of attributes) {
    if (attr.state === 'deleted') continue;
    const value = ranked.attributeScores?.[attr.id] ?? 0;
    const weight = attr.state === 'locked' ? 1 : attr.weight;
    if (value >= 0.55 && weight >= 0.55) matches.push(attr.label);
    if (value >= 0.5 && weight <= 0.35) less.push(attr.label);
  }
  return { matches, less };
}
