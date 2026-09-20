import { deriveAttributes } from '../catalog/deriveAttributes';
import type { CatalogProduct, MerchantId } from './types';

type FeedRow = Record<string, string>;

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): FeedRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows: FeedRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const row: FeedRow = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function pick(row: FeedRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value) return value;
  }
  return '';
}

function parsePrice(raw: string) {
  const match = raw.match(/([\d,.]+)/);
  if (!match) return undefined;
  const value = Number.parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

function rowToProduct(row: FeedRow, merchant: MerchantId, index: number): CatalogProduct | null {
  const title = pick(row, ['title', 'name', 'product_name']);
  const link = pick(row, ['link', 'product_url', 'url']);
  const imageUrl = pick(row, ['image_link', 'image', 'image url', 'thumbnail']);
  if (!title || !link || !imageUrl) return null;

  const id = pick(row, ['id', 'sku', 'product_id']) || `${merchant}-${index}`;
  const brand = pick(row, ['brand', 'manufacturer']);
  const description = pick(row, ['description', 'summary']);
  const blob = [title, description, pick(row, ['product_type', 'category'])].join(' ');
  const priceRaw = pick(row, ['price', 'sale_price', 'current price']);
  const currency = /₹|inr/i.test(priceRaw) ? 'INR' : 'USD';

  return {
    id: `${merchant}-${id}`,
    merchant,
    merchantProductId: id,
    title,
    brand: brand || undefined,
    price: parsePrice(priceRaw),
    currency,
    imageUrl,
    productUrl: link,
    affiliateUrl: pick(row, ['affiliate_link', 'deeplink']) || link,
    category: pick(row, ['product_type', 'google_product_category', 'category']) || 'fashion',
    availability: !/out of stock/i.test(pick(row, ['availability', 'stock'])),
    attributes: blob.toLowerCase().split(/[^a-z0-9]+/).filter((part) => part.length > 3),
    attributeScores: deriveAttributes(blob),
  };
}

export function parseProductFeed(text: string, merchant: MerchantId): CatalogProduct[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      const rows = Array.isArray(json)
        ? json
        : typeof json === 'object' && json && 'products' in json
          ? (json as { products: unknown[] }).products
          : [];
      return rows
        .map((item, index) => {
          if (!item || typeof item !== 'object') return null;
          const row: FeedRow = {};
          for (const [key, value] of Object.entries(item)) {
            row[key.toLowerCase()] = String(value ?? '');
          }
          return rowToProduct(row, merchant, index);
        })
        .filter((item): item is CatalogProduct => Boolean(item));
    } catch {
      return [];
    }
  }

  return parseCsv(trimmed)
    .map((row, index) => rowToProduct(row, merchant, index))
    .filter((item): item is CatalogProduct => Boolean(item));
}
