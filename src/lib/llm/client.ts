import type { AnalyzeErrorBody, AnalyzeRequest, AnalyzeResponse } from './types';

export async function requestAnalyze(
  payload: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as AnalyzeResponse | AnalyzeErrorBody;
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
