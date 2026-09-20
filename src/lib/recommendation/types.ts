import type { AttributeCategory } from '../../types.js';

export type MerchantId = 'myntra' | 'amazon' | 'mock';

export type IntentAttribute = {
  id: string;
  label: string;
  category: AttributeCategory;
  weight: number;
  locked: boolean;
  deleted: boolean;
};

export type IntentSnapshot = {
  attributes: IntentAttribute[];
  catalogQuery: string;
};

export type CatalogProduct = {
  id: string;
  merchant: MerchantId;
  merchantProductId?: string;
  title: string;
  brand?: string;
  price?: number;
  currency?: string;
  imageUrl: string;
  productUrl: string;
  affiliateUrl?: string;
  category?: string;
  availability?: boolean;
  attributes?: string[];
  attributeScores?: Record<string, number>;
  semanticScore?: number;
  visualScore?: number;
  imagePalette?: { r: number; g: number; b: number };
};

export type RetrievedProduct = CatalogProduct & {
  matchedQueries: string[];
};

export type RankedCatalogProduct = RetrievedProduct & {
  rankScore: number;
  semanticMatch: number;
  queryRelevance: number;
};
