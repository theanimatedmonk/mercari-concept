import type { Product } from '../../types';

export type StyleJobStatus = 'generating' | 'done' | 'error';

export type StyleJob = {
  id: string;
  product: Product;
  status: StyleJobStatus;
  generatedImage?: string;
  selfieKey?: string;
};

export const MAX_STYLE_JOBS = 3;
export const STYLE_CAP_TOAST = 'You can only run 3 simultaneously';
export const STYLE_BEATS = [
  'Reading your photo',
  'Laying the piece on you',
  'Matching the light',
  'Styling it on you',
];
