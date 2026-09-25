import { catalogEnv } from '../env.js';
import { catalogTextMatchesToken } from '../dressFilter.js';
import { parseProductFeed } from '../feedParse.js';
import { readParsedFeed, writeParsedFeed } from '../parsedFeedCache.js';
import type { CatalogProduct } from '../types.js';
import type { ProductSource } from './ProductSource.js';

const FEED_TTL_MS = 1000 * 60 * 60 * 6;
const CACHE_KEY = 'aliexpress';
const MAX_FEED_BYTES = 28_000_000;
const MAX_KEEP = 1200;

const SKIP =
  /\b(tool parts?|kitchen|dining|bar|toy figures?|electrical equipment|stroller|laptop|tablet|motorcycle|computer components?|office electronics)\b/i;

const TEE =
  /\b(tops?\s*&\s*tees|t-shirts?|tshirts?|tees?|polo|shirt|shirts|hoodie|sweatshirt)\b/i;

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2);
}

function isTeeListing(product: CatalogProduct) {
  const hay = `${product.title} ${product.category ?? ''}`;
  if (SKIP.test(hay)) return false;
  return TEE.test(hay);
}

function scoreProduct(product: CatalogProduct, tokens: string[]) {
  if (!tokens.length) return 0;
  const hay = [product.title, product.brand ?? '', ...(product.attributes ?? [])]
    .join(' ')
    .toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (catalogTextMatchesToken(hay, token)) hits += 1;
  }
  return hits / tokens.length;
}

async function downloadCapped(url: string) {
  const res = await fetch(url, { headers: { Accept: 'text/csv, application/csv' } });
  if (!res.ok) throw new Error(`AliExpress feed ${res.status}`);
  if (!res.body) return res.text();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let bytes = 0;
  while (bytes < MAX_FEED_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    await reader.cancel();
  } catch {
    /* already closed */
  }
  return text;
}

let inflight: Promise<CatalogProduct[]> | null = null;

async function downloadAndParse(url: string) {
  const text = await downloadCapped(url);
  const products = parseProductFeed(text, 'aliexpress')
    .filter(isTeeListing)
    .slice(0, MAX_KEEP);
  if (products.length) await writeParsedFeed(CACHE_KEY, products, FEED_TTL_MS);
  return products;
}

async function loadFeed(): Promise<CatalogProduct[]> {
  const url = catalogEnv('ALIEXPRESS_AFFILIATE_FEED_URL');
  if (!url) return [];

  const cached = await readParsedFeed(CACHE_KEY, FEED_TTL_MS);
  if (cached?.length) return cached;

  if (!inflight) {
    inflight = downloadAndParse(url).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function aliexpressConfigured() {
  return Boolean(catalogEnv('ALIEXPRESS_AFFILIATE_FEED_URL'));
}

export class AliExpressSource implements ProductSource {
  async search(query: string): Promise<CatalogProduct[]> {
    try {
      const feed = await loadFeed();
      if (!feed.length) return [];
      const tokens = tokenize(query);
      const ranked = feed
        .map((product) => ({ product, score: scoreProduct(product, tokens) }))
        .sort((a, b) => b.score - a.score);
      const matched = tokens.length
        ? ranked.filter((row) => row.score > 0).map((row) => row.product)
        : ranked.map((row) => row.product);
      const seen = new Set(matched.map((item) => item.id));
      const rest = feed.filter((item) => !seen.has(item.id));
      return [...matched, ...rest].slice(0, 24);
    } catch {
      return [];
    }
  }
}

export const aliexpressSource = new AliExpressSource();
