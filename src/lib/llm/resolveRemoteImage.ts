const MAX_HTML_BYTES = 1_500_000;
const MAX_IMAGE_BYTES = 8_000_000;
const MAX_HOPS = 6;
const TIMEOUT_MS = 12_000;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
]);

export type ResolvedRemoteImage = {
  imageBase64: string;
  mimeType: string;
};

function hostOf(url: URL) {
  return url.hostname.replace(/\.$/, '').toLowerCase();
}

function isPinterestHost(host: string) {
  return host === 'pin.it' || /(^|\.)pinterest\.[a-z.]+$/.test(host);
}

function isInstagramHost(host: string) {
  return host === 'instagr.am' || /(^|\.)instagram\.com$/.test(host);
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIp(ip: string) {
  const mapped = ip.replace(/^::ffff:/i, '');
  if (mapped === '::1') return true;
  const lower = ip.toLowerCase();
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true;
  return isPrivateIpv4(mapped);
}

async function lookupAddresses(hostname: string) {
  try {
    const load = Function('specifier', 'return import(specifier)') as (
      specifier: string,
    ) => Promise<{
      lookup: (
        host: string,
        opts: { all: true },
      ) => Promise<{ address: string }[]>;
    }>;
    const dns = await load('node:dns/promises');
    return (await dns.lookup(hostname, { all: true })).map((row) => row.address);
  } catch {
    return [];
  }
}

async function assertPublicHttpUrl(raw: string, base?: string) {
  let parsed: URL;
  try {
    parsed = base ? new URL(raw, base) : new URL(raw);
  } catch {
    throw new Error('That link is not valid');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Use an http or https photo link');
  }
  const host = hostOf(parsed);
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost')) {
    throw new Error('That link is not valid');
  }
  if (isPrivateIpv4(host) || isPrivateIp(host)) {
    throw new Error('That link is not valid');
  }
  const addresses = await lookupAddresses(host);
  if (addresses.some(isPrivateIp)) {
    throw new Error('That link is not valid');
  }
  return parsed;
}

function refererFor(url: URL) {
  const host = hostOf(url);
  if (isPinterestHost(host) || host.includes('pinimg')) return 'https://www.pinterest.com/';
  if (isInstagramHost(host) || host.includes('cdninstagram') || host.includes('scontent')) {
    return 'https://www.instagram.com/';
  }
  return `${url.protocol}//${url.host}/`;
}

async function fetchHop(url: URL) {
  return fetch(url.toString(), {
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Accept: 'text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': UA,
      Referer: refererFor(url),
    },
  });
}

async function fetchFollowing(raw: string, base?: string) {
  let current = await assertPublicHttpUrl(raw, base);
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    const res = await fetchHop(current);
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = await assertPublicHttpUrl(location, current.toString());
      continue;
    }
    return { res, url: current };
  }
  throw new Error('That link kept redirecting');
}

async function readCapped(res: Response, max: number) {
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > max) throw new Error('That file is too large');
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new Error('That file is too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function sniffImageMime(bytes: Uint8Array, header: string | null) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  const type = header?.split(';')[0]?.trim().toLowerCase();
  if (type?.startsWith('image/') && type !== 'image/svg+xml') return type;
  return null;
}

function looksLikeHtml(bytes: Uint8Array, header: string | null) {
  const type = header?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (type.includes('html')) return true;
  const start = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(0, 160))
    .trim()
    .toLowerCase();
  return start.startsWith('<!doctype') || start.startsWith('<html') || start.startsWith('<?xml');
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/\\?\//g, '/')
    .replace(/\\u002f/gi, '/');
}

function attr(tag: string, name: string) {
  const match = new RegExp(`${name}\\s*=\\s*("([^"]+)"|'([^']+)')`, 'i').exec(tag);
  return match?.[2] ?? match?.[3] ?? null;
}

function pushUnique(list: string[], value: string | null | undefined) {
  if (!value) return;
  const cleaned = decodeEntities(value.trim());
  if (!cleaned || list.includes(cleaned)) return;
  list.push(cleaned);
}

function extractImageCandidates(html: string) {
  const found: string[] = [];
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metas) {
    const key = (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase();
    if (
      key === 'og:image' ||
      key === 'og:image:url' ||
      key === 'twitter:image' ||
      key === 'twitter:image:src'
    ) {
      pushUnique(found, attr(tag, 'content'));
    }
  }
  const display = /"display_url"\s*:\s*"([^"]+)"/.exec(html);
  pushUnique(found, display?.[1]);
  const thumbnail = /"thumbnail_url"\s*:\s*"([^"]+)"/.exec(html);
  pushUnique(found, thumbnail?.[1]);
  return found;
}

function hostError(url: URL) {
  const host = hostOf(url);
  if (isInstagramHost(host)) {
    return 'Instagram blocked that photo. Open the post, save the image, and drop it here.';
  }
  if (isPinterestHost(host)) {
    return 'Pinterest blocked that photo. Open the pin, save the image, and drop it here.';
  }
  return "Couldn't find a photo at that link.";
}

async function asImage(res: Response): Promise<ResolvedRemoteImage | null> {
  const header = res.headers.get('content-type');
  if (
    header?.includes('json') ||
    header?.includes('html') ||
    header?.includes('text/css') ||
    header?.includes('javascript')
  ) {
    return null;
  }
  const bytes = await readCapped(res, MAX_IMAGE_BYTES);
  const mime = sniffImageMime(bytes, header);
  if (!mime) return null;
  return { imageBase64: bytesToBase64(bytes), mimeType: mime };
}

async function fetchImage(raw: string, base?: string) {
  const { res, url } = await fetchFollowing(raw, base);
  if (!res.ok) throw new Error(hostError(url));
  const image = await asImage(res);
  if (!image) throw new Error(hostError(url));
  return image;
}

async function pinterestPidget(id: string) {
  try {
    const endpoint = await assertPublicHttpUrl(
      `https://widgets.pinterest.com/v3/pidgets/pins/info/?pin_ids=${encodeURIComponent(id)}`,
    );
    const { res } = await fetchFollowing(endpoint.toString());
    if (!res.ok) return null;
    const body = JSON.parse(new TextDecoder().decode(await readCapped(res, 400_000))) as {
      data?: { images?: Record<string, { url?: string }> }[];
    };
    const images = body.data?.[0]?.images;
    if (!images) return null;
    return images.orig?.url || images['564x']?.url || images['236x']?.url || null;
  } catch {
    return null;
  }
}

async function pinterestThumb(url: URL) {
  if (!isPinterestHost(hostOf(url))) return null;
  const pinId = /\/pin\/(\d+)/.exec(url.pathname)?.[1];
  if (pinId) {
    const widget = await pinterestPidget(pinId);
    if (widget) return widget;
  }
  try {
    const oembed = await assertPublicHttpUrl(
      `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url.toString())}`,
    );
    const { res } = await fetchFollowing(oembed.toString());
    if (!res.ok) return null;
    const body = JSON.parse(new TextDecoder().decode(await readCapped(res, 200_000))) as {
      thumbnail_url?: unknown;
      url?: unknown;
    };
    if (typeof body.thumbnail_url === 'string') return body.thumbnail_url;
    if (typeof body.url === 'string') return body.url;
  } catch {
    return null;
  }
  return null;
}

export async function resolveRemoteImage(raw: string): Promise<ResolvedRemoteImage> {
  const start = await assertPublicHttpUrl(raw.trim());
  const { res, url } = await fetchFollowing(start.toString());

  if (isPinterestHost(hostOf(url)) || isPinterestHost(hostOf(start))) {
    const pinThumb = await pinterestThumb(url);
    if (pinThumb) {
      try {
        return await fetchImage(pinThumb, url.toString());
      } catch {
        // Fall through to the fetched page.
      }
    }
  }

  if (!res.ok) throw new Error(hostError(url));

  const header = res.headers.get('content-type');
  if (!header?.includes('html') && !header?.includes('json')) {
    const direct = await asImage(res.clone());
    if (direct) return direct;
  }

  const bytes = await readCapped(res, MAX_HTML_BYTES);
  if (looksLikeHtml(bytes, header) || header?.includes('html')) {
    return fromHtml(bytes, url);
  }
  throw new Error(hostError(url));
}

async function fromHtml(bytes: Uint8Array, page: URL) {
  const html = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const candidates = extractImageCandidates(html);
  for (const candidate of candidates) {
    try {
      return await fetchImage(candidate, page.toString());
    } catch {
      // Try the next meta image.
    }
  }
  throw new Error(hostError(page));
}
