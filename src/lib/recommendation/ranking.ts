import type { IntentSnapshot, RankedCatalogProduct, RetrievedProduct } from './types.js';
import { isDressListing } from './dressFilter.js';
import { deriveAttributes } from '../catalog/deriveAttributes.js';

function scoresForIntent(product: RetrievedProduct, intent: IntentSnapshot) {
  const blob = [product.title, product.brand ?? '', ...(product.attributes ?? [])].join(' ');
  return {
    ...product.attributeScores,
    ...deriveAttributes(
      blob,
      intent.attributes.map((attr) => ({ id: attr.id, label: attr.label })),
    ),
  };
}

function semanticMatch(
  intent: IntentSnapshot,
  scores: Record<string, number> | undefined,
) {
  if (!scores) return 0;
  let total = 0;
  let max = 0;
  for (const attr of intent.attributes) {
    const value = scores[attr.id] ?? 0;
    if (attr.deleted) {
      total -= value * 1.4;
      max += 1.4;
      continue;
    }
    const lockBoost = attr.locked ? 2.6 : 1;
    const weight = attr.locked ? 1 : attr.weight;
    total += value * weight * lockBoost;
    max += lockBoost;
  }
  if (max <= 0) return 0;
  return Math.max(0, total / max);
}

function queryRelevance(product: RetrievedProduct, queryCount: number) {
  if (queryCount <= 0) return 0;
  return Math.min(1, product.matchedQueries.length / queryCount);
}

function diversityPenalty(brand: string | undefined, seenBrands: Set<string>) {
  if (!brand) return 0;
  return seenBrands.has(brand.toLowerCase()) ? 0.12 : 0;
}

/** Rank retrieved products for the current intent (local, no network). */
export function rankCatalogProducts(
  intent: IntentSnapshot,
  products: RetrievedProduct[],
  queryCount: number,
): RankedCatalogProduct[] {
  const scored = products.map((product) => {
    const attributeScores = scoresForIntent(product, intent);
    const semantic = semanticMatch(intent, attributeScores);
    const relevance = queryRelevance(product, queryCount);
    const visual = product.visualScore ?? 0;
    const rankScore = semantic * 0.6 + relevance * 0.2 + visual * 0.15;
    return {
      ...product,
      attributeScores,
      semanticMatch: semantic,
      queryRelevance: relevance,
      rankScore,
      semanticScore: rankScore,
    };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore);

  const seenBrands = new Set<string>();
  const diversified: RankedCatalogProduct[] = [];
  for (const row of scored) {
    const brand = row.brand?.toLowerCase();
    diversified.push({
      ...row,
      rankScore: row.rankScore - diversityPenalty(brand, seenBrands),
    });
    if (brand) seenBrands.add(brand);
  }

  diversified.sort((a, b) => b.rankScore - a.rankScore);
  return diversified.filter((row) => isDressListing(row.title, row.category ?? '', row.imageUrl));
}
