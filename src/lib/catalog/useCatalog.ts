import { useEffect, useState } from 'react';
import { products as fallbackProducts } from '../../data/products';
import type { Product } from '../../types';
import { fetchFashionCatalog, withHeroListing } from './fetchFashion';

export function useCatalog() {
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts);
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');

  useEffect(() => {
    let cancelled = false;
    fetchFashionCatalog()
      .then((live) => {
        if (cancelled || live.length === 0) return;
        setCatalog(withHeroListing(live));
        setSource('live');
      })
      .catch(() => {
        if (cancelled) return;
        setCatalog(fallbackProducts);
        setSource('fallback');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, source };
}
