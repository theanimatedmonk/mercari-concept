import type {
  AnalysisAttribute,
  AnalyzeErrorBody,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeStreamEvent,
} from './types.js';

export const PILL_REVEAL_MS = 360;

function parseAnalyzeBody(raw: string): AnalyzeResponse | AnalyzeErrorBody {
  try {
    return JSON.parse(raw) as AnalyzeResponse | AnalyzeErrorBody;
  } catch {
    if (/FUNCTION_INVOCATION_TIMEOUT/i.test(raw)) {
      throw new Error('Analyze timed out on Vercel. Try a shorter prompt.');
    }
    if (/FUNCTION_INVOCATION_FAILED/i.test(raw)) {
      throw new Error(
        'Analyze crashed on Vercel. Check XAI_API_KEY and function logs.',
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

function emitStreamEvent(
  event: AnalyzeStreamEvent,
  onAttribute: (attribute: AnalysisAttribute) => void,
): AnalyzeResponse | null {
  if (event.type === 'attribute') {
    onAttribute(event.attribute);
    return null;
  }
  if (event.type === 'error') throw new Error(event.error);
  return event.result;
}

export async function requestAnalyzeStream(
  payload: AnalyzeRequest,
  onAttribute: (attribute: AnalysisAttribute) => void,
): Promise<AnalyzeResponse> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(payload),
  });
  const type = res.headers.get('content-type') ?? '';
  if (!res.body || !type.includes('event-stream')) {
    const data = parseAnalyzeBody(await res.text());
    if (!res.ok) {
      const message = 'error' in data ? data.error : 'Analyze failed';
      throw new Error(message);
    }
    const result = data as AnalyzeResponse;
    result.attributes.forEach(onAttribute);
    return result;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let doneResult: AnalyzeResponse | null = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split('\n\n');
    buf = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const line = chunk
        .split('\n')
        .find((row) => row.startsWith('data:'))
        ?.slice(5)
        .trim();
      if (!line) continue;
      try {
        const event = JSON.parse(line) as AnalyzeStreamEvent;
        const result = emitStreamEvent(event, onAttribute);
        if (result) doneResult = result;
      } catch {
        /* keep reading */
      }
    }
  }
  if (!res.ok) throw new Error('Analyze failed');
  if (!doneResult) throw new Error('Analyze returned an empty response');
  return doneResult;
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
