import type { AttributeCategory } from '../../types';

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
