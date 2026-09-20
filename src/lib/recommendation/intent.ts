import type { SemanticAttribute } from '../../types';
import { resolvedWeight } from '../scoring';
import type { IntentAttribute, IntentSnapshot } from './types';
import { buildProductQueries } from './queryBuilder';

const RETRIEVAL_WEIGHT = 0.6;

function toIntentAttribute(attr: SemanticAttribute): IntentAttribute {
  return {
    id: attr.id,
    label: attr.label,
    category: attr.category,
    weight: resolvedWeight(attr),
    locked: attr.state === 'locked',
    deleted: attr.state === 'deleted',
  };
}

export function snapshotIntent(
  attributes: SemanticAttribute[],
  catalogQuery: string,
): IntentSnapshot {
  return {
    attributes: attributes.map(toIntentAttribute),
    catalogQuery: catalogQuery.trim(),
  };
}

/** Attributes that influence shopping queries (stable across small weight drags). */
export function snapshotIntentForRetrieval(
  attributes: SemanticAttribute[],
  catalogQuery: string,
): IntentSnapshot {
  const rows = attributes
    .map(toIntentAttribute)
    .filter((attr) => {
      if (attr.deleted) return false;
      if (attr.locked) return true;
      if (attr.category === 'user-context' && attr.weight >= 0.5) return true;
      return attr.weight >= RETRIEVAL_WEIGHT;
    });
  return { attributes: rows, catalogQuery: catalogQuery.trim() };
}

export function retrievalQueryKey(
  attributes: SemanticAttribute[],
  catalogQuery: string,
): string {
  return buildProductQueries(snapshotIntentForRetrieval(attributes, catalogQuery)).join(
    '\0',
  );
}
