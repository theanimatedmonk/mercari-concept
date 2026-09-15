import { ANALYZE_SYSTEM, normalizeAnalyze, parseModelJson } from './parseAnalyze.js';
import { timedFetch } from './timedFetch.js';
import type { AnalyzeRequest, AnalyzeResponse } from './types.js';

const MODEL = 'gemini-2.5-flash';

function env(name: string) {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name];
}

export async function analyzeWithGemini(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const key = env('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const parts: Record<string, unknown>[] = [{ text: ANALYZE_SYSTEM }];
  const prompt = request.text?.trim()
    ? `User text:\n${request.text.trim()}`
    : 'No extra text. Use the image only.';
  parts.push({ text: prompt });
  if (request.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: request.mimeType || 'image/jpeg',
        data: request.imageBase64,
      },
    });
  }

  const res = await timedFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 200)}`);
  }
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty response');

  return normalizeAnalyze(parseModelJson(text) as Record<string, unknown>);
}
