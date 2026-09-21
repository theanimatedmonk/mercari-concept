import { catalogEnv } from '../env.js';
import { catalogTextMatchesToken, isDressListing } from '../dressFilter.js';
import { parseProductFeed } from '../feedParse.js';
import type { CatalogProduct } from '../types.js';
import type { ProductSource } from './ProductSource.js';

const FEED_TTL_MS = 1000 * 60 * 30;
const MAX_FEED_BYTES = 32_000_000;
const MAX_KEEP = 800;

let cachedFeed: { at: number; products: CatalogProduct[] } | null = null;

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2);
}

function isWomenDress(product: CatalogProduct) {
  const hay = `${product.title} ${product.category ?? ''}`;
  if (/\bkids?\b|\b\d+\s*yrs?\b|\b\d+-\d+\s*m\b/i.test(hay)) return false;
  if (!/women/i.test(hay)) return false;
  if (/women'?s clothes,\s*dresses/i.test(product.category ?? '')) return true;
  return isDressListing(product.title, product.category ?? '', product.imageUrl);
}

function scoreProduct(product: CatalogProduct, tokens: string[]) {
  if (!tokens.length) return 0;
  const hay = [product.title, product.brand ?? '', product.category ?? '', ...(product.attributes ?? [])]
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
  if (!res.ok) throw new Error(`Luxury Closet feed ${res.status}`);
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

export function luxuryClosetFeedUrl() {
  return catalogEnv('LUXURYCLOSET_AFFILIATE_FEED_URL') || catalogEnv('LUXYRE_AFFILIATE_FEED_URL');
}

async function loadFeed(): Promise<CatalogProduct[]> {
  const url = luxuryClosetFeedUrl();
  if (!url) return [];

  if (cachedFeed && Date.now() - cachedFeed.at < FEED_TTL_MS) {
    return cachedFeed.products;
  }

  const text = await downloadCapped(url);
  const products = parseProductFeed(text, 'luxurycloset')
    .filter(isWomenDress)
    .slice(0, MAX_KEEP);
  cachedFeed = { at: Date.now(), products };
  return products;
}

export function luxuryClosetConfigured() {
  return Boolean(luxuryClosetFeedUrl());
}

export class LuxuryClosetSource implements ProductSource {
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

export const luxuryClosetSource = new LuxuryClosetSource();
