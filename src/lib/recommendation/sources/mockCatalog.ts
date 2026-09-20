import { products as demoProducts } from '../../../data/products';
import type { CatalogProduct, MerchantId } from '../types';

const MERCHANTS: MerchantId[] = ['myntra', 'mock', 'amazon'];

function merchantForIndex(index: number): MerchantId {
  return MERCHANTS[index % MERCHANTS.length];
}

function externalUrl(merchant: MerchantId, id: string) {
  if (merchant === 'myntra') {
    return `https://www.myntra.com/dresses/${id.replace(/^mock-/, '')}`;
  }
  if (merchant === 'amazon') {
    return `https://www.amazon.com/dp/${id.replace(/^mock-/, 'B0')}`;
  }
  return `https://example.com/products/${id}`;
}

export const MOCK_CATALOG: CatalogProduct[] = demoProducts.map((item, index) => {
  const merchant = merchantForIndex(index);
  const price = Number.parseInt(item.price.replace(/[^\d]/g, ''), 10) || undefined;
  const brand = item.seller.replace(/^@/, '');
  return {
    id: `mock-${item.id}`,
    merchant,
    merchantProductId: item.id,
    title: item.name,
    brand,
    price,
    currency: 'USD',
    imageUrl: item.image,
    productUrl: externalUrl(merchant, item.id),
    affiliateUrl: externalUrl(merchant, item.id),
    category: 'dress',
    availability: true,
    attributes: Object.keys(item.attributes),
    attributeScores: { ...item.attributes },
  };
});
