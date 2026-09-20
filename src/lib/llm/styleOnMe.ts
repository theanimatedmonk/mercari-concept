import type { StyleOnMeRequest, StyleOnMeResponse } from './types.js';

const MODEL = 'grok-imagine-image-2.0';
const FETCH_HEADERS = {
  Accept: 'image/*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

function env(name: string) {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name];
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function asDataUri(base64: string, mimeType: string) {
  const mime = mimeType || 'image/jpeg';
  const raw = base64.includes(',') ? (base64.split(',').pop() ?? base64) : base64;
  return `data:${mime};base64,${raw}`;
}

function imageRef(url: string) {
  return { url, type: 'image_url' as const };
}

async function urlToDataUri(url: string) {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) {
    throw new Error('Could not read the product image');
  }
  const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const bytes = new Uint8Array(await res.arrayBuffer());
  return asDataUri(bytesToBase64(bytes), mime);
}

async function resolveProductUri(request: StyleOnMeRequest) {
  if (request.productImageBase64) {
    return asDataUri(request.productImageBase64, request.productMimeType || 'image/jpeg');
  }
  const url = request.productImageUrl?.trim();
  if (!url) throw new Error('Provide a product image');
  return urlToDataUri(url);
}

function pickImage(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const row = data as {
    data?: { b64_json?: string; url?: string }[];
    b64_json?: string;
    url?: string;
  };
  const first = Array.isArray(row.data) ? row.data[0] : row;
  if (first?.b64_json) {
    return { imageBase64: first.b64_json, mimeType: 'image/jpeg' };
  }
  if (first?.url) return { url: first.url };
  return null;
}

export async function runStyleOnMe(
  request: StyleOnMeRequest,
): Promise<StyleOnMeResponse> {
  const key = env('XAI_API_KEY');
  if (!key) throw new Error('XAI_API_KEY is not set');
  if (!request.userImageBase64) throw new Error('Provide a photo of you');

  const personUri = asDataUri(request.userImageBase64, request.userMimeType || 'image/jpeg');
  const productUri = await resolveProductUri(request);
  const garment = request.productName?.trim() || 'this garment';

  const prompt = [
    'Virtual try-on photograph.',
    '<IMAGE_0> is a photo of the person. Keep their face, body, skin tone, hair, pose, and setting.',
    `<IMAGE_1> is the fashion product (${garment}). Dress the person in that exact piece.`,
    'Match the product color, silhouette, fabric, and details. Photorealistic, full-body if the person photo allows it.',
  ].join(' ');

  const refs = [imageRef(personUri), imageRef(productUri)];
  const shared = {
    model: MODEL,
    prompt,
    aspect_ratio: '3:4',
    resolution: '1k',
    quality: 'medium',
    response_format: 'b64_json',
  };

  let status = 0;
  let parsed: unknown = null;

  for (const extra of [{ images: refs }, { image: refs }]) {
    const res = await fetch('https://api.x.ai/v1/images/edits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ ...shared, ...extra }),
    });
    status = res.status;
    try {
      parsed = JSON.parse(await res.text()) as unknown;
    } catch {
      parsed = null;
    }
    if (res.ok) break;
    if (res.status !== 400) break;
  }

  if (status < 200 || status >= 300) {
    const err =
      parsed && typeof parsed === 'object'
        ? (parsed as { error?: { message?: string } | string })
        : null;
    const message =
      typeof err?.error === 'string'
        ? err.error
        : err?.error && typeof err.error === 'object'
          ? err.error.message
          : `Style it on me failed (${status})`;
    throw new Error(message || `Style it on me failed (${status})`);
  }

  if (!parsed) throw new Error('Style it on me returned invalid JSON');

  const picked = pickImage(parsed);
  if (!picked) throw new Error('Style it on me returned no image');
  if (picked.imageBase64) {
    return { imageBase64: picked.imageBase64, mimeType: picked.mimeType || 'image/jpeg' };
  }
  if (!picked.url) throw new Error('Style it on me returned no image');

  const fetched = await fetch(picked.url, { headers: FETCH_HEADERS });
  if (!fetched.ok) throw new Error('Could not download the generated look');
  const mime = fetched.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const bytes = new Uint8Array(await fetched.arrayBuffer());
  return { imageBase64: bytesToBase64(bytes), mimeType: mime };
}
