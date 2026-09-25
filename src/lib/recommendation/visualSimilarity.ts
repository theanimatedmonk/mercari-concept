import type { RetrievedProduct } from './types.js';

export type Rgb = { r: number; g: number; b: number };

const paletteCache = new Map<string, Rgb | null>();

export async function extractPaletteFromUrl(url: string): Promise<Rgb | null> {
  if (paletteCache.has(url)) return paletteCache.get(url) ?? null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      paletteCache.set(url, null);
      return null;
    }
    const buffer = new Uint8Array(await res.arrayBuffer());
    const rgb = averageColorFromBuffer(buffer);
    paletteCache.set(url, rgb);
    return rgb;
  } catch {
    paletteCache.set(url, null);
    return null;
  }
}

function averageColorFromBuffer(bytes: Uint8Array): Rgb | null {
  if (bytes.length < 24) return null;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < bytes.length; i += 97) {
    r += bytes[i];
    g += bytes[Math.min(bytes.length - 1, i + 1)];
    b += bytes[Math.min(bytes.length - 1, i + 2)];
    count += 1;
  }
  if (!count) return null;
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

export function colorSimilarity(a: Rgb | null, b: Rgb | null) {
  if (!a || !b) return 0;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  return Math.max(0, 1 - distance / 441);
}

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return false;
    if (host.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

export async function attachVisualScores(
  products: RetrievedProduct[],
  inspirationImageUrl: string,
): Promise<RetrievedProduct[]> {
  if (!isPublicHttpUrl(inspirationImageUrl)) return products;
  const inspiration = await extractPaletteFromUrl(inspirationImageUrl);
  if (!inspiration) return products;

  const limited = products.slice(0, 24);
  const scored = await Promise.all(
    limited.map(async (product) => {
      const palette = await extractPaletteFromUrl(product.imageUrl);
      const visualScore = colorSimilarity(inspiration, palette);
      return { ...product, visualScore };
    }),
  );

  const tail = products.slice(24);
  return [...scored, ...tail];
}
