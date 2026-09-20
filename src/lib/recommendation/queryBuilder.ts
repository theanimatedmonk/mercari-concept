import type { IntentSnapshot } from './types.js';

const DRESS_TAIL = 'dress';

function uniquePhrases(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const phrase = raw.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!phrase || seen.has(phrase)) continue;
    seen.add(phrase);
    out.push(phrase);
  }
  return out;
}

function pickLabels(intent: IntentSnapshot, limit: number) {
  const ranked = [...intent.attributes]
    .filter((attr) => !attr.deleted)
    .sort((a, b) => {
      const lockA = a.locked ? 1 : 0;
      const lockB = b.locked ? 1 : 0;
      if (lockA !== lockB) return lockB - lockA;
      const ctxA = a.category === 'user-context' ? 1 : 0;
      const ctxB = b.category === 'user-context' ? 1 : 0;
      if (ctxA !== ctxB) return ctxB - ctxA;
      return b.weight - a.weight;
    });
  return uniquePhrases(ranked.map((row) => row.label)).slice(0, limit);
}

function joinQuery(parts: string[]) {
  const body = parts.filter(Boolean).join(' ').trim();
  if (!body) return '';
  return body.toLowerCase().includes('dress') ? body : `${body} ${DRESS_TAIL}`;
}

/** Deterministic 2–4 natural shopping queries from semantic state. */
export function buildProductQueries(intent: IntentSnapshot): string[] {
  const labels = pickLabels(intent, 6);
  const locked = intent.attributes.filter((a) => a.locked && !a.deleted).map((a) => a.label);
  const context = intent.attributes
    .filter((a) => !a.deleted && a.category === 'user-context')
    .map((a) => a.label);
  const visual = intent.attributes
    .filter((a) => !a.deleted && a.category !== 'user-context')
    .sort((a, b) => b.weight - a.weight)
    .map((a) => a.label);

  const queries: string[] = [];
  if (intent.catalogQuery) queries.push(intent.catalogQuery.trim());

  if (locked.length) {
    queries.push(joinQuery([...locked, ...context.slice(0, 2), DRESS_TAIL]));
  }

  if (visual.length >= 2) {
    queries.push(joinQuery([visual[0], visual[1], context[0] ?? '', DRESS_TAIL]));
  }

  if (labels.length >= 3) {
    queries.push(joinQuery([labels[0], labels[1], labels[2]]));
  } else if (labels.length) {
    queries.push(joinQuery(labels));
  }

  if (!queries.length) queries.push('evening dress');

  return uniquePhrases(queries).slice(0, 4);
}
