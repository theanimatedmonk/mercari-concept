import { DRESS_CENTER } from '../../data/demo';
import type { SemanticAttribute } from '../../types.js';
import type { AnalysisAttribute } from './types.js';

export function slugId(value: string, index: number) {
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
  const used = new Set<string>();
  return items.map((item, index) => {
    let id = slugId(item.id || item.label, index);
    if (used.has(id)) id = `${id}${index}`;
    used.add(id);
    const angle = -Math.PI / 2 + (index / Math.max(items.length, 1)) * Math.PI * 1.65;
    const dist = 16 + (1 - item.weight) * 24;
    return {
      id,
      label: item.label,
      category: item.category,
      weight: item.weight,
      x: DRESS_CENTER.x + Math.cos(angle) * dist,
      y: DRESS_CENTER.y + Math.sin(angle) * dist,
      state: item.weight <= 0.35 ? 'less-relevant' : 'active',
    };
  });
}
