export type AttributeCategory = 'visual' | 'inferred' | 'user-context';

export type AttributeState = 'active' | 'less-relevant' | 'deleted' | 'locked';

export type SemanticAttribute = {
  id: string;
  label: string;
  category: AttributeCategory;
  weight: number;
  x: number;
  y: number;
  state: AttributeState;
  expandable?: boolean;
  children?: string[];
  parentId?: string;
};

export type ProductCluster =
  | 'visual-match'
  | 'style-match'
  | 'contextual-match'
  | 'wrong-direction';

export type Product = {
  id: string;
  name: string;
  price: string;
  condition: string;
  seller: string;
  image: string;
  attributes: Record<string, number>;
  cluster: ProductCluster;
};

export type JourneyStage = 'inspiration' | 'focus' | 'sculpt';

export type PanelPhase = 'start' | 'shaping' | 'resolved';
