import { DRESS_CENTER } from '../../data/demo';
import { initialAttributes } from '../../data/attributes';
import type { SemanticAttribute } from '../../types';
import type { AnalysisAttribute } from './types';

function slugId(value: string, index: number) {
  const slug = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part, i) =>
      i === 0 ? part.toLowerCase() : part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join('');
  return slug || `attr${index}`;
}

export function layoutAttributes(items: AnalysisAttribute[]): SemanticAttribute[] {
  const laid: SemanticAttribute[] = items.map((item, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(items.length, 1)) * Math.PI * 1.65;
    const dist = 16 + (1 - item.weight) * 24;
    return {
      id: slugId(item.id || item.label, index),
      label: item.label,
      category: item.category,
      weight: item.weight,
      x: DRESS_CENTER.x + Math.cos(angle) * dist,
      y: DRESS_CENTER.y + Math.sin(angle) * dist,
      state: item.weight <= 0.35 ? 'less-relevant' : 'active',
    };
  });

  if (laid.length >= 6) return laid;

  const used = new Set(laid.map((item) => item.id));
  for (const pad of initialAttributes) {
    if (laid.length >= 6) break;
    if (used.has(pad.id)) continue;
    used.add(pad.id);
    laid.push({ ...pad });
  }
  return laid;
}
