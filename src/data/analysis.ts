import type { AttributeCategory } from '../types';

export type AnalysisBeat = {
  id: string;
  text: string;
  category: AttributeCategory;
  tag?: string;
  tagSide?: 'left' | 'right' | 'left-low' | 'right-high' | 'right-low';
};

/** Claude-style status lines, ordered visual → inferred → user context. */
export const analysisBeats: AnalysisBeat[] = [
  {
    id: 'asymmetric',
    category: 'visual',
    text: 'Noticing an asymmetric silhouette',
    tag: 'Asymmetric',
    tagSide: 'left',
  },
  {
    id: 'draped',
    category: 'visual',
    text: 'The fabric is draping, not just hanging',
    tag: 'Draped',
    tagSide: 'right',
  },
  {
    id: 'fluid',
    category: 'visual',
    text: 'Picking up a fluid line through the body',
    tag: 'Fluid',
    tagSide: 'left-low',
  },
  {
    id: 'architectural',
    category: 'inferred',
    text: 'This feels architectural',
    tag: 'Architectural',
    tagSide: 'right-high',
  },
  {
    id: 'sculptural',
    category: 'inferred',
    text: 'Inferring a sculptural shape',
  },
  {
    id: 'editorial',
    category: 'inferred',
    text: 'Reading an editorial quality',
  },
  {
    id: 'interestingNeckline',
    category: 'user-context',
    text: 'You called out the neckline',
  },
  {
    id: 'weddingReady',
    category: 'user-context',
    text: 'Keeping this wedding-ready',
    tag: 'Wedding-ready',
    tagSide: 'right-low',
  },
  {
    id: 'wearable',
    category: 'user-context',
    text: 'Looking for something you could actually wear',
  },
];
