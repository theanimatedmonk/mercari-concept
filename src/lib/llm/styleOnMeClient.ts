import type { StyleOnMeRequest, StyleOnMeResponse } from './types.js';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.86;

type ErrorBody = { error?: string };

function parseBody(raw: string): StyleOnMeResponse | ErrorBody {
  try {
    return JSON.parse(raw) as StyleOnMeResponse | ErrorBody;
  } catch {
    if (/FUNCTION_INVOCATION_TIMEOUT/i.test(raw)) {
      throw new Error('Style it on me timed out. Try again.');
    }
    if (/FUNCTION_INVOCATION_FAILED/i.test(raw)) {
      throw new Error('Style it on me crashed. Check XAI_API_KEY and function logs.');
    }
    throw new Error('Style it on me failed');
  }
}

export function catalogImageUrl(image: string) {
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:')) {
    return image;
  }
  if (image.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${image}`;
  }
  return image;
}

export function asGeneratedSrc(imageBase64: string, mimeType = 'image/jpeg') {
  const raw = imageBase64.includes(',') ? (imageBase64.split(',').pop() ?? imageBase64) : imageBase64;
  return `data:${mimeType};base64,${raw}`;
}

export async function fileToImagePayload(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read that photo');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const preview = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const imageBase64 = preview.split(',')[1] ?? '';
  if (!imageBase64) throw new Error('Could not read that photo');
  return { preview, imageBase64, mimeType: 'image/jpeg' };
}

export async function requestStyleOnMe(
  payload: StyleOnMeRequest,
): Promise<StyleOnMeResponse> {
  const res = await fetch('/api/style-on-me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = parseBody(await res.text());
  if (!res.ok) {
    const message = 'error' in data && data.error ? data.error : 'Style it on me failed';
    throw new Error(message);
  }
  if (!('imageBase64' in data) || !data.imageBase64) {
    throw new Error('Style it on me returned no image');
  }
  return data;
}
