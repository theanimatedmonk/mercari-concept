import { useEffect, useMemo, useState } from 'react';
import { LISTING_PRODUCT_ID } from '../../data/listing.js';
import { products as fallbackProducts } from '../../data/products.js';
import type { SemanticAttribute } from '../../types.js';
import { withHeroListing } from '../catalog/fetchFashion.js';
import { retrievalQueryKey, snapshotIntent, snapshotIntentForRetrieval } from './intent.js';
import { catalogToProduct } from './mapProduct.js';
import { buildProductQueries } from './queryBuilder.js';
import { isDressListing } from './dressFilter.js';
import { retrieveProducts } from './pipeline.js';
import { rankCatalogProducts } from './ranking.js';
import type { RetrievedProduct } from './types.js';

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
    const products = rows.map(catalogToProduct).filter((item) => isDressListing(item.name, '', item.image));
    if (products.length === 0) {
      return fallbackProducts.filter((item) => isDressListing(item.name, '', item.image));
    }
    return withHeroListing(products);
  }, [attributes, catalogQuery, pool]);

  const source = pool.length ? ('live' as const) : ('fallback' as const);

  return { catalog: ranked, source, loading, listingId: LISTING_PRODUCT_ID };
}
