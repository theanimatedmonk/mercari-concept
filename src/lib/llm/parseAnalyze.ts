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
If fashion is true: return 6 to 10 attributes. weight is 0 to 1. text is a status line like "Holding onto this plum". tag MUST be the same short phrase as label. tagSide is one of left, right, left-low, left-high, right-high, right-low.
catalogQuery is 2 to 5 shopping keywords for a women's dress search (example: "black silk midi dress").`;

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

function extractJsonObjectsAfterKey(raw: string, key: string): unknown[] {
  const marker = new RegExp(`"${key}"\\s*:\\s*\\[`);
  const found = marker.exec(raw);
  if (!found) return [];
  const objects: unknown[] = [];
  let depth = 0;
  let inStr = false;
  let escape = false;
  let start = -1;
  for (let i = found.index + found[0].length; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          objects.push(JSON.parse(raw.slice(start, i + 1)));
        } catch {
          /* object still incomplete */
        }
        start = -1;
      }
      continue;
    }
    if (ch === ']' && depth === 0) break;
  }
  return objects;
}

export function readStreamedAttributes(raw: string): {
  fashion: boolean | null;
  attributes: AnalysisAttribute[];
} {
  const fashionMatch = raw.match(/"fashion"\s*:\s*(true|false)/);
  const fashion = fashionMatch ? fashionMatch[1] === 'true' : null;
  if (fashion === false) return { fashion, attributes: [] };
  const attributes = extractJsonObjectsAfterKey(raw, 'attributes')
    .map((item, index) => asAttribute(item, index))
    .filter((item): item is AnalysisAttribute => Boolean(item));
  return { fashion, attributes };
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
