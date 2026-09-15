import { ANALYZE_SYSTEM, normalizeAnalyze, parseModelJson } from './parseAnalyze.js';
import { timedFetch } from './timedFetch.js';
import type { AnalyzeRequest, AnalyzeResponse } from './types.js';

const MODEL = 'grok-4.6';

function env(name: string) {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name];
}

export async function analyzeWithGrok(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const key = env('XAI_API_KEY');
  if (!key) throw new Error('XAI_API_KEY is not set');

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
        detail: 'low',
      },
    });
  }

  const res = await timedFetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
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
