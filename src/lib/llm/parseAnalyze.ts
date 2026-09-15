import { slugId } from './slugId.js';
import type { AttributeCategory } from '../../types.js';
import type { AnalysisAttribute, AnalyzeResponse, TagSide } from './types.js';
import { TAG_SIDES } from './types.js';

export const ANALYZE_SYSTEM = `You analyze fashion shopping inspiration (photo and/or text).
Return JSON only with this shape:
{"fashion":boolean,"attributes":[{"id":"camelCase","label":"Short label","category":"visual|inferred|user-context","weight":0.8,"text":"Short status line","tag":"Short label","tagSide":"left"}],"catalogQuery":"search words"}

fashion is true only for clothing, shoes, bags, jewelry, outfits, or fashion photography.
fashion is false for food, interiors, cars, animals, memes, landscapes, or anything not apparel.
If fashion is false: attributes must be [] and catalogQuery must be "".
If fashion is true: return 6 attributes. weight is 0 to 1. text is a short status line. tag MUST match label. tagSide is left, right, left-low, left-high, right-high, or right-low.
catalogQuery is 2 to 5 DummyJSON search keywords (example: "black evening gown").`;

const CATEGORIES: AttributeCategory[] = ['visual', 'inferred', 'user-context'];

export function parseModelJson(raw: string): unknown {
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
  const id = slugId(
    typeof row.id === 'string' && row.id.trim() ? row.id.trim() : label,
    index,
  );
  const category = CATEGORIES.includes(row.category as AttributeCategory)
    ? (row.category as AttributeCategory)
    : 'visual';
  const weight = Math.min(1, Math.max(0, Number(row.weight) || 0.6));
  const text =
    typeof row.text === 'string' && row.text.trim()
      ? row.text.trim()
      : `Noticing ${label.toLowerCase()}`;
  const tag = label;
  const tagSide = TAG_SIDES.includes(row.tagSide as TagSide)
    ? (row.tagSide as TagSide)
    : undefined;
  return { id, label, category, weight, text, tag, tagSide };
}

export function normalizeAnalyze(parsed: Record<string, unknown>): AnalyzeResponse {
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
