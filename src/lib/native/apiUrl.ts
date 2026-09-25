import { Capacitor, CapacitorHttp } from '@capacitor/core';

const DEFAULT_ORIGIN = 'https://www.lookmind.site';

export function apiOrigin() {
  return (import.meta.env.VITE_API_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '');
}

export function apiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!Capacitor.isNativePlatform()) return normalized;
  return `${apiOrigin()}${normalized}`;
}

export function publicHttpUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return undefined;
    if (host.endsWith('.local')) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function headerMap(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
}

/** Native HTTP for JSON APIs. Bypasses WebView CORS and follows Vercel redirects. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(path);
  if (!Capacitor.isNativePlatform()) return fetch(url, init);

  const method = (init?.method ?? 'GET').toUpperCase();
  let data: unknown;
  if (typeof init?.body === 'string' && init.body) {
    try {
      data = JSON.parse(init.body);
    } catch {
      data = init.body;
    }
  }

  const result = await CapacitorHttp.request({
    url,
    method,
    headers: headerMap(init?.headers),
    data,
    connectTimeout: 30_000,
    readTimeout: 90_000,
  });

  const body =
    typeof result.data === 'string' ? result.data : JSON.stringify(result.data ?? null);
  return new Response(body, {
    status: result.status,
    headers: result.headers ?? { 'Content-Type': 'application/json' },
  });
}
