import { DRESS_CENTER } from '../../data/demo';
import type { SemanticAttribute } from '../../types';
import type { AnalysisAttribute } from './types';
import { slugId } from './slugId';

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
