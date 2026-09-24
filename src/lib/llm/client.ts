import { keyForQuestion } from './nudgeCatalog.js';
import type {
  AnalysisAttribute,
  AnalyzeErrorBody,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeStreamEvent,
  JevNudge,
  JevNudgeRequest,
} from './types.js';
import { EMPTY_NUDGE } from './types.js';

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

export async function fetchInspirationFromUrl(url: string): Promise<{
  preview: string;
  mimeType: string;
}> {
  const res = await fetch('/api/inspiration/from-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as {
    error?: string;
    imageBase64?: string;
    mimeType?: string;
  };
  if (!res.ok || !data.imageBase64) {
    throw new Error(data.error || "Couldn't find a photo at that link.");
  }
  const binary = atob(data.imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const mimeType = data.mimeType || 'image/jpeg';
  const blob = new Blob([bytes], { type: mimeType });
  return { preview: URL.createObjectURL(blob), mimeType };
}

export async function requestJevNudge(
  payload: JevNudgeRequest,
  signal?: AbortSignal,
): Promise<JevNudge> {
  const res = await fetch('/api/jev/nudge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = (await res.json().catch(() => EMPTY_NUDGE)) as JevNudge & { error?: string };
  if (!res.ok) return EMPTY_NUDGE;
  const question = typeof data.question === 'string' ? data.question.trim() : '';
  const options = Array.isArray(data.options)
    ? data.options.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
  if (!question || options.length < 3) return EMPTY_NUDGE;
  const key =
    (typeof data.key === 'string' ? data.key.trim() : '') || keyForQuestion(question);
  return { key, question, options };
}
