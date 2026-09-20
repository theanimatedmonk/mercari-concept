import { useEffect, useMemo, useState } from 'react';
import { LISTING_PRODUCT_ID } from '../../data/listing';
import { products as fallbackProducts } from '../../data/products';
import type { SemanticAttribute } from '../../types';
import { withHeroListing } from '../catalog/fetchFashion';
import { retrievalQueryKey, snapshotIntent, snapshotIntentForRetrieval } from './intent';
import { catalogToProduct } from './mapProduct';
import { buildProductQueries } from './queryBuilder';
import { retrieveProducts } from './pipeline';
import { rankCatalogProducts } from './ranking';
import type { RetrievedProduct } from './types';

export function useRecommendationFeed(
  attributes: SemanticAttribute[],
  catalogQuery: string,
  inspirationImageSrc?: string | null,
) {
  const [pool, setPool] = useState<RetrievedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const queryKey = useMemo(
    () => retrievalQueryKey(attributes, catalogQuery),
    [attributes, catalogQuery],
  );

  useEffect(() => {
    let cancelled = false;
    const queries = queryKey.split('\0').filter(Boolean);
    setLoading(true);
    retrieveProducts(
      queries.length ? queries : ['evening dress'],
      inspirationImageSrc ?? undefined,
    )
      .then((rows) => {
        if (cancelled) return;
        setPool(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setPool([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey, inspirationImageSrc]);

  const ranked = useMemo(() => {
    const intent = snapshotIntent(attributes, catalogQuery);
    const queries = buildProductQueries(snapshotIntentForRetrieval(attributes, catalogQuery));
    const rows = rankCatalogProducts(intent, pool, queries.length);
    const products = rows.map(catalogToProduct);
    if (products.length === 0) return fallbackProducts;
    return withHeroListing(products);
  }, [attributes, catalogQuery, pool]);

  const source = pool.length ? ('live' as const) : ('fallback' as const);

  return { catalog: ranked, source, loading, listingId: LISTING_PRODUCT_ID };
}
