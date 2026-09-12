import type { AttributeCategory } from '../../types';
import type {
  AnalysisAttribute,
  AnalyzeRequest,
  AnalyzeResponse,
  TagSide,
} from './types';
import { TAG_SIDES } from './types';

const MODEL = 'gemini-2.0-flash';

const SYSTEM = `You analyze fashion shopping inspiration (photo and/or text).
Return JSON only with this shape:
{"fashion":boolean,"attributes":[{"id":"camelCase","label":"Short label","category":"visual|inferred|user-context","weight":0.8,"text":"Short status line","tag":"Optional tag","tagSide":"left"}],"catalogQuery":"search words"}

fashion is true only for clothing, shoes, bags, jewelry, outfits, or fashion photography.
fashion is false for food, interiors, cars, animals, memes, landscapes, or anything not apparel.
If fashion is false: attributes must be [] and catalogQuery must be "".
If fashion is true: return 6 to 10 attributes. weight is 0 to 1. text is a status line like "Holding onto this plum". tag is optional. tagSide is one of left, right, left-low, left-high, right-high, right-low.
catalogQuery is 2 to 5 DummyJSON search keywords (example: "black evening gown").`;

const CATEGORIES: AttributeCategory[] = ['visual', 'inferred', 'user-context'];

function parseModelJson(raw: string): unknown {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(trimmed) as unknown;
}

function asAttribute(value: unknown, index: number): AnalysisAttribute | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!label) return null;
  const id =
    typeof row.id === 'string' && row.id.trim()
      ? row.id.trim()
      : `attr${index}`;
  const category = CATEGORIES.includes(row.category as AttributeCategory)
    ? (row.category as AttributeCategory)
    : 'visual';
  const weight = Math.min(1, Math.max(0, Number(row.weight) || 0.6));
  const text =
    typeof row.text === 'string' && row.text.trim()
      ? row.text.trim()
      : `Noticing ${label.toLowerCase()}`;
  const tag = typeof row.tag === 'string' && row.tag.trim() ? row.tag.trim() : undefined;
  const tagSide = TAG_SIDES.includes(row.tagSide as TagSide)
    ? (row.tagSide as TagSide)
    : undefined;
  return { id, label, category, weight, text, tag, tagSide };
}

function env(name: string) {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name];
}

export async function analyzeWithGemini(
  request: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const key = env('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const parts: Record<string, unknown>[] = [{ text: SYSTEM }];
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.4,
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

  const parsed = parseModelJson(text) as Record<string, unknown>;
  const fashion = Boolean(parsed.fashion);
  if (!fashion) {
    return { fashion: false, attributes: [], catalogQuery: '' };
  }

  const rawAttrs = Array.isArray(parsed.attributes) ? parsed.attributes : [];
  const attributes = rawAttrs
    .map((item, index) => asAttribute(item, index))
    .filter((item): item is AnalysisAttribute => Boolean(item))
    .slice(0, 10);

  const catalogQuery =
    typeof parsed.catalogQuery === 'string'
      ? parsed.catalogQuery.replace(/[^\w\s-]/g, ' ').trim().slice(0, 80)
      : '';

  return { fashion: true, attributes, catalogQuery };
}
