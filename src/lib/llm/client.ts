import type { AnalyzeErrorBody, AnalyzeRequest, AnalyzeResponse } from './types.js';

function parseAnalyzeBody(raw: string): AnalyzeResponse | AnalyzeErrorBody {
  try {
    return JSON.parse(raw) as AnalyzeResponse | AnalyzeErrorBody;
  } catch {
    if (/FUNCTION_INVOCATION_TIMEOUT/i.test(raw)) {
      throw new Error('Analyze timed out on Vercel. Try a shorter prompt.');
    }
    if (/FUNCTION_INVOCATION_FAILED/i.test(raw)) {
      throw new Error(
        'Analyze crashed on Vercel. Check GEMINI_API_KEY / XAI_API_KEY and function logs.',
      );
    }
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(
      snippet.startsWith('{')
        ? 'Analyze returned invalid JSON'
        : snippet || 'Analyze failed',
    );
  }
}

export async function requestAnalyze(
  payload: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = parseAnalyzeBody(await res.text());
  if (!res.ok) {
    const message = 'error' in data ? data.error : 'Analyze failed';
    throw new Error(message);
  }
  return data as AnalyzeResponse;
}

export async function imageUrlToBase64(url: string): Promise<{
  imageBase64: string;
  mimeType: string;
}> {
  const res = await fetch(url);
  const blob = await res.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return {
    imageBase64: btoa(binary),
    mimeType: blob.type || 'image/jpeg',
  };
}
