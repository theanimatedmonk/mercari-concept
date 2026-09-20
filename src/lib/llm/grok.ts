import {
  ANALYZE_SYSTEM,
  normalizeAnalyze,
  parseModelJson,
  readStreamedAttributes,
} from './parseAnalyze.js';
import type { AnalysisAttribute, AnalyzeRequest, AnalyzeResponse } from './types.js';

const MODEL = 'grok-4.6';

function env(name: string) {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name];
}

function grokMessages(request: AnalyzeRequest) {
  const prompt = request.text?.trim()
    ? `${ANALYZE_SYSTEM}\n\nUser text:\n${request.text.trim()}`
    : `${ANALYZE_SYSTEM}\n\nNo extra text. Use the image only.`;

  const content: Record<string, unknown>[] = [{ type: 'text', text: prompt }];
  if (request.imageBase64) {
    const mime = request.mimeType || 'image/jpeg';
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${mime};base64,${request.imageBase64}`,
        detail: 'high',
      },
    });
  }
  return [{ role: 'user', content }];
}

function grokHeaders(key: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
}

export async function analyzeWithGrok(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const key = env('XAI_API_KEY');
  if (!key) throw new Error('XAI_API_KEY is not set');

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: grokHeaders(key),
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: grokMessages(request),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`xAI ${res.status}: ${detail.slice(0, 200)}`);
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error('xAI returned an empty response');

  return normalizeAnalyze(parseModelJson(text) as Record<string, unknown>);
}

export async function analyzeWithGrokStream(
  request: AnalyzeRequest,
  onAttribute: (attribute: AnalysisAttribute) => void,
): Promise<AnalyzeResponse> {
  const key = env('XAI_API_KEY');
  if (!key) throw new Error('XAI_API_KEY is not set');

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: grokHeaders(key),
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: grokMessages(request),
    }),
  });
  if (!res.ok || !res.body) {
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`xAI ${res.status}: ${detail.slice(0, 200)}`);
    }
    return analyzeWithGrok(request);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sse = '';
  let text = '';
  let emitted = 0;

  const flushPartial = () => {
    const next = readStreamedAttributes(text);
    if (next.fashion === false) return next;
    if (next.attributes.length > emitted) {
      next.attributes.slice(emitted).forEach(onAttribute);
      emitted = next.attributes.length;
    }
    return next;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    sse += decoder.decode(value, { stream: true });
    const lines = sse.split('\n');
    sse = lines.pop() ?? '';
    for (const line of lines) {
      const payload = line.trim();
      if (!payload.startsWith('data:')) continue;
      const data = payload.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const piece = json.choices?.[0]?.delta?.content;
        if (typeof piece === 'string') {
          text += piece;
          const partial = flushPartial();
          if (partial.fashion === false) {
            await reader.cancel().catch(() => undefined);
            return { fashion: false, attributes: [], catalogQuery: '' };
          }
        }
      } catch {
        /* keep buffering */
      }
    }
  }

  flushPartial();
  if (!text.trim()) return analyzeWithGrok(request);
  try {
    return normalizeAnalyze(parseModelJson(text) as Record<string, unknown>);
  } catch {
    const partial = readStreamedAttributes(text);
    if (partial.fashion === false) {
      return { fashion: false, attributes: [], catalogQuery: '' };
    }
    return {
      fashion: true,
      attributes: partial.attributes,
      catalogQuery: '',
    };
  }
}
