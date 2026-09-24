import type { AttributeCategory } from '../../types.js';

export const TAG_SIDES = [
  'left',
  'right',
  'left-low',
  'left-high',
  'right-high',
  'right-low',
] as const;

export type TagSide = (typeof TAG_SIDES)[number];

export type AnalyzeRequest = {
  imageBase64?: string;
  mimeType?: string;
  imageUrl?: string;
  text?: string;
};

export type AnalysisAttribute = {
  id: string;
  label: string;
  category: AttributeCategory;
  weight: number;
  text: string;
  tag?: string;
  tagSide?: TagSide;
};

export type AnalyzeResponse = {
  fashion: boolean;
  attributes: AnalysisAttribute[];
  catalogQuery: string;
};

export type AnalyzeErrorBody = {
  error: string;
};

export type AnalyzeStreamEvent =
  | { type: 'attribute'; attribute: AnalysisAttribute }
  | { type: 'done'; result: AnalyzeResponse }
  | { type: 'error'; error: string };

export type JevNudge = {
  key: string;
  question: string;
  options: string[];
  inScope: boolean;
};

export const EMPTY_NUDGE: JevNudge = {
  key: '',
  question: '',
  options: [],
  inScope: true,
};

export type JevNudgeRequest = {
  text?: string;
  hasImage?: boolean;
};

export type StyleOnMeRequest = {
  productImageUrl?: string;
  productImageBase64?: string;
  productMimeType?: string;
  userImageBase64: string;
  userMimeType?: string;
  productName?: string;
};

export type StyleOnMeResponse = {
  imageBase64: string;
  mimeType: string;
};
