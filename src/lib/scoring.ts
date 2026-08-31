import { DRESS_CENTER } from '../data/demo';
import type { Product, SemanticAttribute } from '../types';

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function distancePercent(x: number, y: number) {
  return Math.hypot(x - DRESS_CENTER.x, y - DRESS_CENTER.y);
}

/** Map canvas distance to semantic weight. */
export function weightFromDistance(x: number, y: number) {
  const t = clamp(distancePercent(x, y) / 46, 0, 1);
  return 1 - t * 0.85;
}

export function resolvedWeight(attr: SemanticAttribute) {
  if (attr.state === 'deleted') return 0;
  if (attr.state === 'locked') return 1;
  return attr.weight;
}

export function scoreProduct(product: Product, attributes: SemanticAttribute[]) {
  let score = 0;
  for (const attr of attributes) {
    const value = product.attributes[attr.id] ?? 0;
    if (attr.state === 'deleted') {
      score -= value * 1.4;
      continue;
    }
    const lockBoost = attr.state === 'locked' ? 2.6 : 1;
    score += value * resolvedWeight(attr) * lockBoost;
  }
  return score;
}

export function rankProducts(products: Product[], attributes: SemanticAttribute[]) {
  return [...products]
    .map((product) => ({
      product,
      score: scoreProduct(product, attributes),
    }))
    .sort((a, b) => b.score - a.score);
}

export function whyThis(product: Product, attributes: SemanticAttribute[]) {
  const matches: string[] = [];
  const less: string[] = [];

  for (const attr of attributes) {
    if (attr.state === 'deleted') continue;
    const value = product.attributes[attr.id] ?? 0;
    const weight = resolvedWeight(attr);
    if (value >= 0.55 && weight >= 0.55) matches.push(attr.label);
    if (value >= 0.5 && weight <= 0.35) less.push(attr.label);
  }

  return { matches, less };
}

export function panelPhase(
  attributes: SemanticAttribute[],
  meaningfulMoves: number,
): 'start' | 'shaping' | 'resolved' {
  const locked = attributes.filter((a) => a.state === 'locked').length;
  const deletedEditorial = attributes.some(
    (a) => a.id === 'editorial' && a.state === 'deleted',
  );
  if (locked >= 2 || (deletedEditorial && locked >= 1 && meaningfulMoves >= 4)) {
    return 'resolved';
  }
  if (meaningfulMoves >= 1) return 'shaping';
  return 'start';
}
