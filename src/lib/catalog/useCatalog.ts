import { useEffect, useState } from 'react';
import { products as fallbackProducts } from '../../data/products';
import type { Product } from '../../types';
import {
  fetchFashionCatalog,
  searchFashionCatalog,
  withHeroListing,
} from './fetchFashion';

type PillHint = { id: string; label: string };

export function useCatalog(query = '', pills: PillHint[] = []) {
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts);
  const [source, setSource] = useState<'live' | 'fallback'>('fallback');
  const hintKey = pills.map((pill) => `${pill.id}:${pill.label}`).join('|');

  useEffect(() => {
    let cancelled = false;
    const hints = hintKey
      ? hintKey.split('|').map((part) => {
          const [id, ...rest] = part.split(':');
          return { id, label: rest.join(':') };
        })
      : undefined;
    const load = query.trim()
      ? searchFashionCatalog(query, hints)
      : fetchFashionCatalog(hints);
    load
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
  }, [query, hintKey]);

  return { catalog, source };
}
